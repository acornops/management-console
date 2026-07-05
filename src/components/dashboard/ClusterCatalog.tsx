import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MoreHorizontal, Settings, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getClusterTelemetrySnapshot } from '@/components/dashboard/clusterTelemetryModel';
import { Button } from '@/components/common/Button';
import { Tooltip } from '@/components/common/Tooltip';
import { PendingClusterSetup } from '@/components/dashboard/PendingClusterSetup';
import { ClusterTelemetryPanel } from '@/components/dashboard/ClusterTelemetryPanel';
import { ICONS } from '@/constants';
import type { ControlPlaneTargetIssueSummary } from '@/services/controlPlaneApi';
import { HealthStatus, KubernetesCluster } from '@/types';
import {
  formatLastUpdated,
  getAgentConnectionState,
  getEffectiveHealthStatus,
  getTelemetryFreshness
} from '@/utils/telemetry';
interface ReadinessItem {
  label: string;
  value: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger';
}
type ResourceFamilyKey = 'workloads' | 'network' | 'storage' | 'cluster';
interface ResourceFamilyItem {
  key: ResourceFamilyKey;
  label: string;
  value: number;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}
interface ClusterCatalogProps {
  kubernetesClusters: KubernetesCluster[];
  clusterCount: number;
  issueSummaryByClusterId?: Record<string, ControlPlaneTargetIssueSummary | undefined>;
  hasActiveFilter?: boolean;
  controls?: React.ReactNode;
  footer?: React.ReactNode;
  selectedCluster?: KubernetesCluster;
  openClusterActionMenuId: string | null;
  onSelectedClusterIdChange: (clusterId: string) => void;
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
  if (requiresAgentInstall || status === HealthStatus.GREEN) {
    return 'border-ui-border bg-ui-bg text-ui-text-muted';
  }
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
function getResourceFamilyCount(cluster: KubernetesCluster, family: ResourceFamilyKey): number {
  const summaryCount = cluster.resourceSummary?.resourceFamilyCounts?.[family];
  if (typeof summaryCount === 'number' && Number.isFinite(summaryCount)) return summaryCount;

  if (family === 'workloads') return cluster.workloads.length;
  if (family === 'network') return cluster.services.length + cluster.ingresses.length;
  if (family === 'storage') return cluster.pvcs.length;
  return cluster.nodes.length + cluster.namespaces.length;
}

function readinessToneClass(tone: ReadinessItem['tone']): string {
  if (tone === 'success') return 'text-status-success-text';
  if (tone === 'warning') return 'text-status-warning-text';
  if (tone === 'danger') return 'text-status-danger-text';
  return 'text-ui-text-muted';
}

function attentionToneClass(tone: ReadinessItem['tone']): string {
  if (tone === 'danger') return 'border-status-danger/25 bg-status-danger-soft text-status-danger-text';
  if (tone === 'warning') return 'border-status-warning/25 bg-status-warning-soft text-status-warning-text';
  return 'border-ui-border bg-ui-bg text-ui-text-muted';
}

function interactiveAttentionClass(tone: ReadinessItem['tone']): string {
  if (tone === 'danger') return `${attentionToneClass(tone)} hover:border-status-danger/40 hover:bg-status-danger-soft hover:text-status-danger-text`;
  if (tone === 'warning') return `${attentionToneClass(tone)} hover:border-status-warning/40 hover:bg-status-warning-soft hover:text-status-warning-text`;
  return `${attentionToneClass(tone)} hover:border-ui-border hover:bg-ui-bg/80 hover:text-ui-text`;
}

function buildScopePolicyItems(cluster: KubernetesCluster, t: (key: string, options?: Record<string, unknown>) => string): ReadinessItem[] {
  const writeConfirmationRequired = cluster.writeConfirmationPolicy?.effectiveRequired ?? true;
  return [
    {
      label: t('dashboard.namespaceScope'),
      value: getClusterScopeLabel(cluster, t),
      tone: 'neutral'
    },
    {
      label: t('dashboard.writeConfirmation'),
      value: writeConfirmationRequired ? t('clusterSetup.writeConfirmationsRequired') : t('clusterSetup.writeConfirmationsNotRequired'),
      tone: writeConfirmationRequired ? 'success' : 'warning'
    }
  ];
}

function buildResourceFamilyItems(cluster: KubernetesCluster, t: (key: string) => string): ResourceFamilyItem[] {
  return [
    {
      key: 'workloads',
      label: t('resources.families.workloads'),
      value: getResourceFamilyCount(cluster, 'workloads'),
      icon: ICONS.Box
    },
    {
      key: 'network',
      label: t('resources.families.network'),
      value: getResourceFamilyCount(cluster, 'network'),
      icon: ICONS.Globe
    },
    {
      key: 'storage',
      label: t('resources.families.storage'),
      value: getResourceFamilyCount(cluster, 'storage'),
      icon: ICONS.HardDrive
    },
    {
      key: 'cluster',
      label: t('resources.families.cluster'),
      value: getResourceFamilyCount(cluster, 'cluster'),
      icon: ICONS.Layers
    }
  ];
}

const ClusterStatusPill: React.FC<{ cluster: KubernetesCluster; requiresAgentInstall: boolean; label: string }> = ({ cluster, requiresAgentInstall, label }) => (
  <span className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[0.6875rem] font-bold uppercase leading-4 tracking-[0.08em] ${getClusterStatusClass(cluster, requiresAgentInstall)}`}>
    <span className="min-w-0 truncate">{label}</span>
  </span>
);

const ClusterMetadataLine: React.FC<{ cluster: KubernetesCluster; t: (key: string, options?: Record<string, unknown>) => string }> = ({ cluster, t }) => {
  const items = [
    cluster.cluster && cluster.cluster !== cluster.name ? cluster.cluster : null,
    cluster.namespace && cluster.namespace !== 'all' ? t('dashboard.clusterAgentNamespace', { namespace: cluster.namespace }) : null
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <span className="type-caption mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-ui-text-muted">
      {items.map((item, index) => (
        <span key={item} className="inline-flex min-w-0 items-center gap-x-2">
          {index > 0 && <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-ui-text-muted" />}
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">{item}</span>
        </span>
      ))}
    </span>
  );
};

const ClusterCardFact: React.FC<{
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  tone?: 'neutral' | 'danger' | 'warning';
}> = ({ label, value, icon: Icon, tone = 'neutral' }) => {
  const toneClassName = tone === 'danger'
    ? 'text-status-danger-text'
    : tone === 'warning'
      ? 'text-status-warning-text'
      : 'text-ui-text';

  return (
    <div className="grid min-h-[3.75rem] min-w-0 content-start gap-0.5 rounded-md border border-ui-border bg-ui-bg/55 px-2.5 py-2" title={`${label}: ${String(value)}`}>
      <dt className="type-micro-label flex min-w-0 items-center gap-1.5 text-ui-text-muted">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 break-words [overflow-wrap:anywhere]">{label}</span>
      </dt>
      <dd className={`type-caption min-w-0 break-words font-semibold ${toneClassName} [overflow-wrap:anywhere]`}>{value}</dd>
    </div>
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
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-ui-border bg-ui-surface text-ui-text-muted shadow-sm transition-colors hover:border-accent/30 hover:bg-ui-bg hover:text-ui-text active:bg-ui-bg/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
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

const ClusterCatalogCard: React.FC<{
  cluster: KubernetesCluster;
  issueSummary?: ControlPlaneTargetIssueSummary;
  selected: boolean;
  now: number;
  openClusterActionMenuId: string | null;
  onSelectedClusterIdChange: (clusterId: string) => void;
  onToggleClusterActionMenu: (clusterId: string) => void;
  onOpenSettings?: (cluster: KubernetesCluster) => void;
  canDeleteCluster: boolean;
  onOpenDelete: (cluster: KubernetesCluster) => void;
  onSelectKubernetesCluster: (cluster: KubernetesCluster) => void;
  onInstallAgent?: (clusterId: string) => void;
}> = ({
  cluster,
  issueSummary,
  selected,
  now,
  openClusterActionMenuId,
  onSelectedClusterIdChange,
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
  const issueValue = issueSummary ? issueSummary.total : '-';
  const issueTone = issueSummary && issueSummary.critical > 0
    ? 'danger'
    : issueSummary && issueSummary.warning > 0
      ? 'warning'
      : 'neutral';
  const telemetryFreshness = getTelemetryFreshness(cluster);
  const telemetryToneClassName = telemetryFreshness === 'offline'
    ? 'text-status-danger-text'
    : telemetryFreshness === 'stale'
      ? 'text-status-warning-text'
      : 'text-ui-text-muted';
  const telemetrySnapshot = getClusterTelemetrySnapshot(cluster);

  return (
    <article className={`group relative shrink-0 overflow-visible rounded-lg border transition-colors ${selected ? 'border-accent/45 bg-ui-surface outline outline-1 -outline-offset-1 outline-accent/35 ring-2 ring-accent/10 shadow-sm' : 'border-ui-border bg-ui-surface hover:border-accent/20 hover:bg-ui-bg'}`}>
      <button
        data-cluster-card-select="true"
        type="button"
        aria-current={selected ? 'true' : undefined}
        aria-pressed={selected}
        aria-label={`Select cluster ${cluster.name}${selected ? ', selected' : ''}`}
        onClick={() => onSelectedClusterIdChange(cluster.id)}
        className="absolute inset-0 z-0 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/25"
      />
      <div className="pointer-events-none relative z-10 grid min-w-0 gap-2.5 px-3.5 py-3">
        <div className="grid min-w-0 gap-x-3 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-ui-border bg-ui-bg text-accent-strong">
              <ICONS.Layers className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="type-row-title block min-w-0 break-words text-ui-text [overflow-wrap:anywhere]" title={cluster.name}>{cluster.name}</span>
              <ClusterMetadataLine cluster={cluster} t={t} />
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:justify-end">
            <ClusterStatusPill cluster={cluster} requiresAgentInstall={requiresAgentInstall} label={statusLabel} />
            <Tooltip content={requiresAgentInstall ? t('dashboard.installAgent') : t('dashboard.viewCluster')}>
              <button data-cluster-row-action={requiresAgentInstall ? 'install-agent' : 'view'} type="button" disabled={requiresAgentInstall && !onInstallAgent} className="pointer-events-auto relative z-20 inline-flex h-8 w-8 items-center justify-center rounded-md border border-ui-border bg-ui-surface text-ui-text-muted shadow-sm transition-colors hover:border-accent/30 hover:bg-ui-bg hover:text-accent-strong active:bg-ui-bg/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-55" aria-label={requiresAgentInstall ? t('dashboard.installAgentNamed', { name: cluster.name }) : t('dashboard.viewClusterNamed', { name: cluster.name })} onClick={(event) => { event.stopPropagation(); requiresAgentInstall ? onInstallAgent?.(cluster.id) : onSelectKubernetesCluster(cluster); }}>
                {requiresAgentInstall ? <ICONS.Wrench className="h-4 w-4" aria-hidden="true" /> : <ICONS.Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </Tooltip>
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

        <p className="type-caption min-w-0 break-words text-ui-text-muted [overflow-wrap:anywhere]" title={getClusterStateReason(cluster, requiresAgentInstall, issueSummary, t)}>
          {getClusterStateReason(cluster, requiresAgentInstall, issueSummary, t)}
        </p>

        <dl className="grid min-w-0 grid-cols-2 gap-1.5 lg:grid-cols-4">
          <ClusterCardFact label={t('dashboard.cpu')} value={telemetrySnapshot.cpuDisplay} icon={ICONS.Cpu} />
          <ClusterCardFact label={t('dashboard.memory')} value={telemetrySnapshot.memoryDisplay} icon={ICONS.HardDrive} />
          <ClusterCardFact label={t('dashboard.issues')} value={issueValue} icon={ICONS.Shield} tone={issueTone} />
          <ClusterCardFact label={t('dashboard.updated')} value={formatLastUpdated(cluster.lastUpdate, now)} icon={ICONS.Activity} tone={telemetryToneClassName.includes('danger') ? 'danger' : telemetryToneClassName.includes('warning') ? 'warning' : 'neutral'} />
        </dl>
      </div>
    </article>
  );
};

const ClusterInspector: React.FC<{
  cluster: KubernetesCluster;
  issueSummary?: ControlPlaneTargetIssueSummary;
  now: number;
  onSelectKubernetesCluster: (cluster: KubernetesCluster) => void;
  onInstallAgent?: (clusterId: string) => void;
}> = ({ cluster, issueSummary, now, onSelectKubernetesCluster, onInstallAgent }) => {
  const { t } = useTranslation();
  const agentState = getAgentConnectionState(cluster);
  const requiresAgentInstall = agentState === 'not_installed';
  const statusReason = getClusterStateReason(cluster, requiresAgentInstall, issueSummary, t);
  const issueCount = issueSummary?.total ?? 0;
  const scopePolicyItems = buildScopePolicyItems(cluster, t);
  const resourceFamilyItems = buildResourceFamilyItems(cluster, t);
  const attentionTone: ReadinessItem['tone'] = !requiresAgentInstall && (Number(issueSummary?.critical || 0) > 0 || getEffectiveHealthStatus(cluster) === HealthStatus.RED || agentState === 'disconnected')
    ? 'danger'
    : !requiresAgentInstall && (Number(issueSummary?.warning || 0) > 0 || getEffectiveHealthStatus(cluster) === HealthStatus.YELLOW)
      ? 'warning'
      : 'neutral';

  return (
    <aside data-cluster-display-panel="true" className="min-w-0 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm xl:flex xl:h-full xl:min-h-0 xl:flex-col">
      <div className="shrink-0 border-b border-ui-border px-5 py-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-ui-border bg-ui-bg text-accent-strong">
                <ICONS.Layers className="h-4 w-4" />
              </div>
              <h2 className="type-panel-title min-w-0 truncate text-ui-text" title={cluster.name}>{cluster.name}</h2>
            </div>
            <div className="ml-[3.125rem] min-w-0">
              <ClusterMetadataLine cluster={cluster} t={t} />
            </div>
          </div>
          <Button data-cluster-display-action={requiresAgentInstall ? 'install-agent' : 'view'} type="button" size="sm" variant="accent" className="shrink-0" onClick={() => { requiresAgentInstall ? onInstallAgent?.(cluster.id) : onSelectKubernetesCluster(cluster); }} disabled={requiresAgentInstall && !onInstallAgent} aria-label={requiresAgentInstall ? t('dashboard.installAgentNamed', { name: cluster.name }) : t('dashboard.viewClusterNamed', { name: cluster.name })}>
            {requiresAgentInstall ? <ICONS.Wrench className="h-4 w-4" aria-hidden="true" /> : <ICONS.Eye className="h-4 w-4" aria-hidden="true" />}
            {requiresAgentInstall ? t('dashboard.installAgent') : t('dashboard.viewCluster')}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-3 px-5 py-4 xl:flex-1 xl:overflow-hidden">
        {issueCount > 0 ? (
          <button data-cluster-issue-banner-action="view-overview" type="button" className={`shrink-0 rounded-md border px-3.5 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${interactiveAttentionClass(attentionTone)}`} onClick={() => onSelectKubernetesCluster(cluster)} aria-label={t('dashboard.viewClusterIssuesNamed', { name: cluster.name })}>
            <span className="flex min-w-0 items-start gap-2.5">
              <ICONS.AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="type-caption block min-w-0 font-semibold">{statusReason}</span>
            </span>
          </button>
        ) : requiresAgentInstall ? (
          <button data-cluster-setup-banner-action="install-agent" type="button" disabled={!onInstallAgent} className={`shrink-0 rounded-md border px-3.5 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-60 ${attentionToneClass(attentionTone)} hover:border-accent/30 hover:bg-ui-bg hover:text-ui-text`} onClick={() => onInstallAgent?.(cluster.id)} aria-label={t('dashboard.installAgentNamed', { name: cluster.name })}>
            <span className="flex min-w-0 items-start gap-2.5">
              <ICONS.AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="type-caption block min-w-0 font-semibold">{statusReason}</span>
            </span>
          </button>
        ) : (
          <section className={`shrink-0 rounded-md border px-3.5 py-2.5 ${attentionToneClass(attentionTone)}`}>
            <div className="flex min-w-0 items-start gap-2.5">
              <ICONS.AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="type-caption font-semibold">{statusReason}</p>
              </div>
            </div>
          </section>
        )}

        {requiresAgentInstall && <PendingClusterSetup clusterId={cluster.id} onInstallAgent={onInstallAgent} />}

        {!requiresAgentInstall && <ClusterTelemetryPanel cluster={cluster} now={now} />}

        <section aria-label={`${cluster.name} scope and safeguards`} className="shrink-0">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <h3 className="type-row-title">{t('dashboard.scopeAndSafeguards')}</h3>
          </div>
          <dl className="grid gap-2 sm:grid-cols-2">
            {scopePolicyItems.map((item) => (
              <div
                key={item.label}
                className="min-w-0 rounded-md border border-ui-border bg-ui-bg/35 px-3 py-2"
              >
                <dt className="type-micro-label min-w-0 break-words text-ui-text-muted [overflow-wrap:anywhere]" title={item.label}>{item.label}</dt>
                <dd className={`type-caption mt-0.5 min-w-0 break-words font-semibold ${readinessToneClass(item.tone)} [overflow-wrap:anywhere]`} title={item.value}>{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-label={`${cluster.name} resource families`} className="shrink-0">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <h3 className="type-row-title">{t('resources.families.label')}</h3>
            <span className="type-micro-label text-ui-text-muted">
              {cluster.resourceSummary?.resourceCount ?? resourceFamilyItems.reduce((total, item) => total + item.value, 0)}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            {resourceFamilyItems.map(({ key, label, value, icon: Icon }) => (
              <div key={key} className="min-w-0 rounded-md border border-ui-border bg-ui-bg/35 px-3 py-2">
                <dt className="type-caption flex min-w-0 items-center gap-1.5 text-ui-text-muted">
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 truncate">{label}</span>
                </dt>
                <dd className="mt-0.5 text-base font-semibold tracking-tight text-ui-text">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </aside>
  );
};

const ClusterSelectionGuide: React.FC<{ clusterCount: number }> = ({ clusterCount }) => {
  const { t } = useTranslation();
  const guideItems = [
    { label: t('dashboard.scopeAndSafeguards'), value: t('dashboard.selectClusterScope'), Icon: ICONS.Shield },
    { label: t('dashboard.telemetry'), value: t('dashboard.selectClusterTelemetry'), Icon: ICONS.Activity },
    { label: t('app.inventory'), value: t('dashboard.selectClusterInventory'), Icon: ICONS.LayoutGrid }
  ];

  return (
    <aside data-cluster-display-panel-empty="true" className="flex min-w-0 items-center justify-center rounded-lg border border-ui-border bg-ui-surface px-6 py-8 shadow-sm xl:h-full xl:min-h-0">
      <div className="grid max-w-sm justify-items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-ui-border bg-ui-bg text-ui-text-muted">
          <ICONS.Layers className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="type-section-title text-ui-text">{t('dashboard.selectClusterTitle')}</h2>
          <p className="type-caption mt-2 leading-5 text-ui-text-muted">
            {t('dashboard.selectClusterBody', { count: clusterCount })}
          </p>
        </div>
        <dl className="grid w-full gap-2">
          {guideItems.map(({ label, value, Icon }) => (
            <div key={label} className="grid gap-0.5 rounded-md border border-ui-border bg-ui-bg/35 px-3 py-2">
              <dt className="type-caption flex items-center gap-2 font-semibold text-ui-text">
                <Icon className="h-3.5 w-3.5 shrink-0 text-ui-text-muted" aria-hidden="true" />
                {label}
              </dt>
              <dd className="type-caption text-ui-text-muted">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </aside>
  );
};

const ClusterCatalogEmptyState: React.FC<{ filtered: boolean }> = ({ filtered }) => {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[12rem] shrink-0 items-center justify-center rounded-lg border border-dashed border-ui-border bg-ui-surface px-5 py-8 text-center">
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
  clusterCount,
  issueSummaryByClusterId = {},
  hasActiveFilter = false,
  controls,
  footer,
  selectedCluster,
  openClusterActionMenuId,
  onSelectedClusterIdChange,
  onToggleClusterActionMenu,
  onOpenDelete,
  onSelectKubernetesCluster,
  onInstallAgent,
  onOpenClusterSettings,
  canDeleteKubernetesCluster,
  onDeleteKubernetesCluster
}) => {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="grid min-w-0 gap-5 xl:h-full xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(28rem,0.82fr)_minmax(30rem,0.88fr)] xl:items-stretch xl:overflow-hidden">
      <section data-cluster-catalog-cards="true" aria-label={t('dashboard.clusterCatalog')} className="flex min-w-0 w-full max-w-full flex-col gap-2.5 xl:h-full xl:min-h-0 xl:overflow-hidden">
        <div className="grid min-w-0 shrink-0 gap-2">
          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <h2 className="type-row-title text-ui-text">{t('dashboard.clusterCatalog')}</h2>
            </div>
            <div className="type-caption font-semibold text-ui-text-muted">
              {t('dashboard.showingClusters', { count: kubernetesClusters.length, total: clusterCount })}
            </div>
          </div>
          {controls && (
            <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,0.42fr)]">
              {controls}
            </div>
          )}
        </div>
        <div data-cluster-card-scroll-region="true" className="flex min-h-0 flex-col gap-2.5 overflow-y-auto pb-1 pr-2 custom-scrollbar stable-scrollbar-gutter xl:flex-1 cluster-catalog-scrollbar xl:pr-3">
          {kubernetesClusters.length === 0 && <ClusterCatalogEmptyState filtered={hasActiveFilter} />}
          {kubernetesClusters.map((cluster) => {
            const selected = cluster.id === selectedCluster?.id;
            const canDeleteCluster = Boolean(onDeleteKubernetesCluster && canDeleteKubernetesCluster?.(cluster));
            return (
              <ClusterCatalogCard
                key={cluster.id}
                cluster={cluster}
                issueSummary={issueSummaryByClusterId[cluster.id]}
                selected={selected}
                now={now}
                openClusterActionMenuId={openClusterActionMenuId}
                onSelectedClusterIdChange={onSelectedClusterIdChange}
                onToggleClusterActionMenu={onToggleClusterActionMenu}
                onOpenSettings={onOpenClusterSettings}
                canDeleteCluster={canDeleteCluster}
                onOpenDelete={onOpenDelete}
                onSelectKubernetesCluster={onSelectKubernetesCluster}
                onInstallAgent={onInstallAgent}
              />
            );
          })}
          {footer && <div className="shrink-0">{footer}</div>}
        </div>
      </section>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={selectedCluster?.id ?? 'cluster-selection-guide'}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={shouldReduceMotion ? { duration: 0.01 } : { duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          className="min-w-0 xl:h-full xl:min-h-0"
        >
          {selectedCluster ? (
            <ClusterInspector
              cluster={selectedCluster}
              issueSummary={issueSummaryByClusterId[selectedCluster.id]}
              now={now}
              onSelectKubernetesCluster={onSelectKubernetesCluster}
              onInstallAgent={onInstallAgent}
            />
          ) : (
            <ClusterSelectionGuide clusterCount={clusterCount} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
