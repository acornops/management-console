import { useCallback, useMemo, useState } from 'react';
import { buildVirtualMachinesByWorkspaceId } from '@/app/appWorkspaceSummaries';
import { canReadWorkspaceData } from '@/app/workspacePermissions';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import type { Workspace } from '@/types';

export function useWorkspaceVirtualMachineCache(
  workspaceContextId: string | null,
  workspaceById: Map<string, Workspace>
) {
  const [virtualMachines, setVirtualMachines] = useState<ControlPlaneVirtualMachine[]>([]);
  const [loadedWorkspaceIds, setLoadedWorkspaceIds] = useState<Set<string>>(() => new Set());
  const virtualMachinesByWorkspaceId = useMemo(
    () => buildVirtualMachinesByWorkspaceId(virtualMachines),
    [virtualMachines]
  );
  const virtualMachinesInWorkspaceContext = useMemo(
    () => {
      if (!workspaceContextId) return virtualMachines;
      const workspace = workspaceById.get(workspaceContextId);
      if (workspace && !canReadWorkspaceData(workspace)) return [];
      return virtualMachinesByWorkspaceId.get(workspaceContextId) || [];
    },
    [virtualMachines, virtualMachinesByWorkspaceId, workspaceById, workspaceContextId]
  );

  const markWorkspaceLoaded = useCallback((workspaceId: string) => {
    setLoadedWorkspaceIds((current) => new Set(current).add(workspaceId));
  }, []);

  const replaceWorkspaceVirtualMachines = useCallback((workspaceId: string, nextVirtualMachines: ControlPlaneVirtualMachine[]) => {
    setVirtualMachines((current) => [
      ...current.filter((virtualMachine) => virtualMachine.workspaceId !== workspaceId),
      ...nextVirtualMachines
    ]);
    markWorkspaceLoaded(workspaceId);
  }, [markWorkspaceLoaded]);

  const upsertWorkspaceVirtualMachine = useCallback((workspaceId: string, virtualMachine: ControlPlaneVirtualMachine) => {
    setVirtualMachines((current) =>
      current.some((item) => item.id === virtualMachine.id)
        ? current.map((item) => (item.id === virtualMachine.id ? virtualMachine : item))
        : [virtualMachine, ...current]
    );
    markWorkspaceLoaded(workspaceId);
  }, [markWorkspaceLoaded]);

  const removeWorkspaceVirtualMachine = useCallback((workspaceId: string, virtualMachineId: string) => {
    setVirtualMachines((current) =>
      current.filter((virtualMachine) => !(virtualMachine.workspaceId === workspaceId && virtualMachine.id === virtualMachineId))
    );
    markWorkspaceLoaded(workspaceId);
  }, [markWorkspaceLoaded]);

  const resetVirtualMachineCache = useCallback(() => {
    setVirtualMachines([]);
    setLoadedWorkspaceIds(new Set());
  }, []);

  return {
    virtualMachines,
    virtualMachinesInWorkspaceContext,
    hasLoadedWorkspaceVirtualMachines: workspaceContextId ? loadedWorkspaceIds.has(workspaceContextId) : false,
    replaceWorkspaceVirtualMachines,
    upsertWorkspaceVirtualMachine,
    removeWorkspaceVirtualMachine,
    resetVirtualMachineCache
  };
}
