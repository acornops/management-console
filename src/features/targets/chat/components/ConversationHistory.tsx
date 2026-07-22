import React, { useEffect, useState } from 'react';
import { History, MessageSquare, Plus, Search, Trash2 } from 'lucide-react';
import type { TFunction } from 'i18next';
import { AssistantNavStatusIndicator } from '@/app/AssistantNavStatusIndicator';
import type { AssistantNavStatus } from '@/app/assistantNavStatus';
import { Button } from '@/components/common/Button';
import { CollectionState } from '@/components/common/CollectionState';
import { CloseButton } from '@/components/common/ComponentVocabulary';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { PageSearchInput } from '@/components/common/PageSearchInput';
import { Tooltip } from '@/components/common/Tooltip';
import { ChatSession } from '@/types';
import { formatUserDateTime } from '@/utils/dateTime';

interface ConversationHistoryProps {
  appName: string;
  sessions: ChatSession[];
  activeSessionId: string | null;
  sessionAssistantStatuses?: Record<string, AssistantNavStatus>;
  isSessionsLoading: boolean;
  canDeleteSessions: boolean;
  canCreateSession?: boolean;
  id?: string;
  mode?: 'page' | 'panel';
  newChatUnavailableReason?: string;
  onCreateSession?: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSessionClick: (sessionId: string) => void;
  onSearchValueChange: (value: string) => void;
  onClose?: () => void;
  searchValue: string;
  t: TFunction;
}

function formatSessionTime(timestamp: number): string {
  return formatUserDateTime(timestamp, { fallback: '-' });
}

function isRecentSession(timestamp: number): boolean {
  return Date.now() - timestamp <= 5 * 60 * 1000;
}

export const CONVERSATION_HISTORY_LOADING_DELAY_MS = 350;

