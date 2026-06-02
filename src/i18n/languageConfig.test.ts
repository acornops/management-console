import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_LANGUAGE_OPTIONS,
  MAX_RUNTIME_LANGUAGES,
  parseRuntimeLanguageManifest,
  resolveSupportedLanguageCode,
  setSupportedLanguages
} from './languageConfig';

describe('runtime language configuration', () => {
  it('accepts bundled and file-backed runtime languages', () => {
    const manifest = parseRuntimeLanguageManifest({
      defaultLanguage: 'fr',
      languages: [
        { code: 'en', label: 'English', nativeLabel: 'English', htmlLang: 'en', source: 'bundled' },
        { code: 'fr', label: 'French', nativeLabel: 'Français', htmlLang: 'fr', source: 'file', path: 'fr.json' }
      ]
    });

    expect(manifest?.defaultLanguage).toBe('fr');
    expect(manifest?.languages.map((language) => language.code)).toEqual(['en', 'fr']);
  });

  it('accepts regional and script language codes', () => {
    const manifest = parseRuntimeLanguageManifest({
      defaultLanguage: 'pt-BR',
      languages: [
        { code: 'pt-BR', label: 'Portuguese', nativeLabel: 'Português', htmlLang: 'pt-BR', source: 'file', path: 'pt-BR.json' },
        { code: 'zh-Hant', label: 'Traditional Chinese', nativeLabel: '繁體中文', htmlLang: 'zh-Hant', source: 'file', path: 'zh-Hant.json' }
      ]
    });

    expect(manifest?.languages.map((language) => language.code)).toEqual(['pt-BR', 'zh-Hant']);
  });

  it('rejects unsupported bundled language codes and unsafe file paths', () => {
    expect(parseRuntimeLanguageManifest({
      defaultLanguage: 'fr',
      languages: [
        { code: 'fr', label: 'French', nativeLabel: 'Français', htmlLang: 'fr', source: 'bundled' }
      ]
    })).toBeNull();

    expect(parseRuntimeLanguageManifest({
      defaultLanguage: 'fr',
      languages: [
        { code: 'fr', label: 'French', nativeLabel: 'Français', htmlLang: 'fr', source: 'file', path: '../fr.json' }
      ]
    })).toBeNull();
  });

  it('rejects malformed language codes', () => {
    expect(parseRuntimeLanguageManifest({
      defaultLanguage: '__proto__',
      languages: [
        { code: '__proto__', label: 'Invalid', nativeLabel: 'Invalid', htmlLang: 'en', source: 'file', path: 'invalid.json' }
      ]
    })).toBeNull();
  });

  it('rejects invalid defaults and more than ten languages', () => {
    expect(parseRuntimeLanguageManifest({
      defaultLanguage: 'fr',
      languages: [
        { code: 'en', label: 'English', nativeLabel: 'English', htmlLang: 'en', source: 'bundled' }
      ]
    })).toBeNull();

    expect(parseRuntimeLanguageManifest({
      defaultLanguage: 'l0',
      languages: Array.from({ length: MAX_RUNTIME_LANGUAGES + 1 }).map((_, index) => ({
        code: `l${index}`,
        label: `Language ${index}`,
        nativeLabel: `Language ${index}`,
        htmlLang: `l${index}`,
        source: 'file',
        path: `l${index}.json`
      }))
    })).toBeNull();
  });

  it('falls back when the saved language is no longer supported', () => {
    setSupportedLanguages([
      { code: 'en', label: 'English', nativeLabel: 'English', htmlLang: 'en', source: 'bundled' },
      { code: 'fr', label: 'French', nativeLabel: 'Français', htmlLang: 'fr', source: 'file', path: 'fr.json' }
    ], 'fr');

    expect(resolveSupportedLanguageCode('zh')).toBe('fr');
    expect(resolveSupportedLanguageCode('en')).toBe('en');

    setSupportedLanguages(BUILT_IN_LANGUAGE_OPTIONS, 'en');
  });
});
