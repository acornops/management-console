import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Dashboard from '@/components/dashboard/Dashboard';
import { Button } from '@/components/common/Button';
import { PageSearchInput } from '@/components/common/PageSearchInput';
import { Select, SelectOption } from '@/components/common/Select';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneTargetIssueSummary } from '@/services/controlPlaneApi';
import { ClusterMetricHistoryPoint, KubernetesCluster } from '@/types';
import { getAgentConnectionState } from '@/utils/telemetry';
import type { ClusterCatalogRouteState, ClusterCatalogStatusFilter } from '@/utils/routes';

const CLUSTER_ISSUE_SUMMARY_REFRESH_MS = 30000;

function clusterMatchesCatalogState(cluster: KubernetesCluster, query: string, status: ClusterCatalogStatusFilter): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  const agentState = getAgentConnectionState(cluster);
  const matchesStatus =
    status === 'all' ||
    (status === 'connected' && agentState === 'connected') ||
    (status === 'disconnected' && agentState === 'disconnected') ||
    (status === 'not_installed' && agentState === 'not_installed');

  if (!matchesStatus) return false;
  if (!normalizedQuery) return true;

  return [
    cluster.name,
    cluster.cluster,
    cluster.namespace,
    cluster.workspaceId
  ].some((value) => value?.toLowerCase().includes(normalizedQuery));
}

function mergeClustersById(primary: KubernetesCluster[], secondary: KubernetesCluster[]): KubernetesCluster[] {
  const byId = new Map<string, KubernetesCluster>();
  for (const cluster of primary) byId.set(cluster.id, cluster);
  for (const cluster of secondary) byId.set(cluster.id, cluster);
  return [...byId.values()];
}

function withoutRecordKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!Object.prototype.hasOwnProperty.call(record, key)) return record;
  const next = { ...record };
  delete next[key];
  return next;
}

interface KubernetesClustersPageProps {
  kubernetesClusters: KubernetesCluster[];
  workspaceId?: string;
  workspaceName?: string;
  totalClusterCount?: number;
  onSelectKubernetesCluster: (cluster: KubernetesCluster) => void;
  onInstallAgent?: (clusterId: string) => void;
  onAddCluster?: () => void;
  onOpenClusterSettings?: (cluster: KubernetesCluster) => void;
  canDeleteKubernetesCluster?: (cluster: KubernetesCluster) => boolean;
  onDeleteKubernetesCluster?: (cluster: KubernetesCluster) => Promise<void> | void;
  onAppendWorkspaceKubernetesClusters?: (workspaceId: string, clusters: KubernetesCluster[]) => void;
  catalogState?: ClusterCatalogRouteState;
  onCatalogStateChange?: (state: ClusterCatalogRouteState) => void;
}

/**
 * Kubernetes cluster summary dashboard page, global or workspace-scoped.
 */
