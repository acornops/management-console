import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');
const dashboard = readFileSync(resolve(root, 'src/components/dashboard/Dashboard.tsx'), 'utf8');

describe('cluster row action accessibility', () => {
  it('renders clusters as reusable cards while keeping diagnostics as the primary action', () => {
    expect(dashboard).toContain("import { actionCardButtonClassName, cardClassName } from '@/components/common/Card'");
    expect(dashboard).toContain('data-cluster-card-grid="true"');
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

  it('keeps setup and destructive actions out of the card footer', () => {
    expect(dashboard).toContain('data-cluster-setup-action="install"');
    expect(dashboard).toContain('data-cluster-card-action="delete"');
    expect(dashboard).not.toContain('data-cluster-overflow-action="toggle"');
    expect(dashboard).not.toContain('data-cluster-overflow-action="delete"');
    expect(dashboard).not.toContain('aria-haspopup="menu"');
    expect(dashboard).not.toContain('data-cluster-row-action="install"');
    expect(dashboard).not.toContain('data-cluster-row-action="delete"');
    expect(dashboard).not.toContain('border-t border-ui-border bg-ui-bg/45');
  });

  it('uses the shared dialog shell for delete-cluster confirmation', () => {
    expect(dashboard).toContain("import { Dialog } from '@/components/common/Dialog'");
    expect(dashboard).toContain('titleId="delete-cluster-title"');
    expect(dashboard).toContain('closeDisabled={isDeletingCluster}');
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
    expect(dashboard).toContain('type-panel-title truncate');
    expect(dashboard).not.toContain('type-panel-title line-clamp-2 break-words');
  });
});
