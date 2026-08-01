import { describe, expect, it } from 'vitest';

import { getTelemetryTimestampFreshness } from '@/utils/telemetry';

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
});
