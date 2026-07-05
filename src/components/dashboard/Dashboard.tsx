import React, { useEffect, useState } from 'react';
import { HealthStatus, KubernetesCluster } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { ICONS } from '@/constants';
import { Button } from '@/components/common/Button';
import { cardClassName } from '@/components/common/Card';
import { Dialog } from '@/components/common/Dialog';
import { formInputClassName } from '@/components/common/formControlStyles';
import { ClusterCatalog } from '@/components/dashboard/ClusterCatalog';
import { headerMotion } from '@/lib/motion';
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
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8 xl:h-full xl:overflow-hidden">
      <motion.header {...headerMotion} className="mb-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
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
          {onAddCluster && (
            <Button onClick={onAddCluster} variant="secondary" size="md" className="whitespace-nowrap">
              <ICONS.Plus className="w-4 h-4" /> {t('dashboard.addCluster')}
            </Button>
          )}
        </div>
      </motion.header>

      <section data-cluster-inventory-summary="true" className="overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
        <div className="grid grid-cols-1 divide-y divide-ui-border md:grid-cols-[minmax(15rem,1.35fr)_repeat(4,minmax(7rem,1fr))] md:divide-x md:divide-y-0">
          <div className="px-5 py-3.5">
            <h2 className="type-row-title">{t('dashboard.clusterInventoryTitle')}</h2>
            <p className="type-caption mt-1 min-h-10 text-ui-text-muted">
              {t('dashboard.clusterInventoryBody')}
            </p>
          </div>
          <div className="px-5 py-3.5">
            <p className="type-caption text-ui-text-muted">{t('dashboard.clusters')}</p>
            <p className="mt-0.5 text-xl font-semibold tracking-tight text-ui-text">{clusterCount}</p>
          </div>
          <div className="px-5 py-3.5">
            <p className="type-caption text-ui-text-muted">{t('dashboard.attention')}</p>
            <p className={`mt-0.5 text-xl font-semibold tracking-tight ${criticalClusters > 0 ? 'text-status-danger-text' : warningClusters > 0 ? 'text-status-warning-text' : 'text-ui-text'}`}>
              {criticalClusters + warningClusters}
            </p>
          </div>
          <div className="px-5 py-3.5">
            <p className="type-caption text-ui-text-muted">{t('dashboard.setupRequired')}</p>
            <p className="mt-0.5 text-xl font-semibold tracking-tight text-ui-text">{setupRequiredClusters}</p>
          </div>
          <div className="px-5 py-3.5">
            <p className="type-caption text-ui-text-muted">{t('dashboard.active')}</p>
            <p className="mt-0.5 text-xl font-semibold tracking-tight text-ui-text">{connectedClusters}/{clusterCount}</p>
          </div>
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
