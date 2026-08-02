import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Bot, Box, CircleCheck, Cpu, Layers, Server } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTableHeader,
  DataTableHeaderCell,
  IconTile,
  InlineAlert,
  PageHeader,
  PageShell,
  StatusBadge
} from '@acornops/ui';
import { MetricChart } from '@/components/common/MetricChart';
import { issueSeverityTone, issueStatusTone, issueSupportingText, issueTargetScopeLabel, kubernetesIssueNamespace, shouldShowIssueStatus } from '@/pages/issues/issueUi';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneIssueItem, ControlPlaneTargetIssueSummary } from '@/services/controlPlaneApi';
import { ClusterMetricHistoryPoint, KubernetesCluster } from '@/types';
import { formatRelativeTime as formatReadableRelativeTime, formatUserTime } from '@/utils/dateTime';
import { formatLastUpdated, getAgentConnectionState, getTelemetryFreshness, getTelemetryFreshnessLabel } from '@/utils/telemetry';
import {
  AutomaticInvestigationActivity,
  shouldShowManualAssistantFallback
} from '@/features/auto-triage/AutomaticInvestigationActivity';
import { useVisibilityAwareRefresh } from '@/hooks/useVisibilityAwareRefresh';
import { DataTable, DataTableBody, DataTableCell, DataTableRow } from '@acornops/ui';

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

function formatRelativeTime(timestamp: number, now = Date.now()): string {
  return formatReadableRelativeTime(timestamp, { now });
}

function severityRank(severity: ControlPlaneIssueItem['severity']): number {
  if (severity === 'critical') return 0;
  if (severity === 'warning') return 1;
  return 2;
}

function issueTimestamp(issue: ControlPlaneIssueItem): number {
  return Date.parse(issue.lastSeenAt || issue.updatedAt) || Date.now();
}

