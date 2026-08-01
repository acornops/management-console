import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DateTimePicker, getCalendarDates, getFirstDayOfWeek, parseLocalDateTime, toLocalDateTimeValue } from './DateTimePicker';

describe('DateTimePicker helpers', () => {
  it('round trips local date-time values without applying a timezone conversion', () => {
    const value = '2026-08-01T20:43';
    expect(toLocalDateTimeValue(parseLocalDateTime(value)!)).toBe(value);
  });

  it('rejects invalid and impossible local date-time values', () => {
    expect(parseLocalDateTime('2026-02-30T12:00')).toBeNull();
    expect(parseLocalDateTime('not-a-date')).toBeNull();
  });

  it('builds a stable six-week calendar from the locale week boundary', () => {
    const sundayDates = getCalendarDates(new Date(2026, 7, 1), getFirstDayOfWeek('en-US'));
    const mondayDates = getCalendarDates(new Date(2026, 7, 1), getFirstDayOfWeek('en-GB'));

    expect(sundayDates).toHaveLength(42);
    expect(sundayDates[0].getDay()).toBe(0);
    expect(mondayDates).toHaveLength(42);
    expect(mondayDates[0].getDay()).toBe(1);
    expect(mondayDates.some((date) => date.getFullYear() === 2026 && date.getMonth() === 7 && date.getDate() === 31)).toBe(true);
  });

  it('uses locale week data with a safe Sunday fallback', () => {
    expect(getFirstDayOfWeek('en-US')).toBe(0);
    expect(getFirstDayOfWeek('en-GB')).toBe(1);
    expect(getFirstDayOfWeek('zh-CN')).toBe(1);
    expect(getFirstDayOfWeek('not_a_locale')).toBe(0);
  });

  it('preserves responsive shared control targets inside the picker', () => {
    const source = readFileSync(resolve(__dirname, 'DateTimePicker.tsx'), 'utf8');

    expect(source).not.toContain("className: 'h-9 w-9 min-h-9'");
    expect(source).not.toContain("formInputClassName('h-10 min-h-10");
    expect(source.match(/formInputClassName\('px-3 text-center type-ui sm:min-h-9'\)/g)).toHaveLength(2);
  });

  it('renders a dialog trigger with a localized, human-readable value', () => {
    const markup = renderToStaticMarkup(React.createElement(DateTimePicker, {
      ariaLabel: 'From',
      locale: 'en-US',
      onChange: () => undefined,
      value: '2026-08-01T20:43'
    }));

    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain('Aug 1, 2026');
    expect(markup).not.toContain('datetime-local');
  });
});
