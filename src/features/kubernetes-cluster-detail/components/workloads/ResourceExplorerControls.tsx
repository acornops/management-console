import React from 'react';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Select, SelectOption } from '@/components/common/Select';
import { Workload } from '@/types';
import { ResourceInventoryStrip } from '@/features/kubernetes-cluster-detail/components/workloads/resourceExplorerLayout';
import {
  classNames,
  ClusterResourceCategory,
  clusterResourceCategories,
  NetworkResourceCategory,
  networkResourceCategories,
  ResourceFamily,
  ResourceExplorerActiveFilter,
  ResourceInventorySummary,
  StorageResourceCategory,
  storageResourceCategories,
  WorkloadCategoryCounts,
  workloadCategories
} from '@/features/kubernetes-cluster-detail/components/workloads/workloadExplorerParts';

type ResourceCategoryValue =
  | 'All'
  | Workload['type']
  | NetworkResourceCategory
  | StorageResourceCategory
  | ClusterResourceCategory;

export const ResourceFamilyTabs: React.FC<{
  families: Array<{ id: ResourceFamily; count: number }>;
  activeFamily: ResourceFamily;
  onSelect: (family: ResourceFamily) => void;
}> = ({ families, activeFamily, onSelect }) => {
  const { t } = useTranslation();

  return (
    <div
      data-resource-family-tabs="true"
      className="grid min-w-0 w-full max-w-full grid-cols-2 gap-1 border-y border-ui-border bg-ui-surface/70 px-1 py-1 sm:flex sm:items-center sm:overflow-x-auto"
    >
      {families.map((family) => (
        <button
          key={family.id}
          type="button"
          onClick={() => onSelect(family.id)}
          className={classNames(
            'type-label inline-flex min-w-0 items-center justify-center whitespace-nowrap rounded-md px-3 py-2 transition-all sm:min-w-[8.5rem]',
            activeFamily === family.id
              ? 'bg-ui-bg text-accent-strong'
              : 'text-ui-text-muted hover:text-ui-text'
          )}
        >
          {t(`resources.families.${family.id}`)}
          <span className="type-data ml-2 text-xs text-ui-text-muted">{family.count}</span>
        </button>
      ))}
    </div>
  );
};

export const WorkloadTriageShortcut: React.FC<{
  unhealthyPodCount: number;
  showUnhealthyPodsOnly: boolean;
  onToggle: () => void;
}> = ({ unhealthyPodCount, showUnhealthyPodsOnly, onToggle }) => {
  const { t } = useTranslation();

  return (
    <div className="flex min-w-0 w-full max-w-full lg:w-auto lg:shrink-0">
      <button
        type="button"
        aria-label={t('resources.filters.unhealthyPodsCount', { count: unhealthyPodCount })}
        aria-pressed={showUnhealthyPodsOnly}
        onClick={onToggle}
        className={classNames(
          'type-label flex h-9 w-full min-w-0 max-w-full items-center gap-2 rounded-md border px-3 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 lg:w-auto',
          showUnhealthyPodsOnly
            ? 'border-accent/30 bg-accent-soft text-accent-strong'
            : 'border-ui-border bg-ui-surface text-ui-text-muted hover:border-accent/30 hover:text-accent-strong'
        )}
      >
        <span
          aria-hidden="true"
          className={classNames(
            'relative h-3.5 w-6 shrink-0 overflow-hidden rounded-full transition-colors',
            showUnhealthyPodsOnly ? 'bg-accent' : 'bg-ui-border'
          )}
        >
          <span
            className={classNames(
              'absolute left-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-ui-surface shadow-sm transition-transform',
              showUnhealthyPodsOnly ? 'translate-x-2.5' : 'translate-x-0'
            )}
          />
        </span>
        <span className="min-w-0 truncate">{t('resources.filters.unhealthyPods')}</span>
        {unhealthyPodCount > 0 && (
          <span className="type-data flex h-4 min-w-4 items-center justify-center rounded-full border border-accent/25 px-1 text-xs leading-none text-accent-strong">
            {unhealthyPodCount}
          </span>
        )}
      </button>
    </div>
  );
};

