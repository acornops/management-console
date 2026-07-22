import { Dispatch, SetStateAction, useEffect } from 'react';
import {
  clearActiveThemePreference,
  GLOBAL_LANGUAGE_STORAGE_KEY,
  getProfilePreferenceKey,
  getProfileStorageKey,
  LEGACY_WORKSPACE_CONTEXT_STORAGE_KEY,
  persistActiveThemePreference,
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
  isSessionRestoring: boolean;
  language: AppLanguageCode;
  loadedAnonymousPreferences: boolean;
  loadedProfilePreferenceKey: string | null;
  selectedWorkspaceId: string | null;
  setLanguage: Dispatch<SetStateAction<AppLanguageCode>>;
  setLoadedAnonymousPreferences: Dispatch<SetStateAction<boolean>>;
  setLoadedProfilePreferenceKey: Dispatch<SetStateAction<string | null>>;
  setSelectedWorkspaceId: Dispatch<SetStateAction<string | null>>;
  setResolvedTheme: Dispatch<SetStateAction<ResolvedTheme>>;
  setThemePreference: Dispatch<SetStateAction<ThemePreference>>;
  themePreference: ThemePreference;
  user: User | null;
};

export function useAppPreferences({
  i18n,
  isSessionRestoring,
  language,
  loadedAnonymousPreferences,
  loadedProfilePreferenceKey,
  selectedWorkspaceId,
  setLanguage,
  setLoadedAnonymousPreferences,
  setLoadedProfilePreferenceKey,
  setSelectedWorkspaceId,
  setResolvedTheme,
  setThemePreference,
  themePreference,
  user
}: UseAppPreferencesOptions): void {
  const activeProfilePreferenceKey = user ? getProfilePreferenceKey(user) : null;

  useEffect(() => {
    if (user) {
      const profileKey = getProfilePreferenceKey(user);
      const profileThemePreference = readThemePreference(profileKey);
      setLoadedAnonymousPreferences(false);
      setThemePreference(profileThemePreference);
      persistActiveThemePreference(profileThemePreference);
      setLanguage(readLanguagePreference(profileKey));
      setSelectedWorkspaceId(readWorkspacePreference(profileKey));
      setLoadedProfilePreferenceKey(profileKey);
      safeStorage.removeItem(LEGACY_WORKSPACE_CONTEXT_STORAGE_KEY);
      return;
    }

    if (isSessionRestoring) {
      return;
    }

    clearActiveThemePreference();
    setThemePreference(readThemePreference());
    setLanguage(readLanguagePreference());
    setLoadedAnonymousPreferences(true);
    if (loadedProfilePreferenceKey !== null) {
      setLoadedProfilePreferenceKey(null);
    }
    setSelectedWorkspaceId(null);
  }, [
    isSessionRestoring,
    loadedProfilePreferenceKey,
    setLanguage,
    setLoadedAnonymousPreferences,
    setLoadedProfilePreferenceKey,
    setSelectedWorkspaceId,
    setThemePreference,
    user
  ]);

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
      persistActiveThemePreference(themePreference);
      return;
    }
    if (isSessionRestoring || !loadedAnonymousPreferences) {
      return;
    }
    persistThemePreference(themePreference);
  }, [
    activeProfilePreferenceKey,
    isSessionRestoring,
    loadedAnonymousPreferences,
    loadedProfilePreferenceKey,
    themePreference
  ]);

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
    if (isSessionRestoring || !loadedAnonymousPreferences) {
      return;
    }
    safeStorage.setItem(GLOBAL_LANGUAGE_STORAGE_KEY, supportedLanguage);
  }, [
    activeProfilePreferenceKey,
    i18n,
    isSessionRestoring,
    language,
    loadedAnonymousPreferences,
    loadedProfilePreferenceKey,
    setLanguage
  ]);

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
