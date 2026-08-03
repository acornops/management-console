import { describe, expect, it } from 'vitest';

import { projectTelemetrySeries, telemetryGapThreshold } from '@/components/common/telemetryChart';

describe('telemetry chart projection', () => {
  it('projects target-neutral points into a bounded chart path', () => {
    const result = projectTelemetrySeries([
      { position: 10, value: 2 },
      { position: 20, value: 4 }
    ], {
      xStart: 0,
      xEnd: 100,
      yStart: 0,
      yEnd: 50,
      minValue: 0,
      maxValue: 4
    });

    expect(result.path).toBe('M 0.0 25.0 L 100.0 0.0');
    expect(result.points).toHaveLength(2);
  });

  it('starts a new segment after a telemetry gap', () => {
    const positions = [0, 10, 20, 100];
    const threshold = telemetryGapThreshold(positions, 15);
    const result = projectTelemetrySeries(
      positions.map((position) => ({ position, value: position })),
      { xStart: 0, xEnd: 100, yStart: 0, yEnd: 50, gapThreshold: threshold }
    );

    expect(threshold).toBe(25);
    expect(result.path).toContain('M 100.0 0.0');
  });
});
