import { describe, expect, it } from 'vitest';

import type { WorkflowApiDefinition } from '@/services/control-plane/workflowApi';
import { mapApiWorkflowToDefinition } from './workflowPageHelpers';

function workflow(overrides: Partial<WorkflowApiDefinition> = {}): WorkflowApiDefinition {
  return {
    id: 'workflow-infrastructure-diagnostics',
    workspaceId: 'workspace-1',
    name: 'Infrastructure diagnostics',
    description: 'Inspect infrastructure health.',
    status: 'active',
    createdBy: 'user-1',
    agentIds: ['agent-infrastructure-diagnostics'],
    executionMode: 'direct',
    tags: [],
    ...overrides
  };
}

describe('workflow ownership mapping', () => {
  it('prefers expanded creator details for workspace workflows', () => {
    const mapped = mapApiWorkflowToDefinition(
      workflow({
        createdByUser: {
          id: 'user-1',
          displayName: 'Test User',
          email: 'test-user@example.com'
        }
      }),
      undefined,
      'workspace-1'
    );

    expect(mapped.owner).toBe('Test User');
  });
});
