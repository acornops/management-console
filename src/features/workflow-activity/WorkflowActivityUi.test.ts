import { describe, expect, it } from 'vitest';
import {
  executionDuration,
  executionTimestamp,
  issueWorkflowActivityPath,
  workflowExecutionActionKey
} from './WorkflowActivityUi';
import type { WorkflowExecutionSummary } from '@/services/control-plane/workflowApi';

function summary(
  status: WorkflowExecutionSummary['status'],
  values: Partial<WorkflowExecutionSummary> = {}
): WorkflowExecutionSummary {
  return {
    id: 'execution-1',
    workspaceId: 'workspace-1',
    workflow: { id: 'workflow-1', name: 'Triage', version: 2 },
    status,
    origin: { schemaVersion: 1, kind: 'manual', label: 'Manual' },
    createdAt: '2026-07-15T08:00:00.000Z',
    updatedAt: '2026-07-15T08:10:00.000Z',
    ...values
  };
}

describe('workflow activity timing', () => {
  it('labels attention states with a clear review action', () => {
    expect(workflowExecutionActionKey('waiting_for_approval')).toBe('reviewRun');
    expect(workflowExecutionActionKey('running')).toBe('openRun');
  });

  it('never labels a terminal execution as in progress when its end time is unavailable', () => {
    expect(executionDuration(summary('completed', {
      startedAt: '2026-07-15T08:01:00.000Z'
    }))).toBe('Duration unavailable');
    expect(executionDuration(summary('failed'))).toBe('Duration unavailable');
  });

  it('uses the aggregate end timestamp as the completed activity time', () => {
    expect(executionTimestamp(summary('completed', {
      startedAt: '2026-07-15T08:01:00.000Z',
      endedAt: '2026-07-15T08:03:30.000Z'
    }))).toEqual({
      label: 'Completed',
      value: '2026-07-15T08:03:30.000Z'
    });
  });

  it('treats needs-review as settled work with its latest update time', () => {
    const execution = summary('needs_review', {
      startedAt: '2026-07-15T08:01:00.000Z'
    });
    expect(executionDuration(execution)).toBe('Duration unavailable');
    expect(executionTimestamp(execution)).toEqual({
      label: 'Updated',
      value: '2026-07-15T08:10:00.000Z'
    });
  });

  it('opens the actual active execution instead of a newer terminal execution', () => {
    const latest = summary('completed', { id: 'execution-latest' });
    const openExecution = summary('waiting_for_approval', { id: 'execution-open' });
    expect(issueWorkflowActivityPath('workspace-1', 'issue-1', {
      totalCount: 2,
      openCount: 1,
      attentionCount: 1,
      openExecution,
      latestExecution: latest
    })).toBe(
      '/workspaces/workspace-1/workflows?workflow=workflow-1&tab=runs&execution=execution-open'
    );
  });

  it('keeps multiple active issue automations grouped in the ledger', () => {
    expect(issueWorkflowActivityPath('workspace-1', 'issue-1', {
      totalCount: 3,
      openCount: 2,
      attentionCount: 1,
      latestExecution: summary('running')
    })).toBe('/workspaces/workspace-1/workflows?view=activity&issue=issue-1');
  });
});
