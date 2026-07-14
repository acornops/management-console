import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Cpu, Terminal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { MetricChart } from '@/components/common/MetricChart';
import { issueStatusTone } from '@/pages/issues/issueUi';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneIssueItem, ControlPlaneTargetIssueSummary } from '@/services/controlPlaneApi';
import { ClusterMetricHistoryPoint, KubernetesCluster } from '@/types';
import { formatRelativeTime as formatReadableRelativeTime, formatUserTime } from '@/utils/dateTime';
import { formatLastUpdated, getAgentConnectionState, getTelemetryFreshness, getTelemetryFreshnessLabel } from '@/utils/telemetry';

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

function getSeverityTone(severity: ControlPlaneIssueItem['severity']): string {
  if (severity === 'critical') return 'bg-status-danger-soft text-status-danger-text';
  if (severity === 'warning') return 'bg-status-warning-soft text-status-warning-text';
  return 'border border-ui-border bg-ui-surface-strong text-ui-text-muted';
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
        memory: typeof point.memoryBytes === 'number' && Number.isFinite(point.memoryBytes)
          ? point.memoryBytes / (1024 ** 3)
          : null
      };
    })
    .filter((point): point is MetricTimelinePoint => point !== null);
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  cluster,
  issueSummary,
  onOpenCopilot
}) => {
  const { t } = useTranslation();
  const podCount = getPodCount(cluster);
  const telemetryFreshness = getTelemetryFreshness(cluster);
  const telemetryLabel = getTelemetryFreshnessLabel(telemetryFreshness);
  const [metricHistory, setMetricHistory] = useState<ClusterMetricHistoryPoint[]>(cluster.metricHistory || []);
  const [metricHistoryStatus, setMetricHistoryStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const persistedMetricTimeline = useMemo(() => getPersistedMetricTimeline(metricHistory), [metricHistory]);

  const cpuSeries = useMemo(
    () =>
      persistedMetricTimeline
        .filter((point): point is MetricTimelinePoint & { cpu: number } => point.cpu !== null)
        .map((point) => ({ label: formatTime(point.timestamp), value: point.cpu })),
    [persistedMetricTimeline]
  );
  const memorySeries = useMemo(
    () =>
      persistedMetricTimeline
        .filter((point): point is MetricTimelinePoint & { memory: number } => point.memory !== null)
        .map((point) => ({ label: formatTime(point.timestamp), value: point.memory })),
    [persistedMetricTimeline]
  );

  const [clusterIssues, setClusterIssues] = useState<ControlPlaneIssueItem[] | null>(null);
  const [issueLoadStatus, setIssueLoadStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
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
    void controlPlaneApi.getClusterMetricsHistory(cluster.workspaceId, cluster.id, { window: '6h', limit: 48 })
      .then((points) => {
        if (!isCurrent) return;
        setMetricHistory(points);
        setMetricHistoryStatus('ready');
      })
      .catch((error) => {
        console.error('Failed loading cluster metric history', error);
        if (!isCurrent) return;
        setMetricHistory([]);
        setMetricHistoryStatus('error');
      });

    return () => {
      isCurrent = false;
    };
  }, [cluster.id, cluster.workspaceId, cluster.agentConnectionState]);

  useEffect(() => {
    let isCurrent = true;
    setClusterIssues(null);
    setIssueLoadStatus('loading');

    void controlPlaneApi.listTargetIssues(cluster.workspaceId, cluster.id, { limit: 50 })
      .then((page) => {
        if (!isCurrent) return;
        setClusterIssues(page.items);
        setIssueLoadStatus('ready');
      })
      .catch((error) => {
        console.error('Failed loading cluster issues', error);
        if (!isCurrent) return;
        setClusterIssues(null);
        setIssueLoadStatus('error');
      });

    return () => {
      isCurrent = false;
    };
  }, [cluster.id, cluster.workspaceId]);

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
  const issueCount = issueSummary?.total ?? (hasIssueRows ? reportedIssues.length : 0);
  const criticalIssues = issueSummary
    ? issueSummary.critical
    : hasIssueRows
      ? reportedIssues.filter((issue) => issue.severity === 'critical').length
    : 0;
  const warningIssues = issueSummary
    ? issueSummary.warning
    : hasIssueRows
      ? reportedIssues.filter((issue) => issue.severity === 'warning').length
    : 0;
  const shouldShowIssueLoadFailure = issueLoadStatus === 'error' && (!issueSummary || issueSummary.total > 0);
  const scopedResourceCount = cluster.resourceSummary?.resourceCount ??
    cluster.workloads.length + cluster.services.length + cluster.ingresses.length + cluster.pvcs.length + cluster.nodes.length + cluster.namespaces.length;
  const openIssueTriage = (issue: ControlPlaneIssueItem) => {
    const prompt = `Triage "${issue.title}" on ${cluster.name}. Severity: ${issue.severity}. Status: ${issue.status}. Scope: ${issue.scopeName || issue.namespace || t('clusterOverview.clusterWide')}. Issue summary: ${issue.summary}`;
    onOpenCopilot?.(prompt);
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="type-route-title">{t('clusterOverview.title')}</h1>
          <p className="type-body mt-2">{t('clusterOverview.latestTelemetryFor', { name: cluster.name })}</p>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center lg:w-auto lg:max-w-2xl lg:justify-end">
          <div className="flex min-h-11 w-fit items-center gap-2 rounded-md border border-ui-border bg-ui-surface px-4 py-2 shadow-sm">
            <div className={`h-2 w-2 rounded-full ${telemetryFreshness === 'current' ? 'bg-status-success' : telemetryFreshness === 'stale' ? 'bg-status-warning' : 'bg-status-danger'}`} />
            <span className="type-label">{telemetryLabel} · {formatLastUpdated(cluster.lastUpdate)}</span>
          </div>
        </div>
      </header>

      <section className="mb-10 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
        <div className="flex flex-col gap-6 border-b border-ui-border bg-ui-bg px-5 py-5 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-ui-border bg-ui-surface/70 text-accent-strong">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="type-row-title">{t('clusterOverview.activeIssues')}</p>
              <p className="type-caption mt-2 max-w-3xl">
                {t('clusterOverview.activeIssuesScope', { pods: podCount, resources: scopedResourceCount })}
              </p>
              <p className="type-body mt-2 max-w-3xl">
                {t('clusterOverview.activeIssuesBody', { issues: issueCount, critical: criticalIssues, warning: warningIssues })}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="type-caption rounded-full bg-ui-surface px-3 py-1">
              {t('clusterOverview.issueCount', { count: issueCount })}
            </span>
            <span className="type-caption rounded-full bg-status-danger-soft px-3 py-1 text-status-danger-text">
              {t('clusterOverview.criticalIssues', { count: criticalIssues })}
            </span>
            <span className="type-caption rounded-full bg-status-warning-soft px-3 py-1 text-status-warning-text">
              {t('clusterOverview.warningIssues', { count: warningIssues })}
            </span>
          </div>
        </div>

        {issueLoadStatus === 'loading' ? (
          <div className="flex min-h-36 flex-col items-center justify-center px-6 py-10 text-center">
            <div className="rounded-md border border-ui-border bg-ui-bg p-3 text-accent-strong">
              <Activity className="h-5 w-5 animate-pulse" />
            </div>
            <h2 className="type-row-title mt-4">{t('clusterOverview.loadingIssuesTitle')}</h2>
            <p className="type-body mt-2 max-w-xl">{t('clusterOverview.loadingIssuesBody')}</p>
          </div>
        ) : reportedIssues.length > 0 ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ui-border">
                    <th className="type-label px-5 py-3 text-left">{t('clusterOverview.issue')}</th>
                    <th className="type-label px-5 py-3 text-left">{t('clusterOverview.severity')}</th>
                    <th className="type-label px-5 py-3 text-left">{t('clusterOverview.namespace')}</th>
                    <th className="type-label px-5 py-3 text-left">{t('overview.lastSeenLabel')}</th>
                    {onOpenCopilot && <th className="type-label px-5 py-3 text-right">{t('clusterOverview.action')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {reportedIssues.map((issue) => (
                    <tr key={issue.id} className="border-b border-ui-border transition-colors last:border-b-0 hover:bg-ui-bg/70">
                      <td className="max-w-[34rem] px-5 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`type-micro-label rounded-full px-2.5 py-1 ${issueStatusTone(issue.status)}`}>
                            {t(`issues.status.${issue.status}`)}
                          </span>
                          <span className="type-caption text-ui-text-muted">
                            {t('overview.firstSeenLabel')}: {formatRelativeTime(issueFirstSeenTimestamp(issue))}
                          </span>
                        </div>
                        <h2 className="type-row-title mt-2">{issue.title}</h2>
                        <p className="type-body mt-1">{issue.reason || issue.summary}</p>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <span className={`type-micro-label rounded-full px-2.5 py-1 ${getSeverityTone(issue.severity)}`}>
                          {t(`issues.severity.${issue.severity}`)}
                        </span>
                      </td>
                      <td className="type-caption px-5 py-4 align-top">
                        {issue.scopeName || issue.namespace || t('clusterOverview.clusterWide')}
                      </td>
                      <td className="type-caption px-5 py-4 align-top">
                        {formatRelativeTime(issueTimestamp(issue))}
                      </td>
                      {onOpenCopilot && (
                        <td className="px-5 py-4 align-top text-right">
                          <Button onClick={() => openIssueTriage(issue)} variant="primary" size="md">
                            <Terminal className="h-4 w-4" />
                            {t('clusterOverview.runTriage')}
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-ui-border md:hidden">
              {reportedIssues.map((issue) => (
                <article key={issue.id} className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`type-micro-label rounded-full px-2.5 py-1 ${getSeverityTone(issue.severity)}`}>
                      {t(`issues.severity.${issue.severity}`)}
                    </span>
                    <span className={`type-micro-label rounded-full px-2.5 py-1 ${issueStatusTone(issue.status)}`}>
                      {t(`issues.status.${issue.status}`)}
                    </span>
                    <span className="type-caption">{formatRelativeTime(issueTimestamp(issue))}</span>
                  </div>
                  <p className="type-caption mt-3 text-ui-text-muted">
                    {t('overview.firstSeenLabel')}: {formatRelativeTime(issueFirstSeenTimestamp(issue))}
                  </p>
                  <h2 className="type-row-title mt-4">{issue.title}</h2>
                  <p className="type-body mt-2">{issue.reason || issue.summary}</p>
                  {onOpenCopilot && (
                    <Button onClick={() => openIssueTriage(issue)} variant="primary" size="md" className="mt-4">
                      <Terminal className="h-4 w-4" />
                      {t('clusterOverview.runTriage')}
                    </Button>
                  )}
                </article>
              ))}
            </div>
          </>
        ) : shouldShowIssueLoadFailure ? (
          <div className="flex min-h-36 flex-col items-center justify-center px-6 py-10 text-center">
            <div className="rounded-md border border-status-warning/20 bg-status-warning-soft p-3 text-status-warning-text">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h2 className="type-row-title mt-4">{t('clusterOverview.issueLoadFailedTitle')}</h2>
            <p className="type-body mt-2 max-w-xl">{t('clusterOverview.issueLoadFailedBody')}</p>
          </div>
        ) : (
          <div className="flex min-h-36 flex-col items-center justify-center px-6 py-10 text-center">
            <div className="rounded-md border border-status-success/20 bg-status-success-soft p-3 text-status-success-text">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h2 className="type-row-title mt-4">{t('clusterOverview.noIssuesTitle')}</h2>
            <p className="type-body mt-2 max-w-xl">{t('clusterOverview.noIssuesBody')}</p>
          </div>
        )}
      </section>

      <div className="mb-12 grid w-full grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <MetricChart
          title={t('clusterOverview.cpuUsage')}
          description={t('clusterOverview.cpuDescription')}
          icon={Cpu}
          points={cpuSeries}
          unit="Core"
          type="area"
          isLoading={metricHistoryStatus === 'loading'}
          emptyTitle={t('clusterOverview.noTelemetryHistory')}
          loadingTitle={t('clusterOverview.collectingHistory')}
          emptyDescription={t('clusterOverview.trendAfterSamples')}
        />
        <MetricChart
          title={t('clusterOverview.memory')}
          description={t('clusterOverview.memoryDescription')}
          icon={Activity}
          points={memorySeries}
          unit="GiB"
          type="line"
          isLoading={metricHistoryStatus === 'loading'}
          emptyTitle={t('clusterOverview.noTelemetryHistory')}
          loadingTitle={t('clusterOverview.collectingHistory')}
          emptyDescription={t('clusterOverview.trendAfterSamples')}
        />
      </div>

    </div>
  );
};
