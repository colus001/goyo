import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_SETTINGS, normalizeAppSettings } from './app-settings';

describe('normalizeAppSettings defaults', () => {
  it('keeps valid app settings', () => {
    expect(normalizeAppSettings({ restoreLastWorkspaceOnLaunch: false, themeId: 'sage' })).toEqual({
      customTheme: null,
      restoreLastWorkspaceOnLaunch: false,
      themeId: 'sage',
      uiFontId: DEFAULT_APP_SETTINGS.uiFontId,
      writingFontId: DEFAULT_APP_SETTINGS.writingFontId,
    });
  });

  it('falls back when a persisted theme is missing or invalid', () => {
    expect(normalizeAppSettings({ restoreLastWorkspaceOnLaunch: false })).toEqual({
      customTheme: null,
      restoreLastWorkspaceOnLaunch: false,
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
      restoreLastWorkspaceOnLaunch: true,
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

describe('normalizeAppSettings fonts', () => {
  it('migrates legacy fontId to the writing font only', () => {
    const settings = normalizeAppSettings({ fontId: 'mono' });

    expect(settings.uiFontId).toBe(DEFAULT_APP_SETTINGS.uiFontId);
    expect(settings.writingFontId).toBe('mono');
  });
});
