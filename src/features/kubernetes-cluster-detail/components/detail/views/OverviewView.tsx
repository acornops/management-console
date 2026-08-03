import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Box, Cpu, Layers, Server } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  IconTile,
  InlineAlert,
  PageHeader,
  PageShell
} from '@acornops/ui';
import { MetricChart } from '@/components/common/MetricChart';
import { issueTargetScopeLabel, kubernetesIssueNamespace } from '@/pages/issues/issueUi';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneIssueItem, ControlPlaneTargetIssueSummary } from '@/services/controlPlaneApi';
import { ClusterMetricHistoryPoint, KubernetesCluster } from '@/types';
import { formatUserTime } from '@/utils/dateTime';
import { formatLastUpdated, getAgentConnectionState, getTelemetryFreshness, getTelemetryFreshnessLabel } from '@/utils/telemetry';
import { useVisibilityAwareRefresh } from '@/hooks/useVisibilityAwareRefresh';
import { hasSessionDataCacheValue, useSessionCachedState } from '@/hooks/sessionDataCache';
import { TargetIssuesPanel } from '@/features/targets/issues/TargetIssuesPanel';

interface OverviewViewProps {
  cluster: KubernetesCluster;
  issueSummary: ControlPlaneTargetIssueSummary | null;
  isDark: boolean;
  onOpenCopilot?: (prompt?: string) => void;
}

function getPodCount(cluster: KubernetesCluster): number {
  return cluster.podStats.running + cluster.podStats.pending + cluster.podStats.failed;
}

function formatTime(timestamp: number): string {
  return formatUserTime(timestamp, { fallback: '-' });
}

interface MetricTimelinePoint {
  timestamp: number;
  cpu: number | null;
  memory: number | null;
}

function getPersistedMetricTimeline(points: ClusterMetricHistoryPoint[]): MetricTimelinePoint[] {
  return points
    .map((point) => {
      const timestamp = Date.parse(point.timestamp);
      if (Number.isNaN(timestamp)) return null;
      return {
        timestamp,
        cpu: typeof point.cpuCores === 'number' && Number.isFinite(point.cpuCores) ? point.cpuCores : null,
        memory: typeof point.memoryBytes === 'number' && Number.isFinite(point.memoryBytes) ? point.memoryBytes / 1024 ** 3 : null
      };
    })
    .filter((point): point is MetricTimelinePoint => point !== null);
}

