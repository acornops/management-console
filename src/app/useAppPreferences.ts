import { Dispatch, MutableRefObject, SetStateAction, useEffect } from 'react';
import {
  GLOBAL_LANGUAGE_STORAGE_KEY,
  GLOBAL_THEME_STORAGE_KEY,
  getProfilePreferenceKey,
  getProfileStorageKey,
  LEGACY_WORKSPACE_CONTEXT_STORAGE_KEY,
  readLanguagePreference,
  readThemePreference,
  readWorkspacePreference
} from '@/app/preferences';
import { AppLanguageCode, getLanguageOption, resolveSupportedLanguageCode } from '@/i18n/languageConfig';
import { User } from '@/types';
import { safeStorage } from '@/utils/safeStorage';

type AppTheme = 'light' | 'dark';

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
  setTheme: Dispatch<SetStateAction<AppTheme>>;
  skipAnonymousPreferencePersistCountRef: MutableRefObject<number>;
  theme: AppTheme;
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
  setTheme,
  skipAnonymousPreferencePersistCountRef,
  theme,
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
    setTheme(readThemePreference(profileKey));
    setLanguage(readLanguagePreference(profileKey));
    setSelectedWorkspaceId(readWorkspacePreference(profileKey));
    setLoadedProfilePreferenceKey(profileKey);
    safeStorage.removeItem(LEGACY_WORKSPACE_CONTEXT_STORAGE_KEY);
  }, [setLanguage, setLoadedProfilePreferenceKey, setSelectedWorkspaceId, setTheme, user]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.body.className = 'bg-ui-bg';
    if (activeProfilePreferenceKey) {
      if (loadedProfilePreferenceKey !== activeProfilePreferenceKey) {
        return;
      }
      safeStorage.setItem(getProfileStorageKey(activeProfilePreferenceKey, 'theme'), theme);
      return;
    }
    if (skipAnonymousPreferencePersistCountRef.current > 0) {
      skipAnonymousPreferencePersistCountRef.current -= 1;
      return;
    }
    safeStorage.setItem(GLOBAL_THEME_STORAGE_KEY, theme);
  }, [activeProfilePreferenceKey, loadedProfilePreferenceKey, skipAnonymousPreferencePersistCountRef, theme]);

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