function issueFirstSeenTimestamp(issue: ControlPlaneIssueItem): number {
  return Date.parse(issue.firstSeenAt || issue.createdAt) || issueTimestamp(issue);
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
  const [metricHistory, setMetricHistory] = useState<ClusterMetricHistoryPoint[]>(cluster.metricHistory || []);
  const [metricHistoryStatus, setMetricHistoryStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
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

  const [clusterIssues, setClusterIssues] = useState<ControlPlaneIssueItem[] | null>(null);
  const [issueLoadStatus, setIssueLoadStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [issueRequestVersion, setIssueRequestVersion] = useState(0);
  const issueSectionTitleId = React.useId();
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

    setMetricHistory(cluster.metricHistory || []);
    setMetricHistoryStatus('loading');
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
        setMetricHistoryStatus('error');
      });

    return () => {
      isCurrent = false;
    };
  }, [cluster.id, cluster.workspaceId, cluster.agentConnectionState, metricHistoryRequestVersion]);

  useEffect(() => {
    let isCurrent = true;
    setIssueLoadStatus('loading');

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
        setIssueLoadStatus('error');
      });

    return () => {
      isCurrent = false;
    };
  }, [cluster.id, cluster.workspaceId, issueRequestVersion]);

  const reportedIssues = useMemo(
    () =>
      [...(clusterIssues || [])].sort((left, right) => {
        const severityDelta = severityRank(left.severity) - severityRank(right.severity);
        if (severityDelta !== 0) return severityDelta;
        return issueTimestamp(right) - issueTimestamp(left);
      }),
    [clusterIssues]
  );
  const hasIssueRows = clusterIssues !== null;
  const isInitialIssueLoad = issueLoadStatus === 'loading' && !hasIssueRows;
  const hasIssueCounts = issueSummary !== null || hasIssueRows;
  const issueCount = issueSummary?.total ?? (hasIssueRows ? reportedIssues.length : 0);
  const criticalIssues = issueSummary ? issueSummary.critical : hasIssueRows ? reportedIssues.filter((issue) => issue.severity === 'critical').length : 0;
  const warningIssues = issueSummary ? issueSummary.warning : hasIssueRows ? reportedIssues.filter((issue) => issue.severity === 'warning').length : 0;
  const shouldShowIssueLoadFailure = issueLoadStatus === 'error' && (!issueSummary || issueSummary.total > 0);
  const scopedResourceCount =
    cluster.resourceSummary?.resourceCount ??
    cluster.workloads.length + cluster.services.length + cluster.ingresses.length + cluster.pvcs.length + cluster.nodes.length + cluster.namespaces.length;
  const hasNodeInventory = cluster.nodes.length > 0;
  const observedNodeCount = cluster.resourceSummary?.nodeCount ?? cluster.nodes.length;
  const readyNodeCount = cluster.nodes.filter((node) => node.status.toLowerCase() === 'ready').length;
  const observedNamespaceCount = cluster.resourceSummary?.namespaceCount ?? cluster.namespaces.length;
  const countFormatter = useMemo(() => new Intl.NumberFormat(i18n.language), [i18n.language]);
  const clusterSummaryCards = [
    {
      label: t('clusterOverview.nodeReadiness'),
      value: hasNodeInventory ? `${readyNodeCount}/${cluster.nodes.length}` : t('common.unknown'),
      detail: hasNodeInventory
        ? t('clusterOverview.nodesReadyDetail', { ready: readyNodeCount, total: cluster.nodes.length })
        : observedNodeCount > 0
          ? t('clusterOverview.nodesObserved', { count: observedNodeCount })
          : t('clusterOverview.inventoryPending'),
      Icon: Server
    },
    {
      label: t('clusterOverview.runningPodsLabel'),
      value: `${cluster.podStats.running}/${podCount}`,
      detail: t('clusterOverview.podStateDetail', { pending: cluster.podStats.pending, failed: cluster.podStats.failed }),
      Icon: Box
    },
    {
      label: t('clusterOverview.namespacesObserved'),
      value: countFormatter.format(observedNamespaceCount),
      detail: t('clusterOverview.inventoryObservedDetail'),
      Icon: Layers
    },
    {
      label: t('clusterOverview.resourcesObserved'),
      value: countFormatter.format(scopedResourceCount),
      detail: t('clusterOverview.inventoryObservedDetail'),
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

      <section
        aria-labelledby={issueSectionTitleId}
        aria-busy={issueLoadStatus === 'loading' || undefined}
        className="mb-8 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm"
      >
        <div className="flex flex-col gap-6 border-b border-ui-border bg-ui-bg px-5 py-5 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <IconTile tone="accent" className="mt-1 bg-accent-soft text-accent-readable">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </IconTile>
            <div className="min-w-0">
              <h2 id={issueSectionTitleId} className="type-row-title">
                {t('clusterOverview.activeIssues')}
              </h2>
              <p className="type-caption mt-2 max-w-3xl">
                {t('clusterOverview.activeIssuesScope', {
                  pods: podCount,
                  resources: scopedResourceCount
                })}
              </p>
              {hasIssueCounts && <p className="type-body mt-2 max-w-3xl">{t('clusterOverview.activeIssuesBody', { count: issueCount })}</p>}
            </div>
          </div>
          {hasIssueCounts && (
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="neutral" className="px-3 py-1 type-caption normal-case tracking-normal">{t('clusterOverview.issueCount', { count: issueCount })}</StatusBadge>
              <StatusBadge tone="danger" className="px-3 py-1 type-caption normal-case tracking-normal">
                {t('clusterOverview.criticalIssues', { count: criticalIssues })}
              </StatusBadge>
              <StatusBadge tone="warning" className="px-3 py-1 type-caption normal-case tracking-normal">
                {t('clusterOverview.warningIssues', { count: warningIssues })}
              </StatusBadge>
            </div>
          )}
        </div>

        {isInitialIssueLoad ? (
          <div className="flex min-h-36 flex-col items-center justify-center px-6 py-10 text-center" role="status" aria-live="polite">
            <div className="rounded-md border border-ui-border bg-ui-bg p-3 text-accent-strong">
              <Activity className="h-5 w-5 animate-pulse" aria-hidden="true" />
            </div>
            <h3 className="type-row-title mt-4">{t('clusterOverview.loadingIssuesTitle')}</h3>
            <p className="type-body mt-2 max-w-xl">{t('clusterOverview.loadingIssuesBody')}</p>
          </div>
        ) : reportedIssues.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto 2xl:block">
              <DataTable caption={t('clusterOverview.activeIssues')} className="w-full">
                <DataTableHeader>
                  <DataTableRow>
                    <DataTableHeaderCell density="compact">{t('clusterOverview.issue')}</DataTableHeaderCell>
                    <DataTableHeaderCell density="compact">{t('clusterOverview.severity')}</DataTableHeaderCell>
                    <DataTableHeaderCell density="compact">{t('clusterOverview.namespace')}</DataTableHeaderCell>
                    <DataTableHeaderCell density="compact">{t('overview.lastSeenLabel')}</DataTableHeaderCell>
                    {onOpenCopilot && <DataTableHeaderCell density="compact" numeric>{t('clusterOverview.action')}</DataTableHeaderCell>}
                  </DataTableRow>
                </DataTableHeader>
                <DataTableBody>
                  {reportedIssues.map((issue) => (
                    <DataTableRow key={issue.id} className="border-b border-ui-border transition-colors last:border-b-0 hover:bg-ui-bg/70">
                      <DataTableCell density="compact" className="max-w-[34rem]">
                        <div className="flex flex-wrap items-center gap-2">
                          {shouldShowIssueStatus(issue.status) && (
                            <StatusBadge tone={issueStatusTone(issue.status)}>{t(`issues.status.${issue.status}`)}</StatusBadge>
                          )}
                          <span className="type-caption text-ui-text-muted">
                            {t('overview.firstSeenLabel')}: {formatRelativeTime(issueFirstSeenTimestamp(issue))}
                          </span>
                        </div>
                        <h3 className="type-row-title mt-2 break-words">{issue.title}</h3>
                        {issueSupportingText(issue) && <p className="type-body mt-1 break-words">{issueSupportingText(issue)}</p>}
                        <AutomaticInvestigationActivity
                          workspaceId={cluster.workspaceId}
                          targetId={cluster.id}
                          targetType="kubernetes"
                          issueId={issue.id}
                          activity={issue.automaticInvestigation}
                        />
                      </DataTableCell>
                      <DataTableCell density="compact">
                        <StatusBadge tone={issueSeverityTone(issue.severity)}>{t(`issues.severity.${issue.severity}`)}</StatusBadge>
                      </DataTableCell>
                      <DataTableCell density="compact" className="type-caption break-words">{kubernetesIssueNamespace(issue, t('clusterOverview.clusterWide'))}</DataTableCell>
                      <DataTableCell density="compact" className="type-caption">{formatRelativeTime(issueTimestamp(issue))}</DataTableCell>
                      {onOpenCopilot && (
                        <DataTableCell density="compact" className="text-right">
                          {shouldShowManualAssistantFallback(issue.automaticInvestigation) && (
                            <Button
                              onClick={() => openIssueTriage(issue)}
                              variant="primary"
                              size="md"
                              className="whitespace-nowrap"
                            >
                              <Bot className="h-4 w-4" aria-hidden="true" />
                              {t('clusterOverview.openAssistant')}
                            </Button>
                          )}
                        </DataTableCell>
                      )}
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </div>

            <div className="divide-y divide-ui-border 2xl:hidden">
              {reportedIssues.map((issue) => (
                <article key={issue.id} className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={issueSeverityTone(issue.severity)}>{t(`issues.severity.${issue.severity}`)}</StatusBadge>
                    {shouldShowIssueStatus(issue.status) && (
                      <StatusBadge tone={issueStatusTone(issue.status)}>{t(`issues.status.${issue.status}`)}</StatusBadge>
                    )}
                  </div>
                  <h3 className="type-row-title mt-4 break-words">{issue.title}</h3>
                  {issueSupportingText(issue) && <p className="type-body mt-2 break-words">{issueSupportingText(issue)}</p>}
                  <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <dt className="type-micro-label text-ui-text-muted">{t('clusterOverview.namespace')}</dt>
                      <dd className="type-caption mt-1 break-words">{kubernetesIssueNamespace(issue, t('clusterOverview.clusterWide'))}</dd>
                    </div>
                    <div>
                      <dt className="type-micro-label text-ui-text-muted">{t('overview.firstSeenLabel')}</dt>
                      <dd className="type-caption mt-1">{formatRelativeTime(issueFirstSeenTimestamp(issue))}</dd>
                    </div>
                    <div>
                      <dt className="type-micro-label text-ui-text-muted">{t('overview.lastSeenLabel')}</dt>
                      <dd className="type-caption mt-1">{formatRelativeTime(issueTimestamp(issue))}</dd>
                    </div>
                  </dl>
                  <AutomaticInvestigationActivity
                    workspaceId={cluster.workspaceId}
                    targetId={cluster.id}
                    targetType="kubernetes"
                    issueId={issue.id}
                    activity={issue.automaticInvestigation}
                  />
                  {onOpenCopilot && shouldShowManualAssistantFallback(issue.automaticInvestigation) && (
                    <Button
                      onClick={() => openIssueTriage(issue)}
                      variant="primary"
                      size="md"
                      className="mt-4"
                    >
                      <Bot className="h-4 w-4" aria-hidden="true" />
                      {t('clusterOverview.openAssistant')}
                    </Button>
                  )}
                </article>
              ))}
            </div>
          </>
        ) : shouldShowIssueLoadFailure ? (
          <div className="flex min-h-36 flex-col items-center justify-center px-6 py-10 text-center" role="alert">
            <div className="rounded-md border border-status-warning/20 bg-status-warning-soft p-3 text-status-warning-text">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="type-row-title mt-4">{t('clusterOverview.issueLoadFailedTitle')}</h3>
            <p className="type-body mt-2 max-w-xl">{t(issueSummary ? 'clusterOverview.issueLoadFailedBody' : 'clusterOverview.issueLoadFailedWithoutSummaryBody')}</p>
            <Button onClick={retryIssues} variant="secondary" size="sm" className="mt-4">
              {t('common.retry')}
            </Button>
          </div>
        ) : (
          <div className="flex min-h-36 flex-col items-center justify-center px-6 py-10 text-center">
            <div className="rounded-md border border-status-success/20 bg-status-success-soft p-3 text-status-success-text">
              <CircleCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="type-row-title mt-4">{t('clusterOverview.noIssuesTitle')}</h3>
            <p className="type-body mt-2 max-w-xl">{t('clusterOverview.noIssuesBody')}</p>
          </div>
        )}
      </section>

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
        {clusterSummaryCards.map(({ label, value, detail, Icon }) => (
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
            <p className="type-caption mt-3 truncate text-ui-text-muted">{detail}</p>
          </div>
        ))}
      </section>
    </PageShell>
  );
};
