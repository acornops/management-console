import React, { useEffect, useState } from 'react';
import { HealthStatus, KubernetesCluster } from '@/types';
import { AnimatePresence } from 'framer-motion';
import { Activity, Trash2 } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { ICONS } from '@/constants';
import { Button } from '@/components/common/Button';
import { cardClassName } from '@/components/common/Card';
import { Dialog } from '@/components/common/Dialog';
import { PageHeader, PageShell } from '@/components/common/PageComposition';
import { formInputClassName } from '@/components/common/formControlStyles';
import { ClusterCatalog } from '@/components/dashboard/ClusterCatalog';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import type { ControlPlaneTargetIssueSummary } from '@/services/controlPlaneApi';
import {
  getAgentConnectionState,
  getEffectiveHealthStatus
} from '@/utils/telemetry';

interface DashboardProps {
  kubernetesClusters: KubernetesCluster[];
  summaryKubernetesClusters?: KubernetesCluster[];
  onSelectKubernetesCluster: (cluster: KubernetesCluster) => void;
  onInstallAgent?: (clusterId: string) => void;
  workspaceName?: string;
  totalClusterCount?: number;
  issueSummaryByClusterId?: Record<string, ControlPlaneTargetIssueSummary | undefined>;
  hasActiveClusterFilter?: boolean;
  controls?: React.ReactNode;
  catalogFooter?: React.ReactNode;
  selectedClusterId?: string;
  onSelectedClusterIdChange?: (clusterId: string | undefined) => void;
  onAddCluster?: () => void;
  onOpenClusterSettings?: (cluster: KubernetesCluster) => void;
  canDeleteKubernetesCluster?: (cluster: KubernetesCluster) => boolean;
  onDeleteKubernetesCluster?: (cluster: KubernetesCluster) => Promise<void> | void;
}

const deleteClusterConfirmationInputClassName = formInputClassName('px-4 focus:border-status-danger/45 focus:ring-status-danger/20');

function getPostureClass(criticalClusters: number, warningClusters: number): string {
  if (criticalClusters > 0) return 'border-status-danger/25 bg-status-danger-soft text-status-danger-text';
  if (warningClusters > 0) return 'border-status-warning/25 bg-status-warning-soft text-status-warning-text';
  return 'border-status-success/25 bg-status-success-soft text-status-success-text';
}

function getPostureLabel(hasNonGreen: boolean, t: (key: string) => string): string {
  return hasNonGreen ? t('dashboard.attention') : t('dashboard.optimal');
}

