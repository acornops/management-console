import type { ControlPlaneVirtualMachine } from '@/services/control-plane/virtualMachineTypes';
import type { TargetType } from '@/services/control-plane/types';
import type { ChatSession, KubernetesCluster } from '@/types';

export interface TargetMcpToolSummary {
  toolId: string;
  enabled: boolean;
  toolType?: 'builtin' | 'mcp';
  capability?: 'read' | 'write';
  description?: string;
  version?: string;
  sourceServerId?: string;
  sourceServerName?: string;
  sourceServerUrl?: string;
  enabledConfigured?: boolean;
  enabledEffective?: boolean;
  effectiveDisabledReason?: 'server_disabled' | 'agent_write_disabled' | null;
}

export interface TargetDescriptor {
  id: string;
  workspaceId: string;
  targetType: TargetType;
  name: string;
  status?: 'online' | 'offline' | 'degraded' | 'unknown';
  agentConnectionState?: 'connected' | 'disconnected' | 'not_installed';
  lastUpdate?: string;
  writeConfirmationPolicy?: {
    effectiveRequired: boolean;
    overrideRequired: boolean | null;
    source: 'cluster_override' | 'deployment_default';
  };
  chatSessions: ChatSession[];
  mcpTools: TargetMcpToolSummary[];
}

function mapVirtualMachineConnectionState(
  status: ControlPlaneVirtualMachine['status']
): TargetDescriptor['agentConnectionState'] {
  if (status === 'online') return 'connected';
  if (status === 'unknown') return 'not_installed';
  return 'disconnected';
}

export function toKubernetesTargetDescriptor(cluster: KubernetesCluster): TargetDescriptor {
  return {
    id: cluster.id,
    workspaceId: cluster.workspaceId,
    targetType: 'kubernetes',
    name: cluster.name,
    agentConnectionState: cluster.agentConnectionState,
    lastUpdate: cluster.lastUpdate,
    writeConfirmationPolicy: cluster.writeConfirmationPolicy,
    chatSessions: cluster.chatSessions,
    mcpTools: cluster.mcpTools
  };
}

export function toVirtualMachineTargetDescriptor(
  vm: ControlPlaneVirtualMachine,
  chatSessions: ChatSession[] = []
): TargetDescriptor {
  return {
    id: vm.id,
    workspaceId: vm.workspaceId,
    targetType: 'virtual_machine',
    name: vm.name,
    status: vm.status,
    agentConnectionState: mapVirtualMachineConnectionState(vm.status),
    lastUpdate: vm.latestSnapshot?.timestamp || vm.updatedAt,
    chatSessions,
    mcpTools: []
  };
}
