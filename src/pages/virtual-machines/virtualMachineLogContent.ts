import { parseDateTime } from '@/utils/dateTime';

export function formatVmLoadedLogs(entries: Record<string, unknown>[], unknownTime: string, unknownSource: string): string {
  return entries.map(entry => [
    typeof entry.timestamp === 'string' && parseDateTime(entry.timestamp) ? entry.timestamp : unknownTime,
    [entry.source, entry.unit].filter(Boolean).map(String).join(' / ') || unknownSource,
    String(entry.message ?? '')
  ].join('\t')).join('\n');
}
