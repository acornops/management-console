import { describe, expect, it } from 'vitest';

import {
  cronFromScheduleBuilder,
  isValidScheduleCron,
  isValidTimeZone,
  scheduleFrequencyFromCron,
  scheduleTimeFromCron,
  scheduleWeekdayFromCron
} from '@/pages/WorkspaceSchedulesPage.helpers';

describe('workspace schedule editor helpers', () => {
  it('round-trips guided weekday, daily, and weekly cadences', () => {
    expect(cronFromScheduleBuilder('weekdays', '08:30')).toBe('30 8 * * 1-5');
    expect(scheduleFrequencyFromCron('30 8 * * 1-5')).toBe('weekdays');
    expect(scheduleTimeFromCron('30 8 * * 1-5')).toBe('08:30');

    expect(cronFromScheduleBuilder('daily', '14:05')).toBe('5 14 * * *');
    expect(scheduleFrequencyFromCron('5 14 * * *')).toBe('daily');

    expect(cronFromScheduleBuilder('weekly', '09:00', '4')).toBe('0 9 * * 4');
    expect(scheduleFrequencyFromCron('0 9 * * 4')).toBe('weekly');
    expect(scheduleWeekdayFromCron('0 9 * * 4')).toBe('4');
  });

  it('keeps non-canonical expressions in custom mode', () => {
    expect(scheduleFrequencyFromCron('*/15 8-18 * * 1-5')).toBe('custom');
    expect(scheduleFrequencyFromCron('not a cron')).toBe('custom');
  });

  it('rejects malformed and out-of-range cron fields', () => {
    expect(isValidScheduleCron('*/15 8-18 * * 1-5')).toBe(true);
    expect(isValidScheduleCron('0 9 * * 1-5')).toBe(true);
    expect(isValidScheduleCron('60 9 * * 1-5')).toBe(false);
    expect(isValidScheduleCron('0 24 * * 1-5')).toBe(false);
    expect(isValidScheduleCron('0 9 * 13 1-5')).toBe(false);
    expect(isValidScheduleCron('not a cron')).toBe(false);
  });

  it('validates IANA time zones', () => {
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Asia/Singapore')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus_Mons')).toBe(false);
  });
});
