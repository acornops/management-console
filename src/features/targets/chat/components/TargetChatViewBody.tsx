import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessagesSquare, Plus, Search, Upload } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Tooltip } from '@/components/common/Tooltip';
import { ConversationHistory } from '@/features/targets/chat/components/ConversationHistory';
import { LiveRunTrace } from '@/features/targets/chat/types';
import { AssistantTurn } from '@/features/targets/chat/components/AssistantTurn';
import { TargetChatComposer } from '@/features/targets/chat/components/TargetChatComposer';
import { TargetChatGateDialog } from '@/features/targets/chat/components/TargetChatGateDialog';
import { TargetAssistantReadinessState } from '@/features/targets/chat/components/TargetAssistantReadinessState';
import { TargetChatPanelControls } from '@/features/targets/chat/components/TargetChatPanelControls';
import { ChatEmptyPrompt, ChatTranscriptLoadError, ChatTranscriptSkeleton } from '@/features/targets/chat/components/ChatTranscriptStates';
import { DeleteConversationDialog } from '@/features/targets/chat/components/DeleteConversationDialog';
import { UserMessageTurn } from '@/features/targets/chat/components/UserMessageTurn';
import { formatMessageTime } from '@/features/targets/chat/components/targetChatViewHelpers';
import { useTargetChatHistoryWorkspace } from '@/features/targets/chat/components/useTargetChatHistoryWorkspace';
import type { TargetChatViewBodyProps } from '@/features/targets/chat/components/TargetChatViewBody.types';
import { getComposerReferenceProps } from '@/features/targets/chat/components/targetChatReferenceProps';
export const TargetChatViewBody: React.FC<TargetChatViewBodyProps> = (props) => {
  const {
    activeRunId,
    activeSession,
    activeSessionId,
    aiRuntimeReadiness,
    allowedReasoningOptions,
    assistantMarkdownComponents,
    assistantCapabilitiesPreview,
    assistantCapabilitiesPreviewError,
    canApproveWriteActions,
    canCancelActiveRun,
    canChat,
    canDeleteSessions,
    canManageAiSettings,
    canPost,
    target,
    composerActionLabel,
    composerAttachmentNotice,
    composerAttachments,
    composerModelOptions,
    composerRootRef,
    composerSubmitUnavailableReason,
    composerTextareaRef,
    conversationNotice,
    deleteSessionError,
    deleteTargetSession,
    deletingSessionId,
    desktopHistoryPanelId,
    fileInputRef,
    hasComposerSubmitPayload,
    hasConversationLoadError,
    hasEarlierMessages,
    handleAttachmentInputChange,
    handleChatWindowDragEnter,
    handleChatWindowDragLeave,
    handleChatWindowDragOver,
    handleChatWindowDrop,
    handleComposerKeyDown,
    handleCreateSessionClick,
    handleModelAndEffortChange,
    handleModelChange,
    historyButtonRef,
    historyControlLabel,
    historyPanelRef,
    inputValue,
    isAssistantCapabilitiesPreviewLoading,
    isCancellingRun,
    isComposerRuntimeUnavailable,
    isFileDragActive,
    isHistoryOpen,
    isLoadingEarlierMessages,
    isModelMenuOpen,
    isModelSubmenuOpen,
    isPanel,
    isRunActive,
    isSessionsLoading,
    isSubmittingEdit,
    isWorkspaceAiSettingsLoading,
    lastUserMessageIndex,
    mobileHistoryPanelId,
    modelMenuPanelId,
    modelMenuRef,
    modelSelectorId,
    modelSubmenuButtonId,
    modelSubmenuPanelId,
    newChatUnavailableReason,
    onApprove,
    onCancelRun,
    onChatScroll,
    onDismissRecentActivityWarning,
    onLoadEarlierMessages,
    onOpenAiSettings,
    onOpenRecentActivitySession,
    onReject,
    onClose,
    onMaximize,
    recentActivityWarning,
    removeComposerAttachment,
    requestedToolAccessMode,
    resolvedDescriptionKey,
    resolvedFooterKey,
    resolvedFooterNoAccessKey,
    resolvedInputPlaceholderKey,
    resolvedNoChatAccessKey,
    resolvedPromptBodyKey,
    resolvedPromptTitleKey,
    resolvedSuggestionKeys,
    runTracesByRunId,
    selectSession,
    selectedEffort,
    selectedEffortLabel,
    selectedModel,
    selectedModelLabel,
    selectedProvider,
    sendText,
    sessionAssistantStatuses,
    sessions,
    setEditingMessageValue,
    setIsHistoryOpen,
    setIsModelMenuOpen,
    setIsModelSubmenuOpen,
    setTraceExpandedByRunId,
    shouldShowTranscriptSkeleton,
    submitComposerMessage,
    t,
    title,
    traceExpandedByRunId,
    transcriptRef,
    userMarkdownComponents,
    userTurnRunIdsByIndex,
    visibleMessages,
    workspaceAiSettingsError,
    startEditingMessage,
    cancelEditingMessage,
    closeDeleteSessionModal,
    confirmDeleteSession,
    editingMessageId,
    editingMessageValue,
    isInFlightAssistantPlaceholder,
    openDeleteSessionModal,
    submitEditedMessage
  } = props;
  const contentRef = React.useRef<HTMLDivElement>(null);
  const hasBlockingGate = Boolean(recentActivityWarning);
  const hasReadyAiRuntime = aiRuntimeReadiness.status === 'ready';
  const setupToolCount = assistantCapabilitiesPreview?.toolSummary.totalAllowed;
  const {
    createSessionFromSearch,
    finishHistoryResize,
    handleHistoryResizeKeyDown,
    historyPanelMaxWidth,
    historyPanelWidth,
    historySearchPageId,
    historySearchValue,
    isChatsRailActive,
    isHistorySearchPageOpen,
    isSearchRailActive,
    moveHistoryResize,
    openHistorySearch,
    resetHistoryPanelWidth,
    selectSessionFromSearch,
    setHistorySearchValue,
    startHistoryResize,
    toggleHistoryChats
  } = useTargetChatHistoryWorkspace({
    desktopHistoryPanelId,
    handleCreateSessionClick,
    historyButtonRef,
    isHistoryOpen,
    selectSession,
    setIsHistoryOpen
  });

  React.useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    if (hasBlockingGate) {
      content.setAttribute('inert', '');
      return () => {
        content.removeAttribute('inert');
      };
    }

    content.removeAttribute('inert');
  }, [hasBlockingGate]);

  return (
    <div
      className="relative flex flex-1 min-w-0 overflow-hidden bg-ui-bg"
      onDragEnter={handleChatWindowDragEnter}
      onDragOver={handleChatWindowDragOver}
      onDragLeave={handleChatWindowDragLeave}
      onDrop={(event) => void handleChatWindowDrop(event)}
    >
      <div ref={contentRef} className="contents" aria-hidden={hasBlockingGate ? true : undefined}>
        <AnimatePresence>
          {isFileDragActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-none absolute inset-0 z-[140] flex items-center justify-center bg-ui-bg/88 p-6 dark:bg-ui-bg/92"
            >
              <div className="flex min-h-48 w-full max-w-2xl flex-col items-center justify-center rounded-2xl border border-dashed border-accent/50 bg-accent/10 px-8 py-10 text-center shadow-lg shadow-ui-text/5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-ui-surface text-accent-strong">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="mt-4 text-base font-semibold text-ui-text">
                  {canPost && !isRunActive ? t('chat.dropFilesTitle') : t('chat.dropFilesUnavailableTitle')}
                </p>
                <p className="mt-2 max-w-md text-sm font-medium leading-6 text-ui-text-muted">
                  {canPost && !isRunActive ? t('chat.dropFilesBody') : recentActivityWarning ? t('chat.chooseRecentActivityAction') : t(resolvedNoChatAccessKey)}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      {!isPanel && (
        <nav
          aria-label={t('chat.assistantNavigation')}
          className="relative z-20 flex h-full w-12 shrink-0 flex-col items-center gap-1 border-r border-ui-border bg-ui-surface py-2"
        >
          <Tooltip content={t('chat.searchChats')} side="right">
            <Button
              type="button"
              variant="tertiary"
              size="icon"
              onClick={openHistorySearch}
              data-chat-history-trigger="search"
              className={isSearchRailActive ? 'bg-ui-bg text-ui-text shadow-inner' : ''}
              aria-label={t('chat.searchChats')}
              aria-controls={historySearchPageId}
              aria-current={isSearchRailActive ? 'page' : undefined}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Tooltip>
          <Tooltip content={isChatsRailActive ? historyControlLabel : t('chat.chats')} side="right">
            <Button
              type="button"
              variant="tertiary"
              size="icon"
              onClick={toggleHistoryChats}
              data-chat-history-trigger="chats"
              className={isChatsRailActive ? 'bg-ui-bg text-ui-text shadow-inner' : ''}
              aria-label={isChatsRailActive ? historyControlLabel : t('chat.chats')}
              aria-controls={`${desktopHistoryPanelId} ${mobileHistoryPanelId}`}
              aria-expanded={isChatsRailActive}
              aria-current={isChatsRailActive ? 'page' : undefined}
            >
              <MessagesSquare className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Tooltip>
        </nav>
      )}
      {!isPanel && isHistoryOpen && (
        <aside
          id={desktopHistoryPanelId}
          aria-label={t('chat.chats')}
          style={{ width: historyPanelWidth }}
          className="relative hidden h-full shrink-0 overflow-hidden border-r border-ui-border bg-ui-surface shadow-sm lg:flex"
        >
          <div className="flex h-full w-full shrink-0 flex-col overflow-hidden">
            <ConversationHistory
              appName={target.name}
              sessions={sessions}
              activeSessionId={activeSessionId}
              sessionAssistantStatuses={sessionAssistantStatuses}
              isSessionsLoading={isSessionsLoading}
              onSelectSession={selectSession}
              onDeleteSessionClick={openDeleteSessionModal}
              onSearchValueChange={setHistorySearchValue}
              searchValue={historySearchValue}
              canDeleteSessions={canDeleteSessions}
              t={t}
            />
          </div>
          <div
            data-chat-history-resize-handle="true"
            role="separator"
            aria-label={t('chat.resizeHistory')}
            aria-orientation="vertical"
            aria-valuemin={0}
            aria-valuemax={historyPanelMaxWidth}
            aria-valuenow={Math.round(historyPanelWidth)}
            tabIndex={0}
            title={t('chat.resizeHistoryHint')}
            className="absolute right-0 top-0 z-20 h-full w-2 touch-none cursor-col-resize bg-transparent transition-colors hover:bg-accent/10 focus:outline-none focus-visible:bg-accent/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/35"
            onPointerDown={startHistoryResize}
            onPointerMove={moveHistoryResize}
            onPointerUp={(event) => finishHistoryResize(event)}
            onPointerCancel={(event) => finishHistoryResize(event, true)}
            onDoubleClick={resetHistoryPanelWidth}
            onKeyDown={handleHistoryResizeKeyDown}
          />
        </aside>
      )}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden relative">
        {isHistorySearchPageOpen && !isPanel ? (
          <ConversationHistory
            id={historySearchPageId}
            mode="page"
            appName={target.name}
            sessions={sessions}
            activeSessionId={activeSessionId}
            sessionAssistantStatuses={sessionAssistantStatuses}
            isSessionsLoading={isSessionsLoading}
            canCreateSession={canChat && hasReadyAiRuntime}
            canDeleteSessions={canDeleteSessions}
            newChatUnavailableReason={newChatUnavailableReason}
            onCreateSession={createSessionFromSearch}
            onSelectSession={selectSessionFromSearch}
            onDeleteSessionClick={openDeleteSessionModal}
            onSearchValueChange={setHistorySearchValue}
            searchValue={historySearchValue}
            t={t}
          />
        ) : (
          <>
        <header className={`${isPanel ? 'sticky top-0 z-10 border-b border-ui-border bg-ui-surface px-5 py-4 sm:px-6' : 'bg-ui-bg px-4 py-6 sm:px-6 lg:px-10 lg:py-8'} transition-colors`}>
          {isPanel ? (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-semibold tracking-tight text-ui-text">{title}</h1>
                  <p className="mt-1 text-xs font-medium text-ui-text-muted">
                    {t('chat.panelDescription', { name: target.name })}
                  </p>
                </div>
                <TargetChatPanelControls onClose={onClose} onMaximize={onMaximize} t={t} />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="min-w-0">
                <h1 className="type-route-title">{title}</h1>
                <p className="type-body mt-2 max-w-2xl">{t(resolvedDescriptionKey, { name: target.name })}</p>
              </div>
              <div className="flex w-full min-w-0 shrink-0 items-center gap-3 lg:w-auto lg:max-w-2xl lg:justify-end">
                <Tooltip
                  content={newChatUnavailableReason}
                  disabled={!newChatUnavailableReason}
                  className="min-w-0 flex-1 lg:flex-none"
                >
                  <span className="inline-flex w-full">
                    <Button
                      type="button"
                      onClick={handleCreateSessionClick}
                      disabled={!canChat || !hasReadyAiRuntime}
                      variant="secondary"
                      size="md"
                      className="w-full whitespace-nowrap lg:w-auto"
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
          ) : visibleMessages.length === 0 && !hasReadyAiRuntime ? (
            <TargetAssistantReadinessState
              status={aiRuntimeReadiness.status}
              canManageAiSettings={canManageAiSettings}
              onOpenAiSettings={onOpenAiSettings}
              toolCount={setupToolCount}
              t={t}
            />
          ) : visibleMessages.length === 0 ? (
            <ChatEmptyPrompt
              isPanel={isPanel}
              title={t(resolvedPromptTitleKey, { name: target.name })}
              body={t(resolvedPromptBodyKey)}
              suggestions={resolvedSuggestionKeys.map((suggestionKey) => ({ key: suggestionKey, label: t(suggestionKey) }))}
              canSendSuggestion={canPost && !isRunActive && !isComposerRuntimeUnavailable}
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
                    className="control-target type-label rounded-lg border border-ui-border bg-ui-surface px-4 py-2 text-ui-text-muted transition-colors hover:text-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
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
                  !isComposerRuntimeUnavailable &&
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

        {hasReadyAiRuntime ? <TargetChatComposer
          allowedReasoningOptions={allowedReasoningOptions}
          assistantCapabilitiesPreview={assistantCapabilitiesPreview}
          assistantCapabilitiesPreviewError={assistantCapabilitiesPreviewError}
          canChat={canChat}
          canCancelActiveRun={canCancelActiveRun}
          canPost={canPost}
          target={target}
          composerActionLabel={composerActionLabel}
          composerAttachmentNotice={composerAttachmentNotice}
          composerAttachments={composerAttachments}
          composerModelOptions={composerModelOptions}
          composerRootRef={composerRootRef}
          composerSubmitUnavailableReason={composerSubmitUnavailableReason}
          composerTextareaRef={composerTextareaRef}
          conversationNotice={conversationNotice}
          fileInputRef={fileInputRef}
          handleAttachmentInputChange={handleAttachmentInputChange}
          handleComposerKeyDown={handleComposerKeyDown}
          handleModelAndEffortChange={handleModelAndEffortChange}
          handleModelChange={handleModelChange}
          hasComposerSubmitPayload={hasComposerSubmitPayload}
          inputValue={inputValue}
          isAssistantCapabilitiesPreviewLoading={isAssistantCapabilitiesPreviewLoading}
          isCancellingRun={isCancellingRun}
          isComposerRuntimeUnavailable={isComposerRuntimeUnavailable}
          isModelMenuOpen={isModelMenuOpen}
          isModelSubmenuOpen={isModelSubmenuOpen}
          isPanel={isPanel}
          isRunActive={isRunActive}
          isWorkspaceAiSettingsLoading={isWorkspaceAiSettingsLoading}
          modelMenuPanelId={modelMenuPanelId}
          modelMenuRef={modelMenuRef}
          modelSelectorId={modelSelectorId}
          modelSubmenuButtonId={modelSubmenuButtonId}
          modelSubmenuPanelId={modelSubmenuPanelId}
          onCancelRun={onCancelRun}
          recentActivityWarning={recentActivityWarning}
          removeComposerAttachment={removeComposerAttachment}
          requestedToolAccessMode={requestedToolAccessMode}
          resolvedFooterKey={resolvedFooterKey}
          resolvedFooterNoAccessKey={resolvedFooterNoAccessKey}
          resolvedInputPlaceholderKey={resolvedInputPlaceholderKey}
          resolvedNoChatAccessKey={resolvedNoChatAccessKey}
          selectedEffort={selectedEffort}
          selectedEffortLabel={selectedEffortLabel}
          selectedModel={selectedModel}
          selectedModelLabel={selectedModelLabel}
          selectedProvider={selectedProvider}
          setIsModelMenuOpen={setIsModelMenuOpen}
          setIsModelSubmenuOpen={setIsModelSubmenuOpen}
          {...getComposerReferenceProps(props)}
          submitComposerMessage={submitComposerMessage}
          t={t}
          workspaceAiSettingsError={workspaceAiSettingsError}
        /> : visibleMessages.length > 0 ? (
          <TargetAssistantReadinessState
            compact
            status={aiRuntimeReadiness.status}
            canManageAiSettings={canManageAiSettings}
            onOpenAiSettings={onOpenAiSettings}
            toolCount={setupToolCount}
            t={t}
          />
        ) : null}
          </>
        )}
      </div>

      <AnimatePresence>
        {!isPanel && isHistoryOpen && (
          <motion.div
            className="absolute inset-0 z-[110] bg-ui-text/20 dark:bg-ui-bg/65 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setIsHistoryOpen(false);
            }}
          >
            <motion.aside
              ref={historyPanelRef}
              id={mobileHistoryPanelId}
              role="dialog"
              aria-modal="true"
              aria-label={t('chat.chats')}
              tabIndex={-1}
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-12 top-0 flex h-full w-[min(21rem,calc(100vw-5rem))] flex-col overflow-hidden border-r border-ui-border bg-ui-surface shadow-xl outline-none"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <ConversationHistory
                appName={target.name}
                sessions={sessions}
                activeSessionId={activeSessionId}
                sessionAssistantStatuses={sessionAssistantStatuses}
                isSessionsLoading={isSessionsLoading}
                onSelectSession={selectSession}
                onDeleteSessionClick={openDeleteSessionModal}
                onSearchValueChange={setHistorySearchValue}
                onClose={() => setIsHistoryOpen(false)}
                searchValue={historySearchValue}
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

      <AnimatePresence>
        {recentActivityWarning && (
          <TargetChatGateDialog
            activeSessionId={activeSessionId}
            isPanel={isPanel}
            recentActivityWarning={recentActivityWarning}
            onDismissRecentActivityWarning={onDismissRecentActivityWarning}
            onOpenRecentActivitySession={onOpenRecentActivitySession}
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
