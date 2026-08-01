import { getFixtureState } from './store';

const NOW = '2026-07-15T08:30:00.000Z';

export function workflowCapabilityPreview(
  state: ReturnType<typeof getFixtureState>,
  workflowId: string
): Record<string, unknown> | undefined {
  const workflow = state.workflows.find((item) => item.id === workflowId);
  if (!workflow) return undefined;
  const tools: Array<Record<string, unknown>> = [];
  return {
    workflowId,
    mode: (workflow.capabilityPolicy as { mode?: string } | undefined)?.mode || 'read_only',
    semanticCapabilityIds: (workflow.capabilityPolicy as { semanticCapabilityIds?: string[] } | undefined)?.semanticCapabilityIds || [],
    checkedAt: NOW,
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
