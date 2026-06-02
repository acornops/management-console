import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KubernetesCluster, HealthStatus, ClusterMetricHistoryPoint } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Cloud, Clock, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ICONS } from '@/constants';
import { Button } from '@/components/common/Button';
import { actionCardButtonClassName, cardClassName } from '@/components/common/Card';
import { Dialog } from '@/components/common/Dialog';
import { headerMotion } from '@/lib/motion';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import {
  formatLastUpdated,
  getAgentConnectionState,
  getEffectiveHealthStatus,
  getTelemetryFreshness,
  getTelemetryFreshnessLabel
} from '@/utils/telemetry';

interface DashboardProps {
  kubernetesClusters: KubernetesCluster[];
  onSelectKubernetesCluster: (cluster: KubernetesCluster) => void;
  onInstallAgent?: (clusterId: string) => void;
  workspaceName?: string;
  totalClusterCount?: number;
  controls?: React.ReactNode;
  onAddCluster?: () => void;
  canDeleteKubernetesCluster?: (cluster: KubernetesCluster) => boolean;
  onDeleteKubernetesCluster?: (cluster: KubernetesCluster) => Promise<void> | void;
}

interface ClusterMetricPoint {
  timestamp: number;
  cpu: number | null;
  memory: number | null;
}

function getClusterStatusLabel(cluster: KubernetesCluster, requiresAgentInstall: boolean, t: (key: string) => string): string {
  const status = getEffectiveHealthStatus(cluster);
  if (requiresAgentInstall) return t('dashboard.setupRequired');
  if (status === HealthStatus.GREEN) return t('dashboard.healthy');
  if (status === HealthStatus.YELLOW) return t('dashboard.warning');
  return t('dashboard.error');
}

function getClusterStatusClass(cluster: KubernetesCluster, requiresAgentInstall: boolean): string {
  const status = getEffectiveHealthStatus(cluster);
  if (requiresAgentInstall) {
    return 'border border-ui-border bg-ui-bg text-ui-text-muted';
  }
  if (status === HealthStatus.GREEN) return 'bg-status-success-soft text-status-success-text';
  if (status === HealthStatus.YELLOW) return 'bg-status-warning-soft text-status-warning-text';
  return 'bg-status-danger-soft text-status-danger-text';
}

function getPostureClass(criticalClusters: number, warningClusters: number): string {
  if (criticalClusters > 0) {
    return 'border-status-danger/25 bg-status-danger-soft text-status-danger-text';
  }
  if (warningClusters > 0) {
    return 'border-status-warning/25 bg-status-warning-soft text-status-warning-text';
  }
  return 'border-status-success/25 bg-status-success-soft text-status-success-text';
}

function getPostureLabel(
  hasNonGreen: boolean,
  t: (key: string) => string
): string {
  return hasNonGreen ? t('dashboard.attention') : t('dashboard.optimal');
}

function getPersistedMetricHistory(points: ClusterMetricHistoryPoint[]): ClusterMetricPoint[] {
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
    .filter((point): point is ClusterMetricPoint => point !== null);
}

function formatShortTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const ClusterResourceChart: React.FC<{ cluster: KubernetesCluster; points: ClusterMetricPoint[] }> = ({ cluster, points }) => {
  const { t } = useTranslation();
  const width = 320;
  const height = 104;
  const paddingX = 10;
  const paddingY = 12;
  const safePoints = points.slice(-12);

  if (safePoints.length < 2) {
    return (
      <div className="flex h-[154px] w-full flex-col items-center justify-center border-y border-dashed border-ui-border bg-ui-bg/60 px-5 text-center">
        <p className="type-micro-label">{safePoints.length === 0 ? t('dashboard.noTelemetry') : t('dashboard.collectingHistory')}</p>
        {safePoints.length === 1 && (
          <p className="type-caption mt-2 max-w-xs">
            {t('dashboard.collectingHistoryBody')}
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
    <div className="h-[118px] border-y border-ui-border bg-ui-bg/60 px-3 py-2.5" aria-label={t('dashboard.telemetryAria', { name: cluster.name })}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="type-micro-label inline-flex items-center gap-1 text-accent-strong">
            <span className="h-2 w-2 rounded-full bg-accent" />
            CPU {latest.cpu === null ? '-' : `${latest.cpu.toFixed(2)} Core`}
          </span>
          <span className="type-micro-label inline-flex items-center gap-1 text-metric-blue">
            <span className="h-2 w-2 rounded-full bg-metric-blue" />
            Memory {latest.memory === null ? '-' : `${latest.memory.toFixed(2)} GiB`}
          </span>
        </div>
        <span className="type-micro-label">{t('dashboard.history')}</span>
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
          {formatShortTime(first.timestamp)}
        </text>
        <text x={width - paddingX} y={height + 1} textAnchor="end" className="type-micro-label fill-ui-text-muted">
          {formatShortTime(latest.timestamp)}
        </text>
      </svg>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({
  kubernetesClusters,
  onSelectKubernetesCluster,
  onInstallAgent,
  workspaceName,
  totalClusterCount,
  controls,
  onAddCluster,
  canDeleteKubernetesCluster,
  onDeleteKubernetesCluster
}) => {
  const { t } = useTranslation();
  const hasNonGreen = kubernetesClusters.some((cluster) => getEffectiveHealthStatus(cluster) !== HealthStatus.GREEN);
  const criticalClusters = kubernetesClusters.filter((cluster) => getEffectiveHealthStatus(cluster) === HealthStatus.RED).length;
  const warningClusters = kubernetesClusters.filter((cluster) => getEffectiveHealthStatus(cluster) === HealthStatus.YELLOW).length;
  const connectedClusters = kubernetesClusters.filter((cluster) => getAgentConnectionState(cluster) === 'connected').length;
  const clusterCount = totalClusterCount ?? kubernetesClusters.length;
  const hasUnloadedClusters = clusterCount > kubernetesClusters.length;
  const [deleteTargetCluster, setDeleteTargetCluster] = useState<KubernetesCluster | null>(null);
  const [deleteClusterError, setDeleteClusterError] = useState<string | null>(null);
  const [isDeletingCluster, setIsDeletingCluster] = useState(false);
  const [deleteClusterConfirmation, setDeleteClusterConfirmation] = useState('');
  const [metricHistoryByClusterId, setMetricHistoryByClusterId] = useState<Record<string, ClusterMetricHistoryPoint[]>>({});
  const metricHistoryRequestSeqRef = useRef(0);
  const visibleMetricClusters = useMemo(
    () => kubernetesClusters.filter((cluster) => getAgentConnectionState(cluster) === 'connected').slice(0, 6),
    [kubernetesClusters]
  );

  useEffect(() => {
    const visibleClusterIds = new Set(visibleMetricClusters.map((cluster) => cluster.id));
    setMetricHistoryByClusterId((prev) => Object.fromEntries(
      Object.entries(prev).filter(([clusterId]) => visibleClusterIds.has(clusterId))
    ));

    if (visibleMetricClusters.length === 0) {
      return undefined;
    }

    let isCurrent = true;
    const requestId = ++metricHistoryRequestSeqRef.current;
    const clusterIdsByWorkspace = new Map<string, string[]>();
    for (const cluster of visibleMetricClusters) {
      clusterIdsByWorkspace.set(cluster.workspaceId, [
        ...(clusterIdsByWorkspace.get(cluster.workspaceId) || []),
        cluster.id
      ]);
    }

    void Promise.all(
      Array.from(clusterIdsByWorkspace.entries()).map(async ([workspaceId, clusterIds]) => {
        try {
          return await controlPlaneApi.getWorkspaceClusterMetricsHistory(workspaceId, clusterIds, { window: '6h', limit: 48 });
        } catch (error) {
          console.error('Failed loading dashboard metric history', error);
          return null;
        }
      })
    ).then((results) => {
      if (!isCurrent || requestId !== metricHistoryRequestSeqRef.current) {
        return;
      }
      const nextHistory = Object.assign({}, ...results.filter((result): result is Record<string, ClusterMetricHistoryPoint[]> => result !== null));
      setMetricHistoryByClusterId((prev) => {
        const visibleOnly = Object.fromEntries(
          Object.entries(prev).filter(([clusterId]) => visibleClusterIds.has(clusterId))
        );
        return { ...visibleOnly, ...nextHistory };
      });
    });

    return () => {
      isCurrent = false;
    };
  }, [visibleMetricClusters]);

  const closeDeleteClusterDialog = () => {
    setDeleteClusterConfirmation('');
    setDeleteTargetCluster(null);
  };

  const handleConfirmDeleteCluster = async () => {
    if (
      !deleteTargetCluster ||
      !onDeleteKubernetesCluster ||
      isDeletingCluster ||
      deleteClusterConfirmation !== deleteTargetCluster.name
    ) {
      return;
    }

    setIsDeletingCluster(true);
    setDeleteClusterError(null);
    try {
      await onDeleteKubernetesCluster(deleteTargetCluster);
      closeDeleteClusterDialog();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('dashboard.deleteClusterFailed');
      setDeleteClusterError(message);
    } finally {
      setIsDeletingCluster(false);
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8 flex flex-col gap-8">
      <motion.header {...headerMotion} className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="type-route-title">
            {t('dashboard.title')}
          </h1>
          <p className="type-body mt-2 max-w-md">
            {workspaceName
              ? t('dashboard.descriptionWorkspace')
              : t('dashboard.descriptionGlobal')}
          </p>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-3 lg:w-auto lg:max-w-2xl lg:flex-row lg:items-center lg:justify-end">
          {controls}
          {onAddCluster && (
            <Button onClick={onAddCluster} variant="secondary" size="md" className="whitespace-nowrap">
              <ICONS.Plus className="w-4 h-4" /> {t('dashboard.addCluster')}
            </Button>
          )}
        </div>
      </motion.header>
      <section className={cardClassName({ className: 'overflow-hidden' })}>
        <div
          className={`grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(26rem,0.7fr)] lg:items-center ${getPostureClass(criticalClusters, warningClusters)}`}
        >
          <div className="flex min-w-0 items-start gap-4">
            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-current/15 bg-ui-surface/70">
              <Activity className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="type-row-title">
                {t(hasUnloadedClusters ? 'dashboard.loadedStatus' : 'dashboard.globalStatus', { status: getPostureLabel(hasNonGreen, t) })}
              </p>
              <p className="mt-1 text-sm leading-6 text-ui-text-muted">
                {criticalClusters + warningClusters > 0
                  ? t('dashboard.attentionSummary', { count: criticalClusters + warningClusters })
                  : t('dashboard.activeSummary', { connected: connectedClusters, total: kubernetesClusters.length })}
              </p>
            </div>
          </div>
          <dl className="grid overflow-hidden rounded-md border border-current/10 bg-ui-surface/70 sm:grid-cols-3 lg:min-w-[26rem]">
            <div className="border-b border-ui-border/70 px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r">
              <dt className="type-caption">{t('dashboard.clusters')}</dt>
              <dd className="type-data mt-1">{clusterCount}</dd>
            </div>
            <div className="border-b border-ui-border/70 px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r">
              <dt className="type-caption">{t('dashboard.attention')}</dt>
              <dd className={`type-data mt-1 ${criticalClusters > 0 ? 'text-status-danger-text' : warningClusters > 0 ? 'text-status-warning-text' : 'text-status-success-text'}`}>
                {criticalClusters + warningClusters}
              </dd>
            </div>
            <div className="px-4 py-3">
              <dt className="type-caption">{t('dashboard.active')}</dt>
              <dd className="type-data mt-1 text-metric-blue">{connectedClusters}/{kubernetesClusters.length}</dd>
            </div>
          </dl>
        </div>
      </section>

      {kubernetesClusters.length > 0 ? (
        <section data-cluster-card-grid="true" className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {kubernetesClusters.map((cluster) => {
            const agentState = getAgentConnectionState(cluster);
            const requiresAgentInstall = agentState === 'not_installed';
            const agentConnected = agentState === 'connected';
            const canDeleteCluster = Boolean(onDeleteKubernetesCluster && canDeleteKubernetesCluster?.(cluster));
            const lastUpdatedLabel = formatLastUpdated(cluster.lastUpdate);
            const telemetryFreshness = getTelemetryFreshness(cluster);
            const telemetryLabel = getTelemetryFreshnessLabel(telemetryFreshness);
            const chartPoints = getPersistedMetricHistory(metricHistoryByClusterId[cluster.id] ?? cluster.metricHistory ?? []);
            const clusterSummary = (
              <>
                <div className="min-w-0 text-left">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-ui-border bg-ui-bg">
                      <Cloud className="h-5 w-5 text-accent-strong" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2 pr-10">
                        <h3 className="type-panel-title truncate" title={cluster.name}>{cluster.name}</h3>
                        <span className={`type-micro-label shrink-0 rounded-full px-2 py-0.5 ${getClusterStatusClass(cluster, requiresAgentInstall)}`}>
                          {getClusterStatusLabel(cluster, requiresAgentInstall, t)}
                        </span>
                      </div>
                      <div className="type-caption mt-1.5 flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {requiresAgentInstall ? t('dashboard.awaitingAgent') : t('dashboard.telemetryUpdated', { telemetryLabel, lastUpdatedLabel })}
                        </span>
                      </div>
                      <p className="mt-1 type-caption">
                        {cluster.resourceSummary?.nodeCount ?? cluster.nodes.length} {t('dashboard.nodes')} · {cluster.nodes[0]?.version || t('common.unknown')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="w-full">
                  {agentConnected && <ClusterResourceChart cluster={cluster} points={chartPoints} />}
                  {requiresAgentInstall && (
                    <div className="flex min-h-[118px] flex-col justify-center gap-3 border-y border-ui-border bg-ui-bg/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="type-caption">{t('dashboard.installAgentMessage')}</p>
                      <Button
                        data-cluster-setup-action="install"
                        type="button"
                        onClick={() => onInstallAgent?.(cluster.id)}
                        disabled={!onInstallAgent}
                        variant="accent"
                        size="sm"
                        className="pointer-events-auto w-fit rounded-md px-2.5 py-1.5 font-semibold"
                      >
                        <ICONS.Wrench className="h-3.5 w-3.5" />
                        {t('dashboard.installAgent')}
                      </Button>
                    </div>
                  )}
                  {agentState === 'disconnected' && (
                    <div className="type-caption flex min-h-[118px] items-center border-y border-status-warning/25 bg-status-warning-soft px-4 py-3 text-status-warning-text">
                      {t('dashboard.agentOffline')}
                    </div>
                  )}
                </div>
              </>
            );

            return (
              <article
                key={cluster.id}
                data-cluster-card="true"
                className={cardClassName({
                  interactive: !requiresAgentInstall,
                  className: 'group relative flex min-w-0 flex-col overflow-hidden'
                })}
              >
                {!requiresAgentInstall && (
                  <button
                    data-cluster-row-action="open-diagnostics"
                    type="button"
                    onClick={() => onSelectKubernetesCluster(cluster)}
                    className="absolute inset-0 z-0 cursor-pointer rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/30"
                    aria-label={t('dashboard.openDiagnosticsFor', { name: cluster.name })}
                  />
                )}

                {canDeleteCluster && (
                  <div className="absolute right-3 top-3 z-20 pointer-events-auto">
                    <button
                      data-cluster-card-action="delete"
                      type="button"
                      onClick={() => {
                        setDeleteClusterConfirmation('');
                        setDeleteClusterError(null);
                        setDeleteTargetCluster(cluster);
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-status-danger/25 bg-ui-surface/95 text-status-danger-text shadow-sm transition-colors hover:bg-status-danger-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                      aria-label={`${t('dashboard.delete')} ${cluster.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <div className="relative z-10 flex min-h-full flex-col pointer-events-none">
                  <div className="grid flex-1 gap-4 px-4 pb-6 pt-4 sm:px-5 sm:pb-7">
                    {clusterSummary}
                  </div>
                </div>
              </article>
            );
          })}
          {onAddCluster && (
            <button
              data-cluster-add-card="true"
              type="button"
              onClick={onAddCluster}
              className={actionCardButtonClassName({ className: 'min-h-[17rem] flex-col' })}
            >
              <ICONS.Plus className="h-4 w-4" />
              {t('dashboard.addCluster')}
            </button>
          )}
        </section>
      ) : (
        <section className={cardClassName({ className: 'flex flex-col items-center justify-center px-6 py-12 text-center' })}>
          <div className="mb-4 rounded-lg border border-ui-border bg-ui-bg p-4 text-ui-text-muted">
            <ICONS.Server className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-ui-text">{t('dashboard.noClusters')}</h3>
          <p className="mt-2 max-w-sm text-sm text-ui-text-muted">{t('dashboard.noClustersBody')}</p>
          {onAddCluster && (
            <Button onClick={onAddCluster} variant="accent" size="md" className="mt-6">
              <ICONS.Plus className="w-4 h-4" /> {t('dashboard.addFirstCluster')}
            </Button>
          )}
        </section>
      )}

      <AnimatePresence>
      {deleteTargetCluster && (
        <Dialog
          titleId="delete-cluster-title"
          closeDisabled={isDeletingCluster}
          className="w-full max-w-lg overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
          onClose={closeDeleteClusterDialog}
        >
            <div className="flex items-center justify-between border-b border-ui-border bg-ui-bg px-7 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-status-danger-soft text-status-danger-text">
                  <Trash2 className="h-4 w-4" />
                </span>
                <div>
                  <h3 id="delete-cluster-title" className="type-row-title text-ui-text">{t('dashboard.deleteCluster')}</h3>
                  <p className="mt-0.5 text-[11px] font-semibold text-ui-text-muted">{t('dashboard.deleteClusterSubtitle')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDeleteClusterDialog}
                disabled={isDeletingCluster}
                className="rounded-lg p-1.5 text-ui-text-muted transition-colors hover:bg-ui-surface hover:text-accent-strong disabled:opacity-50"
                aria-label={t('dashboard.closeDeleteCluster')}
              >
                <ICONS.X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 px-7 py-6">
              <p className="text-sm leading-6 text-ui-text-muted">
                {t('dashboard.deleteClusterBody', { name: deleteTargetCluster.name })}
              </p>
              <p className="type-caption rounded-lg border border-status-warning/25 bg-status-warning-soft px-4 py-3 text-status-warning-text">
                {t('dashboard.deleteClusterAgentWarning')}
              </p>
              <div>
                <label
                  htmlFor="delete-cluster-confirmation-input"
                  className="mb-1.5 block px-1 text-xs font-bold text-ui-text-muted"
                >
                  {t('dashboard.deleteClusterConfirmationLabel', { name: deleteTargetCluster.name })}
                </label>
                <input
                  id="delete-cluster-confirmation-input"
                  value={deleteClusterConfirmation}
                  onChange={(event) => setDeleteClusterConfirmation(event.target.value)}
                  disabled={isDeletingCluster}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-lg border border-ui-border bg-ui-bg px-4 py-3.5 text-sm text-ui-text outline-none transition focus:ring-2 focus:ring-status-danger/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              {deleteClusterError && (
                <div className="type-caption rounded-lg border border-status-danger/25 bg-status-danger-soft px-3 py-2 text-status-danger-text">
                  {deleteClusterError}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-ui-border bg-ui-bg px-7 py-5">
              <button
                type="button"
                onClick={closeDeleteClusterDialog}
                disabled={isDeletingCluster}
                className="rounded-lg border border-ui-border bg-ui-surface px-4 py-2 type-row-title text-ui-text-muted transition-all hover:bg-ui-bg disabled:opacity-50"
              >
                {t('app.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDeleteCluster()}
                disabled={isDeletingCluster || deleteClusterConfirmation !== deleteTargetCluster.name}
                className="rounded-lg bg-status-danger px-4 py-2 type-row-title text-[oklch(0.99_0.004_86)] transition-all hover:bg-status-danger-text disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeletingCluster ? t('dashboard.deleting') : t('dashboard.delete')}
              </button>
            </div>
        </Dialog>
      )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
