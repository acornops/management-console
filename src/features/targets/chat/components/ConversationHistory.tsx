import React, { useEffect, useRef, useState } from 'react';
import { Bot, History, MessageSquare, Plus, Search, Trash2, X } from 'lucide-react';
import type { TFunction } from 'i18next';
import { AssistantNavStatusIndicator } from '@/app/AssistantNavStatusIndicator';
import type { AssistantNavStatus } from '@/app/assistantNavStatus';
import { Button } from '@acornops/ui';
import { CollectionResultSummary } from '@acornops/ui';
import { CollectionState } from '@acornops/ui';
import { CloseButton } from '@acornops/ui';
import { DataTableGridHeader, DataTableGridHeaderCell } from '@acornops/ui';
import { EmptyState } from '@acornops/ui';
import { InlineLoadingIndicator } from '@acornops/ui';
import { PageHeaderButton } from '@acornops/ui';
import { PageSearchInput } from '@acornops/ui';
import { SearchFilterFrame } from '@acornops/ui';
import { Tooltip } from '@acornops/ui';
import { ChatSession } from '@/types';
import { formatCompactRelativeTime, formatUserDateTime } from '@/utils/dateTime';

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
  return formatUserDateTime(timestamp, { fallback: '-', includeTimeZone: false });
}

export const CONVERSATION_HISTORY_LOADING_DELAY_MS = 350;
const conversationHistoryLedgerGridClass = 'grid-cols-[minmax(0,1fr)_12rem_12rem]';

