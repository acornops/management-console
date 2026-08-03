import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineAlert } from '@acornops/ui';
import { formatCpuCores, formatMemoryGiB, getClusterTelemetrySnapshot } from '@/components/dashboard/clusterTelemetryModel';
import { TelemetryTrendSummary } from '@/features/targets/catalog/TelemetryTrendSummary';
import { ICONS } from '@/constants';
import { KubernetesCluster } from '@/types';
import { formatCompactRelativeTime } from '@/utils/dateTime';
import { getAgentConnectionState, getTelemetryFreshness } from '@/utils/telemetry';
import { TelemetryFactGrid } from '@/components/common/TelemetryFactGrid';
import { projectTelemetrySeries, telemetryGapThreshold } from '@/components/common/telemetryChart';

const DEFAULT_SPARKLINE_GAP_MS = 15 * 60 * 1000;

export const ClusterTelemetryPanel: React.FC<{
  cluster: KubernetesCluster;
  now?: number;
  compact?: boolean;
  loadState?: 'loading' | 'ready' | 'error';
  onRetry?: () => void;
}> = ({ cluster, now, compact = false, loadState = 'ready', onRetry }) => {
  const { t } = useTranslation();
  const { timeline, cpuPoints, memoryPoints, cpuDisplay, memoryDisplay } = React.useMemo(() => getClusterTelemetrySnapshot(cluster), [cluster]);
  const hasCpuTrend = cpuPoints.length >= 2;
  const hasMemoryTrend = memoryPoints.length >= 2;
  const hasTrend = hasCpuTrend || hasMemoryTrend;
  const hasAnyMetric = cpuPoints.length > 0 || memoryPoints.length > 0;
  const cpuPath = React.useMemo(() => projectTelemetrySeries(
    cpuPoints.map((point) => ({ position: point.timestamp, value: point.value })),
    {
      xStart: 0,
      xEnd: 180,
      yStart: 0,
      yEnd: 92,
      gapThreshold: telemetryGapThreshold(cpuPoints.map((point) => point.timestamp), DEFAULT_SPARKLINE_GAP_MS)
    }
  ).path, [cpuPoints]);
  const memoryPath = React.useMemo(() => projectTelemetrySeries(
    memoryPoints.map((point) => ({ position: point.timestamp, value: point.value })),
    {
      xStart: 0,
      xEnd: 180,
      yStart: 0,
      yEnd: 92,
      gapThreshold: telemetryGapThreshold(memoryPoints.map((point) => point.timestamp), DEFAULT_SPARKLINE_GAP_MS)
    }
  ).path, [memoryPoints]);
  const axisStartLabel = timeline.length >= 2 ? formatCompactRelativeTime(timeline[0].timestamp, { now }) : t('dashboard.telemetryAxisEarlier');
  const axisEndLabel =
    timeline.length >= 2
      ? formatCompactRelativeTime(timeline[timeline.length - 1].timestamp, {
          now
        })
      : t('dashboard.telemetryAxisNow');
  const metricItems = [
    {
      id: 'cpu',
      label: t('dashboard.cpu'),
      value: cpuDisplay,
      icon: ICONS.Cpu,
      markerClassName: 'bg-accent-strong'
    },
    {
      id: 'memory',
      label: t('dashboard.memory'),
      value: memoryDisplay,
      icon: ICONS.HardDrive,
      markerClassName: 'bg-metric-blue'
    }
  ];
  const trendSummary = hasTrend ? (
    <TelemetryTrendSummary
      title={t('dashboard.telemetryAria', { name: cluster.name })}
      metricColumnLabel={t('dashboard.telemetryMetric')}
      startLabel={axisStartLabel}
      endLabel={axisEndLabel}
      series={[
        {
          label: t('dashboard.cpu'),
          startValue: formatCpuCores(cpuPoints[0]?.value ?? null) ?? t('dashboard.unavailable'),
          endValue: formatCpuCores(cpuPoints[cpuPoints.length - 1]?.value ?? null) ?? t('dashboard.unavailable')
        },
        {
          label: t('dashboard.memory'),
          startValue: formatMemoryGiB(memoryPoints[0]?.value ?? null) ?? t('dashboard.unavailable'),
          endValue: formatMemoryGiB(memoryPoints[memoryPoints.length - 1]?.value ?? null) ?? t('dashboard.unavailable')
        }
      ]}
    />
  ) : null;
  const retryButton = onRetry ? (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="pointer-events-auto shrink-0"
      aria-label={t('dashboard.retryTelemetry', { name: cluster.name })}
      onClick={(event) => {
        event.stopPropagation();
        onRetry();
      }}
    >
      {t('common.retry')}
    </Button>
  ) : null;

  if (compact) {
    const telemetryFreshness = getTelemetryFreshness(cluster, now);
    const telemetryIsStale = telemetryFreshness === 'stale' || telemetryFreshness === 'offline';
    const lastSignalLabel =
      getAgentConnectionState(cluster) === 'disconnected'
        ? t('dashboard.telemetryPaused')
        : loadState === 'error'
        ? t('dashboard.telemetryRefreshFailed')
        : loadState === 'loading'
        ? t('dashboard.loadingTelemetry')
        : t(telemetryIsStale ? 'dashboard.lastUpdatedTime' : 'dashboard.updatedTime', {
            time: formatCompactRelativeTime(cluster.lastUpdate, { context: 'sentence-fragment', now })
          });

    return (
      <section data-cluster-telemetry-panel="compact" aria-label={t('dashboard.telemetryAria', { name: cluster.name })} className="shrink-0 px-4 pb-3">
        <TelemetryFactGrid items={metricItems} variant="compact" />
        <div>
          <div className="relative h-[88px] min-w-0 overflow-hidden">
            <svg viewBox="0 0 180 108" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
              <line x1="0" x2="180" y1="20" y2="20" className="stroke-ui-border/55" strokeWidth="1" />
              <line x1="0" x2="180" y1="54" y2="54" className="stroke-ui-border/55" strokeWidth="1" />
              <line x1="0" x2="180" y1="88" y2="88" className="stroke-ui-border/55" strokeWidth="1" />
              {hasCpuTrend && cpuPath && (
                <path d={cpuPath} fill="none" className="stroke-accent-strong" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" transform="translate(0 8)" />
              )}
              {hasMemoryTrend && memoryPath && (
                <path
                  d={memoryPath}
                  fill="none"
                  className="stroke-metric-blue"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.4"
                  opacity="0.78"
                  transform="translate(0 8)"
                />
              )}
            </svg>
            {!hasTrend && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center"
                role={loadState === 'error' ? 'alert' : 'status'}
                aria-live="polite"
              >
                <p className={`type-caption type-emphasis ${loadState === 'error' ? 'text-status-danger-text' : 'text-ui-text-muted'}`}>
                  {loadState === 'loading'
                    ? t('dashboard.loadingTelemetry')
                    : loadState === 'error'
                    ? t('dashboard.telemetryLoadFailed')
                    : hasAnyMetric
                    ? t('dashboard.collectingHistory')
                    : t('dashboard.noTelemetry')}
                </p>
                {loadState === 'error' && retryButton}
              </div>
            )}
          </div>
          {trendSummary}
          {hasTrend && (
            <div className="type-caption mt-1 flex min-w-0 items-center justify-between gap-3 text-ui-text-muted">
              <span>{axisStartLabel}</span>
              <span
                className={loadState === 'error' ? 'text-status-danger-text' : telemetryIsStale ? 'text-status-warning-text' : undefined}
                role={loadState === 'error' ? 'alert' : loadState === 'loading' ? 'status' : undefined}
                aria-live={loadState !== 'ready' ? 'polite' : undefined}
              >
                {lastSignalLabel}
              </span>
              {loadState === 'error' && retryButton}
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section data-cluster-telemetry-panel="true" aria-label={t('dashboard.telemetryAria', { name: cluster.name })} className="shrink-0 overflow-hidden rounded-md bg-ui-bg/35">
      <TelemetryFactGrid items={metricItems} variant="strip" />

      <div className="min-w-0 px-3 py-3">
        <div className="relative h-[132px] min-w-0 overflow-hidden px-2.5 py-2">
          <svg viewBox="0 0 180 108" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
            <line x1="0" x2="180" y1="18" y2="18" className="stroke-ui-border/60" strokeWidth="1" />
            <line x1="0" x2="180" y1="54" y2="54" className="stroke-ui-border/60" strokeWidth="1" />
            <line x1="0" x2="180" y1="90" y2="90" className="stroke-ui-border/60" strokeWidth="1" />
            {hasCpuTrend && cpuPath && (
              <path d={cpuPath} fill="none" className="stroke-accent-strong" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" transform="translate(0 8)" />
            )}
            {hasMemoryTrend && memoryPath && (
              <path
                d={memoryPath}
                fill="none"
                className="stroke-metric-blue"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.4"
                opacity="0.78"
                transform="translate(0 8)"
              />
            )}
          </svg>
          {!hasTrend && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center" role={loadState === 'error' ? 'alert' : 'status'} aria-live="polite">
              <p
                className={`type-caption max-w-[18rem] ${loadState === 'error' ? 'text-status-danger-text' : 'text-ui-text-muted'}`}
                title={loadState === 'error' ? t('dashboard.telemetryLoadFailed') : t('dashboard.collectingHistoryBody')}
              >
                <span className="type-emphasis text-ui-text">
                  {loadState === 'loading'
                    ? t('dashboard.loadingTelemetry')
                    : loadState === 'error'
                    ? t('dashboard.telemetryLoadFailed')
                    : hasAnyMetric
                    ? t('dashboard.collectingHistory')
                    : t('dashboard.noTelemetry')}
                </span>
                {loadState === 'ready' && <span className="ml-1">{t('dashboard.collectingHistoryBody')}</span>}
              </p>
              {loadState === 'error' && retryButton}
            </div>
          )}
        </div>
        {trendSummary}
        <div className="type-caption mt-1.5 flex min-w-0 items-center justify-between gap-3 text-ui-text-muted" aria-hidden="true">
          <span>{axisStartLabel}</span>
          <span className="min-w-0 truncate text-center">{t('dashboard.telemetryAxisLabel')}</span>
          <span>{axisEndLabel}</span>
        </div>
        {loadState === 'error' && hasTrend && (
          <InlineAlert tone="danger" className="mt-2 min-w-0 px-3 py-2" action={retryButton}>
            <span className="break-words">{t('dashboard.telemetryRefreshFailed')}</span>
          </InlineAlert>
        )}
      </div>
    </section>
  );
};
