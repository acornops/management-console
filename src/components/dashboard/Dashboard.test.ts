import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');
const dashboard = readFileSync(resolve(root, 'src/components/dashboard/Dashboard.tsx'), 'utf8');
const clusterCatalog = readFileSync(resolve(root, 'src/components/dashboard/ClusterCatalog.tsx'), 'utf8');
const clusterTelemetryPanel = readFileSync(resolve(root, 'src/components/dashboard/ClusterTelemetryPanel.tsx'), 'utf8');
const kubernetesClustersPage = readFileSync(resolve(root, 'src/pages/KubernetesClustersPage.tsx'), 'utf8');
const discoveryFilterBar = readFileSync(resolve(root, 'src/components/common/DiscoveryFilterBar.tsx'), 'utf8');
const searchFilterFrame = readFileSync(resolve(root, 'src/components/common/SearchFilterFrame.tsx'), 'utf8');
const emptyState = readFileSync(resolve(root, 'src/components/common/EmptyState.tsx'), 'utf8');
const targetCatalogPrimitives = readFileSync(resolve(root, 'src/features/targets/catalog/TargetCatalogPrimitives.tsx'), 'utf8');
const useCatalogNow = readFileSync(resolve(root, 'src/features/targets/catalog/useCatalogNow.ts'), 'utf8');
const useTargetIssueSummaries = readFileSync(resolve(root, 'src/features/targets/catalog/useTargetIssueSummaries.ts'), 'utf8');

