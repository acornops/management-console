import { User } from '@/types';
import { AppLanguageCode, getLanguageOption, resolveSupportedLanguageCode } from '@/i18n/languageConfig';
import { safeStorage } from '@/utils/safeStorage';
import { parseThemePreference, type ThemePreference } from '@/app/theme';

export const GLOBAL_THEME_STORAGE_KEY = 'app_theme';
export const GLOBAL_LANGUAGE_STORAGE_KEY = 'app_language';
export const LEGACY_WORKSPACE_CONTEXT_STORAGE_KEY = 'acornops_workspace_context_id';
export const PROFILE_PREFERENCE_STORAGE_PREFIX = 'acornops_profile_preferences';

export type ProfilePreferenceName = 'theme' | 'language' | 'workspace_context_id';

export function getProfilePreferenceKey(user: User): string {
  return encodeURIComponent(user.email.trim().toLowerCase());
}

export function getProfileStorageKey(profileKey: string, preference: ProfilePreferenceName): string {
  return `${PROFILE_PREFERENCE_STORAGE_PREFIX}:${profileKey}:${preference}`;
}

export function readThemePreference(profileKey?: string): ThemePreference {
  if (profileKey) {
    const saved = safeStorage.getItem(getProfileStorageKey(profileKey, 'theme'));
    if (saved !== null) {
      return parseThemePreference(saved);
    }
  }
  return parseThemePreference(safeStorage.getItem(GLOBAL_THEME_STORAGE_KEY));
}

export function persistThemePreference(preference: ThemePreference, profileKey?: string): void {
  safeStorage.setItem(
    profileKey ? getProfileStorageKey(profileKey, 'theme') : GLOBAL_THEME_STORAGE_KEY,
    preference
  );
}

export function readLanguagePreference(profileKey?: string): AppLanguageCode {
  const globalLanguage = safeStorage.getItem(GLOBAL_LANGUAGE_STORAGE_KEY);
  if (!profileKey) {
    return resolveSupportedLanguageCode(globalLanguage);
  }
  const saved = safeStorage.getItem(getProfileStorageKey(profileKey, 'language'));
  return saved && getLanguageOption(saved) ? saved : resolveSupportedLanguageCode(globalLanguage);
}

export function readWorkspacePreference(profileKey: string): string | null {
  const saved = safeStorage.getItem(getProfileStorageKey(profileKey, 'workspace_context_id'));
  return saved && saved.trim().length > 0 ? saved : null;
}
