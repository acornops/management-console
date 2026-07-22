import { FIXTURE_IDS, getFixtureState } from './store';

const NOW = '2026-07-15T08:30:00.000Z';

export function workflowCapabilityPreview(
  state: ReturnType<typeof getFixtureState>,
  workflowId: string,
  input: Record<string, any>
): Record<string, unknown> | undefined {
  const workflow = state.workflows.find((item) => item.id === workflowId);
  if (!workflow) return undefined;
  const requestedTarget = input.target as { id?: string; targetType?: string } | undefined;
  const candidates = [
    { id: FIXTURE_IDS.cluster, name: 'Singapore Production', targetType: 'kubernetes', status: 'ready' },
    { id: FIXTURE_IDS.virtualMachine, name: 'Payments VM', targetType: 'virtual_machine', status: 'ready' }
  ];
  const selectedTarget = requestedTarget
    ? candidates.find((candidate) => candidate.id === requestedTarget.id && candidate.targetType === requestedTarget.targetType)
    : undefined;
  const targetRequired = Boolean((workflow.targetConstraints as { targetIds?: unknown[] } | undefined)?.targetIds?.length);
  const status = targetRequired && !requestedTarget ? 'needs_target' : selectedTarget ? 'ready' : 'blocked';
  const tools = selectedTarget
    ? state.targetTools.filter((tool) => tool.capability === 'read').map((tool) => ({ id: tool.id, name: tool.name, label: tool.name.replaceAll('_', ' '), description: tool.description, access: 'read', source: 'target' }))
    : [];
  return {
    workflowId,
    workflowVersion: workflow.version,
    mode: (workflow.capabilityPolicy as { mode?: string } | undefined)?.mode || 'read_only',
    semanticCapabilityIds: (workflow.capabilityPolicy as { semanticCapabilityIds?: string[] } | undefined)?.semanticCapabilityIds || [],
    checkedAt: NOW,
    status,
    reasonCodes: status === 'needs_target' ? ['TARGET_REQUIRED'] : status === 'blocked' ? ['TARGET_NOT_FOUND'] : [],
    targetCandidates: candidates,
    ...(selectedTarget ? { selectedTarget, compiledAccessScope: { mode: 'read_only', targetIds: [selectedTarget.id], allowedToolNames: tools.map((tool) => tool.name) } } : {}),
    tools: { read: tools, write: [] },
    directMcpServers: [],
    enabledSkills: [],
    mcpRequirements: [],
    approvalRequirements: [],
    counts: { targets: candidates.length, readyTargets: candidates.length, tools: tools.length, readTools: tools.length, writeTools: 0, directMcpServers: 0, enabledSkills: 0, approvals: 0 }
  };
}
