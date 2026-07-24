import { describe, expect, it } from 'vitest';
import type { WorkflowSessionSummary } from '@/services/control-plane/workflowApi';
import {
  indexPersistedWorkflowRunResponses,
  mapPersistedWorkflowRunResponse,
  mergePersistedWorkflowRunResponses
} from './workflowRunSync';

describe('workflow run response synchronization', () => {
  it('maps a persisted assistant response to the public run id used by the discussion', () => {
    expect(mapPersistedWorkflowRunResponse({
      id: 'run-1',
      executionId: 'workflow-execution-1',
      executorRole: 'specialist',
      status: 'completed',
      endedAt: '2026-07-19T12:58:56.000Z',
      assistantMessage: { content: '## Findings\n\n- Scope mismatch' }
    })).toEqual({
      id: 'workflow-run-run-1-assistant-final',
      runId: 'run-1',
      role: 'agent',
      author: 'Workflow response',
      content: '## Findings\n\n- Scope mismatch',
      createdAt: '2026-07-19T12:58:56.000Z',
      status: 'sent'
    });
  });

  it('ignores empty assistant output and indexes saved responses across sessions', () => {
    const sessions = [{
      id: 'session-1', workflowId: 'workflow-1', workspaceId: 'workspace-1', workflowVersion: 1,
      runs: [
        { id: 'run-empty', assistantMessage: { content: '   ' } },
        { id: 'run-saved', requestedAt: '2026-07-19T12:57:45.000Z', assistantMessage: { content: 'Saved response' } }
      ]
    }] as WorkflowSessionSummary[];

    expect(indexPersistedWorkflowRunResponses(sessions)).toEqual({
      'run-saved': [expect.objectContaining({ runId: 'run-saved', content: 'Saved response' })]
    });
  });

  it('adds persisted responses without discarding optimistic operator messages', () => {
    const operatorMessage = {
      id: 'operator-1', runId: 'run-1', role: 'operator' as const, author: 'You',
      content: 'Continue', createdAt: 'Just now', status: 'sent' as const
    };
    const persistedMessage = {
      id: 'workflow-run-run-1-assistant-final', runId: 'run-1', role: 'agent' as const,
      author: 'Workflow response', content: 'Done', createdAt: '2026-07-19T12:58:56.000Z', status: 'sent' as const
    };

    const merged = mergePersistedWorkflowRunResponses(
      { 'run-1': [operatorMessage] },
      { 'run-1': [persistedMessage] }
    );

    expect(merged['run-1']).toEqual([operatorMessage, persistedMessage]);
    expect(mergePersistedWorkflowRunResponses(merged, { 'run-1': [persistedMessage] })).toBe(merged);
  });
});
