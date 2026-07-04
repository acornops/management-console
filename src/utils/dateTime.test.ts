import { describe, expect, it, vi } from 'vitest';

import {
  formatCompactRelativeTime,
  formatElapsedDuration,
  formatRelativeTime,
  formatUserDate,
  formatUserDateTime,
  formatUserTime,
  getUserTimeZone,
  parseDateTime
} from './dateTime';

describe('dateTime utilities', () => {
  it('formats absolute date and time in the requested user timezone', () => {
    expect(formatUserDateTime('2026-06-29T13:35:00.000Z', { timeZone: 'Asia/Singapore' })).toBe('Jun 29, 2026, 9:35 PM GMT+8');
    expect(formatUserTime('2026-06-29T13:35:00.000Z', { timeZone: 'America/New_York', includeTimeZone: true })).toBe('9:35 AM EDT');
    expect(formatUserDate('2026-06-29T13:35:00.000Z', { timeZone: 'America/Los_Angeles' })).toBe('Jun 29, 2026');
  });

  it('falls back for invalid timestamps', () => {
    expect(parseDateTime('not-a-date')).toBeNull();
    expect(formatUserDateTime('not-a-date', { fallback: 'Never' })).toBe('Never');
    expect(formatUserTime(undefined, { fallback: '-' })).toBe('-');
  });

  it('formats relative time with readable units', () => {
    const now = Date.parse('2026-06-29T13:35:00.000Z');

    expect(formatRelativeTime('2026-06-29T13:34:57.000Z', { now })).toBe('just now');
    expect(formatRelativeTime('2026-06-29T13:34:00.000Z', { now })).toBe('1 minute ago');
    expect(formatRelativeTime('2026-06-29T12:35:00.000Z', { now })).toBe('1 hour ago');
    expect(formatRelativeTime('2026-06-28T13:35:00.000Z', { now })).toBe('1 day ago');
  });

  it('formats compact relative time for dense chart axes', () => {
    const now = Date.parse('2026-06-29T13:35:00.000Z');

    expect(formatCompactRelativeTime('2026-06-29T13:34:59.000Z', { now })).toBe('now');
    expect(formatCompactRelativeTime('2026-06-29T13:34:39.000Z', { now })).toBe('21s ago');
    expect(formatCompactRelativeTime('2026-06-29T12:50:00.000Z', { now })).toBe('45m ago');
    expect(formatCompactRelativeTime('2026-06-29T12:35:00.000Z', { now })).toBe('1h ago');
  });

  it('formats elapsed duration between timestamps', () => {
    expect(formatElapsedDuration('2026-06-29T13:35:00.000Z', '2026-06-29T13:36:05.000Z')).toBe('1m 5s');
    expect(formatElapsedDuration('2026-06-29T13:35:00.000Z', '2026-06-29T15:36:05.000Z')).toBe('2h 1m');
    expect(formatElapsedDuration('bad', '2026-06-29T15:36:05.000Z')).toBe('-');
  });

  it('reads the browser timezone when callers do not provide one', () => {
    const resolvedOptions = vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      locale: 'en-US',
      calendar: 'gregory',
      numberingSystem: 'latn',
      timeZone: 'Pacific/Auckland'
    });

    expect(getUserTimeZone()).toBe('Pacific/Auckland');

    resolvedOptions.mockRestore();
  });
});
