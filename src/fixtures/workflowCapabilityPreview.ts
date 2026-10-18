import { getFixtureState } from './store';

// Illustrative weekday 09:00 Asia/Singapore occurrences, not a cron engine.
export function fixtureScheduleOccurrences(clock: string): string[] {
  const candidate = new Date(clock);
  candidate.setUTCHours(1, 0, 0, 0);
  const times: string[] = [];
  while (times.length < 2) {
    if (candidate.getTime() > Date.parse(clock) && candidate.getUTCDay() !== 0 && candidate.getUTCDay() !== 6) times.push(candidate.toISOString());
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }
  return times;
}

export function workflowCapabilityPreview(
  state: ReturnType<typeof getFixtureState>,
  workflowId: string
): Record<string, unknown> | undefined {
  const workflow = state.workflows.find((item) => item.id === workflowId);
  if (!workflow) return undefined;
  const assignedAgents = state.agents.filter((agent) => workflow.agentIds.includes(agent.id));
  const semanticCapabilityIds = [...new Set(assignedAgents.flatMap((agent) => agent.semanticCapabilityIds))].sort();
  const tools: Array<Record<string, unknown>> = [];
  return {
    workflowId,
    mode: assignedAgents.some((agent) => agent.permissionMode !== 'read_only') ? 'read_write' : 'read_only',
    semanticCapabilityIds,
    checkedAt: state.clock,
    status: 'ready',
    reasonCodes: [],
    tools: { read: tools, write: [] },
    directMcpServers: [],
    enabledSkills: [],
    mcpRequirements: [],
    approvalRequirements: [],
    counts: { tools: tools.length, readTools: tools.length, writeTools: 0, directMcpServers: 0, enabledSkills: 0, approvals: 0 }
  };
}
