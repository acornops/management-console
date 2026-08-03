import React from 'react';
import { Activity, Gauge } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, CollectionState, EmptyState } from '@acornops/ui';
import { MetricChart } from '@/components/common/MetricChart';
import { ICONS } from '@/constants';
import type { ControlPlaneVirtualMachineMetricHistoryPoint } from '@/services/controlPlaneApi';
import {
  formatMetricTime,
  getLatestVmTelemetryPoint,
  getVmMetricTimeline,
  type VmMetricTimelinePoint
} from '@/pages/virtual-machines/VirtualMachineMetrics';
import { VirtualMachineTelemetrySummary } from '@/pages/virtual-machines/VirtualMachineTelemetrySummary';

interface VirtualMachineTelemetryPanelProps {
  metricHistory: ControlPlaneVirtualMachineMetricHistoryPoint[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  onRetry: () => Promise<void>;
}

export const VirtualMachineTelemetryPanel: React.FC<VirtualMachineTelemetryPanelProps> = ({
  metricHistory,
  status,
  onRetry
}) => {
  const { t } = useTranslation();
  const metricTimeline = React.useMemo(() => getVmMetricTimeline(metricHistory), [metricHistory]);
  const loadSeries = React.useMemo(
    () => metricTimeline
      .filter((point): point is VmMetricTimelinePoint & { loadAverage1m: number } => point.loadAverage1m !== null)
      .map((point) => ({ label: formatMetricTime(point.timestamp), value: point.loadAverage1m })),
    [metricTimeline]
  );
  const memorySeries = React.useMemo(
    () => metricTimeline
      .filter((point): point is VmMetricTimelinePoint & { memoryUsedPercent: number } => point.memoryUsedPercent !== null)
      .map((point) => ({ label: formatMetricTime(point.timestamp), value: point.memoryUsedPercent })),
    [metricTimeline]
  );
  const latestTelemetryPoint = React.useMemo(() => getLatestVmTelemetryPoint(metricTimeline), [metricTimeline]);
  const hasLoadTrend = loadSeries.length >= 2;
  const hasMemoryTrend = memorySeries.length >= 2;
  const hasTelemetryTrend = hasLoadTrend || hasMemoryTrend;

  return (
    <section className="mb-12" aria-labelledby="vm-telemetry-heading">
      <div className="mb-4">
        <h2 id="vm-telemetry-heading" className="type-section-title">{t('virtualMachines.overview.telemetryTitle')}</h2>
        <p className="mt-1 type-body text-ui-text-muted">{t('virtualMachines.overview.telemetryDescription')}</p>
      </div>

      <CollectionState
        phase={status === 'loading' ? 'loading' : status === 'error' ? 'error' : 'ready'}
        itemCount={metricTimeline.length}
        loading={(
          <div className="rounded-xl border border-ui-border bg-ui-surface shadow-sm">
            <EmptyState embedded headingLevel={3} role="status" icon={<Gauge aria-hidden="true" />} title={t('virtualMachines.overview.loadingMetricHistory')} description={t('virtualMachines.overview.loadingMetricHistoryBody')} />
          </div>
        )}
        empty={(
          <div className="rounded-xl border border-ui-border bg-ui-surface shadow-sm">
            <EmptyState embedded headingLevel={3} role="status" icon={<Gauge aria-hidden="true" />} title={t('virtualMachines.overview.noVmMetricSamples')} description={t('virtualMachines.overview.noVmMetricSamplesBody')} />
          </div>
        )}
        error={(
          <div className="rounded-xl border border-ui-border bg-ui-surface shadow-sm">
            <EmptyState
              embedded
              headingLevel={3}
              role="alert"
              icon={<ICONS.AlertTriangle aria-hidden="true" />}
              title={t('virtualMachines.overview.telemetryLoadFailedTitle')}
              description={t('virtualMachines.overview.telemetryLoadFailedBody')}
              actions={(
                <Button variant="secondary" size="sm" onClick={() => void onRetry()}>
                  <ICONS.RefreshCw className="h-4 w-4" aria-hidden="true" />
                  {t('common.retry')}
                </Button>
              )}
            />
          </div>
        )}
      >
        <div className="space-y-6">
          {hasTelemetryTrend ? (
            <div className={`grid w-full grid-cols-1 gap-6 lg:gap-8 ${hasLoadTrend && hasMemoryTrend ? 'lg:grid-cols-2' : ''}`}>
              {hasLoadTrend && (
                <MetricChart
                  title={t('virtualMachines.overview.loadAverage')}
                  description={t('virtualMachines.overview.loadDescription')}
                  icon={Activity}
                  points={loadSeries}
                  unit=""
                  type="area"
                  emptyTitle={t('virtualMachines.overview.noUsableVmMetricSamples')}
                  loadingTitle={t('virtualMachines.overview.loadingMetricHistory')}
                  emptyDescription={t('virtualMachines.overview.noUsableVmMetricSamplesBody')}
                />
              )}
              {hasMemoryTrend && (
                <MetricChart
                  title={t('virtualMachines.overview.memory')}
                  description={t('virtualMachines.overview.memoryDescription')}
                  icon={Gauge}
                  points={memorySeries}
                  unit="%"
                  type="line"
                  emptyTitle={t('virtualMachines.overview.noUsableVmMetricSamples')}
                  loadingTitle={t('virtualMachines.overview.loadingMetricHistory')}
                  emptyDescription={t('virtualMachines.overview.noUsableVmMetricSamplesBody')}
                />
              )}
            </div>
          ) : (
            <p className="rounded-lg border border-ui-border bg-ui-surface px-4 py-3 type-body text-ui-text-muted">
              {t('virtualMachines.overview.waitingForAnotherVmSampleBody')}
            </p>
          )}
          <VirtualMachineTelemetrySummary latestTelemetryPoint={latestTelemetryPoint} mode={hasTelemetryTrend ? 'storage' : 'all'} />
        </div>
      </CollectionState>
    </section>
  );
};
