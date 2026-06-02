import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import { HealthStatus, KubernetesCluster } from '@/types';

export function toClusterShim(vm: ControlPlaneVirtualMachine): KubernetesCluster {
  return {
    id: vm.id,
    name: vm.name,
    cluster: vm.hostname || vm.name,
    namespace: 'host',
    workspaceId: vm.workspaceId,
    agentConnectionState: vm.status === 'online' ? 'connected' : 'disconnected',
    owners: [],
    gitlabPipelines: [],
    status: vm.status === 'online' ? HealthStatus.GREEN : vm.status === 'degraded' ? HealthStatus.YELLOW : HealthStatus.RED,
    podStats: { running: 0, failed: 0, pending: 0 },
    metrics: { cpu: 'n/a', memory: 'n/a' },
    lastUpdate: vm.latestSnapshot?.timestamp || vm.updatedAt,
    mcpTools: [],
    chatSessions: [],
    workloads: [],
    nodes: [],
    namespaces: [],
    services: [],
    ingresses: [],
    pvcs: [],
    alerts: []
  };
}
