import type { CSSProperties } from 'react';
import { getAppFont } from '../shared/app-fonts';
import type { AppSettings } from '../shared/app-settings';
import { CUSTOM_APP_THEME_ID, getAppTheme } from '../shared/app-themes';

type ThemeStyle = CSSProperties & Record<`--goyo-${string}`, string>;

export function getThemeStyle(settings: AppSettings): ThemeStyle {
  const uiFontFamily = getAppFont(settings.uiFontId).cssFamily;
  const writingFontFamily = getAppFont(settings.writingFontId).cssFamily;
  const theme =
    settings.themeId === CUSTOM_APP_THEME_ID && settings.customTheme
      ? settings.customTheme
      : getAppTheme(settings.themeId);

  return {
    '--goyo-ui-font-family': uiFontFamily,
    '--goyo-writing-font-family': writingFontFamily,
    fontFamily: uiFontFamily,
    '--goyo-accent': theme.colors.accent,
    '--goyo-accent-hover': theme.colors.accentHover,
    '--goyo-accent-soft': theme.colors.accentSoft,
    '--goyo-active-row': theme.colors.activeRow,
    '--goyo-app': theme.colors.app,
    '--goyo-border': theme.colors.border,
    '--goyo-border-strong': theme.colors.borderStrong,
    '--goyo-danger': theme.colors.danger,
    '--goyo-panel': theme.colors.panel,
    '--goyo-paper': theme.colors.paper,
    '--goyo-raised': theme.colors.raised,
    '--goyo-text': theme.colors.text,
    '--goyo-text-faint': theme.colors.textFaint,
    '--goyo-text-muted': theme.colors.textMuted,
  };
}
