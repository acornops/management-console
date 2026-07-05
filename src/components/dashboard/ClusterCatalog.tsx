import React, { useEffect, useState } from 'react';
import { MoreHorizontal, Settings, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Tooltip } from '@/components/common/Tooltip';
import { ClusterTelemetryPanel } from '@/components/dashboard/ClusterTelemetryPanel';
import { ICONS } from '@/constants';
import type { ControlPlaneTargetIssueSummary } from '@/services/controlPlaneApi';
import { HealthStatus, KubernetesCluster } from '@/types';
import {
  getAgentConnectionState,
  getEffectiveHealthStatus
} from '@/utils/telemetry';

type ClusterScopeSummaryKey = 'namespaces' | 'writeConfirmations' | 'resources';

interface ClusterScopeSummaryItem {
  key: ClusterScopeSummaryKey;
  label: string;
  value: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

interface ClusterCatalogProps {
  kubernetesClusters: KubernetesCluster[];
  totalClusterCount?: number;
  issueSummaryByClusterId?: Record<string, ControlPlaneTargetIssueSummary | undefined>;
  hasActiveFilter?: boolean;
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

function getClusterStatusLabel(cluster: KubernetesCluster, requiresAgentInstall: boolean, t: (key: string) => string): string {
  const status = getEffectiveHealthStatus(cluster);
  if (requiresAgentInstall) return t('dashboard.setupRequired');
  if (status === HealthStatus.GREEN) return t('dashboard.healthy');
  if (status === HealthStatus.YELLOW) return t('dashboard.warning');
  return t('dashboard.error');
}

function getClusterStatusClass(cluster: KubernetesCluster, requiresAgentInstall: boolean): string {
  const status = getEffectiveHealthStatus(cluster);
  if (requiresAgentInstall) return 'border-status-warning/25 bg-status-warning-soft text-status-warning-text';
  if (status === HealthStatus.GREEN) return 'border-status-success/25 bg-status-success-soft text-status-success-text';
  if (status === HealthStatus.YELLOW) return 'border-status-warning/25 bg-status-warning-soft text-status-warning-text';
  return 'border-status-danger/25 bg-status-danger-soft text-status-danger-text';
}

function getClusterStateReason(
  cluster: KubernetesCluster,
  requiresAgentInstall: boolean,
  issueSummary: ControlPlaneTargetIssueSummary | undefined,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const status = getEffectiveHealthStatus(cluster);
  const agentState = getAgentConnectionState(cluster);
  if (requiresAgentInstall) return t('dashboard.clusterStateInstallAgent');
  if (agentState === 'disconnected') return t('dashboard.clusterStateAgentOffline');
  if (!issueSummary) return t('dashboard.clusterStateCheckingIssues');
  if (issueSummary.critical > 0) return t('dashboard.clusterStateCriticalIssues', { count: issueSummary.critical });
  if (status === HealthStatus.RED) return t('dashboard.clusterStateCritical');
  if (issueSummary.total > 0) return t('dashboard.clusterStateIssues', { count: issueSummary.total });
  if (status === HealthStatus.YELLOW) return t('dashboard.clusterStateWarning');
  return t('dashboard.clusterStateReady');
}

function getClusterScopeLabel(cluster: KubernetesCluster, t: (key: string, options?: Record<string, unknown>) => string): string {
  const includeCount = cluster.namespaceScope?.include.length || 0;
  const excludeCount = cluster.namespaceScope?.exclude.length || 0;
  if (includeCount > 0) return t('dashboard.clusterScopeIncluded', { count: includeCount });
  if (excludeCount > 0) return t('dashboard.clusterScopeExcluded', { count: excludeCount });
  return t('dashboard.clusterScopeAll');
}

function getClusterResourceCount(cluster: KubernetesCluster): number {
  const summaryCount = cluster.resourceSummary?.resourceCount;
  if (typeof summaryCount === 'number' && Number.isFinite(summaryCount)) return summaryCount;

  return cluster.workloads.length +
    cluster.services.length +
    cluster.ingresses.length +
    cluster.pvcs.length +
    cluster.nodes.length +
    cluster.namespaces.length;
}

function buildClusterScopeSummaryItems(cluster: KubernetesCluster, t: (key: string, options?: Record<string, unknown>) => string): ClusterScopeSummaryItem[] {
  const writeConfirmationsRequired = cluster.writeConfirmationPolicy?.effectiveRequired ?? true;

  return [
    {
      key: 'namespaces',
      label: t('dashboard.namespaces'),
      value: getClusterScopeLabel(cluster, t),
      icon: ICONS.Layers
    },
    {
      key: 'writeConfirmations',
      label: t('dashboard.writeGuard'),
      value: writeConfirmationsRequired ? t('clusterSetup.writeConfirmationsRequired') : t('clusterSetup.writeConfirmationsNotRequired'),
      icon: ICONS.Shield
    },
    {
      key: 'resources',
      label: t('resources.title'),
      value: String(getClusterResourceCount(cluster)),
      icon: ICONS.Box
    }
  ];
}

const ClusterStatusPill: React.FC<{ cluster: KubernetesCluster; requiresAgentInstall: boolean; label: string; reason: string }> = ({ cluster, requiresAgentInstall, label, reason }) => (
  <Tooltip content={reason} className="pointer-events-auto relative z-20 max-w-full">
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[0.6875rem] font-bold uppercase leading-4 tracking-[0.08em] ${getClusterStatusClass(cluster, requiresAgentInstall)}`}
      title={reason}
      aria-label={`${label}: ${reason}`}
    >
      <span className="min-w-0 truncate">{label}</span>
    </span>
  </Tooltip>
);

const ClusterMetadataLine: React.FC<{ cluster: KubernetesCluster; t: (key: string, options?: Record<string, unknown>) => string }> = ({ cluster, t }) => {
  const items = [
    cluster.cluster && cluster.cluster !== cluster.name ? cluster.cluster : null,
    cluster.namespace && cluster.namespace !== 'all' ? t('dashboard.clusterAgentNamespace', { namespace: cluster.namespace }) : null
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <span className="type-caption mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-ui-text-muted">
      {items.map((item, index) => (
        <span key={item} className="inline-flex min-w-0 items-center gap-x-2">
          {index > 0 && <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-ui-text-muted" />}
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">{item}</span>
        </span>
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
        className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-ui-text active:bg-ui-bg/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${isOpen ? 'bg-ui-bg text-ui-text' : 'bg-transparent'}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={t('dashboard.clusterActionsFor', { name: cluster.name })}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {isOpen && (
        <div
          role="menu"
          onClick={(event) => event.stopPropagation()}
          className="absolute right-0 top-10 w-52 overflow-hidden rounded-lg border border-ui-border bg-ui-surface p-1 text-sm shadow-xl"
        >
          {onOpenSettings && (
            <button
              data-cluster-overflow-action="settings"
              type="button"
              role="menuitem"
              onClick={() => {
                onClose();
                onOpenSettings(cluster);
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
                onClose();
                onOpenDelete(cluster);
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
  );
};

const ClusterScopeSummary: React.FC<{ cluster: KubernetesCluster }> = ({ cluster }) => {
  const { t } = useTranslation();
  const scopeSummaryItems = buildClusterScopeSummaryItems(cluster, t);

  return (
    <section aria-label={`${cluster.name} scope summary`} className="overflow-hidden rounded-md bg-ui-bg/30">
      <dl className="grid grid-cols-3 divide-x divide-ui-border/80">
        {scopeSummaryItems.map(({ key, label, value, icon: Icon }) => (
          <div key={key} className="min-w-0 px-2.5 py-2">
            <dt className="type-micro-label flex min-w-0 items-center gap-1.5 text-ui-text-muted">
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">{label}</span>
            </dt>
            <dd className="type-caption mt-0.5 min-w-0 truncate font-semibold text-ui-text" title={value}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

const ClusterSetupPanel: React.FC<{
  cluster: KubernetesCluster;
  onInstallAgent?: (clusterId: string) => void;
}> = ({ cluster, onInstallAgent }) => {
  const { t } = useTranslation();
  const metricItems = [
    { label: t('dashboard.cpu'), Icon: ICONS.Cpu },
    { label: t('dashboard.memory'), Icon: ICONS.HardDrive }
  ];

  return (
    <section data-cluster-card-setup-panel="true" aria-label={t('dashboard.installAgentNamed', { name: cluster.name })} className="shrink-0 overflow-hidden rounded-md bg-ui-bg/35">
      <dl className="grid min-w-0 grid-cols-2 overflow-hidden border-b border-ui-border bg-ui-surface/70">
        {metricItems.map(({ label, Icon }, index) => (
          <div key={label} className={`min-w-0 border-ui-border px-3 py-2.5 ${index === 0 ? 'border-r' : ''}`}>
            <dt className="type-micro-label flex min-w-0 items-center gap-1.5 text-ui-text-muted">
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </dt>
            <dd className="type-caption mt-0.5 min-w-0 font-semibold text-ui-text-muted">{t('dashboard.unavailable')}</dd>
          </div>
        ))}
      </dl>

      <div className="min-w-0 px-3 py-3">
        <div className="relative h-[132px] min-w-0 overflow-hidden px-4 py-3">
          <svg viewBox="0 0 180 108" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-ui-border/60" aria-hidden="true">
            <line x1="0" x2="180" y1="18" y2="18" className="stroke-current" strokeWidth="1" />
            <line x1="0" x2="180" y1="54" y2="54" className="stroke-current" strokeWidth="1" />
            <line x1="0" x2="180" y1="90" y2="90" className="stroke-current" strokeWidth="1" />
          </svg>
          <div className="relative z-10 grid h-full min-w-0 content-center gap-3 text-center sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:text-left">
            <div className="min-w-0">
              <p className="type-row-title text-ui-text">{t('dashboard.agentNotInstalled')}</p>
              <p className="type-caption mt-1 max-w-[21rem] text-ui-text-muted">{t('dashboard.telemetryUnavailableUntilAgentInstalled')}</p>
            </div>
            <Button
              data-cluster-setup-action="install"
              type="button"
              onClick={() => onInstallAgent?.(cluster.id)}
              disabled={!onInstallAgent}
              variant="primary"
              size="sm"
              className="pointer-events-auto relative z-20 w-fit whitespace-nowrap"
            >
              <ICONS.Wrench className="h-3.5 w-3.5" />
              {t('dashboard.installAgent')}
            </Button>
          </div>
        </div>
        <div className="type-caption mt-1.5 grid min-w-0 grid-cols-3 gap-2 font-medium text-ui-text-muted" aria-hidden="true">
          <span className="truncate">{t('dashboard.clusterRegistered')}</span>
          <span className="truncate text-center">{t('dashboard.telemetryPending')}</span>
          <span className="truncate text-right">{t('dashboard.agentRequired')}</span>
        </div>
      </div>
    </section>
  );
};

const ClusterCatalogCard: React.FC<{
  cluster: KubernetesCluster;
  issueSummary?: ControlPlaneTargetIssueSummary;
  now: number;
  openClusterActionMenuId: string | null;
  onToggleClusterActionMenu: (clusterId: string) => void;
  onOpenSettings?: (cluster: KubernetesCluster) => void;
  canDeleteCluster: boolean;
  onOpenDelete: (cluster: KubernetesCluster) => void;
  onSelectKubernetesCluster: (cluster: KubernetesCluster) => void;
  onInstallAgent?: (clusterId: string) => void;
}> = ({
  cluster,
  issueSummary,
  now,
  openClusterActionMenuId,
  onToggleClusterActionMenu,
  onOpenSettings,
  canDeleteCluster,
  onOpenDelete,
  onSelectKubernetesCluster,
  onInstallAgent
}) => {
  const { t } = useTranslation();
  const agentState = getAgentConnectionState(cluster);
  const requiresAgentInstall = agentState === 'not_installed';
  const statusLabel = getClusterStatusLabel(cluster, requiresAgentInstall, t);
  const statusReason = getClusterStateReason(cluster, requiresAgentInstall, issueSummary, t);
  const primaryAction = () => {
    if (requiresAgentInstall) {
      onInstallAgent?.(cluster.id);
      return;
    }
    onSelectKubernetesCluster(cluster);
  };
  const actionLabelNamed = requiresAgentInstall ? t('dashboard.installAgentNamed', { name: cluster.name }) : t('dashboard.viewClusterNamed', { name: cluster.name });

  return (
    <article className="group relative flex min-w-0 self-start flex-col overflow-visible rounded-lg border border-ui-border bg-ui-surface shadow-sm transition-colors hover:border-accent/25 hover:bg-ui-bg">
      <button
        data-cluster-card-primary-action="true"
        type="button"
        disabled={requiresAgentInstall && !onInstallAgent}
        aria-label={actionLabelNamed}
        onClick={primaryAction}
        className="absolute inset-0 z-0 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/25 disabled:cursor-not-allowed"
      />

      <div className="pointer-events-none relative z-10 flex min-w-0 flex-col gap-3 px-4 py-4">
        <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-ui-border bg-ui-bg text-accent-strong">
              <ICONS.Layers className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="type-row-title block min-w-0 break-words text-ui-text [overflow-wrap:anywhere]" title={cluster.name}>{cluster.name}</span>
              <ClusterMetadataLine cluster={cluster} t={t} />
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:justify-end">
            <ClusterStatusPill cluster={cluster} requiresAgentInstall={requiresAgentInstall} label={statusLabel} reason={statusReason} />
            <ClusterActionMenu
              cluster={cluster}
              isOpen={openClusterActionMenuId === cluster.id}
              onToggle={(event) => {
                event.stopPropagation();
                onToggleClusterActionMenu(cluster.id);
              }}
              onClose={() => {
                if (openClusterActionMenuId === cluster.id) {
                  onToggleClusterActionMenu(cluster.id);
                }
              }}
              onOpenSettings={requiresAgentInstall ? undefined : onOpenSettings}
              canDeleteCluster={canDeleteCluster}
              onOpenDelete={onOpenDelete}
            />
          </div>
        </div>

        {requiresAgentInstall ? (
          <ClusterSetupPanel cluster={cluster} onInstallAgent={onInstallAgent} />
        ) : (
          <ClusterTelemetryPanel cluster={cluster} now={now} />
        )}
        <ClusterScopeSummary cluster={cluster} />
      </div>
    </article>
  );
};

const ClusterCatalogEmptyState: React.FC<{ filtered: boolean }> = ({ filtered }) => {
  const { t } = useTranslation();

  return (
    <div className="col-span-full flex min-h-[12rem] items-center justify-center rounded-lg border border-dashed border-ui-border bg-ui-surface px-5 py-8 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-md border border-ui-border bg-ui-bg text-ui-text-muted">
          <ICONS.Search className="h-4 w-4" aria-hidden="true" />
        </div>
        <h3 className="type-row-title text-ui-text">{filtered ? t('dashboard.noMatchingClusters') : t('dashboard.noClusters')}</h3>
        <p className="type-caption mt-1.5 text-ui-text-muted">
          {filtered ? t('dashboard.noMatchingClustersBody') : t('dashboard.noClustersBody')}
        </p>
      </div>
    </div>
  );
};

export const ClusterCatalog: React.FC<ClusterCatalogProps> = ({
  kubernetesClusters,
  totalClusterCount,
  issueSummaryByClusterId = {},
  hasActiveFilter = false,
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

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section data-cluster-catalog-cards="true" aria-label={t('dashboard.clusterCatalog')} className="grid min-w-0 content-start gap-3">
      {controls && (
        <div data-cluster-catalog-controls="true" className="grid min-w-0 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(12rem,14rem)_9.5rem] md:items-center">
          {controls}
          <span className="type-label flex h-11 items-center justify-center whitespace-nowrap rounded-full border border-ui-border bg-ui-bg px-3 text-ui-text-muted">
            {t('dashboard.showingClusters', { count: kubernetesClusters.length, total: clusterTotal })}
          </span>
        </div>
      )}

      <div data-cluster-card-grid="true" className="grid min-w-0 grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
        {kubernetesClusters.length === 0 && <ClusterCatalogEmptyState filtered={hasActiveFilter} />}
        {kubernetesClusters.map((cluster) => {
          const canDeleteCluster = Boolean(onDeleteKubernetesCluster && canDeleteKubernetesCluster?.(cluster));
          return (
            <ClusterCatalogCard
              key={cluster.id}
              cluster={cluster}
              issueSummary={issueSummaryByClusterId[cluster.id]}
              now={now}
              openClusterActionMenuId={openClusterActionMenuId}
              onToggleClusterActionMenu={onToggleClusterActionMenu}
              onOpenSettings={onOpenClusterSettings}
              canDeleteCluster={canDeleteCluster}
              onOpenDelete={onOpenDelete}
              onSelectKubernetesCluster={onSelectKubernetesCluster}
              onInstallAgent={onInstallAgent}
            />
          );
        })}
      </div>
      {footer && <div className="shrink-0">{footer}</div>}
    </section>
  );
};
