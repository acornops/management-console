import { describe, expect, it } from 'vitest';
import { isServerWorkflowRunId, serverWorkflowRunIds } from './workflowRunIdentity';

describe('workflow run identity', () => {
  it('keeps optimistic browser run IDs away from server run-history operations', () => {
    expect(isServerWorkflowRunId(undefined)).toBe(false);
    expect(isServerWorkflowRunId('')).toBe(false);
    expect(isServerWorkflowRunId('local-workflow-run-1784621869248')).toBe(false);
    expect(isServerWorkflowRunId('run-1')).toBe(true);

    expect(serverWorkflowRunIds([
      {
        id: 'local-workflow-run-1784621869248',
        status: 'dispatching',
        actor: 'You',
        duration: 'Starting',
        approvals: 0,
        output: 'Starting workflow run.',
        startedAt: 'Just now'
      },
      {
        id: 'workflow-run-1',
        runId: 'run-1',
        status: 'running',
        actor: 'You',
        duration: 'In progress',
        approvals: 0,
        output: 'Workflow run is in progress.',
        startedAt: 'Just now'
      },
      {
        id: 'local-workflow-run-legacy',
        runId: 'local-workflow-run-legacy',
        status: 'failed',
        actor: 'You',
        duration: 'Failed',
        approvals: 0,
        output: 'Unable to launch workflow.',
        startedAt: 'Just now'
      }
    ])).toEqual(['run-1']);
  });
});
