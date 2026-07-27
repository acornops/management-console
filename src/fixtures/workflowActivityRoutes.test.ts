import { beforeEach, describe, expect, it } from 'vitest';

import { getFixtureState, resetFixtureStore } from './store';
import { routeWorkflowActivityFixtureRequest } from './workflowActivityRoutes';

function route(path: string, method = 'GET') {
  const url = new URL(`http://fixture.local${path}`);
  return routeWorkflowActivityFixtureRequest({
    method,
    path: url.pathname,
    url,
    state: getFixtureState()
  });
}

describe('workflow activity fixture routes', () => {
  beforeEach(resetFixtureStore);

  it('provides deterministic scheduled, issue, approval, review, terminal, and deleted-trigger states', () => {
    const response = route('/api/v1/workspaces/fixture-workspace/workflow-executions');
    expect(response?.status).toBe(200);
    const body = response?.body as {
      items: Array<Record<string, any>>;
      summary: { openCount: number; attentionCount: number };
    };
    expect(body.items.some((item) => (
      item.origin.kind === 'schedule' && item.status === 'running'
    ))).toBe(true);
    expect(body.items.some((item) => item.status === 'waiting_for_approval')).toBe(true);
    expect(body.items.some((item) => item.status === 'needs_review')).toBe(true);
    expect(body.items.some((item) => item.status === 'completed')).toBe(true);
    expect(body.items.some((item) => item.status === 'failed')).toBe(true);
    expect(body.items.some((item) => item.origin.label === 'Deleted trigger')).toBe(true);
    expect(body.summary.openCount).toBeGreaterThan(0);
    expect(body.summary.attentionCount).toBeGreaterThan(0);
  });

  it('filters multiple issue automations', () => {
    const issuePath = '/api/v1/workspaces/fixture-workspace/workflow-executions?sourceIssueId=fixture-issue';
    const issueResponse = route(issuePath);
    const issueBody = issueResponse?.body as { items: Array<{ id: string }> };
    expect(issueBody.items).toHaveLength(3);
  });

  it('searches workflow, provenance, and target labels', () => {
    const response = route('/api/v1/workspaces/fixture-workspace/workflow-executions?search=weekday%20morning');
    const body = response?.body as { items: Array<{ id: string }> };
    expect(body.items.map((item) => item.id)).toEqual(['fixture-execution-scheduled-running']);
  });

  it('serves exact execution details through the existing workflow Runs tab', () => {
    expect(route('/api/v1/workflow-executions/fixture-execution-completed')?.body).toMatchObject({
      execution: { id: 'fixture-execution-completed', status: 'completed' },
      attempts: []
    });
  });

  it('exposes active execution states through the existing workflow session model', () => {
    const response = route('/api/v1/workflows/fixture-workflow/sessions');
    const body = response?.body as {
      items: Array<{ runs: Array<{ executionId: string; status: string }> }>;
    };
    expect(body.items[0]?.runs).toEqual(expect.arrayContaining([
      expect.objectContaining({
        executionId: 'fixture-execution-issue-approval',
        status: 'waiting_for_approval'
      }),
      expect.objectContaining({
        executionId: 'fixture-execution-issue-review',
        status: 'needs_review'
      })
    ]));
  });
});
