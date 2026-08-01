import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  listWorkspaceWorkflowExecutions,
  normalizeWorkflowExecutionPage
} from './workflowActivityApi';

describe('workflow activity control-plane api', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('loads filtered workspace activity', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        items: [],
        nextCursor: null,
        summary: {
          openCount: 2,
          attentionCount: 1,
          latestUpdatedAt: '2026-07-25T08:00:00.000Z'
        }
      }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(listWorkspaceWorkflowExecutions('workspace-1', {
      search: 'production review',
      state: 'attention',
      origin: 'webhook',
      workflowId: 'workflow-1',
      limit: 25,
      cursor: 'cursor-1'
    })).resolves.toMatchObject({
      summary: {
        openCount: 2,
        attentionCount: 1,
        latestUpdatedAt: '2026-07-25T08:00:00.000Z'
      }
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      '/api/v1/workspaces/workspace-1/workflow-executions?search=production+review&state=attention&origin=webhook&workflowId=workflow-1&limit=25&cursor=cursor-1'
    );
  });

  it('rejects malformed activity instead of hiding an invalid execution', () => {
    expect(() => normalizeWorkflowExecutionPage({
      items: [{ id: 'execution-1', status: 'running' }],
      summary: { openCount: 1, attentionCount: 0 }
    })).toThrow('invalid workflow activity data');
  });
});
