import React from 'react';
import { Database } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ICONS } from '@/constants';
import { TelemetryTrendSummary } from '@/features/targets/catalog/TelemetryTrendSummary';
import type { ControlPlaneVirtualMachine, ControlPlaneVirtualMachineMetricHistoryPoint } from '@/services/controlPlaneApi';
import { formatCompactRelativeTime, formatUserTime } from '@/utils/dateTime';
import { getTelemetryTimestampFreshness } from '@/utils/telemetry';

export interface VmMetricTimelinePoint {
  timestamp: number;
  loadAverage1m: number | null;
  cpuUsagePercent: number | null;
  memoryUsedPercent: number | null;
  memoryUsedBytes: number | null;
  memoryTotalBytes: number | null;
  swapUsedPercent: number | null;
  rootDiskUsedPercent: number | null;
}

export type VmMetricLoadState = 'loading' | 'ready' | 'error';

export function formatMetricTime(timestamp: number): string {
  return formatUserTime(timestamp, { fallback: '-' });
}

function finiteNonNegativeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function finitePercentNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}

export function getVmMetricTimeline(points: ControlPlaneVirtualMachineMetricHistoryPoint[]): VmMetricTimelinePoint[] {
  return points
    .map((point) => {
      const timestamp = typeof point.timestamp === 'string' ? Date.parse(point.timestamp) : NaN;
      if (Number.isNaN(timestamp)) return null;
      return {
        timestamp,
        loadAverage1m: finiteNonNegativeNumber(point.loadAverage1m),
        cpuUsagePercent: finitePercentNumber(point.cpuUsagePercent),
        memoryUsedPercent: finitePercentNumber(point.memoryUsedPercent),
        memoryUsedBytes: finiteNonNegativeNumber(point.memoryUsedBytes),
        memoryTotalBytes: finiteNonNegativeNumber(point.memoryTotalBytes),
        swapUsedPercent: finitePercentNumber(point.swapUsedPercent),
        rootDiskUsedPercent: finitePercentNumber(point.rootDiskUsedPercent)
      };
    })
    .filter((point): point is VmMetricTimelinePoint => point !== null);
}

export function getLatestVmTelemetryPoint(points: VmMetricTimelinePoint[]): VmMetricTimelinePoint | null {
  const latestMetricPoint = [...points].reverse().find((point) =>
    point.loadAverage1m !== null ||
    point.cpuUsagePercent !== null ||
    point.memoryUsedPercent !== null ||
    point.memoryUsedBytes !== null ||
    point.memoryTotalBytes !== null ||
    point.swapUsedPercent !== null ||
    point.rootDiskUsedPercent !== null
  );
  if (!latestMetricPoint) return null;

  const latestWith = (predicate: (point: VmMetricTimelinePoint) => boolean): VmMetricTimelinePoint | null =>
    [...points].reverse().find(predicate) || null;
  const loadPoint = latestWith((point) => point.loadAverage1m !== null);
  const cpuPoint = latestWith((point) => point.cpuUsagePercent !== null);
  const memoryPoint = latestWith((point) =>
    point.memoryUsedPercent !== null ||
    point.memoryUsedBytes !== null ||
    point.memoryTotalBytes !== null
  );
  const swapPoint = latestWith((point) => point.swapUsedPercent !== null);
  const rootDiskPoint = latestWith((point) => point.rootDiskUsedPercent !== null);

  return {
    timestamp: latestMetricPoint.timestamp,
    loadAverage1m: loadPoint?.loadAverage1m ?? null,
    cpuUsagePercent: cpuPoint?.cpuUsagePercent ?? null,
    memoryUsedPercent: memoryPoint?.memoryUsedPercent ?? null,
    memoryUsedBytes: memoryPoint?.memoryUsedBytes ?? null,
    memoryTotalBytes: memoryPoint?.memoryTotalBytes ?? null,
    swapUsedPercent: swapPoint?.swapUsedPercent ?? null,
    rootDiskUsedPercent: rootDiskPoint?.rootDiskUsedPercent ?? null
  };
}

export function formatVmPercent(value: number | null): string {
  return value === null ? '-' : `${value.toFixed(0)}%`;
}

export function formatVmLoad(value: number | null): string {
  return value === null ? '-' : value.toFixed(2);
}

export function formatVmBytes(value: number | null): string {
  if (value === null) return '-';
  const gib = value / (1024 ** 3);
  if (gib >= 1) return `${gib.toFixed(gib >= 10 ? 0 : 1)} GiB`;
  const mib = value / (1024 ** 2);
  return `${mib.toFixed(mib >= 10 ? 0 : 1)} MiB`;
}

function getMetricEmptyCopyKey(pointCount: number, usablePointCount: number): string {
  if (pointCount === 0) return 'virtualMachines.list.noVmMetricSamples';
  if (usablePointCount === 0) return 'virtualMachines.list.noUsableVmMetricSamples';
  return 'virtualMachines.list.waitingForAnotherVmSample';
}