export function scheduleConversationHistoryLoadingNotice(onShow: () => void): () => void {
  const timeoutId = globalThis.setTimeout(onShow, CONVERSATION_HISTORY_LOADING_DELAY_MS);
  return () => globalThis.clearTimeout(timeoutId);
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({ appName, sessions, activeSessionId, sessionAssistantStatuses = {}, isSessionsLoading, canDeleteSessions, canCreateSession = true, id, mode = 'panel', sessionOrigin = 'all', newChatUnavailableReason = '', onCreateSession, onSelectSession, onDeleteSessionClick, onSearchValueChange, onClose, searchValue, t }) => {
  const isPage = mode === 'page';
  const isInvestigations = sessionOrigin === 'auto_triage';
  const [showLoadingNotice, setShowLoadingNotice] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isInitialLoading = isSessionsLoading && sessions.length === 0;
  const normalizedSearchValue = searchValue.trim().toLocaleLowerCase();
  const scopedSessions = sessionOrigin === 'all' ? sessions : sessions.filter((session) => (session.origin || 'manual') === sessionOrigin);
  const visibleSessions = normalizedSearchValue ? scopedSessions.filter((session) => session.name.toLocaleLowerCase().includes(normalizedSearchValue)) : scopedSessions;
  const collectionPhase = isInitialLoading ? 'loading' : isSessionsLoading ? 'refreshing' : 'ready';
  const searchInputId = `${id || 'chat-history'}-discovery-search`;

  useEffect(() => {
    if (!isSessionsLoading) {
      setShowLoadingNotice(false);
      return;
    }
    return scheduleConversationHistoryLoadingNotice(() => setShowLoadingNotice(true));
  }, [isSessionsLoading]);

  return (
    <section id={id} aria-label={isPage ? t('chat.searchChats') : undefined} className={isPage ? 'stable-scrollbar-gutter h-full min-h-0 overflow-y-auto bg-ui-bg px-[var(--ao-route-padding-x)] custom-scrollbar' : 'contents'}>
      <div className={isPage ? 'w-full pb-[var(--ao-route-padding-y)]' : 'contents'}>
        <div className={isPage ? 'w-full shrink-0 pb-5 pt-6 lg:pb-6 lg:pt-8' : 'border-b border-ui-border p-4'}>
          {isPage ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <h1 className="type-route-title text-ui-text">{t('chat.chats')}</h1>
              <Tooltip content={newChatUnavailableReason} disabled={!newChatUnavailableReason} className="w-full sm:w-auto">
                <span className="inline-flex w-full sm:w-auto">
                  <PageHeaderButton type="button" variant="primary" onClick={onCreateSession} disabled={!canCreateSession} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {t('chat.newChat')}
                  </PageHeaderButton>
                </span>
              </Tooltip>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {isInvestigations ? <Bot className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" /> : <History className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />}
                  <h2 className="type-panel-title text-ui-text">{isInvestigations ? t('chat.investigations') : t('chat.chats')}</h2>
                </div>
                <p className="type-caption mt-1 truncate text-ui-text-muted">{t(isInvestigations ? 'chat.investigationsContext' : 'chat.historyContext', { name: appName })}</p>
              </div>
              {onClose && <CloseButton onClick={onClose} label={t('chat.closeHistory')} />}
            </div>
          )}
          {isPage && (
            <SearchFilterFrame
              search={
                <div className="relative min-w-0">
                  <label htmlFor={searchInputId} className="sr-only">
                    {t('chat.searchChats')}
                  </label>
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-text-muted" aria-hidden="true" />
                  <PageSearchInput
                    ref={searchInputRef}
                    id={searchInputId}
                    data-chat-history-search="true"
                    value={searchValue}
                    onChange={(event) => onSearchValueChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape' && searchValue) {
                        event.preventDefault();
                        onSearchValueChange('');
                      }
                    }}
                    placeholder={t('chat.searchChatsPlaceholder')}
                    className="w-full pl-11 pr-12 lg:w-full"
                  />
                  {searchValue && (
                    <Button
                      type="button"
                      variant="tertiary"
                      size="icon"
                      aria-label={t('common.clearSearch')}
                      onClick={() => {
                        onSearchValueChange('');
                        searchInputRef.current?.focus();
                      }}
                      className="absolute right-0 top-1/2 h-11 min-h-11 w-11 -translate-y-1/2 rounded-md hover:bg-ui-bg hover:text-ui-text focus-visible:ring-inset focus-visible:ring-offset-0"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              }
              resultSummary={<CollectionResultSummary>{t('chat.chatCount', { count: visibleSessions.length })}</CollectionResultSummary>}
              className="mt-5"
            />
          )}
        </div>

        <div className={isPage ? 'overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm' : 'contents'}>
          {isPage && (
            <DataTableGridHeader
              showAt="md"
              className={`${conversationHistoryLedgerGridClass} pr-16 lg:pr-20`}
              collectionState={{
                phase: collectionPhase,
                itemCount: visibleSessions.length
              }}
            >
              <DataTableGridHeaderCell>{t('chat.columns.chat')}</DataTableGridHeaderCell>
              <DataTableGridHeaderCell data-chat-history-column="started-by">{t('chat.columns.startedBy')}</DataTableGridHeaderCell>
              <DataTableGridHeaderCell data-chat-history-column="last-activity">{t('chat.columns.lastActivity')}</DataTableGridHeaderCell>
            </DataTableGridHeader>
          )}
          <CollectionState
            className={isPage ? 'w-full' : 'flex-1 overflow-y-auto custom-scrollbar'}
            phase={collectionPhase}
            itemCount={visibleSessions.length}
            filtered={Boolean(normalizedSearchValue)}
            loading={showLoadingNotice ? <InlineLoadingIndicator label={t('chat.loadingHistory')} className="mx-1 border-transparent bg-transparent px-2 py-3 type-caption" /> : null}
            filteredEmpty={
              isPage ? (
                <EmptyState icon={<Search aria-hidden="true" />} title={t('chat.noMatchingConversations')} description={t('chat.noMatchingConversationsBody')} />
              ) : (
                <div className="px-5 py-10 text-center">
                  <Search className="mx-auto mb-3 h-7 w-7 text-ui-border" aria-hidden="true" />
                  <p className="type-row-title text-ui-text">{t('chat.noMatchingConversations')}</p>
                  <p className="type-caption mt-1 text-ui-text-muted">{t('chat.noMatchingConversationsBody')}</p>
                </div>
              )
            }
            empty={
              isPage ? (
                <EmptyState icon={<MessageSquare aria-hidden="true" />} title={t('chat.noConversations')} description={t('chat.noConversationsBody')} />
              ) : (
                <div className="px-4 py-10 text-center">
                  {isInvestigations ? <Bot className="mx-auto mb-3 h-8 w-8 text-ui-border" /> : <MessageSquare className="mx-auto mb-3 h-8 w-8 text-ui-border" />}
                  <p className="type-caption type-emphasis text-ui-text-muted">{t(isInvestigations ? 'chat.noInvestigations' : 'chat.noConversations')}</p>
                </div>
              )
            }
            error={null}
            feedback={showLoadingNotice ? <span className="sr-only">{t('chat.loadingHistory')}</span> : null}
          >
            {visibleSessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const assistantStatus = sessionAssistantStatuses[session.id] || 'idle';
              const assistantStatusLabel = assistantStatus === 'idle' ? undefined : t(`app.aiAssistantStatus.${assistantStatus}`);
              const startedByLabel = session.createdByUser?.displayName || (session.origin === 'auto_triage' ? t('chat.acornOps') : t('common.unknown'));
              return (
                <div key={session.id} className={`group relative border-b border-ui-border transition-colors last:border-b-0 ${isActive ? (isPage ? 'bg-ui-surface' : 'bg-ui-bg') : isPage ? 'hover:bg-ui-surface' : 'hover:bg-ui-bg'}`}>
                  <Button
                    type="button"
                    variant="tertiary"
                    onClick={() => {
                      onSelectSession(session.id);
                      onClose?.();
                    }}
                    className={isPage ? `control-target ${conversationHistoryLedgerGridClass} flex w-full flex-col items-start gap-1 px-4 py-3 pr-16 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/25 sm:px-6 md:grid md:items-center md:gap-4 lg:px-8 lg:pr-20` : 'control-target flex w-full items-center gap-2.5 px-4 py-2 pr-16 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/25'}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    {isPage ? (
                      <>
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate type-body type-emphasis text-ui-text">{session.name}</span>
                          {session.origin === 'auto_triage' && (
                            <span className="inline-flex shrink-0 text-ui-text-muted" aria-label={t('chat.automaticInvestigation')} title={t('chat.automaticInvestigation')}>
                              <Bot className="h-3 w-3" aria-hidden="true" />
                            </span>
                          )}
                          <AssistantNavStatusIndicator status={assistantStatus} label={assistantStatusLabel} withTooltip={false} />
                        </span>
                        <span data-chat-history-column="started-by" className="hidden truncate type-caption text-ui-text-muted md:block">{startedByLabel}</span>
                        <span data-chat-history-column="last-activity" className="hidden whitespace-nowrap type-caption text-ui-text-muted md:block">{formatSessionTime(session.timestamp)}</span>
                        <span className="truncate type-caption text-ui-text-muted md:hidden">{startedByLabel} · {formatSessionTime(session.timestamp)}</span>
                      </>
                    ) : (
                      <>
                        {isInvestigations ? <Bot className={`h-4 w-4 shrink-0 ${isActive ? 'text-ui-text' : 'text-ui-text-muted'}`} /> : <History className={`h-4 w-4 shrink-0 ${isActive ? 'text-ui-text' : 'text-ui-text-muted'}`} />}
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="min-w-0 flex-1 truncate type-row-title text-ui-text" title={session.name}>{session.name}</p>
                            <AssistantNavStatusIndicator status={assistantStatus} label={assistantStatusLabel} withTooltip={false} />
                          </div>
                          <div className="mt-0.5 flex min-w-0 flex-nowrap items-center gap-x-1.5 overflow-hidden whitespace-nowrap type-caption leading-4">
                            {isInvestigations && assistantStatusLabel && <span>{assistantStatusLabel}</span>}
                            {isInvestigations && (session.automaticInvestigation?.scopeKind || session.automaticInvestigation?.scopeName) && <span className="type-micro-label max-w-full truncate font-mono">{[session.automaticInvestigation.scopeKind, session.automaticInvestigation.scopeName].filter(Boolean).join(':')}</span>}
                            {isInvestigations && (session.automaticInvestigation?.objectName || session.automaticInvestigation?.objectKind) && <span className="type-micro-label max-w-full truncate font-mono">{[session.automaticInvestigation.objectKind, session.automaticInvestigation.objectName].filter(Boolean).join('/')}</span>}
                            {isInvestigations && session.automaticInvestigation?.severity && <span>{t(`chat.issueSeverity.${session.automaticInvestigation.severity}`)}</span>}
                            <span title={formatSessionTime(session.timestamp)}>{formatCompactRelativeTime(session.timestamp)}</span>
                            {!isInvestigations && session.createdByUser?.displayName && (
                              <span className="inline-flex items-center gap-1.5">
                                <span aria-hidden="true" className="text-ui-text-muted/70">
                                  ·
                                </span>
                                <span>{session.createdByUser.displayName}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </Button>
                  {canDeleteSessions && (
                    <Button type="button" variant="dangerIcon" onClick={() => onDeleteSessionClick(session.id)} className={`control-target absolute top-1/2 -translate-y-1/2 rounded-md p-1 opacity-0 transition-[color,background-color,border-color,opacity] group-hover:opacity-100 focus:opacity-100 ${isPage ? 'right-4 sm:right-6 lg:right-8' : 'right-3'}`} title={t('chat.deleteConversation')} aria-label={t('chat.deleteConversation')}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </CollectionState>
        </div>
      </div>
    </section>
  );
};
