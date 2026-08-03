import type { KubernetesCluster } from '@/types';
import { resolveClusterPermissionMode } from '@/services/control-plane/runPermissionPolicy';

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
  const permissionMode = resolveClusterPermissionMode(cluster);
  if (permissionMode === 'read_only') return t('dashboard.writeAccessReadOnly');
  return permissionMode === 'ask_before_changes'
    ? t('dashboard.writeAccessApprovalRequired')
    : t('dashboard.writeAccessEnabled');
}
