import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Braces, Server, Terminal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { PageSearchInput } from '@/components/common/PageSearchInput';
import { Select, SelectOption } from '@/components/common/Select';
import { ResourceMetaPair } from '@/features/kubernetes-cluster-detail/components/workloads/workloadExplorerParts';
import { headerMotion } from '@/lib/motion';
import { HealthStatus, KubernetesCluster, Workspace } from '@/types';
import { InvestigationQueueItem } from '@/lib/workspaceInvestigationQueue';
import { controlPlaneApi } from '@/services/controlPlaneApi';

interface WorkspaceInvestigationsPageProps {
  workspace: Workspace;
  kubernetesClusters: KubernetesCluster[];
  canManageClusters: boolean;
  onConnectCluster: () => void;
  onOpenClusterChat: (cluster: KubernetesCluster, prompt?: string) => void;
  onSelectCluster?: (cluster: KubernetesCluster) => void;
}

function formatRelativeTime(timestamp: number, now = Date.now()): string {
  const diffMinutes = Math.max(1, Math.floor((now - timestamp) / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getSeverityTone(severity: InvestigationQueueItem['severity']): string {
  if (severity === 'critical') return 'bg-status-danger-soft text-status-danger-text';
  if (severity === 'warning') return 'bg-status-warning-soft text-status-warning-text';
  return 'bg-ui-bg text-ui-text-muted';
}

function buildGroupedEvidenceSummary(item: InvestigationQueueItem): string {
  if (item.relatedAlerts.length <= 1) return '';
  const evidence = item.relatedAlerts
    .slice(0, 4)
    .map((alert) => `${alert.severity} ${alert.title}: ${alert.message}`)
    .join(' | ');
  const overflow = item.relatedAlerts.length > 4 ? ` | +${item.relatedAlerts.length - 4} more` : '';
  return ` Grouped evidence (${item.relatedAlerts.length} signals): ${evidence}${overflow}`;
}

function buildTriagePrompt(item: InvestigationQueueItem, clusterWideLabel: string): string {
  return `Triage "${item.title}" on ${item.clusterName}. Severity: ${item.severity}. Namespace: ${item.namespace || clusterWideLabel}. Finding summary: ${item.summary}${buildGroupedEvidenceSummary(item)}`;
}

function createInvestigationClusterApp(workspaceId: string, item: { clusterId: string; clusterName: string; severity: InvestigationQueueItem['severity']; timestamp: number }): KubernetesCluster {
  return {
    id: item.clusterId,
    name: item.clusterName,
    cluster: item.clusterName,
    namespace: '',
    workspaceId,
    agentConnectionState: 'connected',
    owners: [],
    gitlabPipelines: [],
    status: item.severity === 'critical' ? HealthStatus.RED : item.severity === 'warning' ? HealthStatus.YELLOW : HealthStatus.GREEN,
    podStats: { running: 0, failed: 0, pending: 0 },
    metrics: { cpu: '--', memory: '--' },
    resourceSummary: {
      resourceCount: 0,
      findingCount: 1,
      criticalFindingCount: item.severity === 'critical' ? 1 : 0,
      namespaceCount: 0,
      nodeCount: 0
    },
    lastUpdate: new Date(item.timestamp).toISOString(),
    mcpTools: [],
    chatSessions: [],
    workloads: [],
    nodes: [],
    namespaces: [],
    services: [],
    ingresses: [],
    pvcs: [],
    alerts: []
  };
}

export const WorkspaceInvestigationsPage: React.FC<WorkspaceInvestigationsPageProps> = ({
  workspace,
  kubernetesClusters,
  canManageClusters,
  onConnectCluster,
  onOpenClusterChat,
  onSelectCluster
}) => {
  const { t } = useTranslation();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const requestSeqRef = useRef(0);
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState<'all' | InvestigationQueueItem['severity']>('all');
  const [investigations, setInvestigations] = useState<InvestigationQueueItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const kubernetesClusterById = useMemo(() => new Map(kubernetesClusters.map((app) => [app.id, app])), [kubernetesClusters]);
  const hasClusters = (workspace.clusterCount ?? kubernetesClusters.length) > 0;
  const severityOptions: Array<SelectOption<typeof severity>> = [
    { value: 'all', label: t('investigations.allSeverities') },
    { value: 'critical', label: t('investigations.severity.critical') },
    { value: 'warning', label: t('investigations.severity.warning') },
    { value: 'info', label: t('investigations.severity.info') }
  ];

  const loadInvestigations = useCallback(async (mode: 'replace' | 'append', cursor?: string) => {
    const requestId = ++requestSeqRef.current;
    if (mode === 'replace') setIsLoadingInitial(true);
    else setIsLoadingMore(true);
    setLoadError(null);
    try {
      const page = await controlPlaneApi.listWorkspaceInvestigations(workspace.id, {
        limit: 50,
        cursor,
        q: query,
        severity: severity === 'all' ? undefined : severity
      });
      if (requestId !== requestSeqRef.current) return;
      const mapped = page.items
        .map((item): InvestigationQueueItem | null => {
          const cluster = kubernetesClusterById.get(item.clusterId) || createInvestigationClusterApp(workspace.id, {
            clusterId: item.clusterId,
            clusterName: item.clusterName,
            severity: item.severity,
            timestamp: item.timestamp
          });
          if (!cluster) return null;
          const alert = {
            id: item.id,
            severity: item.severity,
            title: item.title,
            message: item.message,
            timestamp: item.timestamp,
            namespace: item.namespace,
            objectKind: item.objectKind,
            objectName: item.objectName,
            reason: item.reason,
            source: 'snapshot' as const
          };
          return {
            id: item.id,
            clusterId: item.clusterId,
            clusterName: item.clusterName,
            namespace: item.namespace,
            severity: item.severity,
            title: item.title,
            summary: item.message,
            timestamp: item.timestamp,
            cluster,
            alert,
            relatedAlerts: [alert]
          };
        })
        .filter((item): item is InvestigationQueueItem => item !== null);
      setInvestigations((current) => mode === 'append' ? [...current, ...mapped] : mapped);
      setNextCursor(page.nextCursor);
    } catch (error) {
      console.error('Failed loading investigations', error);
      if (requestId === requestSeqRef.current) {
        setLoadError(error instanceof Error ? error.message : t('investigations.loadFailed'));
        if (mode === 'replace') setInvestigations([]);
      }
    } finally {
      if (requestId === requestSeqRef.current) {
        setIsLoadingInitial(false);
        setIsLoadingMore(false);
      }
    }
  }, [kubernetesClusterById, query, severity, t, workspace.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadInvestigations('replace');
    }, 300);
    return () => window.clearTimeout(timer);
  }, [loadInvestigations]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !nextCursor) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && !isLoadingInitial && !isLoadingMore && nextCursor) {
        void loadInvestigations('append', nextCursor);
      }
    }, { rootMargin: '320px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [isLoadingInitial, isLoadingMore, loadInvestigations, nextCursor]);

  const topInvestigation = investigations[0];
  const remainingInvestigations = investigations.slice(1);
  const selectedSeverityLabel = severity === 'all' ? t('investigations.allSeverities') : t(`investigations.severity.${severity}`);
  const investigationMetrics = [
    {
      label: t('investigations.queuePosture'),
      value: isLoadingInitial
        ? t('common.loading')
        : topInvestigation
          ? t('investigations.queuePostureActive')
          : t('investigations.queuePostureClear'),
      body: t('investigations.queuePostureBody')
    },
    {
      label: t('investigations.filterScope'),
      value: query ? t('investigations.searchFiltered') : selectedSeverityLabel,
      body: t('investigations.filterScopeBody')
    },
    {
      label: t('investigations.nextStep'),
      value: topInvestigation ? t('investigations.runTriagePrimary') : t('investigations.monitorQueue'),
      body: t('investigations.nextStepBody')
    }
  ];
  const viewCluster = (item: InvestigationQueueItem) => {
    if (onSelectCluster) {
      onSelectCluster(item.cluster);
      return;
    }
    onOpenClusterChat(item.cluster);
  };
  const runTriage = (item: InvestigationQueueItem) => {
    onOpenClusterChat(item.cluster, buildTriagePrompt(item, t('overview.clusterWide')));
  };

  return (
    <div className="min-h-0 w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
      <motion.header {...headerMotion} className="mb-8 flex min-w-0 max-w-full flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-full">
          <h1 className="type-route-title">{t('investigations.title')}</h1>
          <p className="type-body mt-2 max-w-2xl break-words">
            {t('investigations.summaryFor', { name: workspace.name })}
          </p>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-3 lg:w-auto lg:max-w-2xl lg:flex-row lg:items-center lg:justify-end">
          <PageSearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('investigations.searchPlaceholder')}
            className="min-w-0 max-w-full"
          />
          <Select<typeof severity>
            value={severity}
            options={severityOptions}
            onChange={setSeverity}
            className="w-full min-w-0 sm:min-w-44 lg:w-44"
            ariaLabel={t('investigations.severityFilterAria')}
          />
        </div>
      </motion.header>

      {topInvestigation && (
        <section data-mobile-triage-actions="true" className="mb-5 md:hidden">
          <div className="min-w-0 max-w-full overflow-hidden rounded-lg border border-ui-border bg-ui-surface px-4 py-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="type-micro-label text-ui-text-muted">
                {t('investigations.activeTriageTitle')}
              </span>
              <span className={`type-micro-label rounded-full px-2.5 py-1 ${getSeverityTone(topInvestigation.severity)}`}>
                {t(`investigations.severity.${topInvestigation.severity}`)}
              </span>
            </div>
            <h2 className="type-row-title mt-3 break-words">{topInvestigation.title}</h2>
            <p className="type-caption mt-1 min-w-0 max-w-full break-words">
              {topInvestigation.clusterName} · {topInvestigation.namespace || t('overview.clusterWide')}
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2">
              <Button onClick={() => runTriage(topInvestigation)} variant="accent" size="md" className="w-full">
                <Terminal className="h-4 w-4" />
                {t('investigations.runTriagePrimary')}
              </Button>
              <Button onClick={() => viewCluster(topInvestigation)} variant="secondary" size="md" className="w-full">
                {t('investigations.viewCluster')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <p className="type-caption mt-3 break-words">{t('investigations.mobileTriageBody')}</p>
          </div>
        </section>
      )}

      {loadError && !isLoadingInitial && (
        <div className="mb-5 flex min-w-0 max-w-full flex-col gap-3 rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text sm:flex-row sm:items-center sm:justify-between">
          <p className="type-caption min-w-0 break-words text-status-danger-text">{loadError}</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full shrink-0 sm:w-auto"
            onClick={() => void loadInvestigations('replace')}
          >
            {t('investigations.retryLoad')}
          </Button>
        </div>
      )}

      {!hasClusters && investigations.length === 0 && !isLoadingInitial && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-full rounded-lg border border-dashed border-ui-border bg-ui-surface p-6 text-center sm:p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md border border-ui-border bg-ui-bg text-ui-text-muted">
            <Server className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-lg font-semibold text-ui-text">{t('investigations.noClustersTitle')}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ui-text-muted">{t('investigations.noClustersBody')}</p>
          {canManageClusters && (
            <Button onClick={onConnectCluster} variant="accent" size="lg" className="mt-8">
              <Braces className="h-4 w-4" />
              {t('app.connectClusterHelm')}
            </Button>
          )}
        </motion.div>
      )}

      {hasClusters && investigations.length === 0 && !isLoadingInitial && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-full rounded-lg border border-dashed border-ui-border bg-ui-surface p-6 text-center sm:p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md border border-status-success/20 bg-status-success-soft text-status-success-text">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-lg font-semibold text-ui-text">{t('investigations.clearTitle')}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ui-text-muted">{t('investigations.clearBody')}</p>
        </motion.div>
      )}

      {topInvestigation && (
        <section data-investigation-queue-panel="true" className="w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
          <div className="flex min-w-0 flex-col gap-4 border-b border-ui-border bg-ui-bg px-4 py-4 sm:px-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2 text-ui-text-muted">
                <AlertTriangle className="h-4 w-4 text-accent-strong" />
                <h2 className="text-sm font-semibold text-ui-text">{t('investigations.queueTitle')}</h2>
              </div>
              <p className="type-caption mt-1 max-w-2xl break-words">{t('investigations.queueBody')}</p>
            </div>
            <div className="min-w-0 xl:max-w-[34rem]">
              <div data-investigation-queue-toolbar="true" className="grid min-w-0 gap-x-4 gap-y-2 sm:grid-cols-3">
                {investigationMetrics.map((metric) => (
                  <div key={metric.label} className="min-w-0">
                    <p className="type-micro-label truncate text-ui-text-muted">{metric.label}</p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-ui-text" title={metric.value}>{metric.value}</p>
                    <p className="type-caption mt-0.5 line-clamp-2">{metric.body}</p>
                  </div>
                ))}
              </div>
              <div className="type-caption mt-3 flex min-w-0 items-center gap-2 text-ui-text-muted xl:justify-end">
                <Terminal className="h-4 w-4 text-accent-strong" />
                <span className="min-w-0 break-words">{t('investigations.queueHint')}</span>
              </div>
            </div>
          </div>

          <article className="grid min-w-0 gap-3 border-b border-ui-border px-4 py-5 sm:px-6 lg:grid-cols-[1.75rem_minmax(0,1fr)_auto] lg:items-start">
            <div className="type-caption font-semibold text-accent-strong">#1</div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="type-micro-label text-accent-strong">
                    {t('investigations.activeTriageTitle')}
                  </span>
                  <span className={`type-micro-label rounded-full px-2.5 py-1 ${getSeverityTone(topInvestigation.severity)}`}>
                    {t(`investigations.severity.${topInvestigation.severity}`)}
                  </span>
                  <span className="type-caption">{formatRelativeTime(topInvestigation.timestamp)}</span>
                  {topInvestigation.relatedAlerts.length > 1 && (
                    <ResourceMetaPair
                      label={t('investigations.signals')}
                      value={t('investigations.signalsCount', { count: topInvestigation.relatedAlerts.length })}
                    />
                  )}
                </div>
                <h2 className="type-panel-title mt-3 break-words">{topInvestigation.title}</h2>
                <p className="type-body mt-2 max-w-3xl break-words">{topInvestigation.summary}</p>
                <div className="type-caption mt-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="min-w-0 max-w-full break-words">{topInvestigation.clusterName}</span>
                  <span aria-hidden="true" className="text-ui-text-muted/70">·</span>
                  <span className="min-w-0 max-w-full break-words">{topInvestigation.namespace || t('overview.clusterWide')}</span>
                </div>
              </div>
              <div className="flex flex-col gap-3 lg:self-start lg:items-end">
                <div className="grid min-w-0 grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center lg:justify-end max-md:hidden">
                  <Button onClick={() => runTriage(topInvestigation)} variant="accent" size="md" className="w-full sm:w-auto">
                    <Terminal className="h-4 w-4" />
                    {t('investigations.runTriagePrimary')}
                  </Button>
                  <Button onClick={() => viewCluster(topInvestigation)} variant="secondary" size="md" className="w-full sm:w-auto">
                    {t('investigations.viewCluster')}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                <p className="type-caption max-w-sm break-words xl:text-right">
                  {t('investigations.activeTriageBody')}
                </p>
              </div>
          </article>

          {remainingInvestigations.length === 0 ? (
            <div className="type-body px-4 py-5 sm:px-6">
              {t('investigations.noRemainingFindings')}
            </div>
          ) : (
            <div className="divide-y divide-ui-border">
              {remainingInvestigations.map((item, index) => (
                <article
                  key={item.id}
                  className="grid min-w-0 gap-3 px-4 py-4 transition-colors hover:bg-ui-bg/70 sm:px-6 lg:grid-cols-[1.75rem_minmax(0,1fr)_auto] lg:items-start"
                >
                  <div className="type-caption">#{index + 2}</div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`type-micro-label rounded-full px-2.5 py-1 ${getSeverityTone(item.severity)}`}>
                        {t(`investigations.severity.${item.severity}`)}
                      </span>
                      <span className="type-caption min-w-0 max-w-full break-words">{item.clusterName}</span>
                      <span aria-hidden="true" className="type-caption text-ui-text-muted/70">·</span>
                      <span className="type-caption min-w-0 max-w-full break-words">{item.namespace || t('overview.clusterWide')}</span>
                      <span className="type-caption">{formatRelativeTime(item.timestamp)}</span>
                      {item.relatedAlerts.length > 1 && (
                        <ResourceMetaPair
                          label={t('investigations.signals')}
                          value={t('investigations.signalsCount', { count: item.relatedAlerts.length })}
                        />
                      )}
                    </div>
                    <h3 className="type-row-title mt-3 break-words">{item.title}</h3>
                    <p className="type-caption mt-1 line-clamp-2 break-words">{item.summary}</p>
                  </div>
                  <div className="grid min-w-0 grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center lg:self-start lg:justify-end">
                    <Button
                      onClick={() => runTriage(item)}
                      variant="secondary"
                      size="sm"
                      className="w-full whitespace-nowrap border-accent/35 text-accent-strong hover:border-accent/60 hover:bg-accent-soft hover:text-accent-strong sm:w-auto"
                    >
                      <Terminal className="h-4 w-4" />
                      {t('investigations.runTriage')}
                    </Button>
                    <Button onClick={() => viewCluster(item)} variant="secondary" size="sm" className="w-full whitespace-nowrap sm:w-auto">
                      {t('investigations.viewCluster')}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      <div ref={loadMoreRef} className="flex justify-center py-6">
        {nextCursor && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => void loadInvestigations('append', nextCursor)}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? t('common.loading') : t('common.loadMore')}
          </Button>
        )}
      </div>
    </div>
  );
};
