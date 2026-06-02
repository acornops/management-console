import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  BUILT_IN_LANGUAGE_OPTIONS,
  RuntimeLanguageDescriptor,
  setSupportedLanguages
} from '@/i18n/languageConfig';
import {
  GLOBAL_LANGUAGE_STORAGE_KEY,
  getProfileStorageKey,
  readLanguagePreference
} from './preferences';

const originalWindow = globalThis.window;
const runtimeLanguages: RuntimeLanguageDescriptor[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', htmlLang: 'en', source: 'bundled' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', htmlLang: 'fr', source: 'file', path: 'fr.json' }
];

function installStorageMock(): void {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        clear: () => storage.clear(),
        getItem: (key: string) => storage.get(key) || null,
        removeItem: (key: string) => storage.delete(key),
        setItem: (key: string, value: string) => storage.set(key, value)
      }
    },
    writable: true
  });
}

describe('language preferences', () => {
  beforeEach(() => {
    installStorageMock();
    window.localStorage.clear();
    setSupportedLanguages(runtimeLanguages, 'fr');
  });

  afterEach(() => {
    window.localStorage.clear();
    setSupportedLanguages(BUILT_IN_LANGUAGE_OPTIONS, 'en');
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
      writable: true
    });
  });

  it('uses a supported profile language preference', () => {
    window.localStorage.setItem(getProfileStorageKey('user', 'language'), 'en');
    window.localStorage.setItem(GLOBAL_LANGUAGE_STORAGE_KEY, 'fr');

    expect(readLanguagePreference('user')).toBe('en');
  });

  it('falls back to global preference when the profile language is unsupported', () => {
    window.localStorage.setItem(getProfileStorageKey('user', 'language'), 'zh');
    window.localStorage.setItem(GLOBAL_LANGUAGE_STORAGE_KEY, 'fr');

    expect(readLanguagePreference('user')).toBe('fr');
  });

  it('uses the runtime default when stored preferences are unsupported', () => {
    window.localStorage.setItem(GLOBAL_LANGUAGE_STORAGE_KEY, 'zh');

    expect(readLanguagePreference()).toBe('fr');
  });
});
