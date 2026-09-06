import { describe, expect, it } from 'vitest';
import { ControlPlaneRequestError } from '@/services/control-plane/http';

import {
  cronFromScheduleBuilder,
  isValidScheduleCron,
  isValidTimeZone,
  scheduleFrequencyFromCron,
  scheduleTimeFromCron,
  scheduleWeekdayFromCron,
  scheduleSaveFailure
} from '@/pages/WorkspaceSchedulesPage.helpers';

describe('workspace schedule editor helpers', () => {
  it('preserves actionable cadence failures and associates them with the cron field', () => {
    expect(scheduleSaveFailure(new ControlPlaneRequestError('Control plane request failed (400): Choose a date that exists.', 400, 'INVALID_CRON'), 'Draft retained.')).toEqual({
      message: 'Draft retained.', fieldErrors: { cron: 'Choose a date that exists.' }
    });
    expect(scheduleSaveFailure(new Error('Network internals'), 'Draft retained.')).toEqual({ message: 'Draft retained.', fieldErrors: {} });
  });
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
    expect(isValidScheduleCron('*/0 * * * *')).toBe(false);
    expect(isValidScheduleCron('5-1 * * * *')).toBe(false);
    expect(isValidScheduleCron('? * * * *')).toBe(false);
    expect(isValidScheduleCron('1,,2 * * * *')).toBe(false);
    expect(isValidScheduleCron('0 0 */2 * *')).toBe(true);
    expect(isValidScheduleCron('0 0 * */12 *')).toBe(true);
    expect(isValidScheduleCron('0 0 */100 * *')).toBe(true);
  });

  it('rejects overlong cron text before attempting a preview', () => {
    expect(isValidScheduleCron(`${'0,'.repeat(125)}0 * * * *`)).toBe(false);
  });

  it('validates IANA time zones', () => {
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Asia/Singapore')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus_Mons')).toBe(false);
  });
});
