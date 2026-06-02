import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './i18n/resources.js';
import {
  BUILT_IN_LANGUAGE_OPTIONS,
  FALLBACK_LANGUAGE_CODE,
  RuntimeLanguageDescriptor,
  getDefaultLanguageCode,
  parseRuntimeLanguageManifest,
  resolveSupportedLanguageCode,
  setSupportedLanguages
} from './i18n/languageConfig';
import { safeStorage } from './utils/safeStorage';

type TranslationResource = Record<string, unknown>;

let initializationPromise: Promise<void> | null = null;

function isTranslationResource(value: unknown): value is TranslationResource {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getLocaleManifestUrl(): URL | null {
  if (typeof window === 'undefined') return null;
  return new URL(`${import.meta.env.BASE_URL}locales/manifest.json`, window.location.origin);
}

async function fetchJson(url: URL): Promise<unknown | null> {
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.warn('Failed loading locale runtime asset', error);
    return null;
  }
}

async function loadRuntimeLanguages(): Promise<{
  languages: RuntimeLanguageDescriptor[];
  defaultLanguage: string;
  fileResources: Record<string, { translation: TranslationResource }>;
}> {
  const manifestUrl = getLocaleManifestUrl();
  if (!manifestUrl) {
    return { languages: BUILT_IN_LANGUAGE_OPTIONS, defaultLanguage: FALLBACK_LANGUAGE_CODE, fileResources: {} };
  }

  const manifest = parseRuntimeLanguageManifest(await fetchJson(manifestUrl));
  if (!manifest) {
    return { languages: BUILT_IN_LANGUAGE_OPTIONS, defaultLanguage: FALLBACK_LANGUAGE_CODE, fileResources: {} };
  }

  const languages: RuntimeLanguageDescriptor[] = [];
  const fileResources: Record<string, { translation: TranslationResource }> = {};
  for (const language of manifest.languages) {
    if (language.source === 'bundled') {
      languages.push(language);
      continue;
    }

    const localeUrl = new URL(language.path as string, manifestUrl);
    const resource = await fetchJson(localeUrl);
    if (!isTranslationResource(resource)) {
      console.warn(`Skipping invalid locale resource for ${language.code}.`);
      continue;
    }
    fileResources[language.code] = { translation: resource };
    languages.push(language);
  }

  if (languages.length === 0) {
    return { languages: BUILT_IN_LANGUAGE_OPTIONS, defaultLanguage: FALLBACK_LANGUAGE_CODE, fileResources: {} };
  }

  const defaultLanguage = languages.some((language) => language.code === manifest.defaultLanguage)
    ? manifest.defaultLanguage
    : languages[0].code;
  return { languages, defaultLanguage, fileResources };
}

export async function initializeI18n(): Promise<void> {
  if (initializationPromise) return initializationPromise;
  initializationPromise = (async () => {
    const runtimeLanguages = await loadRuntimeLanguages();
    setSupportedLanguages(runtimeLanguages.languages, runtimeLanguages.defaultLanguage);
    const initialLanguage = resolveSupportedLanguageCode(safeStorage.getItem('app_language') || getDefaultLanguageCode());
    await i18n
      .use(initReactI18next)
      .init({
        resources: {
          ...resources,
          ...runtimeLanguages.fileResources
        },
        lng: initialLanguage,
        fallbackLng: FALLBACK_LANGUAGE_CODE,
        returnNull: false,
        interpolation: {
          escapeValue: false
        }
      });
  })();
  return initializationPromise;
}

export { resources };
export default i18n;
