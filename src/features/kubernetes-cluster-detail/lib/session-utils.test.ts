import { describe, expect, it, vi } from 'vitest';

import {
  buildChatFailureMessage,
  buildConversationTitleFromPrompt,
  formatRunFailureMessage,
  mapControlPlaneMessage,
  sanitizeChatMessages,
  upsertSession
} from '@/features/kubernetes-cluster-detail/lib/session-utils';
import { ChatMessage, ChatSession } from '@/types';

describe('session-utils', () => {
  it('maps control-plane messages into chat messages', () => {
    const mapped = mapControlPlaneMessage({
      id: 'msg-1',
      sessionId: 'session-1',
      runId: 'run-1',
      role: 'assistant',
      kind: 'assistant_final',
      content: 'Hello operator',
      createdAt: '2026-01-02T03:04:05.000Z'
    });

    expect(mapped).toEqual({
      id: 'msg-1',
      role: 'assistant',
      content: 'Hello operator',
      runId: 'run-1',
      timestamp: Date.parse('2026-01-02T03:04:05.000Z')
    });
  });

  it('appends new sessions and replaces existing ones by id', () => {
    const original: ChatSession[] = [{ id: 'session-1', name: 'One', messages: [], timestamp: 1 }];
    const appended = upsertSession(original, { id: 'session-2', name: 'Two', messages: [], timestamp: 2 });
    const replaced = upsertSession(appended, { id: 'session-1', name: 'Updated', messages: [], timestamp: 3 });

    expect(appended.map((session) => session.id)).toEqual(['session-1', 'session-2']);
    expect(replaced.find((session) => session.id === 'session-1')?.name).toBe('Updated');
  });

  it('builds stable conversation titles from the first prompt', () => {
    expect(buildConversationTitleFromPrompt('  How is   the cluster doing? ', 'Conversation abc123')).toBe(
      'How is the cluster doing?'
    );
    expect(buildConversationTitleFromPrompt('', 'Conversation abc123')).toBe('Conversation abc123');
    expect(buildConversationTitleFromPrompt('x'.repeat(80), 'Conversation abc123')).toBe(`${'x'.repeat(64)}...`);
  });

  it('drops blank assistant placeholders but keeps actionable messages', () => {
    const messages: ChatMessage[] = [
      { id: 'user-1', role: 'user', content: 'Need help', timestamp: 1 },
      { id: 'assistant-blank', role: 'assistant', content: '   ', timestamp: 2 },
      {
        id: 'assistant-approval',
        role: 'assistant',
        content: '',
        timestamp: 3,
        approval: {
          id: 'approval-1',
          action: 'Run restart_workload',
          toolName: 'restart_workload',
          arguments: { namespace: 'default', name: 'api' }
        }
      }
    ];

    expect(sanitizeChatMessages(messages)).toEqual([messages[0], messages[2]]);
  });

  it('builds a user-facing failure message envelope', () => {
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(1234);

    try {
      const message = buildChatFailureMessage('Backend exploded.', 'run-9');

      expect(message.role).toBe('assistant');
      expect(message.runId).toBe('run-9');
      expect(message.content).toContain('I could not complete the troubleshooting run.');
      expect(message.content).toContain('Backend exploded.');
      expect(message.timestamp).toBe(1234);
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it('normalizes provider rate limit failures with retry guidance', () => {
    const message = formatRunFailureMessage(
      'rate_limit',
      '{"message":"429 Too Many Requests: retry in 1.2s because rate limit exceeded"}'
    );

    expect(message).toContain('LLM provider rate limit reached (rate_limit).');
    expect(message).toContain('Retry after about 2 seconds.');
  });

  it('rewrites unsupported temperature and token parameter failures', () => {
    expect(
      formatRunFailureMessage(undefined, 'temperature only the default (1) value is supported by this model')
    ).toContain('Selected model only supports default temperature.');

    expect(
      formatRunFailureMessage(
        undefined,
        'unsupported parameter: max_tokens; use max_completion_tokens because max_tokens is not supported with this model'
      )
    ).toContain('Selected model requires a different output-token parameter.');
  });

  it('falls back to provider text or a default message when no special handling applies', () => {
    expect(formatRunFailureMessage(undefined, '{"message":"plain backend failure"}')).toBe('plain backend failure');
    expect(formatRunFailureMessage(undefined, '')).toBe('No additional details were provided.');
  });
});
