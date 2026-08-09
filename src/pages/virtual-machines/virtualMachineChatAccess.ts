import type { Workspace } from '@/types';
import type { ControlPlaneVirtualMachine } from '@/services/control-plane/virtualMachineTypes';

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
  vm: Pick<ControlPlaneVirtualMachine, 'permissionMode'>,
  permissions?: Workspace['permissions']
): VirtualMachineChatAccess {
  const canChat = Boolean(permissions?.create_sessions && permissions.create_read_only_runs);
  const canRequestWriteRuns = Boolean(canChat && permissions?.create_read_write_runs);
  const footerKey = !canRequestWriteRuns
    ? 'chat.footerReadOnlyRole'
    : vm.permissionMode === 'read_only'
      ? 'chat.footerReadOnlyVmPolicy'
      : vm.permissionMode === 'ask_before_changes'
        ? 'chat.footerApprovalRequired'
        : 'chat.footerVmAutoAllowed';
  return {
    canChat,
    canRequestWriteRuns,
    canApproveWriteActions: canRequestWriteRuns,
    canCancelRuns: Boolean(permissions?.cancel_runs),
    canDeleteSessions: Boolean(permissions?.delete_sessions),
    canManageAiSettings: Boolean(permissions?.manage_ai_settings),
    footerKey
  };
}
