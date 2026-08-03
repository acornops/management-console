import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import { CONVERSATION_HISTORY_LOADING_DELAY_MS, ConversationHistory, scheduleConversationHistoryLoadingNotice } from '@/features/targets/chat/components/ConversationHistory';
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
        sessions={[session({ id: 'running', name: 'Running check' }), session({ id: 'review', name: 'Needs approval' }), session({ id: 'done', name: 'Completed check' })]}
        activeSessionId={null}
        sessionAssistantStatuses={{
          running: 'working',
          review: 'review',
          done: 'done'
        }}
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
        sessions={[session({ id: 'rollout', name: 'Check rollout' }), session({ id: 'ingress', name: 'Inspect ingress' })]}
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
        canDeleteSessions
        onSelectSession={() => undefined}
        onDeleteSessionClick={() => undefined}
        onSearchValueChange={() => undefined}
        searchValue=""
        t={t}
      />
    );

    expect(markup).toContain('Target context: demo-target');
    expect(markup).not.toContain('data-chat-history-search="true"');
    expect(markup).toContain('py-2 pr-16');
    expect(markup).toContain('flex-1 truncate type-row-title');
    expect(markup).not.toContain('flex-1 break-words');
    expect(markup).toContain('mt-0.5 flex min-w-0 flex-nowrap items-center gap-x-1.5 overflow-hidden whitespace-nowrap type-caption leading-4');
    expect(markup).toContain('absolute top-1/2 -translate-y-1/2');
    expect(markup).toContain('right-3');
    expect(markup).toContain('hover:border-status-danger/30 hover:bg-status-danger-soft hover:text-status-danger-text');
    expect(markup).toContain('active:border-status-danger/30 active:bg-status-danger-soft active:text-status-danger-text');
    expect(markup).not.toContain('chat.recent');
    expect(markup).not.toContain('GMT');
  });

  it('keeps manual chats and automatic investigations in separate panel views', () => {
    const sessions = [
      session({ id: 'manual', name: 'Human diagnosis', origin: 'manual' }),
      session({
        id: 'automatic',
        name: 'CrashLoopBackOff in payments',
        origin: 'auto_triage',
        automaticInvestigation: {
          issueId: 'issue-1',
          lifecycleVersion: 1,
          severity: 'warning',
          scopeKind: 'namespace',
          scopeName: 'payments',
          objectKind: 'Deployment',
          objectName: 'api',
          writeMode: 'approval_required',
          effectiveToolMode: 'read_write',
          confirmationRequiredForWrite: true
        }
      })
    ];

    const chatsMarkup = renderToStaticMarkup(
      <ConversationHistory
        appName="demo-target"
        sessions={sessions}
        sessionOrigin="manual"
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
    const investigationsMarkup = renderToStaticMarkup(
      <ConversationHistory
        appName="demo-target"
        sessions={sessions}
        sessionOrigin="auto_triage"
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

    expect(chatsMarkup).toContain('Human diagnosis');
    expect(chatsMarkup).not.toContain('CrashLoopBackOff');
    expect(investigationsMarkup).toContain('CrashLoopBackOff');
    expect(investigationsMarkup).not.toContain('Human diagnosis');
    expect(investigationsMarkup).toContain('namespace:payments');
    expect(investigationsMarkup).toContain('Deployment/api');
    expect(investigationsMarkup).toContain('chat.issueSeverity.warning');
    expect(investigationsMarkup).not.toContain('chat.automatic<');
  });

  it('renders the Chats search as a full-page destination with New chat', () => {
    const markup = renderToStaticMarkup(
      <ConversationHistory
        id="chat-search-page"
        mode="page"
        appName="demo-target"
        sessions={[
          session({ id: 'rollout', name: 'Check rollout', createdByUser: { id: 'user-1', displayName: 'Dev User' } }),
          session({ id: 'ingress', name: 'Inspect ingress', createdByUser: { id: 'user-2', displayName: 'Platform Lead' } })
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
    expect(markup).toContain('data-page-header-action="true"');
    expect(markup).toContain('min-h-11');
    expect(markup).not.toContain('sm:min-h-9');
    expect(markup).not.toContain('max-w-[88rem]');
    expect(markup).not.toContain('mx-auto');
    expect(markup).toContain('data-search-filter-frame="true"');
    expect(markup).toContain('chat.columns.chat');
    expect(markup).toContain('chat.columns.startedBy');
    expect(markup).toContain('chat.columns.lastActivity');
    expect(markup).toContain('Dev User');
    expect(markup).toContain('Platform Lead');
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
