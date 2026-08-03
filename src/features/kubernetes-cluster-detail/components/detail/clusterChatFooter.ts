import type { KubernetesCluster } from '@/types';
import { resolveClusterPermissionMode } from '@/services/control-plane/runPermissionPolicy';

export function resolveClusterChatFooterKey(cluster: KubernetesCluster, canRequestWriteRuns: boolean): string {
  if (!canRequestWriteRuns) return 'chat.footerReadOnlyRole';
  const permissionMode = resolveClusterPermissionMode(cluster);
  if (permissionMode === 'read_only') return 'chat.footerReadOnlyPolicy';
  return permissionMode === 'ask_before_changes'
    ? 'chat.footerApprovalRequired'
    : 'chat.footerApprovalNotRequired';
}
