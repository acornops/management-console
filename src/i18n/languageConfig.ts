export type AppLanguageCode = string;

export interface AppLanguageOption {
  code: AppLanguageCode;
  label: string;
  nativeLabel: string;
  htmlLang: string;
}

export interface RuntimeLanguageDescriptor extends AppLanguageOption {
  source: 'bundled' | 'file';
  path?: string;
}

export interface RuntimeLanguageManifest {
  defaultLanguage: AppLanguageCode;
  languages: RuntimeLanguageDescriptor[];
}

export const FALLBACK_LANGUAGE_CODE = 'en';
export const MAX_RUNTIME_LANGUAGES = 10;

export const BUILT_IN_LANGUAGE_OPTIONS: RuntimeLanguageDescriptor[] = [
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    htmlLang: 'en',
    source: 'bundled'
  },
  {
    code: 'zh',
    label: 'Mandarin Chinese',
    nativeLabel: '中文',
    htmlLang: 'zh-CN',
    source: 'bundled'
  }
];

const builtInLanguageCodes = new Set(BUILT_IN_LANGUAGE_OPTIONS.map((language) => language.code));

let supportedLanguages: AppLanguageOption[] = BUILT_IN_LANGUAGE_OPTIONS.map(toLanguageOption);
let defaultLanguageCode: AppLanguageCode = FALLBACK_LANGUAGE_CODE;

function toLanguageOption(language: RuntimeLanguageDescriptor): AppLanguageOption {
  const { code, label, nativeLabel, htmlLang } = language;
  return { code, label, nativeLabel, htmlLang };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isLanguageCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{1,8})*$/.test(value);
}

function isSafeRelativeLocalePath(value: string): boolean {
  return !value.startsWith('/') && !value.includes('://') && !value.includes('..');
}

export function isBuiltInLanguageCode(code: AppLanguageCode): boolean {
  return builtInLanguageCodes.has(code);
}

export function parseRuntimeLanguageManifest(value: unknown): RuntimeLanguageManifest | null {
  if (!isRecord(value) || !isNonEmptyString(value.defaultLanguage) || !Array.isArray(value.languages)) {
    return null;
  }
  if (value.languages.length < 1 || value.languages.length > MAX_RUNTIME_LANGUAGES) {
    return null;
  }

  const seenCodes = new Set<string>();
  const languages: RuntimeLanguageDescriptor[] = [];
  for (const item of value.languages) {
    if (!isRecord(item)) return null;
    if (!isLanguageCode(item.code) || !isNonEmptyString(item.label) || !isNonEmptyString(item.nativeLabel) || !isNonEmptyString(item.htmlLang)) {
      return null;
    }
    if (seenCodes.has(item.code)) return null;
    if (item.source !== 'bundled' && item.source !== 'file') return null;
    if (item.source === 'bundled' && !isBuiltInLanguageCode(item.code)) return null;
    if (item.source === 'file') {
      if (!isNonEmptyString(item.path) || !isSafeRelativeLocalePath(item.path)) return null;
    }
    seenCodes.add(item.code);
    const language: RuntimeLanguageDescriptor = {
      code: item.code,
      label: item.label,
      nativeLabel: item.nativeLabel,
      htmlLang: item.htmlLang,
      source: item.source
    };
    if (item.source === 'file') {
      language.path = item.path as string;
    }
    languages.push(language);
  }

  if (!seenCodes.has(value.defaultLanguage)) {
    return null;
  }

  return {
    defaultLanguage: value.defaultLanguage,
    languages
  };
}

export function setSupportedLanguages(languages: RuntimeLanguageDescriptor[], nextDefaultLanguageCode: AppLanguageCode): void {
  supportedLanguages = languages.map(toLanguageOption);
  defaultLanguageCode = languages.some((language) => language.code === nextDefaultLanguageCode)
    ? nextDefaultLanguageCode
    : FALLBACK_LANGUAGE_CODE;
}

export function getSupportedLanguages(): AppLanguageOption[] {
  return supportedLanguages;
}

export function getDefaultLanguageCode(): AppLanguageCode {
  return defaultLanguageCode;
}

export function getLanguageOption(code: AppLanguageCode): AppLanguageOption | undefined {
  return supportedLanguages.find((language) => language.code === code);
}

export function resolveSupportedLanguageCode(savedCode: string | null | undefined): AppLanguageCode {
  if (savedCode && supportedLanguages.some((language) => language.code === savedCode)) {
    return savedCode;
  }
  if (supportedLanguages.some((language) => language.code === defaultLanguageCode)) {
    return defaultLanguageCode;
  }
  return FALLBACK_LANGUAGE_CODE;
}
