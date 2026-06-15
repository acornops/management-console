import React, { useEffect, useState } from 'react';
import { History, MessageSquare, Trash2 } from 'lucide-react';
import type { TFunction } from 'i18next';
import { AssistantNavStatusIndicator } from '@/app/AssistantNavStatusIndicator';
import type { AssistantNavStatus } from '@/app/assistantNavStatus';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { ChatSession } from '@/types';

interface ConversationHistoryProps {
  appName: string;
  sessions: ChatSession[];
  activeSessionId: string | null;
  sessionAssistantStatuses?: Record<string, AssistantNavStatus>;
  isSessionsLoading: boolean;
  canDeleteSessions: boolean;
  onSelectSession: (sessionId: string) => void;
  onDeleteSessionClick: (sessionId: string) => void;
  t: TFunction;
}

function formatSessionTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function isRecentSession(timestamp: number): boolean {
  return Date.now() - timestamp <= 5 * 60 * 1000;
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  appName,
  sessions,
  activeSessionId,
  sessionAssistantStatuses = {},
  isSessionsLoading,
  canDeleteSessions,
  onSelectSession,
  onDeleteSessionClick,
  t
}) => {
  const [showLoadingNotice, setShowLoadingNotice] = useState(false);
  const showInitialLoading = showLoadingNotice && sessions.length === 0;

  useEffect(() => {
    if (!isSessionsLoading) {
      setShowLoadingNotice(false);
      return;
    }
    const timeoutId = window.setTimeout(() => setShowLoadingNotice(true), 350);
    return () => window.clearTimeout(timeoutId);
  }, [isSessionsLoading]);

  return (
    <>
      <div className="border-b border-ui-border p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 shrink-0 text-ui-text-muted" />
            <h2 className="text-sm font-semibold text-ui-text">{t('chat.conversationHistory')}</h2>
          </div>
          <p className="mt-1 truncate text-xs font-medium text-ui-text-muted">{t('chat.historyContext', { name: appName })}</p>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3 custom-scrollbar">
        {showInitialLoading && (
          <InlineLoadingIndicator label={t('chat.loadingHistory')} className="mx-1 border-transparent bg-transparent px-2 py-3 text-xs" />
        )}
        {!showInitialLoading && sessions.length === 0 && (
          <div className="px-4 py-10 text-center">
            <MessageSquare className="mx-auto mb-3 h-8 w-8 text-ui-border" />
            <p className="text-xs font-semibold text-ui-text-muted">{t('chat.noConversations')}</p>
          </div>
        )}
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          const assistantStatus = sessionAssistantStatuses[session.id] || 'idle';
          const assistantStatusLabel = assistantStatus === 'idle'
            ? undefined
            : t(`app.aiAssistantStatus.${assistantStatus}`);
          return (
            <div
              key={session.id}
              className={`group relative rounded-md border transition-colors ${
                isActive
                  ? 'border-ui-text-muted/30 bg-ui-bg shadow-sm'
                  : 'border-transparent hover:border-ui-border hover:bg-ui-bg'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectSession(session.id)}
                className="flex w-full items-start gap-3 rounded-md p-3 pr-9 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                aria-current={isActive ? 'true' : undefined}
              >
                <History className={`mt-0.5 h-4 w-4 shrink-0 ${isActive ? 'text-ui-text' : 'text-ui-text-muted'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ui-text">{session.name}</p>
                    <AssistantNavStatusIndicator
                      status={assistantStatus}
                      label={assistantStatusLabel}
                      withTooltip={false}
                    />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-ui-text-muted">
                    <span>{formatSessionTime(session.timestamp)}</span>
                    {session.createdByUser?.displayName && (
                      <>
                        <span aria-hidden="true" className="text-ui-text-muted/70">·</span>
                        <span>{session.createdByUser.displayName}</span>
                      </>
                    )}
                    {isRecentSession(session.timestamp) && <span className="rounded border border-ui-border bg-ui-surface px-1.5 py-0.5 text-ui-text-muted">Recent</span>}
                  </div>
                </div>
              </button>
              {canDeleteSessions && (
                <button
                  type="button"
                  onClick={() => onDeleteSessionClick(session.id)}
                  className="absolute right-3 top-3 rounded-md p-1 text-ui-text-muted opacity-0 transition-opacity hover:bg-ui-surface hover:text-status-danger-text group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                  title={t('chat.deleteConversation')}
                  aria-label={t('chat.deleteConversation')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};
