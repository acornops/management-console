import { describe, expect, it } from 'vitest';

import {
  getSelectedVmRunbookPrompt,
  shouldClearPendingVmRunbookPrompt
} from './virtualMachineRunbookPrompt';
import type { PendingVmRunbookPrompt } from '@/pages/runbooks/runbookModel';

const prompt: PendingVmRunbookPrompt = {
  workspaceId: 'workspace-1',
  targetId: 'vm-1',
  prompt: 'Check host logs',
  id: 1
};

describe('virtualMachineRunbookPrompt', () => {
  it('selects a pending prompt only for the matching workspace and VM', () => {
    expect(getSelectedVmRunbookPrompt(prompt, 'workspace-1', 'vm-1')).toBe('Check host logs');
    expect(getSelectedVmRunbookPrompt(prompt, 'workspace-2', 'vm-1')).toBe('');
    expect(getSelectedVmRunbookPrompt(prompt, 'workspace-1', 'vm-2')).toBe('');
  });

  it('clears pending prompts when navigation can no longer consume them', () => {
    expect(shouldClearPendingVmRunbookPrompt(prompt, 'workspace-1', 'vm-1', 'chat')).toBe(false);
    expect(shouldClearPendingVmRunbookPrompt(prompt, 'workspace-1', 'vm-1', 'overview')).toBe(true);
    expect(shouldClearPendingVmRunbookPrompt(prompt, 'workspace-1', 'vm-2', 'chat')).toBe(true);
    expect(shouldClearPendingVmRunbookPrompt(prompt, 'workspace-2', 'vm-1', 'chat')).toBe(false);
  });
});
