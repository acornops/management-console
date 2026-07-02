import { describe, expect, it } from 'vitest';
import { mapVirtualMachineMetricsHistoryResponse } from './virtualMachineMetricMappers';

describe('virtual machine metric history mappers', () => {
  it('normalizes nullable VM point fields and malformed point entries', () => {
    expect(mapVirtualMachineMetricsHistoryResponse({
      workspaceId: 'workspace 1',
      targetId: 'vm/1',
      windowMs: -1,
      points: [
        {
          timestamp: '2026-05-25T00:00:00.000Z',
          loadAverage1m: 0.2,
          loadAverage5m: 'n/a',
          loadAverage15m: 0.4,
          cpuUsagePercent: Number.POSITIVE_INFINITY,
          memoryUsedBytes: -1,
          memoryTotalBytes: 2048,
          memoryFreeBytes: 4096,
          memoryUsedPercent: 50,
          swapUsedBytes: 20,
          swapTotalBytes: 10,
          swapUsedPercent: 20,
          rootDiskUsedBytes: 130,
          rootDiskTotalBytes: 100,
          rootDiskUsedPercent: 30
        },
        {
          timestamp: '2026-05-25T00:01:00.000Z',
          memoryUsedBytes: 0,
          memoryTotalBytes: 0,
          memoryUsedPercent: 0,
          swapUsedBytes: 0,
          swapTotalBytes: 0,
          swapUsedPercent: 0,
          rootDiskUsedBytes: 0,
          rootDiskTotalBytes: 0,
          rootDiskUsedPercent: 0
        },
        'not-a-point'
      ]
    })).toEqual({
      workspaceId: 'workspace 1',
      targetId: 'vm/1',
      windowMs: 0,
      points: [
        {
          timestamp: '2026-05-25T00:00:00.000Z',
          loadAverage1m: 0.2,
          loadAverage5m: null,
          loadAverage15m: 0.4,
          cpuUsagePercent: null,
          memoryUsedBytes: null,
          memoryTotalBytes: 2048,
          memoryFreeBytes: null,
          memoryUsedPercent: null,
          swapUsedBytes: null,
          swapTotalBytes: 10,
          swapUsedPercent: null,
          rootDiskUsedBytes: null,
          rootDiskTotalBytes: 100,
          rootDiskUsedPercent: null
        },
        {
          timestamp: '2026-05-25T00:01:00.000Z',
          loadAverage1m: null,
          loadAverage5m: null,
          loadAverage15m: null,
          cpuUsagePercent: null,
          memoryUsedBytes: 0,
          memoryTotalBytes: 0,
          memoryFreeBytes: null,
          memoryUsedPercent: null,
          swapUsedBytes: 0,
          swapTotalBytes: 0,
          swapUsedPercent: null,
          rootDiskUsedBytes: 0,
          rootDiskTotalBytes: 0,
          rootDiskUsedPercent: null
        },
        {
          timestamp: '',
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
          rootDiskUsedPercent: null
        }
      ]
    });
  });

  it('normalizes malformed top-level VM metrics history responses', () => {
    expect(mapVirtualMachineMetricsHistoryResponse(null)).toEqual({
      workspaceId: '',
      targetId: '',
      windowMs: 0,
      points: []
    });
  });
});
