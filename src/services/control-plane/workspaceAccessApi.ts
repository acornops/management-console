import { requestJson } from './http';
import { recordWorkspaceAccessState, type WorkspaceAccessState } from './workspaceAccessState';

export const workspaceAccessApi = {
  async getWorkspaceAccessStates(): Promise<WorkspaceAccessState[]> {
    const page = await requestJson<{ items: WorkspaceAccessState[] }>('/api/v1/workspaces?view=access-state', { signal: AbortSignal.timeout(10000) });
    page.items.forEach(recordWorkspaceAccessState);
    return page.items;
  },
  async getWorkspaceAccessState(workspaceId: string): Promise<WorkspaceAccessState> {
    const state = await requestJson<WorkspaceAccessState>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/access-state`, { signal: AbortSignal.timeout(10000) });
    recordWorkspaceAccessState(state);
    return state;
  }
};
