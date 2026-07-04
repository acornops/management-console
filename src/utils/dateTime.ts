export type DateTimeInput = Date | number | string | null | undefined;

interface DateTimeFormatOptions {
  fallback?: string;
  timeZone?: string;
  includeTimeZone?: boolean;
}

interface RelativeTimeOptions {
  fallback?: string;
  now?: number;
}

export function getUserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function parseDateTime(value: DateTimeInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getTimeZone(timeZone?: string): string {
  return timeZone || getUserTimeZone();
}

export function formatUserDateTime(value: DateTimeInput, options: DateTimeFormatOptions = {}): string {
  const date = parseDateTime(value);
  if (!date) return options.fallback ?? 'Unknown';

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: getTimeZone(options.timeZone),
    timeZoneName: options.includeTimeZone === false ? undefined : 'short'
  }).format(date);
}

export function formatUserDate(value: DateTimeInput, options: DateTimeFormatOptions = {}): string {
  const date = parseDateTime(value);
  if (!date) return options.fallback ?? 'Unknown';

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: getTimeZone(options.timeZone)
  }).format(date);
}

export function formatUserTime(value: DateTimeInput, options: DateTimeFormatOptions = {}): string {
  const date = parseDateTime(value);
  if (!date) return options.fallback ?? 'Unknown';

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: getTimeZone(options.timeZone),
    timeZoneName: options.includeTimeZone ? 'short' : undefined
  }).format(date);
}

export function formatRelativeTime(value: DateTimeInput, options: RelativeTimeOptions = {}): string {
  const date = parseDateTime(value);
  if (!date) return options.fallback ?? 'Unknown';

  const elapsedMs = Math.max((options.now ?? Date.now()) - date.getTime(), 0);
  const seconds = Math.floor(elapsedMs / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds} seconds ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;

  return formatUserDateTime(date, { fallback: options.fallback, includeTimeZone: true });
}

export function formatCompactRelativeTime(value: DateTimeInput, options: RelativeTimeOptions = {}): string {
  const date = parseDateTime(value);
  if (!date) return options.fallback ?? 'Unknown';

  const elapsedMs = Math.max((options.now ?? Date.now()) - date.getTime(), 0);
  const seconds = Math.floor(elapsedMs / 1000);
  if (seconds < 2) return 'now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return formatUserDateTime(date, { fallback: options.fallback, includeTimeZone: true });
}

export function formatElapsedDuration(startValue: DateTimeInput, endValue: DateTimeInput): string {
  const start = parseDateTime(startValue);
  const end = parseDateTime(endValue);
  if (!start || !end) return '-';

  const elapsedSeconds = Math.max(Math.round((end.getTime() - start.getTime()) / 1000), 0);
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
