import { useCallback, useEffect, useRef, useState } from 'react';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';

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
  const hasWorkspaceVirtualMachineCacheRef = useRef(hasWorkspaceVirtualMachineCache);
  const requestSequenceRef = useRef(0);
  const [isLoading, setIsLoading] = useState(!hasWorkspaceVirtualMachineCache);
  const [loadError, setLoadError] = useState<unknown | null>(null);

  useEffect(() => {
    hasWorkspaceVirtualMachineCacheRef.current = hasWorkspaceVirtualMachineCache;
  }, [hasWorkspaceVirtualMachineCache]);

  const reload = useCallback(async () => {
    const requestId = ++requestSequenceRef.current;
    if (!hasWorkspaceVirtualMachineCacheRef.current) setIsLoading(true);
    setLoadError(null);
    try {
      const itemsById = new Map<string, ControlPlaneVirtualMachine>();
      const seenCursors = new Set<string>();
      let cursor: string | undefined;

      do {
        const page = await controlPlaneApi.listVirtualMachinesForWorkspace(workspaceId, { limit: 50, cursor });
        if (requestId !== requestSequenceRef.current) return;
        page.items.forEach((vm) => itemsById.set(vm.id, vm));
        cursor = page.nextCursor;
        if (cursor && seenCursors.has(cursor)) {
          throw new Error('The control plane repeated a virtual-machine page cursor.');
        }
        if (cursor) seenCursors.add(cursor);
      } while (cursor);

      if (requestId === requestSequenceRef.current) {
        onReplaceWorkspaceVirtualMachines(workspaceId, [...itemsById.values()]);
      }
    } catch (error) {
      if (requestId !== requestSequenceRef.current) return;
      console.error('Failed loading virtual machines', error);
      setLoadError(error);
    } finally {
      if (requestId === requestSequenceRef.current) setIsLoading(false);
    }
  }, [onReplaceWorkspaceVirtualMachines, workspaceId]);

  useEffect(() => {
    void reload();
    return () => {
      requestSequenceRef.current += 1;
    };
  }, [reload]);

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
