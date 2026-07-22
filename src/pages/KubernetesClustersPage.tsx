import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCursorCollection } from '@/hooks/useCursorCollection';
import { useTranslation } from 'react-i18next';
import Dashboard from '@/components/dashboard/Dashboard';
import { Button } from '@/components/common/Button';
import { createDiscoveryFilterGroup, DiscoveryFilterBar } from '@/components/common/DiscoveryFilterBar';
import { useTargetIssueSummaries } from '@/features/targets/catalog/useTargetIssueSummaries';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneTargetIssueSummary } from '@/services/controlPlaneApi';
import { ClusterMetricHistoryPoint, HealthStatus, KubernetesCluster } from '@/types';
import { getAgentConnectionState, getEffectiveHealthStatus } from '@/utils/telemetry';
import type { ClusterCatalogRouteState, ClusterCatalogStatusFilter } from '@/utils/routes';

const CLUSTER_STATUS_FILTERS: ReadonlyArray<ClusterCatalogStatusFilter> = [
  'all',
  'attention',
  'healthy',
  'not_installed'
];

function clusterNeedsAttention(cluster: KubernetesCluster, issueSummary?: ControlPlaneTargetIssueSummary): boolean {
  const agentState = getAgentConnectionState(cluster);
  if (agentState === 'not_installed') return false;
  if (agentState === 'disconnected') return true;
  if (getEffectiveHealthStatus(cluster) !== HealthStatus.GREEN) return true;
  return Boolean(issueSummary && (issueSummary.critical > 0 || issueSummary.warning > 0 || issueSummary.active > 0));
}

