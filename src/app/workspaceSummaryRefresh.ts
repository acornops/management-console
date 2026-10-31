import { controlPlaneApi } from '@/services/controlPlaneApi';
import { getSessionGeneration } from '@/services/control-plane/sessionLifecycle';
import type { Workspace } from '@/types';

const latestRefreshByWorkspace = new Map<string, symbol>();

/** Share ordering across cluster/VM refreshes without replacing loaded target or member lists. */
export async function refreshLatestWorkspaceSummary(
  workspaceId: string,
  apply: (updates: Partial<Workspace>) => void
): Promise<void> {
  const request = Symbol();
  const sessionGeneration = getSessionGeneration();
  latestRefreshByWorkspace.set(workspaceId, request);
  try {
    const refreshed = await controlPlaneApi.getWorkspace(workspaceId);
    if (latestRefreshByWorkspace.get(workspaceId) !== request || getSessionGeneration() !== sessionGeneration) return;
    const { clusterIds: _clusterIds, members: _members, ...updates } = refreshed;
    apply(updates);
  } finally {
    if (latestRefreshByWorkspace.get(workspaceId) === request) {
      latestRefreshByWorkspace.delete(workspaceId);
    }
  }
}
