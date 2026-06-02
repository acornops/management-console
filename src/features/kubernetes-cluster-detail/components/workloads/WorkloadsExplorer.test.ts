import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../../../..');
const explorer = readFileSync(resolve(root, 'src/features/kubernetes-cluster-detail/components/workloads/WorkloadsExplorer.tsx'), 'utf8');
const explorerLists = readFileSync(resolve(root, 'src/features/kubernetes-cluster-detail/components/workloads/WorkloadsExplorerLists.tsx'), 'utf8');
const controls = readFileSync(resolve(root, 'src/features/kubernetes-cluster-detail/components/workloads/ResourceExplorerControls.tsx'), 'utf8');
const explorerSurface = `${explorer}\n${explorerLists}`;

describe('WorkloadsExplorer adaptive triage layout', () => {
  it('keeps the active filter summary visible outside the expandable controls panel', () => {
    expect(controls).toContain('data-resource-filter-summary="true"');
    expect(controls).toContain('data-resource-advanced-controls="true"');
    expect(controls.indexOf('data-resource-filter-summary="true"')).toBeLessThan(
      controls.indexOf('data-resource-advanced-controls="true"')
    );
  });

  it('places filters and inventory behind one aria-expanded panel toggle', () => {
    expect(controls).toContain("t('resources.filtersInventory.title')");
    expect(controls).toContain('aria-expanded={isOpen}');
    expect(controls).toContain('aria-controls="resource-filters-inventory-panel"');
    expect(controls).toContain('id="resource-filters-inventory-panel"');
    expect(controls).toContain('<SlidersHorizontal');
    expect(controls).toContain('<ResourceInventoryStrip summary={inventorySummary} />');
  });

  it('keeps family tabs and the workload triage shortcut outside advanced controls', () => {
    expect(explorerSurface).toContain('<ResourceFamilyTabs');
    expect(explorerSurface).toContain('<WorkloadTriageShortcut');
    expect(explorerSurface).toContain('<ResourceFiltersInventoryPanel');
    expect(explorerSurface.indexOf('<ResourceFamilyTabs')).toBeLessThan(
      explorerSurface.indexOf('<ResourceFiltersInventoryPanel')
    );
    expect(explorerSurface.indexOf('<WorkloadTriageShortcut')).toBeLessThan(
      explorerSurface.indexOf('<ResourceFiltersInventoryPanel')
    );
  });

  it('top-aligns the triage shortcut with expanded filters on wide screens', () => {
    expect(explorerSurface).toContain('lg:flex-row lg:items-start');
  });

  it('keeps the triage shortcut inside narrow containers', () => {
    expect(controls).toContain('w-full max-w-full lg:w-auto lg:shrink-0');
    expect(controls).toContain('w-full min-w-0 max-w-full items-center');
    expect(controls).toContain('className="min-w-0 truncate"');
  });

  it('keeps the visible filter controls distilled', () => {
    expect(controls).toContain('type-row-title min-w-0 break-words');
    expect(controls).toContain("t('resources.summary.visibleOfTotal'");
    expect(controls).toContain('activeFilterCount === 1');
    expect(explorer).toContain('visibleResourceCount={visibleResourceCount}');
    expect(explorer).toContain('totalResourceCount={totalResourceCount}');
    expect(controls).toContain('className="mt-3 border-t border-ui-border pt-3"');
    expect(controls).toContain('const showActiveFilterActions = activeFilters.length > 0 || canResetFilters');
    expect(controls).not.toContain('mt-3 border-t border-ui-border pt-3 text-xs font-bold uppercase');
    expect(explorerSurface).not.toContain('rounded-xl border border-ui-border bg-ui-surface p-3 shadow-sm');
  });

  it('keeps active filter chips and reset inside advanced controls', () => {
    expect(controls).toContain('activeFilters');
    expect(controls).toContain('data-resource-filter-chip="true"');
    expect(controls).toContain('onResetFilters');
    expect(controls).toContain("t('resources.filters.reset')");
    expect(controls).not.toContain("t('resources.filters.activeCount'");
    expect(controls.indexOf('{activeFilterChips}')).toBeGreaterThan(
      controls.indexOf('data-resource-advanced-controls="true"')
    );
  });

  it('uses a Select for category filtering instead of expanded category tabs', () => {
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

  it('passes namespace-scoped workload category counts to the filters panel', () => {
    expect(explorerSurface).toContain('workloadCategoryCounts');
    expect(explorerSurface).toContain('buildWorkloadCategoryCounts');
    expect(explorerSurface).toContain('workloadCategoryCounts={workloadCategoryCounts}');
    expect(controls).toContain('workloadCategoryCounts: WorkloadCategoryCounts');
    expect(controls).toContain('workloadCategoryCounts[category as');
  });

  it('restores authoritative resource family counts without the pagination hide path', () => {
    expect(explorerSurface).toContain('resourceFamilyCounts?.workloads ?? workloads.length');
    expect(explorerSurface).toContain('resourceKindCounts?.[kind]');
    expect(controls).toContain('<span className="type-data ml-2 text-xs text-ui-text-muted">{family.count}</span>');
    expect(explorerSurface).not.toContain('hideFamilyCounts');
    expect(controls).not.toContain('hideCounts');
    expect(explorerSurface).not.toContain('resourceSearchTerm');
  });

  it('uses accent styling only for the unhealthy pod active chip', () => {
    expect(controls).toContain("filter.id === 'unhealthyPods'");
    expect(controls).toContain('border-accent/20 bg-accent-soft');
    expect(controls).toContain('border-ui-border bg-ui-bg text-ui-text-muted');
  });

  it('wires individual active filter clear callbacks', () => {
    expect(controls).toContain('onClearNamespaceFilter');
    expect(controls).toContain('onClearUnhealthyPodsFilter');
    expect(controls).toContain('onClearCategoryFilter');
    expect(explorerSurface).toContain("setSelectedNamespace('All')");
    expect(explorerSurface).toContain('setShowUnhealthyPodsOnly(false)');
    expect(explorerSurface).toContain('clearCurrentCategoryFilter');
  });

  it('clears secondary filters without changing the selected resource family', () => {
    expect(explorerSurface).toContain('const resetResourceFilters = () => {');
    expect(explorerSurface).toContain("setSelectedNamespace('All')");
    expect(explorerSurface).toContain("setActiveCategory('All')");
    expect(explorerSurface).toContain("setActiveNetworkCategory('All')");
    expect(explorerSurface).toContain("setActiveStorageCategory('All')");
    expect(explorerSurface).toContain("setActiveClusterCategory('All')");
    expect(explorerSurface).toContain('setShowUnhealthyPodsOnly(false)');
    expect(explorerSurface).not.toContain("setActiveResourceFamily('workloads')");
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
