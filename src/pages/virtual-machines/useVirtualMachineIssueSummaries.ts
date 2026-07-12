import { useCallback, useEffect, useRef, useState } from 'react';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneTargetIssueSummary, ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';

export type VmIssueSummaryLoadState = 'loading' | 'ready' | 'error';

export function useVirtualMachineIssueSummaries(virtualMachines: ControlPlaneVirtualMachine[]) {
  const requestSequenceRef = useRef(0);
  const [issueSummaryByVmId, setIssueSummaryByVmId] = useState<Record<string, ControlPlaneTargetIssueSummary | undefined>>({});
  const [issueSummaryLoadStateByVmId, setIssueSummaryLoadStateByVmId] = useState<Record<string, VmIssueSummaryLoadState>>({});

  const loadIssueSummaries = useCallback(() => {
    if (virtualMachines.length === 0) {
      requestSequenceRef.current += 1;
      setIssueSummaryByVmId({});
      setIssueSummaryLoadStateByVmId({});
      return;
    }

    const requestId = ++requestSequenceRef.current;
    const activeVmIds = new Set(virtualMachines.map((vm) => vm.id));
    const entries: Array<readonly [string, ControlPlaneTargetIssueSummary]> = [];
    const failedVmIds = new Set<string>();
    let nextVmIndex = 0;
    setIssueSummaryLoadStateByVmId((current) => Object.fromEntries(
      virtualMachines.map((vm) => [vm.id, current[vm.id] === 'ready' ? 'ready' : 'loading'])
    ));

    const loadNextIssueSummary = async () => {
      while (requestId === requestSequenceRef.current && nextVmIndex < virtualMachines.length) {
        const vm = virtualMachines[nextVmIndex];
        nextVmIndex += 1;
        if (!vm) continue;
        try {
          const summary = await controlPlaneApi.getTargetIssueSummary(vm.workspaceId, vm.id);
          entries.push([vm.id, summary] as const);
        } catch (error) {
          console.error('Failed loading VM card issue summary', error);
          failedVmIds.add(vm.id);
        }
      }
    };

    const workerCount = Math.min(6, virtualMachines.length);
    void Promise.all(Array.from({ length: workerCount }, () => loadNextIssueSummary())).then(() => {
      if (requestId !== requestSequenceRef.current) return;
      setIssueSummaryByVmId((current) => ({
        ...Object.fromEntries(Object.entries(current).filter(([vmId]) => activeVmIds.has(vmId))),
        ...Object.fromEntries(entries)
      }));
      setIssueSummaryLoadStateByVmId(Object.fromEntries(
        virtualMachines.map((vm) => [vm.id, failedVmIds.has(vm.id) ? 'error' : 'ready'])
      ));
    });
  }, [virtualMachines]);

  useEffect(() => {
    loadIssueSummaries();
    return () => {
      requestSequenceRef.current += 1;
    };
  }, [loadIssueSummaries]);

  return { issueSummaryByVmId, issueSummaryLoadStateByVmId };
}
