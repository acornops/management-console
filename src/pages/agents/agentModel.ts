import type { AgentCapability, AgentMcpServerApi, AgentProviderType, AgentSkillApi, AgentStatus, AgentTargetScopeApi, RunPermissionMode } from '@/services/control-plane/agentApi';

export interface AgentDefinition {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  instructions: string;
  status: AgentStatus;
  origin: { type: 'template' | 'manual'; templateId?: string; templateVersion?: number };
  reviewState: 'draft' | 'reviewed';
  providerType: AgentProviderType;
  ownerUserId?: string;
  createdBy: string;
  owner: string;
  version: number;
  mcpServers: string[];
  mcpInstallations?: AgentMcpServerApi[];
  tools: string[];
  skills: string[];
  skillInstallations?: AgentSkillApi[];
  semanticCapabilityIds: string[];
  targetScope: string[];
  contextScope: string[];
  permissionMode: RunPermissionMode;
  trustPolicy: {
    boundary: string;
    dataEgress: string;
  };
  capabilities: AgentCapability[];
  workflowsUsingAgent: string[];
  workflowUsage: {
    workflowRunCount: number;
    lastRunAt?: string;
    lastStatus?: string;
  };
}

const titleCase = (value: string): string =>
  value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function getAgentAccessClass(agent: AgentDefinition): string {
  const scopedResourceTypes = agent.targetScope.flatMap((scope) => {
    const [resourceType] = scope.split(':', 1);
    return resourceType && resourceType !== 'workspace' && resourceType !== 'scope' ? [resourceType] : [];
  });
  const resourceTypes = scopedResourceTypes.length > 0
    ? Array.from(new Set(scopedResourceTypes))
    : Array.from(new Set(agent.capabilities.map((capability) => capability.resourceType).filter(Boolean)));
  const resourceLabel = resourceTypes.length === 1 ? titleCase(resourceTypes[0]) : resourceTypes.length > 1 ? 'Mixed resources' : 'Workspace';
  if (agent.permissionMode === 'read_only') return `${resourceLabel} read only`;
  if (agent.permissionMode === 'ask_before_changes') return `${resourceLabel} read, changes gated`;
  return `${resourceLabel} routine changes allowed`;
}

export function getAgentEffectiveActionPolicy(permissionMode: RunPermissionMode): {
  permissionMode: string;
  approvalGate: string;
} {
  if (permissionMode === 'read_only') {
    return { permissionMode: 'Read only', approvalGate: 'Writes are disabled' };
  }
  if (permissionMode === 'ask_before_changes') {
    return { permissionMode: 'Ask before changes', approvalGate: 'Before every write-capable tool' };
  }
  return {
    permissionMode: 'Automatic routine changes',
    approvalGate: 'Before high-risk or destructive writes'
  };
}

export function targetScopeFromTokens(tokens: string[]): AgentTargetScopeApi {
  const normalized = tokens.map((token) => token.trim()).filter(Boolean);
  const explicitScope = normalized.find((token) => token.startsWith('scope:'))?.slice('scope:'.length);
  const targetTypes = normalized.flatMap((token) => {
    if (token.startsWith('target-type:')) return [token.slice('target-type:'.length)];
    if (token.endsWith(':*')) return [token.slice(0, -2)];
    return [];
  });
  const targetIds = normalized.flatMap((token) => {
    if (token.startsWith('target:')) return [token.slice('target:'.length)];
    const [kind, id] = token.split(':', 2);
    if (kind && id && id !== '*' && kind !== 'scope' && kind !== 'target-type' && kind !== 'workspace') return [id];
    return [];
  });
  const uniqueTargetTypes = Array.from(new Set(targetTypes));
  const uniqueTargetIds = Array.from(new Set(targetIds));
  if ((explicitScope === 'workspace' || normalized.includes('workspace:current') || normalized.includes('workspace')) && uniqueTargetTypes.length === 0 && uniqueTargetIds.length === 0) {
    return { type: 'workspace' };
  }
  return {
    type: 'selected_target',
    ...(uniqueTargetTypes.length > 0 ? { targetTypes: uniqueTargetTypes } : {}),
    ...(uniqueTargetIds.length > 0 ? { targetIds: uniqueTargetIds } : {})
  };
}

export function filterAgentDefinitions(agents: AgentDefinition[], query: string): AgentDefinition[] {
  const tokens = query.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return agents;

  return agents.filter((agent) => {
    const searchable = [
      agent.name,
      agent.description,
      agent.status,
      agent.providerType,
      agent.owner,
      agent.mcpServers.join(' '),
      agent.tools.join(' '),
      agent.skills.join(' '),
      agent.targetScope.join(' '),
      agent.contextScope.join(' '),
      agent.workflowsUsingAgent.join(' '),
      agent.trustPolicy.boundary,
      agent.trustPolicy.dataEgress
    ].join(' ').toLowerCase();

    return tokens.every((token) => searchable.includes(token));
  });
}
