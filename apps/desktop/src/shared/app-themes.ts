import { APP_THEME_SEEDS } from './app-theme-presets';
import type { AppTheme, AppThemeId, CustomThemeSeed } from './app-theme-types';

export type { AppTheme, AppThemeId, CustomThemeSeed } from './app-theme-types';

export const DEFAULT_APP_THEME_ID: AppThemeId = 'paper';
export const CUSTOM_APP_THEME_ID: AppThemeId = 'custom';
export const APP_THEMES: AppTheme[] = APP_THEME_SEEDS.map((seed) =>
  createThemeFromSeed(seed, seed.id),
);

export function getAppTheme(themeId: AppThemeId): AppTheme {
  return APP_THEMES.find((theme) => theme.id === themeId) ?? APP_THEMES[0];
}

export function isAppThemeId(themeId: unknown): themeId is AppThemeId {
  return themeId === CUSTOM_APP_THEME_ID || APP_THEMES.some((theme) => theme.id === themeId);
}

export function normalizeCustomTheme(theme: unknown): AppTheme | null {
  if (!theme || typeof theme !== 'object') {
    return null;
  }

  const candidate = theme as Partial<AppTheme>;

  if (!candidate.colors || typeof candidate.colors !== 'object') {
    return null;
  }

  const colors = candidate.colors as Partial<AppTheme['colors']>;
  const seedTheme = normalizeCustomThemeSeed(candidate);
  const hasFullThemeColors = THEME_COLOR_KEYS.every((key) => normalizeHexColor(colors[key]));

  if (!hasFullThemeColors) {
    return seedTheme;
  }

  const normalizedColors = Object.fromEntries(
    THEME_COLOR_KEYS.map((key) => [key, normalizeHexColor(colors[key])]),
  ) as AppTheme['colors'];

  if (Object.values(normalizedColors).some((color) => !color)) {
    return null;
  }

  return {
    colors: normalizedColors,
    id: CUSTOM_APP_THEME_ID,
    name:
      typeof candidate.name === 'string' && candidate.name.trim()
        ? candidate.name.trim()
        : 'Custom',
  };
}

function normalizeCustomThemeSeed(seed: unknown): AppTheme | null {
  if (!seed || typeof seed !== 'object') {
    return null;
  }

  const candidate = seed as Partial<CustomThemeSeed>;

  if (!candidate.colors || typeof candidate.colors !== 'object') {
    return null;
  }

  const colors = candidate.colors as Partial<CustomThemeSeed['colors']>;
  const app = normalizeHexColor(colors.app);
  const paper = normalizeHexColor(colors.paper);
  const panel = normalizeHexColor(colors.panel);
  const accent = normalizeHexColor(colors.accent);

  if (!app || !paper || !panel || !accent) {
    return null;
  }

  return createThemeFromSeed({
    colors: { accent, app, panel, paper },
    name:
      typeof candidate.name === 'string' && candidate.name.trim()
        ? candidate.name.trim()
        : 'Custom',
  });
}

export function createThemeFromSeed(
  seed: CustomThemeSeed,
  id: AppThemeId = CUSTOM_APP_THEME_ID,
): AppTheme {
  const accent = normalizeHexColor(seed.colors.accent) ?? seed.colors.accent;
  const app = normalizeHexColor(seed.colors.app) ?? seed.colors.app;
  const panel = normalizeHexColor(seed.colors.panel) ?? seed.colors.panel;
  const paper = normalizeHexColor(seed.colors.paper) ?? seed.colors.paper;
  const text = getReadableTextColor(paper);

  return {
    colors: {
      accent,
      accentHover: mixHex(accent, text, 0.18),
      accentSoft: mixHex(accent, paper, 0.84),
      activeRow: mixHex(accent, paper, 0.9),
      app,
      border: mixHex(text, app, 0.84),
      borderStrong: mixHex(text, app, 0.76),
      danger: '#B75A52',
      panel,
      paper,
      raised: mixHex(paper, app, 0.08),
      text,
      textFaint: mixHex(text, paper, 0.58),
      textMuted: mixHex(text, paper, 0.34),
    },
    id,
    name: seed.name?.trim() || 'Custom',
  };
}

export function formatCustomThemeChip(seed: CustomThemeSeed): string {
  return [seed.colors.app, seed.colors.paper, seed.colors.panel, seed.colors.accent]
    .map((color) => normalizeHexColor(color) ?? color.toUpperCase())
    .join(' ');
}

export function parseCustomThemeChip(chip: string): AppTheme | null {
  const trimmedChip = chip.trim();

  if (!trimmedChip) {
    return null;
  }

  const [app, paper, panel, accent] = trimmedChip.split(/\s+/).map(normalizeHexColor);

  if (!app || !paper || !panel || !accent) {
    return null;
  }

  return createThemeFromSeed({ colors: { accent, app, panel, paper }, name: 'Custom' });
}

export function normalizeHexColor(color: unknown): string | null {
  if (typeof color !== 'string') {
    return null;
  }

  const trimmedColor = color.trim();
  const normalizedColor = trimmedColor.startsWith('#') ? trimmedColor : `#${trimmedColor}`;

  if (!/^#[0-9a-fA-F]{6}$/.test(normalizedColor)) {
    return null;
  }

  return normalizedColor.toUpperCase();
}

const THEME_COLOR_KEYS: Array<keyof AppTheme['colors']> = [
  'app',
  'paper',
  'panel',
  'raised',
  'border',
  'borderStrong',
  'text',
  'textMuted',
  'textFaint',
  'accent',
  'accentHover',
  'accentSoft',
  'activeRow',
  'danger',
];

export const CUSTOM_THEME_SEED_COLOR_KEYS: Array<keyof CustomThemeSeed['colors']> = [
  'app',
  'paper',
  'panel',
  'accent',
];

function getReadableTextColor(backgroundColor: string): string {
  return getRelativeLuminance(backgroundColor) > 0.42 ? '#25231F' : '#F0F0ED';
}

function getRelativeLuminance(color: string): number {
  const [red, green, blue] = hexToRgb(color).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function mixHex(colorA: string, colorB: string, amountOfB: number): string {
  const rgbA = hexToRgb(colorA);
  const rgbB = hexToRgb(colorB);
  const mixedRgb = rgbA.map((channel, index) =>
    Math.round(channel * (1 - amountOfB) + rgbB[index] * amountOfB),
  );

  return rgbToHex(mixedRgb);
}

function hexToRgb(color: string): [number, number, number] {
  const normalizedColor = color.replace('#', '');

  return [
    Number.parseInt(normalizedColor.slice(0, 2), 16),
    Number.parseInt(normalizedColor.slice(2, 4), 16),
    Number.parseInt(normalizedColor.slice(4, 6), 16),
  ];
}

function rgbToHex(rgb: number[]): string {
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}
