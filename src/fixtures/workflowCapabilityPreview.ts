import { FIXTURE_IDS, getFixtureState } from './store';

const NOW = '2026-07-15T08:30:00.000Z';

export function workflowCapabilityPreview(
  state: ReturnType<typeof getFixtureState>,
  workflowId: string,
  input: Record<string, any>
): Record<string, unknown> | undefined {
  const workflow = state.workflows.find((item) => item.id === workflowId);
  if (!workflow) return undefined;
  const requestedTargetId = typeof input.inputs?.target === 'string' ? input.inputs.target : undefined;
  const candidates = [
    { id: FIXTURE_IDS.cluster, name: 'Singapore Production', targetType: 'kubernetes', status: 'ready' },
    { id: FIXTURE_IDS.virtualMachine, name: 'Payments VM', targetType: 'virtual_machine', status: 'ready' }
  ];
  const selectedTarget = requestedTargetId
    ? candidates.find((candidate) => candidate.id === requestedTargetId)
    : undefined;
  const targetRequired = Array.isArray(workflow.parameters)
    && workflow.parameters.some((parameter: { type?: string }) => parameter.type === 'target');
  const status = targetRequired
    ? !requestedTargetId ? 'needs_target' : selectedTarget ? 'ready' : 'blocked'
    : 'ready';
  const tools = selectedTarget
    ? state.targetTools.filter((tool) => tool.capability === 'read').map((tool) => ({ id: tool.id, name: tool.name, label: tool.name.replaceAll('_', ' '), description: tool.description, access: 'read', source: 'target' }))
    : [];
  return {
    workflowId,
    workflowVersion: workflow.version,
    promptDigest: '0'.repeat(64),
    bindingDigest: '1'.repeat(64),
    mode: (workflow.capabilityPolicy as { mode?: string } | undefined)?.mode || 'read_only',
    semanticCapabilityIds: (workflow.capabilityPolicy as { semanticCapabilityIds?: string[] } | undefined)?.semanticCapabilityIds || [],
    checkedAt: NOW,
    status,
    reasonCodes: status === 'needs_target' ? ['TARGET_REQUIRED'] : status === 'blocked' ? ['TARGET_NOT_FOUND'] : [],
    targetCandidates: candidates,
    ...(selectedTarget ? { selectedTarget } : {}),
    tools: { read: tools, write: [] },
    directMcpServers: [],
    enabledSkills: [],
    mcpRequirements: [],
    approvalRequirements: [],
    counts: { targets: candidates.length, readyTargets: candidates.length, tools: tools.length, readTools: tools.length, writeTools: 0, directMcpServers: 0, enabledSkills: 0, approvals: 0 }
  };
}
