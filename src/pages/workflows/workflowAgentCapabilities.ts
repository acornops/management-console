import { getAgentEffectiveActionPolicy, type AgentDefinition } from '@/pages/agents/agentModel';
import type { WorkflowDefinition } from '@/pages/workflows/workflowModel';

type WorkflowCapabilityAgentSource = Pick<AgentDefinition, 'id' | 'name' | 'mcpServers' | 'mcpInstallations' | 'tools' | 'skills' | 'skillInstallations' | 'semanticCapabilityIds' | 'permissionMode' | 'capabilities'>;

export type WorkflowAgentCapabilityReview = {
  agentId: string;
  name: string;
  role: string;
  required: boolean;
  mcpServers: string[];
  semanticCapabilityIds: string[];
  tools: string[];
  skills: string[];
  actionPolicy: string[];
  capabilityRules: string[];
  missingAgentData: boolean;
};

function uniqueInOrder(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function titleCaseAgentId(agentId: string): string {
  return agentId
    .replace(/^agent-/, '')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

function capabilityDisplayName(id: string): string {
  return id
    .replace(/^fixture-/, '')
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

function formatCapabilityRule(capability: WorkflowCapabilityAgentSource['capabilities'][number]): string {
  const resource = capability.resourceScope || capability.resourceType;
  const tool = capability.toolId ? ` via ${capability.toolId}` : '';
  return `${capability.operation} ${capability.resourceType} ${resource}${tool}`;
}

export function getWorkflowAgentCapabilityReview(
  workflow: WorkflowDefinition,
  agents: WorkflowCapabilityAgentSource[]
): WorkflowAgentCapabilityReview[] {
  const agentsById = new Map(agents.map((agent) => [agent.id, agent]));
  const workflowAgentRefs = workflow.agents.map((agent) => [agent.agentId, agent] as const);
  const refsByAgentId = new Map(workflowAgentRefs);
  const assignedAgentIds = uniqueInOrder([...workflowAgentRefs.map(([agentId]) => agentId), ...workflow.agentIds]);

  return assignedAgentIds.map((agentId) => {
    const workflowAgent = refsByAgentId.get(agentId);
    const agent = agentsById.get(agentId);
    return {
      agentId,
      name: agent?.name || workflowAgent?.name || titleCaseAgentId(agentId),
      role: workflowAgent?.role || 'Assigned Agent',
      required: workflowAgent?.required ?? false,
      mcpServers: (agent?.mcpServers || []).map((serverId) => (
        agent?.mcpInstallations?.find((server) => server.id === serverId)?.name || capabilityDisplayName(serverId)
      )),
      semanticCapabilityIds: agent?.semanticCapabilityIds || [],
      tools: agent?.tools || [],
      skills: (agent?.skills || []).map((skillId) => (
        agent?.skillInstallations?.find((skill) => skill.id === skillId)?.name || capabilityDisplayName(skillId)
      )),
      actionPolicy: agent ? (() => {
        const policy = getAgentEffectiveActionPolicy(agent.permissionMode);
        return [`Permission mode: ${policy.permissionMode}`, `Approval gate: ${policy.approvalGate}`];
      })() : [],
      capabilityRules: agent ? agent.capabilities.map(formatCapabilityRule) : [],
      missingAgentData: !agent
    };
  });
}
