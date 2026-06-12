import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { AppSettings } from '../shared/app-settings';
import {
  type AppTheme,
  CUSTOM_APP_THEME_ID,
  CUSTOM_THEME_SEED_COLOR_KEYS,
  type CustomThemeSeed,
  createThemeFromSeed,
  formatCustomThemeChip,
  getAppTheme,
  normalizeHexColor,
  parseCustomThemeChip,
} from '../shared/app-themes';

export function CustomThemeEditor({
  onChangeSettings,
  settings,
}: {
  onChangeSettings: (settings: AppSettings) => void;
  settings: AppSettings;
}): ReactElement {
  const baseSeed = useMemo(() => getCustomThemeSeedBase(settings), [settings]);
  const [themeChip, setThemeChip] = useState(() => formatCustomThemeChip(baseSeed));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setThemeChip(formatCustomThemeChip(baseSeed));
  }, [baseSeed]);

  const applyCustomTheme = (theme: AppTheme) => {
    onChangeSettings({ ...settings, customTheme: theme, themeId: CUSTOM_APP_THEME_ID });
    setErrorMessage(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {CUSTOM_THEME_SEED_COLOR_KEYS.map((colorKey) => (
          <ThemeColorField
            colorKey={colorKey}
            key={colorKey}
            onChange={(color) => {
              applyCustomTheme(
                createThemeFromSeed({
                  ...baseSeed,
                  colors: { ...baseSeed.colors, [colorKey]: color },
                }),
              );
            }}
            value={baseSeed.colors[colorKey]}
          />
        ))}
      </div>

      <div className="rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)]/70 p-3">
        <label className="block font-semibold text-[var(--goyo-text)] text-sm" htmlFor="theme-chip">
          Color chip
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            className="min-w-0 flex-1 rounded-full border border-[var(--goyo-border-strong)] bg-[var(--goyo-raised)] px-3 py-2 font-mono text-[var(--goyo-text)] text-xs outline-none placeholder:text-[var(--goyo-text-faint)]"
            id="theme-chip"
            onChange={(event) => setThemeChip(event.target.value)}
            placeholder="#171717 #211F1B #1C1A16 #C9895F"
            spellCheck={false}
            value={themeChip}
          />
          <div className="flex gap-2">
            <button
              className="cursor-pointer rounded-full border border-[var(--goyo-border-strong)] bg-[var(--goyo-raised)] px-3 py-1.5 font-medium text-[var(--goyo-text)] text-sm outline-none transition hover:bg-[var(--goyo-accent-soft)]"
              onClick={() => void copyThemeChip(baseSeed)}
              type="button"
            >
              Copy
            </button>
            <button
              className="cursor-pointer rounded-full border border-[var(--goyo-border-strong)] bg-[var(--goyo-raised)] px-3 py-1.5 font-medium text-[var(--goyo-text)] text-sm outline-none transition hover:bg-[var(--goyo-accent-soft)]"
              onClick={() => {
                const parsedTheme = parseCustomThemeChip(themeChip);
                if (!parsedTheme) {
                  setErrorMessage('Paste four #RRGGBB colors.');
                  return;
                }
                applyCustomTheme(parsedTheme);
              }}
              type="button"
            >
              Apply
            </button>
          </div>
        </div>
        <p className="mt-2 text-[var(--goyo-text-muted)] text-xs">
          Paste four colors in this order: app, paper, sidebar, selected.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="cursor-pointer rounded-full border border-[var(--goyo-border-strong)] bg-[var(--goyo-raised)] px-3 py-1.5 font-medium text-[var(--goyo-text)] text-sm outline-none transition hover:bg-[var(--goyo-accent-soft)]"
          onClick={() => void copyThemeChip(baseSeed)}
          type="button"
        >
          Copy colors
        </button>
      </div>
      {errorMessage ? <p className="text-[var(--goyo-danger)] text-sm">{errorMessage}</p> : null}
    </div>
  );
}

function ThemeColorField({
  colorKey,
  onChange,
  value,
}: {
  colorKey: keyof CustomThemeSeed['colors'];
  onChange: (color: string) => void;
  value: string;
}): ReactElement {
  return (
    <label className="block">
      <span className="mb-1.5 block font-semibold text-[var(--goyo-text)] text-sm">
        {formatColorKey(colorKey)}
      </span>
      <span className="flex items-center gap-2 rounded-full border border-[var(--goyo-border-strong)] bg-[var(--goyo-raised)] px-2 py-1.5">
        <span className="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-full border border-black/10">
          <span className="absolute inset-0 rounded-full" style={{ backgroundColor: value }} />
          <input
            aria-label={`${formatColorKey(colorKey)} color`}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            type="color"
            value={value}
          />
        </span>
        <input
          className="min-w-0 flex-1 bg-transparent font-mono text-[var(--goyo-text)] text-sm outline-none"
          onBlur={(event) => {
            const normalizedColor = normalizeHexColor(event.target.value);
            if (normalizedColor) {
              onChange(normalizedColor);
            }
          }}
          onChange={(event) => {
            const normalizedColor = normalizeHexColor(event.target.value);
            if (normalizedColor) {
              onChange(normalizedColor);
            }
          }}
          value={value}
        />
      </span>
    </label>
  );
}

function getCustomThemeSeedBase(settings: AppSettings): CustomThemeSeed {
  if (settings.themeId === CUSTOM_APP_THEME_ID && settings.customTheme) {
    return themeToSeed(settings.customTheme);
  }

  const selectedTheme = getAppTheme(settings.themeId);

  return { ...themeToSeed(selectedTheme), name: 'Custom' };
}

function themeToSeed(theme: AppTheme): CustomThemeSeed {
  return {
    colors: {
      accent: theme.colors.accent,
      app: theme.colors.app,
      panel: theme.colors.panel,
      paper: theme.colors.paper,
    },
    name: theme.name,
  };
}

async function copyThemeChip(seed: CustomThemeSeed) {
  await navigator.clipboard?.writeText(formatCustomThemeChip(seed));
}

function formatColorKey(colorKey: keyof CustomThemeSeed['colors']): string {
  switch (colorKey) {
    case 'accent':
      return 'Selected items';
    case 'app':
      return 'App background';
    case 'panel':
      return 'Sidebar';
    case 'paper':
      return 'Writing paper';
  }
}
