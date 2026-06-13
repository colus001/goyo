export type AppFontId =
  | 'editorial-serif'
  | 'focus-mono'
  | 'humanist-sans'
  | 'korean-sans'
  | 'korean-serif'
  | 'literary-serif'
  | 'mono'
  | 'sans'
  | 'screenplay-mono'
  | 'serif';

export type AppFontRole = 'both' | 'interface' | 'writing';

export type AppLocale = 'en' | 'ko';
export type AppLocalePreference = 'en' | 'ko' | 'system';

export interface AppFontOption {
  cssFamily: string;
  id: AppFontId;
  name: string;
  role: AppFontRole;
}

export const DEFAULT_APP_LOCALE_PREFERENCE: AppLocalePreference = 'system';

const FALLBACK_APP_LOCALE: AppLocale = 'en';

export const DEFAULT_UI_FONT_ID: AppFontId = 'sans';
export const DEFAULT_WRITING_FONT_ID: AppFontId = 'serif';

export const APP_FONTS: AppFontOption[] = [
  {
    cssFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    id: 'sans',
    name: 'System Sans',
    role: 'interface',
  },
  {
    cssFamily: '"Noto Serif KR", "Source Serif 4", ui-serif, Georgia, Cambria, serif',
    id: 'serif',
    name: 'Book Serif',
    role: 'writing',
  },
  {
    cssFamily:
      '"Source Code Pro", "SFMono-Regular", "SF Mono", Consolas, "Liberation Mono", Menlo, ui-monospace, monospace',
    id: 'mono',
    name: 'Draft Mono',
    role: 'both',
  },
  {
    cssFamily:
      'Inter, "Noto Sans KR", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    id: 'humanist-sans',
    name: 'Humanist Sans',
    role: 'both',
  },
  {
    cssFamily: '"Noto Sans KR", Inter, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
    id: 'korean-sans',
    name: 'Korean Sans',
    role: 'both',
  },
  {
    cssFamily: '"Source Serif 4", "Noto Serif KR", ui-serif, Georgia, Cambria, serif',
    id: 'editorial-serif',
    name: 'Editorial Serif',
    role: 'writing',
  },
  {
    cssFamily: 'Literata, "Noto Serif KR", ui-serif, Georgia, Cambria, serif',
    id: 'literary-serif',
    name: 'Literary Serif',
    role: 'writing',
  },
  {
    cssFamily: '"Noto Serif KR", "Source Serif 4", "AppleMyungjo", "Nanum Myeongjo", serif',
    id: 'korean-serif',
    name: 'Korean Serif',
    role: 'writing',
  },
  {
    cssFamily: '"Source Code Pro", "Courier Prime", "Courier New", ui-monospace, monospace',
    id: 'screenplay-mono',
    name: 'Screenplay Mono',
    role: 'writing',
  },
  {
    cssFamily:
      '"Source Code Pro", "SFMono-Regular", "SF Mono", Menlo, Consolas, ui-monospace, monospace',
    id: 'focus-mono',
    name: 'Focus Mono',
    role: 'writing',
  },
];

export function detectPreferredAppLocale(language: string | undefined): AppLocale {
  return language?.toLowerCase().startsWith('ko') ? 'ko' : FALLBACK_APP_LOCALE;
}

export function isAppLocalePreference(
  localePreference: unknown,
): localePreference is AppLocalePreference {
  return localePreference === 'system' || localePreference === 'en' || localePreference === 'ko';
}

export function resolveAppLocale({
  language,
  localePreference,
}: {
  language: string | undefined;
  localePreference: AppLocalePreference;
}): AppLocale {
  return localePreference === 'system' ? detectPreferredAppLocale(language) : localePreference;
}

export function getAppFontSample({
  locale,
  role,
}: {
  locale: AppLocale;
  role: Exclude<AppFontRole, 'both'>;
}): string {
  if (role === 'interface') {
    return locale === 'ko' ? '메뉴 · 설정 · Aa Bb 123' : 'Menu · Settings · Aa Bb 123';
  }

  return locale === 'ko'
    ? '오래 쓰는 문장은 천천히 리듬을 찾습니다.'
    : 'The quiet room held its breath.';
}

export function getAppFont(fontId: AppFontId): AppFontOption {
  return APP_FONTS.find((font) => font.id === fontId) ?? APP_FONTS[0];
}

export function getAppFontsForRole(role: Exclude<AppFontRole, 'both'>): AppFontOption[] {
  return APP_FONTS.filter((font) => font.role === role || font.role === 'both');
}

export function isAppFontId(fontId: unknown): fontId is AppFontId {
  return APP_FONTS.some((font) => font.id === fontId);
}