export const ResourceFiltersInventoryPanel: React.FC<{
  activeFilters: ResourceExplorerActiveFilter[];
  canResetFilters: boolean;
  isOpen: boolean;
  onToggle: () => void;
  resultSummary: string;
  visibleResourceCount: number;
  totalResourceCount: number;
  activeFilterCount: number;
  activeFamilyLabel: string;
  showNamespaceFilter: boolean;
  selectedNamespace: string;
  namespaceOptions: Array<SelectOption<string>>;
  onNamespaceChange: (namespace: string) => void;
  activeResourceFamily: ResourceFamily;
  activeCategory: 'All' | Workload['type'];
  activeNetworkCategory: NetworkResourceCategory;
  activeStorageCategory: StorageResourceCategory;
  activeClusterCategory: ClusterResourceCategory;
  workloadCategoryCounts: WorkloadCategoryCounts;
  networkCategoryCounts: Record<NetworkResourceCategory, number>;
  storageCategoryCounts: Record<StorageResourceCategory, number>;
  clusterCategoryCounts: Record<ClusterResourceCategory, number>;
  inventorySummary: ResourceInventorySummary;
  onResetFilters: () => void;
  onClearNamespaceFilter: () => void;
  onClearUnhealthyPodsFilter: () => void;
  onClearCategoryFilter: () => void;
  onWorkloadCategorySelect: (category: 'All' | Workload['type']) => void;
  onNetworkCategorySelect: (category: NetworkResourceCategory) => void;
  onStorageCategorySelect: (category: StorageResourceCategory) => void;
  onClusterCategorySelect: (category: ClusterResourceCategory) => void;
}> = ({
  activeFilters,
  canResetFilters,
  isOpen,
  onToggle,
  resultSummary,
  visibleResourceCount,
  totalResourceCount,
  activeFilterCount,
  activeFamilyLabel,
  showNamespaceFilter,
  selectedNamespace,
  namespaceOptions,
  onNamespaceChange,
  activeResourceFamily,
  activeCategory,
  activeNetworkCategory,
  activeStorageCategory,
  activeClusterCategory,
  workloadCategoryCounts,
  networkCategoryCounts,
  storageCategoryCounts,
  clusterCategoryCounts,
  inventorySummary,
  onResetFilters,
  onClearNamespaceFilter,
  onClearUnhealthyPodsFilter,
  onClearCategoryFilter,
  onWorkloadCategorySelect,
  onNetworkCategorySelect,
  onStorageCategorySelect,
  onClusterCategorySelect
}) => {
  const { t } = useTranslation();
  const toolbarGridClass = classNames(
    'grid grid-cols-1 items-end gap-3',
    activeResourceFamily === 'workloads' && 'lg:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)]',
    (activeResourceFamily === 'network' || activeResourceFamily === 'storage') &&
      'lg:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)]',
    activeResourceFamily === 'cluster' && 'lg:grid-cols-[minmax(0,1fr)]'
  );
  const activeCategoryValue: ResourceCategoryValue =
    activeResourceFamily === 'workloads'
      ? activeCategory
      : activeResourceFamily === 'network'
        ? activeNetworkCategory
        : activeResourceFamily === 'storage'
          ? activeStorageCategory
          : activeClusterCategory;
  const getCategoryCount = (category: ResourceCategoryValue) => {
    if (activeResourceFamily === 'workloads') {
      return workloadCategoryCounts[category as 'All' | Workload['type']];
    }
    if (activeResourceFamily === 'network') {
      return networkCategoryCounts[category as NetworkResourceCategory];
    }
    if (activeResourceFamily === 'storage') {
      return storageCategoryCounts[category as StorageResourceCategory];
    }
    if (activeResourceFamily === 'cluster') {
      return clusterCategoryCounts[category as ClusterResourceCategory];
    }
    return undefined;
  };
  const categoryOptions: Array<SelectOption<ResourceCategoryValue>> = (
    activeResourceFamily === 'workloads'
      ? workloadCategories
      : activeResourceFamily === 'network'
        ? networkResourceCategories
        : activeResourceFamily === 'storage'
          ? storageResourceCategories
          : clusterResourceCategories
  ).map((category) => {
    const labelPrefix = activeResourceFamily === 'workloads' ? 'workloads.categories' : 'resources.categories';
    const categoryCount = getCategoryCount(category);

    return {
      value: category,
      label: (
          <span className="flex min-w-0 items-center justify-between gap-3">
            <span className="min-w-0 truncate">{t(`${labelPrefix}.${category}`)}</span>
            {typeof categoryCount === 'number' && (
              <span className="type-data shrink-0 text-xs text-ui-text-muted">{categoryCount}</span>
            )}
          </span>
      )
    };
  });
  const onCategoryChange = (category: ResourceCategoryValue) => {
    if (activeResourceFamily === 'workloads') {
      onWorkloadCategorySelect(category as 'All' | Workload['type']);
    } else if (activeResourceFamily === 'network') {
      onNetworkCategorySelect(category as NetworkResourceCategory);
    } else if (activeResourceFamily === 'storage') {
      onStorageCategorySelect(category as StorageResourceCategory);
    } else {
      onClusterCategorySelect(category as ClusterResourceCategory);
    }
  };
  const getActiveFilterLabel = (filter: ResourceExplorerActiveFilter) => {
    const value = filter.valueLabelKey ? t(filter.valueLabelKey) : filter.value;
    return t(filter.labelKey, value ? { value } : undefined);
  };
  const clearActiveFilter = (filter: ResourceExplorerActiveFilter) => {
    if (filter.id === 'namespace') {
      onClearNamespaceFilter();
    } else if (filter.id === 'unhealthyPods') {
      onClearUnhealthyPodsFilter();
    } else {
      onClearCategoryFilter();
    }
  };

  const activeFilterChips = activeFilters.map((filter) => {
    const label = getActiveFilterLabel(filter);
    const chipToneClass =
      filter.id === 'unhealthyPods'
        ? 'border-accent/20 bg-accent-soft text-accent-strong hover:border-accent/35 hover:bg-accent-soft/80'
        : 'border-ui-border bg-ui-bg text-ui-text-muted hover:bg-ui-surface hover:text-ui-text';

    return (
      <button
        key={`${filter.id}-${filter.value || filter.valueLabelKey || 'active'}`}
        type="button"
        data-resource-filter-chip="true"
        onClick={() => clearActiveFilter(filter)}
        aria-label={t('resources.filters.clearFilter', { filter: label })}
        className={classNames(
          'type-micro-label inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25',
          chipToneClass
        )}
      >
        <span className="min-w-0 truncate">{label}</span>
        <X className="h-3 w-3 shrink-0" aria-hidden="true" />
      </button>
    );
  });
  const showActiveFilterActions = activeFilters.length > 0 || canResetFilters;

  return (
    <div className="flex min-w-0 flex-1 flex-col border-y border-ui-border bg-ui-surface/70 px-3 py-3">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p
            data-resource-filter-summary="true"
            className="type-row-title min-w-0 break-words"
            title={resultSummary}
          >
            {resultSummary}
          </p>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <span className="type-caption">
              {t('resources.summary.visibleOfTotal', {
                visible: visibleResourceCount,
                total: totalResourceCount,
                family: activeFamilyLabel
              })}
            </span>
            {activeFilterCount > 0 && (
              <span className="type-micro-label rounded-full border border-accent/20 bg-accent-soft px-2 py-0.5 text-accent-strong">
                {activeFilterCount === 1
                  ? t('resources.summary.oneActiveFilter')
                  : t('resources.summary.activeFilters', { count: activeFilterCount })}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0">
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls="resource-filters-inventory-panel"
            onClick={onToggle}
            className="type-ui inline-flex h-9 w-full shrink-0 items-center justify-between gap-2 rounded-md border border-ui-border bg-ui-bg px-3 text-ui-text-muted transition-colors hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 sm:w-auto sm:justify-center"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            {t('resources.filtersInventory.title')}
            <ChevronDown
              className={classNames('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          id="resource-filters-inventory-panel"
          data-resource-advanced-controls="true"
          className="mt-3 border-t border-ui-border pt-3"
        >
          {showActiveFilterActions && (
            <div className="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                {activeFilterChips}
              </div>
              {canResetFilters && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="type-ui inline-flex h-9 w-full items-center justify-center rounded-md px-3 text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 sm:w-auto"
                >
                  {t('resources.filters.reset')}
                </button>
              )}
            </div>
          )}
          <div className={toolbarGridClass}>
            {showNamespaceFilter && (
              <div className="flex min-w-0 flex-col gap-1.5">
                <label className="type-micro-label ml-1 h-3 leading-3">{t('workloads.namespace')}</label>
                <Select<string>
                  value={selectedNamespace}
                  options={namespaceOptions}
                  onChange={onNamespaceChange}
                  size="sm"
                  ariaLabel={t('workloads.namespace')}
                />
                <p className="type-caption px-1 text-ui-text-muted">
                  {t('resources.filters.namespaceHelp')}
                </p>
              </div>
            )}
            <div className="min-w-0">
              <div data-resource-category-select="true" className="flex min-w-0 flex-col gap-1.5">
                <label className="type-micro-label ml-1 h-3 leading-3">
                  {t('resources.filters.category')}
                </label>
                <Select<ResourceCategoryValue>
                  value={activeCategoryValue}
                  options={categoryOptions}
                  onChange={onCategoryChange}
                  size="sm"
                  ariaLabel={t('resources.filters.category')}
                />
                <p className="type-caption px-1 text-ui-text-muted">
                  {t('resources.filters.categoryHelp')}
                </p>
              </div>
            </div>
          </div>
          <ResourceInventoryStrip summary={inventorySummary} />
        </div>
      )}
    </div>
  );
};
