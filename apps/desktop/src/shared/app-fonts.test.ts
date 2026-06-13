import { describe, expect, it } from 'vitest';
import {
  APP_FONTS,
  DEFAULT_UI_FONT_ID,
  DEFAULT_WRITING_FONT_ID,
  detectPreferredAppLocale,
  getAppFontSample,
  getAppFontsForRole,
  isAppFontId,
  isAppLocalePreference,
  resolveAppLocale,
} from './app-fonts';

describe('app font catalog', () => {
  it('keeps default font ids in the catalog', () => {
    expect(isAppFontId(DEFAULT_UI_FONT_ID)).toBe(true);
    expect(isAppFontId(DEFAULT_WRITING_FONT_ID)).toBe(true);
  });

  it('keeps font ids unique', () => {
    const ids = APP_FONTS.map((font) => font.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('defines usable metadata for every font option', () => {
    for (const font of APP_FONTS) {
      expect(font.cssFamily.length).toBeGreaterThan(0);
      expect(font.name.length).toBeGreaterThan(0);
    }
  });

  it('filters fonts by interface and writing roles', () => {
    const interfaceFonts = getAppFontsForRole('interface');
    const writingFonts = getAppFontsForRole('writing');

    expect(interfaceFonts.some((font) => font.id === 'sans')).toBe(true);
    expect(interfaceFonts.some((font) => font.id === 'korean-sans')).toBe(true);
    expect(writingFonts.some((font) => font.id === 'serif')).toBe(true);
    expect(writingFonts.some((font) => font.id === 'literary-serif')).toBe(true);
  });

  it('includes bundled Korean-friendly sans and serif choices', () => {
    expect(APP_FONTS.find((font) => font.id === 'korean-sans')?.cssFamily).toContain(
      'Noto Sans KR',
    );
    expect(APP_FONTS.find((font) => font.id === 'korean-serif')?.cssFamily).toContain(
      'Noto Serif KR',
    );
  });
});

describe('app font locale samples', () => {
  it('detects the preview locale from a language tag', () => {
    expect(detectPreferredAppLocale('ko-KR')).toBe('ko');
    expect(detectPreferredAppLocale('en-US')).toBe('en');
    expect(detectPreferredAppLocale(undefined)).toBe('en');
  });

  it('validates and resolves app locale preferences', () => {
    expect(isAppLocalePreference('system')).toBe(true);
    expect(isAppLocalePreference('en')).toBe(true);
    expect(isAppLocalePreference('ko')).toBe(true);
    expect(isAppLocalePreference('fr')).toBe(false);
    expect(resolveAppLocale({ language: 'ko-KR', localePreference: 'system' })).toBe('ko');
    expect(resolveAppLocale({ language: 'en-US', localePreference: 'system' })).toBe('en');
    expect(resolveAppLocale({ language: 'en-US', localePreference: 'ko' })).toBe('ko');
    expect(resolveAppLocale({ language: 'ko-KR', localePreference: 'en' })).toBe('en');
  });

  it('uses consistent localized samples by font role', () => {
    expect(getAppFontSample({ locale: 'ko', role: 'interface' })).toBe('메뉴 · 설정 · Aa Bb 123');
    expect(getAppFontSample({ locale: 'ko', role: 'writing' })).toBe(
      '오래 쓰는 문장은 천천히 리듬을 찾습니다.',
    );
    expect(getAppFontSample({ locale: 'en', role: 'interface' })).toBe(
      'Menu · Settings · Aa Bb 123',
    );
    expect(getAppFontSample({ locale: 'en', role: 'writing' })).toBe(
      'The quiet room held its breath.',
    );
  });
});
