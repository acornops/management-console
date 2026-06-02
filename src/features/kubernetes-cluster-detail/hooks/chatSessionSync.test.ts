import { afterEach, describe, expect, it, vi } from 'vitest';
import { mapControlPlaneApprovalToPendingApproval } from '@/features/kubernetes-cluster-detail/hooks/chatSessionSync';
import {
  createConversationId,
  createConversationName,
  replaceCancelledRunMessagesForHydration,
  sortSessionsByTimestamp
} from '@/features/kubernetes-cluster-detail/hooks/chatSessionSync';
import type { ControlPlaneRunToolApproval } from '@/services/controlPlaneApi';
import type { ChatSession } from '@/types';

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
      toolName: 'restart_workload',
      arguments: { namespace: 'prod', name: 'api' },
      status: 'pending',
      expiresAt: '2026-05-24T00:00:00.000Z'
    });
  });

  describe('chatSessionSync helpers', () => {
    it('sorts sessions newest-first and formats conversation names', () => {
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
      expect(createConversationName('abcdef123456')).toBe('Conversation abcdef12');
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
  });
});
