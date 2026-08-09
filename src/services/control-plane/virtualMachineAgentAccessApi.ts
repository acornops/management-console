import { requestJson } from './http';
import {
  parseVirtualMachineAccessPolicyUpdateResponse,
  type AgentVAccessMode,
  type ControlPlaneVirtualMachine,
  type ControlPlaneVirtualMachineInstallInstructions
} from './virtualMachineTypes';

export async function createVirtualMachineAgentAccessPolicyUpdate(
  workspaceId: string,
  vmId: string,
  input: { agentAccessMode: AgentVAccessMode; restartServices: string[] }
): Promise<{
  virtualMachine: ControlPlaneVirtualMachine;
  installInstructions: ControlPlaneVirtualMachineInstallInstructions;
}> {
  const response = await requestJson<unknown>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/virtual-machines/${encodeURIComponent(vmId)}/agent-access-policy-updates`,
    { method: 'POST', body: JSON.stringify(input) }
  );
  return parseVirtualMachineAccessPolicyUpdateResponse(response);
}
