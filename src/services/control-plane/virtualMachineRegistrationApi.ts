import { requestJson } from './http';
import {
  parseVirtualMachineRegistrationOptions,
  type VirtualMachineRegistrationOptions
} from './virtualMachineTypes';

export async function getVirtualMachineRegistrationOptions(
  workspaceId: string
): Promise<VirtualMachineRegistrationOptions> {
  return parseVirtualMachineRegistrationOptions(await requestJson<unknown>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/virtual-machines/registration-options`
  ));
}
