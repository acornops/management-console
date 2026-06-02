import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { SelectOption } from '@/components/common/Select';
import { Workload } from '@/types';
import { InfrastructureResource } from '@/features/kubernetes-cluster-detail/components/workloads/ResourceDetailsDrawer';
import {
  ResourceFamilyTabs,
  ResourceFiltersInventoryPanel,
  WorkloadTriageShortcut
} from '@/features/kubernetes-cluster-detail/components/workloads/ResourceExplorerControls';
import {
  ClusterSection,
  NetworkSection,
  StorageSection,
  WorkloadsExplorerDrawers,
  WorkloadsSection
} from '@/features/kubernetes-cluster-detail/components/workloads/WorkloadsExplorerLists';
import {
  ClusterResourceCategory,
  buildNamespaceItems,
  buildResourceInventorySummary,
  buildWorkloadCategoryCounts,
  getDefaultExplorerSelection,
  getResourceExplorerFilterState,
  getResourceExplorerResultSummaryParts,
  hasReportedValue,
  isHealthyStatus,
  isUnhealthyPod,
  NamespaceExplorerItem,
  NetworkResourceCategory,
  ResourceFamily,
  StorageResourceCategory,
  WorkloadCategoryCounts,
  workloadCategories,
  WorkloadExplorerItem,
  WorkloadsExplorerProps
} from '@/features/kubernetes-cluster-detail/components/workloads/workloadExplorerParts';
import { safeStorage } from '@/utils/safeStorage';

const SHOW_UNHEALTHY_ONLY_STORAGE_KEY = 'acornops_resources_show_unhealthy_only';

function getInitialShowUnhealthyPodsOnly(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const stored = safeStorage.getItem(SHOW_UNHEALTHY_ONLY_STORAGE_KEY);
    if (stored === 'false') return false;
    if (stored === 'true') return true;
  } catch {
    // Keep the product default when browser storage is unavailable.
  }
  return true;
}

