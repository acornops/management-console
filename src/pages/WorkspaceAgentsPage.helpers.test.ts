import { describe, expect, it } from 'vitest';

import type { AgentDefinitionApi } from '@/services/control-plane/agentApi';
import { mapApiAgent } from './WorkspaceAgentsPage.helpers';

describe('workspace Agent ownership mapping', () => {
  it('maps the persisted Agent identity and workspace owner', () => {
    const mapped = mapApiAgent({
      id: 'agent-2',
      workspaceId: 'workspace-1',
      name: 'Kubernetes Specialist',
      avatarEmoji: '☸️',
      instructions: 'Inspect live evidence.',
      status: 'active',
      reviewState: 'reviewed',
      providerType: 'internal',
      ownerUserId: 'user-1',
      createdBy: 'user-1'
    } as AgentDefinitionApi, 'Operations', new Map([['user-1', 'Ning Tan']]));

    expect(mapped.avatarEmoji).toBe('☸️');
    expect(mapped.owner).toBe('Ning Tan');
  });
});
