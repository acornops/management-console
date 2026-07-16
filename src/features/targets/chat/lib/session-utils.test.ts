import { describe, expect, it, vi } from 'vitest';

import {
  buildChatFailureMessage,
  buildChatSetupFailureMessage,
  buildConversationTitleFromPrompt,
  filterMessagesByRunIds,
  formatRunFailureMessage,
  ensureFailedRunAssistantMessage,
  mapControlPlaneMessage,
  resolveAssistantTransientStatus,
  sanitizeChatMessages,
  upsertSession
} from '@/features/targets/chat/lib/session-utils';
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
      clientMessageId: 'client-msg-1',
      createdAt: '2026-01-02T03:04:05.000Z'
    });

    expect(mapped).toEqual({
      id: 'msg-1',
      role: 'assistant',
      content: 'Hello operator',
      runId: 'run-1',
      clientMessageId: 'client-msg-1',
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

  it('filters messages for suppressed run ids', () => {
    const messages: ChatMessage[] = [
      { id: 'old-user', role: 'user', content: 'Check pods', runId: 'run-old', timestamp: 1 },
      { id: 'old-assistant', role: 'assistant', content: 'Run cancelled.', runId: 'run-old', timestamp: 2 },
      { id: 'new-user', role: 'user', content: 'Check pods again', runId: 'run-new', timestamp: 3 },
      { id: 'new-assistant', role: 'assistant', content: '', runId: 'run-new', timestamp: 4, transientStatus: 'pending_assistant' }
    ];

    expect(filterMessagesByRunIds(messages, new Set(['run-old']))).toEqual([
      messages[2],
      messages[3]
    ]);
  });

  it('builds stable conversation titles from the first prompt', () => {
    expect(buildConversationTitleFromPrompt('  How is   the target doing? ', 'Conversation abc123')).toBe(
      'How is the target doing?'
    );
    expect(buildConversationTitleFromPrompt('', 'Conversation abc123')).toBe('Conversation abc123');
    expect(buildConversationTitleFromPrompt('x'.repeat(80), 'Conversation abc123')).toBe(`${'x'.repeat(64)}...`);
  });

  it('drops stale blank assistant placeholders but keeps actionable and pending messages', () => {
    const messages: ChatMessage[] = [
      { id: 'user-1', role: 'user', content: 'Need help', timestamp: 1 },
      { id: 'assistant-blank', role: 'assistant', content: '   ', timestamp: 2 },
      {
        id: 'assistant-pending',
        role: 'assistant',
        content: '',
        timestamp: 3,
        transientStatus: 'pending_assistant'
      },
      {
        id: 'assistant-approval',
        role: 'assistant',
        content: '',
        timestamp: 4,
        approval: {
          id: 'approval-1',
          action: 'Run restart_workload',
          toolName: 'restart_workload',
          arguments: { namespace: 'default', name: 'api' }
        }
      }
    ];

    expect(sanitizeChatMessages(messages)).toEqual([messages[0], messages[2], messages[3]]);
  });

  it('dedupes assistant placeholders for the same run', () => {
    const messages: ChatMessage[] = [
      { id: 'user-1', role: 'user', content: 'Need help', runId: 'run-1', timestamp: 1 },
      {
        id: 'pending-run-1',
        role: 'assistant',
        content: '',
        runId: 'run-1',
        timestamp: 2,
        transientStatus: 'pending_assistant'
      },
      {
        id: 'stream-run-1',
        role: 'assistant',
        content: '',
        runId: 'run-1',
        timestamp: 3,
        transientStatus: 'pending_assistant'
      }
    ];

    expect(sanitizeChatMessages(messages)).toEqual([
      messages[0],
      {
        ...messages[2],
        timestamp: 3
      }
    ]);
  });

  it('prefers a durable assistant response over a pending placeholder for the same run', () => {
    const messages: ChatMessage[] = [
      { id: 'user-1', role: 'user', content: 'Need help', runId: 'run-1', timestamp: 1 },
      {
        id: 'stream-run-1',
        role: 'assistant',
        content: '',
        runId: 'run-1',
        timestamp: 2,
        transientStatus: 'pending_assistant'
      },
      {
        id: 'backend-assistant-1',
        role: 'assistant',
        content: 'The target is healthy.',
        runId: 'run-1',
        timestamp: 3
      }
    ];

    expect(sanitizeChatMessages(messages)).toEqual([
      messages[0],
      {
        ...messages[2],
        id: 'stream-run-1'
      }
    ]);
  });

  it('drops a pending trace placeholder once the same user turn has a real run placeholder', () => {
    const messages: ChatMessage[] = [
      { id: 'user-1', role: 'user', content: 'gg sia', runId: 'run-1', timestamp: 1 },
      {
        id: 'stream-run-1',
        role: 'assistant',
        content: '',
        runId: 'run-1',
        timestamp: 2,
        transientStatus: 'pending_assistant'
      },
      {
        id: 'pending-assistant',
        role: 'assistant',
        content: '',
        runId: 'pending-trace-1',
        timestamp: 3,
        transientStatus: 'pending_assistant'
      }
    ];

    expect(sanitizeChatMessages(messages)).toEqual([messages[0], messages[1]]);
  });

  it('keeps a pending trace placeholder until the backend run id is known', () => {
    const messages: ChatMessage[] = [
      { id: 'user-1', role: 'user', content: 'gg sia', timestamp: 1 },
      {
        id: 'pending-assistant',
        role: 'assistant',
        content: '',
        runId: 'pending-trace-1',
        timestamp: 2,
        transientStatus: 'pending_assistant'
      }
    ];

    expect(sanitizeChatMessages(messages)).toEqual(messages);
  });

  it('keeps a pending placeholder when early streamed content is only whitespace', () => {
    const messages: ChatMessage[] = [
      { id: 'user-1', role: 'user', content: 'Check pods', timestamp: 1 },
      {
        id: 'stream-run-1',
        role: 'assistant',
        content: '\n ',
        runId: 'run-1',
        timestamp: 2,
        transientStatus: 'pending_assistant'
      }
    ];

    expect(sanitizeChatMessages(messages)).toEqual(messages);
  });

  it('keeps pending assistant status until visible content or approval exists', () => {
    expect(resolveAssistantTransientStatus('')).toBe('pending_assistant');
    expect(resolveAssistantTransientStatus('\n ')).toBe('pending_assistant');
    expect(resolveAssistantTransientStatus('Response started')).toBeUndefined();
    expect(resolveAssistantTransientStatus('', {
      id: 'approval-1',
      action: 'Run restart_workload',
      toolName: 'restart_workload',
      arguments: {}
    })).toBeUndefined();
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

  it('builds a setup failure message without implying a run completed', () => {
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(1234);

    try {
      const message = buildChatSetupFailureMessage('Add an API key in AI Settings.', 'run-9');

      expect(message.role).toBe('assistant');
      expect(message.runId).toBe('run-9');
      expect(message.content).toBe('Add an API key in AI Settings.');
      expect(message.content).not.toContain('I could not complete the troubleshooting run.');
      expect(message.timestamp).toBe(1234);
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it('adds one stable assistant failure message when a failed run has no response', () => {
    const messages: ChatMessage[] = [
      { id: 'user-1', role: 'user', content: 'Check pods', runId: 'run-1', timestamp: 1 }
    ];
    const run = {
      id: 'run-1',
      status: 'failed',
      endedAt: '2026-07-01T02:03:04.000Z',
      errorCode: 'OPENAI_ERROR',
      errorMessage: 'Provider temporarily unavailable'
    } as const;

    const restored = ensureFailedRunAssistantMessage(messages, run);
    const restoredAgain = ensureFailedRunAssistantMessage(restored, run);

    expect(restored).toEqual([
      messages[0],
      expect.objectContaining({
        id: 'failed-run-1',
        role: 'assistant',
        runId: 'run-1'
      })
    ]);
    expect(restored[1].content).toContain('OpenAI is temporarily unavailable');
    expect(restored[1].timestamp).toBe(Date.parse('2026-07-01T02:03:04.000Z'));
    expect(restoredAgain).toBe(restored);
  });

  it('does not replace existing assistant content or add failures to successful runs', () => {
    const messages: ChatMessage[] = [
      { id: 'user-1', role: 'user', content: 'Check pods', runId: 'run-1', timestamp: 1 },
      { id: 'assistant-1', role: 'assistant', content: 'Partial diagnostic output.', runId: 'run-1', timestamp: 2 }
    ];

    expect(ensureFailedRunAssistantMessage(messages, {
      id: 'run-1', status: 'failed', errorMessage: 'Provider failed'
    })).toBe(messages);
    expect(ensureFailedRunAssistantMessage(messages.slice(0, 1), {
      id: 'run-1', status: 'completed'
    })).toEqual(messages.slice(0, 1));
  });

  it('normalizes provider rate limit failures with retry guidance', () => {
    const message = formatRunFailureMessage(
      'rate_limit',
      '{"message":"429 Too Many Requests: retry in 1.2s because rate limit exceeded"}'
    );

    expect(message).toContain('LLM provider rate limit reached (rate_limit).');
    expect(message).toContain('Retry after about 2 seconds.');
  });

  it('normalizes ambiguous provider failures without blaming credentials', () => {
    expect(formatRunFailureMessage('OPENAI_ERROR', 'Provider request failed')).toContain('choose another model');
    expect(formatRunFailureMessage('OPENAI_ERROR', 'Provider request failed')).not.toContain('rotate');
    expect(formatRunFailureMessage('ANTHROPIC_ERROR', 'Provider temporarily unavailable')).toContain(
      'Anthropic is temporarily unavailable'
    );
  });

  it('shows targeted recovery only for conservatively classified provider failures', () => {
    expect(formatRunFailureMessage('MODEL_UNAVAILABLE', 'Selected model is unavailable')).toBe(
      'This model is currently unavailable. Choose another model and retry.'
    );
    const providerConfigurationMessage = formatRunFailureMessage(
      'PROVIDER_AUTH_INVALID',
      'Provider authentication failed'
    );
    expect(providerConfigurationMessage).toContain('workspace administrator');
    expect(providerConfigurationMessage).not.toContain('credentials');
    expect(providerConfigurationMessage).not.toContain('key');
    expect(formatRunFailureMessage('PROVIDER_RATE_LIMITED', 'Provider rate limit reached')).toContain(
      'Retry shortly'
    );
    expect(formatRunFailureMessage('PROVIDER_UNAVAILABLE', 'Provider temporarily unavailable')).toContain(
      'temporarily unavailable'
    );
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
