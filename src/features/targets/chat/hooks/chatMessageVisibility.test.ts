import { describe, expect, it } from 'vitest';
import { isInFlightAssistantMessage } from '@/features/targets/chat/hooks/chatMessageVisibility';
import type { ChatMessage } from '@/types';

const message = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: 'message-1',
  role: 'assistant',
  content: '',
  timestamp: 1,
  ...overrides
});

describe('chat message visibility', () => {
  it('keeps local pending placeholders visible while a run starts', () => {
    expect(isInFlightAssistantMessage(message({ id: 'pending-1' }), true, {})).toBe(true);
    expect(isInFlightAssistantMessage(message({ id: 'stream-1' }), false, {})).toBe(false);
  });

  it('keeps trace-backed placeholders visible only while their trace is active', () => {
    expect(isInFlightAssistantMessage(message({ runId: 'run-1' }), false, {
      'run-1': { runId: 'run-1', status: 'running', steps: [], toolCalls: [] }
    })).toBe(true);
    expect(isInFlightAssistantMessage(message({ runId: 'run-1' }), false, {
      'run-1': { runId: 'run-1', status: 'completed', steps: [], toolCalls: [] }
    })).toBe(false);
  });

  it('does not treat non-empty assistant messages as placeholders', () => {
    expect(isInFlightAssistantMessage(message({ content: 'Done', runId: 'run-1' }), true, {
      'run-1': { runId: 'run-1', status: 'running', steps: [], toolCalls: [] }
    })).toBe(false);
  });
});
