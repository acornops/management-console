import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KubernetesCluster, HealthStatus, ClusterMetricHistoryPoint } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, MoreHorizontal, Settings, Trash2 } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { ICONS } from '@/constants';
import { Button } from '@/components/common/Button';
import { actionCardButtonClassName, cardClassName } from '@/components/common/Card';
import { Dialog } from '@/components/common/Dialog';
import { ClusterResourceChart, type ClusterMetricPoint } from '@/components/dashboard/ClusterResourceChart';
import { PendingClusterSetup } from '@/components/dashboard/PendingClusterSetup';
import { headerMotion } from '@/lib/motion';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import {
  getAgentConnectionState,
  getEffectiveHealthStatus
} from '@/utils/telemetry';

interface DashboardProps {
  kubernetesClusters: KubernetesCluster[];
  onSelectKubernetesCluster: (cluster: KubernetesCluster) => void;
  onInstallAgent?: (clusterId: string) => void;
  workspaceName?: string;
  totalClusterCount?: number;
  controls?: React.ReactNode;
  onAddCluster?: () => void;
  onOpenClusterSettings?: (cluster: KubernetesCluster) => void;
  canDeleteKubernetesCluster?: (cluster: KubernetesCluster) => boolean;
  onDeleteKubernetesCluster?: (cluster: KubernetesCluster) => Promise<void> | void;
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

const Dashboard: React.FC<DashboardProps> = ({
  kubernetesClusters,
  onSelectKubernetesCluster,
  onInstallAgent,
  workspaceName,
  totalClusterCount,
  controls,
  onAddCluster,
  onOpenClusterSettings,
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
  const [openClusterActionMenuId, setOpenClusterActionMenuId] = useState<string | null>(null);
  const [metricHistoryByClusterId, setMetricHistoryByClusterId] = useState<Record<string, ClusterMetricHistoryPoint[]>>({});
  const metricHistoryRequestSeqRef = useRef(0);
  const visibleMetricClusters = useMemo(
    () => kubernetesClusters.filter((cluster) => getAgentConnectionState(cluster) === 'connected').slice(0, 6),
    [kubernetesClusters]
  );

  useEffect(() => {
    if (!openClusterActionMenuId) return undefined;

    const closeMenu = () => setOpenClusterActionMenuId(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };

    window.addEventListener('click', closeMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openClusterActionMenuId]);

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
    setDeleteClusterError(null);
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
            const hasClusterMenu = Boolean(onOpenClusterSettings || canDeleteCluster);
            const chartPoints = getPersistedMetricHistory(metricHistoryByClusterId[cluster.id] ?? cluster.metricHistory ?? []);
            const clusterSummary = (
              <>
                <div className="min-w-0 text-left">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-ui-border bg-ui-bg">
                      <ICONS.Layers className="h-5 w-5 text-accent-strong" />
                    </div>
                    <div className="min-w-0 flex-1 pr-14">
                      <div className="flex min-w-0 items-center gap-2">
                        <h3 className="type-panel-title min-w-0 flex-1 truncate" title={cluster.name}>{cluster.name}</h3>
                        <span className={`type-micro-label shrink-0 rounded-full px-1.5 py-px text-[0.625rem] leading-3 ${getClusterStatusClass(cluster, requiresAgentInstall)}`}>
                          {getClusterStatusLabel(cluster, requiresAgentInstall, t)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {requiresAgentInstall && <PendingClusterSetup clusterId={cluster.id} onInstallAgent={onInstallAgent} />}

                {(agentConnected || agentState === 'disconnected') && (
                  <div className="flex min-h-0 flex-1 flex-col">
                    {agentConnected && <ClusterResourceChart cluster={cluster} points={chartPoints} />}
                    {agentState === 'disconnected' && (
                      <div className="type-caption flex min-h-[118px] items-center border-y border-status-warning/25 bg-status-warning-soft px-4 py-3 text-status-warning-text">
                        {t('dashboard.agentOffline')}
                      </div>
                    )}
                  </div>
                )}
              </>
            );

            return (
              <article
                key={cluster.id}
                data-cluster-card="true"
                className={cardClassName({
                  interactive: !requiresAgentInstall,
                  className: 'group relative flex h-[20rem] min-w-0 flex-col overflow-hidden'
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

                {hasClusterMenu && (
                  <div className="absolute right-3 top-3 z-20 pointer-events-auto">
                    <button
                      data-cluster-overflow-action="toggle"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenClusterActionMenuId((current) => current === cluster.id ? null : cluster.id);
                      }}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-transparent bg-transparent text-ui-text-muted transition-colors hover:border-ui-border hover:bg-ui-surface hover:text-ui-text active:bg-ui-bg/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                      aria-haspopup="menu"
                      aria-expanded={openClusterActionMenuId === cluster.id}
                      aria-label={t('dashboard.clusterActionsFor', { name: cluster.name })}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {openClusterActionMenuId === cluster.id && (
                      <div
                        role="menu"
                        onClick={(event) => event.stopPropagation()}
                        className="absolute right-0 top-10 w-52 overflow-hidden rounded-lg border border-ui-border bg-ui-surface p-1 text-sm shadow-xl"
                      >
                        {onOpenClusterSettings && (
                          <button
                            data-cluster-overflow-action="settings"
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenClusterActionMenuId(null);
                              onOpenClusterSettings(cluster);
                            }}
                            className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-ui-text transition-colors hover:bg-ui-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
                          >
                            <Settings className="h-4 w-4 text-ui-text-muted" />
                            {t('dashboard.clusterSettings')}
                          </button>
                        )}
                        {canDeleteCluster && (
                          <button
                            data-cluster-overflow-action="delete"
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenClusterActionMenuId(null);
                              setDeleteClusterConfirmation('');
                              setDeleteClusterError(null);
                              setDeleteTargetCluster(cluster);
                            }}
                            className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-status-danger-text transition-colors hover:bg-status-danger-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-status-danger/25"
                          >
                            <Trash2 className="h-4 w-4" />
                            {t('dashboard.deleteCluster')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="relative z-10 flex flex-1 flex-col pointer-events-none">
                  <div className="flex min-h-0 flex-1 flex-col gap-5 px-4 pb-6 pt-4 sm:px-5 sm:pb-7">
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
              className={actionCardButtonClassName({ className: 'h-[20rem] flex-col' })}
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
                  <Trans
                    i18nKey="dashboard.deleteClusterConfirmationLabel"
                    values={{ name: deleteTargetCluster.name }}
                    components={{
                      name: <span className="font-extrabold text-status-danger-text" />
                    }}
                  />
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
