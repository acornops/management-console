import { describe, expect, it } from 'vitest';
import {
  parseVirtualMachineInstallInstructions,
  parseVirtualMachineInstructionResponse
} from './virtualMachineTypes';

const instructions = {
  command: "set -o pipefail; curl -fsSL 'https://example.test/install-agentv.sh' | sudo bash",
  releaseVersion: '0.0.1-experimental.5',
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
