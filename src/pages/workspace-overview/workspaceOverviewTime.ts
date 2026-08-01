type OverviewTimeTranslator = (key: string, options?: Record<string, unknown>) => string;

export function formatOverviewRelativeTime(
  timestamp: number,
  t: OverviewTimeTranslator,
  now = Date.now()
): string {
  const elapsedSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (elapsedSeconds < 5) return t('overview.justNow');
  if (elapsedSeconds < 60) return t('overview.updatedSecondsAgo', { count: elapsedSeconds });

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return t('overview.updatedMinutesAgo', { count: elapsedMinutes });

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return t('overview.updatedHoursAgo', { count: elapsedHours });
  return t('overview.updatedDaysAgo', { count: Math.floor(elapsedHours / 24) });
}

export function formatOverviewExactTime(timestamp: number, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'medium'
  }).format(timestamp);
}
