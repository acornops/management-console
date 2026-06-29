import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ICONS } from '@/constants';
import type { KubernetesCluster } from '@/types';
import { formatUserTime } from '@/utils/dateTime';

export interface ClusterMetricPoint {
  timestamp: number;
  cpu: number | null;
  memory: number | null;
}

function formatShortTime(timestamp: number): string {
  return formatUserTime(timestamp, { fallback: '-' });
}

export const ClusterResourceChart: React.FC<{
  cluster: KubernetesCluster;
  points: ClusterMetricPoint[];
}> = ({ cluster, points }) => {
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
      label: t('dashboard.nodes'),
      value: cluster.resourceSummary?.nodeCount ?? cluster.nodes.length,
      icon: <ICONS.Server className="h-4 w-4 text-status-success-text/70" />
    },
    {
      label: t('dashboard.namespaces'),
      value: cluster.resourceSummary?.namespaceCount ?? cluster.namespaces.length,
      icon: <ICONS.LayoutGrid className="h-4 w-4 text-status-success-text/70" />
    },
    {
      label: t('dashboard.findings'),
      value: cluster.resourceSummary?.findingCount ?? cluster.alerts.length,
      icon: <ShieldCheck className="h-4 w-4 text-status-success-text/70" />
    }
  ];
  const footer = (
    <div className="grid h-[4.25rem] grid-cols-3 divide-x divide-ui-border border-t border-ui-border pt-5">
      {footerStats.map((stat) => (
        <div key={stat.label} className="min-w-0 px-4 sm:px-5">
          <p className="truncate text-[0.625rem] font-medium leading-3 text-ui-text-muted">{stat.label}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-base font-bold leading-5 text-ui-text">{stat.value}</span>
            {stat.icon}
          </div>
        </div>
      ))}
    </div>
  );
  const chartBodyClassName = 'grid min-h-0 grid-rows-[auto_minmax(0,1fr)] pb-3';

  const usableMetricPointCount = safePoints.filter((point) => point.cpu !== null || point.memory !== null).length;

  if (usableMetricPointCount < 2) {
    return (
      <div className="grid h-full min-h-0 flex-1 grid-rows-[minmax(0,1fr)_4.25rem]" aria-label={t('dashboard.telemetryAria', { name: cluster.name })}>
        <div className="flex min-h-0 flex-col items-center justify-center px-5 pb-3 text-center">
          <p className="type-micro-label">{safePoints.length === 0 ? t('dashboard.noTelemetry') : t('dashboard.collectingHistory')}</p>
          {safePoints.length > 0 && (
            <p className="type-caption mt-2 max-w-xs">
              {t('dashboard.collectingHistoryBody')}
            </p>
          )}
        </div>
        {footer}
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
    return paddingTop + (1 - ratio) * (plotBottom - paddingTop);
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
    <div className="grid h-full min-h-0 flex-1 grid-rows-[minmax(0,1fr)_4.25rem]" aria-label={t('dashboard.telemetryAria', { name: cluster.name })}>
      <div className={chartBodyClassName}>
        <div className="mb-1.5 flex min-w-0 items-center gap-3">
          <span className="inline-flex items-center gap-1.5 truncate text-[0.6875rem] font-semibold leading-3 text-accent-strong">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            {t('dashboard.cpu')} {latest.cpu === null ? '-' : `${latest.cpu.toFixed(2)} ${t('dashboard.core')}`}
          </span>
          <span className="inline-flex items-center gap-1.5 truncate text-[0.6875rem] font-semibold leading-3 text-metric-blue">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-metric-blue" />
            {t('dashboard.memory')} {latest.memory === null ? '-' : `${latest.memory.toFixed(2)} ${t('dashboard.gib')}`}
          </span>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full min-h-0 w-full overflow-visible" role="img">
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
          {cpuPath && (
            <path d={cpuPath} fill="none" stroke="var(--brand-orange)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          )}
          {memoryPath && (
            <path d={memoryPath} fill="none" stroke="rgb(var(--metric-blue-rgb))" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 5" opacity="0.9" />
          )}
          {latest.cpu !== null && (
            <circle cx={xForIndex(safePoints.length - 1)} cy={yForValue(latest.cpu, 'cpu')} r={2.5} fill="var(--brand-orange)" stroke="var(--bg)" strokeWidth={1.5} />
          )}
          {latest.memory !== null && (
            <circle cx={xForIndex(safePoints.length - 1)} cy={yForValue(latest.memory, 'memory')} r={2.5} fill="rgb(var(--metric-blue-rgb))" stroke="var(--bg)" strokeWidth={1.5} />
          )}
          <text x={paddingX} y={labelY} className="type-micro-label fill-ui-text-muted">
            {formatShortTime(first.timestamp)}
          </text>
          <text x={width - paddingX} y={labelY} textAnchor="end" className="type-micro-label fill-ui-text-muted">
            {formatShortTime(latest.timestamp)}
          </text>
        </svg>
      </div>
      {footer}
    </div>
  );
};
