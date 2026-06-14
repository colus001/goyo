import {
  type AppFontId,
  type AppLocalePreference,
  DEFAULT_APP_LOCALE_PREFERENCE,
  DEFAULT_UI_FONT_ID,
  DEFAULT_WRITING_FONT_ID,
  isAppFontId,
  isAppLocalePreference,
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
  localePreference: AppLocalePreference;
  restoreLastWorkspaceOnLaunch: boolean;
  sync: AppSyncSettings;
  themeId: AppThemeId;
  uiFontId: AppFontId;
  writingFontId: AppFontId;
}

interface AppSyncSettings {
  enabled: boolean;
  serverUrl: string;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  customTheme: null,
  localePreference: DEFAULT_APP_LOCALE_PREFERENCE,
  restoreLastWorkspaceOnLaunch: true,
  sync: {
    enabled: false,
    serverUrl: '',
  },
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
    localePreference: isAppLocalePreference(partialSettings.localePreference)
      ? partialSettings.localePreference
      : DEFAULT_APP_SETTINGS.localePreference,
    restoreLastWorkspaceOnLaunch:
      typeof partialSettings.restoreLastWorkspaceOnLaunch === 'boolean'
        ? partialSettings.restoreLastWorkspaceOnLaunch
        : DEFAULT_APP_SETTINGS.restoreLastWorkspaceOnLaunch,
    sync: normalizeAppSyncSettings(partialSettings.sync),
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

function normalizeAppSyncSettings(settings: unknown): AppSyncSettings {
  if (!settings || typeof settings !== 'object') {
    return DEFAULT_APP_SETTINGS.sync;
  }

  const partialSettings = settings as Partial<AppSyncSettings>;
  const serverUrl = normalizeSyncServerUrl(partialSettings.serverUrl);

  return {
    enabled: partialSettings.enabled === true && serverUrl.length > 0,
    serverUrl,
  };
}

function normalizeSyncServerUrl(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return '';
  }

  try {
    const url = new URL(trimmedValue);

    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      return '';
    }

    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}
