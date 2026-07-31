import { FIXTURE_IDS, getFixtureState } from './store';

const NOW = '2026-07-15T08:30:00.000Z';

export function workflowCapabilityPreview(
  state: ReturnType<typeof getFixtureState>,
  workflowId: string
): Record<string, unknown> | undefined {
  const workflow = state.workflows.find((item) => item.id === workflowId);
  if (!workflow) return undefined;
  const candidates = [
    { id: FIXTURE_IDS.cluster, name: 'Singapore Production', targetType: 'kubernetes', status: 'ready' },
    { id: FIXTURE_IDS.virtualMachine, name: 'Payments VM', targetType: 'virtual_machine', status: 'ready' }
  ];
  const tools: Array<Record<string, unknown>> = [];
  return {
    workflowId,
    workflowVersion: workflow.version,
    mode: (workflow.capabilityPolicy as { mode?: string } | undefined)?.mode || 'read_only',
    semanticCapabilityIds: (workflow.capabilityPolicy as { semanticCapabilityIds?: string[] } | undefined)?.semanticCapabilityIds || [],
    checkedAt: NOW,
    status: 'ready',
    reasonCodes: [],
    targetCandidates: candidates,
    tools: { read: tools, write: [] },
    directMcpServers: [],
    enabledSkills: [],
    mcpRequirements: [],
    approvalRequirements: [],
    counts: { targets: candidates.length, readyTargets: candidates.length, tools: tools.length, readTools: tools.length, writeTools: 0, directMcpServers: 0, enabledSkills: 0, approvals: 0 }
  };
}
