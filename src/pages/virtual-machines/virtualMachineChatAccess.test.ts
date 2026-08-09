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
  it('enables approval-gated write runs for authorized workspace roles', () => {
    expect(resolveVirtualMachineChatAccess(permissions({ create_read_write_runs: true }))).toMatchObject({
      canChat: true,
      canRequestWriteRuns: true,
      canApproveWriteActions: true,
      footerKey: 'chat.footerApprovalRequired'
    });
  });

  it('keeps operator chat read-only without the write-run capability', () => {
    expect(resolveVirtualMachineChatAccess(permissions())).toMatchObject({
      canChat: true,
      canRequestWriteRuns: false,
      canApproveWriteActions: false,
      footerKey: 'chat.footerReadOnlyRole'
    });
  });

  it('never requests a write run when the user cannot start chat', () => {
    expect(resolveVirtualMachineChatAccess(permissions({
      create_sessions: false,
      create_read_write_runs: true
    }))).toMatchObject({
      canChat: false,
      canRequestWriteRuns: false,
      canApproveWriteActions: false,
      footerKey: 'chat.footerReadOnlyRole'
    });
  });
});
