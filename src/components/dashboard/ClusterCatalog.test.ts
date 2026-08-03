import { describe, expect, it } from 'vitest';
import type { KubernetesCluster } from '@/types';
import { getClusterWriteAccessLabel } from './ClusterCatalog.helpers';

const t = (key: string) => key;

function cluster(
  agentAccessMode: KubernetesCluster['agentAccessMode'],
  permissionMode: KubernetesCluster['permissionMode'] = 'ask_before_changes'
): KubernetesCluster {
  return {
    agentAccessMode,
    permissionMode,
    writeConfirmationPolicy: {
      effectiveRequired: permissionMode !== 'auto_allowed_changes',
      overrideRequired: null,
      source: 'deployment_default'
    }
  } as KubernetesCluster;
}

describe('getClusterWriteAccessLabel', () => {
  it('describes the effective write posture without conflating access and approval', () => {
    expect(getClusterWriteAccessLabel(cluster('read_only'), t)).toBe('dashboard.writeAccessReadOnly');
    expect(getClusterWriteAccessLabel(cluster('read_write', 'read_only'), t)).toBe('dashboard.writeAccessReadOnly');
    expect(getClusterWriteAccessLabel(cluster('read_write', 'ask_before_changes'), t)).toBe('dashboard.writeAccessApprovalRequired');
    expect(getClusterWriteAccessLabel(cluster('read_write', 'auto_allowed_changes'), t)).toBe('dashboard.writeAccessEnabled');
    expect(getClusterWriteAccessLabel(cluster('unknown'), t)).toBe('dashboard.unavailable');
    expect(getClusterWriteAccessLabel(cluster(undefined), t)).toBe('dashboard.unavailable');
  });
});
