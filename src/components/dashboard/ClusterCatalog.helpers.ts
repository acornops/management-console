import type { KubernetesCluster } from '@/types';

export function getClusterWriteAccessLabel(
  cluster: KubernetesCluster,
  t: (key: string) => string
): string {
  if (cluster.agentAccessMode !== 'read_only' && cluster.agentAccessMode !== 'read_write') {
    return t('dashboard.unavailable');
  }
  if (cluster.agentAccessMode === 'read_only') {
    return t('dashboard.writeAccessReadOnly');
  }
  return cluster.writeConfirmationPolicy?.effectiveRequired ?? true
    ? t('dashboard.writeAccessApprovalRequired')
    : t('dashboard.writeAccessEnabled');
}
