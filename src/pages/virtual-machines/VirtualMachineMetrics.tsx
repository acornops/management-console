import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';

export interface VmMetricTimelinePoint {
  timestamp: number;
  cpu: number | null;
  memory: number | null;
}

export function formatMetricTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function getVmMetricTimeline(points: Record<string, unknown>[]): VmMetricTimelinePoint[] {
  return points
    .map((point) => {
      const timestamp = typeof point.timestamp === 'string' ? Date.parse(point.timestamp) : NaN;
      if (Number.isNaN(timestamp)) return null;
      return {
        timestamp,
        cpu: typeof point.cpuCores === 'number' && Number.isFinite(point.cpuCores) ? point.cpuCores : null,
        memory: typeof point.memoryBytes === 'number' && Number.isFinite(point.memoryBytes)
          ? point.memoryBytes / (1024 ** 3)
          : null
      };
    })
    .filter((point): point is VmMetricTimelinePoint => point !== null);
}

export const VmCardResourceChart: React.FC<{ vm: ControlPlaneVirtualMachine; points: VmMetricTimelinePoint[] }> = ({ vm, points }) => {
  const { t } = useTranslation();
  const width = 320;
  const height = 104;
  const paddingX = 10;
  const paddingY = 12;
  const safePoints = points.slice(-12);

  if (safePoints.length < 2) {
    return (
      <div className="flex h-[154px] w-full flex-col items-center justify-center border-y border-dashed border-ui-border bg-ui-bg/60 px-5 text-center">
        <p className="type-micro-label">
          {safePoints.length === 0
            ? t('virtualMachines.list.noTelemetry')
            : t('virtualMachines.list.collectingHistory')}
        </p>
        {safePoints.length === 1 && (
          <p className="type-caption mt-2 max-w-xs">
            {t('virtualMachines.list.trendAfterAnotherSample')}
          </p>
        )}
      </div>
    );
  }

  const xForIndex = (index: number) =>
    safePoints.length === 1
      ? width / 2
      : paddingX + (index * (width - paddingX * 2)) / (safePoints.length - 1);
  const maxForMetric = (metric: 'cpu' | 'memory') => {
    const values = safePoints
      .map((point) => point[metric])
      .filter((value): value is number => value !== null);
    if (values.length === 0) return 1;
    return Math.max(...values, 1);
  };
  const maxByMetric = {
    cpu: maxForMetric('cpu'),
    memory: maxForMetric('memory')
  };
  const yForValue = (value: number, metric: 'cpu' | 'memory') => {
    const ratio = Math.max(0, Math.min(1, value / maxByMetric[metric]));
    return paddingY + (1 - ratio) * (height - paddingY * 2);
  };
  const buildPath = (metric: 'cpu' | 'memory') => {
    const segments: string[] = [];
    safePoints.forEach((point, index) => {
      const value = point[metric];
      if (value === null) return;
      segments.push(`${segments.length === 0 ? 'M' : 'L'} ${xForIndex(index)} ${yForValue(value, metric)}`);
    });
    return segments.join(' ');
  };
  const cpuPath = buildPath('cpu');
  const memoryPath = buildPath('memory');
  const latest = safePoints[safePoints.length - 1];
  const first = safePoints[0];

  return (
    <div
      className="h-[118px] border-y border-ui-border bg-ui-bg/60 px-3 py-2.5"
      aria-label={t('virtualMachines.list.telemetryFor', { name: vm.name })}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="type-micro-label inline-flex items-center gap-1 text-accent-strong">
            <span className="h-2 w-2 rounded-full bg-accent" />
            {t('virtualMachines.list.cpu')} {latest.cpu === null ? '-' : `${latest.cpu.toFixed(2)} ${t('virtualMachines.list.core')}`}
          </span>
          <span className="type-micro-label inline-flex items-center gap-1 text-metric-blue">
            <span className="h-2 w-2 rounded-full bg-metric-blue" />
            {t('virtualMachines.list.ram')} {latest.memory === null ? '-' : `${latest.memory.toFixed(2)} ${t('virtualMachines.list.gib')}`}
          </span>
        </div>
        <span className="type-micro-label">{t('virtualMachines.list.history')}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[4.6rem] w-full overflow-visible" role="img">
        {[0.25, 0.5, 0.75].map((tick) => (
          <line
            key={tick}
            x1={paddingX}
            y1={paddingY + (1 - tick) * (height - paddingY * 2)}
            x2={width - paddingX}
            y2={paddingY + (1 - tick) * (height - paddingY * 2)}
            stroke="var(--border)"
            strokeDasharray="3 4"
          />
        ))}
        {cpuPath && (
          <path d={cpuPath} fill="none" stroke="var(--brand-orange)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        )}
        {memoryPath && (
          <path d={memoryPath} fill="none" stroke="rgb(var(--metric-blue-rgb))" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 5" opacity="0.95" />
        )}
        {latest.cpu !== null && (
          <circle cx={xForIndex(safePoints.length - 1)} cy={yForValue(latest.cpu, 'cpu')} r={3} fill="var(--brand-orange)" stroke="var(--bg)" strokeWidth={1.5} />
        )}
        {latest.memory !== null && (
          <circle cx={xForIndex(safePoints.length - 1)} cy={yForValue(latest.memory, 'memory')} r={3} fill="rgb(var(--metric-blue-rgb))" stroke="var(--bg)" strokeWidth={1.5} />
        )}
        <text x={paddingX} y={height + 1} className="type-micro-label fill-ui-text-muted">
          {formatMetricTime(first.timestamp)}
        </text>
        <text x={width - paddingX} y={height + 1} textAnchor="end" className="type-micro-label fill-ui-text-muted">
          {formatMetricTime(latest.timestamp)}
        </text>
      </svg>
    </div>
  );
};
