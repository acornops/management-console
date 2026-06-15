import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import { ConversationHistory } from '@/features/kubernetes-cluster-detail/components/detail/ConversationHistory';
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
  it('renders compact per-session assistant indicators instead of text-heavy live pills', () => {
    const markup = renderToStaticMarkup(
      <ConversationHistory
        appName="demo-cluster"
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
        t={t}
      />
    );

    expect(markup).toContain('aria-label="Assistant is working"');
    expect(markup).toContain('aria-label="Assistant needs approval"');
    expect(markup).toContain('aria-label="Assistant completed"');
    expect(markup).not.toContain('>Live<');
  });
});
