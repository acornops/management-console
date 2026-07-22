import { describe, expect, it } from 'vitest';

import { findReusableDraftSession } from '@/features/targets/chat/hooks/chatDraftSession';
import type { ChatSession } from '@/types';

function session(overrides: Partial<ChatSession>): ChatSession {
  return {
    id: 'session-1',
    name: 'Conversation',
    messages: [],
    timestamp: 1,
    ...overrides
  };
}

describe('findReusableDraftSession', () => {
  it('reuses an empty local draft instead of creating a duplicate', () => {
    const reusable = session({ id: 'draft-empty' });
    const sessions = [
      session({ id: 'persisted-empty', backendSessionId: 'backend-1' }),
      session({ id: 'draft-with-message', messages: [{ id: 'message-1', role: 'user', content: 'Existing context', timestamp: 2 }] }),
      reusable
    ];

    expect(findReusableDraftSession(sessions)).toBe(reusable);
  });

  it('requires a new draft when every conversation already has context', () => {
    expect(findReusableDraftSession([
      session({ id: 'persisted-empty', backendSessionId: 'backend-1' }),
      session({ id: 'draft-with-message', messages: [{ id: 'message-1', role: 'user', content: 'Existing context', timestamp: 2 }] })
    ])).toBeUndefined();
  });
});
