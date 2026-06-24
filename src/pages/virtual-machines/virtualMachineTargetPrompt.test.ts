import { describe, expect, it } from 'vitest';

import {
  getSelectedVmTargetPrompt,
  shouldClearPendingVmTargetPrompt
} from './virtualMachineTargetPrompt';
import type { PendingVmTargetPrompt } from '@/pages/target-prompts/targetPromptModel';

const prompt: PendingVmTargetPrompt = {
  workspaceId: 'workspace-1',
  targetId: 'vm-1',
  prompt: 'Check host logs',
  id: 1
};

describe('virtualMachineTargetPrompt', () => {
  it('returns the prompt only for the selected VM in the same workspace', () => {
    expect(getSelectedVmTargetPrompt(prompt, 'workspace-1', 'vm-1')).toBe('Check host logs');
    expect(getSelectedVmTargetPrompt(prompt, 'workspace-2', 'vm-1')).toBe('');
    expect(getSelectedVmTargetPrompt(prompt, 'workspace-1', 'vm-2')).toBe('');
  });

  it('clears pending prompts when leaving the selected VM chat', () => {
    expect(shouldClearPendingVmTargetPrompt(prompt, 'workspace-1', 'vm-1', 'chat')).toBe(false);
    expect(shouldClearPendingVmTargetPrompt(prompt, 'workspace-1', 'vm-1', 'overview')).toBe(true);
    expect(shouldClearPendingVmTargetPrompt(prompt, 'workspace-1', 'vm-2', 'chat')).toBe(true);
    expect(shouldClearPendingVmTargetPrompt(prompt, 'workspace-2', 'vm-1', 'chat')).toBe(false);
  });
});