export const WorkloadsExplorer: React.FC<WorkloadsExplorerProps> = ({
  title,
  description,
  workloads,
  services = [],
  ingresses = [],
  pvcs = [],
  nodes = [],
  namespaces: reportedNamespaces = [],
  canReadPodLogs = false,
  isLoadingInitial = false,
  isLoadingMore = false,
  hasMoreResources = false,
  resourceListError = null,
  resourceFamilyCounts,
  resourceKindCounts,
  onResourceQueryChange,
  onLoadMoreResources,
  onLoadPodLogs,
  onAnalyzePod
}) => {
  const { t } = useTranslation();
  const unhealthyPodCount = useMemo(
    () => workloads.filter(isUnhealthyPod).length,
    [workloads]
  );
  const initialSelection = getDefaultExplorerSelection(unhealthyPodCount);
  const persistedShowUnhealthyPodsOnly = getInitialShowUnhealthyPodsOnly();
  const shouldShowUnhealthyPodsInitially = initialSelection.showUnhealthyPodsOnly && persistedShowUnhealthyPodsOnly;
  const [selectedWorkload, setSelectedWorkload] = useState<WorkloadExplorerItem | null>(null);
  const [selectedResource, setSelectedResource] = useState<InfrastructureResource | null>(null);
  const [activeResourceFamily, setActiveResourceFamily] = useState<ResourceFamily>(initialSelection.activeResourceFamily);
  const [activeCategory, setActiveCategory] = useState<'All' | Workload['type']>(
    shouldShowUnhealthyPodsInitially ? initialSelection.activeCategory : 'All'
  );
  const [activeNetworkCategory, setActiveNetworkCategory] = useState<NetworkResourceCategory>('All');
  const [activeStorageCategory, setActiveStorageCategory] = useState<StorageResourceCategory>('All');
  const [activeClusterCategory, setActiveClusterCategory] = useState<ClusterResourceCategory>('All');
  const [selectedNamespace, setSelectedNamespace] = useState('All');
  const [showUnhealthyPodsOnly, setShowUnhealthyPodsOnly] = useState(shouldShowUnhealthyPodsInitially);
  const [isFiltersInventoryOpen, setIsFiltersInventoryOpen] = useState(false);
  const [hasManualResourceSelection, setHasManualResourceSelection] = useState(!persistedShowUnhealthyPodsOnly);
  const triageDefaultAppliedRef = useRef(shouldShowUnhealthyPodsInitially);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const showUnhealthyWorkloadsOnly = activeResourceFamily === 'workloads' && showUnhealthyPodsOnly;

  useEffect(() => {
    try {
      safeStorage.setItem(SHOW_UNHEALTHY_ONLY_STORAGE_KEY, String(showUnhealthyPodsOnly));
    } catch {
      // The filter remains usable for the current session if browser storage is unavailable.
    }
  }, [showUnhealthyPodsOnly]);

  const namespaces = useMemo(
    () => [
      'All',
      ...Array.from(new Set([
        ...reportedNamespaces.map((namespace) => namespace.name),
        ...workloads.map((workload) => workload.namespace),
        ...services.map((service) => service.namespace),
        ...ingresses.map((ingress) => ingress.namespace),
        ...pvcs.map((pvc) => pvc.namespace)
      ])).sort()
    ],
    [ingresses, pvcs, reportedNamespaces, services, workloads]
  );
  const namespaceScopedWorkloads = useMemo(
    () =>
      workloads.filter((workload) => selectedNamespace === 'All' || workload.namespace === selectedNamespace),
    [selectedNamespace, workloads]
  );
  const filteredWorkloads = useMemo(
    () =>
      namespaceScopedWorkloads.filter((workload) =>
        showUnhealthyWorkloadsOnly
          ? isUnhealthyPod(workload)
          : activeCategory === 'All' || workload.type === activeCategory
      ),
    [activeCategory, namespaceScopedWorkloads, showUnhealthyWorkloadsOnly]
  );
  const filteredServices = useMemo(
    () =>
      services.filter((service) => selectedNamespace === 'All' || service.namespace === selectedNamespace),
    [selectedNamespace, services]
  );
  const filteredIngresses = useMemo(
    () =>
      ingresses.filter((ingress) => selectedNamespace === 'All' || ingress.namespace === selectedNamespace),
    [ingresses, selectedNamespace]
  );
  const filteredPVCs = useMemo(
    () =>
      pvcs.filter((pvc) => selectedNamespace === 'All' || pvc.namespace === selectedNamespace),
    [pvcs, selectedNamespace]
  );
  const namespaceItems = useMemo<NamespaceExplorerItem[]>(
    () =>
      buildNamespaceItems({
        namespaces: reportedNamespaces,
        workloads,
        services,
        ingresses,
        pvcs,
        nodes
      }),
    [ingresses, nodes, pvcs, reportedNamespaces, services, workloads]
  );
  const resourceFamilies: Array<{ id: ResourceFamily; count: number }> = [
    { id: 'workloads', count: resourceFamilyCounts?.workloads ?? workloads.length },
    { id: 'network', count: resourceFamilyCounts?.network ?? services.length + ingresses.length },
    { id: 'storage', count: resourceFamilyCounts?.storage ?? pvcs.length },
    { id: 'cluster', count: resourceFamilyCounts?.cluster ?? nodes.length + namespaceItems.length }
  ];
  const showNamespaceFilter = activeResourceFamily !== 'cluster';
  const namespaceOptions: Array<SelectOption<string>> = namespaces.map((namespace) => ({
    value: namespace,
    label: namespace
  }));

  const useTotalKindCounts = selectedNamespace === 'All';
  const getKindCount = (kind: string) => useTotalKindCounts ? resourceKindCounts?.[kind] : undefined;
  const loadedWorkloadCategoryCounts: WorkloadCategoryCounts = buildWorkloadCategoryCounts({
    workloads,
    selectedNamespace
  });
  const workloadCategoryCounts: WorkloadCategoryCounts = useTotalKindCounts && resourceKindCounts
    ? {
        All: (resourceFamilyCounts?.workloads ?? workloadCategories.reduce((total, category) =>
          category === 'All' ? total : total + (resourceKindCounts[category] || 0), 0)),
        Deployment: resourceKindCounts.Deployment || 0,
        StatefulSet: resourceKindCounts.StatefulSet || 0,
        DaemonSet: resourceKindCounts.DaemonSet || 0,
        CronJob: resourceKindCounts.CronJob || 0,
        Job: resourceKindCounts.Job || 0,
        Pod: resourceKindCounts.Pod || 0
      }
    : loadedWorkloadCategoryCounts;
  const serviceCount = getKindCount('Service') ?? filteredServices.length;
  const ingressCount = getKindCount('Ingress') ?? filteredIngresses.length;
  const pvcCount = getKindCount('PersistentVolumeClaim') ?? filteredPVCs.length;
  const nodeCount = getKindCount('Node') ?? nodes.length;
  const namespaceCount = getKindCount('Namespace') ?? namespaceItems.length;
  const networkCategoryCounts: Record<NetworkResourceCategory, number> = {
    All: serviceCount + ingressCount,
    Service: serviceCount,
    Ingress: ingressCount
  };
  const storageCategoryCounts: Record<StorageResourceCategory, number> = {
    All: pvcCount,
    PersistentVolumeClaim: pvcCount
  };
  const clusterCategoryCounts: Record<ClusterResourceCategory, number> = {
    All: nodeCount + namespaceCount,
    Node: nodeCount,
    Namespace: namespaceCount
  };
  const inventoryResources = useMemo(
    () => {
      if (activeResourceFamily === 'workloads') {
        return filteredWorkloads.map((workload) => ({
          kind: workload.type,
          status: workload.status,
          healthy: isHealthyStatus(workload.status),
          namespace: workload.namespace
        }));
      }

      if (activeResourceFamily === 'network') {
        return [
          ...(activeNetworkCategory === 'All' || activeNetworkCategory === 'Service'
            ? filteredServices.map((service) => ({
                kind: 'Service',
                status: t('workloads.active'),
                healthy: true,
                namespace: service.namespace
              }))
            : []),
          ...(activeNetworkCategory === 'All' || activeNetworkCategory === 'Ingress'
            ? filteredIngresses.map((ingress) => {
                const routed = hasReportedValue(ingress.address);
                return {
                  kind: 'Ingress',
                  status: routed ? t('workloads.routed') : t('workloads.pending'),
                  healthy: routed,
                  namespace: ingress.namespace
                };
              })
            : [])
        ];
      }

      if (activeResourceFamily === 'storage') {
        return filteredPVCs.map((pvc) => ({
          kind: 'PersistentVolumeClaim',
          status: pvc.status,
          healthy: isHealthyStatus(pvc.status),
          namespace: pvc.namespace
        }));
      }

      return [
        ...(activeClusterCategory === 'All' || activeClusterCategory === 'Node'
          ? nodes.map((node) => ({
              kind: 'Node',
              status: node.status,
              healthy: isHealthyStatus(node.status)
            }))
          : []),
        ...(activeClusterCategory === 'All' || activeClusterCategory === 'Namespace'
          ? namespaceItems.map((namespace) => ({
              kind: 'Namespace',
              status: namespace.status,
              healthy: isHealthyStatus(namespace.status)
            }))
          : [])
      ];
    },
    [
      activeClusterCategory,
      activeNetworkCategory,
      activeResourceFamily,
      filteredIngresses,
      filteredPVCs,
      filteredServices,
      filteredWorkloads,
      namespaceItems,
      nodes,
      t
    ]
  );
  const inventorySummary = buildResourceInventorySummary({
    resources: inventoryResources,
    selectedNamespace,
    showNamespaceFilter
  });
  const activeCategoryForSummary =
    activeResourceFamily === 'workloads'
      ? activeCategory
      : activeResourceFamily === 'network'
        ? activeNetworkCategory
        : activeResourceFamily === 'storage'
          ? activeStorageCategory
          : activeClusterCategory;
  const visibleResourceCount = inventorySummary.visibleCount;
  const totalResourceCount = resourceFamilies.find((family) => family.id === activeResourceFamily)?.count ?? visibleResourceCount;
  const activeFamilyLabel = t(`resources.families.${activeResourceFamily}`).toLocaleLowerCase();
  const resultSummaryParts = getResourceExplorerResultSummaryParts({
    activeResourceFamily,
    activeCategory: activeCategoryForSummary,
    selectedNamespace,
    showNamespaceFilter,
    showUnhealthyPodsOnly: showUnhealthyWorkloadsOnly,
    visibleCount: visibleResourceCount
  });
  const resultSummary = t(resultSummaryParts.summaryKey, {
    family: t(resultSummaryParts.familyLabelKey),
    category: t(resultSummaryParts.categoryLabelKey),
    namespace: resultSummaryParts.namespace === 'All'
      ? t('resources.inventory.allNamespaces')
      : resultSummaryParts.namespace,
    count: resultSummaryParts.visibleCount
  });
  const filterState = getResourceExplorerFilterState({
    activeResourceFamily,
    activeCategory,
    activeNetworkCategory,
    activeStorageCategory,
    activeClusterCategory,
    selectedNamespace,
    showNamespaceFilter,
    showUnhealthyPodsOnly: showUnhealthyWorkloadsOnly
  });
  useEffect(() => {
    if (hasManualResourceSelection || triageDefaultAppliedRef.current || unhealthyPodCount <= 0) return;
    const defaultSelection = getDefaultExplorerSelection(unhealthyPodCount);
    setActiveResourceFamily(defaultSelection.activeResourceFamily);
    setActiveCategory(defaultSelection.activeCategory);
    setShowUnhealthyPodsOnly(defaultSelection.showUnhealthyPodsOnly);
    triageDefaultAppliedRef.current = defaultSelection.showUnhealthyPodsOnly;
  }, [hasManualResourceSelection, unhealthyPodCount]);

  useEffect(() => {
    if (!onResourceQueryChange) return;
    const category =
      activeResourceFamily === 'workloads'
        ? activeCategory
        : activeResourceFamily === 'network'
          ? activeNetworkCategory
          : activeResourceFamily === 'storage'
            ? activeStorageCategory
            : activeClusterCategory;
    onResourceQueryChange({
      family: activeResourceFamily,
      kind: showUnhealthyWorkloadsOnly ? 'Pod' : category === 'All' ? undefined : category,
      namespace: showNamespaceFilter && selectedNamespace !== 'All' ? selectedNamespace : undefined,
      health: showUnhealthyWorkloadsOnly ? 'attention' : undefined
    });
  }, [
    activeCategory,
    activeClusterCategory,
    activeNetworkCategory,
    activeResourceFamily,
    activeStorageCategory,
    onResourceQueryChange,
    selectedNamespace,
    showNamespaceFilter,
    showUnhealthyWorkloadsOnly
  ]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMoreResources || !onLoadMoreResources) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && !isLoadingInitial && !isLoadingMore) {
        onLoadMoreResources();
      }
    }, { rootMargin: '280px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMoreResources, isLoadingInitial, isLoadingMore, onLoadMoreResources]);

  const markResourceSelectionChanged = () => setHasManualResourceSelection(true);

  const resetResourceFilters = () => {
    markResourceSelectionChanged();
    setSelectedNamespace('All');
    setActiveCategory('All');
    setActiveNetworkCategory('All');
    setActiveStorageCategory('All');
    setActiveClusterCategory('All');
    setShowUnhealthyPodsOnly(false);
  };
  const clearCurrentCategoryFilter = () => {
    markResourceSelectionChanged();
    if (activeResourceFamily === 'workloads') {
      setActiveCategory('All');
      setShowUnhealthyPodsOnly(false);
    } else if (activeResourceFamily === 'network') {
      setActiveNetworkCategory('All');
    } else if (activeResourceFamily === 'storage') {
      setActiveStorageCategory('All');
    } else {
      setActiveClusterCategory('All');
    }
  };

  return (
    <div className="flex-1 min-w-0 w-full max-w-full overflow-y-auto overflow-x-hidden bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-8 min-w-0 w-full max-w-full">
        <div className="min-w-0 w-full max-w-full">
          <h1 className="type-route-title">{title || t('resources.title')}</h1>
          <p className="type-body mt-2 break-words [overflow-wrap:anywhere]">{description}</p>
        </div>
      </header>

      <div className="mb-6 flex min-w-0 w-full max-w-full flex-col gap-3">
        <ResourceFamilyTabs
          families={resourceFamilies}
          activeFamily={activeResourceFamily}
          onSelect={(family) => {
            markResourceSelectionChanged();
            setActiveResourceFamily(family);
          }}
        />

        <div className="flex min-w-0 w-full max-w-full flex-col gap-2 lg:flex-row lg:items-start">
          {activeResourceFamily === 'workloads' && (
            <WorkloadTriageShortcut
              unhealthyPodCount={unhealthyPodCount}
              showUnhealthyPodsOnly={showUnhealthyPodsOnly}
              onToggle={() => {
                markResourceSelectionChanged();
                setShowUnhealthyPodsOnly((current) => {
                  setActiveCategory('All');
                  return !current;
                });
              }}
            />
          )}
          <ResourceFiltersInventoryPanel
            activeFilters={filterState.activeFilters}
            canResetFilters={filterState.canResetFilters}
            isOpen={isFiltersInventoryOpen}
            onToggle={() => setIsFiltersInventoryOpen((current) => !current)}
            resultSummary={resultSummary}
            visibleResourceCount={visibleResourceCount}
            totalResourceCount={totalResourceCount}
            activeFilterCount={filterState.activeFilterCount}
            activeFamilyLabel={activeFamilyLabel}
            showNamespaceFilter={showNamespaceFilter}
            selectedNamespace={selectedNamespace}
            namespaceOptions={namespaceOptions}
            onNamespaceChange={(namespace) => {
              markResourceSelectionChanged();
              setSelectedNamespace(namespace);
            }}
            activeResourceFamily={activeResourceFamily}
            activeCategory={activeCategory}
            activeNetworkCategory={activeNetworkCategory}
            activeStorageCategory={activeStorageCategory}
            activeClusterCategory={activeClusterCategory}
            workloadCategoryCounts={workloadCategoryCounts}
            networkCategoryCounts={networkCategoryCounts}
            storageCategoryCounts={storageCategoryCounts}
            clusterCategoryCounts={clusterCategoryCounts}
            inventorySummary={inventorySummary}
            onResetFilters={resetResourceFilters}
            onClearNamespaceFilter={() => {
              markResourceSelectionChanged();
              setSelectedNamespace('All');
            }}
            onClearUnhealthyPodsFilter={() => {
              markResourceSelectionChanged();
              setShowUnhealthyPodsOnly(false);
              setActiveCategory('All');
            }}
            onClearCategoryFilter={clearCurrentCategoryFilter}
            onWorkloadCategorySelect={(category) => {
              markResourceSelectionChanged();
              setActiveCategory(category);
              setShowUnhealthyPodsOnly(false);
            }}
            onNetworkCategorySelect={(category) => {
              markResourceSelectionChanged();
              setActiveNetworkCategory(category);
            }}
            onStorageCategorySelect={(category) => {
              markResourceSelectionChanged();
              setActiveStorageCategory(category);
            }}
            onClusterCategorySelect={(category) => {
              markResourceSelectionChanged();
              setActiveClusterCategory(category);
            }}
          />
        </div>
      </div>
      {activeResourceFamily === 'workloads' && (
        <WorkloadsSection
          items={filteredWorkloads}
          onSelect={setSelectedWorkload}
          showUnhealthyOnly={showUnhealthyWorkloadsOnly}
        />
      )}
      {activeResourceFamily === 'network' && (
        <NetworkSection
          activeCategory={activeNetworkCategory}
          ingresses={filteredIngresses}
          onSelect={setSelectedResource}
          services={filteredServices}
        />
      )}
      {activeResourceFamily === 'storage' && (
        <StorageSection
          activeCategory={activeStorageCategory}
          items={filteredPVCs}
          onSelect={setSelectedResource}
        />
      )}
      {activeResourceFamily === 'cluster' && (
        <ClusterSection
          activeCategory={activeClusterCategory}
          namespaces={namespaceItems}
          nodes={nodes}
          onSelect={setSelectedResource}
        />
      )}
      <div ref={loadMoreRef} className="mt-5 flex flex-col items-center gap-3">
        {resourceListError && (
          <p className="type-caption rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
            {resourceListError}
          </p>
        )}
        {isLoadingInitial && (
          <InlineLoadingIndicator label={t('resources.loading')} />
        )}
        {hasMoreResources && (
          <button
            type="button"
            onClick={onLoadMoreResources}
            disabled={isLoadingInitial || isLoadingMore}
            className="type-label rounded-lg border border-ui-border bg-ui-surface px-4 py-2 text-ui-text-muted transition-colors hover:text-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoadingMore ? t('resources.loadingMore') : t('resources.loadMore')}
          </button>
        )}
      </div>
      <WorkloadsExplorerDrawers
        canReadPodLogs={canReadPodLogs}
        onAnalyzePod={onAnalyzePod}
        onCloseResource={() => setSelectedResource(null)}
        onCloseWorkload={() => setSelectedWorkload(null)}
        onLoadPodLogs={onLoadPodLogs}
        resource={selectedResource}
        workload={selectedWorkload}
      />
    </div>
  );
};
