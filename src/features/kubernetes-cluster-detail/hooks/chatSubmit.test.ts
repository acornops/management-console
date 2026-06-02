import { describe, expect, it } from 'vitest';
import { ChatMessage } from '@/types';
import {
  preserveStreamingAssistantMessageId,
  RUN_TERMINAL_WAIT_TIMEOUT_MS
} from '@/features/kubernetes-cluster-detail/hooks/chatSubmit';
import { replaceCancelledRunAssistantMessages } from '@/features/kubernetes-cluster-detail/hooks/chatRunCancellation';

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

    expect(replaceCancelledRunAssistantMessages(
      messages,
      'run-123',
      'Run cancelled. You can send another message when ready.',
      4
    )).toEqual([
      messages[0],
      {
        id: 'stale-assistant-message',
        role: 'assistant',
        content: 'Run cancelled. You can send another message when ready.',
        runId: 'run-123',
        timestamp: 4
      },
      messages[2]
    ]);
  });
});

describe('RUN_TERMINAL_WAIT_TIMEOUT_MS', () => {
  it('exceeds the default write approval timeout window', () => {
    expect(RUN_TERMINAL_WAIT_TIMEOUT_MS).toBeGreaterThan(300000);
  });
});
