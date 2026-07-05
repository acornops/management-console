import React from 'react';
import { useTranslation } from 'react-i18next';
import { getClusterTelemetrySnapshot } from '@/components/dashboard/clusterTelemetryModel';
import { ICONS } from '@/constants';
import { KubernetesCluster } from '@/types';
import { formatCompactRelativeTime } from '@/utils/dateTime';

type SparklinePoint = { timestamp: number; value: number };

const DEFAULT_SPARKLINE_GAP_MS = 15 * 60 * 1000;
const SPARKLINE_GAP_MULTIPLIER = 2.5;

function getSparklineGapThreshold(points: SparklinePoint[]): number {
  const intervals = points
    .slice(1)
    .map((point, index) => point.timestamp - points[index].timestamp)
    .filter((interval) => Number.isFinite(interval) && interval > 0)
    .sort((left, right) => left - right);
  if (intervals.length === 0) return DEFAULT_SPARKLINE_GAP_MS;
  const medianInterval = intervals[Math.floor(intervals.length / 2)];
  return Math.max(DEFAULT_SPARKLINE_GAP_MS, medianInterval * SPARKLINE_GAP_MULTIPLIER);
}

function buildSparklinePath(points: SparklinePoint[], startTimestamp: number, endTimestamp: number, width = 180, height = 92): string {
  if (points.length === 0) return '';
  const finitePoints = points.filter((point) => Number.isFinite(point.timestamp) && Number.isFinite(point.value));
  if (finitePoints.length === 0) return '';
  const values = finitePoints.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const timeRange = endTimestamp - startTimestamp;
  const gapThreshold = getSparklineGapThreshold(finitePoints);
  return finitePoints.map((point, index) => {
    const x = timeRange <= 0 ? width / 2 : ((point.timestamp - startTimestamp) / timeRange) * width;
    const normalized = range === 0 ? 0.5 : (point.value - min) / range;
    const y = height - normalized * height;
    const previousPoint = finitePoints[index - 1];
    const command = !previousPoint || point.timestamp - previousPoint.timestamp > gapThreshold ? 'M' : 'L';
    return `${command} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
}

export const ClusterTelemetryPanel: React.FC<{ cluster: KubernetesCluster; now?: number }> = ({ cluster, now }) => {
  const { t } = useTranslation();
  const { timeline, cpuPoints, memoryPoints, cpuDisplay, memoryDisplay } = getClusterTelemetrySnapshot(cluster);
  const hasCpuTrend = cpuPoints.length >= 2;
  const hasMemoryTrend = memoryPoints.length >= 2;
  const hasTrend = hasCpuTrend || hasMemoryTrend;
  const hasAnyMetric = cpuPoints.length > 0 || memoryPoints.length > 0;
  const startTimestamp = timeline[0]?.timestamp ?? 0;
  const endTimestamp = timeline[timeline.length - 1]?.timestamp ?? startTimestamp;
  const cpuPath = buildSparklinePath(cpuPoints, startTimestamp, endTimestamp);
  const memoryPath = buildSparklinePath(memoryPoints, startTimestamp, endTimestamp);
  const axisStartLabel = timeline.length >= 2 ? formatCompactRelativeTime(timeline[0].timestamp, { now }) : t('dashboard.telemetryAxisEarlier');
  const axisEndLabel = timeline.length >= 2 ? formatCompactRelativeTime(timeline[timeline.length - 1].timestamp, { now }) : t('dashboard.telemetryAxisNow');
  const metricItems = [
    { label: t('dashboard.cpu'), value: cpuDisplay, Icon: ICONS.Cpu, markerClassName: 'bg-accent-strong' },
    { label: t('dashboard.memory'), value: memoryDisplay, Icon: ICONS.HardDrive, markerClassName: 'bg-metric-blue' }
  ];

  return (
    <section data-cluster-telemetry-panel="true" aria-label={t('dashboard.telemetryAria', { name: cluster.name })} className="shrink-0 overflow-hidden rounded-md border border-ui-border bg-ui-bg/35">
      <dl className="grid min-w-0 grid-cols-2 overflow-hidden border-b border-ui-border bg-ui-surface">
        {metricItems.map(({ label, value, Icon, markerClassName }, index) => (
          <div
            key={label}
            className={`min-w-0 border-ui-border px-3 py-2.5 ${index === 0 ? 'border-r' : ''}`}
          >
            <dt className="type-micro-label flex min-w-0 items-center gap-1.5 text-ui-text-muted">
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {markerClassName && <span className={`h-1.5 w-3 shrink-0 rounded-full ${markerClassName}`} aria-hidden="true" />}
              <span>{label}</span>
            </dt>
            <dd className="type-caption mt-0.5 min-w-0 break-words font-semibold text-ui-text" title={String(value)}>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="min-w-0 bg-ui-surface px-3 py-3">
        <div className="relative h-[132px] min-w-0 overflow-hidden rounded-md border border-ui-border bg-ui-bg/45 px-2.5 py-2">
          <svg viewBox="0 0 180 108" preserveAspectRatio="none" className="h-full w-full" role="img" aria-label={t('dashboard.telemetryAria', { name: cluster.name })}>
            <line x1="0" x2="180" y1="18" y2="18" className="stroke-ui-border/60" strokeWidth="1" />
            <line x1="0" x2="180" y1="54" y2="54" className="stroke-ui-border/60" strokeWidth="1" />
            <line x1="0" x2="180" y1="90" y2="90" className="stroke-ui-border/60" strokeWidth="1" />
            {hasCpuTrend && cpuPath && <path d={cpuPath} fill="none" className="stroke-accent-strong" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" transform="translate(0 8)" />}
            {hasMemoryTrend && memoryPath && <path d={memoryPath} fill="none" className="stroke-metric-blue" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" opacity="0.78" transform="translate(0 8)" />}
          </svg>
          {!hasTrend && (
            <div className="absolute inset-0 flex items-center justify-center px-3 text-center">
              <p className="type-caption max-w-[18rem] text-ui-text-muted" title={t('dashboard.collectingHistoryBody')}>
                <span className="font-semibold text-ui-text">{hasAnyMetric ? t('dashboard.collectingHistory') : t('dashboard.noTelemetry')}</span>
                <span className="ml-1">{t('dashboard.collectingHistoryBody')}</span>
              </p>
            </div>
          )}
        </div>
        <div className="type-caption mt-1.5 flex min-w-0 items-center justify-between gap-3 font-medium text-ui-text-muted" aria-hidden="true">
          <span>{axisStartLabel}</span>
          <span className="min-w-0 truncate text-center">{t('dashboard.telemetryAxisLabel')}</span>
          <span>{axisEndLabel}</span>
        </div>

      </div>
    </section>
  );
};
