import React, { useEffect, useMemo, useState } from 'react';
import { MoreHorizontal, Settings, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { MenuItem } from '@/components/common/FormControls';
import { ClusterTelemetryPanel } from '@/components/dashboard/ClusterTelemetryPanel';
import { ICONS } from '@/constants';
import type { ControlPlaneTargetIssueSummary } from '@/services/controlPlaneApi';
import { HealthStatus, KubernetesCluster } from '@/types';
import { getAgentConnectionState, getEffectiveHealthStatus } from '@/utils/telemetry';

interface ClusterCatalogProps {
  kubernetesClusters: KubernetesCluster[];
  totalClusterCount?: number;
  issueSummaryByClusterId?: Record<string, ControlPlaneTargetIssueSummary | undefined>;
  issueSummaryLoadStateByClusterId?: Record<string, 'loading' | 'ready' | 'error' | undefined>;
  metricLoadStateByClusterId?: Record<string, 'loading' | 'ready' | 'error' | undefined>;
  hasActiveFilter?: boolean;
  isLoading?: boolean;
  loadError?: boolean;
  onRetry?: () => void;
  ariaLabelledBy?: string;
  controls?: React.ReactNode;
  footer?: React.ReactNode;
  openClusterActionMenuId: string | null;
  onToggleClusterActionMenu: (clusterId: string) => void;
  onOpenDelete: (cluster: KubernetesCluster) => void;
  onSelectKubernetesCluster: (cluster: KubernetesCluster) => void;
  onInstallAgent?: (clusterId: string) => void;
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
  if (requiresAgentInstall) return t('dashboard.setupRequired');
  if ((issueSummary?.critical ?? 0) > 0) return t('dashboard.criticalStatus', { count: issueSummary?.critical });
  if (getAgentConnectionState(cluster) === 'disconnected' || status === HealthStatus.RED) return t('dashboard.error');
  if ((issueSummary?.warning ?? 0) > 0) return t('dashboard.warningStatus', { count: issueSummary?.warning });
  if ((issueSummary?.active ?? 0) > 0) return t('dashboard.findingStatus', { count: issueSummary?.active });
  if (status === HealthStatus.YELLOW) return t('dashboard.warning');
  return t('dashboard.healthy');
}

function getClusterStatusClass(cluster: KubernetesCluster, requiresAgentInstall: boolean, issueSummary?: ControlPlaneTargetIssueSummary): string {
  const status = getEffectiveHealthStatus(cluster);
  if (requiresAgentInstall) return 'border-status-warning/25 bg-status-warning-soft text-status-warning-text';
  if (getAgentConnectionState(cluster) === 'disconnected' || status === HealthStatus.RED || (issueSummary?.critical ?? 0) > 0) return 'border-status-danger/25 bg-status-danger-soft text-status-danger-text';
  if (status === HealthStatus.YELLOW || (issueSummary?.warning ?? 0) > 0 || (issueSummary?.active ?? 0) > 0) return 'border-status-warning/25 bg-status-warning-soft text-status-warning-text';
  return 'border-status-success/25 bg-status-success-soft text-status-success-text';
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
  if (issueSummaryLoadState === 'error') return issueSummary
    ? t('dashboard.clusterStateIssuesRefreshFailed')
    : t('dashboard.clusterStateIssuesUnavailable');
  if (!issueSummary) return t('dashboard.clusterStateCheckingIssues');
  if (issueSummary.critical > 0) return t('dashboard.clusterStateCriticalIssues', { count: issueSummary.critical });
  if (status === HealthStatus.RED) return t('dashboard.clusterStateCritical');
  if (issueSummary.warning > 0) return t('dashboard.clusterStateWarningIssues', { count: issueSummary.warning });
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

function getClusterResourceCount(cluster: KubernetesCluster): number {
  const summaryCount = cluster.resourceSummary?.resourceCount;
  if (typeof summaryCount === 'number' && Number.isFinite(summaryCount)) return summaryCount;
  return cluster.workloads.length + cluster.services.length + cluster.ingresses.length +
    cluster.pvcs.length + cluster.nodes.length + cluster.namespaces.length;
}

function getWriteGuardLabel(cluster: KubernetesCluster, t: Translate): string {
  return cluster.writeConfirmationPolicy?.effectiveRequired ?? true
    ? t('clusterSetup.writeConfirmationsRequired')
    : t('clusterSetup.writeConfirmationsNotRequired');
}

const ClusterStatusPill: React.FC<{
  cluster: KubernetesCluster;
  requiresAgentInstall: boolean;
  issueSummary?: ControlPlaneTargetIssueSummary;
  label: string;
  reason: string;
}> = ({ cluster, requiresAgentInstall, issueSummary, label, reason }) => (
  <span
    className={`inline-flex max-w-[8.5rem] items-center rounded-full border px-2 py-0.5 text-[0.6875rem] font-bold uppercase leading-4 tracking-[0.06em] ${getClusterStatusClass(cluster, requiresAgentInstall, issueSummary)}`}
    title={reason}
    aria-label={`${label}: ${reason}`}
  >
    <span className="truncate">{label}</span>
  </span>
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
  onToggle: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onClose: () => void;
  onOpenSettings?: (cluster: KubernetesCluster) => void;
  canDeleteCluster: boolean;
  onOpenDelete: (cluster: KubernetesCluster) => void;
}> = ({ cluster, isOpen, onToggle, onClose, onOpenSettings, canDeleteCluster, onOpenDelete }) => {
  const { t } = useTranslation();
  return (
    <div className="pointer-events-auto relative z-20">
      <button
        data-cluster-overflow-action="toggle"
        type="button"
        onClick={onToggle}
        className={`control-target inline-flex h-10 w-10 items-center justify-center rounded-md text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${isOpen ? 'bg-ui-bg text-ui-text' : ''}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={t('dashboard.clusterActionsFor', { name: cluster.name })}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {isOpen && (
        <div role="menu" onClick={(event) => event.stopPropagation()} className="absolute right-0 top-10 w-52 overflow-hidden rounded-lg border border-ui-border bg-ui-surface p-1 text-sm shadow-xl">
          {onOpenSettings && (
            <MenuItem data-cluster-overflow-action="settings" onClick={() => { onClose(); onOpenSettings(cluster); }}>
              <Settings className="h-4 w-4 text-ui-text-muted" />
              {t('dashboard.clusterSettings')}
            </MenuItem>
          )}
          {canDeleteCluster && (
            <MenuItem data-cluster-overflow-action="delete" destructive onClick={() => { onClose(); onOpenDelete(cluster); }}>
              <Trash2 className="h-4 w-4" />
              {t('dashboard.deleteCluster')}
            </MenuItem>
          )}
        </div>
      )}
    </div>
  );
};

interface ClusterItemProps {
  cluster: KubernetesCluster;
  issueSummary?: ControlPlaneTargetIssueSummary;
  issueSummaryLoadState?: 'loading' | 'ready' | 'error';
  now: number;
  metricLoadState?: 'loading' | 'ready' | 'error';
  openClusterActionMenuId: string | null;
  onToggleClusterActionMenu: (clusterId: string) => void;
  onOpenSettings?: (cluster: KubernetesCluster) => void;
  canDeleteCluster: boolean;
  onOpenDelete: (cluster: KubernetesCluster) => void;
  onSelectKubernetesCluster: (cluster: KubernetesCluster) => void;
  onInstallAgent?: (clusterId: string) => void;
}

function useClusterPresentation(cluster: KubernetesCluster, issueSummary: ControlPlaneTargetIssueSummary | undefined, issueSummaryLoadState: 'loading' | 'ready' | 'error' | undefined) {
  const { t } = useTranslation();
  const agentState = getAgentConnectionState(cluster);
  const requiresAgentInstall = agentState === 'not_installed';
  const statusLabel = getClusterStatusLabel(cluster, requiresAgentInstall, issueSummary, t);
  const statusReason = getClusterStateReason(cluster, requiresAgentInstall, issueSummary, issueSummaryLoadState, t);
  const actionLabel = requiresAgentInstall
    ? t('dashboard.setUp')
    : clusterNeedsAttention(cluster, issueSummary)
      ? t('dashboard.investigate')
      : t('dashboard.openCluster');
  return { t, agentState, requiresAgentInstall, statusLabel, statusReason, actionLabel };
}

const ClusterSetupTelemetry: React.FC<{
  cluster: KubernetesCluster;
  onInstallAgent?: (clusterId: string) => void;
}> = ({ cluster, onInstallAgent }) => {
  const { t } = useTranslation();
  const metrics = [
    { label: t('dashboard.cpu'), Icon: ICONS.Cpu },
    { label: t('dashboard.memory'), Icon: ICONS.HardDrive }
  ];
  return (
    <section data-cluster-setup-telemetry="true" aria-label={t('dashboard.installAgentNamed', { name: cluster.name })} className="shrink-0 px-4 pb-3">
      <dl className="grid min-w-0 grid-cols-2 gap-4 border-t border-ui-border/60 py-3">
        {metrics.map(({ label, Icon }) => (
          <div key={label} className="min-w-0">
            <dt className="type-micro-label flex min-w-0 items-center gap-1.5 text-ui-text-muted">
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </dt>
            <dd className="type-caption mt-1 font-semibold text-ui-text-muted">{t('dashboard.unavailable')}</dd>
          </div>
        ))}
      </dl>
      <div>
        <div className="relative h-[104px] overflow-hidden">
          <svg viewBox="0 0 180 108" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-ui-border/55" aria-hidden="true">
            <line x1="0" x2="180" y1="20" y2="20" className="stroke-current" strokeWidth="1" />
            <line x1="0" x2="180" y1="54" y2="54" className="stroke-current" strokeWidth="1" />
            <line x1="0" x2="180" y1="88" y2="88" className="stroke-current" strokeWidth="1" />
          </svg>
          <div className="absolute inset-0 z-10 flex items-center justify-between gap-3 px-2">
            <div className="min-w-0">
              <p className="type-row-title text-ui-text">{t('dashboard.agentNotInstalled')}</p>
              <p className="type-caption mt-1 line-clamp-2 text-ui-text-muted">{t('dashboard.telemetryUnavailableUntilAgentInstalled')}</p>
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
              <span className="hidden min-[1440px]:inline">{t('dashboard.installAgent')}</span>
              <span className="min-[1440px]:hidden">{t('dashboard.setUp')}</span>
            </Button>
          </div>
        </div>
        <div className="type-caption mt-1.5 grid grid-cols-3 gap-2 font-medium text-ui-text-muted" aria-hidden="true">
          <span className="truncate"><span className="xl:hidden min-[1440px]:inline">{t('dashboard.clusterRegistered')}</span><span className="hidden xl:inline min-[1440px]:hidden">{t('dashboard.clusterRegisteredShort')}</span></span>
          <span className="truncate text-center"><span className="xl:hidden min-[1440px]:inline">{t('dashboard.telemetryPending')}</span><span className="hidden xl:inline min-[1440px]:hidden">{t('dashboard.telemetryPendingShort')}</span></span>
          <span className="truncate text-right"><span className="xl:hidden min-[1440px]:inline">{t('dashboard.agentRequired')}</span><span className="hidden xl:inline min-[1440px]:hidden">{t('dashboard.agentRequiredShort')}</span></span>
        </div>
      </div>
    </section>
  );
};

const ClusterOperationalDetails: React.FC<{ cluster: KubernetesCluster }> = ({ cluster }) => {
  const { t } = useTranslation();
  const details = [
    { label: t('dashboard.scope'), compactLabel: t('dashboard.scope'), value: getClusterScopeLabel(cluster, t), Icon: ICONS.Layers },
    { label: t('dashboard.writeGuard'), compactLabel: t('dashboard.writeGuardShort'), value: getWriteGuardLabel(cluster, t), Icon: ICONS.Shield },
    { label: t('resources.title'), compactLabel: t('dashboard.resourceCountShort'), value: String(getClusterResourceCount(cluster)), Icon: ICONS.Box }
  ];

  return (
    <dl className="mx-4 grid grid-cols-3 gap-3 border-t border-ui-border/60 pb-4 pt-3">
      {details.map(({ label, compactLabel, value, Icon }) => (
        <div key={label} className="min-w-0">
          <dt className="type-micro-label flex min-w-0 items-center gap-0.5 text-ui-text-muted tracking-[0.02em]" title={label}>
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="hidden truncate 2xl:inline">{label}</span>
            <span className="truncate 2xl:hidden">{compactLabel}</span>
          </dt>
          <dd className="type-caption mt-1 break-words font-semibold leading-4 text-ui-text [overflow-wrap:anywhere]" title={value}>{value}</dd>
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
    : view.t('dashboard.viewClusterNamed', { name: cluster.name });
  return (
    <article className="group relative flex min-w-0 flex-col overflow-visible rounded-lg border border-ui-border bg-ui-surface shadow-sm transition-colors hover:border-accent/25">
      <button
        data-cluster-card-primary-action="true"
        type="button"
        aria-label={actionLabelNamed}
        disabled={view.requiresAgentInstall && !props.onInstallAgent}
        onClick={() => view.requiresAgentInstall ? props.onInstallAgent?.(cluster.id) : props.onSelectKubernetesCluster(cluster)}
        className="control-target absolute inset-0 z-0 cursor-pointer rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/25 disabled:cursor-not-allowed"
      />

      <div className="pointer-events-none relative z-10 flex min-w-0 flex-col">
        <div className="flex min-h-[4.5rem] min-w-0 items-start gap-3 px-4 py-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-ui-border bg-ui-bg text-accent-strong"><ICONS.Layers className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <h3 className="type-panel-title break-words text-ui-text">{cluster.name}</h3>
              <ClusterMetadata cluster={cluster} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <div className="xl:hidden 2xl:block">
              <ClusterStatusPill cluster={cluster} requiresAgentInstall={view.requiresAgentInstall} issueSummary={issueSummary} label={view.statusLabel} reason={view.statusReason} />
            </div>
            <ClusterActionMenu cluster={cluster} isOpen={props.openClusterActionMenuId === cluster.id} onToggle={(event) => { event.stopPropagation(); props.onToggleClusterActionMenu(cluster.id); }} onClose={() => props.onToggleClusterActionMenu(cluster.id)} onOpenSettings={view.requiresAgentInstall ? undefined : props.onOpenSettings} canDeleteCluster={props.canDeleteCluster} onOpenDelete={props.onOpenDelete} />
          </div>
        </div>
        <div className="-mt-4 hidden pb-3 pl-16 pr-4 xl:block 2xl:hidden">
          <ClusterStatusPill cluster={cluster} requiresAgentInstall={view.requiresAgentInstall} issueSummary={issueSummary} label={view.statusLabel} reason={view.statusReason} />
        </div>

        {view.requiresAgentInstall
          ? <ClusterSetupTelemetry cluster={cluster} onInstallAgent={props.onInstallAgent} />
          : <ClusterTelemetryPanel cluster={cluster} now={now} compact loadState={props.metricLoadState} />}
        <ClusterOperationalDetails cluster={cluster} />
      </div>
    </article>
  );
};

const ClusterCatalogEmptyState: React.FC<{ filtered: boolean; isLoading: boolean; loadError: boolean; onRetry?: () => void }> = ({ filtered, isLoading, loadError, onRetry }) => {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[12rem] items-center justify-center rounded-lg border border-dashed border-ui-border bg-ui-surface px-5 py-8 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-md border border-ui-border bg-ui-bg text-ui-text-muted"><ICONS.Search className="h-4 w-4" /></div>
        <h3 className="type-row-title text-ui-text">
          {isLoading ? t('dashboard.loadingClusters') : loadError ? t('dashboard.clusterLoadFailed') : filtered ? t('dashboard.noMatchingClusters') : t('dashboard.noClusters')}
        </h3>
        <p className="type-caption mt-1.5 text-ui-text-muted">
          {isLoading ? t('dashboard.loadingClustersBody') : loadError ? t('dashboard.clusterLoadFailedBody') : filtered ? t('dashboard.noMatchingClustersBody') : t('dashboard.noClustersBody')}
        </p>
        {!isLoading && loadError && onRetry && (
          <Button type="button" variant="secondary" size="sm" onClick={onRetry} className="mt-5">
            {t('common.retry')}
          </Button>
        )}
      </div>
    </div>
  );
};

export const ClusterCatalog: React.FC<ClusterCatalogProps> = ({
  kubernetesClusters,
  totalClusterCount,
  issueSummaryByClusterId = {},
  issueSummaryLoadStateByClusterId = {},
  metricLoadStateByClusterId = {},
  hasActiveFilter = false,
  isLoading = false,
  loadError = false,
  onRetry,
  ariaLabelledBy,
  controls,
  footer,
  openClusterActionMenuId,
  onToggleClusterActionMenu,
  onOpenDelete,
  onSelectKubernetesCluster,
  onInstallAgent,
  onOpenClusterSettings,
  canDeleteKubernetesCluster,
  onDeleteKubernetesCluster
}) => {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());
  const clusterTotal = totalClusterCount ?? kubernetesClusters.length;
  const sortedClusters = useMemo(() => [...kubernetesClusters].sort((left, right) => {
    const priorityDifference = getClusterPriority(left, issueSummaryByClusterId[left.id]) - getClusterPriority(right, issueSummaryByClusterId[right.id]);
    return priorityDifference || left.name.localeCompare(right.name);
  }), [issueSummaryByClusterId, kubernetesClusters]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const itemProps = (cluster: KubernetesCluster): ClusterItemProps => ({
    cluster,
    issueSummary: issueSummaryByClusterId[cluster.id],
    issueSummaryLoadState: issueSummaryLoadStateByClusterId[cluster.id],
    now,
    metricLoadState: metricLoadStateByClusterId[cluster.id],
    openClusterActionMenuId,
    onToggleClusterActionMenu,
    onOpenSettings: onOpenClusterSettings,
    canDeleteCluster: Boolean(onDeleteKubernetesCluster && canDeleteKubernetesCluster?.(cluster)),
    onOpenDelete,
    onSelectKubernetesCluster,
    onInstallAgent
  });

  return (
    <section id="cluster-catalog-panel" role="tabpanel" tabIndex={0} data-cluster-catalog="true" aria-labelledby={ariaLabelledBy} className="grid min-w-0 shrink-0 content-start gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25">
      {controls && (
        <div data-cluster-catalog-controls="true" className="grid min-w-0 gap-3 rounded-lg border border-ui-border bg-ui-surface px-4 py-4 shadow-sm sm:grid-cols-[minmax(16rem,1fr)_minmax(10rem,12rem)]">
          <div className="min-w-0">{controls}</div>
          <span className="flex h-11 min-h-11 items-center justify-center rounded-lg border border-ui-border bg-ui-bg/60 px-4 text-sm font-semibold text-ui-text-muted shadow-[inset_0_1px_0_rgb(var(--surface-rgb)/0.75)]">
            {t('dashboard.showingClusters', { count: kubernetesClusters.length, total: clusterTotal })}
          </span>
        </div>
      )}

      {loadError && sortedClusters.length > 0 && (
        <div role="alert" className="flex flex-col gap-3 rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="type-row-title">{t('dashboard.clusterLoadFailed')}</p>
            <p className="type-caption mt-1 text-status-danger-text/80">{t('dashboard.clusterLoadFailedBody')}</p>
          </div>
          {onRetry && <Button type="button" variant="secondary" size="sm" onClick={onRetry} className="shrink-0">{t('common.retry')}</Button>}
        </div>
      )}

      {sortedClusters.length === 0 ? <ClusterCatalogEmptyState filtered={hasActiveFilter} isLoading={isLoading} loadError={loadError} onRetry={onRetry} /> : (
        <div data-cluster-card-grid="true" className="grid min-w-0 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedClusters.map((cluster) => <ClusterCatalogCard key={cluster.id} {...itemProps(cluster)} />)}
        </div>
      )}
      {footer && <div className="shrink-0">{footer}</div>}
    </section>
  );
};
