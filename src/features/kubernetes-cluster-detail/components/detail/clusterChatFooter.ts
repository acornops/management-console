import type { KubernetesCluster } from '@/types';

export function resolveClusterChatFooterKey(cluster: KubernetesCluster, canRequestWriteRuns: boolean): string {
  if (!canRequestWriteRuns) return 'chat.footerReadOnlyRole';
  return cluster.writeConfirmationPolicy?.effectiveRequired ?? true
    ? 'chat.footerApprovalRequired'
    : 'chat.footerApprovalNotRequired';
}
