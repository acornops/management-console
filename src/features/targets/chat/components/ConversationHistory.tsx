import React, { useEffect, useState } from 'react';
import { Bot, History, MessageSquare, Plus, Search, Trash2 } from 'lucide-react';
import type { TFunction } from 'i18next';
import { AssistantNavStatusIndicator } from '@/app/AssistantNavStatusIndicator';
import type { AssistantNavStatus } from '@/app/assistantNavStatus';
import { Button } from '@acornops/ui';
import { CollectionState } from '@acornops/ui';
import { CloseButton } from '@acornops/ui';
import { InlineLoadingIndicator } from '@acornops/ui';
import { PageSearchInput } from '@acornops/ui';
import { Tooltip } from '@acornops/ui';
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
  sessionOrigin?: 'all' | 'manual' | 'auto_triage';
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
  sessionOrigin = 'all',
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
  const isInvestigations = sessionOrigin === 'auto_triage';
  const [showLoadingNotice, setShowLoadingNotice] = useState(false);
  const isInitialLoading = isSessionsLoading && sessions.length === 0;
  const normalizedSearchValue = searchValue.trim().toLocaleLowerCase();
  const scopedSessions = sessionOrigin === 'all'
    ? sessions
    : sessions.filter((session) => (session.origin || 'manual') === sessionOrigin);
  const visibleSessions = normalizedSearchValue
    ? scopedSessions.filter((session) => session.name.toLocaleLowerCase().includes(normalizedSearchValue))
    : scopedSessions;

  useEffect(() => {
    if (!isSessionsLoading) {
      setShowLoadingNotice(false);
      return;
    }
    return scheduleConversationHistoryLoadingNotice(() => setShowLoadingNotice(true));
  }, [isSessionsLoading]);

  return (
    <section id={id} aria-label={isPage ? t('chat.searchChats') : undefined} className={isPage ? 'flex h-full min-h-0 flex-col bg-ui-bg px-[var(--ao-route-padding-x)]' : 'contents'}>
      <div className={isPage ? 'mx-auto w-full max-w-3xl shrink-0 pb-5 pt-6 lg:pb-6 lg:pt-8' : 'border-b border-ui-border p-4'}>
        {isPage ? (
          <div className="flex items-center justify-between gap-4">
            <h1 className="type-route-title text-ui-text">{t('chat.chats')}</h1>
            <Tooltip content={newChatUnavailableReason} disabled={!newChatUnavailableReason}>
              <span className="inline-flex">
                <Button type="button" variant="primary" size="sm" onClick={onCreateSession} disabled={!canCreateSession} className="whitespace-nowrap">
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
                {isInvestigations
                  ? <Bot className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
                  : <History className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />}
                <h2 className="type-panel-title text-ui-text">
                  {isInvestigations ? t('chat.investigations') : t('chat.chats')}
                </h2>
              </div>
              <p className="type-caption mt-1 truncate text-ui-text-muted">
                {t(isInvestigations ? 'chat.investigationsContext' : 'chat.historyContext', { name: appName })}
              </p>
            </div>
            {onClose && <CloseButton onClick={onClose} label={t('chat.closeHistory')} />}
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
        loading={showLoadingNotice ? <InlineLoadingIndicator label={t('chat.loadingHistory')} className="mx-1 border-transparent bg-transparent px-2 py-3 type-caption" /> : null}
        filteredEmpty={
          <div className="px-5 py-10 text-center">
            <Search className="mx-auto mb-3 h-7 w-7 text-ui-border" aria-hidden="true" />
            <p className="type-row-title text-ui-text">{t('chat.noMatchingConversations')}</p>
            <p className="type-caption mt-1 text-ui-text-muted">{t('chat.noMatchingConversationsBody')}</p>
          </div>
        }
        empty={
          <div className="px-4 py-10 text-center">
            {isInvestigations
              ? <Bot className="mx-auto mb-3 h-8 w-8 text-ui-border" />
              : <MessageSquare className="mx-auto mb-3 h-8 w-8 text-ui-border" />}
            <p className="type-caption type-emphasis text-ui-text-muted">
              {t(isInvestigations ? 'chat.noInvestigations' : 'chat.noConversations')}
            </p>
          </div>
        }
        error={null}
        feedback={showLoadingNotice ? <span className="sr-only">{t('chat.loadingHistory')}</span> : null}
      >
        {visibleSessions.map((session) => {
          const isActive = session.id === activeSessionId;
          const assistantStatus = sessionAssistantStatuses[session.id] || 'idle';
          const assistantStatusLabel = assistantStatus === 'idle' ? undefined : t(`app.aiAssistantStatus.${assistantStatus}`);
          return (
            <div
              key={session.id}
              className={`group relative border-b border-ui-border transition-colors last:border-b-0 ${
                isActive ? (isPage ? 'bg-ui-surface' : 'bg-ui-bg') : isPage ? 'hover:bg-ui-surface' : 'hover:bg-ui-bg'
              }`}
            >
              <Button
                type="button"
                variant="tertiary"
                onClick={() => {
                  onSelectSession(session.id);
                  onClose?.();
                }}
                className={
                  isPage
                    ? 'control-target grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-3 py-4 pr-16 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/25'
                    : 'control-target flex w-full items-start gap-3 px-4 py-3 pr-16 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/25'
                }
                aria-current={isActive ? 'true' : undefined}
              >
                {isPage ? (
                  <>
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate type-body type-emphasis text-ui-text">{session.name}</span>
                      {session.origin === 'auto_triage' && (
                        <span
                          className="inline-flex shrink-0 text-ui-text-muted"
                          aria-label={t('chat.automaticInvestigation')}
                          title={t('chat.automaticInvestigation')}
                        >
                          <Bot className="h-3 w-3" aria-hidden="true" />
                        </span>
                      )}
                      <AssistantNavStatusIndicator status={assistantStatus} label={assistantStatusLabel} withTooltip={false} />
                    </span>
                    <span className="type-caption whitespace-nowrap text-ui-text-muted">{formatSessionTime(session.timestamp)}</span>
                  </>
                ) : (
                  <>
                    {isInvestigations
                      ? <Bot className={`mt-0.5 h-4 w-4 shrink-0 ${isActive ? 'text-ui-text' : 'text-ui-text-muted'}`} />
                      : <History className={`mt-0.5 h-4 w-4 shrink-0 ${isActive ? 'text-ui-text' : 'text-ui-text-muted'}`} />}
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="min-w-0 flex-1 truncate type-body type-emphasis text-ui-text">{session.name}</p>
                        <AssistantNavStatusIndicator status={assistantStatus} label={assistantStatusLabel} withTooltip={false} />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 type-caption">
                        {isInvestigations && assistantStatusLabel && <span>{assistantStatusLabel}</span>}
                        {isInvestigations && (session.automaticInvestigation?.scopeKind || session.automaticInvestigation?.scopeName) && (
                          <span className="type-micro-label max-w-full truncate font-mono">
                            {[
                              session.automaticInvestigation.scopeKind,
                              session.automaticInvestigation.scopeName
                            ].filter(Boolean).join(':')}
                          </span>
                        )}
                        {isInvestigations && (session.automaticInvestigation?.objectName || session.automaticInvestigation?.objectKind) && (
                          <span className="type-micro-label max-w-full truncate font-mono">
                            {[
                              session.automaticInvestigation.objectKind,
                              session.automaticInvestigation.objectName
                            ].filter(Boolean).join('/')}
                          </span>
                        )}
                        {isInvestigations && session.automaticInvestigation?.severity && (
                          <span>{t(`chat.issueSeverity.${session.automaticInvestigation.severity}`)}</span>
                        )}
                        <span>{formatSessionTime(session.timestamp)}</span>
                        {!isInvestigations && session.createdByUser?.displayName && (
                          <>
                            <span aria-hidden="true" className="text-ui-text-muted/70">
                              ·
                            </span>
                            <span>{session.createdByUser.displayName}</span>
                          </>
                        )}
                        {isRecentSession(session.timestamp) && (
                          <span className="rounded border border-ui-border bg-ui-surface px-1.5 py-0.5 text-ui-text-muted">
                            {t('chat.recent')}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </Button>
              {canDeleteSessions && (
                <Button
                  type="button"
                  variant="tertiary"
                  onClick={() => onDeleteSessionClick(session.id)}
                  className="control-target absolute right-3 top-3 rounded-md p-1 text-ui-text-muted opacity-0 transition-opacity hover:bg-ui-surface hover:text-status-danger-text group-hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                  title={t('chat.deleteConversation')}
                  aria-label={t('chat.deleteConversation')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        })}
      </CollectionState>
    </section>
  );
};
