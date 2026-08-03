import { describe, expect, it } from 'vitest';

import { formatLastUpdated, getTelemetryTimestampFreshness } from '@/utils/telemetry';

describe('telemetry timestamp freshness', () => {
  const now = Date.parse('2026-08-02T00:00:00.000Z');

  it('classifies current, stale, and offline telemetry at the shared thresholds', () => {
    expect(getTelemetryTimestampFreshness(now - 60_000, now)).toBe('current');
    expect(getTelemetryTimestampFreshness(now - 2 * 60_000, now)).toBe('stale');
    expect(getTelemetryTimestampFreshness(now - 10 * 60_000, now)).toBe('offline');
  });

  it('treats invalid timestamps as unavailable', () => {
    expect(getTelemetryTimestampFreshness('not-a-timestamp', now)).toBe('unavailable');
  });

  it('uses sentence case for standalone freshness values and fallbacks', () => {
    expect(formatLastUpdated(new Date(now - 1_000).toISOString(), now)).toBe('Just now');
    expect(formatLastUpdated('not-a-timestamp', now)).toBe('Unknown');
  });
});
