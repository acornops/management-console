import { useCursorCollection } from '@/hooks/useCursorCollection';
import { useVisibilityAwareRefresh } from '@/hooks/useVisibilityAwareRefresh';
import { controlPlaneApi, type ControlPlaneIssueItem } from '@/services/controlPlaneApi';

/** Shared bounded pagination for both target overview surfaces. */
export function useTargetIssues(workspaceId: string, targetId: string | null) {
  const collection = useCursorCollection<ControlPlaneIssueItem, { workspaceId: string; targetId: string | null }>({
    cacheKey: 'target-overview-issues',
    clearItemsOnScopeChange: true,
    refreshLoadedPages: true,
    filters: { workspaceId, targetId },
    getKey: (issue) => issue.id,
    loadPage: ({ cursor, limit, filters }) => filters.targetId
      ? controlPlaneApi.listTargetIssues(filters.workspaceId, filters.targetId, { cursor, limit })
      : Promise.resolve({ items: [] }),
    pageSize: 50,
    strategy: 'manual'
  });
  useVisibilityAwareRefresh(collection.refresh, {
    enabled: Boolean(targetId) && collection.phase === 'ready'
  });
  return collection;
}
