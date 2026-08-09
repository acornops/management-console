import { describe, expect, it } from 'vitest';
import { resolveVirtualMachineChatAccess } from '@/pages/virtual-machines/virtualMachineChatAccess';
import type { Workspace } from '@/types';

function permissions(overrides: Partial<NonNullable<Workspace['permissions']>> = {}): Workspace['permissions'] {
  return {
    create_sessions: true,
    create_read_only_runs: true,
    create_read_write_runs: false,
    cancel_runs: false,
    delete_sessions: false,
    manage_ai_settings: false,
    ...overrides
  } as NonNullable<Workspace['permissions']>;
}

describe('virtual machine chat access', () => {
  const vm = (permissionMode: 'read_only' | 'ask_before_changes' | 'auto_allowed_changes' = 'ask_before_changes') => ({ permissionMode });

  it('enables approval-gated write runs for authorized workspace roles', () => {
    expect(resolveVirtualMachineChatAccess(vm(), permissions({ create_read_write_runs: true }))).toMatchObject({
      canChat: true,
      canRequestWriteRuns: true,
      canApproveWriteActions: true,
      footerKey: 'chat.footerApprovalRequired'
    });
  });

  it('keeps operator chat read-only without the write-run capability', () => {
    expect(resolveVirtualMachineChatAccess(vm(), permissions())).toMatchObject({
      canChat: true,
      canRequestWriteRuns: false,
      canApproveWriteActions: false,
      footerKey: 'chat.footerReadOnlyRole'
    });
  });

  it('never requests a write run when the user cannot start chat', () => {
    expect(resolveVirtualMachineChatAccess(vm(), permissions({
      create_sessions: false,
      create_read_write_runs: true
    }))).toMatchObject({
      canChat: false,
      canRequestWriteRuns: false,
      canApproveWriteActions: false,
      footerKey: 'chat.footerReadOnlyRole'
    });
  });

  it('explains VM-specific read-only and auto-run policies without hiding the restart approval boundary', () => {
    const writeRole = permissions({ create_read_write_runs: true });
    expect(resolveVirtualMachineChatAccess(vm('read_only'), writeRole).footerKey).toBe('chat.footerReadOnlyVmPolicy');
    expect(resolveVirtualMachineChatAccess(vm('auto_allowed_changes'), writeRole).footerKey).toBe('chat.footerVmAutoAllowed');
  });
});
