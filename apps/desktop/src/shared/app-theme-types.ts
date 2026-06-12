type PresetAppThemeId = 'clay' | 'dusk' | 'ink' | 'night' | 'paper' | 'sage';

export type AppThemeId = PresetAppThemeId | 'custom';

export interface AppTheme {
  colors: {
    accent: string;
    accentHover: string;
    accentSoft: string;
    activeRow: string;
    app: string;
    border: string;
    borderStrong: string;
    danger: string;
    panel: string;
    paper: string;
    raised: string;
    text: string;
    textFaint: string;
    textMuted: string;
  };
  id: AppThemeId;
  name: string;
}

export interface CustomThemeSeed {
  colors: {
    accent: string;
    app: string;
    panel: string;
    paper: string;
  };
  name?: string;
}