export const OverviewView: React.FC<OverviewViewProps> = ({ cluster, issueSummary, onOpenCopilot }) => {
  const { t, i18n } = useTranslation();
  const podCount = getPodCount(cluster);
  const telemetryFreshness = getTelemetryFreshness(cluster);
  const telemetryLabel = getTelemetryFreshnessLabel(telemetryFreshness);
  const clusterCachePrefix = `workspace:${cluster.workspaceId}:cluster:${cluster.id}:overview:`;
  const metricHistoryCacheKey = `${clusterCachePrefix}metric-history`;
  const issueCacheKey = `${clusterCachePrefix}issues`;
  const [metricHistory, setMetricHistory] = useSessionCachedState<ClusterMetricHistoryPoint[]>(metricHistoryCacheKey, cluster.metricHistory || []);
  const [metricHistoryStatus, setMetricHistoryStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(() => hasSessionDataCacheValue(metricHistoryCacheKey) ? 'ready' : 'idle');
  const [metricHistoryRequestVersion, setMetricHistoryRequestVersion] = useState(0);
  const persistedMetricTimeline = useMemo(() => getPersistedMetricTimeline(metricHistory), [metricHistory]);

  const cpuSeries = useMemo(
    () =>
      persistedMetricTimeline
        .filter((point): point is MetricTimelinePoint & { cpu: number } => point.cpu !== null)
        .map((point) => ({
          label: formatTime(point.timestamp),
          value: point.cpu
        })),
    [persistedMetricTimeline]
  );
  const memorySeries = useMemo(
    () =>
      persistedMetricTimeline
        .filter((point): point is MetricTimelinePoint & { memory: number } => point.memory !== null)
        .map((point) => ({
          label: formatTime(point.timestamp),
          value: point.memory
        })),
    [persistedMetricTimeline]
  );
  const hasMetricSamples = cpuSeries.length > 0 || memorySeries.length > 0;

  const [clusterIssues, setClusterIssues] = useSessionCachedState<ControlPlaneIssueItem[] | null>(issueCacheKey, null);
  const [issueLoadStatus, setIssueLoadStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(() => hasSessionDataCacheValue(issueCacheKey) ? 'ready' : 'idle');
  const [issueRequestVersion, setIssueRequestVersion] = useState(0);
  useVisibilityAwareRefresh(() => {
    setIssueRequestVersion((value) => value + 1);
  });
  useEffect(() => {
    let isCurrent = true;

    if (getAgentConnectionState(cluster) !== 'connected') {
      setMetricHistory([]);
      setMetricHistoryStatus('idle');
      return () => {
        isCurrent = false;
      };
    }

    const hasCachedMetricHistory = hasSessionDataCacheValue(metricHistoryCacheKey);
    if (!hasCachedMetricHistory) setMetricHistoryStatus('loading');
    void controlPlaneApi
      .getClusterMetricsHistory(cluster.workspaceId, cluster.id, {
        window: '6h',
        limit: 48
      })
      .then((points) => {
        if (!isCurrent) return;
        setMetricHistory(points);
        setMetricHistoryStatus('ready');
      })
      .catch((error) => {
        console.error('Failed loading cluster metric history', error);
        if (!isCurrent) return;
        setMetricHistoryStatus(hasCachedMetricHistory ? 'ready' : 'error');
      });

    return () => {
      isCurrent = false;
    };
  }, [cluster.id, cluster.workspaceId, cluster.agentConnectionState, metricHistoryCacheKey, metricHistoryRequestVersion]);

  useEffect(() => {
    let isCurrent = true;
    if (!hasSessionDataCacheValue(issueCacheKey)) setIssueLoadStatus('loading');

    void controlPlaneApi
      .listTargetIssues(cluster.workspaceId, cluster.id, { limit: 50 })
      .then((page) => {
        if (!isCurrent) return;
        setClusterIssues(page.items);
        setIssueLoadStatus('ready');
      })
      .catch((error) => {
        console.error('Failed loading cluster issues', error);
        if (!isCurrent) return;
        setIssueLoadStatus(hasSessionDataCacheValue(issueCacheKey) ? 'ready' : 'error');
      });

    return () => {
      isCurrent = false;
    };
  }, [cluster.id, cluster.workspaceId, issueCacheKey, issueRequestVersion]);

  const hasIssueRows = clusterIssues !== null;
  const isInitialIssueLoad = issueLoadStatus === 'loading' && !hasIssueRows;
  const hasIssueCounts = issueSummary !== null || hasIssueRows;
  const issueCount = issueSummary?.total ?? (clusterIssues?.length || 0);
  const scopedResourceCount =
    cluster.resourceSummary?.resourceCount ??
    cluster.workloads.length + cluster.services.length + cluster.ingresses.length + cluster.pvcs.length + cluster.nodes.length + cluster.namespaces.length;
  const observedNodeCount = cluster.resourceSummary?.nodeCount ?? cluster.nodes.length;
  const snapshotReadyNodeCount = cluster.resourceSummary?.readyNodeCount;
  const hasSnapshotNodeReadiness = typeof snapshotReadyNodeCount === 'number'
    && Number.isFinite(snapshotReadyNodeCount)
    && snapshotReadyNodeCount >= 0
    && snapshotReadyNodeCount <= observedNodeCount;
  const readyNodeCount = hasSnapshotNodeReadiness
    ? snapshotReadyNodeCount
    : cluster.nodes.length > 0
      ? cluster.nodes.filter((node) => node.status.toLowerCase() === 'ready').length
      : undefined;
  const hasNodeReadiness = typeof readyNodeCount === 'number' && observedNodeCount > 0;
  const observedNamespaceCount = cluster.resourceSummary?.namespaceCount ?? cluster.namespaces.length;
  const countFormatter = useMemo(() => new Intl.NumberFormat(i18n.language), [i18n.language]);
  const clusterSummaryCards = [
    {
      label: t('clusterOverview.nodeReadiness'),
      value: hasNodeReadiness ? `${readyNodeCount}/${observedNodeCount}` : t('common.unknown'),
      Icon: Server
    },
    {
      label: t('clusterOverview.runningPodsLabel'),
      value: `${cluster.podStats.running}/${podCount}`,
      Icon: Box
    },
    {
      label: t('clusterOverview.namespacesObserved'),
      value: countFormatter.format(observedNamespaceCount),
      Icon: Layers
    },
    {
      label: t('clusterOverview.resourcesObserved'),
      value: countFormatter.format(scopedResourceCount),
      Icon: Activity
    }
  ];
  const openIssueTriage = (issue: ControlPlaneIssueItem) => {
    const namespace = kubernetesIssueNamespace(issue, t('clusterOverview.clusterWide'));
    const scope = issueTargetScopeLabel(issue, namespace);
    const prompt = `Triage "${issue.title}" on ${cluster.name}. Severity: ${issue.severity}. Status: ${issue.status}. Scope: ${scope}. Namespace: ${namespace}. Issue summary: ${issue.summary}`;
    onOpenCopilot?.(prompt);
  };
  const retryMetricHistory = () => setMetricHistoryRequestVersion((version) => version + 1);
  const retryIssues = () => setIssueRequestVersion((version) => version + 1);

  return (
    <PageShell>
      <PageHeader
        title={t('clusterOverview.title')}
        description={t('clusterOverview.latestTelemetryFor', {
          name: cluster.name
        })}
        actions={
          <div className="flex min-h-11 w-fit items-center gap-2 rounded-md border border-ui-border bg-ui-surface px-4 py-2 shadow-sm">
            <div
              className={`h-2 w-2 rounded-full ${
                telemetryFreshness === 'current' ? 'bg-status-success' : telemetryFreshness === 'stale' ? 'bg-status-warning' : 'bg-status-danger'
              }`}
              aria-hidden="true"
            />
            <span className="type-label">
              {telemetryLabel} · {formatLastUpdated(cluster.lastUpdate)}
            </span>
          </div>
        }
      />

      <TargetIssuesPanel
        workspaceId={cluster.workspaceId}
        targetId={cluster.id}
        targetType="kubernetes"
        issues={clusterIssues}
        issueSummary={issueSummary}
        isLoading={isInitialIssueLoad}
        loadFailed={issueLoadStatus === 'error'}
        sourceForIssue={(issue) => kubernetesIssueNamespace(issue, t('clusterOverview.clusterWide'))}
        onOpenAssistant={onOpenCopilot ? openIssueTriage : undefined}
        onRetry={retryIssues}
        labels={{
          title: t('clusterOverview.activeIssues'),
          description: (
            <>
              <p className="type-caption mt-2 max-w-3xl">
                {t('clusterOverview.activeIssuesScope', { pods: podCount, resources: scopedResourceCount })}
              </p>
              {hasIssueCounts && <p className="type-body mt-2 max-w-3xl">{t('clusterOverview.activeIssuesBody', { count: issueCount })}</p>}
            </>
          ),
          issueCount: (count) => t('clusterOverview.issueCount', { count }),
          criticalCount: (count) => t('clusterOverview.criticalIssues', { count }),
          warningCount: (count) => t('clusterOverview.warningIssues', { count }),
          issueColumn: t('clusterOverview.issue'),
          severityColumn: t('clusterOverview.severity'),
          sourceColumn: t('clusterOverview.namespace'),
          firstSeen: t('overview.firstSeenLabel'),
          lastSeen: t('overview.lastSeenLabel'),
          actionColumn: t('clusterOverview.action'),
          openAssistant: t('clusterOverview.openAssistant'),
          loadingTitle: t('clusterOverview.loadingIssuesTitle'),
          loadingBody: t('clusterOverview.loadingIssuesBody'),
          failureTitle: t('clusterOverview.issueLoadFailedTitle'),
          failureBody: t(issueSummary ? 'clusterOverview.issueLoadFailedBody' : 'clusterOverview.issueLoadFailedWithoutSummaryBody'),
          emptyTitle: t('clusterOverview.noIssuesTitle'),
          emptyBody: t('clusterOverview.noIssuesBody'),
          retry: t('common.retry'),
          severityLabel: (severity) => t(`issues.severity.${severity}`),
          statusLabel: (status) => t(`issues.status.${status}`)
        }}
      />

      {metricHistoryStatus === 'error' && (
        <InlineAlert
          tone="warning"
          className="mb-4 py-4"
          title={t('clusterOverview.telemetryLoadFailedTitle')}
          icon={<AlertTriangle className="h-4 w-4" />}
          action={<Button onClick={retryMetricHistory} variant="secondary" size="sm" className="w-full sm:w-auto">{t('common.retry')}</Button>}
        >
          <span className="max-w-3xl">{t('clusterOverview.telemetryLoadFailedBody')}</span>
        </InlineAlert>
      )}

      {(metricHistoryStatus !== 'error' || hasMetricSamples) && (
        <div className="mb-8 grid w-full grid-cols-1 gap-6 lg:grid-cols-2">
          <MetricChart
            title={t('clusterOverview.cpuUsage')}
            description={t('clusterOverview.cpuDescription')}
            icon={Cpu}
            points={cpuSeries}
            unit={t('clusterOverview.cpuUnit')}
            type="area"
            isLoading={metricHistoryStatus === 'loading'}
            emptyTitle={t(metricHistoryStatus === 'error' ? 'clusterOverview.telemetryLoadFailedTitle' : 'clusterOverview.noTelemetryHistory')}
            loadingTitle={t('clusterOverview.collectingHistory')}
            emptyDescription={t(metricHistoryStatus === 'error' ? 'clusterOverview.telemetryLoadFailedBody' : 'clusterOverview.trendAfterSamples')}
          />
          <MetricChart
            title={t('clusterOverview.memory')}
            description={t('clusterOverview.memoryDescription')}
            icon={Activity}
            points={memorySeries}
            unit="GiB"
            type="line"
            isLoading={metricHistoryStatus === 'loading'}
            emptyTitle={t(metricHistoryStatus === 'error' ? 'clusterOverview.telemetryLoadFailedTitle' : 'clusterOverview.noTelemetryHistory')}
            loadingTitle={t('clusterOverview.collectingHistory')}
            emptyDescription={t(metricHistoryStatus === 'error' ? 'clusterOverview.telemetryLoadFailedBody' : 'clusterOverview.trendAfterSamples')}
          />
        </div>
      )}

      <section aria-label={t('clusterOverview.inventorySummary')} className="mb-12 grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {clusterSummaryCards.map(({ label, value, Icon }) => (
          <div key={label} className="rounded-lg border border-ui-border bg-ui-surface p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <IconTile size="sm" tone="metric">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </IconTile>
              <div className="min-w-0">
                <p className="type-micro-label text-ui-text-muted">{label}</p>
                <p className="mt-1 type-data">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </section>
    </PageShell>
  );
};
