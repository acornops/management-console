import { describe, expect, it } from 'vitest';
import {
  executionDuration,
  executionTimestamp,
  workflowExecutionActionKey,
  workflowExecutionActorLabel
} from './WorkflowActivityUi';
import type { WorkflowExecutionSummary } from '@/services/control-plane/workflowApi';

function summary(
  status: WorkflowExecutionSummary['status'],
  values: Partial<WorkflowExecutionSummary> = {}
): WorkflowExecutionSummary {
  return {
    id: 'execution-1',
    workspaceId: 'workspace-1',
    workflow: { id: 'workflow-1', name: 'Triage' },
    status,
    origin: { schemaVersion: 1, kind: 'manual', label: 'Manual' },
    createdAt: '2026-07-15T08:00:00.000Z',
    updatedAt: '2026-07-15T08:10:00.000Z',
    ...values
  };
}

describe('workflow activity timing', () => {
  it('shows a member label for the operator who ran the workflow', () => {
    const actors = new Map([['user-1', 'Test User']]);
    const labels = { acornOps: 'AcornOps', unavailable: 'Unavailable' };

    expect(workflowExecutionActorLabel('user-1', actors, labels)).toBe('Test User');
    expect(workflowExecutionActorLabel('system', actors, labels)).toBe('AcornOps');
    expect(workflowExecutionActorLabel(undefined, actors, labels)).toBe('Unavailable');
  });

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
});
