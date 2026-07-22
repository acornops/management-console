import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import { useTargetIssueSummaries } from '@/features/targets/catalog/useTargetIssueSummaries';

export type VmIssueSummaryLoadState = 'loading' | 'ready' | 'error';

export function useVirtualMachineIssueSummaries(virtualMachines: ControlPlaneVirtualMachine[]) {
  const { summaryByTargetId, loadStateByTargetId } = useTargetIssueSummaries(virtualMachines);
  return {
    issueSummaryByVmId: summaryByTargetId,
    issueSummaryLoadStateByVmId: loadStateByTargetId
  };
}
