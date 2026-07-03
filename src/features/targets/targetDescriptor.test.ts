import { describe, expect, it } from 'vitest';
import { toKubernetesTargetDescriptor, toVirtualMachineTargetDescriptor } from '@/features/targets/targetDescriptor';
import { HealthStatus, type KubernetesCluster } from '@/types';
import type { ControlPlaneVirtualMachine } from '@/services/control-plane/virtualMachineTypes';

function cluster(overrides: Partial<KubernetesCluster> = {}): KubernetesCluster {
  return {
    id: 'cluster-1',
    workspaceId: 'workspace-1',
    name: 'Production cluster',
    cluster: 'prod',
    namespace: 'default',
    agentConnectionState: 'connected',
    owners: [],
    gitlabPipelines: [],
    status: HealthStatus.GREEN,
    podStats: { running: 3, failed: 0, pending: 1 },
    metrics: { cpu: '2 cores', memory: '8 GiB' },
    lastUpdate: '2026-07-03T00:00:00.000Z',
    mcpTools: [
      {
        toolId: 'kubectl-get',
        enabled: true,
        toolType: 'builtin',
        capability: 'read'
      }
    ],
    chatSessions: [],
    workloads: [],
    nodes: [],
    namespaces: [],
    services: [],
    ingresses: [],
    pvcs: [],
    alerts: [],
    writeConfirmationPolicy: {
      effectiveRequired: true,
      overrideRequired: null,
      source: 'deployment_default'
    },
    ...overrides
  };
}

function vm(overrides: Partial<ControlPlaneVirtualMachine> = {}): ControlPlaneVirtualMachine {
  return {
    id: 'vm-1',
    workspaceId: 'workspace-1',
    name: 'Build host',
    status: 'online',
    hostname: 'build-01',
    osFamily: 'linux',
    serviceManager: 'systemd',
    createdAt: '2026-07-02T00:00:00.000Z',
    updatedAt: '2026-07-03T00:00:00.000Z',
    latestSnapshot: {
      targetId: 'vm-1',
      workspaceId: 'workspace-1',
      timestamp: '2026-07-03T00:05:00.000Z'
    },
    ...overrides
  };
}

describe('target descriptor mappers', () => {
  it('preserves Kubernetes target identity, tools, sessions, and write policy', () => {
    const descriptor = toKubernetesTargetDescriptor(cluster({
      chatSessions: [{ id: 'session-1', name: 'Triage', messages: [], timestamp: 1 }]
    }));

    expect(descriptor).toMatchObject({
      id: 'cluster-1',
      workspaceId: 'workspace-1',
      targetType: 'kubernetes',
      name: 'Production cluster',
      agentConnectionState: 'connected',
      writeConfirmationPolicy: {
        effectiveRequired: true,
        overrideRequired: null,
        source: 'deployment_default'
      }
    });
    expect(descriptor.mcpTools).toEqual([{ toolId: 'kubectl-get', enabled: true, toolType: 'builtin', capability: 'read' }]);
    expect(descriptor.chatSessions).toHaveLength(1);
  });

  it('maps VMs to a virtual machine descriptor without Kubernetes placeholder fields', () => {
    const descriptor = toVirtualMachineTargetDescriptor(vm(), [
      { id: 'session-1', name: 'Host triage', messages: [], timestamp: 1 }
    ]);

    expect(descriptor).toEqual({
      id: 'vm-1',
      workspaceId: 'workspace-1',
      targetType: 'virtual_machine',
      name: 'Build host',
      status: 'online',
      agentConnectionState: 'connected',
      lastUpdate: '2026-07-03T00:05:00.000Z',
      chatSessions: [{ id: 'session-1', name: 'Host triage', messages: [], timestamp: 1 }],
      mcpTools: []
    });
    expect('podStats' in descriptor).toBe(false);
    expect('workloads' in descriptor).toBe(false);
    expect('namespace' in descriptor).toBe(false);
  });

  it('maps unknown VM connection state to not installed for target chat/admin surfaces', () => {
    expect(toVirtualMachineTargetDescriptor(vm({ status: 'unknown' })).agentConnectionState).toBe('not_installed');
  });
});
