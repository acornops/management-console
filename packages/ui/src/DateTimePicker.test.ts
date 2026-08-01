import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DateTimePicker, getCalendarDates, parseLocalDateTime, toLocalDateTimeValue } from './DateTimePicker';

describe('DateTimePicker helpers', () => {
  it('round trips local date-time values without applying a timezone conversion', () => {
    const value = '2026-08-01T20:43';
    expect(toLocalDateTimeValue(parseLocalDateTime(value)!)).toBe(value);
  });

  it('rejects invalid and impossible local date-time values', () => {
    expect(parseLocalDateTime('2026-02-30T12:00')).toBeNull();
    expect(parseLocalDateTime('not-a-date')).toBeNull();
  });

  it('builds a stable six-week calendar beginning on Sunday', () => {
    const dates = getCalendarDates(new Date(2026, 7, 1));
    expect(dates).toHaveLength(42);
    expect(dates[0].getDay()).toBe(0);
    expect(dates.some((date) => date.getFullYear() === 2026 && date.getMonth() === 7 && date.getDate() === 31)).toBe(true);
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
