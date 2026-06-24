import { useCallback, useEffect, useRef, useState } from 'react';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import {
  getVmApiStatusForConnectionFilter,
  vmMatchesConnectionFilter,
  type VmConnectionFilter
} from '@/pages/virtual-machines/virtualMachineUi';

interface VirtualMachineListRefreshArgs {
  workspaceId: string;
  virtualMachines: ControlPlaneVirtualMachine[];
  hasLoadedWorkspaceVirtualMachines: boolean;
  query: string;
  status: VmConnectionFilter;
  onReplaceWorkspaceVirtualMachines: (workspaceId: string, nextVirtualMachines: ControlPlaneVirtualMachine[]) => void;
}

export function useVirtualMachineListRefresh({
  workspaceId,
  virtualMachines,
  hasLoadedWorkspaceVirtualMachines,
  query,
  status,
  onReplaceWorkspaceVirtualMachines
}: VirtualMachineListRefreshArgs): boolean {
  const hasWorkspaceVirtualMachineCache = hasLoadedWorkspaceVirtualMachines || virtualMachines.length > 0;
  const hasWorkspaceVirtualMachineCacheRef = useRef(hasWorkspaceVirtualMachineCache);
  const [isLoading, setIsLoading] = useState(!hasWorkspaceVirtualMachineCache);

  useEffect(() => {
    hasWorkspaceVirtualMachineCacheRef.current = hasWorkspaceVirtualMachineCache;
  }, [hasWorkspaceVirtualMachineCache]);

  const reload = useCallback(async () => {
    if (!hasWorkspaceVirtualMachineCacheRef.current) setIsLoading(true);
    try {
      const page = await controlPlaneApi.listVirtualMachinesForWorkspace(workspaceId, {
        limit: 50,
        q: query,
        status: getVmApiStatusForConnectionFilter(status)
      });
      onReplaceWorkspaceVirtualMachines(
        workspaceId,
        page.items.filter((vm) => vmMatchesConnectionFilter(vm, status))
      );
    } finally {
      setIsLoading(false);
    }
  }, [onReplaceWorkspaceVirtualMachines, query, status, workspaceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return isLoading;
}
