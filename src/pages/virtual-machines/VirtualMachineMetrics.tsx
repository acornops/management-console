import React from 'react';
import { useTranslation } from 'react-i18next';
import { ICONS } from '@/constants';
import type { ControlPlaneVirtualMachine, ControlPlaneVirtualMachineMetricHistoryPoint } from '@/services/controlPlaneApi';
import { formatUserTime } from '@/utils/dateTime';

export interface VmMetricTimelinePoint {
  timestamp: number;
  loadAverage1m: number | null;
  memoryUsedPercent: number | null;
  memoryUsedBytes: number | null;
  memoryTotalBytes: number | null;
  swapUsedPercent: number | null;
  rootDiskUsedPercent: number | null;
}

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

export const VmCardResourceChart: React.FC<{ vm: ControlPlaneVirtualMachine; points: VmMetricTimelinePoint[] }> = ({ vm, points }) => {
  const { t } = useTranslation();
  const width = 360;
  const height = 104;
  const paddingX = 2;
  const paddingTop = 10;
  const plotBottom = 82;
  const labelY = 102;
  const safePoints = points.slice(-12);
  const footerStats = [
    {
      label: t('virtualMachines.list.logSources'),
      value: vm.allowedLogSources?.length ?? 0,
      icon: <ICONS.BookOpen className="h-4 w-4 text-status-success-text/70" />
    },
    {
      label: t('virtualMachines.list.processes'),
      value: vm.summary ? vm.summary.processCount : '-',
      icon: <ICONS.Activity className="h-4 w-4 text-status-success-text/70" />
    },
    {
      label: t('dashboard.findings'),
      value: vm.summary ? vm.summary.findingCount : '-',
      icon: <ICONS.Shield className="h-4 w-4 text-status-success-text/70" />
    }
  ];
  const footer = (
    <div className="grid h-[4.25rem] grid-cols-3 divide-x divide-ui-border border-t border-ui-border pt-5">
      {footerStats.map((stat) => (
        <div key={stat.label} className="min-w-0 px-4 sm:px-5">
          <p className="truncate text-[0.625rem] font-medium leading-3 text-ui-text-muted">{stat.label}</p>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            <span className="truncate text-base font-bold leading-5 text-ui-text">{stat.value}</span>
            {stat.icon}
          </div>
        </div>
      ))}
    </div>
  );
  const chartBodyClassName = 'grid min-h-0 grid-rows-[auto_minmax(0,1fr)] pb-3';

  const loadPointCount = safePoints.filter((point) => point.loadAverage1m !== null).length;
  const memoryPointCount = safePoints.filter((point) => point.memoryUsedPercent !== null).length;
  const usableMetricPointCount = Math.max(loadPointCount, memoryPointCount);

  if (usableMetricPointCount < 2) {
    return (
      <div className="grid h-full min-h-0 flex-1 grid-rows-[minmax(0,1fr)_4.25rem]" aria-label={t('virtualMachines.list.telemetryFor', { name: vm.name })}>
        <div className="flex min-h-0 flex-col items-center justify-center px-5 pb-3 text-center">
          <p className="type-micro-label">
            {t(getMetricEmptyCopyKey(safePoints.length, usableMetricPointCount))}
          </p>
          {safePoints.length > 0 && (
            <p className="type-caption mt-2 max-w-xs">
              {t('virtualMachines.list.trendAfterAnotherVmSample')}
            </p>
          )}
        </div>
        {footer}
      </div>
    );
  }

  const chartLatest = safePoints[safePoints.length - 1] as VmMetricTimelinePoint;
  const chartFirst = safePoints[0] as VmMetricTimelinePoint;
  const xForIndex = (index: number) =>
    safePoints.length === 1
      ? width / 2
      : paddingX + (index * (width - paddingX * 2)) / (safePoints.length - 1);
  const maxForMetric = (metric: 'loadAverage1m' | 'memoryUsedPercent') => {
    const values = safePoints
      .map((point) => point[metric])
      .filter((value): value is number => value !== null);
    if (values.length === 0) return 1;
    return Math.max(...values, 1);
  };
  const maxByMetric = {
    loadAverage1m: maxForMetric('loadAverage1m'),
    memoryUsedPercent: maxForMetric('memoryUsedPercent')
  };
  const yForValue = (value: number, metric: 'loadAverage1m' | 'memoryUsedPercent') => {
    const ratio = Math.max(0, Math.min(1, value / maxByMetric[metric]));
    return paddingTop + (1 - ratio) * (plotBottom - paddingTop);
  };
  const buildPath = (metric: 'loadAverage1m' | 'memoryUsedPercent') => {
    const segments: string[] = [];
    safePoints.forEach((point, index) => {
      const value = point[metric];
      if (value === null) return;
      segments.push(`${segments.length === 0 ? 'M' : 'L'} ${xForIndex(index)} ${yForValue(value, metric)}`);
    });
    return segments.join(' ');
  };
  const loadPath = buildPath('loadAverage1m');
  const memoryPath = buildPath('memoryUsedPercent');
  const latestMetricPoint = (metric: 'loadAverage1m' | 'memoryUsedPercent') => {
    for (let index = safePoints.length - 1; index >= 0; index -= 1) {
      const point = safePoints[index] as VmMetricTimelinePoint;
      const value = point[metric];
      if (value !== null) return { index, value };
    }
    return null;
  };
  const latestLoadPoint = latestMetricPoint('loadAverage1m');
  const latestMemoryPoint = latestMetricPoint('memoryUsedPercent');

  return (
    <div
      className="grid h-full min-h-0 flex-1 grid-rows-[minmax(0,1fr)_4.25rem]"
      aria-label={t('virtualMachines.list.telemetryFor', { name: vm.name })}
    >
      <div className={chartBodyClassName}>
        <div className="mb-1.5 grid min-w-0 grid-cols-2 gap-3">
          <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-[0.6875rem] font-semibold leading-3 text-accent-strong">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            {t('virtualMachines.list.load1m')} {formatVmLoad(latestLoadPoint?.value ?? null)}
          </span>
          <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-[0.6875rem] font-semibold leading-3 text-metric-blue">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-metric-blue" />
            {t('virtualMachines.list.memory')} {formatVmPercent(latestMemoryPoint?.value ?? null)}
          </span>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full min-h-0 w-full overflow-visible" role="img" aria-label={t('virtualMachines.list.telemetryFor', { name: vm.name })}>
          {[0.25, 0.5, 0.75].map((tick) => (
            <line
              key={tick}
              x1={paddingX}
              y1={paddingTop + (1 - tick) * (plotBottom - paddingTop)}
              x2={width - paddingX}
              y2={paddingTop + (1 - tick) * (plotBottom - paddingTop)}
              stroke="var(--border)"
              strokeDasharray="3 4"
              opacity="0.55"
            />
          ))}
          {loadPath && (
            <path d={loadPath} fill="none" stroke="var(--brand-orange)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          )}
          {memoryPath && (
            <path d={memoryPath} fill="none" stroke="rgb(var(--metric-blue-rgb))" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 5" opacity="0.9" />
          )}
          {latestLoadPoint && (
            <circle cx={xForIndex(latestLoadPoint.index)} cy={yForValue(latestLoadPoint.value, 'loadAverage1m')} r={2.5} fill="var(--brand-orange)" stroke="var(--bg)" strokeWidth={1.5} />
          )}
          {latestMemoryPoint && (
            <circle cx={xForIndex(latestMemoryPoint.index)} cy={yForValue(latestMemoryPoint.value, 'memoryUsedPercent')} r={2.5} fill="rgb(var(--metric-blue-rgb))" stroke="var(--bg)" strokeWidth={1.5} />
          )}
          <text x={paddingX} y={labelY} className="type-micro-label fill-ui-text-muted">
            {formatMetricTime(chartFirst.timestamp)}
          </text>
          <text x={width - paddingX} y={labelY} textAnchor="end" className="type-micro-label fill-ui-text-muted">
            {formatMetricTime(chartLatest.timestamp)}
          </text>
        </svg>
      </div>
      {footer}
    </div>
  );
};
