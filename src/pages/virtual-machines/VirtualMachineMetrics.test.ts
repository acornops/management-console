import { describe, expect, it } from 'vitest';

import type { ControlPlaneVirtualMachineMetricHistoryPoint } from '@/services/controlPlaneApi';
import {
  formatVmBytes,
  formatVmLoad,
  formatVmPercent,
  getLatestVmTelemetryPoint,
  getVmMetricTimeline
} from '@/pages/virtual-machines/VirtualMachineMetrics';

function metricPoint(
  input: Partial<ControlPlaneVirtualMachineMetricHistoryPoint>
): ControlPlaneVirtualMachineMetricHistoryPoint {
  return {
    timestamp: '2026-05-25T00:00:00.000Z',
    loadAverage1m: null,
    loadAverage5m: null,
    loadAverage15m: null,
    cpuUsagePercent: null,
    memoryUsedBytes: null,
    memoryTotalBytes: null,
    memoryFreeBytes: null,
    memoryUsedPercent: null,
    swapUsedBytes: null,
    swapTotalBytes: null,
    swapUsedPercent: null,
    rootDiskUsedBytes: null,
    rootDiskTotalBytes: null,
    rootDiskUsedPercent: null,
    ...input
  };
}

describe('VM metric timeline mapping', () => {
  it('maps VM-native load and memory fields into chart timeline points', () => {
    const points = getVmMetricTimeline([
      metricPoint({
        loadAverage1m: 0.24,
        memoryUsedPercent: 50,
        memoryUsedBytes: 2 * 1024 ** 3,
        memoryTotalBytes: 4 * 1024 ** 3,
        swapUsedPercent: 25,
        rootDiskUsedPercent: 70
      }),
      metricPoint({
        timestamp: '2026-05-25T00:01:00.000Z',
        loadAverage1m: 0.42,
        memoryUsedPercent: 60
      })
    ]);

    expect(points).toHaveLength(2);
    expect(points[0]).toMatchObject({
      loadAverage1m: 0.24,
      memoryUsedPercent: 50,
      memoryUsedBytes: 2 * 1024 ** 3,
      memoryTotalBytes: 4 * 1024 ** 3,
      swapUsedPercent: 25,
      rootDiskUsedPercent: 70
    });
    expect(points[1]).toMatchObject({
      loadAverage1m: 0.42,
      memoryUsedPercent: 60
    });
  });

  it('keeps malformed VM metric values as null and drops invalid timestamps', () => {
    const points = getVmMetricTimeline([
      metricPoint({
        timestamp: 'not-a-date',
        loadAverage1m: 1
      }),
      {
        ...metricPoint({}),
        loadAverage1m: -1,
        memoryUsedPercent: 101,
        memoryUsedBytes: Number.NEGATIVE_INFINITY,
        swapUsedPercent: -1,
        rootDiskUsedPercent: 120
      }
    ]);

    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({
      loadAverage1m: null,
      memoryUsedPercent: null,
      memoryUsedBytes: null,
      swapUsedPercent: null,
      rootDiskUsedPercent: null
    });
  });

  it('formats latest VM telemetry values for card and overview summaries', () => {
    expect(formatVmLoad(0.125)).toBe('0.13');
    expect(formatVmLoad(null)).toBe('-');
    expect(formatVmPercent(51.2)).toBe('51%');
    expect(formatVmPercent(null)).toBe('-');
    expect(formatVmBytes(2 * 1024 ** 3)).toBe('2.0 GiB');
    expect(formatVmBytes(512 * 1024 ** 2)).toBe('512 MiB');
    expect(formatVmBytes(null)).toBe('-');
  });

  it('summarizes the latest valid value for each VM telemetry metric independently', () => {
    const points = getVmMetricTimeline([
      metricPoint({
        timestamp: '2026-05-25T00:00:00.000Z',
        loadAverage1m: 0.24,
        memoryUsedPercent: 50,
        memoryUsedBytes: 2 * 1024 ** 3,
        memoryTotalBytes: 4 * 1024 ** 3
      }),
      metricPoint({
        timestamp: '2026-05-25T00:01:00.000Z',
        swapUsedPercent: 25
      }),
      metricPoint({
        timestamp: '2026-05-25T00:02:00.000Z',
        rootDiskUsedPercent: 70
      })
    ]);

    expect(getLatestVmTelemetryPoint(points)).toMatchObject({
      timestamp: Date.parse('2026-05-25T00:02:00.000Z'),
      loadAverage1m: 0.24,
      memoryUsedPercent: 50,
      memoryUsedBytes: 2 * 1024 ** 3,
      memoryTotalBytes: 4 * 1024 ** 3,
      swapUsedPercent: 25,
      rootDiskUsedPercent: 70
    });
  });
});
