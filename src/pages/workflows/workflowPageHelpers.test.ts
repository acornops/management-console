import { describe, expect, it } from 'vitest';

import type { WorkflowApiDefinition } from '@/services/control-plane/workflowApi';
import { mapApiWorkflowToDefinition } from './workflowPageHelpers';

function workflow(overrides: Partial<WorkflowApiDefinition> = {}): WorkflowApiDefinition {
  return {
    id: 'workflow-target-diagnostics',
    workspaceId: 'workspace-1',
    version: 4,
    name: 'Target diagnostics',
    description: 'Inspect infrastructure health.',
    status: 'active',
    createdBy: 'user-1',
    agentIds: ['agent-target-diagnostics'],
    executionMode: 'direct',
    tags: [],
    capabilityPolicy: {
      mode: 'read_only',
      restrictionMode: 'restrict',
      semanticCapabilityIds: ['target.diagnostics.read'],
      contextGrants: [],
      maxRuntimeSeconds: 900,
      retentionDays: 30,
      approvalRequirements: []
    },
    ...overrides
  };
}

describe('workflow ownership mapping', () => {
  it('treats legacy template-origin workflows as workspace-owned and editable', () => {
    const mapped = mapApiWorkflowToDefinition(
      workflow({
        source: 'system',
        origin: {
          type: 'template',
          templateId: 'acornops-starter',
          templateVersion: 3
        }
      }),
      undefined,
      'workspace-1',
      undefined,
      new Map([['user-1', 'Test User']])
    );

    expect(mapped.source).toBe('user');
    expect(mapped.owner).toBe('Test User');
    expect(mapped.origin).toEqual({
      type: 'template',
      templateId: 'acornops-starter',
      templateVersion: 3
    });
  });

  it('prefers expanded creator details for newly created default workflows', () => {
    const mapped = mapApiWorkflowToDefinition(
      workflow({
        origin: { type: 'manual' },
        createdByUser: {
          id: 'user-1',
          displayName: 'Test User',
          email: 'test-user@example.com'
        }
      }),
      undefined,
      'workspace-1'
    );

    expect(mapped.source).toBe('user');
    expect(mapped.owner).toBe('Test User');
  });
});
