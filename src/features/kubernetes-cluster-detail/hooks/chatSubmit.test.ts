import { describe, expect, it } from 'vitest';
import { ChatMessage } from '@/types';
import { RUN_TERMINAL_WAIT_TIMEOUT_MS } from '@/features/kubernetes-cluster-detail/hooks/chatSubmit';
import { preserveStreamingAssistantMessageId } from '@/features/kubernetes-cluster-detail/lib/session-utils';
import {
  replaceCancelledRunAssistantMessages,
  replacePendingCancelledRunMessages
} from '@/features/kubernetes-cluster-detail/hooks/chatRunCancellation';

describe('preserveStreamingAssistantMessageId', () => {
  it('keeps the streamed assistant message mounted when backend messages reconcile', () => {
    const messages: ChatMessage[] = [
      {
        id: 'backend-user-message',
        role: 'user',
        content: 'Check the pods',
        timestamp: 1
      },
      {
        id: 'backend-assistant-message',
        role: 'assistant',
        runId: 'run-123',
        content: 'The pods are healthy.',
        timestamp: 2
      },
      {
        id: 'other-assistant-message',
        role: 'assistant',
        runId: 'run-older',
        content: 'Earlier result.',
        timestamp: 3
      }
    ];

    expect(preserveStreamingAssistantMessageId(messages, 'run-123', 'stream-run-123')).toEqual([
      messages[0],
      {
        ...messages[1],
        id: 'stream-run-123'
      },
      messages[2]
    ]);
  });

  it('remaps a cancelled pending trace to the accepted backend run id', () => {
    const messages: ChatMessage[] = [
      {
        id: 'local-user',
        role: 'user',
        content: 'Check pods',
        timestamp: 1,
        clientMessageId: 'local-user'
      },
      {
        id: 'pending-assistant',
        role: 'assistant',
        runId: 'pending-trace-1',
        content: '',
        transientStatus: 'pending_assistant',
        timestamp: 2
      }
    ];

    expect(replacePendingCancelledRunMessages(messages, {
      pendingRunId: 'pending-trace-1',
      acceptedRunId: 'run-123',
      userMessageId: 'local-user',
      pendingAssistantMessageId: 'pending-assistant',
      streamingMessageId: 'stream-run-123',
      cancelledMessage: 'Run cancelled. You can send another message when ready.',
      timestamp: 3
    })).toEqual([
      {
        ...messages[0],
        runId: 'run-123'
      },
      {
        id: 'stream-run-123',
        role: 'assistant',
        content: 'Run cancelled. You can send another message when ready.',
        runId: 'run-123',
        timestamp: 3
      }
    ]);
  });
});

describe('replaceCancelledRunAssistantMessages', () => {
  it('replaces stale assistant content for a cancelled run with the cancellation message', () => {
    const messages: ChatMessage[] = [
      {
        id: 'user-message',
        role: 'user',
        content: 'Check the pods',
        timestamp: 1
      },
      {
        id: 'stale-assistant-message',
        role: 'assistant',
        runId: 'run-123',
        content: 'Stale generated content that arrived after cancel.',
        timestamp: 2,
        approval: {
          id: 'approval-1',
          runId: 'run-123',
          action: 'Run restart_workload',
          toolName: 'restart_workload',
          arguments: {},
          status: 'approved'
        }
      },
      {
        id: 'stale-rejected-approval-message',
        role: 'assistant',
        runId: 'run-123',
        content: '',
        timestamp: 3,
        approval: {
          id: 'approval-2',
          runId: 'run-123',
          action: 'Run scale_workload',
          toolName: 'scale_workload',
          arguments: {},
          status: 'rejected'
        }
      },
      {
        id: 'other-assistant-message',
        role: 'assistant',
        runId: 'run-older',
        content: 'Earlier result.',
        timestamp: 4
      }
    ];

    expect(replaceCancelledRunAssistantMessages(
      messages,
      'run-123',
      'Run cancelled. You can send another message when ready.',
      5
    )).toEqual([
      messages[0],
      {
        id: 'stale-assistant-message',
        role: 'assistant',
        content: 'Run cancelled. You can send another message when ready.',
        runId: 'run-123',
        timestamp: 5
      },
      messages[3]
    ]);
  });
});

describe('RUN_TERMINAL_WAIT_TIMEOUT_MS', () => {
  it('exceeds the default write approval timeout window', () => {
    expect(RUN_TERMINAL_WAIT_TIMEOUT_MS).toBeGreaterThan(300000);
  });
});
