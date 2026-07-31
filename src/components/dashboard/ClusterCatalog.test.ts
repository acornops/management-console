import { describe, expect, it } from 'vitest';
import type { KubernetesCluster } from '@/types';
import { getClusterWriteAccessLabel } from './ClusterCatalog.helpers';

const t = (key: string) => key;

function cluster(
  agentAccessMode: KubernetesCluster['agentAccessMode'],
  effectiveRequired = true
): KubernetesCluster {
  return {
    agentAccessMode,
    writeConfirmationPolicy: {
      effectiveRequired,
      overrideRequired: null,
      source: 'deployment_default'
    }
  } as KubernetesCluster;
}

describe('getClusterWriteAccessLabel', () => {
  it('describes the effective write posture without conflating access and approval', () => {
    expect(getClusterWriteAccessLabel(cluster('read_only'), t)).toBe('dashboard.writeAccessReadOnly');
    expect(getClusterWriteAccessLabel(cluster('read_write', true), t)).toBe('dashboard.writeAccessApprovalRequired');
    expect(getClusterWriteAccessLabel(cluster('read_write', false), t)).toBe('dashboard.writeAccessEnabled');
    expect(getClusterWriteAccessLabel(cluster('unknown'), t)).toBe('dashboard.unavailable');
    expect(getClusterWriteAccessLabel(cluster(undefined), t)).toBe('dashboard.unavailable');
  });
});
