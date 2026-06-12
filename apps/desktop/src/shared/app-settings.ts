import {
  type AppFontId,
  DEFAULT_UI_FONT_ID,
  DEFAULT_WRITING_FONT_ID,
  isAppFontId,
} from './app-fonts';
import {
  type AppTheme,
  type AppThemeId,
  CUSTOM_APP_THEME_ID,
  DEFAULT_APP_THEME_ID,
  isAppThemeId,
  normalizeCustomTheme,
} from './app-themes';

export interface AppSettings {
  customTheme: AppTheme | null;
  restoreLastWorkspaceOnLaunch: boolean;
  themeId: AppThemeId;
  uiFontId: AppFontId;
  writingFontId: AppFontId;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  customTheme: null,
  restoreLastWorkspaceOnLaunch: true,
  themeId: DEFAULT_APP_THEME_ID,
  uiFontId: DEFAULT_UI_FONT_ID,
  writingFontId: DEFAULT_WRITING_FONT_ID,
};

export function normalizeAppSettings(settings: unknown): AppSettings {
  if (!settings || typeof settings !== 'object') {
    return DEFAULT_APP_SETTINGS;
  }

  const partialSettings = settings as Partial<AppSettings> & { fontId?: unknown };
  const customTheme = normalizeCustomTheme(partialSettings.customTheme);
  const legacyFontId = isAppFontId(partialSettings.fontId) ? partialSettings.fontId : null;
  const themeId = isAppThemeId(partialSettings.themeId)
    ? partialSettings.themeId
    : DEFAULT_APP_SETTINGS.themeId;

  return {
    customTheme,
    restoreLastWorkspaceOnLaunch:
      typeof partialSettings.restoreLastWorkspaceOnLaunch === 'boolean'
        ? partialSettings.restoreLastWorkspaceOnLaunch
        : DEFAULT_APP_SETTINGS.restoreLastWorkspaceOnLaunch,
    themeId:
      themeId === CUSTOM_APP_THEME_ID && !customTheme ? DEFAULT_APP_SETTINGS.themeId : themeId,
    uiFontId: isAppFontId(partialSettings.uiFontId)
      ? partialSettings.uiFontId
      : DEFAULT_APP_SETTINGS.uiFontId,
    writingFontId: isAppFontId(partialSettings.writingFontId)
      ? partialSettings.writingFontId
      : (legacyFontId ?? DEFAULT_APP_SETTINGS.writingFontId),
  };
}
