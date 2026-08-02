import React, { useMemo } from 'react';
import { Settings, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, CollectionLoadingSkeleton, IconTile, InlineAlert } from '@acornops/ui';
import { CollectionState } from '@acornops/ui';
import { EmptyState } from '@acornops/ui';
import { MenuItem } from '@acornops/ui';
import { ClusterTelemetryPanel } from '@/components/dashboard/ClusterTelemetryPanel';
import { ICONS } from '@/constants';
import { shouldShowResourceCatalogStatus, TargetCatalogActionHint, TargetCatalogActionMenu, TargetCatalogCard, TargetCatalogStatusPill } from '@/features/targets/catalog/TargetCatalogPrimitives';
import { useCatalogNow } from '@/features/targets/catalog/useCatalogNow';
import type { ControlPlaneTargetIssueSummary } from '@/services/controlPlaneApi';
import { HealthStatus, KubernetesCluster } from '@/types';
import { getAgentConnectionState, getEffectiveHealthStatus } from '@/utils/telemetry';
import { getClusterWriteAccessLabel } from './ClusterCatalog.helpers';

interface ClusterCatalogProps {
  kubernetesClusters: KubernetesCluster[];
  issueSummaryByClusterId?: Record<string, ControlPlaneTargetIssueSummary | undefined>;
  issueSummaryLoadStateByClusterId?: Record<string, 'loading' | 'ready' | 'error' | undefined>;
  metricLoadStateByClusterId?: Record<string, 'loading' | 'ready' | 'error' | undefined>;
  onRetryTelemetry?: () => void;
  hasActiveFilter?: boolean;
  isLoading?: boolean;
  loadError?: boolean;
  onRetry?: () => void;
  controls?: React.ReactNode;
  footer?: React.ReactNode;
  openClusterActionMenuId: string | null;
  onOpenClusterActionMenuChange: (clusterId: string | null) => void;
  onOpenDelete: (cluster: KubernetesCluster) => void;
  onSelectKubernetesCluster: (cluster: KubernetesCluster) => void;
  onInstallAgent?: (clusterId: string) => void;
  canInstallAgent?: (cluster: KubernetesCluster) => boolean;
  onOpenClusterSettings?: (cluster: KubernetesCluster) => void;
  canDeleteKubernetesCluster?: (cluster: KubernetesCluster) => boolean;
  onDeleteKubernetesCluster?: (cluster: KubernetesCluster) => Promise<void> | void;
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

function clusterNeedsAttention(cluster: KubernetesCluster, issueSummary?: ControlPlaneTargetIssueSummary): boolean {
  const agentState = getAgentConnectionState(cluster);
  if (agentState === 'not_installed') return false;
  if (agentState === 'disconnected') return true;
  if (getEffectiveHealthStatus(cluster) !== HealthStatus.GREEN) return true;
  return Boolean(issueSummary && (issueSummary.critical > 0 || issueSummary.warning > 0 || issueSummary.active > 0));
}

function getClusterPriority(cluster: KubernetesCluster, issueSummary?: ControlPlaneTargetIssueSummary): number {
  const agentState = getAgentConnectionState(cluster);
  if ((issueSummary?.critical ?? 0) > 0 || getEffectiveHealthStatus(cluster) === HealthStatus.RED) return 0;
  if (agentState === 'disconnected') return 1;
  if (clusterNeedsAttention(cluster, issueSummary)) return 2;
  if (agentState === 'not_installed') return 3;
  return 4;
}

function getClusterStatusLabel(cluster: KubernetesCluster, requiresAgentInstall: boolean, issueSummary: ControlPlaneTargetIssueSummary | undefined, t: Translate): string {
  const status = getEffectiveHealthStatus(cluster);
  if (requiresAgentInstall) return t('dashboard.notConnected');
  if ((issueSummary?.critical ?? 0) > 0) return t('dashboard.criticalStatus', { count: issueSummary?.critical });
  if (getAgentConnectionState(cluster) === 'disconnected' || status === HealthStatus.RED) return t('dashboard.error');
  if ((issueSummary?.warning ?? 0) > 0) return t('dashboard.warningStatus', { count: issueSummary?.warning });
  if ((issueSummary?.active ?? 0) > 0) return t('dashboard.findingStatus', { count: issueSummary?.active });
  if (status === HealthStatus.YELLOW) return t('dashboard.warning');
  return t('dashboard.healthy');
}

function getClusterStatusTone(cluster: KubernetesCluster, requiresAgentInstall: boolean, issueSummary?: ControlPlaneTargetIssueSummary): 'success' | 'warning' | 'danger' {
  const status = getEffectiveHealthStatus(cluster);
  if (requiresAgentInstall) return 'warning';
  if (getAgentConnectionState(cluster) === 'disconnected' || status === HealthStatus.RED || (issueSummary?.critical ?? 0) > 0)
    return 'danger';
  if (status === HealthStatus.YELLOW || (issueSummary?.warning ?? 0) > 0 || (issueSummary?.active ?? 0) > 0)
    return 'warning';
  return 'success';
}

function getClusterStateReason(
  cluster: KubernetesCluster,
  requiresAgentInstall: boolean,
  issueSummary: ControlPlaneTargetIssueSummary | undefined,
  issueSummaryLoadState: 'loading' | 'ready' | 'error' | undefined,
  t: Translate
): string {
  const status = getEffectiveHealthStatus(cluster);
  const agentState = getAgentConnectionState(cluster);
  if (requiresAgentInstall) return t('dashboard.clusterStateInstallAgent');
  if (agentState === 'disconnected') return t('dashboard.clusterStateAgentOffline');
  if (issueSummaryLoadState === 'error') return issueSummary ? t('dashboard.clusterStateIssuesRefreshFailed') : t('dashboard.clusterStateIssuesUnavailable');
  if (!issueSummary) return t('dashboard.clusterStateCheckingIssues');
  if (issueSummary.critical > 0)
    return t('dashboard.clusterStateCriticalIssues', {
      count: issueSummary.critical
    });
  if (status === HealthStatus.RED) return t('dashboard.clusterStateCritical');
  if (issueSummary.warning > 0)
    return t('dashboard.clusterStateWarningIssues', {
      count: issueSummary.warning
    });
  if (issueSummary.active > 0) return t('dashboard.clusterStateIssues', { count: issueSummary.active });
  if (status === HealthStatus.YELLOW) return t('dashboard.clusterStateWarning');
  return t('dashboard.clusterStateClear');
}

function getClusterScopeLabel(cluster: KubernetesCluster, t: Translate): string {
  const includeCount = cluster.namespaceScope?.include.length || 0;
  const excludeCount = cluster.namespaceScope?.exclude.length || 0;
  if (includeCount > 0) return t('dashboard.clusterScopeIncluded', { count: includeCount });
  if (excludeCount > 0) return t('dashboard.clusterScopeExcluded', { count: excludeCount });
  return t('dashboard.clusterScopeAll');
}

const ClusterStatusPill: React.FC<{
  cluster: KubernetesCluster;
  requiresAgentInstall: boolean;
  issueSummary?: ControlPlaneTargetIssueSummary;
  label: string;
  reason: string;
}> = ({ cluster, requiresAgentInstall, issueSummary, label, reason }) => (
  <TargetCatalogStatusPill label={label} reason={reason} tone={getClusterStatusTone(cluster, requiresAgentInstall, issueSummary)} />
);

const ClusterMetadata: React.FC<{ cluster: KubernetesCluster }> = ({ cluster }) => {
  const { t } = useTranslation();
  const items = [
    cluster.cluster && cluster.cluster !== cluster.name ? cluster.cluster : null,
    cluster.namespace && cluster.namespace !== 'all' ? t('dashboard.clusterAgentNamespace', { namespace: cluster.namespace }) : null
  ].filter((item): item is string => Boolean(item));

  if (items.length === 0) return null;
  return (
    <span className="type-caption mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-ui-text-muted">
      {items.map((item, index) => (
        <React.Fragment key={item}>
          {index > 0 && <span aria-hidden="true" className="h-1 w-1 rounded-full bg-ui-text-muted/60" />}
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">{item}</span>
        </React.Fragment>
      ))}
    </span>
  );
};

const ClusterActionMenu: React.FC<{
  cluster: KubernetesCluster;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenSettings?: (cluster: KubernetesCluster) => void;
  canDeleteCluster: boolean;
  onOpenDelete: (cluster: KubernetesCluster) => void;
}> = ({ cluster, isOpen, onOpenChange, onOpenSettings, canDeleteCluster, onOpenDelete }) => {
  const { t } = useTranslation();
  return (
    <TargetCatalogActionMenu targetKind="cluster" label={t('dashboard.clusterActionsFor', { name: cluster.name })} open={isOpen} onOpenChange={onOpenChange}>
      {onOpenSettings && (
        <MenuItem
          data-cluster-overflow-action="settings"
          onClick={() => {
            onOpenChange(false);
            onOpenSettings(cluster);
          }}
        >
          <Settings className="h-4 w-4 text-ui-text-muted" aria-hidden="true" />
          {t('dashboard.clusterSettings')}
        </MenuItem>
      )}
      {canDeleteCluster && (
        <MenuItem
          data-cluster-overflow-action="delete"
          destructive
          onClick={() => {
            onOpenChange(false);
            onOpenDelete(cluster);
          }}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {t('dashboard.deleteCluster')}
        </MenuItem>
      )}
    </TargetCatalogActionMenu>
  );
};

interface ClusterItemProps {
  cluster: KubernetesCluster;
  issueSummary?: ControlPlaneTargetIssueSummary;
  issueSummaryLoadState?: 'loading' | 'ready' | 'error';
  now: number;
  metricLoadState?: 'loading' | 'ready' | 'error';
  onRetryTelemetry?: () => void;
  openClusterActionMenuId: string | null;
  onOpenClusterActionMenuChange: (clusterId: string | null) => void;
  onOpenSettings?: (cluster: KubernetesCluster) => void;
  canDeleteCluster: boolean;
  onOpenDelete: (cluster: KubernetesCluster) => void;
  onSelectKubernetesCluster: (cluster: KubernetesCluster) => void;
  onInstallAgent?: (clusterId: string) => void;
}

function useClusterPresentation(
  cluster: KubernetesCluster,
  issueSummary: ControlPlaneTargetIssueSummary | undefined,
  issueSummaryLoadState: 'loading' | 'ready' | 'error' | undefined
) {
  const { t } = useTranslation();
  const agentState = getAgentConnectionState(cluster);
  const requiresAgentInstall = agentState === 'not_installed';
  const statusLabel = getClusterStatusLabel(cluster, requiresAgentInstall, issueSummary, t);
  const statusReason = getClusterStateReason(cluster, requiresAgentInstall, issueSummary, issueSummaryLoadState, t);
  const statusTone = getClusterStatusTone(cluster, requiresAgentInstall, issueSummary);
  const showStatus = shouldShowResourceCatalogStatus(statusTone);
  const actionLabel = requiresAgentInstall ? t('dashboard.setUp') : clusterNeedsAttention(cluster, issueSummary) ? t('dashboard.investigate') : t('dashboard.openCluster');
  return {
    t,
    agentState,
    requiresAgentInstall,
    statusLabel,
    statusReason,
    showStatus,
    actionLabel
  };
}

const ClusterConnectionSetup: React.FC<{
  cluster: KubernetesCluster;
  onInstallAgent?: (clusterId: string) => void;
}> = ({ cluster, onInstallAgent }) => {
  const { t } = useTranslation();
  return (
    <section
      data-cluster-setup-telemetry="true"
      aria-label={t('dashboard.installAgentNamed', { name: cluster.name })}
      className="mx-4 flex min-h-[10rem] min-w-0 flex-1 items-center border-t border-ui-border/60 py-4"
    >
      <div className="mx-auto flex w-full max-w-sm min-w-0 flex-col items-center gap-3 text-center">
        <div className="min-w-0">
          <p className="type-row-title text-ui-text">{t('dashboard.agentNotInstalled')}</p>
          <p className="type-caption mt-1 max-w-[36rem] text-ui-text-muted">{t('dashboard.telemetryUnavailableUntilAgentInstalled')}</p>
        </div>
        <Button
          data-cluster-setup-action="install"
          type="button"
          variant="primary"
          size="sm"
          disabled={!onInstallAgent}
          onClick={() => onInstallAgent?.(cluster.id)}
          className="pointer-events-auto shrink-0"
        >
          <ICONS.Wrench className="h-3.5 w-3.5" aria-hidden="true" />
          {t('dashboard.installAgent')}
        </Button>
      </div>
    </section>
  );
};

const ClusterOperationalDetails: React.FC<{ cluster: KubernetesCluster }> = ({ cluster }) => {
  const { t } = useTranslation();
  const readyNodeCount = cluster.nodes.filter((node) => node.status.toLowerCase() === 'ready').length;
  const hasUnreadyNodes = cluster.nodes.length > 0 && readyNodeCount < cluster.nodes.length;
  const details = [
    {
      label: t('dashboard.scope'),
      value: getClusterScopeLabel(cluster, t),
      Icon: ICONS.Layers,
      warning: false
    },
    {
      label: t('dashboard.writeAccessShort'),
      value: getClusterWriteAccessLabel(cluster, t),
      Icon: ICONS.Shield,
      warning: false
    },
    ...(hasUnreadyNodes ? [{
      label: t('dashboard.nodes'),
      value: t('dashboard.nodesReady', { ready: readyNodeCount, total: cluster.nodes.length }),
      Icon: ICONS.Server,
      warning: true
    }] : [])
  ];

  return (
    <dl data-cluster-operational-details="true" className="mx-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-ui-border/60 pb-4 pt-3">
      {details.map(({ label, value, Icon, warning }) => (
        <div key={label} className="flex min-w-0 items-center gap-1.5" title={`${label}: ${value}`}>
          <Icon className={`h-3.5 w-3.5 shrink-0 ${warning ? 'text-status-warning-text' : 'text-ui-text-muted'}`} aria-hidden="true" />
          <dt className="type-caption shrink-0 text-ui-text-muted">{label}:</dt>
          <dd className={`type-caption min-w-0 break-words type-emphasis leading-4 [overflow-wrap:anywhere] ${warning ? 'text-status-warning-text' : 'text-ui-text'}`}>{value}</dd>
        </div>
      ))}
    </dl>
  );
};

const ClusterCatalogCard: React.FC<ClusterItemProps> = (props) => {
  const { cluster, issueSummary, now } = props;
  const view = useClusterPresentation(cluster, issueSummary, props.issueSummaryLoadState);
  const actionLabelNamed = view.requiresAgentInstall
    ? view.t('dashboard.installAgentNamed', { name: cluster.name })
    : clusterNeedsAttention(cluster, issueSummary)
    ? view.t('dashboard.investigateClusterNamed', { name: cluster.name })
    : view.t('dashboard.viewClusterNamed', { name: cluster.name });
  return (
    <TargetCatalogCard
      targetKind="cluster"
      actionLabel={actionLabelNamed}
      disabled={view.requiresAgentInstall && !props.onInstallAgent}
      onActivate={() => (view.requiresAgentInstall ? props.onInstallAgent?.(cluster.id) : props.onSelectKubernetesCluster(cluster))}
    >
      <div className="flex min-h-[4.5rem] min-w-0 items-start gap-3 px-4 py-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <IconTile size="sm" tone="accent">
            <ICONS.Layers className="h-4 w-4" />
          </IconTile>
          <div className="min-w-0 flex-1">
            <h3 className="type-panel-title break-words text-ui-text">{cluster.name}</h3>
            <ClusterMetadata cluster={cluster} />
            {!view.requiresAgentInstall && <TargetCatalogActionHint label={view.actionLabel} />}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {view.showStatus && <div className="xl:hidden 2xl:block">
            <ClusterStatusPill cluster={cluster} requiresAgentInstall={view.requiresAgentInstall} issueSummary={issueSummary} label={view.statusLabel} reason={view.statusReason} />
          </div>}
          <ClusterActionMenu
            cluster={cluster}
            isOpen={props.openClusterActionMenuId === cluster.id}
            onOpenChange={(open) => props.onOpenClusterActionMenuChange(open ? cluster.id : null)}
            onOpenSettings={view.requiresAgentInstall ? undefined : props.onOpenSettings}
            canDeleteCluster={props.canDeleteCluster}
            onOpenDelete={props.onOpenDelete}
          />
        </div>
      </div>
      {view.showStatus && <div className="-mt-4 hidden pb-3 pl-16 pr-4 xl:block 2xl:hidden">
        <ClusterStatusPill cluster={cluster} requiresAgentInstall={view.requiresAgentInstall} issueSummary={issueSummary} label={view.statusLabel} reason={view.statusReason} />
      </div>}

      {view.requiresAgentInstall ? (
        <ClusterConnectionSetup cluster={cluster} onInstallAgent={props.onInstallAgent} />
      ) : (
        <ClusterTelemetryPanel cluster={cluster} now={now} compact loadState={props.metricLoadState} onRetry={props.onRetryTelemetry} />
      )}
      {!view.requiresAgentInstall && <ClusterOperationalDetails cluster={cluster} />}
    </TargetCatalogCard>
  );
};

const ClusterCatalogEmptyState: React.FC<{
  filtered: boolean;
  isLoading: boolean;
  loadError: boolean;
  onRetry?: () => void;
}> = ({ filtered, isLoading, loadError, onRetry }) => {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <CollectionLoadingSkeleton
        label={t('dashboard.loadingClusters')}
        variant="card-grid"
        rows={3}
        gridClassName="resource-card-grid gap-4"
        gridProps={{ 'data-cluster-card-grid': 'true', 'data-resource-card-grid': 'true' }}
      />
    );
  }
  const EmptyIcon = loadError ? ICONS.AlertCircle : filtered ? ICONS.Search : ICONS.Layers;
  return (
    <EmptyState
      headingLevel={3}
      icon={<EmptyIcon />}
      title={loadError ? t('dashboard.clusterLoadFailed') : filtered ? t('dashboard.noMatchingClusters') : t('dashboard.noClusters')}
      description={
        loadError
          ? t('dashboard.clusterLoadFailedBody')
          : filtered
          ? t('dashboard.noMatchingClustersBody')
          : t('dashboard.noClustersBody')
      }
      actions={
        !isLoading && loadError && onRetry ? (
          <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        ) : undefined
      }
    />
  );
};