function clusterMatchesCatalogState(
  cluster: KubernetesCluster,
  query: string,
  status: ClusterCatalogStatusFilter,
  issueSummary?: ControlPlaneTargetIssueSummary
): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  const agentState = getAgentConnectionState(cluster);
  const matchesStatus =
    status === 'all' ||
    (status === 'attention' && clusterNeedsAttention(cluster, issueSummary)) ||
    (status === 'healthy' && agentState === 'connected' && !clusterNeedsAttention(cluster, issueSummary)) ||
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
  canInstallAgent?: (cluster: KubernetesCluster) => boolean;
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
  canInstallAgent,
  onAddCluster,
  onOpenClusterSettings,
  canDeleteKubernetesCluster,
  onDeleteKubernetesCluster,
  onAppendWorkspaceKubernetesClusters,
  catalogState,
  onCatalogStateChange
}) => {
  const { t } = useTranslation();
  const metricHistoryRequestSeqRef = useRef(0);
  const deletedClusterIdsRef = useRef(new Set<string>());
  const [localCatalogState, setLocalCatalogState] = useState<ClusterCatalogRouteState>({});
  const [catalogRequestFilters, setCatalogRequestFilters] = useState({ q: '', status: undefined as string | undefined, workspaceId });
  const [metricHistoryByClusterId, setMetricHistoryByClusterId] = useState<Record<string, ClusterMetricHistoryPoint[]>>({});
  const [metricLoadStateByClusterId, setMetricLoadStateByClusterId] = useState<Record<string, 'loading' | 'ready' | 'error'>>({});
  const [metricHistoryRetryNonce, setMetricHistoryRetryNonce] = useState(0);
  const {
    summaryByTargetId: issueSummaryByClusterId,
    loadStateByTargetId: issueSummaryLoadStateByClusterId
  } = useTargetIssueSummaries(kubernetesClusters);
  const activeCatalogState = catalogState ?? localCatalogState;
  const query = activeCatalogState.q ?? '';
  const status: ClusterCatalogStatusFilter = activeCatalogState.status ?? 'all';
  const statusLabels: Record<ClusterCatalogStatusFilter, string> = {
    all: t('dashboard.allStates'),
    attention: t('dashboard.needsAttention'),
    healthy: t('dashboard.healthy'),
    not_installed: t('dashboard.notInstalled')
  };
  const hasActiveFilter = Boolean(query.trim()) || status !== 'all';
  const hasClusterInventory = (totalClusterCount ?? kubernetesClusters.length) > 0;
  const hasCompleteCatalogCounts = totalClusterCount === undefined || kubernetesClusters.length >= totalClusterCount;
  const hasCompleteIssueSummaries = kubernetesClusters.every((cluster) =>
    Object.prototype.hasOwnProperty.call(issueSummaryByClusterId, cluster.id) && issueSummaryByClusterId[cluster.id] !== undefined
  );
  const catalogCounts = useMemo<Partial<Record<ClusterCatalogStatusFilter, number>>>(() => {
    const counts: Partial<Record<ClusterCatalogStatusFilter, number>> = {
      all: totalClusterCount ?? kubernetesClusters.length
    };
    counts.not_installed = kubernetesClusters.filter((cluster) =>
      getAgentConnectionState(cluster) === 'not_installed'
    ).length;
    if (!hasCompleteCatalogCounts || !hasCompleteIssueSummaries) return counts;

    counts.attention = kubernetesClusters.filter((cluster) =>
      clusterNeedsAttention(cluster, issueSummaryByClusterId[cluster.id])
    ).length;
    counts.healthy = kubernetesClusters.filter((cluster) =>
      getAgentConnectionState(cluster) === 'connected' &&
      !clusterNeedsAttention(cluster, issueSummaryByClusterId[cluster.id])
    ).length;
    return counts;
  }, [hasCompleteCatalogCounts, hasCompleteIssueSummaries, issueSummaryByClusterId, kubernetesClusters, totalClusterCount]);

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
    setMetricHistoryByClusterId((current) => withoutRecordKey(current, cluster.id));
  }, [onDeleteKubernetesCluster]);

  const loadClusterPage = useCallback(({ cursor, filters, limit, signal }: {
    cursor?: string;
    filters: typeof catalogRequestFilters;
    limit: number;
    signal: AbortSignal;
  }) => workspaceId
    ? controlPlaneApi.listClustersForWorkspace(workspaceId, { limit, cursor, ...filters, signal })
    : Promise.resolve({ items: [] as KubernetesCluster[] }), [workspaceId]);
  const clusterCollection = useCursorCollection({
    filters: catalogRequestFilters,
    getKey: (cluster: KubernetesCluster) => cluster.id,
    loadPage: loadClusterPage,
    pageSize: 50,
    strategy: 'sentinel'
  });
  const loadedClusterPageItems = useMemo(
    () => clusterCollection.items.filter((cluster) => !deletedClusterIdsRef.current.has(cluster.id)),
    [clusterCollection.items]
  );
  const nextCursor = clusterCollection.nextCursor;
  const isLoading = clusterCollection.phase === 'loading' || clusterCollection.phase === 'refreshing';
  const isLoadingMore = clusterCollection.phase === 'loadingMore';
  const catalogLoadError = clusterCollection.phase === 'error';

  useEffect(() => {
    if (workspaceId && clusterCollection.phase === 'ready') {
      onAppendWorkspaceKubernetesClusters?.(workspaceId, loadedClusterPageItems);
    }
  }, [clusterCollection.phase, loadedClusterPageItems, onAppendWorkspaceKubernetesClusters, workspaceId]);

  useEffect(() => {
    deletedClusterIdsRef.current.clear();
  }, [workspaceId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCatalogRequestFilters({ q: query, status: status === 'not_installed' ? 'unknown' : undefined, workspaceId });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, status, workspaceId]);

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
      setMetricLoadStateByClusterId({});
      return;
    }

    const requestId = ++metricHistoryRequestSeqRef.current;
    const activeConnectedClusterIds = new Set(connectedClusters.map((cluster) => cluster.id));
    setMetricLoadStateByClusterId((current) => Object.fromEntries(
      connectedClusters.map((cluster) => [cluster.id, current[cluster.id] === 'ready' ? 'ready' : 'loading'])
    ));
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
        setMetricLoadStateByClusterId(Object.fromEntries(
          connectedClusters.map((cluster) => [cluster.id, 'ready'])
        ));
      })
      .catch((error) => {
        if (requestId === metricHistoryRequestSeqRef.current) {
          console.error('Failed loading cluster metric history', error);
          setMetricLoadStateByClusterId(Object.fromEntries(
            connectedClusters.map((cluster) => [cluster.id, 'error'])
          ));
        }
      });
  }, [metricHistoryFetchKey, metricHistoryRetryNonce]);

  const clientFilteredClusters = useMemo(
    () => kubernetesClusters.filter((cluster) => clusterMatchesCatalogState(cluster, query, status, issueSummaryByClusterId[cluster.id])),
    [issueSummaryByClusterId, kubernetesClusters, query, status]
  );

  const visibleClusters = useMemo(() => {
    const mergedClusters = loadedClusterPageItems.length > 0
      ? mergeClustersById(loadedClusterPageItems, clientFilteredClusters)
      : clientFilteredClusters;
    return mergedClusters.filter((cluster) => clusterMatchesCatalogState(cluster, query, status, issueSummaryByClusterId[cluster.id]));
  }, [clientFilteredClusters, issueSummaryByClusterId, loadedClusterPageItems, query, status]);

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
          onSelectKubernetesCluster={onSelectKubernetesCluster}
          onInstallAgent={onInstallAgent}
          canInstallAgent={canInstallAgent}
          onOpenClusterSettings={onOpenClusterSettings}
          workspaceName={workspaceName}
          totalClusterCount={totalClusterCount}
          issueSummaryByClusterId={issueSummaryByClusterId}
          issueSummaryLoadStateByClusterId={issueSummaryLoadStateByClusterId}
          metricLoadStateByClusterId={metricLoadStateByClusterId}
          onRetryTelemetry={() => setMetricHistoryRetryNonce((current) => current + 1)}
          hasActiveClusterFilter={hasActiveFilter}
          isCatalogLoading={isLoading}
          catalogLoadError={catalogLoadError}
          onRetryCatalog={() => void clusterCollection.retry()}
          controls={hasClusterInventory || hasActiveFilter ? (
            <DiscoveryFilterBar
              idPrefix="cluster-catalog"
              query={query}
              queryLabel={t('dashboard.searchClusters')}
              queryPlaceholder={t('dashboard.searchClusters')}
              queryClearLabel={t('common.clearSearch')}
              resultSummary={hasActiveFilter ? t('dashboard.showingClusters', { count: clustersWithMetricHistory.length, total: totalClusterCount ?? kubernetesClusters.length }) : t('dashboard.clusterCount', { count: totalClusterCount ?? kubernetesClusters.length })}
              filters={[createDiscoveryFilterGroup<ClusterCatalogStatusFilter>({
                id: 'status',
                label: t('common.status'),
                value: status,
                defaultValue: 'all',
                options: CLUSTER_STATUS_FILTERS.map((filter) => ({
                  value: filter,
                  label: statusLabels[filter],
                  count: catalogCounts[filter]
                })),
                onChange: handleStatusChange
              })]}
              clearAllLabel={t('common.clearAll')}
              onQueryChange={handleQueryChange}
              onClearAll={() => setCatalogState({})}
            />
          ) : undefined}
          catalogFooter={workspaceId ? (
            <div ref={clusterCollection.sentinelRef} className="flex justify-center py-2">
              {nextCursor && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void clusterCollection.loadMore()}
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
