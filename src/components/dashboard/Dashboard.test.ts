import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');
const dashboard = readFileSync(resolve(root, 'src/components/dashboard/Dashboard.tsx'), 'utf8');
const clusterCatalog = readFileSync(resolve(root, 'src/components/dashboard/ClusterCatalog.tsx'), 'utf8');
const clusterTelemetryPanel = readFileSync(resolve(root, 'src/components/dashboard/ClusterTelemetryPanel.tsx'), 'utf8');
const kubernetesClustersPage = readFileSync(resolve(root, 'src/pages/KubernetesClustersPage.tsx'), 'utf8');

describe('cluster catalog layout', () => {
  it('keeps canonical route composition alongside route-backed operational filters', () => {
    expect(dashboard).toContain('<PageShell>');
    expect(dashboard).toContain('<PageHeader');
    expect(dashboard).not.toContain('data-cluster-inventory-summary="true"');
    expect(dashboard).not.toContain('globalStatus');
    expect(dashboard).toContain('className="mb-6 flex min-w-0 w-full max-w-full flex-col gap-4"');
    expect(dashboard).toContain('{catalogTabs}');
    expect(kubernetesClustersPage).toContain('<ResourceCategoryTabs<ClusterCatalogStatusFilter>');
    expect(kubernetesClustersPage).toContain("'attention'");
    expect(kubernetesClustersPage).toContain("'healthy'");
    expect(kubernetesClustersPage).toContain('function clusterNeedsAttention');
    expect(kubernetesClustersPage).toContain("t('dashboard.needsAttention')");
    expect(kubernetesClustersPage).not.toContain('<Select<typeof status>');
  });

  it('renders a compact responsive operational card grid', () => {
    expect(dashboard).toContain("import { ClusterCatalog } from '@/components/dashboard/ClusterCatalog'");
    expect(clusterCatalog).toContain('data-cluster-card-grid="true"');
    expect(clusterCatalog).toContain('className="grid min-w-0 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3"');
    expect(clusterCatalog).toContain('const ClusterCatalogCard: React.FC');
    expect(clusterCatalog).toContain('group relative flex min-w-0 flex-col overflow-visible rounded-lg border border-ui-border bg-ui-surface shadow-sm');
    expect(clusterCatalog).not.toContain('data-cluster-desktop-table="true"');
    expect(clusterCatalog).not.toContain('<table');
    expect(clusterCatalog).toContain('<ClusterTelemetryPanel cluster={cluster} now={now} compact loadState={props.metricLoadState} />');
    expect(clusterCatalog).toContain('const ClusterOperationalDetails: React.FC');
    expect(clusterCatalog).toContain("t('dashboard.writeGuard')");
    expect(clusterCatalog).toContain('data-cluster-setup-telemetry="true"');
    expect(clusterCatalog).not.toContain('bg-ui-bg/45');
    expect(clusterCatalog).not.toContain('bg-ui-bg/25');
    expect(clusterCatalog).toContain('data-cluster-card-primary-action="true"');
    expect(clusterCatalog).toContain('flex min-w-0 flex-1 items-center gap-3');
    expect(clusterCatalog).toContain('-mt-4 hidden pb-3 pl-16 pr-4 xl:block 2xl:hidden');
    expect(clusterCatalog).toContain('cursor-pointer rounded-lg text-left');
    expect(clusterCatalog).toContain('mx-4 grid grid-cols-3 gap-3 border-t border-ui-border/60 pb-4 pt-3');
    expect(clusterCatalog).not.toContain('grid grid-cols-3 divide-x');
    expect(clusterTelemetryPanel).toContain('data-cluster-telemetry-panel="compact"');
    expect(clusterTelemetryPanel).toContain('className="shrink-0 px-4 pb-3"');
  });

  it('keeps AIOps evidence visible and sorts exceptions first', () => {
    expect(clusterCatalog).toContain('function getClusterPriority');
    expect(clusterCatalog).toContain('getClusterPriority(left, issueSummaryByClusterId[left.id])');
    expect(clusterCatalog).toContain('window.setInterval(() => setNow(Date.now()), 1000)');
    expect(clusterCatalog).toContain("t('dashboard.clusterStateCriticalIssues', { count: issueSummary.critical })");
    expect(clusterCatalog).toContain("t('dashboard.clusterStateWarningIssues', { count: issueSummary.warning })");
    expect(clusterCatalog).toContain("t('dashboard.criticalStatus', { count: issueSummary?.critical })");
    expect(clusterCatalog).toContain("t('dashboard.warningStatus', { count: issueSummary?.warning })");
    expect(clusterCatalog).toContain("t('dashboard.clusterStateClear')");
    expect(clusterCatalog).toContain('{view.statusReason}');
    expect(clusterCatalog).toContain("t('dashboard.investigate')");
    expect(clusterTelemetryPanel).toContain('formatCompactRelativeTime(cluster.lastUpdate, { now })');
    expect(clusterTelemetryPanel).toContain('data-cluster-telemetry-panel="compact"');
  });

  it('matches the resource explorer toolbar grammar', () => {
    expect(clusterCatalog).toContain('data-cluster-catalog-controls="true"');
    expect(clusterCatalog).toContain('rounded-lg border border-ui-border bg-ui-surface px-4 py-4 shadow-sm');
    expect(clusterCatalog).toContain('h-11 min-h-11');
    expect(kubernetesClustersPage).toContain("import { Search } from 'lucide-react'");
    expect(kubernetesClustersPage).toContain('className="w-full pl-11 lg:w-full"');
  });

  it('shows trustworthy counts in the shared tab treatment', () => {
    expect(kubernetesClustersPage).toContain('const hasCompleteCatalogCounts =');
    expect(kubernetesClustersPage).toContain('const catalogCounts = useMemo');
    expect(kubernetesClustersPage).toContain('if (!hasCompleteCatalogCounts || !hasCompleteIssueSummaries) return counts;');
    expect(kubernetesClustersPage).toContain('counts={catalogCounts}');
  });

  it('offers one explicit primary action plus deliberate overflow actions', () => {
    expect(clusterCatalog).toContain('data-cluster-card-primary-action="true"');
    expect(clusterCatalog).toContain('data-cluster-setup-action="install"');
    expect(clusterCatalog).toContain('data-cluster-overflow-action="toggle"');
    expect(clusterCatalog).toContain('pointer-events-auto relative z-20');
    expect(clusterCatalog).toContain('data-cluster-overflow-action="settings"');
    expect(clusterCatalog).toContain('data-cluster-overflow-action="delete"');
    expect(clusterCatalog).toContain('aria-haspopup="menu"');
    expect(dashboard).toContain("event.key === 'Escape'");
  });

  it('retains the detailed telemetry component for drill-down use', () => {
    expect(clusterTelemetryPanel).toContain('export const ClusterTelemetryPanel: React.FC');
    expect(clusterTelemetryPanel).toContain('function getSparklineGapThreshold');
    expect(clusterTelemetryPanel).toContain('formatCompactRelativeTime');
  });

  it('keeps loading, deletion, and issue summaries wired to the catalog', () => {
    expect(kubernetesClustersPage).toContain('function mergeClustersById');
    expect(kubernetesClustersPage).toContain('deletedClusterIdsRef.current.add(cluster.id);');
    expect(kubernetesClustersPage).toContain('setIssueSummaryByClusterId');
    expect(kubernetesClustersPage).toContain('getTargetIssueSummary');
    expect(kubernetesClustersPage).toContain('issueSummaryByClusterId={issueSummaryByClusterId}');
    expect(kubernetesClustersPage).toContain('catalogLoadError={catalogLoadError}');
    expect(kubernetesClustersPage).toContain('const workerCount = Math.min(6, kubernetesClusters.length);');
    expect(kubernetesClustersPage).toContain("window.addEventListener('focus', handleFocus)");
    expect(clusterCatalog).toContain('role="tabpanel"');
    expect(clusterCatalog).toContain("t('dashboard.clusterLoadFailed')");
    expect(clusterTelemetryPanel).toContain("t('dashboard.telemetryLoadFailed')");
    expect(clusterCatalog).toContain("t('dashboard.clusterStateIssuesUnavailable')");
    expect(clusterCatalog).toContain("t('dashboard.clusterStateIssuesRefreshFailed')");
  });
});
