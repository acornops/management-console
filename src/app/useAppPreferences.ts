import { Dispatch, MutableRefObject, SetStateAction, useEffect } from 'react';
import {
  GLOBAL_LANGUAGE_STORAGE_KEY,
  getProfilePreferenceKey,
  getProfileStorageKey,
  LEGACY_WORKSPACE_CONTEXT_STORAGE_KEY,
  persistThemePreference,
  readLanguagePreference,
  readThemePreference,
  readWorkspacePreference
} from '@/app/preferences';
import { AppLanguageCode, getLanguageOption, resolveSupportedLanguageCode } from '@/i18n/languageConfig';
import { User } from '@/types';
import { safeStorage } from '@/utils/safeStorage';
import {
  applyResolvedTheme,
  observeResolvedTheme,
  type ResolvedTheme,
  type ThemePreference
} from '@/app/theme';

type AppI18n = {
  language: string;
  changeLanguage: (language: AppLanguageCode) => Promise<unknown>;
};

type UseAppPreferencesOptions = {
  i18n: AppI18n;
  language: AppLanguageCode;
  loadedProfilePreferenceKey: string | null;
  selectedWorkspaceId: string | null;
  setLanguage: Dispatch<SetStateAction<AppLanguageCode>>;
  setLoadedProfilePreferenceKey: Dispatch<SetStateAction<string | null>>;
  setSelectedWorkspaceId: Dispatch<SetStateAction<string | null>>;
  setResolvedTheme: Dispatch<SetStateAction<ResolvedTheme>>;
  setThemePreference: Dispatch<SetStateAction<ThemePreference>>;
  skipAnonymousPreferencePersistCountRef: MutableRefObject<number>;
  themePreference: ThemePreference;
  user: User | null;
};

export function useAppPreferences({
  i18n,
  language,
  loadedProfilePreferenceKey,
  selectedWorkspaceId,
  setLanguage,
  setLoadedProfilePreferenceKey,
  setSelectedWorkspaceId,
  setResolvedTheme,
  setThemePreference,
  skipAnonymousPreferencePersistCountRef,
  themePreference,
  user
}: UseAppPreferencesOptions): void {
  const activeProfilePreferenceKey = user ? getProfilePreferenceKey(user) : null;

  useEffect(() => {
    if (!user) {
      setLoadedProfilePreferenceKey(null);
      setSelectedWorkspaceId(null);
      return;
    }

    const profileKey = getProfilePreferenceKey(user);
    setThemePreference(readThemePreference(profileKey));
    setLanguage(readLanguagePreference(profileKey));
    setSelectedWorkspaceId(readWorkspacePreference(profileKey));
    setLoadedProfilePreferenceKey(profileKey);
    safeStorage.removeItem(LEGACY_WORKSPACE_CONTEXT_STORAGE_KEY);
  }, [setLanguage, setLoadedProfilePreferenceKey, setSelectedWorkspaceId, setThemePreference, user]);

  useEffect(() => {
    document.documentElement.dataset.themePreference = themePreference;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    return observeResolvedTheme(themePreference, mediaQuery, (nextTheme) => {
      setResolvedTheme(nextTheme);
      applyResolvedTheme(nextTheme);
      document.body.className = 'bg-ui-bg';
    });
  }, [setResolvedTheme, themePreference]);

  useEffect(() => {
    if (activeProfilePreferenceKey) {
      if (loadedProfilePreferenceKey !== activeProfilePreferenceKey) {
        return;
      }
      persistThemePreference(themePreference, activeProfilePreferenceKey);
      return;
    }
    if (skipAnonymousPreferencePersistCountRef.current > 0) {
      skipAnonymousPreferencePersistCountRef.current -= 1;
      return;
    }
    persistThemePreference(themePreference);
  }, [activeProfilePreferenceKey, loadedProfilePreferenceKey, skipAnonymousPreferencePersistCountRef, themePreference]);

  useEffect(() => {
    const supportedLanguage = resolveSupportedLanguageCode(language);
    document.documentElement.lang = getLanguageOption(supportedLanguage)?.htmlLang || supportedLanguage;
    if (language !== supportedLanguage) {
      setLanguage(supportedLanguage);
      return;
    }
    if (i18n.language !== supportedLanguage) {
      void i18n.changeLanguage(supportedLanguage);
    }
    if (activeProfilePreferenceKey) {
      if (loadedProfilePreferenceKey !== activeProfilePreferenceKey) {
        return;
      }
      safeStorage.setItem(getProfileStorageKey(activeProfilePreferenceKey, 'language'), supportedLanguage);
      return;
    }
    if (skipAnonymousPreferencePersistCountRef.current > 0) {
      skipAnonymousPreferencePersistCountRef.current -= 1;
      return;
    }
    safeStorage.setItem(GLOBAL_LANGUAGE_STORAGE_KEY, supportedLanguage);
  }, [activeProfilePreferenceKey, i18n, language, loadedProfilePreferenceKey, setLanguage, skipAnonymousPreferencePersistCountRef]);

  useEffect(() => {
    if (!activeProfilePreferenceKey || loadedProfilePreferenceKey !== activeProfilePreferenceKey) {
      return;
    }
    if (selectedWorkspaceId) {
      safeStorage.setItem(getProfileStorageKey(activeProfilePreferenceKey, 'workspace_context_id'), selectedWorkspaceId);
      return;
    }
    safeStorage.removeItem(getProfileStorageKey(activeProfilePreferenceKey, 'workspace_context_id'));
  }, [activeProfilePreferenceKey, loadedProfilePreferenceKey, selectedWorkspaceId]);
}
