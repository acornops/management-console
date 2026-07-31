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
  tools: Array<{
    id: string;
    label: string;
    description?: string;
    access: 'read' | 'write' | 'unknown';
    requiresApproval: boolean;
  }>;
  skills: string[];
  writeAccess: string;
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

function toolReviews(agent: WorkflowCapabilityAgentSource): WorkflowAgentCapabilityReview['tools'] {
  const mcpTools = (agent.mcpInstallations || []).flatMap((server) => server.tools);
  return uniqueInOrder(agent.tools).map((toolId) => {
    const mcpTool = mcpTools.find((tool) => tool.alias === toolId || tool.name === toolId);
    const capability = agent.capabilities.find((item) => (
      item.toolId === toolId || (mcpTool && item.toolId === mcpTool.name)
    ));
    const access = mcpTool?.capability || capability?.operation || 'unknown';
    const requiresApproval = access === 'write' && (
      capability?.requiresApproval === true
      || agent.permissionMode === 'ask_before_changes'
      || (agent.permissionMode === 'auto_allowed_changes'
        && (!mcpTool || mcpTool.riskLevel === 'high_risk' || mcpTool.riskLevel === 'destructive' || !mcpTool.autoAllowed))
    );
    return {
      id: toolId,
      label: mcpTool?.alias || toolId,
      description: mcpTool?.description,
      access,
      requiresApproval
    };
  });
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
      tools: agent ? toolReviews(agent) : [],
      skills: (agent?.skills || []).map((skillId) => (
        agent?.skillInstallations?.find((skill) => skill.id === skillId)?.name || capabilityDisplayName(skillId)
      )),
      writeAccess: agent ? (() => {
        const policy = getAgentEffectiveActionPolicy(agent.permissionMode);
        if (agent.permissionMode === 'read_only') return policy.approvalGate;
        if (agent.permissionMode === 'ask_before_changes') return 'Approval required before every write-capable tool';
        return 'Routine writes run automatically; approval is required for high-risk or destructive writes';
      })() : '',
      capabilityRules: agent ? agent.capabilities.map(formatCapabilityRule) : [],
      missingAgentData: !agent
    };
  });
}
