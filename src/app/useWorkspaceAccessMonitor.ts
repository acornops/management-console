import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { WORKSPACE_ACCESS_CHANGED, WORKSPACE_SUSPENSION_DETECTED, isWorkspaceSuspended, readWorkspaceAccessState } from '@/services/control-plane/workspaceAccessState';
import { clearSessionDataCache } from '@/hooks/sessionDataCache';
import { clearChatComposerRuntimesForUser } from '@/features/targets/chat/lib/chatComposerRuntimeStorage';
import type { KubernetesCluster, Workspace } from '@/types';

export function useWorkspaceAccessMonitor(userId: string | undefined, workspaceId: string | null, setWorkspaces: Dispatch<SetStateAction<Workspace[]>>, setClusters: Dispatch<SetStateAction<KubernetesCluster[]>>, resetVirtualMachines: () => void, closeCopilot: Dispatch<SetStateAction<boolean>>) {
  const [contentGeneration, setContentGeneration] = useState(0);
  useEffect(() => {
    if (!userId) return;
    let disposed = false;
    let inFlight = false;
    const clearSuspended = (event: Event) => {
      if (!(event as CustomEvent).detail?.metadataOnly) {
        clearSessionDataCache();
        clearChatComposerRuntimesForUser(userId);
        resetVirtualMachines();
        closeCopilot(false);
        setContentGeneration(value => value + 1);
      }
      setClusters(current => current.filter(cluster => !isWorkspaceSuspended(cluster.workspaceId)));
      setWorkspaces(current => current.map(workspace => {
        if (!isWorkspaceSuspended(workspace.id)) return workspace;
        const state = readWorkspaceAccessState(workspace.id);
        return { id: workspace.id, name: state?.name || workspace.name, accessState: 'suspended', publicReason: state?.publicReason, suspendedAt: state?.suspendedAt, description: '', members: [], clusterIds: [] };
      }));
    };
    const refresh = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const states = await controlPlaneApi.getWorkspaceAccessStates();
        if (disposed) return;
        if (workspaceId && !states.some(state => state.id === workspaceId)) await controlPlaneApi.getWorkspaceAccessState(workspaceId);
      } catch { /* Keep the current block; access discovery must never release it on failure. */ }
      finally { inFlight = false; }
    };
    window.addEventListener(WORKSPACE_ACCESS_CHANGED, clearSuspended);
    window.addEventListener(WORKSPACE_SUSPENSION_DETECTED, refresh);
    const timer = window.setInterval(() => void refresh(), 15000);
    void refresh();
    return () => { disposed = true; window.clearInterval(timer); window.removeEventListener(WORKSPACE_ACCESS_CHANGED, clearSuspended); window.removeEventListener(WORKSPACE_SUSPENSION_DETECTED, refresh); };
  }, [userId, workspaceId, setWorkspaces, setClusters, resetVirtualMachines, closeCopilot]);
  return contentGeneration;
}
