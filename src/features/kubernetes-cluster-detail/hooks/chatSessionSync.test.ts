import { afterEach, describe, expect, it, vi } from 'vitest';
import { sanitizeChatMessages } from '@/features/kubernetes-cluster-detail/lib/session-utils';
import { mapControlPlaneApprovalToPendingApproval } from '@/features/kubernetes-cluster-detail/hooks/chatSessionSync';
import {
  createConversationId,
  findExistingSessionForBackendId,
  hasRunMessageWithoutTraceDetails,
  mapControlPlaneSessionToChatSession,
  mergeHydratedChatMessages,
  mergeFetchedChatSessions,
  replaceCancelledRunMessagesForHydration,
  sortSessionsByTimestamp
} from '@/features/kubernetes-cluster-detail/hooks/chatSessionSync';
import type { ControlPlaneRunToolApproval, ControlPlaneSession } from '@/services/controlPlaneApi';
import type { ChatMessage, ChatSession } from '@/types';
import type { LiveRunTrace } from '@/features/kubernetes-cluster-detail/types';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('mapControlPlaneApprovalToPendingApproval', () => {
  it('restores a backend write approval into a chat approval card model', () => {
    const approval: ControlPlaneRunToolApproval = {
      id: 'approval-1',
      runId: 'run-1',
      workspaceId: 'workspace-1',
      targetId: 'cluster-1',
      targetType: 'kubernetes',
      clusterId: 'cluster-1',
      toolCallId: 'tool-call-1',
      toolName: 'restart_workload',
      summary: 'Restart workload prod/api.',
      arguments: { namespace: 'prod', name: 'api' },
      status: 'pending',
      executionStatus: 'not_started',
      expiresAt: '2026-05-24T00:00:00.000Z'
    };

    expect(mapControlPlaneApprovalToPendingApproval(approval)).toEqual({
      id: 'approval-1',
      runId: 'run-1',
      toolCallId: 'tool-call-1',
      action: 'Run restart_workload',
      summary: 'Restart workload prod/api.',
      toolName: 'restart_workload',
      arguments: { namespace: 'prod', name: 'api' },
      status: 'pending',
      expiresAt: '2026-05-24T00:00:00.000Z'
    });
  });

  describe('chatSessionSync helpers', () => {
    it('sorts sessions newest-first', () => {
      const sessions: ChatSession[] = [
        { id: 'session-a', name: 'A', messages: [], timestamp: 1 },
        { id: 'session-c', name: 'C', messages: [], timestamp: 3 },
        { id: 'session-b', name: 'B', messages: [], timestamp: 2 }
      ];

      expect(sortSessionsByTimestamp(sessions).map((session) => session.id)).toEqual([
        'session-c',
        'session-b',
        'session-a'
      ]);
    });

    it('preserves draft-backed sessions when fetched backend rows are mapped', () => {
      const draftBackedSession: ChatSession = {
        id: 'draft-session',
        backendSessionId: 'backend-session',
        name: 'Draft',
        hydrated: true,
        messages: [{ id: 'local-user', role: 'user', content: 'Check pods', timestamp: 1 }],
        timestamp: 1
      };
      const backendSession: ControlPlaneSession = {
        id: 'backend-session',
        workspaceId: 'workspace-1',
        targetId: 'target-1',
        targetType: 'kubernetes',
        title: 'Backend session',
        status: 'open',
        createdBy: 'user-1',
        createdByUser: { id: 'user-1', displayName: 'User One' },
        createdAt: '2026-06-01T05:00:00.000Z',
        updatedAt: '2026-06-01T05:00:00.000Z',
        lastMessageAt: '2026-06-01T05:00:00.000Z',
        expiresAt: '2026-06-02T05:00:00.000Z'
      };

      const existing = findExistingSessionForBackendId([draftBackedSession], backendSession.id);
      const fetched = mapControlPlaneSessionToChatSession(backendSession, existing);
      const merged = mergeFetchedChatSessions([fetched], [draftBackedSession], draftBackedSession.id);

      expect(fetched.id).toBe('draft-session');
      expect(fetched.backendSessionId).toBe('backend-session');
      expect(fetched.messages).toEqual(draftBackedSession.messages);
      expect(merged).toHaveLength(1);
      expect(merged[0].id).toBe('draft-session');
    });

    it('prefers crypto randomUUID and falls back to local ids', () => {
      const randomUuidSpy = vi.spyOn(globalThis.crypto, 'randomUUID');
      randomUuidSpy.mockReturnValueOnce('12345678-1234-1234-1234-123456789abc');
      expect(createConversationId()).toBe('12345678-1234-1234-1234-123456789abc');

      randomUuidSpy.mockImplementationOnce(() => '' as `${string}-${string}-${string}-${string}-${string}`);
      expect(createConversationId()).toMatch(/^session-/);
    });

    it('sanitizes stale assistant output for cancelled runs during hydration', () => {
      const sessionsMessages: ChatSession['messages'] = [
        {
          id: 'user-message',
          role: 'user',
          content: 'Check the rollout',
          runId: 'run-cancelled',
          timestamp: 1
        },
        {
          id: 'stale-assistant-message',
          role: 'assistant',
          content: 'Partial generated content from before cancellation',
          runId: 'run-cancelled',
          timestamp: 2
        },
        {
          id: 'other-assistant-message',
          role: 'assistant',
          content: 'Previous run result',
          runId: 'run-complete',
          timestamp: 3
        }
      ];

      expect(replaceCancelledRunMessagesForHydration(
        sessionsMessages,
        new Set(['run-cancelled']),
        'Run cancelled. You can send another message when ready.'
      )).toEqual([
        sessionsMessages[0],
        {
          id: 'stale-assistant-message',
          role: 'assistant',
          content: 'Run cancelled. You can send another message when ready.',
          runId: 'run-cancelled',
          timestamp: expect.any(Number)
        },
        sessionsMessages[2]
      ]);
    });

    it('detects hydrated run messages that still need trace replay', () => {
      const messages: ChatMessage[] = [
        { id: 'user-message', role: 'user', content: 'Check rollout', runId: 'run-1', timestamp: 1 },
        { id: 'assistant-message', role: 'assistant', content: 'Rollout is healthy.', runId: 'run-1', timestamp: 2 }
      ];

      expect(hasRunMessageWithoutTraceDetails(messages, {})).toBe(true);
      expect(hasRunMessageWithoutTraceDetails(messages, {
        'run-1': { runId: 'run-1', status: 'running', steps: [], toolCalls: [] }
      })).toBe(true);
      expect(hasRunMessageWithoutTraceDetails(messages, {
        'run-1': {
          runId: 'run-1',
          status: 'completed',
          steps: [{ id: 'step-1', label: 'Completed', status: 'success', timestamp: 2 }],
          toolCalls: []
        }
      })).toBe(false);
      expect(hasRunMessageWithoutTraceDetails([
        { id: 'plain-message', role: 'assistant', content: 'No run attached.', timestamp: 3 }
      ], {})).toBe(false);
    });

    it('adds a cancelled assistant message when hydration only has the user turn', () => {
      const sessionsMessages: ChatSession['messages'] = [
        {
          id: 'user-message',
          role: 'user',
          content: 'Check the rollout',
          runId: 'run-cancelled',
          timestamp: 1
        },
        {
          id: 'later-user-message',
          role: 'user',
          content: 'Follow-up after the cancelled run',
          runId: 'run-later',
          timestamp: 2
        }
      ];

      const restoredMessages = replaceCancelledRunMessagesForHydration(
        sessionsMessages,
        new Set(['run-cancelled']),
        'Run cancelled. You can send another message when ready.'
      );

      expect(restoredMessages).toEqual([
        sessionsMessages[0],
        {
          id: 'cancelled-run-cancelled',
          role: 'assistant',
          content: 'Run cancelled. You can send another message when ready.',
          runId: 'run-cancelled',
          timestamp: expect.any(Number)
        },
        sessionsMessages[1]
      ]);
    });

    it('preserves optimistic user and pending assistant messages when backend hydration is empty', () => {
      const localMessages: ChatMessage[] = [
        { id: 'local-user', role: 'user', content: 'Check pods', timestamp: 1, clientMessageId: 'local-user' },
        { id: 'pending-assistant', role: 'assistant', content: '', timestamp: 2, transientStatus: 'pending_assistant' }
      ];

      expect(mergeHydratedChatMessages({ localMessages, backendMessages: [] })).toEqual(localMessages);
    });

    it('dedupes optimistic user messages by backend client message id', () => {
      const localMessages: ChatMessage[] = [
        { id: 'local-user', role: 'user', content: 'Check pods', timestamp: 1, clientMessageId: 'local-user' }
      ];
      const backendMessages: ChatMessage[] = [
        { id: 'backend-user', role: 'user', content: 'Check pods', timestamp: 2, clientMessageId: 'local-user', runId: 'run-1' }
      ];

      expect(mergeHydratedChatMessages({ localMessages, backendMessages })).toEqual(backendMessages);
    });

    it('dedupes optimistic user messages when the backend stores the local id as its client message id', () => {
      const localMessages: ChatMessage[] = [
        { id: 'local-user', role: 'user', content: 'Check pods', timestamp: 1 }
      ];
      const backendMessages: ChatMessage[] = [
        { id: 'backend-user', role: 'user', content: 'Check pods', timestamp: 2, clientMessageId: 'local-user', runId: 'run-1' }
      ];

      expect(mergeHydratedChatMessages({ localMessages, backendMessages })).toEqual(backendMessages);
    });

    it('keeps an in-progress assistant placeholder when hydration has the user but not the assistant', () => {
      const localMessages: ChatMessage[] = [
        { id: 'local-user', role: 'user', content: 'Check pods', timestamp: 1, clientMessageId: 'local-user' },
        {
          id: 'stream-run-1',
          role: 'assistant',
          content: '',
          timestamp: 2,
          runId: 'run-1',
          transientStatus: 'pending_assistant'
        }
      ];
      const backendMessages: ChatMessage[] = [
        { id: 'backend-user', role: 'user', content: 'Check pods', timestamp: 3, clientMessageId: 'local-user', runId: 'run-1' }
      ];
      const runTracesByRunId: Record<string, LiveRunTrace> = {
        'run-1': { runId: 'run-1', status: 'running', steps: [], toolCalls: [] }
      };

      expect(mergeHydratedChatMessages({ localMessages, backendMessages, runTracesByRunId })).toEqual([
        backendMessages[0],
        localMessages[1]
      ]);
    });

    it('replaces an assistant placeholder once a backend final exists for the same run', () => {
      const localMessages: ChatMessage[] = [
        { id: 'local-user', role: 'user', content: 'Check pods', timestamp: 1, clientMessageId: 'local-user' },
        {
          id: 'stream-run-1',
          role: 'assistant',
          content: '',
          timestamp: 2,
          runId: 'run-1',
          transientStatus: 'pending_assistant'
        }
      ];
      const backendMessages: ChatMessage[] = [
        { id: 'backend-user', role: 'user', content: 'Check pods', timestamp: 3, clientMessageId: 'local-user', runId: 'run-1' },
        { id: 'backend-assistant', role: 'assistant', content: 'Pods are healthy.', timestamp: 4, runId: 'run-1' }
      ];

      expect(mergeHydratedChatMessages({ localMessages, backendMessages })).toEqual(backendMessages);
    });

    it('dedupes duplicate assistant responses for a single run during hydration', () => {
      const localMessages: ChatMessage[] = [
        { id: 'local-user', role: 'user', content: 'Check pods', timestamp: 1, clientMessageId: 'local-user', runId: 'run-1' }
      ];
      const backendMessages: ChatMessage[] = [
        { id: 'backend-user', role: 'user', content: 'Check pods', timestamp: 3, clientMessageId: 'local-user', runId: 'run-1' },
        { id: 'backend-assistant-draft', role: 'assistant', content: 'Streaming answer', timestamp: 4, runId: 'run-1' },
        { id: 'backend-assistant-final', role: 'assistant', content: 'Final answer', timestamp: 5, runId: 'run-1' }
      ];

      expect(mergeHydratedChatMessages({ localMessages, backendMessages })).toEqual([
        backendMessages[0],
        backendMessages[2]
      ]);
    });

    it('anchors a late backend assistant final after its triggering user turn', () => {
      const localMessages: ChatMessage[] = [
        { id: 'backend-user-1', role: 'user', content: 'First question', timestamp: 1, runId: 'run-1' },
        { id: 'local-user-2', role: 'user', content: 'Second question', timestamp: 3, clientMessageId: 'local-user-2', runId: 'run-2' },
        {
          id: 'stream-run-2',
          role: 'assistant',
          content: '',
          timestamp: 4,
          runId: 'run-2',
          transientStatus: 'pending_assistant'
        }
      ];
      const backendMessages: ChatMessage[] = [
        { id: 'backend-user-1', role: 'user', content: 'First question', timestamp: 1, runId: 'run-1' },
        { id: 'backend-assistant-1', role: 'assistant', content: 'First answer', timestamp: 2, runId: 'run-1' }
      ];

      expect(mergeHydratedChatMessages({ localMessages, backendMessages }).map((message) => message.id)).toEqual([
        'backend-user-1',
        'backend-assistant-1',
        'local-user-2',
        'stream-run-2'
      ]);
    });

    it('dedupes local and restored backend assistant placeholders for the same run', () => {
      const localMessages: ChatMessage[] = [
        { id: 'local-user', role: 'user', content: 'Check pods', timestamp: 1, clientMessageId: 'local-user', runId: 'run-1' },
        {
          id: 'stream-run-1',
          role: 'assistant',
          content: '',
          timestamp: 2,
          runId: 'run-1',
          transientStatus: 'pending_assistant'
        }
      ];
      const backendMessages: ChatMessage[] = [
        { id: 'backend-user', role: 'user', content: 'Check pods', timestamp: 3, clientMessageId: 'local-user', runId: 'run-1' },
        { id: 'rehydrated-run-1', role: 'assistant', content: '', timestamp: 4, runId: 'run-1' }
      ];
      const runTracesByRunId: Record<string, LiveRunTrace> = {
        'run-1': { runId: 'run-1', status: 'running', steps: [], toolCalls: [] }
      };

      expect(mergeHydratedChatMessages({ localMessages, backendMessages, runTracesByRunId })).toEqual(backendMessages);
    });

    it('does not reinsert a revised cancelled run from backend hydration', () => {
      const localMessages: ChatMessage[] = [
        { id: 'replacement-user', role: 'user', content: 'Check all pods', timestamp: 4, clientMessageId: 'replacement-user', runId: 'run-new' },
        {
          id: 'stream-run-new',
          role: 'assistant',
          content: '',
          timestamp: 5,
          runId: 'run-new',
          transientStatus: 'pending_assistant'
        }
      ];
      const backendMessages: ChatMessage[] = [
        { id: 'old-user', role: 'user', content: 'Check pods', timestamp: 1, runId: 'run-cancelled' },
        {
          id: 'old-assistant',
          role: 'assistant',
          content: 'Run cancelled. You can send another message when ready.',
          timestamp: 2,
          runId: 'run-cancelled'
        },
        { id: 'replacement-user-backend', role: 'user', content: 'Check all pods', timestamp: 6, clientMessageId: 'replacement-user', runId: 'run-new' }
      ];
      const runTracesByRunId: Record<string, LiveRunTrace> = {
        'run-new': { runId: 'run-new', status: 'running', steps: [], toolCalls: [] }
      };

      expect(mergeHydratedChatMessages({
        localMessages,
        backendMessages,
        runTracesByRunId,
        suppressedRunIds: new Set(['run-cancelled'])
      })).toEqual([
        backendMessages[2],
        localMessages[1]
      ]);
    });

    it('keeps a restored in-progress assistant placeholder visible after sanitization', () => {
      const backendMessages: ChatMessage[] = [
        { id: 'backend-user', role: 'user', content: 'Check pods', timestamp: 1, clientMessageId: 'local-user', runId: 'run-1' },
        {
          id: 'rehydrated-run-1',
          role: 'assistant',
          content: '',
          timestamp: 2,
          runId: 'run-1',
          transientStatus: 'pending_assistant'
        }
      ];
      const runTracesByRunId: Record<string, LiveRunTrace> = {
        'run-1': { runId: 'run-1', status: 'running', steps: [], toolCalls: [] }
      };

      const mergedMessages = mergeHydratedChatMessages({
        localMessages: [],
        backendMessages,
        runTracesByRunId
      });

      expect(sanitizeChatMessages(mergedMessages)).toEqual(backendMessages);
    });

    it('drops stale terminal assistant placeholders during hydration', () => {
      const localMessages: ChatMessage[] = [
        { id: 'local-user', role: 'user', content: 'Check pods', timestamp: 1, clientMessageId: 'local-user', runId: 'run-1' },
        {
          id: 'stream-run-1',
          role: 'assistant',
          content: '',
          timestamp: 2,
          runId: 'run-1',
          transientStatus: 'pending_assistant'
        }
      ];
      const backendMessages: ChatMessage[] = [
        { id: 'backend-user', role: 'user', content: 'Check pods', timestamp: 3, clientMessageId: 'local-user', runId: 'run-1' }
      ];

      expect(mergeHydratedChatMessages({
        localMessages,
        backendMessages,
        terminalRunIds: new Set(['run-1'])
      })).toEqual(backendMessages);
    });
  });
});
