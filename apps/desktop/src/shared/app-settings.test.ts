import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_SETTINGS, normalizeAppSettings } from './app-settings';

describe('normalizeAppSettings defaults', () => {
  it('keeps valid app settings', () => {
    expect(normalizeAppSettings({ restoreLastWorkspaceOnLaunch: false, themeId: 'sage' })).toEqual({
      customTheme: null,
      localePreference: DEFAULT_APP_SETTINGS.localePreference,
      restoreLastWorkspaceOnLaunch: false,
      sync: DEFAULT_APP_SETTINGS.sync,
      themeId: 'sage',
      uiFontId: DEFAULT_APP_SETTINGS.uiFontId,
      writingFontId: DEFAULT_APP_SETTINGS.writingFontId,
    });
  });

  it('falls back when a persisted theme is missing or invalid', () => {
    expect(normalizeAppSettings({ restoreLastWorkspaceOnLaunch: false })).toEqual({
      customTheme: null,
      localePreference: DEFAULT_APP_SETTINGS.localePreference,
      restoreLastWorkspaceOnLaunch: false,
      sync: DEFAULT_APP_SETTINGS.sync,
      themeId: DEFAULT_APP_SETTINGS.themeId,
      uiFontId: DEFAULT_APP_SETTINGS.uiFontId,
      writingFontId: DEFAULT_APP_SETTINGS.writingFontId,
    });
    expect(
      normalizeAppSettings({ restoreLastWorkspaceOnLaunch: true, themeId: 'unknown' }),
    ).toEqual(DEFAULT_APP_SETTINGS);
  });
});

describe('normalizeAppSettings custom themes', () => {
  it('keeps a valid custom theme and falls back when the custom theme is invalid', () => {
    const customTheme = {
      name: 'Desk Code',
      colors: {
        accent: '#111111',
        accentHover: '#222222',
        accentSoft: '#333333',
        activeRow: '#444444',
        app: '#555555',
        border: '#666666',
        borderStrong: '#777777',
        danger: '#888888',
        panel: '#999999',
        paper: '#AAAAAA',
        raised: '#BBBBBB',
        text: '#CCCCCC',
        textFaint: '#DDDDDD',
        textMuted: '#EEEEEE',
      },
    };

    expect(normalizeAppSettings({ customTheme, themeId: 'custom' })).toEqual({
      customTheme: { ...customTheme, id: 'custom' },
      localePreference: DEFAULT_APP_SETTINGS.localePreference,
      restoreLastWorkspaceOnLaunch: true,
      sync: DEFAULT_APP_SETTINGS.sync,
      themeId: 'custom',
      uiFontId: DEFAULT_APP_SETTINGS.uiFontId,
      writingFontId: DEFAULT_APP_SETTINGS.writingFontId,
    });
    expect(normalizeAppSettings({ customTheme: { colors: {} }, themeId: 'custom' })).toEqual(
      DEFAULT_APP_SETTINGS,
    );
  });

  it('normalizes compact custom theme colors and split font settings', () => {
    const settings = normalizeAppSettings({
      customTheme: {
        colors: {
          accent: '#52697f',
          app: '#f3f5f7',
          panel: '#f8fafb',
          paper: '#ffffff',
        },
        name: 'Quiet Blue',
      },
      themeId: 'custom',
      uiFontId: 'sans',
      writingFontId: 'mono',
    });

    expect(settings.customTheme?.name).toBe('Quiet Blue');
    expect(settings.customTheme?.colors.accent).toBe('#52697F');
    expect(settings.customTheme?.colors.text).toBe('#25231F');
    expect(settings.themeId).toBe('custom');
    expect(settings.uiFontId).toBe('sans');
    expect(settings.writingFontId).toBe('mono');
  });
});

describe('normalizeAppSettings sync settings', () => {
  it('keeps a valid self-host sync endpoint', () => {
    expect(
      normalizeAppSettings({
        sync: {
          enabled: true,
          provider: 'self-hosted',
          selfHostedUrl: 'https://sync.example.com/',
        },
      }).sync,
    ).toEqual({
      enabled: true,
      provider: 'self-hosted',
      selfHostedUrl: 'https://sync.example.com',
    });
  });

  it('keeps the Goyo Cloud sync provider without a custom endpoint', () => {
    expect(
      normalizeAppSettings({
        sync: { enabled: true, provider: 'goyo-cloud' },
      }).sync,
    ).toEqual({ enabled: true, provider: 'goyo-cloud', selfHostedUrl: '' });
  });

  it('disables sync when the endpoint is missing or unsafe', () => {
    expect(
      normalizeAppSettings({ sync: { enabled: true, provider: 'self-hosted', selfHostedUrl: '' } })
        .sync,
    ).toEqual(DEFAULT_APP_SETTINGS.sync);
    expect(
      normalizeAppSettings({
        sync: { enabled: true, provider: 'self-hosted', selfHostedUrl: 'http://example.com' },
      }).sync,
    ).toEqual(DEFAULT_APP_SETTINGS.sync);
    expect(
      normalizeAppSettings({
        sync: { enabled: true, provider: 'self-hosted', selfHostedUrl: 'http://localhost:8787' },
      }).sync,
    ).toEqual({ enabled: true, provider: 'self-hosted', selfHostedUrl: 'http://localhost:8787' });
  });

  it('migrates legacy sync serverUrl to self-hosted mode', () => {
    expect(
      normalizeAppSettings({ sync: { enabled: true, serverUrl: 'https://legacy.example.com' } })
        .sync,
    ).toEqual({
      enabled: true,
      provider: 'self-hosted',
      selfHostedUrl: 'https://legacy.example.com',
    });
  });
});

describe('normalizeAppSettings fonts', () => {
  it('keeps valid expanded font choices', () => {
    const settings = normalizeAppSettings({
      uiFontId: 'korean-sans',
      writingFontId: 'literary-serif',
    });

    expect(settings.uiFontId).toBe('korean-sans');
    expect(settings.writingFontId).toBe('literary-serif');
  });

  it('migrates legacy fontId to the writing font only', () => {
    const settings = normalizeAppSettings({ fontId: 'mono' });

    expect(settings.uiFontId).toBe(DEFAULT_APP_SETTINGS.uiFontId);
    expect(settings.writingFontId).toBe('mono');
  });
});

describe('normalizeAppSettings locale preference', () => {
  it('keeps valid locale preferences and falls back for invalid values', () => {
    expect(normalizeAppSettings({ localePreference: 'system' }).localePreference).toBe('system');
    expect(normalizeAppSettings({ localePreference: 'en' }).localePreference).toBe('en');
    expect(normalizeAppSettings({ localePreference: 'ko' }).localePreference).toBe('ko');
    expect(normalizeAppSettings({ localePreference: 'fr' }).localePreference).toBe(
      DEFAULT_APP_SETTINGS.localePreference,
    );
  });
});
