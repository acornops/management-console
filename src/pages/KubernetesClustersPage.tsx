import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Dashboard from '@/components/dashboard/Dashboard';
import { Button } from '@/components/common/Button';
import { PageSearchInput } from '@/components/common/PageSearchInput';
import { Select, SelectOption } from '@/components/common/Select';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { KubernetesCluster } from '@/types';

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
  onReplaceWorkspaceKubernetesClusters?: (workspaceId: string, clusters: KubernetesCluster[]) => void;
  onAppendWorkspaceKubernetesClusters?: (workspaceId: string, clusters: KubernetesCluster[]) => void;
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
  onReplaceWorkspaceKubernetesClusters,
  onAppendWorkspaceKubernetesClusters
}) => {
  const { t } = useTranslation();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const requestSeqRef = useRef(0);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | KubernetesCluster['agentConnectionState']>('all');
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const statusOptions: Array<SelectOption<typeof status>> = [
    { value: 'all', label: t('dashboard.allStates') },
    { value: 'connected', label: t('dashboard.connected') },
    { value: 'disconnected', label: t('dashboard.disconnected') },
    { value: 'not_installed', label: t('dashboard.notInstalled') }
  ];
  const apiStatus =
    status === 'connected' ? 'online' :
      status === 'disconnected' ? 'offline' :
        status === 'not_installed' ? 'unknown' :
          undefined;

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
      setNextCursor(page.nextCursor);
      if (mode === 'replace') onReplaceWorkspaceKubernetesClusters?.(workspaceId, page.items);
      else onAppendWorkspaceKubernetesClusters?.(workspaceId, page.items);
    } catch (error) {
      console.error('Failed loading clusters', error);
    } finally {
      if (requestId === requestSeqRef.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, [apiStatus, onAppendWorkspaceKubernetesClusters, onReplaceWorkspaceKubernetesClusters, query, workspaceId]);

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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
        <Dashboard
          kubernetesClusters={kubernetesClusters}
          onSelectKubernetesCluster={onSelectKubernetesCluster}
          onInstallAgent={onInstallAgent}
          onOpenClusterSettings={onOpenClusterSettings}
          workspaceName={workspaceName}
          totalClusterCount={totalClusterCount}
          controls={workspaceId ? (
            <>
              <label htmlFor="cluster-search" className="sr-only">
                {t('dashboard.searchClusters')}
              </label>
              <PageSearchInput
                id="cluster-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('dashboard.searchClusters')}
              />
              <Select<typeof status>
                value={status}
                options={statusOptions}
                onChange={setStatus}
                className="min-w-44"
                ariaLabel={t('dashboard.filterClustersByState')}
              />
            </>
          ) : undefined}
          onAddCluster={onAddCluster}
          canDeleteKubernetesCluster={canDeleteKubernetesCluster}
          onDeleteKubernetesCluster={onDeleteKubernetesCluster}
        />
        {workspaceId && (
          <div ref={sentinelRef} className="flex justify-center px-8 pb-8">
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
        )}
      </div>
    </div>
  );
};
