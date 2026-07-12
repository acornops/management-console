import React, { useEffect, useState } from 'react';
import { KubernetesCluster } from '@/types';
import { AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
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

interface DashboardProps {
  kubernetesClusters: KubernetesCluster[];
  onSelectKubernetesCluster: (cluster: KubernetesCluster) => void;
  onInstallAgent?: (clusterId: string) => void;
  workspaceName?: string;
  totalClusterCount?: number;
  issueSummaryByClusterId?: Record<string, ControlPlaneTargetIssueSummary | undefined>;
  issueSummaryLoadStateByClusterId?: Record<string, 'loading' | 'ready' | 'error' | undefined>;
  metricLoadStateByClusterId?: Record<string, 'loading' | 'ready' | 'error' | undefined>;
  hasActiveClusterFilter?: boolean;
  isCatalogLoading?: boolean;
  catalogLoadError?: boolean;
  onRetryCatalog?: () => void;
  catalogPanelLabelledBy?: string;
  catalogTabs?: React.ReactNode;
  controls?: React.ReactNode;
  catalogFooter?: React.ReactNode;
  onAddCluster?: () => void;
  onOpenClusterSettings?: (cluster: KubernetesCluster) => void;
  canDeleteKubernetesCluster?: (cluster: KubernetesCluster) => boolean;
  onDeleteKubernetesCluster?: (cluster: KubernetesCluster) => Promise<void> | void;
}

const deleteClusterConfirmationInputClassName = formInputClassName('px-4 focus:border-status-danger/45 focus:ring-status-danger/20');

const Dashboard: React.FC<DashboardProps> = ({
  kubernetesClusters,
  onSelectKubernetesCluster,
  onInstallAgent,
  workspaceName,
  totalClusterCount,
  issueSummaryByClusterId = {},
  issueSummaryLoadStateByClusterId = {},
  metricLoadStateByClusterId = {},
  hasActiveClusterFilter = false,
  isCatalogLoading = false,
  catalogLoadError = false,
  onRetryCatalog,
  catalogPanelLabelledBy,
  catalogTabs,
  controls,
  catalogFooter,
  onAddCluster,
  onOpenClusterSettings,
  canDeleteKubernetesCluster,
  onDeleteKubernetesCluster
}) => {
  const { t } = useTranslation();
  const [deleteTargetCluster, setDeleteTargetCluster] = useState<KubernetesCluster | null>(null);
  const [deleteClusterError, setDeleteClusterError] = useState<string | null>(null);
  const [isDeletingCluster, setIsDeletingCluster] = useState(false);
  const [deleteClusterConfirmation, setDeleteClusterConfirmation] = useState('');
  const [openClusterActionMenuId, setOpenClusterActionMenuId] = useState<string | null>(null);
  const clusterCount = totalClusterCount ?? kubernetesClusters.length;

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
      {catalogTabs && (
        <div className="mb-6 flex min-w-0 w-full max-w-full flex-col gap-4">
          {catalogTabs}
        </div>
      )}

      {kubernetesClusters.length > 0 || hasActiveClusterFilter || isCatalogLoading || catalogLoadError ? (
        <ClusterCatalog
          kubernetesClusters={kubernetesClusters}
          totalClusterCount={clusterCount}
          hasActiveFilter={hasActiveClusterFilter}
          isLoading={isCatalogLoading}
          loadError={catalogLoadError}
          onRetry={onRetryCatalog}
          ariaLabelledBy={catalogPanelLabelledBy}
          issueSummaryByClusterId={issueSummaryByClusterId}
          issueSummaryLoadStateByClusterId={issueSummaryLoadStateByClusterId}
          metricLoadStateByClusterId={metricLoadStateByClusterId}
          controls={controls}
          footer={catalogFooter}
          openClusterActionMenuId={openClusterActionMenuId}
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
