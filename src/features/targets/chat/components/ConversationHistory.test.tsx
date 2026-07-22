import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import {
  CONVERSATION_HISTORY_LOADING_DELAY_MS,
  ConversationHistory,
  scheduleConversationHistoryLoadingNotice
} from '@/features/targets/chat/components/ConversationHistory';
import type { ChatSession } from '@/types';

const t = ((key: string, params?: Record<string, string>) => {
  if (key === 'chat.historyContext') return `Target context: ${params?.name || ''}`;
  if (key === 'app.aiAssistantStatus.working') return 'Assistant is working';
  if (key === 'app.aiAssistantStatus.review') return 'Assistant needs approval';
  if (key === 'app.aiAssistantStatus.done') return 'Assistant completed';
  return key;
}) as TFunction;

function session(overrides: Partial<ChatSession>): ChatSession {
  return {
    id: 'session-1',
    name: 'Check rollout',
    timestamp: Date.now() - 60_000,
    messages: [],
    ...overrides
  };
}

describe('ConversationHistory', () => {
  it('renders neither loading copy nor a false empty state during the debounce', () => {
    const markup = renderToStaticMarkup(
      <ConversationHistory
        appName="demo-target"
        sessions={[]}
        activeSessionId={null}
        isSessionsLoading
        canDeleteSessions={false}
        onSelectSession={() => undefined}
        onDeleteSessionClick={() => undefined}
        onSearchValueChange={() => undefined}
        searchValue=""
        t={t}
      />
    );

    expect(markup).toContain('aria-busy="true"');
    expect(markup).not.toContain('chat.loadingHistory');
    expect(markup).not.toContain('chat.noConversations');
  });

  it('delays the loading notice for 350 ms', () => {
    vi.useFakeTimers();
    try {
      const onShow = vi.fn();
      const cancel = scheduleConversationHistoryLoadingNotice(onShow);

      vi.advanceTimersByTime(CONVERSATION_HISTORY_LOADING_DELAY_MS - 1);
      expect(onShow).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(onShow).toHaveBeenCalledOnce();
      cancel();
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders compact per-session assistant indicators instead of text-heavy live pills', () => {
    const markup = renderToStaticMarkup(
      <ConversationHistory
        appName="demo-target"
        sessions={[
          session({ id: 'running', name: 'Running check' }),
          session({ id: 'review', name: 'Needs approval' }),
          session({ id: 'done', name: 'Completed check' })
        ]}
        activeSessionId={null}
        sessionAssistantStatuses={{ running: 'working', review: 'review', done: 'done' }}
        isSessionsLoading={false}
        canDeleteSessions={false}
        onSelectSession={() => undefined}
        onDeleteSessionClick={() => undefined}
        onSearchValueChange={() => undefined}
        searchValue=""
        t={t}
      />
    );

    expect(markup).toContain('aria-label="Assistant is working"');
    expect(markup).toContain('aria-label="Assistant needs approval"');
    expect(markup).toContain('aria-label="Assistant completed"');
    expect(markup).not.toContain('>Live<');
  });

  it('filters chats by name on the searchable page', () => {
    const markup = renderToStaticMarkup(
      <ConversationHistory
        mode="page"
        appName="demo-target"
        sessions={[
          session({ id: 'rollout', name: 'Check rollout' }),
          session({ id: 'ingress', name: 'Inspect ingress' })
        ]}
        activeSessionId={null}
        isSessionsLoading={false}
        canDeleteSessions={false}
        onSelectSession={() => undefined}
        onDeleteSessionClick={() => undefined}
        onSearchValueChange={() => undefined}
        searchValue="ingress"
        t={t}
      />
    );

    expect(markup).toContain('data-chat-history-search="true"');
    expect(markup).toContain('Inspect ingress');
    expect(markup).not.toContain('Check rollout');
  });

  it('keeps the compact history panel free of a redundant search field', () => {
    const markup = renderToStaticMarkup(
      <ConversationHistory
        appName="demo-target"
        sessions={[session({ name: 'Check rollout' })]}
        activeSessionId={null}
        isSessionsLoading={false}
        canDeleteSessions={false}
        onSelectSession={() => undefined}
        onDeleteSessionClick={() => undefined}
        onSearchValueChange={() => undefined}
        searchValue=""
        t={t}
      />
    );

    expect(markup).toContain('Target context: demo-target');
    expect(markup).not.toContain('data-chat-history-search="true"');
    expect(markup).toContain('px-4 py-3 pr-16');
  });

  it('renders the Chats search as a full-page destination with New chat', () => {
    const markup = renderToStaticMarkup(
      <ConversationHistory
        id="chat-search-page"
        mode="page"
        appName="demo-target"
        sessions={[
          session({ id: 'rollout', name: 'Check rollout' }),
          session({ id: 'ingress', name: 'Inspect ingress' })
        ]}
        activeSessionId="rollout"
        isSessionsLoading={false}
        canCreateSession
        canDeleteSessions={false}
        onCreateSession={() => undefined}
        onSelectSession={() => undefined}
        onDeleteSessionClick={() => undefined}
        onSearchValueChange={() => undefined}
        searchValue=""
        t={t}
      />
    );

    expect(markup).toContain('id="chat-search-page"');
    expect(markup).toContain('aria-label="chat.searchChats"');
    expect(markup).toContain('<h1');
    expect(markup).toContain('chat.chats');
    expect(markup).toContain('chat.newChat');
    expect(markup).toContain('max-w-3xl');
    expect(markup).toContain('Check rollout');
    expect(markup).toContain('Inspect ingress');
    expect(markup).not.toContain('Target context: demo-target');
  });

  it('shows a filtered empty state when no chats match', () => {
    const markup = renderToStaticMarkup(
      <ConversationHistory
        mode="page"
        appName="demo-target"
        sessions={[session({ name: 'Check rollout' })]}
        activeSessionId={null}
        isSessionsLoading={false}
        canDeleteSessions={false}
        onSelectSession={() => undefined}
        onDeleteSessionClick={() => undefined}
        onSearchValueChange={() => undefined}
        searchValue="ingress"
        t={t}
      />
    );

    expect(markup).toContain('chat.noMatchingConversations');
    expect(markup).not.toContain('Check rollout');
  });
});
