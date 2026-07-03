/**
 * Generates a local unique id for optimistic UI records.
 */
export function createLocalMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Parses an ISO timestamp and falls back to now when invalid/missing.
 */
export function toTimestamp(isoTimestamp: string | undefined): number {
  if (!isoTimestamp) return Date.now();
  const parsed = Date.parse(isoTimestamp);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

/**
 * Sleeps for the provided duration.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Serializes values for concise trace previews.
 */
export function previewValue(value: unknown, max = 120): string {
  if (typeof value === 'string') {
    return value.length > max ? `${value.slice(0, max)}...` : value;
  }
  try {
    const serialized = JSON.stringify(value);
    if (!serialized) return '';
    return serialized.length > max ? `${serialized.slice(0, max)}...` : serialized;
  } catch {
    return String(value || '');
  }
}

/**
 * Truncates long text while preserving the original prefix.
 */
export function truncateText(value: string, max = 220): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...`;
}
