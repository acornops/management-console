import type { KubernetesCluster } from '@/types';
import type { RunPermissionMode } from './runPermissionTypes';

type ClusterPermissionPolicy = Pick<
  KubernetesCluster,
  'permissionMode' | 'writeConfirmationPolicy'
>;

export function resolveClusterPermissionMode(cluster: ClusterPermissionPolicy): RunPermissionMode {
  if (cluster.permissionMode) return cluster.permissionMode;
  return cluster.writeConfirmationPolicy?.effectiveRequired === false
    ? 'auto_allowed_changes'
    : 'ask_before_changes';
}

export function clusterPermissionModeAllowsWrites(cluster: ClusterPermissionPolicy): boolean {
  return resolveClusterPermissionMode(cluster) !== 'read_only';
}

export function clusterPermissionModeRequiresApproval(cluster: ClusterPermissionPolicy): boolean {
  return resolveClusterPermissionMode(cluster) === 'ask_before_changes';
}
