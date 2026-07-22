import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WorkloadsExplorer } from '@/features/kubernetes-cluster-detail/components/workloads/WorkloadsExplorer';
import type {
  ResourceFamily,
  WorkloadExplorerItem
} from '@/features/kubernetes-cluster-detail/components/workloads/workloadExplorerParts';
import { mapClusterResourcePageItems } from '@/services/control-plane/clusterMappers';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import { ControlPlanePodLogsOptions, controlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneResourcePageItem } from '@/services/controlPlaneApi';
import { KubernetesCluster } from '@/types';
import { useCursorCollection } from '@/hooks/useCursorCollection';

interface ResourcesViewProps {
  cluster: KubernetesCluster;
  canReadPodLogs?: boolean;
  onAnalyzePod?: (podName: string) => void;
}

type ResourceQuery = {
  family: ResourceFamily;
  kind?: string;
  namespace?: string;
  health?: string;
  q?: string;
};

export const ResourcesView: React.FC<ResourcesViewProps> = ({ cluster, canReadPodLogs = false, onAnalyzePod }) => {
  const { t } = useTranslation();
  const [resourceQuery, setResourceQuery] = useState<ResourceQuery>({ family: 'workloads' });
  const loadResourcePage = useCallback(async ({ cursor, filters, limit, signal }: {
    cursor?: string;
    filters: ResourceQuery;
    limit: number;
    signal: AbortSignal;
  }) => {
    try {
      return await controlPlaneApi.listClusterResources(cluster.workspaceId, cluster.id, { limit, cursor, ...filters, signal });
    } catch (error) {
      throw new Error(formatControlPlaneError(error, t('resources.loadFailed'), { area: 'cluster' }));
    }
  }, [cluster.id, cluster.workspaceId, t]);
  const resourceCollection = useCursorCollection({
    filters: resourceQuery,
    getKey: (item: ControlPlaneResourcePageItem) => `${item.kind}:${item.namespace || ''}:${item.name}`,
    loadPage: loadResourcePage,
    pageSize: 100,
    strategy: 'sentinel'
  });
  const resourceItems = resourceCollection.items;
  const isLoadingInitial = resourceCollection.phase === 'loading' || resourceCollection.phase === 'refreshing';
  const isLoadingMore = resourceCollection.phase === 'loadingMore';
  const resourceListError = resourceCollection.error || null;
  const mappedPageResources = useMemo(
    () => mapClusterResourcePageItems(resourceItems),
    [resourceItems]
  );
  const updateResourceQuery = useCallback((query: ResourceQuery) => {
    setResourceQuery((current) =>
      current.family === query.family &&
      current.kind === query.kind &&
      current.namespace === query.namespace &&
      current.health === query.health &&
      current.q === query.q
        ? current
        : query
    );
  }, []);
  const workloads = useMemo(
    () =>
      mappedPageResources.workloads.map((workload) => ({
        ...workload,
        clusterName: cluster.name,
        clusterId: cluster.id,
        workspaceId: cluster.workspaceId
      })),
    [cluster.id, cluster.name, cluster.workspaceId, mappedPageResources.workloads]
  );
  const services = useMemo(
    () =>
      mappedPageResources.services.map((service) => ({
        ...service,
        clusterName: cluster.name
      })),
    [cluster.name, mappedPageResources.services]
  );
  const ingresses = useMemo(
    () =>
      mappedPageResources.ingresses.map((ingress) => ({
        ...ingress,
        clusterName: cluster.name
      })),
    [cluster.name, mappedPageResources.ingresses]
  );
  const pvcs = useMemo(
    () =>
      mappedPageResources.pvcs.map((pvc) => ({
        ...pvc,
        clusterName: cluster.name
      })),
    [cluster.name, mappedPageResources.pvcs]
  );
  const nodes = useMemo(
    () =>
      mappedPageResources.nodes.map((node) => ({
        ...node,
        clusterName: cluster.name
      })),
    [cluster.name, mappedPageResources.nodes]
  );
  const namespaces = useMemo(
    () =>
      mappedPageResources.namespaces.map((namespace) => ({
        ...namespace,
        clusterName: cluster.name
      })),
    [cluster.name, mappedPageResources.namespaces]
  );

  return (
    <WorkloadsExplorer
      title={t('resources.title')}
      description={t('resources.description', { name: cluster.name })}
      workloads={workloads}
      services={services}
      ingresses={ingresses}
      pvcs={pvcs}
      nodes={nodes}
      namespaces={namespaces}
      canReadPodLogs={canReadPodLogs}
      isLoadingInitial={isLoadingInitial}
      isLoadingMore={isLoadingMore}
      hasMoreResources={Boolean(resourceCollection.nextCursor)}
      resourceListError={resourceListError}
      resourceFamilyCounts={cluster.resourceSummary?.resourceFamilyCounts}
      resourceKindCounts={cluster.resourceSummary?.resourceKindCounts}
      onResourceQueryChange={updateResourceQuery}
      loadMoreSentinelRef={resourceCollection.sentinelRef}
      onLoadMoreResources={() => void resourceCollection.loadMore()}
      onLoadPodLogs={async (workload, options: ControlPlanePodLogsOptions) => {
        if (!canReadPodLogs || workload.type !== 'Pod') {
          throw new Error(t('workloads.logsUnavailable'));
        }
        return controlPlaneApi.getPodLogs(cluster.workspaceId, cluster.id, workload.namespace, workload.name, options);
      }}
      onAnalyzePod={(workload) => onAnalyzePod?.(workload.name)}
    />
  );
};
