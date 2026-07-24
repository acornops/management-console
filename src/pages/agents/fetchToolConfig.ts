export const FETCH_TOOL_ID = 'http.fetch.get';
export const MAX_FETCH_PATTERNS = 20;
export const MAX_FETCH_PATTERN_LENGTH = 2048;

export interface FetchToolConfig {
  allowedUrlPatterns: string[];
}

export interface FetchPatternValidation {
  errors: Record<number, string>;
  normalizedPatterns: string[];
}

function isIpLiteral(hostname: string): boolean {
  const normalized = hostname.replace(/^\[(.*)]$/, '$1');
  if (normalized.includes(':')) return true;
  const parts = normalized.split('.');
  return parts.length === 4
    && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

export function normalizeFetchPattern(rawValue: string): string {
  const value = rawValue.trim();
  if (!value) throw new Error('Enter a complete HTTPS URL.');
  if (value.length > MAX_FETCH_PATTERN_LENGTH) {
    throw new Error(`URLs may contain at most ${MAX_FETCH_PATTERN_LENGTH.toLocaleString()} characters.`);
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Enter a complete, valid URL.');
  }
  if (url.protocol !== 'https:') throw new Error('Only HTTPS URLs are supported.');
  if (url.username || url.password) throw new Error('URLs cannot include credentials.');
  if (url.hash) throw new Error('URLs cannot include fragments.');
  if (isIpLiteral(url.hostname)) throw new Error('Use a public DNS hostname, not an IP address.');

  const suffix = value.slice('https://'.length);
  const boundary = [suffix.indexOf('/'), suffix.indexOf('?')]
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0] ?? suffix.length;
  if (suffix.slice(0, boundary).includes('*')) {
    throw new Error('Wildcards are allowed only in the path or query.');
  }

  url.hostname = url.hostname.toLowerCase();
  if (url.port === '443') url.port = '';
  const normalized = `${url.origin}${url.pathname}${url.search}`;
  if (normalized.length > MAX_FETCH_PATTERN_LENGTH) {
    throw new Error(`URLs may contain at most ${MAX_FETCH_PATTERN_LENGTH.toLocaleString()} characters after normalization.`);
  }
  return normalized;
}

export function validateFetchPatterns(values: string[]): FetchPatternValidation {
  const errors: Record<number, string> = {};
  const normalizedPatterns: string[] = [];
  const seen = new Map<string, number>();
  if (values.length < 1 || values.length > MAX_FETCH_PATTERNS) {
    errors[0] = `Configure between 1 and ${MAX_FETCH_PATTERNS} URLs.`;
  }
  values.forEach((value, index) => {
    try {
      const normalized = normalizeFetchPattern(value);
      const duplicateIndex = seen.get(normalized);
      if (duplicateIndex !== undefined) {
        errors[index] = `This duplicates URL ${duplicateIndex + 1}.`;
        return;
      }
      seen.set(normalized, index);
      normalizedPatterns.push(normalized);
    } catch (error) {
      errors[index] = error instanceof Error ? error.message : 'This URL is invalid.';
    }
  });
  return { errors, normalizedPatterns };
}

export function fetchToolConfigFromRecord(value: Record<string, unknown> | undefined): FetchToolConfig {
  const patterns = value?.allowedUrlPatterns;
  return {
    allowedUrlPatterns: Array.isArray(patterns)
      ? patterns.filter((item): item is string => typeof item === 'string')
      : []
  };
}
