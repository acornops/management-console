import { describe, expect, it } from 'vitest';

import { mergeAgentAuditHistoryWithActivity } from './WorkspaceAgentsPage.helpers';

describe('mergeAgentAuditHistoryWithActivity', () => {
  const localEntry = {
    id: 'local-version-event',
    summary: 'Version snapshot saved as v2.',
    occurredAt: '2026-07-19T10:00:00.000Z'
  };

  it('retains visible history when refresh returns no activity records', () => {
    expect(mergeAgentAuditHistoryWithActivity([localEntry], [])).toEqual([localEntry]);
  });

  it('reconciles API activity without removing unrelated local history', () => {
    expect(mergeAgentAuditHistoryWithActivity([localEntry], [{
      id: 'run-1',
      agentId: 'agent-1',
      workspaceId: 'workspace-1',
      agentVersion: 2,
      status: 'completed',
      createdAt: '2026-07-19T10:01:00.000Z'
    }])).toEqual([
      {
        id: 'run-1',
        summary: 'Activity completed on v2',
        occurredAt: '2026-07-19T10:01:00.000Z'
      },
      localEntry
    ]);
  });
});
