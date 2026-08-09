import { describe, expect, it } from 'vitest';
import {
  isValidAgentVRestartService,
  parseControlPlaneVirtualMachine,
  parseVirtualMachineInstallInstructions,
  parseVirtualMachineInstructionResponse
} from './virtualMachineTypes';

const virtualMachine = {
  id: 'vm-1', workspaceId: 'ws-1', name: 'web', status: 'unknown', osFamily: 'linux', serviceManager: 'systemd',
  agentAccessMode: 'read_write', restartServices: ['nginx.service'], permissionMode: 'ask_before_changes',
  pendingAgentAccessPolicy: null,
  permissionModeOverride: null, permissionModeSource: 'deployment_default',
  createdAt: '2026-08-09T00:00:00.000Z', updatedAt: '2026-08-09T00:00:00.000Z'
};

describe('AgentV access policy parsing', () => {
  it('accepts exact non-AgentV service units', () => {
    expect(parseControlPlaneVirtualMachine(virtualMachine)).toEqual(virtualMachine);
    expect(isValidAgentVRestartService('worker@blue.service')).toBe(true);
  });

  it('rejects broad, contradictory, duplicate, and AgentV policy values', () => {
    expect(isValidAgentVRestartService('*.service')).toBe(false);
    expect(isValidAgentVRestartService('acornops-agentv.service')).toBe(false);
    expect(isValidAgentVRestartService('acornops-agentv-install-recover.service')).toBe(false);
    expect(() => parseControlPlaneVirtualMachine({ ...virtualMachine, restartServices: [] })).toThrow('invalid AgentV access policy');
    expect(() => parseControlPlaneVirtualMachine({ ...virtualMachine, agentAccessMode: 'read_only' })).toThrow('invalid AgentV access policy');
    expect(() => parseControlPlaneVirtualMachine({ ...virtualMachine, restartServices: ['nginx.service', 'nginx.service'] })).toThrow('invalid AgentV access policy');
  });

  it('rejects contradictory VM run permission policy fields', () => {
    expect(() => parseControlPlaneVirtualMachine({ ...virtualMachine, permissionMode: 'invalid' })).toThrow('invalid VM run permission policy');
    expect(() => parseControlPlaneVirtualMachine({ ...virtualMachine, permissionModeOverride: 'read_only' })).toThrow('invalid VM run permission policy');
    expect(() => parseControlPlaneVirtualMachine({
      ...virtualMachine,
      permissionMode: 'read_only',
      permissionModeOverride: 'read_only',
      permissionModeSource: 'virtual_machine_override'
    })).not.toThrow();
  });

  it('parses a pending host policy', () => {
    const pending = {
      accessMode: 'read_write',
      restartServices: ['worker.service']
    };
    expect(parseControlPlaneVirtualMachine({
      ...virtualMachine,
      pendingAgentAccessPolicy: pending
    }).pendingAgentAccessPolicy).toEqual(pending);
  });
});

const instructions = {
  command: "set -o pipefail; curl -fsSL 'https://example.test/install-agentv.sh' | sudo bash",
  releaseVersion: '0.0.1-experimental.6',
  bootstrapUrl: 'https://example.test/install-agentv.sh',
  warnings: ['Contains a one-use token.'],
  enrollmentExpiresAt: '2026-08-09T12:15:00.000Z'
};

describe('AgentV install instruction parsing', () => {
  it('accepts the structured control-plane contract', () => {
    expect(parseVirtualMachineInstructionResponse({ targetId: 'vm-1', installInstructions: instructions }))
      .toEqual({ targetId: 'vm-1', installInstructions: instructions });
  });

  it('rejects legacy strings, raw keys, and malformed expiry values', () => {
    expect(() => parseVirtualMachineInstallInstructions('legacy command')).toThrow('invalid AgentV install instructions');
    expect(() => parseVirtualMachineInstructionResponse({
      targetId: 'vm-1', agentKey: 'raw-secret', installInstructions: instructions
    })).toThrow('invalid AgentV instruction response');
    expect(() => parseVirtualMachineInstallInstructions({
      ...instructions, agentKey: 'raw-secret'
    })).toThrow('invalid AgentV install instructions');
    expect(() => parseVirtualMachineInstallInstructions({
      ...instructions, enrollmentExpiresAt: 'not-a-date'
    })).toThrow('invalid AgentV install instructions');
  });
});