const Dashboard: React.FC<DashboardProps> = ({
  kubernetesClusters,
  summaryKubernetesClusters,
  onSelectKubernetesCluster,
  onInstallAgent,
  workspaceName,
  totalClusterCount,
  issueSummaryByClusterId = {},
  hasActiveClusterFilter = false,
  controls,
  catalogFooter,
  selectedClusterId: controlledSelectedClusterId,
  onSelectedClusterIdChange: controlledOnSelectedClusterIdChange,
  onAddCluster,
  onOpenClusterSettings,
  canDeleteKubernetesCluster,
  onDeleteKubernetesCluster
}) => {
  const { t } = useTranslation();
  const [internalSelectedClusterId, setInternalSelectedClusterId] = useState<string | undefined>();
  const [deleteTargetCluster, setDeleteTargetCluster] = useState<KubernetesCluster | null>(null);
  const [deleteClusterError, setDeleteClusterError] = useState<string | null>(null);
  const [isDeletingCluster, setIsDeletingCluster] = useState(false);
  const [deleteClusterConfirmation, setDeleteClusterConfirmation] = useState('');
  const [openClusterActionMenuId, setOpenClusterActionMenuId] = useState<string | null>(null);
  const summaryClusters = summaryKubernetesClusters ?? kubernetesClusters;
  const setupRequiredClusters = summaryClusters.filter((cluster) => getAgentConnectionState(cluster) === 'not_installed').length;
  const hasNonGreen = summaryClusters.some((cluster) => {
    const issueSummary = issueSummaryByClusterId[cluster.id];
    return Number(issueSummary?.total || 0) > 0 || getEffectiveHealthStatus(cluster) !== HealthStatus.GREEN || getAgentConnectionState(cluster) !== 'connected';
  });
  const criticalClusters = summaryClusters.filter((cluster) => {
    const agentState = getAgentConnectionState(cluster);
    const issueSummary = issueSummaryByClusterId[cluster.id];
    return agentState !== 'not_installed' && (Number(issueSummary?.critical || 0) > 0 || getEffectiveHealthStatus(cluster) === HealthStatus.RED || agentState === 'disconnected');
  }).length;
  const warningClusters = summaryClusters.filter((cluster) => {
    const agentState = getAgentConnectionState(cluster);
    const issueSummary = issueSummaryByClusterId[cluster.id];
    return agentState !== 'not_installed' && Number(issueSummary?.critical || 0) === 0 && (Number(issueSummary?.warning || 0) > 0 || getEffectiveHealthStatus(cluster) === HealthStatus.YELLOW);
  }).length;
  const connectedClusters = summaryClusters.filter((cluster) => getAgentConnectionState(cluster) === 'connected').length;
  const clusterCount = totalClusterCount ?? summaryClusters.length;
  const hasUnloadedClusters = clusterCount > summaryClusters.length;
  const selectedClusterId = controlledSelectedClusterId ?? internalSelectedClusterId;
  const setSelectedClusterId = controlledOnSelectedClusterIdChange ?? setInternalSelectedClusterId;
  const selectedCluster = kubernetesClusters.find((cluster) => cluster.id === selectedClusterId);

  useEffect(() => {
    if (kubernetesClusters.length === 0) {
      setSelectedClusterId(undefined);
      return;
    }
    if (selectedClusterId && !kubernetesClusters.some((cluster) => cluster.id === selectedClusterId)) {
      setSelectedClusterId(undefined);
    }
  }, [kubernetesClusters, selectedClusterId, setSelectedClusterId]);

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

  const closeDeleteClusterDialog = () => {
    setDeleteClusterConfirmation('');
    setDeleteClusterError(null);
    setDeleteTargetCluster(null);
  };

  const openDeleteClusterDialog = (cluster: KubernetesCluster) => {
    setOpenClusterActionMenuId(null);
    setDeleteClusterConfirmation('');
    setDeleteClusterError(null);
    setDeleteTargetCluster(cluster);
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
      const message = formatControlPlaneError(error, t('dashboard.deleteClusterFailed'), { area: 'cluster' });
      setDeleteClusterError(message);
    } finally {
      setIsDeletingCluster(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title={t('dashboard.title')}
        description={workspaceName ? t('dashboard.descriptionWorkspace') : t('dashboard.descriptionGlobal')}
        actions={<>
          {onAddCluster && (
            <Button onClick={onAddCluster} variant="primary" size="md" className="whitespace-nowrap">
              <ICONS.Plus className="w-4 h-4" /> {t('dashboard.addCluster')}
            </Button>
          )}
        </>}
      />
      <section data-cluster-inventory-summary="true" className={cardClassName({ className: 'overflow-hidden' })}>
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
                {criticalClusters + warningClusters + setupRequiredClusters > 0
                  ? t('dashboard.attentionSummary', { count: criticalClusters + warningClusters + setupRequiredClusters })
                  : t('dashboard.activeSummary', { connected: connectedClusters, total: kubernetesClusters.length })}
              </p>
            </div>
          </div>
          <dl className="grid overflow-hidden rounded-md border border-current/10 bg-ui-surface/70 sm:grid-cols-4 lg:min-w-[30rem]">
            <div className="border-b border-ui-border/70 px-4 py-3 sm:border-b-0 sm:border-r">
              <dt className="type-caption">{t('dashboard.clusters')}</dt>
              <dd className="type-data mt-1">{clusterCount}</dd>
            </div>
            <div className="border-b border-ui-border/70 px-4 py-3 sm:border-b-0 sm:border-r">
              <dt className="type-caption">{t('dashboard.attention')}</dt>
              <dd className={`type-data mt-1 ${criticalClusters > 0 ? 'text-status-danger-text' : warningClusters > 0 ? 'text-status-warning-text' : 'text-status-success-text'}`}>
                {criticalClusters + warningClusters}
              </dd>
            </div>
            <div className="border-b border-ui-border/70 px-4 py-3 sm:border-b-0 sm:border-r">
              <dt className="type-caption">{t('dashboard.setupRequired')}</dt>
              <dd className="type-data mt-1">{setupRequiredClusters}</dd>
            </div>
            <div className="px-4 py-3">
              <dt className="type-caption">{t('dashboard.active')}</dt>
              <dd className="type-data mt-1 text-metric-blue">{connectedClusters}/{clusterCount}</dd>
            </div>
          </dl>
        </div>
      </section>

      {kubernetesClusters.length > 0 || hasActiveClusterFilter ? (
        <ClusterCatalog
          kubernetesClusters={kubernetesClusters}
          clusterCount={clusterCount}
          hasActiveFilter={hasActiveClusterFilter}
          issueSummaryByClusterId={issueSummaryByClusterId}
          controls={controls}
          footer={catalogFooter}
          selectedCluster={selectedCluster}
          openClusterActionMenuId={openClusterActionMenuId}
          onSelectedClusterIdChange={setSelectedClusterId}
          onToggleClusterActionMenu={(clusterId) => setOpenClusterActionMenuId((current) => current === clusterId ? null : clusterId)}
          onOpenDelete={openDeleteClusterDialog}
          onSelectKubernetesCluster={onSelectKubernetesCluster}
          onInstallAgent={onInstallAgent}
          onOpenClusterSettings={onOpenClusterSettings}
          canDeleteKubernetesCluster={canDeleteKubernetesCluster}
          onDeleteKubernetesCluster={onDeleteKubernetesCluster}
        />
      ) : (
        <section className={cardClassName({ className: 'flex flex-col items-center justify-center px-6 py-12 text-center' })}>
          <div className="mb-4 rounded-lg border border-ui-border bg-ui-bg p-4 text-ui-text-muted">
            <ICONS.Server className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-ui-text">{t('dashboard.noClusters')}</h3>
          <p className="mt-2 max-w-sm text-sm text-ui-text-muted">{t('dashboard.noClustersBody')}</p>
          {onAddCluster && (
            <Button onClick={onAddCluster} variant="primary" size="md" className="mt-6">
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
                  className={deleteClusterConfirmationInputClassName}
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
                className="rounded-lg bg-status-danger px-4 py-2 type-row-title text-ui-bg transition-all hover:bg-status-danger-text disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeletingCluster ? t('dashboard.deleting') : t('dashboard.delete')}
              </button>
            </div>
        </Dialog>
      )}
      </AnimatePresence>
    </PageShell>
  );
};

export default Dashboard;