export const VmOperationalDetails: React.FC<{ vm: ControlPlaneVirtualMachine }> = ({ vm }) => {
  const { t } = useTranslation();
  const logSourceCount = vm.allowedLogSources?.length;
  const details = [
    ...(vm.hostname && vm.hostname !== vm.name ? [{
      label: t('virtualMachines.list.host'),
      value: vm.hostname,
      Icon: ICONS.Server,
      warning: false
    }] : []),
    ...(typeof logSourceCount === 'number' ? [{
      label: t('virtualMachines.list.logSourcesShort'),
      value: logSourceCount === 0
        ? t('virtualMachines.list.noLogSources')
        : t('virtualMachines.list.logSourceCount', { count: logSourceCount }),
      Icon: ICONS.BookOpen,
      warning: logSourceCount === 0
    }] : [])
  ];

  if (details.length === 0) return null;

  return (
    <dl data-vm-operational-details="true" className="mx-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ui-border/60 pb-4 pt-3">
      {details.map(({ label, value, Icon, warning }) => (
        <div key={label} className="flex min-w-0 items-center gap-1.5" title={`${label}: ${value}`}>
          <Icon className={`h-3.5 w-3.5 shrink-0 ${warning ? 'text-status-warning-text' : 'text-ui-text-muted'}`} aria-hidden="true" />
          <dt className="type-caption shrink-0 text-ui-text-muted">{label}:</dt>
          <dd className={`type-caption min-w-0 break-words type-emphasis leading-4 [overflow-wrap:anywhere] ${warning ? 'text-status-warning-text' : 'text-ui-text'}`}>{value}</dd>
        </div>
      ))}
    </dl>
  );
};

