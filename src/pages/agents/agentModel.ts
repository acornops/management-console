import type { AgentCapability, AgentMcpServerApi, AgentProviderType, AgentSkillApi, AgentStatus, RunPermissionMode } from '@/services/control-plane/agentApi';
import { formatIdentifierLabel } from '@/utils/textFormatting';

export interface AgentDefinition {
  id: string;
  workspaceId: string;
  name: string;
  avatarEmoji: string;
  description: string;
  instructions: string;
  status: AgentStatus;
  reviewState: 'draft' | 'reviewed';
  providerType: AgentProviderType;
  ownerUserId?: string;
  createdBy: string;
  owner: string;
  mcpServers: string[];
  mcpInstallations?: AgentMcpServerApi[];
  tools: string[];
  nativeToolConfigs: Record<string, Record<string, unknown>>;
  skills: string[];
  skillInstallations?: AgentSkillApi[];
  semanticCapabilityIds: string[];
  permissionMode: RunPermissionMode;
  trustPolicy: {
    boundary: string;
    dataEgress: string;
  };
  capabilities: AgentCapability[];
  readiness: {
    status: 'ready' | 'needs_setup' | 'blocked';
    reasons: string[];
  };
  templateRef?: {
    templateId: string;
    recordKey: string;
  };
}

export function getAgentAccessClass(agent: AgentDefinition): string {
  const resourceTypes = Array.from(new Set(agent.capabilities.map((capability) => capability.resourceType).filter(Boolean)));
  const resourceLabel = resourceTypes.length === 1 ? formatIdentifierLabel(resourceTypes[0], 'title') : resourceTypes.length > 1 ? 'Mixed resources' : 'Workspace';
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
      agent.trustPolicy.boundary,
      agent.trustPolicy.dataEgress
    ].join(' ').toLowerCase();

    return tokens.every((token) => searchable.includes(token));
  });
}
