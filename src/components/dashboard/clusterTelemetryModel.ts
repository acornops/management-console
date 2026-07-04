import { ClusterMetricHistoryPoint, KubernetesCluster } from '@/types';

export interface MetricTimelinePoint {
  timestamp: number;
  cpu: number | null;
  memory: number | null;
}

export interface ClusterTelemetrySnapshot {
  timeline: MetricTimelinePoint[];
  cpuPoints: Array<{ timestamp: number; value: number }>;
  memoryPoints: Array<{ timestamp: number; value: number }>;
  cpuDisplay: string;
  memoryDisplay: string;
}

export function getMetricTimeline(points: ClusterMetricHistoryPoint[] = []): MetricTimelinePoint[] {
  return points
    .map((point) => {
      const timestamp = Date.parse(point.timestamp);
      if (Number.isNaN(timestamp)) return null;
      return {
        timestamp,
        cpu: typeof point.cpuCores === 'number' && Number.isFinite(point.cpuCores) ? point.cpuCores : null,
        memory: typeof point.memoryBytes === 'number' && Number.isFinite(point.memoryBytes)
          ? point.memoryBytes / (1024 ** 3)
          : null
      };
    })
    .filter((point): point is MetricTimelinePoint => point !== null)
    .sort((left, right) => left.timestamp - right.timestamp);
}

function getLatestMetricValue(values: number[]): number | null {
  return values.length > 0 ? values[values.length - 1] : null;
}

function isUnavailableMetric(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.length === 0 || normalized === '--' || normalized === '-' || normalized.includes('unavailable') || normalized.includes('n/a');
}

function formatCpuCores(value: number | null): string | null {
  if (value === null) return null;
  const formatted = value >= 1 ? value.toFixed(value >= 10 ? 0 : 1) : value.toFixed(2);
  return `${formatted} ${value === 1 ? 'core' : 'cores'}`;
}

function formatMemoryGiB(value: number | null): string | null {
  if (value === null) return null;
  const formatted = value >= 10 ? value.toFixed(0) : value.toFixed(2);
  return `${formatted} GiB`;
}

export function getClusterTelemetrySnapshot(cluster: KubernetesCluster): ClusterTelemetrySnapshot {
  const timeline = getMetricTimeline(cluster.metricHistory);
  const cpuPoints = timeline
    .filter((point): point is MetricTimelinePoint & { cpu: number } => point.cpu !== null)
    .map((point) => ({ timestamp: point.timestamp, value: point.cpu }));
  const memoryPoints = timeline
    .filter((point): point is MetricTimelinePoint & { memory: number } => point.memory !== null)
    .map((point) => ({ timestamp: point.timestamp, value: point.memory }));
  const cpuValues = cpuPoints.map((point) => point.value);
  const memoryValues = memoryPoints.map((point) => point.value);
  const historyCpuDisplay = formatCpuCores(getLatestMetricValue(cpuValues));
  const historyMemoryDisplay = formatMemoryGiB(getLatestMetricValue(memoryValues));

  return {
    timeline,
    cpuPoints,
    memoryPoints,
    cpuDisplay: isUnavailableMetric(cluster.metrics.cpu) && historyCpuDisplay ? historyCpuDisplay : cluster.metrics.cpu,
    memoryDisplay: isUnavailableMetric(cluster.metrics.memory) && historyMemoryDisplay ? historyMemoryDisplay : cluster.metrics.memory
  };
}
