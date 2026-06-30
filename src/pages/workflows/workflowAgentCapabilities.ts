import type { AgentDefinition } from '@/pages/agents/agentModel';
import type { WorkflowDefinition } from '@/pages/workflows/workflowModel';

type WorkflowCapabilityAgentSource = Pick<AgentDefinition, 'id' | 'name' | 'mcpServers' | 'tools' | 'skills' | 'approvalPolicy' | 'capabilities'>;

export type WorkflowAgentCapabilityReview = {
  agentId: string;
  name: string;
  role: string;
  required: boolean;
  mcpServers: string[];
  tools: string[];
  skills: string[];
  approvalPolicy: string[];
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

function formatApprovalPolicy(policy: WorkflowCapabilityAgentSource['approvalPolicy']): string[] {
  const labelByValue: Record<WorkflowCapabilityAgentSource['approvalPolicy']['writeActions'], string> = {
    allowed: 'allowed',
    approval_required: 'approval required',
    blocked: 'blocked'
  };
  return [
    `Sensitive actions: ${labelByValue[policy.sensitiveActions]}`,
    `Write actions: ${labelByValue[policy.writeActions]}`
  ];
}

function formatCapabilityRule(capability: WorkflowCapabilityAgentSource['capabilities'][number]): string {
  const resource = capability.resourceScope || capability.resourceType;
  const tool = capability.toolId ? ` via ${capability.toolId}` : '';
  const approval = capability.requiresApproval ? ' (approval)' : '';
  return `${capability.operation} ${capability.resourceType} ${resource}${tool}${approval}`;
}

export function getWorkflowAgentCapabilityReview(
  workflow: WorkflowDefinition,
  agents: WorkflowCapabilityAgentSource[]
): WorkflowAgentCapabilityReview[] {
  const agentsById = new Map(agents.map((agent) => [agent.id, agent]));
  const workflowAgentRefs = workflow.agents.map((agent) => [agent.agentId, agent] as const);
  const refsByAgentId = new Map(workflowAgentRefs);
  const stepAgentIds = workflow.steps.flatMap((step) => step.agentIds || []);
  const assignedAgentIds = uniqueInOrder([...workflowAgentRefs.map(([agentId]) => agentId), ...stepAgentIds]);

  return assignedAgentIds.map((agentId) => {
    const workflowAgent = refsByAgentId.get(agentId);
    const agent = agentsById.get(agentId);
    return {
      agentId,
      name: agent?.name || workflowAgent?.name || titleCaseAgentId(agentId),
      role: workflowAgent?.role || 'Step agent',
      required: workflowAgent?.required ?? false,
      mcpServers: agent?.mcpServers || [],
      tools: agent?.tools || [],
      skills: agent?.skills || [],
      approvalPolicy: agent ? formatApprovalPolicy(agent.approvalPolicy) : [],
      capabilityRules: agent ? agent.capabilities.map(formatCapabilityRule) : [],
      missingAgentData: !agent
    };
  });
}
