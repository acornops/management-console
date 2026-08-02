import { describe, expect, it } from 'vitest';

import { getWorkflowPrimaryAction, type WorkflowDefinition } from './workflowModel';

function workflow(
  status: WorkflowDefinition['status'],
  readiness: WorkflowDefinition['readiness']
): WorkflowDefinition {
  return {
    id: 'workflow-1',
    workspaceId: 'workspace-1',
    name: 'Infrastructure diagnostics',
    description: 'Inspect infrastructure health.',
    status,
    agentIds: ['agent-1'],
    executionMode: 'direct',
    semanticCapabilityIds: ['infrastructure.diagnostics.read'],
    capabilityRestrictionMode: 'restrict',
    readiness,
    owner: 'Workspace owner',
    tags: [],
    lastRun: 'No runs yet',
    agents: [],
    contextGrants: [],
    policy: { mode: 'read_only', approvals: [] },
    starterPrompt: 'Inspect production health.',
    runs: []
  };
}

describe('workflow primary actions', () => {
  it('keeps Schedule and Launch visible for active workflows with readiness blockers', () => {
    expect(getWorkflowPrimaryAction(workflow('active', {
      status: 'needs_setup',
      reasons: ['A required MCP connection is unavailable.']
    }))).toBe('launch');
  });

  it('keeps activation as the lifecycle action for inactive workflows', () => {
    expect(getWorkflowPrimaryAction(workflow('draft', {
      status: 'needs_setup',
      reasons: ['A required MCP connection is unavailable.']
    }))).toBe('activate');
  });
});
