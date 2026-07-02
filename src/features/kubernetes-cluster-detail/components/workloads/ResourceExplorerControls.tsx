import React from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Select, SelectOption } from '@/components/common/Select';
import { formInputClassName } from '@/components/common/formControlStyles';
import { Workload } from '@/types';
import {
  classNames,
  ClusterResourceCategory,
  clusterResourceCategories,
  NetworkResourceCategory,
  networkResourceCategories,
  ResourceFamily,
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

const resourceSearchInputClassName = formInputClassName('h-11 py-3 pl-11 pr-4 font-normal');
const resourceScopeDisplayClassName =
  'flex h-11 min-h-11 w-full items-center rounded-lg border border-ui-border bg-ui-bg/60 px-4 py-3 text-sm font-semibold text-ui-text-muted shadow-[inset_0_1px_0_rgb(var(--surface-rgb)/0.75)]';

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
          'type-label flex h-11 w-full min-w-0 max-w-full items-center gap-2 rounded-md border px-3 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 lg:w-auto',
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

export const ResourceSearchFilterBar: React.FC<{
  activeResourceFamily: ResourceFamily;
  activeCategory: 'All' | Workload['type'];
  activeNetworkCategory: NetworkResourceCategory;
  activeStorageCategory: StorageResourceCategory;
  activeClusterCategory: ClusterResourceCategory;
  workloadCategoryCounts: WorkloadCategoryCounts;
  networkCategoryCounts: Record<NetworkResourceCategory, number>;
  storageCategoryCounts: Record<StorageResourceCategory, number>;
  clusterCategoryCounts: Record<ClusterResourceCategory, number>;
  searchTerm: string;
  onSearchChange: (searchTerm: string) => void;
  showNamespaceFilter: boolean;
  selectedNamespace: string;
  namespaceOptions: Array<SelectOption<string>>;
  onNamespaceChange: (namespace: string) => void;
  onWorkloadCategorySelect: (category: 'All' | Workload['type']) => void;
  onNetworkCategorySelect: (category: NetworkResourceCategory) => void;
  onStorageCategorySelect: (category: StorageResourceCategory) => void;
  onClusterCategorySelect: (category: ClusterResourceCategory) => void;
  children?: React.ReactNode;
}> = ({
  activeResourceFamily,
  activeCategory,
  activeNetworkCategory,
  activeStorageCategory,
  activeClusterCategory,
  workloadCategoryCounts,
  networkCategoryCounts,
  storageCategoryCounts,
  clusterCategoryCounts,
  searchTerm,
  onSearchChange,
  showNamespaceFilter,
  selectedNamespace,
  namespaceOptions,
  onNamespaceChange,
  onWorkloadCategorySelect,
  onNetworkCategorySelect,
  onStorageCategorySelect,
  onClusterCategorySelect,
  children
}) => {
  const { t } = useTranslation();
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
    return clusterCategoryCounts[category as ClusterResourceCategory];
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

  return (
    <div
      data-resource-search-filter-bar="true"
      className="grid min-w-0 w-full max-w-full gap-3 rounded-lg border border-ui-border bg-ui-surface px-4 py-4 shadow-sm lg:grid-cols-[minmax(16rem,1fr)_minmax(11rem,14rem)_minmax(11rem,14rem)_minmax(9rem,max-content)]"
    >
      <div className="relative min-w-0">
        <label htmlFor="resource-search" className="sr-only">{t('resources.filters.search')}</label>
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-text-muted" aria-hidden="true" />
        <input
          id="resource-search"
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('resources.filters.search')}
          className={resourceSearchInputClassName}
        />
      </div>
      <div data-resource-category-select="true" className="min-w-0">
        <Select<ResourceCategoryValue>
          value={activeCategoryValue}
          options={categoryOptions}
          onChange={onCategoryChange}
          className="w-full"
          ariaLabel={t('resources.filters.category')}
        />
      </div>
      <div className="min-w-0">
        {showNamespaceFilter ? (
          <Select<string>
            value={selectedNamespace}
            options={namespaceOptions}
            onChange={onNamespaceChange}
            className="w-full"
            ariaLabel={t('workloads.namespace')}
          />
        ) : (
          <div
            className={resourceScopeDisplayClassName}
            aria-label={t('resources.clusterScoped')}
            title={t('resources.clusterScoped')}
          >
            <span className="min-w-0 truncate">{t('resources.clusterScoped')}</span>
          </div>
        )}
      </div>
      {children || <div className="hidden min-w-[9rem] lg:block" aria-hidden="true" />}
    </div>
  );
};
