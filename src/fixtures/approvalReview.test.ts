import { beforeEach, describe, expect, it } from 'vitest';
import { resetFixtureStore } from './store';
import { routeFixtureRequest } from './router';

const root = 'http://fixture.local/api/v1';
const read = (path: string) => routeFixtureRequest(new Request(`${root}${path}`));
describe('approval review fixture producer parity', () => {
  beforeEach(() => resetFixtureStore('2026-10-18T08:30:00.000Z'));
  it('resolves inbox identity to full run detail and returns full decided browser DTO', async () => {
    const detail = await read('/runs/fixture-execution-review-run/approvals');
    expect(detail.body).toEqual(expect.arrayContaining([expect.objectContaining({
      id: 'fixture-workspace-approval', runId: 'fixture-execution-review-run', workspaceId: 'fixture-workspace',
      approvalKind: 'tool_write', toolCallId: 'fixture-workspace-approval-call', arguments: { namespace: 'payments', kind: 'Deployment', name: 'payments-worker' }
    })]));
    const decision = await routeFixtureRequest(new Request(`${root}/runs/fixture-execution-review-run/approvals/fixture-workspace-approval/decision`, { method: 'POST', body: JSON.stringify({ decision: 'rejected' }) }));
    expect(decision.body).toMatchObject({ id: 'fixture-workspace-approval', status: 'rejected', executionStatus: 'not_started' });
    expect((await read('/runs/fixture-execution-review-run/approvals')).body).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'fixture-workspace-approval', status: 'rejected', executionStatus: 'not_started' })]));
  });

  it('uses the producer workflow pre-step name and exact gate arguments', async () => {
    expect((await read('/runs/fixture-execution-approval-run/approvals')).body).toEqual(expect.arrayContaining([expect.objectContaining({
      approvalKind: 'pre_step', toolName: 'workflow.approval_gate',
      arguments: { workflowId: 'fixture-workflow', executionId: 'fixture-execution-approval' }
    })]));
  });
});
