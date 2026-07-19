import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const requestSeqRef = useRef(0);
  const [resourceQuery, setResourceQuery] = useState<ResourceQuery>({ family: 'workloads' });
  const [resourceItems, setResourceItems] = useState<ControlPlaneResourcePageItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [resourceListError, setResourceListError] = useState<string | null>(null);
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
  const loadResources = useCallback(async (mode: 'replace' | 'append', cursor?: string) => {
    const requestId = ++requestSeqRef.current;
    if (mode === 'replace') {
      setIsLoadingInitial(true);
      setResourceItems([]);
      setNextCursor(undefined);
    } else {
      setIsLoadingMore(true);
    }
    setResourceListError(null);
    try {
      const page = await controlPlaneApi.listClusterResources(cluster.workspaceId, cluster.id, {
        limit: 100,
        cursor,
        family: resourceQuery.family,
        kind: resourceQuery.kind,
        namespace: resourceQuery.namespace,
        health: resourceQuery.health,
        q: resourceQuery.q
      });
      if (requestId !== requestSeqRef.current) return;
      setResourceItems((current) => mode === 'append' ? [...current, ...page.items] : page.items);
      setNextCursor(page.nextCursor);
    } catch (error) {
      if (requestId !== requestSeqRef.current) return;
      setResourceListError(formatControlPlaneError(error, t('resources.loadFailed'), { area: 'cluster' }));
      if (mode === 'replace') {
        setResourceItems([]);
        setNextCursor(undefined);
      }
    } finally {
      if (requestId === requestSeqRef.current) {
        setIsLoadingInitial(false);
        setIsLoadingMore(false);
      }
    }
  }, [cluster.id, cluster.workspaceId, resourceQuery, t]);

  const loadPodLogs = useCallback(async (workload: WorkloadExplorerItem, options: ControlPlanePodLogsOptions) => {
    if (!canReadPodLogs || workload.type !== 'Pod') {
      throw new Error(t('workloads.logsUnavailable'));
    }
    return controlPlaneApi.getPodLogs(cluster.workspaceId, cluster.id, workload.namespace, workload.name, options);
  }, [canReadPodLogs, cluster.id, cluster.workspaceId, t]);

  useEffect(() => {
    void loadResources('replace');
  }, [loadResources]);

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
      hasMoreResources={Boolean(nextCursor)}
      resourceListError={resourceListError}
      resourceFamilyCounts={cluster.resourceSummary?.resourceFamilyCounts}
      resourceKindCounts={cluster.resourceSummary?.resourceKindCounts}
      onResourceQueryChange={updateResourceQuery}
      onLoadMoreResources={() => {
        if (nextCursor && !isLoadingInitial && !isLoadingMore) {
          void loadResources('append', nextCursor);
        }
      }}
      onLoadPodLogs={loadPodLogs}
      onAnalyzePod={(workload) => onAnalyzePod?.(workload.name)}
    />
  );
};