export const ClusterCatalog: React.FC<ClusterCatalogProps> = ({
  kubernetesClusters,
  issueSummaryByClusterId = {},
  issueSummaryLoadStateByClusterId = {},
  metricLoadStateByClusterId = {},
  onRetryTelemetry,
  hasActiveFilter = false,
  isLoading = false,
  loadError = false,
  onRetry,
  controls,
  footer,
  openClusterActionMenuId,
  onOpenClusterActionMenuChange,
  onOpenDelete,
  onSelectKubernetesCluster,
  onInstallAgent,
  canInstallAgent,
  onOpenClusterSettings,
  canDeleteKubernetesCluster,
  onDeleteKubernetesCluster
}) => {
  const { t } = useTranslation();
  const now = useCatalogNow();
  const sortedClusters = useMemo(
    () =>
      [...kubernetesClusters].sort((left, right) => {
        const priorityDifference = getClusterPriority(left, issueSummaryByClusterId[left.id]) - getClusterPriority(right, issueSummaryByClusterId[right.id]);
        return priorityDifference || left.name.localeCompare(right.name);
      }),
    [issueSummaryByClusterId, kubernetesClusters]
  );

  const itemProps = (cluster: KubernetesCluster): ClusterItemProps => ({
    cluster,
    issueSummary: issueSummaryByClusterId[cluster.id],
    issueSummaryLoadState: issueSummaryLoadStateByClusterId[cluster.id],
    now,
    metricLoadState: metricLoadStateByClusterId[cluster.id],
    onRetryTelemetry,
    openClusterActionMenuId,
    onOpenClusterActionMenuChange,
    onOpenSettings: onOpenClusterSettings,
    canDeleteCluster: Boolean(onDeleteKubernetesCluster && canDeleteKubernetesCluster?.(cluster)),
    onOpenDelete,
    onSelectKubernetesCluster,
    onInstallAgent: onInstallAgent && (canInstallAgent?.(cluster) ?? true) ? onInstallAgent : undefined
  });

  return (
    <section
      id="cluster-catalog-panel"
      data-cluster-catalog="true"
      data-resource-card-catalog="true"
      aria-labelledby="cluster-catalog-heading"
      className="resource-card-catalog grid min-w-0 shrink-0 content-start gap-4"
    >
      <h2 id="cluster-catalog-heading" className="type-section-title sr-only">
        {t('dashboard.clusterCatalog')}
      </h2>
      {controls && <div data-cluster-catalog-controls="true">{controls}</div>}

      {loadError && sortedClusters.length > 0 && (
        <InlineAlert
          tone="danger"
          title={t('dashboard.clusterLoadFailed')}
          action={onRetry ? <Button type="button" variant="secondary" size="sm" onClick={onRetry}>{t('common.retry')}</Button> : undefined}
        >
          {t('dashboard.clusterLoadFailedBody')}
        </InlineAlert>
      )}

      <CollectionState
        phase={loadError ? 'error' : isLoading ? (sortedClusters.length > 0 ? 'refreshing' : 'loading') : 'ready'}
        itemCount={sortedClusters.length}
        filtered={hasActiveFilter}
        loading={<ClusterCatalogEmptyState filtered={false} isLoading loadError={false} onRetry={onRetry} />}
        empty={<ClusterCatalogEmptyState filtered={false} isLoading={false} loadError={false} onRetry={onRetry} />}
        filteredEmpty={<ClusterCatalogEmptyState filtered isLoading={false} loadError={false} onRetry={onRetry} />}
        error={<ClusterCatalogEmptyState filtered={hasActiveFilter} isLoading={false} loadError onRetry={onRetry} />}
      >
        <div data-cluster-card-grid="true" data-resource-card-grid="true" className="resource-card-grid min-w-0 gap-4">
          {sortedClusters.map((cluster) => (
            <ClusterCatalogCard key={cluster.id} {...itemProps(cluster)} />
          ))}
        </div>
      </CollectionState>
      {footer && <div className="shrink-0">{footer}</div>}
    </section>
  );
};
