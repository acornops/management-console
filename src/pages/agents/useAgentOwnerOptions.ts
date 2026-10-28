import { useCursorCollection, type CursorCollectionOptions } from '@/hooks/useCursorCollection';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ProjectMember } from '@/types';

interface OwnerFilters { workspaceId: string; canReadMembers: boolean }

export function agentOwnerCollectionOptions(workspaceId: string, canReadMembers: boolean): CursorCollectionOptions<ProjectMember, OwnerFilters> {
  return {
    cacheKey: 'agent-owner-options',
    filters: { workspaceId, canReadMembers },
    clearItemsOnScopeChange: true,
    getKey: (member) => member.userId || member.email,
    pageSize: 50,
    strategy: 'manual',
    loadPage: ({ cursor, limit, filters, signal }) => filters.canReadMembers
      ? controlPlaneApi.listWorkspaceMembers(filters.workspaceId, { limit, cursor, signal })
      : Promise.resolve({ items: [] })
  };
}

export function useAgentOwnerOptions(workspaceId: string, canReadMembers: boolean) {
  return useCursorCollection(agentOwnerCollectionOptions(workspaceId, canReadMembers));
}