export function scheduleConversationHistoryLoadingNotice(onShow: () => void): () => void {
  const timeoutId = globalThis.setTimeout(onShow, CONVERSATION_HISTORY_LOADING_DELAY_MS);
  return () => globalThis.clearTimeout(timeoutId);
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  appName,
  sessions,
  activeSessionId,
  sessionAssistantStatuses = {},
  isSessionsLoading,
  canDeleteSessions,
  canCreateSession = true,
  id,
  mode = 'panel',
  newChatUnavailableReason = '',
  onCreateSession,
  onSelectSession,
  onDeleteSessionClick,
  onSearchValueChange,
  onClose,
  searchValue,
  t
}) => {
  const isPage = mode === 'page';
  const [showLoadingNotice, setShowLoadingNotice] = useState(false);
  const isInitialLoading = isSessionsLoading && sessions.length === 0;
  const normalizedSearchValue = searchValue.trim().toLocaleLowerCase();
  const visibleSessions = normalizedSearchValue
    ? sessions.filter((session) => session.name.toLocaleLowerCase().includes(normalizedSearchValue))
    : sessions;

  useEffect(() => {
    if (!isSessionsLoading) {
      setShowLoadingNotice(false);
      return;
    }
    return scheduleConversationHistoryLoadingNotice(() => setShowLoadingNotice(true));
  }, [isSessionsLoading]);

  return (
    <section
      id={id}
      aria-label={isPage ? t('chat.searchChats') : undefined}
      className={isPage ? 'flex h-full min-h-0 flex-col bg-ui-bg px-4 sm:px-6 lg:px-10' : 'contents'}
    >
      <div className={isPage ? 'mx-auto w-full max-w-3xl shrink-0 pb-5 pt-6 lg:pb-6 lg:pt-8' : 'border-b border-ui-border p-4'}>
        {isPage ? (
          <div className="flex items-center justify-between gap-4">
            <h1 className="type-route-title text-ui-text">{t('chat.chats')}</h1>
            <Tooltip content={newChatUnavailableReason} disabled={!newChatUnavailableReason}>
              <span className="inline-flex">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={onCreateSession}
                  disabled={!canCreateSession}
                  className="whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {t('chat.newChat')}
                </Button>
              </span>
            </Tooltip>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
                <h2 className="type-panel-title text-ui-text">{t('chat.chats')}</h2>
              </div>
              <p className="type-caption mt-1 truncate text-ui-text-muted">{t('chat.historyContext', { name: appName })}</p>
            </div>
            {onClose && (
              <CloseButton onClick={onClose} label={t('chat.closeHistory')} />
            )}
          </div>
        )}
        {isPage && (
          <div className="relative mt-5">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ui-text-muted" aria-hidden="true" />
            <PageSearchInput
              data-chat-history-search="true"
              value={searchValue}
              onChange={(event) => onSearchValueChange(event.target.value)}
              aria-label={t('chat.searchChats')}
              placeholder={t('chat.searchChatsPlaceholder')}
              className="w-full pl-9 lg:w-full"
            />
          </div>
        )}
      </div>

      <CollectionState
        className={isPage ? 'mx-auto w-full max-w-3xl flex-1 overflow-y-auto custom-scrollbar' : 'flex-1 overflow-y-auto custom-scrollbar'}
        phase={isInitialLoading ? 'loading' : isSessionsLoading ? 'refreshing' : 'ready'}
        itemCount={visibleSessions.length}
        filtered={Boolean(normalizedSearchValue)}
        loading={showLoadingNotice
          ? <InlineLoadingIndicator label={t('chat.loadingHistory')} className="mx-1 border-transparent bg-transparent px-2 py-3 text-xs" />
          : null}
        filteredEmpty={(
          <div className="px-5 py-10 text-center">
            <Search className="mx-auto mb-3 h-7 w-7 text-ui-border" aria-hidden="true" />
            <p className="type-row-title text-ui-text">{t('chat.noMatchingConversations')}</p>
            <p className="type-caption mt-1 text-ui-text-muted">{t('chat.noMatchingConversationsBody')}</p>
          </div>
        )}
        empty={(
          <div className="px-4 py-10 text-center">
            <MessageSquare className="mx-auto mb-3 h-8 w-8 text-ui-border" />
            <p className="text-xs font-semibold text-ui-text-muted">{t('chat.noConversations')}</p>
          </div>
        )}
        error={null}
        feedback={showLoadingNotice ? <span className="sr-only">{t('chat.loadingHistory')}</span> : null}
      >
        {visibleSessions.map((session) => {
          const isActive = session.id === activeSessionId;
          const assistantStatus = sessionAssistantStatuses[session.id] || 'idle';
          const assistantStatusLabel = assistantStatus === 'idle'
            ? undefined
            : t(`app.aiAssistantStatus.${assistantStatus}`);
          return (
            <div
              key={session.id}
              className={`group relative border-b border-ui-border transition-colors last:border-b-0 ${
                isActive
                  ? isPage ? 'bg-ui-surface' : 'bg-ui-bg'
                  : isPage ? 'hover:bg-ui-surface' : 'hover:bg-ui-bg'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  onSelectSession(session.id);
                  onClose?.();
                }}
                className={isPage
                  ? 'control-target grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-3 py-4 pr-16 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/25'
                  : 'control-target flex w-full items-start gap-3 px-4 py-3 pr-16 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/25'}
                aria-current={isActive ? 'true' : undefined}
              >
                {isPage ? (
                  <>
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ui-text">{session.name}</span>
                      <AssistantNavStatusIndicator
                        status={assistantStatus}
                        label={assistantStatusLabel}
                        withTooltip={false}
                      />
                    </span>
                    <span className="type-caption whitespace-nowrap text-ui-text-muted">{formatSessionTime(session.timestamp)}</span>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </button>
              {canDeleteSessions && (
                <button
                  type="button"
                  onClick={() => onDeleteSessionClick(session.id)}
                  className="control-target absolute right-3 top-3 rounded-md p-1 text-ui-text-muted opacity-0 transition-opacity hover:bg-ui-surface hover:text-status-danger-text group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                  title={t('chat.deleteConversation')}
                  aria-label={t('chat.deleteConversation')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </CollectionState>
    </section>
  );
};
