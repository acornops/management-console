import { useEffect, useState } from 'react';
import { useCursorCollection, type CursorCollectionOptions } from '@/hooks/useCursorCollection';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ProjectMember } from '@/types';

interface OwnerFilters { workspaceId: string; canReadMembers: boolean; query: string }

export function agentOwnerCollectionOptions(workspaceId: string, canReadMembers: boolean, query: string): CursorCollectionOptions<ProjectMember, OwnerFilters> {
  return {
    cacheKey: 'agent-owner-options',
    filters: { workspaceId, canReadMembers, query },
    clearItemsOnScopeChange: true,
    getKey: (member) => member.userId || member.email,
    pageSize: 50,
    strategy: 'manual',
    loadPage: ({ cursor, limit, filters, signal }) => filters.canReadMembers
      ? controlPlaneApi.listWorkspaceMembers(filters.workspaceId, { limit, q: filters.query || undefined, cursor, signal })
      : Promise.resolve({ items: [] })
  };
}

export function useAgentOwnerOptions(workspaceId: string, canReadMembers: boolean) {
  const [search, setSearch] = useState({ workspaceId, query: '' });
  const query = search.workspaceId === workspaceId ? search.query : '';
  useEffect(() => { setSearch({ workspaceId, query: '' }); }, [workspaceId]);
  const collection = useCursorCollection(agentOwnerCollectionOptions(workspaceId, canReadMembers, query));
  return { ...collection, query, setQuery: (value: string) => setSearch({ workspaceId, query: value }) };
}
