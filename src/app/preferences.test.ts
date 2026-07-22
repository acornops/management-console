import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  BUILT_IN_LANGUAGE_OPTIONS,
  RuntimeLanguageDescriptor,
  setSupportedLanguages
} from '@/i18n/languageConfig';
import {
  ACTIVE_THEME_PREFERENCE_STORAGE_KEY,
  clearActiveThemePreference,
  GLOBAL_LANGUAGE_STORAGE_KEY,
  GLOBAL_THEME_STORAGE_KEY,
  getProfileStorageKey,
  persistActiveThemePreference,
  persistThemePreference,
  readLanguagePreference,
  readInitialThemePreference,
  readThemePreference
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

describe('theme preferences', () => {
  beforeEach(() => {
    installStorageMock();
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
      writable: true
    });
  });

  it.each(['light', 'dark', 'system'] as const)('preserves a stored %s preference', (preference) => {
    window.localStorage.setItem(GLOBAL_THEME_STORAGE_KEY, preference);
    expect(readThemePreference()).toBe(preference);
  });

  it.each([null, '', 'sepia'])('defaults a missing or invalid global preference to System', (preference) => {
    if (preference !== null) window.localStorage.setItem(GLOBAL_THEME_STORAGE_KEY, preference);
    expect(readThemePreference()).toBe('system');
  });

  it('uses the active-session hint ahead of the global preference during initial theme resolution', () => {
    window.localStorage.setItem(GLOBAL_THEME_STORAGE_KEY, 'dark');
    window.localStorage.setItem(ACTIVE_THEME_PREFERENCE_STORAGE_KEY, 'light');

    expect(readInitialThemePreference()).toBe('light');
  });

  it('falls back to the global preference when there is no active-session hint', () => {
    window.localStorage.setItem(GLOBAL_THEME_STORAGE_KEY, 'dark');

    expect(readInitialThemePreference()).toBe('dark');
  });

  it('treats an invalid active-session hint as System instead of leaking the global choice', () => {
    window.localStorage.setItem(GLOBAL_THEME_STORAGE_KEY, 'dark');
    window.localStorage.setItem(ACTIVE_THEME_PREFERENCE_STORAGE_KEY, 'sepia');

    expect(readInitialThemePreference()).toBe('system');
  });

  it('uses an explicit profile preference ahead of the global preference', () => {
    window.localStorage.setItem(GLOBAL_THEME_STORAGE_KEY, 'dark');
    window.localStorage.setItem(getProfileStorageKey('operator', 'theme'), 'light');
    expect(readThemePreference('operator')).toBe('light');
  });

  it('falls back to the global preference when the profile has no stored choice', () => {
    window.localStorage.setItem(GLOBAL_THEME_STORAGE_KEY, 'dark');
    expect(readThemePreference('operator')).toBe('dark');
  });

  it('treats an explicit invalid profile value as System instead of leaking the global choice', () => {
    window.localStorage.setItem(GLOBAL_THEME_STORAGE_KEY, 'dark');
    window.localStorage.setItem(getProfileStorageKey('operator', 'theme'), 'invalid');
    expect(readThemePreference('operator')).toBe('system');
  });

  it('persists System and explicit themes at global and profile scope', () => {
    persistThemePreference('system');
    persistThemePreference('light', 'operator');

    expect(window.localStorage.getItem(GLOBAL_THEME_STORAGE_KEY)).toBe('system');
    expect(window.localStorage.getItem(getProfileStorageKey('operator', 'theme'))).toBe('light');
  });

  it('persists and clears the active-session hint independently of global and profile preferences', () => {
    window.localStorage.setItem(GLOBAL_THEME_STORAGE_KEY, 'dark');
    persistThemePreference('system', 'operator');

    persistActiveThemePreference('light');
    expect(window.localStorage.getItem(ACTIVE_THEME_PREFERENCE_STORAGE_KEY)).toBe('light');

    clearActiveThemePreference();
    expect(window.localStorage.getItem(ACTIVE_THEME_PREFERENCE_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(GLOBAL_THEME_STORAGE_KEY)).toBe('dark');
    expect(window.localStorage.getItem(getProfileStorageKey('operator', 'theme'))).toBe('system');
  });

  it('keeps System as the safe initial theme when storage is unavailable', () => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        clear: () => undefined,
        getItem: () => {
          throw new Error('storage unavailable');
        },
        removeItem: () => {
          throw new Error('storage unavailable');
        },
        setItem: () => {
          throw new Error('storage unavailable');
        }
      }
    });

    expect(readInitialThemePreference()).toBe('system');
    expect(() => persistActiveThemePreference('dark')).not.toThrow();
    expect(() => clearActiveThemePreference()).not.toThrow();
  });
});
