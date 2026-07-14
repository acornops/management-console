import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ResourceCategoryTabs } from '@/components/common/ResourceCategoryTabs';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { SelectOption } from '@/components/common/Select';
import { Workload } from '@/types';
import { InfrastructureResource } from '@/features/kubernetes-cluster-detail/components/workloads/ResourceDetailsDrawer';
import {
  ResourceSearchFilterBar,
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
  buildWorkloadCategoryCounts,
  getDefaultExplorerSelection,
  hasReportedValue,
  isHealthyStatus,
  isUnhealthyPod,
  NamespaceExplorerItem,
  NetworkResourceCategory,
  ResourceFamily,
  sortAttentionFirst,
  StorageResourceCategory,
  WorkloadCategoryCounts,
  workloadCategories,
  WorkloadExplorerItem,
  WorkloadsExplorerProps
} from '@/features/kubernetes-cluster-detail/components/workloads/workloadExplorerParts';
import { safeStorage } from '@/utils/safeStorage';

const SHOW_UNHEALTHY_ONLY_STORAGE_KEY = 'acornops_resources_show_unhealthy_only';
const resourceFamilyCategories: ReadonlyArray<ResourceFamily> = ['workloads', 'network', 'storage', 'cluster'];

function getSearchTokens(value: string): string[] {
  return value.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function matchesResourceSearch(searchTerm: string, values: Array<string | number | undefined | null>): boolean {
  const tokens = getSearchTokens(searchTerm);
  if (tokens.length === 0) return true;
  const searchable = values
    .filter((value) => value !== undefined && value !== null)
    .map(String)
    .join(' ')
    .toLowerCase();
  return tokens.every((token) => searchable.includes(token));
}

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
  const [resourceSearchTerm, setResourceSearchTerm] = useState('');
  const [showUnhealthyPodsOnly, setShowUnhealthyPodsOnly] = useState(shouldShowUnhealthyPodsInitially);
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
  const searchedWorkloads = useMemo(
    () =>
      namespaceScopedWorkloads.filter((workload) =>
        matchesResourceSearch(resourceSearchTerm, [
          workload.name,
          workload.id,
          workload.type,
          workload.namespace,
          workload.clusterName,
          workload.status,
          workload.node,
          workload.replicas,
          workload.restarts,
          workload.schedule,
          workload.lastRun,
          workload.duration
        ])
      ),
    [namespaceScopedWorkloads, resourceSearchTerm]
  );
  const filteredWorkloads = useMemo(
    () =>
      sortAttentionFirst(
        searchedWorkloads.filter((workload) =>
          showUnhealthyWorkloadsOnly
            ? isUnhealthyPod(workload)
            : activeCategory === 'All' || workload.type === activeCategory
        ),
        (workload) => !isHealthyStatus(workload.status)
      ),
    [activeCategory, searchedWorkloads, showUnhealthyWorkloadsOnly]
  );
  const filteredServices = useMemo(
    () =>
      services.filter((service) =>
        (selectedNamespace === 'All' || service.namespace === selectedNamespace) &&
        matchesResourceSearch(resourceSearchTerm, [
          service.name,
          service.id,
          service.type,
          service.namespace,
          service.clusterName,
          service.clusterIP,
          service.ports,
          service.age
        ])
      ),
    [resourceSearchTerm, selectedNamespace, services]
  );
  const filteredIngresses = useMemo(
    () =>
      sortAttentionFirst(
        ingresses.filter((ingress) =>
          (selectedNamespace === 'All' || ingress.namespace === selectedNamespace) &&
          matchesResourceSearch(resourceSearchTerm, [
            ingress.name,
            ingress.id,
            'Ingress',
            ingress.namespace,
            ingress.clusterName,
            ingress.address,
            ingress.hosts.join(' '),
            ingress.age
          ])
        ),
        (ingress) => !hasReportedValue(ingress.address)
      ),
    [ingresses, resourceSearchTerm, selectedNamespace]
  );
  const filteredPVCs = useMemo(
    () =>
      sortAttentionFirst(
        pvcs.filter((pvc) =>
          (selectedNamespace === 'All' || pvc.namespace === selectedNamespace) &&
          matchesResourceSearch(resourceSearchTerm, [
            pvc.name,
            pvc.id,
            'PersistentVolumeClaim',
            pvc.namespace,
            pvc.clusterName,
            pvc.status,
            pvc.capacity,
            pvc.storageClass,
            pvc.accessModes.join(' '),
            pvc.volumeName,
            pvc.volumeMode,
            pvc.age
          ])
        ),
        (pvc) => !isHealthyStatus(pvc.status)
      ),
    [pvcs, resourceSearchTerm, selectedNamespace]
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
  const filteredNodes = useMemo(
    () =>
      sortAttentionFirst(
        nodes.filter((node) =>
          matchesResourceSearch(resourceSearchTerm, [
            node.name,
            'Node',
            node.clusterName,
            node.status,
            node.role,
            node.version,
            node.cpu,
            node.memory,
            node.osImage,
            node.containerRuntimeVersion,
            node.architecture,
            node.operatingSystem
          ])
        ),
        (node) => !isHealthyStatus(node.status)
      ),
    [nodes, resourceSearchTerm]
  );
  const filteredNamespaceItems = useMemo(
    () =>
      sortAttentionFirst(
        namespaceItems.filter((namespace) =>
          matchesResourceSearch(resourceSearchTerm, [
            namespace.name,
            namespace.id,
            'Namespace',
            namespace.clusterName,
            namespace.status,
            namespace.workloadCount,
            namespace.serviceCount,
            namespace.ingressCount,
            namespace.pvcCount,
            namespace.age
          ])
        ),
        (namespace) => !isHealthyStatus(namespace.status)
      ),
    [namespaceItems, resourceSearchTerm]
  );
  const resourceFamilies: Array<{ id: ResourceFamily; count: number }> = [
    {
      id: 'workloads',
      count: resourceFamilyCounts?.workloads ?? workloads.length
    },
    {
      id: 'network',
      count: resourceFamilyCounts?.network ?? services.length + ingresses.length
    },
    {
      id: 'storage',
      count: resourceFamilyCounts?.storage ?? pvcs.length
    },
    {
      id: 'cluster',
      count: resourceFamilyCounts?.cluster ?? nodes.length + namespaceItems.length
    }
  ];
  const resourceFamilyCountsForTabs: Partial<Record<ResourceFamily, number>> = Object.fromEntries(
    resourceFamilies.map((family) => [family.id, family.count])
  );
  const showNamespaceFilter = activeResourceFamily !== 'cluster';
  const hasResourceSearch = resourceSearchTerm.trim().length > 0;
  const filteredEmptyMessage = hasResourceSearch ? t('resources.emptyFiltered') : undefined;
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
      health: showUnhealthyWorkloadsOnly ? 'attention' : undefined,
      q: resourceSearchTerm.trim() || undefined
    });
  }, [
    activeCategory,
    activeClusterCategory,
    activeNetworkCategory,
    activeResourceFamily,
    activeStorageCategory,
    onResourceQueryChange,
    resourceSearchTerm,
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

  return (
    <div className="flex-1 min-w-0 w-full max-w-full overflow-y-auto overflow-x-hidden bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-8 min-w-0 w-full max-w-full">
        <div className="min-w-0 w-full max-w-full">
          <h1 className="type-route-title">{title || t('resources.title')}</h1>
          <p className="type-body mt-2 break-words [overflow-wrap:anywhere]">{description}</p>
        </div>
      </header>

      <div className="mb-6 flex min-w-0 w-full max-w-full flex-col gap-4">
        <ResourceCategoryTabs<ResourceFamily>
          categories={resourceFamilyCategories}
          active={activeResourceFamily}
          counts={resourceFamilyCountsForTabs}
          labelPrefix="resources.families"
          ariaLabel={t('resources.families.label')}
          idBase="resource-family"
          controlsId="resource-family-panel"
          onSelect={(family) => {
            markResourceSelectionChanged();
            setActiveResourceFamily(family);
          }}
        />

        <ResourceSearchFilterBar
          activeResourceFamily={activeResourceFamily}
          activeCategory={activeCategory}
          activeNetworkCategory={activeNetworkCategory}
          activeStorageCategory={activeStorageCategory}
          activeClusterCategory={activeClusterCategory}
          workloadCategoryCounts={workloadCategoryCounts}
          networkCategoryCounts={networkCategoryCounts}
          storageCategoryCounts={storageCategoryCounts}
          clusterCategoryCounts={clusterCategoryCounts}
          searchTerm={resourceSearchTerm}
          onSearchChange={(nextSearchTerm) => {
            markResourceSelectionChanged();
            setResourceSearchTerm(nextSearchTerm);
          }}
          showNamespaceFilter={showNamespaceFilter}
          selectedNamespace={selectedNamespace}
          namespaceOptions={namespaceOptions}
          onNamespaceChange={(namespace) => {
            markResourceSelectionChanged();
            setSelectedNamespace(namespace);
          }}
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
        >
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
        </ResourceSearchFilterBar>
      </div>
      <div id="resource-family-panel" role="tabpanel" tabIndex={0} aria-labelledby={`resource-family-${activeResourceFamily}-tab`} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25">
        {activeResourceFamily === 'workloads' && (
          <WorkloadsSection
          emptyMessage={filteredEmptyMessage}
          items={filteredWorkloads}
          onSelect={setSelectedWorkload}
          showUnhealthyOnly={showUnhealthyWorkloadsOnly}
        />
        )}
        {activeResourceFamily === 'network' && (
        <NetworkSection
          activeCategory={activeNetworkCategory}
          emptyMessage={filteredEmptyMessage}
          ingresses={filteredIngresses}
          onSelect={setSelectedResource}
          services={filteredServices}
        />
        )}
        {activeResourceFamily === 'storage' && (
        <StorageSection
          activeCategory={activeStorageCategory}
          emptyMessage={filteredEmptyMessage}
          items={filteredPVCs}
          onSelect={setSelectedResource}
        />
        )}
        {activeResourceFamily === 'cluster' && (
        <ClusterSection
          activeCategory={activeClusterCategory}
          emptyMessage={filteredEmptyMessage}
          namespaces={filteredNamespaceItems}
          nodes={filteredNodes}
          onSelect={setSelectedResource}
        />
        )}
      </div>
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
            className="control-target type-label rounded-lg border border-ui-border bg-ui-surface px-4 py-2 text-ui-text-muted transition-colors hover:text-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
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