export const KubernetesClustersPage: React.FC<KubernetesClustersPageProps> = ({
  kubernetesClusters,
  workspaceId,
  workspaceName,
  totalClusterCount,
  onSelectKubernetesCluster,
  onInstallAgent,
  onAddCluster,
  onOpenClusterSettings,
  canDeleteKubernetesCluster,
  onDeleteKubernetesCluster,
  onAppendWorkspaceKubernetesClusters,
  catalogState,
  onCatalogStateChange
}) => {
  const { t } = useTranslation();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const requestSeqRef = useRef(0);
  const metricHistoryRequestSeqRef = useRef(0);
  const issueSummaryRequestSeqRef = useRef(0);
  const deletedClusterIdsRef = useRef(new Set<string>());
  const [localCatalogState, setLocalCatalogState] = useState<ClusterCatalogRouteState>({});
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadedClusterPageItems, setLoadedClusterPageItems] = useState<KubernetesCluster[] | null>(null);
  const [metricHistoryByClusterId, setMetricHistoryByClusterId] = useState<Record<string, ClusterMetricHistoryPoint[]>>({});
  const [issueSummaryByClusterId, setIssueSummaryByClusterId] = useState<Record<string, ControlPlaneTargetIssueSummary | undefined>>({});
  const activeCatalogState = catalogState ?? localCatalogState;
  const query = activeCatalogState.q ?? '';
  const status: ClusterCatalogStatusFilter = activeCatalogState.status ?? 'all';
  const statusOptions: Array<SelectOption<typeof status>> = [
    { value: 'all', label: t('dashboard.allStates') },
    { value: 'connected', label: t('dashboard.connected') },
    { value: 'disconnected', label: t('dashboard.disconnected') },
    { value: 'not_installed', label: t('dashboard.notInstalled') }
  ];
  const apiStatus =
    status === 'disconnected' ? 'offline' :
      status === 'not_installed' ? 'unknown' :
        undefined;
  const hasActiveFilter = Boolean(query.trim()) || status !== 'all';

  const setCatalogState = useCallback((nextState: ClusterCatalogRouteState) => {
    if (onCatalogStateChange) {
      onCatalogStateChange(nextState);
      return;
    }
    setLocalCatalogState(nextState);
  }, [onCatalogStateChange]);

  const updateCatalogState = useCallback((patch: Partial<ClusterCatalogRouteState>) => {
    const nextState: ClusterCatalogRouteState = {
      q: query || undefined,
      status: status === 'all' ? undefined : status,
      ...patch
    };
    setCatalogState({
      q: nextState.q?.trim() || undefined,
      status: nextState.status && nextState.status !== 'all' ? nextState.status : undefined
    });
  }, [query, setCatalogState, status]);

  const handleQueryChange = useCallback((nextQuery: string) => {
    updateCatalogState({ q: nextQuery || undefined });
  }, [updateCatalogState]);

  const handleStatusChange = useCallback((nextStatus: ClusterCatalogStatusFilter) => {
    updateCatalogState({ status: nextStatus === 'all' ? undefined : nextStatus });
  }, [updateCatalogState]);

  const handleDeleteKubernetesCluster = useCallback(async (cluster: KubernetesCluster) => {
    if (!onDeleteKubernetesCluster) return;

    await onDeleteKubernetesCluster(cluster);
    deletedClusterIdsRef.current.add(cluster.id);
    setLoadedClusterPageItems((current) =>
      current ? current.filter((item) => item.id !== cluster.id) : current
    );
    setMetricHistoryByClusterId((current) => withoutRecordKey(current, cluster.id));
    setIssueSummaryByClusterId((current) => withoutRecordKey(current, cluster.id));
  }, [onDeleteKubernetesCluster]);

  const loadClusters = useCallback(async (mode: 'replace' | 'append', cursor?: string) => {
    if (!workspaceId) return;
    const requestId = ++requestSeqRef.current;
    if (mode === 'replace') setIsLoading(true);
    if (mode === 'append') setIsLoadingMore(true);
    try {
      const page = await controlPlaneApi.listClustersForWorkspace(workspaceId, {
        limit: 50,
        cursor,
        q: query,
        status: apiStatus
      });
      if (requestId !== requestSeqRef.current) return;
      const livePageItems = page.items.filter((cluster) => !deletedClusterIdsRef.current.has(cluster.id));
      setNextCursor(page.nextCursor);
      setLoadedClusterPageItems((current) =>
        mode === 'replace' ? livePageItems : mergeClustersById(current || [], livePageItems)
      );
      onAppendWorkspaceKubernetesClusters?.(workspaceId, livePageItems);
    } catch (error) {
      console.error('Failed loading clusters', error);
    } finally {
      if (requestId === requestSeqRef.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, [apiStatus, onAppendWorkspaceKubernetesClusters, query, workspaceId]);

  useEffect(() => {
    deletedClusterIdsRef.current.clear();
  }, [workspaceId]);

  useEffect(() => {
    setLoadedClusterPageItems(null);
    setNextCursor(undefined);
  }, [workspaceId, query, status]);

  useEffect(() => {
    if (!workspaceId) return undefined;
    const timer = window.setTimeout(() => {
      void loadClusters('replace');
    }, 300);
    return () => window.clearTimeout(timer);
  }, [loadClusters, workspaceId]);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || !nextCursor || !workspaceId) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && !isLoading && !isLoadingMore && nextCursor) {
        void loadClusters('append', nextCursor);
      }
    }, { rootMargin: '320px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [isLoading, isLoadingMore, loadClusters, nextCursor, workspaceId]);

  const loadIssueSummaries = useCallback(() => {
    if (kubernetesClusters.length === 0) {
      setIssueSummaryByClusterId({});
      return;
    }

    const requestId = ++issueSummaryRequestSeqRef.current;
    const activeClusterIds = new Set(kubernetesClusters.map((cluster) => cluster.id));

    void Promise.allSettled(
      kubernetesClusters.map(async (cluster) => ({
        clusterId: cluster.id,
        summary: await controlPlaneApi.getTargetIssueSummary(cluster.workspaceId, cluster.id)
      }))
    )
      .then((results) => {
        if (requestId !== issueSummaryRequestSeqRef.current) return;
        setIssueSummaryByClusterId((current) => {
          const next: Record<string, ControlPlaneTargetIssueSummary | undefined> = {};
          for (const clusterId of activeClusterIds) {
            next[clusterId] = current[clusterId];
          }
          for (const result of results) {
            if (result.status === 'fulfilled') {
              next[result.value.clusterId] = result.value.summary;
            }
          }
          return next;
        });
      })
      .catch((error) => {
        if (requestId === issueSummaryRequestSeqRef.current) {
          console.error('Failed loading cluster issue summaries', error);
        }
      });
  }, [kubernetesClusters]);

  useEffect(() => {
    loadIssueSummaries();
  }, [loadIssueSummaries]);

  useEffect(() => {
    if (kubernetesClusters.length === 0) return undefined;
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      loadIssueSummaries();
    }, CLUSTER_ISSUE_SUMMARY_REFRESH_MS);
    return () => window.clearInterval(intervalId);
  }, [kubernetesClusters.length, loadIssueSummaries]);

  const metricHistoryFetchKey = useMemo(
    () => kubernetesClusters
      .filter((cluster) => getAgentConnectionState(cluster) === 'connected')
      .map((cluster) => `${cluster.workspaceId}:${cluster.id}:${cluster.lastUpdate}`)
      .sort()
      .join('|'),
    [kubernetesClusters]
  );

  useEffect(() => {
    const connectedClusters = kubernetesClusters.filter((cluster) => getAgentConnectionState(cluster) === 'connected');
    if (connectedClusters.length === 0) {
      setMetricHistoryByClusterId({});
      return;
    }

    const requestId = ++metricHistoryRequestSeqRef.current;
    const activeConnectedClusterIds = new Set(connectedClusters.map((cluster) => cluster.id));
    const clusterIdsByWorkspaceId = new Map<string, string[]>();
    connectedClusters.forEach((cluster) => {
      const clusterIds = clusterIdsByWorkspaceId.get(cluster.workspaceId) || [];
      clusterIds.push(cluster.id);
      clusterIdsByWorkspaceId.set(cluster.workspaceId, clusterIds);
    });

    void Promise.all(
      Array.from(clusterIdsByWorkspaceId.entries()).map(async ([targetWorkspaceId, clusterIds]) =>
        controlPlaneApi.getWorkspaceClusterMetricsHistory(targetWorkspaceId, clusterIds, { window: '6h', limit: 48 })
      )
    )
      .then((historyResults) => {
        if (requestId !== metricHistoryRequestSeqRef.current) return;
        setMetricHistoryByClusterId((current) => {
          const next: Record<string, ClusterMetricHistoryPoint[]> = {};
          for (const clusterId of activeConnectedClusterIds) {
            if (Object.prototype.hasOwnProperty.call(current, clusterId)) {
              next[clusterId] = current[clusterId];
            }
          }
          return {
            ...next,
            ...Object.assign({}, ...historyResults)
          };
        });
      })
      .catch((error) => {
        if (requestId === metricHistoryRequestSeqRef.current) {
          console.error('Failed loading cluster metric history', error);
        }
      });
  }, [metricHistoryFetchKey]);

  const clientFilteredClusters = useMemo(
    () => kubernetesClusters.filter((cluster) => clusterMatchesCatalogState(cluster, query, status)),
    [kubernetesClusters, query, status]
  );

  const visibleClusters = useMemo(() => {
    const mergedClusters = loadedClusterPageItems
      ? mergeClustersById(loadedClusterPageItems, clientFilteredClusters)
      : clientFilteredClusters;
    return mergedClusters.filter((cluster) => clusterMatchesCatalogState(cluster, query, status));
  }, [clientFilteredClusters, loadedClusterPageItems, query, status]);

  const summaryClusters = useMemo(() => (
    loadedClusterPageItems
      ? mergeClustersById(loadedClusterPageItems, kubernetesClusters)
      : kubernetesClusters
  ), [kubernetesClusters, loadedClusterPageItems]);

  const clustersWithMetricHistory = useMemo(
    () => visibleClusters.map((cluster) =>
      getAgentConnectionState(cluster) === 'connected' && Object.prototype.hasOwnProperty.call(metricHistoryByClusterId, cluster.id)
        ? { ...cluster, metricHistory: metricHistoryByClusterId[cluster.id] }
        : cluster
    ),
    [visibleClusters, metricHistoryByClusterId]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar">
        <Dashboard
          kubernetesClusters={clustersWithMetricHistory}
          summaryKubernetesClusters={summaryClusters}
          onSelectKubernetesCluster={onSelectKubernetesCluster}
          onInstallAgent={onInstallAgent}
          onOpenClusterSettings={onOpenClusterSettings}
          workspaceName={workspaceName}
          totalClusterCount={totalClusterCount}
          issueSummaryByClusterId={issueSummaryByClusterId}
          hasActiveClusterFilter={hasActiveFilter}
          controls={workspaceId ? (
            <>
              <label htmlFor="cluster-search" className="sr-only">
                {t('dashboard.searchClusters')}
              </label>
              <PageSearchInput
                id="cluster-search"
                value={query}
                onChange={(event) => handleQueryChange(event.target.value)}
                placeholder={t('dashboard.searchClusters')}
                className="lg:w-full"
              />
              <Select<typeof status>
                value={status}
                options={statusOptions}
                onChange={handleStatusChange}
                className="min-w-0"
                ariaLabel={t('dashboard.filterClustersByState')}
              />
            </>
          ) : undefined}
          catalogFooter={workspaceId ? (
            <div ref={sentinelRef} className="flex justify-center py-2">
              {nextCursor && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void loadClusters('append', nextCursor)}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? t('common.loading') : t('common.loadMore')}
                </Button>
              )}
            </div>
          ) : undefined}
          onAddCluster={onAddCluster}
          canDeleteKubernetesCluster={canDeleteKubernetesCluster}
          onDeleteKubernetesCluster={onDeleteKubernetesCluster ? handleDeleteKubernetesCluster : undefined}
        />
      </div>
    </div>
  );
};
