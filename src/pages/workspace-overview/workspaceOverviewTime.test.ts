import { describe, expect, it } from 'vitest';

import { formatOverviewRelativeTime } from './workspaceOverviewTime';

const t = (key: string, options?: Record<string, unknown>): string => {
  const count = options?.count;
  if (key === 'overview.justNow') return 'Just now';
  if (key === 'overview.updatedSecondsAgo') return `${count}s ago`;
  if (key === 'overview.updatedMinutesAgo') return `${count}m ago`;
  if (key === 'overview.updatedHoursAgo') return `${count}h ago`;
  if (key === 'overview.updatedDaysAgo') return `${count}d ago`;
  return key;
};

describe('workspace overview relative time', () => {
  const now = 1_700_000_000_000;

  it('shows live second-level recency during the first minute', () => {
    expect(formatOverviewRelativeTime(now, t, now)).toBe('Just now');
    expect(formatOverviewRelativeTime(now - 4_999, t, now)).toBe('Just now');
    expect(formatOverviewRelativeTime(now - 5_000, t, now)).toBe('5s ago');
    expect(formatOverviewRelativeTime(now - 59_999, t, now)).toBe('59s ago');
  });

  it('uses compact minute, hour, and day units after the first minute', () => {
    expect(formatOverviewRelativeTime(now - 60_000, t, now)).toBe('1m ago');
    expect(formatOverviewRelativeTime(now - 60 * 60_000, t, now)).toBe('1h ago');
    expect(formatOverviewRelativeTime(now - 24 * 60 * 60_000, t, now)).toBe('1d ago');
  });

  it('treats small future clock skew as just now', () => {
    expect(formatOverviewRelativeTime(now + 30_000, t, now)).toBe('Just now');
  });
});
