import type { WorkflowSchedule } from '@/services/control-plane/workflowApi';
import { formatUserDateTime, getUserTimeZone } from '@/utils/dateTime';

export interface ScheduleDraft {
  id?: string;
  workflowId: string;
  name: string;
  cron: string;
  timezone: string;
  enabled: boolean;
  runsAsUserId: string;
}

export type ScheduleFrequency = 'weekdays' | 'daily' | 'weekly' | 'custom';

const cronPartPattern = /^[0-9*/?,\-]+$/;

export function scheduleFrequencyFromCron(cron: string): ScheduleFrequency {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return 'custom';
  if (!/^\d{1,2}$/.test(parts[0]) || !/^\d{1,2}$/.test(parts[1])) return 'custom';
  if (Number(parts[0]) > 59 || Number(parts[1]) > 23) return 'custom';
  if (parts[2] !== '*' || parts[3] !== '*') return 'custom';
  if (parts[4] === '1-5') return 'weekdays';
  if (parts[4] === '*') return 'daily';
  if (/^[0-6]$/.test(parts[4])) return 'weekly';
  return 'custom';
}

export function scheduleTimeFromCron(cron: string): string {
  const [minute, hour] = cron.trim().split(/\s+/);
  if (!/^\d{1,2}$/.test(hour || '') || !/^\d{1,2}$/.test(minute || '')) return '09:00';
  const numericHour = Number(hour);
  const numericMinute = Number(minute);
  if (numericHour > 23 || numericMinute > 59) return '09:00';
  return `${String(numericHour).padStart(2, '0')}:${String(numericMinute).padStart(2, '0')}`;
}

export function scheduleWeekdayFromCron(cron: string): string {
  const weekday = cron.trim().split(/\s+/)[4];
  return /^[0-6]$/.test(weekday || '') ? weekday : '1';
}

export function cronFromScheduleBuilder(frequency: Exclude<ScheduleFrequency, 'custom'>, time: string, weekday = '1'): string {
  const [hour = '9', minute = '0'] = time.split(':');
  const dayOfWeek = frequency === 'weekdays' ? '1-5' : frequency === 'weekly' ? weekday : '*';
  return `${Number(minute)} ${Number(hour)} * * ${dayOfWeek}`;
}

export function isValidScheduleCron(cron: string): boolean {
  const parts = cron.trim().split(/\s+/);
  const limits = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]] as const;
  return parts.length === 5 && parts.every((part, index) => {
    if (!cronPartPattern.test(part)) return false;
    const [minimum, maximum] = limits[index];
    return (part.match(/\d+/g) || []).every((value) => {
      const numericValue = Number(value);
      return numericValue >= minimum && numericValue <= maximum;
    });
  });
}

export function isValidTimeZone(timezone: string): boolean {
  if (!timezone.trim()) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone.trim() }).format();
    return true;
  } catch {
    return false;
  }
}

export const createEmptyDraft = (): ScheduleDraft => ({
  workflowId: '',
  name: '',
  cron: '0 9 * * 1-5',
  timezone: getUserTimeZone(),
  enabled: true,
  runsAsUserId: ''
});

export function formatScheduleDateTime(value: string | undefined, fallback: string): string {
  return formatUserDateTime(value, { fallback: value || fallback });
}

export function scheduleToDraft(schedule: WorkflowSchedule): ScheduleDraft {
  return {
    id: schedule.id,
    workflowId: schedule.workflowId,
    name: schedule.name,
    cron: schedule.cron,
    timezone: schedule.timezone,
    enabled: schedule.status === 'enabled',
    runsAsUserId: schedule.principal.id
  };
}
