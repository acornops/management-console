import { describe, expect, it } from 'vitest';

import type { AgentDefinitionApi } from '@/services/control-plane/agentApi';
import { mapApiAgent } from './WorkspaceAgentsPage.helpers';

describe('workspace Agent ownership mapping', () => {
  it('treats legacy template-origin Agents as workspace-owned', () => {
    const mapped = mapApiAgent({
      id: 'agent-1',
      workspaceId: 'workspace-1',
      name: 'Target Diagnostics',
      description: 'Inspect one target.',
      instructions: 'Use live evidence.',
      status: 'active',
      origin: {
        type: 'template',
        templateId: 'acornops-starter',
        templateVersion: 4
      },
      reviewState: 'reviewed',
      providerType: 'internal',
      ownerUserId: 'user-1',
      createdBy: 'user-1',
      version: 1
    } as AgentDefinitionApi, 'Operations', new Map([['user-1', 'Ning Tan']]));

    expect(mapped.owner).toBe('Ning Tan');
    expect(mapped.origin.type).toBe('template');
  });
});
