import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { History, Loader2, Maximize2, MessageSquare, Plus, Send, Square, X } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Tooltip } from '@/components/common/Tooltip';
import { ConversationHistory } from '@/features/kubernetes-cluster-detail/components/detail/ConversationHistory';
import { LiveRunTrace } from '@/features/kubernetes-cluster-detail/types';
import { AssistantTurn } from '@/features/kubernetes-cluster-detail/components/detail/views/AssistantTurn';
import { ChatComposerNotice } from '@/features/kubernetes-cluster-detail/components/detail/views/ChatComposerNotice';
import { ChatEmptyPrompt, ChatTranscriptLoadError, ChatTranscriptSkeleton } from '@/features/kubernetes-cluster-detail/components/detail/views/ChatTranscriptStates';
import { DeleteConversationDialog } from '@/features/kubernetes-cluster-detail/components/detail/views/DeleteConversationDialog';
import { UserMessageTurn } from '@/features/kubernetes-cluster-detail/components/detail/views/UserMessageTurn';
import type { TargetChatViewProps } from '@/features/kubernetes-cluster-detail/components/detail/views/TargetChatView.types';

const SUGGESTION_KEYS = ['chat.suggestions.podTermination', 'chat.suggestions.serviceDns', 'chat.suggestions.crashLooping', 'chat.suggestions.mcpConnectivity'];

const historyFocusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

function formatMessageTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}
function getFocusableHistoryElements(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(historyFocusableSelector)).filter((element) => {
    if (element.getAttribute('aria-hidden') === 'true' || element.hasAttribute('hidden')) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}
function getHistoryFocusWrapIndex(currentIndex: number, focusableCount: number, shiftKey: boolean): number | null {
  if (focusableCount <= 0) return null;
  if (currentIndex < 0) return shiftKey ? focusableCount - 1 : 0;
  if (shiftKey && currentIndex === 0) return focusableCount - 1;
  if (!shiftKey && currentIndex === focusableCount - 1) return 0;
  return null;
}

export const TargetChatView: React.FC<TargetChatViewProps> = ({
  target,
  descriptionKey,
  promptTitleKey,
  promptBodyKey,
  suggestionKeys,
  inputPlaceholderKey,
  noChatAccessKey,
  footerKey,
  footerNoAccessKey,
  canChat,
  isConversationOwner,
  conversationNotice,
  recentActivityWarning,
  canApproveWriteActions,
  canCancelRuns,
  canDeleteSessions,
  isRunActive,
  isSessionsLoading,
  isLoadingEarlierMessages,
  hasEarlierMessages,
  activeRunId,
  isCancellingRun,
  inputValue,
  sessions,
  activeSessionId,
  assistantMarkdownComponents,
  userMarkdownComponents,
  visibleMessages,
  runTracesByRunId,
  sessionAssistantStatuses = {},
  transcriptRef,
  onChatScroll,
  onLoadEarlierMessages,
  onInputChange,
  onSend,
  onEditLastUserMessage,
  onApprove,
  onReject,
  onSelectSession,
  onCreateSession,
  onDismissRecentActivityWarning,
  onOpenRecentActivitySession,
  onDeleteSession,
  onCancelRun,
  isInFlightAssistantPlaceholder,
  displayMode = 'full',
  onClose,
  onMaximize
}) => {
  const { t } = useTranslation();
  const cluster = target;
  const [traceExpandedByRunId, setTraceExpandedByRunId] = React.useState<Record<string, boolean>>({});
  const [deleteTargetSessionId, setDeleteTargetSessionId] = React.useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = React.useState<string | null>(null);
  const [deleteSessionError, setDeleteSessionError] = React.useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [editingMessageId, setEditingMessageId] = React.useState<string | null>(null);
  const [editingMessageValue, setEditingMessageValue] = React.useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = React.useState(false);
  const historyButtonRef = React.useRef<HTMLButtonElement>(null);
  const historyPanelRef = React.useRef<HTMLElement>(null);
  const historyPanelId = React.useId();
  const desktopHistoryPanelId = `${historyPanelId}-desktop`;
  const mobileHistoryPanelId = `${historyPanelId}-mobile`;

  const deleteTargetSession = React.useMemo(
    () => sessions.find((session) => session.id === deleteTargetSessionId) || null,
    [deleteTargetSessionId, sessions]
  );

  const canPost = canChat && isConversationOwner && !recentActivityWarning;
  const sendText = (text: string) => {
    if (!text.trim() || !canPost || isRunActive) return;
    void onSend(text);
  };
  const lastUserMessageIndex = React.useMemo(() => {
    for (let index = visibleMessages.length - 1; index >= 0; index -= 1) {
      if (visibleMessages[index].role === 'user') return index;
    }
    return -1;
  }, [visibleMessages]);
  const userTurnRunIdsByIndex = React.useMemo(() => {
    const runIdsByIndex = new Map<number, string | undefined>();
    let currentTurnRunId: string | undefined;
    for (let index = visibleMessages.length - 1; index >= 0; index -= 1) {
      const message = visibleMessages[index];
      if (message.role === 'user') {
        runIdsByIndex.set(index, message.runId || currentTurnRunId);
        currentTurnRunId = undefined;
        continue;
      }
      if (message.runId) {
        currentTurnRunId = message.runId;
      }
    }
    return runIdsByIndex;
  }, [visibleMessages]);
  const canCancelActiveRun = isRunActive && canCancelRuns && Boolean(activeRunId);
  const isPanel = displayMode === 'panel';
  const activeSession = sessions.find((session) => session.id === activeSessionId) || null;
  const title = activeSession && (activeSession.backendSessionId || activeSession.messages.length > 0) ? activeSession.name : t('chat.triageConsole');
  const isHydratingExistingConversation = Boolean(activeSession?.backendSessionId && activeSession.hydrated === false && visibleMessages.length === 0);
  const hasConversationLoadError = Boolean(activeSession?.backendSessionId && activeSession.messagesLoadFailed && visibleMessages.length === 0);
  const isLoadingInitialConversation = !activeSession && isSessionsLoading;
  const shouldShowTranscriptSkeleton = visibleMessages.length === 0 && !hasConversationLoadError && (isHydratingExistingConversation || isLoadingInitialConversation);
  const resolvedSuggestionKeys = suggestionKeys || SUGGESTION_KEYS;
  const resolvedDescriptionKey = descriptionKey || 'chat.description';
  const resolvedPromptTitleKey = promptTitleKey || 'chat.promptTitle';
  const resolvedPromptBodyKey = promptBodyKey || 'chat.promptBody';
  const resolvedInputPlaceholderKey = inputPlaceholderKey || 'chat.inputPlaceholder';
  const resolvedNoChatAccessKey = noChatAccessKey || 'chat.noChatAccess';
  const resolvedFooterKey = footerKey || 'chat.footer';
  const resolvedFooterNoAccessKey = footerNoAccessKey || 'chat.footerNoAccess';
  const composerActionLabel = isRunActive
    ? isCancellingRun
      ? t('chat.cancellingRun')
      : canCancelActiveRun
        ? t('chat.cancelRun')
        : t('chat.cancelWaiting')
    : t('chat.send');
  const newChatUnavailableReason = !canChat
    ? t(resolvedNoChatAccessKey)
    : '';
  const historyControlLabel = isHistoryOpen ? t('chat.hideHistory') : t('chat.showHistory');
  const panelWindowControls = (
    <div className="flex shrink-0 items-center gap-1">
      {onMaximize && (
        <Tooltip content={t('chat.fullscreen')}>
          <button
            type="button"
            onClick={onMaximize}
            className="rounded-lg p-2 text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
            aria-label={t('chat.fullscreen')}
          >
            <Maximize2 className="h-5 w-5" />
          </button>
        </Tooltip>
      )}
      {onClose && (
        <Tooltip content={t('app.close')}>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
            aria-label={t('app.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </Tooltip>
      )}
    </div>
  );

  const openDeleteSessionModal = (sessionId: string) => {
    if (!canDeleteSessions) return;
    setDeleteSessionError(null);
    setDeleteTargetSessionId(sessionId);
  };

  const selectSession = (sessionId: string) => {
    onSelectSession(sessionId);
  };

  const closeDeleteSessionModal = () => {
    if (deletingSessionId) return;
    setDeleteTargetSessionId(null);
    setDeleteSessionError(null);
  };

  const confirmDeleteSession = async () => {
    if (!deleteTargetSession) return;

    try {
      setDeletingSessionId(deleteTargetSession.id);
      setDeleteSessionError(null);
      await onDeleteSession(deleteTargetSession.id);
      setDeleteTargetSessionId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('chat.failedDelete');
      setDeleteSessionError(message);
      console.error('Failed deleting conversation', error);
    } finally {
      setDeletingSessionId(null);
    }
  };

  const startEditingMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditingMessageValue(content);
  };

  const cancelEditingMessage = () => {
    setEditingMessageId(null);
    setEditingMessageValue('');
  };

  const submitEditedMessage = async (messageId: string) => {
    const nextContent = editingMessageValue.trim();
    if (!nextContent || isSubmittingEdit || isRunActive) return;
    setIsSubmittingEdit(true);
    try {
      await onEditLastUserMessage(messageId, nextContent);
      cancelEditingMessage();
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  React.useEffect(() => {
    if (deleteTargetSessionId && !deleteTargetSession && !deletingSessionId) {
      setDeleteTargetSessionId(null);
      setDeleteSessionError(null);
    }
  }, [deleteTargetSession, deleteTargetSessionId, deletingSessionId]);

  React.useEffect(() => {
    if (!isHistoryOpen) {
      return;
    }
    const usesOverlayHistory = window.matchMedia('(max-width: 1023px)').matches;
    const restoreTarget = usesOverlayHistory && document.activeElement instanceof HTMLElement ? document.activeElement : historyButtonRef.current;
    const focusTimer = usesOverlayHistory
      ? window.setTimeout(() => {
          historyPanelRef.current?.focus({ preventScroll: true });
        }, 0)
      : undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (usesOverlayHistory && event.key === 'Tab') {
        const panel = historyPanelRef.current;
        if (!panel) return;

        const focusableElements = getFocusableHistoryElements(panel);
        const targetIndex = getHistoryFocusWrapIndex(
          focusableElements.findIndex((element) => element === document.activeElement),
          focusableElements.length,
          event.shiftKey
        );

        if (targetIndex === null) return;
        event.preventDefault();
        event.stopPropagation();
        focusableElements[targetIndex]?.focus({ preventScroll: true });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      if (focusTimer !== undefined) window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      if (usesOverlayHistory && restoreTarget && document.contains(restoreTarget)) {
        restoreTarget.focus({ preventScroll: true });
      }
    };
  }, [isHistoryOpen]);

  return (
    <div className="flex-1 flex min-w-0 overflow-hidden bg-ui-bg relative">
      {!isPanel && !isHistoryOpen && (
        <Tooltip content={historyControlLabel} side="right" className="absolute left-0 top-1/2 z-20 -translate-y-1/2">
          <button
            ref={historyButtonRef}
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="inline-flex h-16 w-9 items-center justify-center rounded-r-lg border border-l-0 border-ui-border bg-ui-surface text-ui-text-muted shadow-sm transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
            aria-label={historyControlLabel}
            aria-controls={`${desktopHistoryPanelId} ${mobileHistoryPanelId}`}
            aria-expanded={isHistoryOpen}
            aria-pressed={isHistoryOpen}
          >
            <History className="h-4 w-4" />
          </button>
        </Tooltip>
      )}
      <AnimatePresence initial={false}>
        {!isPanel && isHistoryOpen && (
          <motion.aside
            id={desktopHistoryPanelId}
            aria-label={t('chat.history')}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative hidden h-full shrink-0 overflow-visible border-r border-ui-border bg-ui-surface shadow-sm lg:flex"
          >
            <Tooltip content={historyControlLabel} side="right" className="absolute right-[-2.25rem] top-1/2 z-20 -translate-y-1/2">
              <button
                ref={historyButtonRef}
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="inline-flex h-16 w-9 items-center justify-center rounded-r-lg border border-l-0 border-ui-border bg-ui-surface text-ui-text-muted shadow-sm transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                aria-label={historyControlLabel}
                aria-controls={`${desktopHistoryPanelId} ${mobileHistoryPanelId}`}
                aria-expanded={isHistoryOpen}
                aria-pressed={isHistoryOpen}
              >
                <History className="h-4 w-4" />
              </button>
            </Tooltip>
            <div className="flex h-full w-80 shrink-0 flex-col overflow-hidden">
              <ConversationHistory
                appName={cluster.name}
                sessions={sessions}
                activeSessionId={activeSessionId}
                sessionAssistantStatuses={sessionAssistantStatuses}
                isSessionsLoading={isSessionsLoading}
                onSelectSession={selectSession}
                onDeleteSessionClick={openDeleteSessionModal}
                canDeleteSessions={canDeleteSessions}
                t={t}
              />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden relative">
        <header className={`${isPanel ? 'sticky top-0 z-10 border-b border-ui-border bg-ui-surface px-5 py-4 sm:px-6' : 'bg-ui-bg px-4 py-6 sm:px-6 lg:px-10 lg:py-8'} transition-colors`}>
          {isPanel ? (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-semibold tracking-tight text-ui-text">{title}</h1>
                  <p className="mt-1 text-xs font-medium text-ui-text-muted">
                    {t('chat.panelDescription', { name: cluster.name })}
                  </p>
                </div>
                {panelWindowControls}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="min-w-0">
                <h1 className="type-route-title">{title}</h1>
                <p className="type-body mt-2 max-w-2xl">{t(resolvedDescriptionKey, { name: cluster.name })}</p>
              </div>
              <div className="flex w-full min-w-0 shrink-0 flex-col gap-3 sm:flex-row sm:items-center lg:w-auto lg:max-w-2xl lg:justify-end">
                <Tooltip content={newChatUnavailableReason} disabled={!newChatUnavailableReason}>
                  <span className="inline-flex w-full sm:w-auto">
                    <Button
                      type="button"
                      onClick={onCreateSession}
                      disabled={!canChat}
                      variant="secondary"
                      size="md"
                      className="w-full whitespace-nowrap sm:w-auto"
                    >
                      <Plus className="h-4 w-4" />
                      {t('chat.newChat')}
                    </Button>
                  </span>
                </Tooltip>
              </div>
            </div>
          )}
        </header>

        <div
          ref={transcriptRef}
          onScroll={onChatScroll}
          className={`flex-1 scroll-pb-10 overflow-y-auto bg-ui-bg custom-scrollbar ${isPanel ? 'px-5 py-5 sm:px-6 sm:py-6' : 'stable-scrollbar-gutter px-4 py-6 sm:px-6 lg:px-10 lg:py-8'}`}
        >
          {shouldShowTranscriptSkeleton ? (
            <ChatTranscriptSkeleton isPanel={isPanel} label={t('chat.loadingConversation')} />
          ) : hasConversationLoadError ? (
            <ChatTranscriptLoadError
              isPanel={isPanel}
              title={t('chat.conversationLoadFailed')}
              body={t('chat.conversationLoadFailedBody')}
            />
          ) : visibleMessages.length === 0 ? (
            <ChatEmptyPrompt
              isPanel={isPanel}
              title={t(resolvedPromptTitleKey, { name: cluster.name })}
              body={t(resolvedPromptBodyKey)}
              suggestions={resolvedSuggestionKeys.map((suggestionKey) => ({ key: suggestionKey, label: t(suggestionKey) }))}
              canSendSuggestion={canPost && !isRunActive}
              onSendSuggestion={sendText}
            />
          ) : (
            <div className={`${isPanel ? 'max-w-3xl' : 'max-w-4xl'} mx-auto space-y-5 pb-2`}>
              {hasEarlierMessages && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => void onLoadEarlierMessages()}
                    disabled={isLoadingEarlierMessages}
                    className="type-label rounded-lg border border-ui-border bg-ui-surface px-4 py-2 text-ui-text-muted transition-colors hover:text-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoadingEarlierMessages ? t('chat.loadingEarlier') : t('chat.loadEarlier')}
                  </button>
                </div>
              )}
              {visibleMessages.map((message, messageIndex) => {
                const isUser = message.role === 'user';
                const isInFlightPlaceholder = !isUser && isInFlightAssistantPlaceholder(message);
                const messageTrace = !isUser && message.runId ? runTracesByRunId[message.runId] : undefined;
                const activeRunTrace = isInFlightPlaceholder && activeRunId ? runTracesByRunId[activeRunId] : undefined;
                const trace = activeRunTrace || messageTrace;
                const traceRunId = trace?.runId || message.runId || message.id;
                const previousMessage = messageIndex > 0 ? visibleMessages[messageIndex - 1] : undefined;
                const messageKey = !isUser && previousMessage?.role === 'user' ? `assistant-turn-${previousMessage.id}` : message.id;
                const hasLaterUserMessage = messageIndex < lastUserMessageIndex;
                const traceToRender: LiveRunTrace | undefined =
                  trace ||
                  (isInFlightPlaceholder
                    ? {
                        runId: traceRunId,
                        status: 'connecting',
                        steps: [
                          {
                            id: `${traceRunId}-pending`,
                            label: 'Preparing response',
                            detail: 'Waiting for the first progress update.',
                            status: 'info',
                            timestamp: message.timestamp
                          }
                        ],
                        toolCalls: []
                      }
                    : undefined);
                const isStaleCancelledAssistantStatus =
                  !isUser &&
                  hasLaterUserMessage &&
                  traceToRender?.status === 'cancelled';

                if (!isUser) {
                  return (
                    <div key={messageKey} className="flex w-full justify-start">
                      <AssistantTurn
                        timestampLabel={formatMessageTime(message.timestamp)}
                        content={message.content}
                        isInFlightPlaceholder={isInFlightPlaceholder}
                        markdownComponents={assistantMarkdownComponents}
                        approval={message.approval}
                        canApproveWriteActions={canApproveWriteActions}
                        onApprove={onApprove}
                        onReject={onReject}
                        trace={traceToRender}
                        traceRunId={traceRunId}
                        isTraceExpanded={traceExpandedByRunId[traceRunId] ?? false}
                        setTraceExpanded={(runId, expanded) => {
                          setTraceExpandedByRunId((current) => ({ ...current, [runId]: expanded }));
                        }}
                        compactStatusOnly={isStaleCancelledAssistantStatus}
                        t={t}
                      />
                    </div>
                  );
                }

                const userTurnRunId = userTurnRunIdsByIndex.get(messageIndex);
                const userTurnTrace = userTurnRunId ? runTracesByRunId[userTurnRunId] : undefined;
                const canEditUserMessage =
                  canPost &&
                  !isRunActive &&
                  messageIndex === lastUserMessageIndex &&
                  Boolean(userTurnRunId) &&
                  (userTurnTrace?.status === 'cancelled' || userTurnTrace?.status === 'failed');
                const isEditingMessage = editingMessageId === message.id;

                return (
                  <UserMessageTurn
                    key={message.id}
                    message={message}
                    markdownComponents={userMarkdownComponents}
                    timestampLabel={formatMessageTime(message.timestamp)}
                    canEdit={canEditUserMessage}
                    isEditing={isEditingMessage}
                    editValue={editingMessageValue}
                    isSubmittingEdit={isSubmittingEdit}
                    onEditValueChange={setEditingMessageValue}
                    onStartEdit={() => startEditingMessage(message.id, message.content)}
                    onCancelEdit={cancelEditingMessage}
                    onSubmitEdit={() => void submitEditedMessage(message.id)}
                    t={t}
                  />
                );
              })}
            </div>
          )}
        </div>

        <form
          className={`${isPanel ? 'px-5 py-4 sm:px-6 sm:py-5' : 'p-4 sm:p-5'} border-t border-ui-border bg-ui-surface`}
          onSubmit={(event) => {
            event.preventDefault();
            if (isRunActive) return;
            void onSend();
          }}
        >
          <ChatComposerNotice
            isPanel={isPanel}
            conversationNotice={conversationNotice}
            recentActivityWarning={recentActivityWarning}
            onDismissRecentActivityWarning={onDismissRecentActivityWarning}
            onOpenRecentActivitySession={onOpenRecentActivitySession}
            t={t}
          />
          <div className={`${isPanel ? 'max-w-3xl gap-2 sm:gap-3' : 'max-w-4xl gap-2 sm:gap-3'} mx-auto flex items-center`}>
            <div className={`${isPanel ? 'hidden min-[540px]:flex' : 'hidden sm:flex'} min-h-11 max-w-[13rem] items-center gap-2 rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-xs font-semibold text-ui-text-muted`} aria-label={t('chat.targetContext', { name: cluster.name })}>
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span className="truncate">{cluster.name}</span>
            </div>
            <input
              value={inputValue}
              onChange={(event) => onInputChange(event.target.value)}
              className={`${isPanel ? 'min-h-12 rounded-md px-4 py-3 font-medium' : 'min-h-12 rounded-md px-4 py-3'} min-w-0 flex-1 border border-ui-border bg-ui-bg text-sm text-ui-text outline-none ring-accent/10 transition-colors placeholder:text-ui-text-muted/65 focus:border-accent/50 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60`}
              placeholder={canPost ? t(resolvedInputPlaceholderKey, { name: cluster.name }) : t(resolvedNoChatAccessKey)}
              disabled={!canPost || isRunActive}
            />
            <Tooltip content={composerActionLabel}>
              <Button
                type={isRunActive ? 'button' : 'submit'}
                onClick={isRunActive ? () => {
                  if (canCancelActiveRun && !isCancellingRun) void onCancelRun();
                } : undefined}
                disabled={isRunActive ? !canCancelActiveRun || isCancellingRun : !canPost || !inputValue.trim()}
                variant={isRunActive ? 'secondary' : 'primary'}
                size="icon"
                className={`h-12 w-12 shrink-0 ${isRunActive ? 'border-status-danger/25 bg-status-danger-soft text-status-danger-text hover:border-status-danger/40 hover:bg-status-danger-soft/80 focus-visible:ring-status-danger/20' : ''}`}
                aria-label={composerActionLabel}
              >
                {isRunActive ? (isCancellingRun ? <Loader2 className="h-5 w-5 animate-spin" /> : <Square className="h-4 w-4 fill-current" />) : <Send className="h-5 w-5" />}
              </Button>
            </Tooltip>
          </div>
          <p className={`${isPanel ? 'max-w-3xl' : 'max-w-4xl'} mx-auto mt-3 text-center text-[11px] font-medium text-ui-text-muted`}>
            {canPost ? t(resolvedFooterKey) : t(resolvedFooterNoAccessKey)}
          </p>
        </form>
      </div>

      <AnimatePresence>
        {!isPanel && isHistoryOpen && (
          <motion.div
            className="absolute inset-0 z-[110] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="absolute inset-0 h-full w-full bg-ui-text/20 dark:bg-ui-bg/65" aria-hidden="true" />
            <motion.aside
              ref={historyPanelRef}
              id={mobileHistoryPanelId}
              role="dialog"
              aria-modal="true"
              aria-label={t('chat.history')}
              tabIndex={-1}
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-0 top-0 flex h-full w-[min(23rem,calc(100vw-2rem))] flex-col overflow-visible border-r border-ui-border bg-ui-surface shadow-xl outline-none"
            >
              <Tooltip content={historyControlLabel} side="right" className="absolute right-[-2.25rem] top-1/2 z-20 -translate-y-1/2">
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(false)}
                  className="inline-flex h-16 w-9 items-center justify-center rounded-r-lg border border-l-0 border-ui-border bg-ui-surface text-ui-text-muted shadow-sm transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                  aria-label={historyControlLabel}
                >
                  <History className="h-4 w-4" />
                </button>
              </Tooltip>
              <ConversationHistory
                appName={cluster.name}
                sessions={sessions}
                activeSessionId={activeSessionId}
                sessionAssistantStatuses={sessionAssistantStatuses}
                isSessionsLoading={isSessionsLoading}
                onSelectSession={selectSession}
                onDeleteSessionClick={openDeleteSessionModal}
                canDeleteSessions={canDeleteSessions}
                t={t}
              />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {deleteTargetSession && (
        <DeleteConversationDialog
          sessionName={deleteTargetSession.name}
          isDeleting={Boolean(deletingSessionId)}
          error={deleteSessionError}
          onClose={closeDeleteSessionModal}
          onConfirm={confirmDeleteSession}
          t={t}
        />
      )}
    </div>
  );
};
