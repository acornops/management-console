import { describe, expect, it } from 'vitest';
import { getClusterTelemetrySnapshot, getMetricTimeline } from '@/components/dashboard/clusterTelemetryModel';
import type { KubernetesCluster } from '@/types';

describe('cluster telemetry model', () => {
  it('drops malformed and negative samples before charting', () => {
    const timeline = getMetricTimeline([
      { timestamp: 'not-a-date', cpuCores: 2, memoryBytes: 1024 },
      { timestamp: '2026-07-19T00:00:00Z', cpuCores: -1, memoryBytes: -1 },
      { timestamp: '2026-07-19T00:01:00Z', cpuCores: Number.POSITIVE_INFINITY, memoryBytes: Number.NaN },
      { timestamp: '2026-07-19T00:02:00Z', cpuCores: 1.5, memoryBytes: 2 * (1024 ** 3) }
    ]);

    expect(timeline).toEqual([{
      timestamp: Date.parse('2026-07-19T00:02:00Z'),
      cpu: 1.5,
      memory: 2
    }]);
  });

  it('merges partial samples that share a timestamp and keeps the latest valid value', () => {
    const timeline = getMetricTimeline([
      { timestamp: '2026-07-19T00:02:00Z', cpuCores: 1, memoryBytes: null },
      { timestamp: '2026-07-19T00:01:00Z', cpuCores: 0.5, memoryBytes: 1024 ** 3 },
      { timestamp: '2026-07-19T00:02:00Z', cpuCores: 2, memoryBytes: 3 * (1024 ** 3) },
      { timestamp: '2026-07-19T00:02:00Z', cpuCores: null, memoryBytes: 4 * (1024 ** 3) }
    ]);

    expect(timeline).toEqual([
      { timestamp: Date.parse('2026-07-19T00:01:00Z'), cpu: 0.5, memory: 1 },
      { timestamp: Date.parse('2026-07-19T00:02:00Z'), cpu: 2, memory: 4 }
    ]);
  });

  it('uses the latest valid history values when summary metrics are unavailable', () => {
    const cluster = {
      metrics: { cpu: '--', memory: 'N/A' },
      metricHistory: [
        { timestamp: '2026-07-19T00:00:00Z', cpuCores: 0.5, memoryBytes: 1024 ** 3 },
        { timestamp: '2026-07-19T00:01:00Z', cpuCores: 2, memoryBytes: 12 * (1024 ** 3) }
      ]
    } as KubernetesCluster;

    expect(getClusterTelemetrySnapshot(cluster)).toMatchObject({
      cpuDisplay: '2.0 cores',
      memoryDisplay: '12 GiB'
    });
  });
});
