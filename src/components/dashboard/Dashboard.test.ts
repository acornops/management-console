import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');
const dashboard = readFileSync(resolve(root, 'src/components/dashboard/Dashboard.tsx'), 'utf8');
const clusterResourceChart = readFileSync(resolve(root, 'src/components/dashboard/ClusterResourceChart.tsx'), 'utf8');
const pendingAgentSetup = readFileSync(resolve(root, 'src/components/common/PendingAgentSetup.tsx'), 'utf8');
const pendingClusterSetup = readFileSync(resolve(root, 'src/components/dashboard/PendingClusterSetup.tsx'), 'utf8');

describe('cluster row action accessibility', () => {
  it('renders clusters as reusable cards while keeping diagnostics as the primary action', () => {
    expect(dashboard).toContain("import { actionCardButtonClassName, cardClassName } from '@/components/common/Card'");
    expect(dashboard).toContain('data-cluster-card-grid="true"');
    expect(dashboard).toContain('className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3"');
    expect(dashboard).toContain('data-cluster-card="true"');
    expect(dashboard).toContain('cardClassName({');
    expect(dashboard).toContain('data-cluster-add-card="true"');
    expect(dashboard).toContain('actionCardButtonClassName({ className:');
    expect(dashboard).toContain("{t('dashboard.addCluster')}");
    expect(dashboard).toContain('className="absolute inset-0 z-0 cursor-pointer');
    expect(dashboard).toContain('data-cluster-row-action="open-diagnostics"');
    expect(dashboard).toContain("aria-label={t('dashboard.openDiagnosticsFor', { name: cluster.name })}");
    expect(dashboard).not.toContain('className="group relative grid gap-4 px-5 py-4');
    expect(dashboard).not.toContain('<div className="divide-y divide-ui-border">');
    expect(dashboard).not.toContain('group-hover:border-accent/30');
    expect(dashboard).not.toContain('<span className="sr-only">{t(\'dashboard.openDiagnostics\')}</span>');
  });

  it('keeps setup and destructive actions in deliberate card controls', () => {
    expect(pendingClusterSetup).toContain('actionDataAttribute="data-cluster-setup-action"');
    expect(dashboard).toContain('data-cluster-overflow-action="toggle"');
    expect(dashboard).toContain('data-cluster-overflow-action="settings"');
    expect(dashboard).toContain('data-cluster-overflow-action="delete"');
    expect(dashboard).toContain('aria-haspopup="menu"');
    expect(dashboard).toContain("aria-label={t('dashboard.clusterActionsFor', { name: cluster.name })}");
    expect(dashboard).toContain("window.addEventListener('click', closeMenu);");
    expect(dashboard).toContain("event.key === 'Escape'");
    expect(dashboard).toContain('className="inline-flex h-10 w-10');
    expect(dashboard).toContain('border border-transparent bg-transparent');
    expect(dashboard).toContain('<ICONS.Layers className="h-5 w-5 text-accent-strong" />');
    expect(dashboard).toContain('className="min-w-0 flex-1 pr-14"');
    expect(dashboard).toContain('className="flex min-w-0 items-center gap-2"');
    expect(dashboard).toContain('type-panel-title min-w-0 flex-1 truncate');
    expect(dashboard).toContain('px-1.5 py-px text-[0.625rem] leading-3');
    expect(dashboard).toContain('flex min-h-10 w-full items-center gap-2');
    expect(dashboard).not.toContain('data-cluster-card-action="delete"');
    expect(dashboard).not.toContain('Cloud className="h-5 w-5 text-accent-strong"');
    expect(dashboard).not.toContain('data-cluster-overflow-action="install"');
    expect(dashboard).not.toContain('data-cluster-row-action="install"');
    expect(dashboard).not.toContain('data-cluster-row-action="delete"');
  });

  it('keeps pending setup cards compact and avoids unknown node metadata', () => {
    expect(dashboard).toContain('<PendingClusterSetup clusterId={cluster.id} onInstallAgent={onInstallAgent} />');
    expect(dashboard).toContain('className="flex items-center gap-3"');
    expect(pendingClusterSetup).toContain('<PendingAgentSetup');
    expect(pendingAgentSetup).toContain('<div className="grid min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)_4.25rem]">');
    expect(pendingAgentSetup).toContain('<ol className="relative mx-auto grid min-h-0 w-full max-w-[22rem] -translate-y-2 grid-cols-2 items-start gap-4 self-center px-2 py-3 before:absolute before:left-[calc(25%+0.875rem)] before:right-[calc(25%+0.875rem)] before:top-[1.625rem] before:h-px before:bg-gradient-to-r before:from-status-success/50 before:via-ui-border before:to-ui-border">');
    expect(pendingAgentSetup).toContain("import { Check, Clock, Wrench } from 'lucide-react'");
    expect(pendingAgentSetup).toContain('<Check className="h-3.5 w-3.5" />');
    expect(pendingAgentSetup).toContain('<Clock className="h-3.5 w-3.5" />');
    expect(pendingAgentSetup).toContain('pending-agent-step-pulse');
    expect(pendingAgentSetup).toContain('ring-[3px] ring-status-success-soft/55');
    expect(pendingAgentSetup).toContain('before:from-status-success/50 before:via-ui-border before:to-ui-border');
    expect(pendingAgentSetup).not.toContain('before:absolute before:-top-3 before:left-4 before:h-3 before:w-px before:bg-ui-border');
    expect(pendingAgentSetup).not.toContain('rounded-lg border border-ui-border bg-ui-bg/60');
    expect(pendingAgentSetup).not.toContain('sm:grid-cols-2');
    expect(pendingClusterSetup).toContain("t('dashboard.clusterRegistered')");
    expect(pendingClusterSetup).toContain("t('dashboard.installAgent')");
    expect(pendingAgentSetup).toContain('className="pointer-events-auto h-[4.25rem] border-t border-ui-border pt-5"');
    expect(pendingAgentSetup).toContain('max-w-md text-sm font-semibold leading-5 text-ui-text-muted');
    expect(pendingAgentSetup).toContain('variant="primary"');
    expect(dashboard).toContain('flex min-h-0 flex-1 flex-col gap-5');
    expect(dashboard).toContain("{(agentConnected || agentState === 'disconnected') && (");
    expect(dashboard).toContain('h-[20rem] min-w-0 flex-col overflow-hidden');
    expect(pendingAgentSetup).toContain('whitespace-nowrap');
    expect(dashboard).not.toContain("t('dashboard.awaitingAgent')");
    expect(dashboard).not.toContain("t('dashboard.telemetryUpdated'");
    expect(dashboard).not.toContain("cluster.nodes[0]?.version || t('common.unknown')");
    expect(dashboard).not.toContain('min-h-[118px] flex-col justify-center gap-3 border-y border-ui-border bg-ui-bg/60');
  });

  it('keeps connected cluster telemetry previews calm and scan-friendly', () => {
    expect(dashboard).toContain("import { ClusterResourceChart, type ClusterMetricPoint } from '@/components/dashboard/ClusterResourceChart'");
    expect(clusterResourceChart).toContain('className="grid h-full min-h-0 flex-1 grid-rows-[minmax(0,1fr)_4.25rem]"');
    expect(clusterResourceChart).toContain("const chartBodyClassName = 'grid min-h-0 grid-rows-[auto_minmax(0,1fr)] pb-3';");
    expect(clusterResourceChart).toContain("label: t('dashboard.nodes')");
    expect(clusterResourceChart).toContain("label: t('dashboard.namespaces')");
    expect(clusterResourceChart).toContain("label: t('dashboard.findings')");
    expect(clusterResourceChart).toContain('cluster.resourceSummary?.nodeCount ?? cluster.nodes.length');
    expect(clusterResourceChart).toContain('cluster.resourceSummary?.namespaceCount ?? cluster.namespaces.length');
    expect(clusterResourceChart).toContain('cluster.resourceSummary?.findingCount ?? cluster.alerts.length');
    expect(clusterResourceChart).toContain('grid h-[4.25rem] grid-cols-3 divide-x divide-ui-border border-t border-ui-border pt-5');
    expect(clusterResourceChart).toContain('className="min-w-0 px-4 sm:px-5"');
    expect(clusterResourceChart).not.toContain('first:pl-0 last:pr-0');
    expect(clusterResourceChart).toContain('const usableMetricPointCount = safePoints.filter');
    expect(clusterResourceChart).toContain('if (usableMetricPointCount < 2)');
    expect(clusterResourceChart).toContain('const paddingX = 2;');
    expect(clusterResourceChart).toContain('const labelY = 102;');
    expect(clusterResourceChart).toContain('className="h-full min-h-0 w-full overflow-visible"');
    expect(dashboard).toContain('className="flex min-h-0 flex-1 flex-col"');
    expect(dashboard).toContain('<ClusterResourceChart cluster={cluster} points={chartPoints} />');
    expect(clusterResourceChart).toContain('const width = 360;');
    expect(clusterResourceChart).toContain('text-[0.6875rem] font-semibold leading-3 text-accent-strong');
    expect(clusterResourceChart).toContain('text-[0.6875rem] font-semibold leading-3 text-metric-blue');
    expect(clusterResourceChart).toContain("t('dashboard.cpu')");
    expect(clusterResourceChart).toContain("t('dashboard.memory')");
    expect(clusterResourceChart).toContain("t('dashboard.core')");
    expect(clusterResourceChart).toContain("t('dashboard.gib')");
    expect(clusterResourceChart).toContain('strokeWidth={2.5}');
    expect(clusterResourceChart).toContain('opacity="0.55"');
    expect(clusterResourceChart).not.toContain('lastUpdatedLabel: string;');
    expect(clusterResourceChart).not.toContain('className="ml-[52px] min-w-0"');
    expect(clusterResourceChart).not.toContain('height + 1');
    expect(dashboard).not.toContain("t('dashboard.updated'");
    expect(dashboard).not.toContain("{t('dashboard.history')} · {t('dashboard.updated', { lastUpdatedLabel })}");
    expect(clusterResourceChart).not.toContain('h-[126px] border-t border-ui-border pt-3');
    expect(clusterResourceChart).not.toContain('h-[118px] border-y border-ui-border bg-ui-bg/60');
    expect(clusterResourceChart).not.toContain('type-micro-label inline-flex items-center gap-1 text-accent-strong');
  });

  it('uses the shared dialog shell for delete-cluster confirmation', () => {
    expect(dashboard).toContain("import { Dialog } from '@/components/common/Dialog'");
    expect(dashboard).toContain("import { Trans, useTranslation } from 'react-i18next'");
    expect(dashboard).toContain('titleId="delete-cluster-title"');
    expect(dashboard).toContain('closeDisabled={isDeletingCluster}');
    expect(dashboard).toContain('i18nKey="dashboard.deleteClusterConfirmationLabel"');
    expect(dashboard).toContain('font-extrabold text-status-danger-text');
  });

  it('loads dashboard metric history through bounded workspace batches', () => {
    expect(dashboard).toContain("import { controlPlaneApi } from '@/services/controlPlaneApi'");
    expect(dashboard).toContain("kubernetesClusters.filter((cluster) => getAgentConnectionState(cluster) === 'connected').slice(0, 6)");
    expect(dashboard).toContain('controlPlaneApi.getWorkspaceClusterMetricsHistory(workspaceId, clusterIds, { window: \'6h\', limit: 48 })');
    expect(dashboard).toContain('metricHistoryByClusterId[cluster.id] ?? cluster.metricHistory ?? []');
  });

  it('uses a defined dashboard label for the cluster count metric', () => {
    expect(dashboard).toContain("t('dashboard.clusters')");
    expect(dashboard).not.toContain("t('cluster.clusters')");
  });

  it('keeps long dashboard cluster names readable with exact-name title access', () => {
    expect(dashboard).toContain('title={cluster.name}');
    expect(dashboard).toContain('type-panel-title min-w-0 flex-1 truncate');
    expect(dashboard).not.toContain('flex min-w-0 flex-wrap items-center gap-2 pr-14');
    expect(dashboard).not.toContain('type-panel-title line-clamp-2 break-words');
  });
});