describe('cluster catalog layout', () => {
  it('keeps canonical route composition alongside route-backed operational filters', () => {
    expect(dashboard).toContain('<PageShell>');
    expect(dashboard).toContain('<PageHeader');
    expect(dashboard).not.toContain('data-cluster-inventory-summary="true"');
    expect(dashboard).not.toContain('globalStatus');
    expect(dashboard).not.toContain('{catalogTabs}');
    expect(kubernetesClustersPage).toContain('<DiscoveryFilterBar');
    expect(kubernetesClustersPage).toContain('createDiscoveryFilterGroup<ClusterCatalogStatusFilter>');
    expect(kubernetesClustersPage).toContain("'attention'");
    expect(kubernetesClustersPage).toContain("'healthy'");
    expect(kubernetesClustersPage).toContain('function clusterNeedsAttention');
    expect(kubernetesClustersPage).toContain("t('dashboard.needsAttention')");
    expect(kubernetesClustersPage).not.toContain('<ResourceCategoryTabs<ClusterCatalogStatusFilter>');
  });

  it('renders a compact responsive operational card grid', () => {
    expect(dashboard).toContain("import { ClusterCatalog } from '@/components/dashboard/ClusterCatalog'");
    expect(clusterCatalog).toContain('data-cluster-card-grid="true"');
    expect(clusterCatalog).toContain('className="grid min-w-0 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3"');
    expect(clusterCatalog).toContain('const ClusterCatalogCard: React.FC');
    expect(clusterCatalog).toContain('<TargetCatalogCard');
    expect(targetCatalogPrimitives).toContain('group relative flex min-w-0 flex-col overflow-visible rounded-lg border border-ui-border bg-ui-surface shadow-sm');
    expect(clusterCatalog).not.toContain('data-cluster-desktop-table="true"');
    expect(clusterCatalog).not.toContain('<table');
    expect(clusterCatalog).toContain('<ClusterTelemetryPanel cluster={cluster} now={now} compact loadState={props.metricLoadState} onRetry={props.onRetryTelemetry} />');
    expect(clusterCatalog).toContain('const ClusterOperationalDetails: React.FC');
    expect(clusterCatalog).toContain("t('dashboard.writeGuard')");
    expect(clusterCatalog).toContain('data-cluster-setup-telemetry="true"');
    expect(clusterCatalog).not.toContain('bg-ui-bg/45');
    expect(clusterCatalog).not.toContain('bg-ui-bg/25');
    expect(targetCatalogPrimitives).toContain("'data-cluster-card-primary-action': 'true'");
    expect(clusterCatalog).toContain('flex min-w-0 flex-1 items-center gap-3');
    expect(clusterCatalog).toContain('-mt-4 hidden pb-3 pl-16 pr-4 xl:block 2xl:hidden');
    expect(targetCatalogPrimitives).toContain('cursor-pointer rounded-lg text-left');
    expect(clusterCatalog).toContain('mx-4 grid grid-cols-3 gap-3 border-t border-ui-border/60 pb-4 pt-3');
    expect(clusterCatalog).not.toContain('grid grid-cols-3 divide-x');
    expect(clusterTelemetryPanel).toContain('data-cluster-telemetry-panel="compact"');
    expect(clusterTelemetryPanel).toContain('className="shrink-0 px-4 pb-3"');
  });

  it('keeps AIOps evidence visible and sorts exceptions first', () => {
    expect(clusterCatalog).toContain('function getClusterPriority');
    expect(clusterCatalog).toContain('getClusterPriority(left, issueSummaryByClusterId[left.id])');
    expect(clusterCatalog).toContain('const now = useCatalogNow();');
    expect(useCatalogNow).toContain('CATALOG_RELATIVE_TIME_REFRESH_MS = 60_000');
    expect(clusterCatalog).toContain("t('dashboard.clusterStateCriticalIssues', { count: issueSummary.critical })");
    expect(clusterCatalog).toContain("t('dashboard.clusterStateWarningIssues', { count: issueSummary.warning })");
    expect(clusterCatalog).toContain("t('dashboard.criticalStatus', { count: issueSummary?.critical })");
    expect(clusterCatalog).toContain("t('dashboard.warningStatus', { count: issueSummary?.warning })");
    expect(clusterCatalog).toContain("t('dashboard.clusterStateClear')");
    expect(clusterCatalog).toContain('reason={view.statusReason}');
    expect(clusterCatalog).toContain("t('dashboard.investigate')");
    expect(clusterTelemetryPanel).toContain('formatCompactRelativeTime(cluster.lastUpdate, { now })');
    expect(clusterTelemetryPanel).toContain('data-cluster-telemetry-panel="compact"');
  });

  it('uses the shared discovery filter bar and hides it for a truly empty inventory', () => {
    expect(clusterCatalog).toContain('data-cluster-catalog-controls="true"');
    expect(discoveryFilterBar).toContain('data-discovery-filter-bar="true"');
    expect(discoveryFilterBar).toContain('<PageSearchInput');
    expect(discoveryFilterBar).toContain('<SearchFilterFrame');
    expect(discoveryFilterBar).toContain('<Select<string>');
    expect(searchFilterFrame).toContain('rounded-lg border border-ui-border bg-ui-surface p-4 shadow-sm');
    expect(discoveryFilterBar).toContain('aria-live="polite"');
    expect(kubernetesClustersPage).toContain('controls={hasClusterInventory || hasActiveFilter ? (');
    expect(kubernetesClustersPage).toContain('onClearAll={() => setCatalogState({})}');
  });

  it('shows trustworthy counts in the shared selector treatment', () => {
    expect(kubernetesClustersPage).toContain('const hasCompleteCatalogCounts =');
    expect(kubernetesClustersPage).toContain('const catalogCounts = useMemo');
    expect(kubernetesClustersPage).toContain('if (!hasCompleteCatalogCounts || !hasCompleteIssueSummaries) return counts;');
    expect(kubernetesClustersPage).toContain('count: catalogCounts[filter]');
  });

  it('offers one explicit primary action plus deliberate overflow actions', () => {
    expect(targetCatalogPrimitives).toContain("'data-cluster-card-primary-action': 'true'");
    expect(clusterCatalog).toContain('data-cluster-setup-action="install"');
    expect(targetCatalogPrimitives).toContain("'data-cluster-overflow-action': 'toggle'");
    expect(targetCatalogPrimitives).toContain('pointer-events-auto relative z-20');
    expect(clusterCatalog).toContain('data-cluster-overflow-action="settings"');
    expect(clusterCatalog).toContain('data-cluster-overflow-action="delete"');
    expect(targetCatalogPrimitives).toContain('aria-haspopup="menu"');
    expect(targetCatalogPrimitives).toContain("event.key === 'Escape'");
    expect(targetCatalogPrimitives).toContain("event.key === 'ArrowDown'");
    expect(targetCatalogPrimitives).toContain('focus-visible:ring-control-boundary');
  });

  it('retains the detailed telemetry component for drill-down use', () => {
    expect(clusterTelemetryPanel).toContain('export const ClusterTelemetryPanel: React.FC');
    expect(clusterTelemetryPanel).toContain('function getSparklineGapThreshold');
    expect(clusterTelemetryPanel).toContain('formatCompactRelativeTime');
  });

  it('keeps loading, deletion, and issue summaries wired to the catalog', () => {
    expect(kubernetesClustersPage).toContain('function mergeClustersById');
    expect(kubernetesClustersPage).toContain('deletedClusterIdsRef.current.add(cluster.id);');
    expect(kubernetesClustersPage).toContain('useTargetIssueSummaries(kubernetesClusters)');
    expect(useTargetIssueSummaries).toContain('controlPlaneApi.getTargetIssueSummary(target.workspaceId, target.id)');
    expect(kubernetesClustersPage).toContain('issueSummaryByClusterId={issueSummaryByClusterId}');
    expect(kubernetesClustersPage).toContain('catalogLoadError={catalogLoadError}');
    expect(useTargetIssueSummaries).toContain('TARGET_ISSUE_SUMMARY_CONCURRENCY = 4');
    expect(useTargetIssueSummaries).toContain("window.addEventListener('focus', refreshWhenVisible)");
    expect(clusterCatalog).not.toContain('role="tabpanel"');
    expect(clusterCatalog).toContain("t('dashboard.clusterLoadFailed')");
    expect(clusterTelemetryPanel).toContain("t('dashboard.telemetryLoadFailed')");
    expect(clusterCatalog).toContain("t('dashboard.clusterStateIssuesUnavailable')");
    expect(clusterCatalog).toContain("t('dashboard.clusterStateIssuesRefreshFailed')");
  });

  it('uses the shared empty-state anatomy for true and filtered empty inventories', () => {
    expect(dashboard).toContain('<EmptyState');
    expect(clusterCatalog).toContain('<EmptyState');
    expect(emptyState).toContain('type-panel-title text-ui-text');
    expect(emptyState).toContain('type-body mx-auto mt-1.5');
    expect(emptyState).toContain('border border-dashed border-ui-border');
  });
});
