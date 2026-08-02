import type { AgentDefinition } from '@/pages/agents/agentModel';
import type { WorkflowDefinition } from '@/pages/workflows/workflowModel';
import { formatIdentifierLabel } from '@/utils/textFormatting';

type WorkflowCapabilityAgentSource = Pick<AgentDefinition, 'id' | 'name' | 'avatarEmoji' | 'mcpServers' | 'mcpInstallations' | 'tools' | 'skills' | 'skillInstallations' | 'permissionMode' | 'capabilities'>;

export type WorkflowAgentCapabilityReview = {
  agentId: string;
  name: string;
  avatarEmoji?: string;
  mcpServers: string[];
  tools: Array<{
    id: string;
    label: string;
    description?: string;
    access: 'read' | 'write' | 'unknown';
    requiresApproval: boolean;
  }>;
  skills: string[];
  writeAccess: string;
  missingAgentData: boolean;
};

export type WorkflowCapabilityOverviewSummary = {
  agentCount: number;
  missingAgentCount: number;
  tools: {
    read: number;
    write: number;
    unknown: number;
  };
  mcpServers: string[];
  skills: string[];
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
  return formatIdentifierLabel(agentId.replace(/^agent-/, ''), 'title');
}

function capabilityDisplayName(id: string): string {
  return formatIdentifierLabel(id.replace(/^fixture-/, ''), 'title');
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
      avatarEmoji: agent?.avatarEmoji,
      mcpServers: (agent?.mcpServers || []).map((serverId) => (
        agent?.mcpInstallations?.find((server) => server.id === serverId)?.name || capabilityDisplayName(serverId)
      )),
      tools: agent ? toolReviews(agent) : [],
      skills: (agent?.skills || []).map((skillId) => (
        agent?.skillInstallations?.find((skill) => skill.id === skillId)?.name || capabilityDisplayName(skillId)
      )),
      writeAccess: agent ? (() => {
        if (agent.permissionMode === 'read_only') return 'Writes disabled';
        if (agent.permissionMode === 'ask_before_changes') return 'Approval required for writes';
        return 'Routine writes automatic; high-risk changes require approval';
      })() : '',
      missingAgentData: !agent
    };
  });
}

export function getWorkflowCapabilityOverviewSummary(
  workflow: WorkflowDefinition,
  agents: WorkflowCapabilityAgentSource[]
): WorkflowCapabilityOverviewSummary {
  const reviews = getWorkflowAgentCapabilityReview(workflow, agents);
  const toolsById = new Map<string, WorkflowAgentCapabilityReview['tools'][number]>();

  reviews.flatMap((review) => review.tools).forEach((tool) => {
    const current = toolsById.get(tool.id);
    if (!current) {
      toolsById.set(tool.id, tool);
      return;
    }
    const accessRank = { unknown: 0, read: 1, write: 2 } as const;
    toolsById.set(tool.id, {
      ...current,
      access: accessRank[tool.access] > accessRank[current.access] ? tool.access : current.access,
      requiresApproval: current.requiresApproval || tool.requiresApproval
    });
  });

  const tools = [...toolsById.values()];
  return {
    agentCount: reviews.length,
    missingAgentCount: reviews.filter((review) => review.missingAgentData).length,
    tools: {
      read: tools.filter((tool) => tool.access === 'read').length,
      write: tools.filter((tool) => tool.access === 'write').length,
      unknown: tools.filter((tool) => tool.access === 'unknown').length
    },
    mcpServers: uniqueInOrder(reviews.flatMap((review) => review.mcpServers)),
    skills: uniqueInOrder(reviews.flatMap((review) => review.skills))
  };
}
