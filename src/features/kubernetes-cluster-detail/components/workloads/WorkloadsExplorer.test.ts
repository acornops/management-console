import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../../../..');
const explorer = readFileSync(resolve(root, 'src/features/kubernetes-cluster-detail/components/workloads/WorkloadsExplorer.tsx'), 'utf8');
const explorerLists = readFileSync(resolve(root, 'src/features/kubernetes-cluster-detail/components/workloads/WorkloadsExplorerLists.tsx'), 'utf8');
const controls = readFileSync(resolve(root, 'src/features/kubernetes-cluster-detail/components/workloads/ResourceExplorerControls.tsx'), 'utf8');
const searchFilterFrame = readFileSync(resolve(root, 'src/components/common/SearchFilterFrame.tsx'), 'utf8');
const resourceCategoryTabs = readFileSync(resolve(root, 'src/components/common/ResourceCategoryTabs.tsx'), 'utf8');
const explorerSurface = `${explorer}\n${explorerLists}`;

describe('WorkloadsExplorer adaptive triage layout', () => {
  it('keeps family tabs, search filters, and the workload triage shortcut as the only resource controls', () => {
    expect(explorerSurface).toContain('<ResourceCategoryTabs<ResourceFamily>');
    expect(explorerSurface).toContain('<ResourceSearchFilterBar');
    expect(explorerSurface).toContain('<WorkloadTriageShortcut');
    expect(explorerSurface.indexOf('<ResourceCategoryTabs<ResourceFamily>')).toBeLessThan(
      explorerSurface.indexOf('<ResourceSearchFilterBar')
    );
    expect(explorerSurface).not.toContain('<ResourceFiltersInventoryPanel');
    expect(explorerSurface).not.toContain('<ResourceFamilyTabs');
    expect(controls).not.toContain('data-resource-advanced-controls="true"');
    expect(controls).not.toContain("t('resources.filtersInventory.title')");
  });

  it('renders resource families as accessible top-level tabs', () => {
    expect(explorerSurface).toContain("import { ResourceCategoryTabs } from '@/components/common/ResourceCategoryTabs'");
    expect(explorerSurface).toContain("labelPrefix=\"resources.families\"");
    expect(explorerSurface).toContain("ariaLabel={t('resources.families.label')}");
    expect(explorerSurface).toContain('counts={resourceFamilyCountsForTabs}');
    expect(explorerSurface).not.toContain('attentionCounts=');
  });

  it('keeps issue visibility in the rows by sorting attention resources first', () => {
    expect(resourceCategoryTabs).not.toContain('reservesAttentionSlot');
    expect(resourceCategoryTabs).not.toContain("t('resources.families.issueCount'");
    expect(explorerSurface).toContain('sortAttentionFirst');
    expect(explorerSurface).toContain('(workload) => !isHealthyStatus(workload.status)');
    expect(explorerSurface).toContain("(ingress) => !hasReportedValue(ingress.address)");
    expect(explorerSurface).toContain('(pvc) => !isHealthyStatus(pvc.status)');
    expect(explorerSurface).toContain('(node) => !isHealthyStatus(node.status)');
    expect(explorerSurface).toContain('healthy={isHealthyStatus(namespace.status)}');
  });

  it('keeps the triage shortcut inside narrow containers', () => {
    expect(controls).toContain('w-full max-w-full lg:w-auto lg:shrink-0');
    expect(controls).toContain('w-full min-w-0 max-w-full items-center');
    expect(controls).toContain('className="min-w-0 truncate"');
  });

  it('keeps the visible filter controls distilled', () => {
    expect(controls).toContain('data-resource-search-filter-bar="true"');
    expect(controls).toContain('id="resource-search"');
    expect(controls).toContain("t('resources.filters.search')");
    expect(controls).toContain('<Search className=');
    expect(controls).toContain('<SearchFilterFrame');
    expect(searchFilterFrame).toContain('rounded-lg border border-ui-border bg-ui-surface p-4 shadow-sm');
    expect(searchFilterFrame).toContain('lg:w-[clamp(10.5rem,14vw,14rem)]');
    expect(controls).toContain("t('resources.clusterScoped')");
    expect(controls).toContain('trailingActions={children}');
    expect(controls).not.toContain("t('resources.summary.visibleOfTotal'");
    expect(explorer).not.toContain('visibleResourceCount={visibleResourceCount}');
    expect(controls).not.toContain('const showActiveFilterActions = activeFilters.length > 0 || canResetFilters');
    expect(controls).not.toContain('mt-3 border-t border-ui-border pt-3 text-xs font-bold uppercase');
    expect(explorerSurface).not.toContain('rounded-xl border border-ui-border bg-ui-surface p-3 shadow-sm');
  });

  it('uses a persistent Select for category filtering instead of expanded category tabs', () => {
    expect(controls).toContain('categoryOptions');
    expect(controls).toContain('data-resource-category-select="true"');
    expect(controls).toContain('<Select<ResourceCategoryValue>');
    expect(controls).toContain('value={activeCategoryValue}');
    expect(controls).toContain('activeResourceFamily === \'workloads\'\n      ? activeCategory');
    expect(controls).not.toContain("showUnhealthyPodsOnly ? 'Pod' : activeCategory");
    expect(controls).not.toContain('function renderCategoryTabs');
  });

  it('keeps triage toggle-on separate from workload category selection', () => {
    expect(explorerSurface).toContain("setActiveCategory('All')");
    expect(explorerSurface).not.toContain("setActiveCategory(current ? 'All' : 'Pod')");
  });

  it('passes namespace-scoped workload category counts to the search filter bar', () => {
    expect(explorerSurface).toContain('workloadCategoryCounts');
    expect(explorerSurface).toContain('buildWorkloadCategoryCounts');
    expect(explorerSurface).toContain('workloadCategoryCounts={workloadCategoryCounts}');
    expect(controls).toContain('workloadCategoryCounts: WorkloadCategoryCounts');
    expect(controls).toContain('workloadCategoryCounts[category as');
  });

  it('restores authoritative resource family counts without the pagination hide path', () => {
    expect(explorerSurface).toContain('resourceFamilyCounts?.workloads ?? workloads.length');
    expect(explorerSurface).toContain('resourceKindCounts?.[kind]');
    expect(resourceCategoryTabs).toContain('<span className="type-data text-xs text-ui-text-muted">');
    expect(explorerSurface).not.toContain('hideFamilyCounts');
    expect(controls).not.toContain('hideCounts');
  });

  it('wires resource search into loaded rows and backend resource queries', () => {
    expect(explorerSurface).toContain('const [resourceSearchTerm, setResourceSearchTerm] = useState(\'\');');
    expect(explorerSurface).toContain('matchesResourceSearch(resourceSearchTerm');
    expect(explorerSurface).toContain('searchTerm={resourceSearchTerm}');
    expect(explorerSurface).toContain('q: resourceSearchTerm.trim() || undefined');
    expect(controls).not.toContain('onClearSearchFilter');
  });

  it('prevents the triage switch knob from escaping a compressed track', () => {
    expect(controls).toContain('relative h-3.5 w-6 shrink-0 overflow-hidden rounded-full');
    expect(controls).toContain('absolute left-0.5 top-0.5 h-2.5 w-2.5');
    expect(controls).toContain("showUnhealthyPodsOnly ? 'translate-x-2.5' : 'translate-x-0'");
  });

  it('uses native buttons with explicit details labels for interactive resource rows', () => {
    const resourceLayout = readFileSync(
      resolve(root, 'src/features/kubernetes-cluster-detail/components/workloads/resourceExplorerLayout.tsx'),
      'utf8'
    );

    expect(resourceLayout).not.toContain("role: 'button'");
    expect(resourceLayout).not.toContain('onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>)');
    expect(resourceLayout).toContain('<button');
    expect(resourceLayout).toContain('type="button"');
    expect(resourceLayout).toContain('aria-label={`${t(\'workloads.details\')}: ${title}`}');
    expect(explorerSurface).toContain('aria-label={`${t(\'workloads.details\')}: ${workload.name}`}');
  });

  it('keeps table headers on populated Kubernetes resource lists', () => {
    const resourceLayout = readFileSync(
      resolve(root, 'src/features/kubernetes-cluster-detail/components/workloads/resourceExplorerLayout.tsx'),
      'utf8'
    );
    const parts = readFileSync(
      resolve(root, 'src/features/kubernetes-cluster-detail/components/workloads/workloadExplorerParts.tsx'),
      'utf8'
    );

    expect(resourceLayout).toContain('data-resource-list-header="true"');
    expect(resourceLayout).toContain("t('resources.table.resource')");
    expect(resourceLayout).toContain("t('resources.table.metrics')");
    expect(resourceLayout).toContain("t('resources.table.status')");
    expect(resourceLayout).toContain('resourceRowHeaderClass');
    expect(parts).toContain('export const resourceRowHeaderClass =');
    expect(parts).toContain('xl:grid-cols-[minmax(24rem,1.8fr)_minmax(14rem,0.7fr)_minmax(15rem,max-content)]');
  });

  it('allocates desktop resource rows around identity first and compact operational columns', () => {
    const parts = readFileSync(
      resolve(root, 'src/features/kubernetes-cluster-detail/components/workloads/workloadExplorerParts.tsx'),
      'utf8'
    );

    expect(parts).toContain('xl:grid-cols-[minmax(24rem,1.8fr)_minmax(14rem,0.7fr)_minmax(15rem,max-content)]');
    expect(parts).toContain('xl:justify-self-end');
    expect(parts).toContain('xl:grid-cols-[minmax(0,1fr)_minmax(3.75rem,max-content)]');
    expect(explorerSurface).toContain('data-resource-row-identity="true"');
    expect(explorerSurface).not.toContain('xl:grid-cols-[minmax(0,1fr)_minmax(28rem,34rem)_16rem]');
  });
});
