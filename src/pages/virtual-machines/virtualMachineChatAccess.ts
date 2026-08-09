import type { Workspace } from '@/types';

interface VirtualMachineChatAccess {
  canChat: boolean;
  canRequestWriteRuns: boolean;
  canApproveWriteActions: boolean;
  canCancelRuns: boolean;
  canDeleteSessions: boolean;
  canManageAiSettings: boolean;
  footerKey: string;
}

export function resolveVirtualMachineChatAccess(
  permissions?: Workspace['permissions']
): VirtualMachineChatAccess {
  const canChat = Boolean(permissions?.create_sessions && permissions.create_read_only_runs);
  const canRequestWriteRuns = Boolean(canChat && permissions?.create_read_write_runs);
  return {
    canChat,
    canRequestWriteRuns,
    canApproveWriteActions: canRequestWriteRuns,
    canCancelRuns: Boolean(permissions?.cancel_runs),
    canDeleteSessions: Boolean(permissions?.delete_sessions),
    canManageAiSettings: Boolean(permissions?.manage_ai_settings),
    footerKey: canRequestWriteRuns ? 'chat.footerApprovalRequired' : 'chat.footerReadOnlyRole'
  };
}