export const VmCardResourceChart: React.FC<{
  vm: ControlPlaneVirtualMachine;
  points: VmMetricTimelinePoint[];
  now?: number;
  paused?: boolean;
  loadState?: VmMetricLoadState;
}> = ({ vm, points, now, paused = false, loadState = 'ready' }) => {
  const { t } = useTranslation();
  const width = 180;
  const height = 108;
  const paddingX = 0;
  const paddingTop = 8;
  const plotBottom = 96;
  const safePoints = React.useMemo(() => points.slice(-12), [points]);

  const cpuPointCount = safePoints.filter((point) => point.cpuUsagePercent !== null).length;
  const memoryPointCount = safePoints.filter((point) => point.memoryUsedPercent !== null).length;
  const usableMetricPointCount = Math.max(cpuPointCount, memoryPointCount);
  const hasTrend = usableMetricPointCount >= 2;
  const xForIndex = (index: number) =>
    safePoints.length === 1
      ? width / 2
      : paddingX + (index * (width - paddingX * 2)) / (safePoints.length - 1);
  const yForValue = (value: number) => {
    const ratio = Math.max(0, Math.min(1, value / 100));
    return paddingTop + (1 - ratio) * (plotBottom - paddingTop);
  };
  const buildPath = (metric: 'cpuUsagePercent' | 'memoryUsedPercent') => {
    const segments: string[] = [];
    let continuesPreviousSample = false;
    safePoints.forEach((point, index) => {
      const value = point[metric];
      if (value === null) {
        continuesPreviousSample = false;
        return;
      }
      segments.push(`${continuesPreviousSample ? 'L' : 'M'} ${xForIndex(index)} ${yForValue(value)}`);
      continuesPreviousSample = true;
    });
    return segments.join(' ');
  };
  const cpuPath = hasTrend ? buildPath('cpuUsagePercent') : '';
  const memoryPath = hasTrend ? buildPath('memoryUsedPercent') : '';
  const latestMetricPoint = (metric: 'cpuUsagePercent' | 'memoryUsedPercent') => {
    for (let index = safePoints.length - 1; index >= 0; index -= 1) {
      const point = safePoints[index] as VmMetricTimelinePoint;
      const value = point[metric];
      if (value !== null) return { index, value };
    }
    return null;
  };
  const latestCpuPoint = latestMetricPoint('cpuUsagePercent');
  const latestMemoryPoint = latestMetricPoint('memoryUsedPercent');
  const latestRootDiskPoint = [...safePoints].reverse().find((point) => point.rootDiskUsedPercent !== null);
  const chartLatest = safePoints[safePoints.length - 1];
  const chartFirst = safePoints[0];
  const latestSnapshotTimestamp = vm.latestSnapshot?.timestamp ? Date.parse(vm.latestSnapshot.timestamp) : NaN;
  const latestSignalTimestamp = chartLatest?.timestamp ?? (Number.isFinite(latestSnapshotTimestamp) ? latestSnapshotTimestamp : null);
  const telemetryFreshness = latestSignalTimestamp === null
    ? 'unavailable'
    : getTelemetryTimestampFreshness(latestSignalTimestamp, now);
  const telemetryIsStale = telemetryFreshness === 'stale' || telemetryFreshness === 'offline';
  const chartMessage = points.length === 0 && loadState === 'loading'
    ? t('virtualMachines.list.loadingTelemetry')
    : points.length === 0 && loadState === 'error'
      ? t('virtualMachines.list.telemetryLoadFailed')
      : paused
        ? t('virtualMachines.list.telemetryUnavailable')
        : t(getMetricEmptyCopyKey(safePoints.length, usableMetricPointCount));
  const axisStartLabel = hasTrend && chartFirst
    ? formatCompactRelativeTime(chartFirst.timestamp, { now })
    : t('dashboard.telemetryAxisEarlier');
  const axisEndLabel = paused
    ? t('dashboard.telemetryPaused')
    : loadState === 'error'
      ? t('virtualMachines.list.telemetryRefreshFailed')
      : chartLatest
        ? formatCompactRelativeTime(chartLatest.timestamp, { now })
        : t('dashboard.telemetryAxisNow');
  const lastSignalLabel = paused
    ? t('dashboard.telemetryPaused')
    : loadState === 'error'
      ? t('virtualMachines.list.telemetryRefreshFailed')
      : loadState === 'loading'
        ? t('virtualMachines.list.loadingTelemetry')
        : latestSignalTimestamp !== null
          ? t(telemetryIsStale ? 'dashboard.lastUpdatedTime' : 'dashboard.updatedTime', {
              time: formatCompactRelativeTime(latestSignalTimestamp, { context: 'sentence-fragment', now })
            })
          : null;
  const metricItems = [
    { label: t('virtualMachines.list.cpu'), value: formatVmPercent(latestCpuPoint?.value ?? null), Icon: ICONS.Cpu, markerClassName: 'bg-accent-strong' },
    { label: t('virtualMachines.list.memory'), value: formatVmPercent(latestMemoryPoint?.value ?? null), Icon: ICONS.HardDrive, markerClassName: 'bg-metric-blue' },
    { label: t('virtualMachines.list.disk'), value: formatVmPercent(latestRootDiskPoint?.rootDiskUsedPercent ?? null), Icon: Database, markerClassName: null }
  ];
  const trendSummary = hasTrend ? (
    <TelemetryTrendSummary
      title={t('virtualMachines.list.telemetryFor', { name: vm.name })}
      metricColumnLabel={t('dashboard.telemetryMetric')}
      startLabel={axisStartLabel}
      endLabel={axisEndLabel}
      series={[
        {
          label: t('virtualMachines.list.cpu'),
          startValue: formatVmPercent(safePoints.find((point) => point.cpuUsagePercent !== null)?.cpuUsagePercent ?? null),
          endValue: formatVmPercent(latestCpuPoint?.value ?? null)
        },
        {
          label: t('virtualMachines.list.memory'),
          startValue: formatVmPercent(safePoints.find((point) => point.memoryUsedPercent !== null)?.memoryUsedPercent ?? null),
          endValue: formatVmPercent(latestMemoryPoint?.value ?? null)
        }
      ]}
    />
  ) : null;

  return (
    <section
      className="shrink-0 px-4 pb-3"
      aria-label={t('virtualMachines.list.telemetryFor', { name: vm.name })}
    >
      <dl className="grid min-w-0 grid-cols-3 gap-3 border-t border-ui-border/60 py-3">
        {metricItems.map(({ label, value, Icon, markerClassName }) => (
          <div key={label} className="min-w-0">
            <dt className="type-micro-label flex items-center gap-1.5 text-ui-text-muted">
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {markerClassName && <span className={`h-1.5 w-3 shrink-0 rounded-full ${markerClassName}`} aria-hidden="true" />}
              <span className="truncate">{label}</span>
            </dt>
            <dd className="type-caption mt-1 truncate type-emphasis text-ui-text" title={value}>{value}</dd>
          </div>
        ))}
      </dl>
      <div>
        <div className="relative h-[88px] min-w-0 overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <line x1="0" x2="180" y1="20" y2="20" className="stroke-ui-border/55" strokeWidth="1" />
            <line x1="0" x2="180" y1="54" y2="54" className="stroke-ui-border/55" strokeWidth="1" />
            <line x1="0" x2="180" y1="88" y2="88" className="stroke-ui-border/55" strokeWidth="1" />
            {cpuPath && <path d={cpuPath} fill="none" className="stroke-accent-strong" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />}
            {memoryPath && <path d={memoryPath} fill="none" className="stroke-metric-blue" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" opacity="0.78" />}
          </svg>
          {!hasTrend && (
            <div className="absolute inset-0 flex items-center justify-center px-3 text-center">
              <p className={`type-caption type-emphasis ${loadState === 'error' ? 'text-status-danger-text' : 'text-ui-text-muted'}`}>{chartMessage}</p>
            </div>
          )}
        </div>
        {trendSummary}
        {(hasTrend || lastSignalLabel) && (
          <div className="type-caption mt-1 flex min-w-0 items-center justify-between gap-3 text-ui-text-muted">
            {hasTrend && <span>{axisStartLabel}</span>}
            {lastSignalLabel && (
              <span
                className={`ml-auto truncate text-right ${telemetryIsStale && loadState === 'ready' && !paused ? 'text-status-warning-text' : ''}`}
                role={loadState === 'error' ? 'alert' : loadState === 'loading' ? 'status' : undefined}
                aria-live={loadState !== 'ready' ? 'polite' : undefined}
              >
                {lastSignalLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
