import { describe, expect, it } from 'vitest';
import { resolveClusterChatFooterKey } from '@/features/kubernetes-cluster-detail/components/detail/clusterChatFooter';
import { HealthStatus, type KubernetesCluster } from '@/types';

function clusterWithPolicy(effectiveRequired?: boolean): KubernetesCluster {
  return {
    id: 'cluster-1',
    name: 'Development Cluster',
    cluster: 'dev',
    namespace: 'default',
    workspaceId: 'workspace-1',
    owners: [],
    gitlabPipelines: [],
    status: HealthStatus.GREEN,
    podStats: { running: 0, failed: 0, pending: 0 },
    metrics: { cpu: '0', memory: '0' },
    mcpTools: [],
    chatSessions: [],
    workloads: [],
    nodes: [],
    namespaces: [],
    services: [],
    ingresses: [],
    pvcs: [],
    alerts: [],
    lastUpdate: '2026-06-01T00:00:00.000Z',
    ...(effectiveRequired === undefined
      ? {}
      : {
          writeConfirmationPolicy: {
            effectiveRequired,
            overrideRequired: effectiveRequired,
            source: 'cluster_override' as const
          }
        })
  };
}

describe('cluster chat footer copy', () => {
  it('uses policy-aware composer footer copy for cluster chat', () => {
    expect(resolveClusterChatFooterKey(clusterWithPolicy(false), false)).toBe('chat.footerReadOnlyRole');
    expect(resolveClusterChatFooterKey(clusterWithPolicy(), true)).toBe('chat.footerApprovalRequired');
    expect(resolveClusterChatFooterKey(clusterWithPolicy(true), true)).toBe('chat.footerApprovalRequired');
    expect(resolveClusterChatFooterKey(clusterWithPolicy(false), true)).toBe('chat.footerApprovalNotRequired');
  });
});
