export type AppFontId = 'mono' | 'sans' | 'serif';

export interface AppFontOption {
  cssFamily: string;
  id: AppFontId;
  name: string;
}

export const DEFAULT_UI_FONT_ID: AppFontId = 'sans';
export const DEFAULT_WRITING_FONT_ID: AppFontId = 'serif';

export const APP_FONTS: AppFontOption[] = [
  {
    cssFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    id: 'sans',
    name: 'System Sans',
  },
  {
    cssFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
    id: 'serif',
    name: 'Book Serif',
  },
  {
    cssFamily:
      '"SFMono-Regular", "SF Mono", Consolas, "Liberation Mono", Menlo, ui-monospace, monospace',
    id: 'mono',
    name: 'Draft Mono',
  },
];

export function getAppFont(fontId: AppFontId): AppFontOption {
  return APP_FONTS.find((font) => font.id === fontId) ?? APP_FONTS[0];
}

export function isAppFontId(fontId: unknown): fontId is AppFontId {
  return APP_FONTS.some((font) => font.id === fontId);
}
