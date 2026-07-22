import { useCallback, useEffect } from 'react';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import { useCursorCollection } from '@/hooks/useCursorCollection';

export const VIRTUAL_MACHINE_CATALOG_REFRESH_MS = 30000;

interface VirtualMachineListRefreshArgs {
  workspaceId: string;
  virtualMachines: ControlPlaneVirtualMachine[];
  hasLoadedWorkspaceVirtualMachines: boolean;
  onReplaceWorkspaceVirtualMachines: (workspaceId: string, nextVirtualMachines: ControlPlaneVirtualMachine[]) => void;
}

interface VirtualMachineListRefreshState {
  isLoading: boolean;
  loadError: unknown | null;
  reload: () => Promise<void>;
}

export function useVirtualMachineListRefresh({
  workspaceId,
  virtualMachines,
  hasLoadedWorkspaceVirtualMachines,
  onReplaceWorkspaceVirtualMachines
}: VirtualMachineListRefreshArgs): VirtualMachineListRefreshState {
  const hasWorkspaceVirtualMachineCache = hasLoadedWorkspaceVirtualMachines || virtualMachines.length > 0;
  const loadVirtualMachinePage = useCallback(({ cursor, limit, signal }: { cursor?: string; limit: number; signal: AbortSignal }) => (
    controlPlaneApi.listVirtualMachinesForWorkspace(workspaceId, { limit, cursor, signal })
  ), [workspaceId]);
  const collection = useCursorCollection({
    filters: { workspaceId },
    getKey: (virtualMachine: ControlPlaneVirtualMachine) => virtualMachine.id,
    loadPage: loadVirtualMachinePage,
    pageSize: 50,
    strategy: 'drain'
  });
  const { items, phase, error } = collection;
  const reload = useCallback(() => collection.refresh(), [collection.refresh]);
  const isLoading = !hasWorkspaceVirtualMachineCache && (phase === 'loading' || phase === 'refreshing');
  const loadError = phase === 'error' ? new Error(error || 'Failed loading virtual machines') : null;

  useEffect(() => {
    if (phase === 'ready') onReplaceWorkspaceVirtualMachines(workspaceId, items);
  }, [items, onReplaceWorkspaceVirtualMachines, phase, workspaceId]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'hidden') return;
      void reload();
    };
    const intervalId = window.setInterval(refreshWhenVisible, VIRTUAL_MACHINE_CATALOG_REFRESH_MS);
    window.addEventListener('focus', refreshWhenVisible);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshWhenVisible);
    };
  }, [reload]);

  return { isLoading, loadError, reload };
}
