import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button, DrawerFrame } from '@acornops/ui';
import { Tooltip } from '@acornops/ui';
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
import { AutomaticInvestigationBrief } from '@/features/targets/chat/components/AutomaticInvestigationBrief';
import { TargetChatContextNotices } from '@/features/targets/chat/components/TargetChatContextNotices';
import { formatMessageTime, isMessageOwnedByCurrentUser } from '@/features/targets/chat/components/targetChatViewHelpers';
import { useTargetChatHistoryWorkspace } from '@/features/targets/chat/components/useTargetChatHistoryWorkspace';
import type { TargetChatViewBodyProps } from '@/features/targets/chat/components/TargetChatViewBody.types';
import { getComposerReferenceProps } from '@/features/targets/chat/components/targetChatReferenceProps';
import { TargetChatNavigationRail } from '@/features/targets/chat/components/TargetChatNavigationRail';
import { TargetChatDropOverlay } from '@/features/targets/chat/components/TargetChatDropOverlay';
import { useAutomaticInvestigationViewState } from '@/features/targets/chat/hooks/useAutomaticInvestigationViewState';
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
    automaticInvestigationsEnabled,
    targetMentionsEnabled,
    canApproveWriteActions,
    canCancelActiveRun,
    canChat,
    canDeleteSessions,
    canManageAiSettings,
    canPost,
    subject,
    composerActionLabel,
    composerAttachmentNotice,
    composerAttachments,
    composerModelOptions,
    composerRootRef,
    composerSubmitUnavailableReason,
    composerTextareaRef,
    conversationNotice,
    currentUserId = '',
    sessionDeepLinkError,
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
    headerLeading,
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
    usesOverlayHistory,
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
  const hasReadyAiRuntime = aiRuntimeReadiness.status === 'ready';
  const {
    unseenCount: unseenInvestigationCount,
    markViewed: markInvestigationsViewed
  } = useAutomaticInvestigationViewState({
    currentUserId: automaticInvestigationsEnabled ? currentUserId : '',
    workspaceId: subject.workspaceId,
    targetId: subject.id,
    sessions
  });
  const {
    createSessionFromSearch,
    finishHistoryResize,
    handleHistoryResizeKeyDown,
    historyPanelMaxWidth,
    historyPanelWidth,
    historySearchPageId,
    historySearchValue,
    historyView,
    isChatsRailActive,
    isInvestigationsRailActive,
    isHistorySearchPageOpen,
    isSearchRailActive,
    moveHistoryResize,
    openHistorySearch,
    resetHistoryPanelWidth,
    selectSessionFromSearch,
    setHistorySearchValue,
    startHistoryResize,
    toggleHistoryChats,
    toggleHistoryInvestigations
  } = useTargetChatHistoryWorkspace({
    desktopHistoryPanelId,
    handleCreateSessionClick,
    historyButtonRef,
    isHistoryOpen,
    onInvestigationsViewed: automaticInvestigationsEnabled ? markInvestigationsViewed : undefined,
    selectSession,
    setIsHistoryOpen
  });
  React.useEffect(() => {
    if (automaticInvestigationsEnabled && activeSession?.origin === 'auto_triage') {
      markInvestigationsViewed();
    }
  }, [activeSession?.id, activeSession?.origin, automaticInvestigationsEnabled, markInvestigationsViewed]);

  React.useEffect(() => {
    if (automaticInvestigationsEnabled && isInvestigationsRailActive && unseenInvestigationCount > 0) {
      markInvestigationsViewed();
    }
  }, [automaticInvestigationsEnabled, isInvestigationsRailActive, markInvestigationsViewed, unseenInvestigationCount]);

  return (
    <div
      data-target-chat-surface="true"
      className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden bg-ui-bg"
      onDragEnter={handleChatWindowDragEnter}
      onDragOver={handleChatWindowDragOver}
      onDragLeave={handleChatWindowDragLeave}
      onDrop={(event) => void handleChatWindowDrop(event)}
    >
      <div className="contents">
        <TargetChatDropOverlay canPost={canPost} isFileDragActive={isFileDragActive} isRunActive={isRunActive} recentActivityWarning={recentActivityWarning} resolvedNoChatAccessKey={resolvedNoChatAccessKey} t={t} />
        {!isPanel && (
          <TargetChatNavigationRail
            automaticInvestigationsEnabled={automaticInvestigationsEnabled}
            canCreateSession={canChat && hasReadyAiRuntime}
            desktopHistoryPanelId={desktopHistoryPanelId}
            historyControlLabel={historyControlLabel}
            historySearchPageId={historySearchPageId}
            isChatsActive={isChatsRailActive}
            isHistoryOpen={isHistoryOpen}
            isInvestigationsActive={isInvestigationsRailActive}
            isSearchActive={isSearchRailActive}
            mobileHistoryPanelId={mobileHistoryPanelId}
            onChatsClick={toggleHistoryChats}
            onInvestigationsClick={toggleHistoryInvestigations}
            onNewChatClick={handleCreateSessionClick}
            onSearchClick={openHistorySearch}
            newChatUnavailableReason={newChatUnavailableReason}
            unseenInvestigationCount={unseenInvestigationCount}
          />
        )}
        {!isPanel && isHistoryOpen && !usesOverlayHistory && (
          <aside
            id={desktopHistoryPanelId}
            aria-label={t(automaticInvestigationsEnabled && historyView === 'investigations' ? 'chat.investigations' : 'chat.chats')}
            style={{
              '--chat-history-panel-width': `${historyPanelWidth}px`,
              width: 'var(--chat-history-panel-width)'
            } as React.CSSProperties}
            className="relative hidden h-full shrink-0 overflow-hidden border-r border-ui-border bg-ui-surface shadow-sm lg:flex"
          >
            <div className="flex h-full w-full shrink-0 flex-col overflow-hidden">
              <ConversationHistory
                appName={subject.name}
                sessions={sessions}
                sessionOrigin={automaticInvestigationsEnabled
                  ? historyView === 'investigations' ? 'auto_triage' : 'manual'
                  : undefined}
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
              className="absolute right-0 top-0 z-20 h-full w-2 touch-none cursor-col-resize bg-transparent transition-colors hover:bg-accent/10 focus:outline-none focus-visible:bg-accent/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/35 data-[resizing=true]:bg-accent/15"
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
              appName={subject.name}
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
              <header
                className={`${
                  isPanel ? 'sticky top-0 z-10 border-b border-ui-border bg-ui-surface px-5 py-4 sm:px-6' : 'stable-scrollbar-gutter overflow-y-auto bg-ui-bg px-[var(--ao-route-padding-x)] py-[var(--ao-route-padding-y)] custom-scrollbar'
                } transition-colors`}
              >
                {isPanel ? (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      {headerLeading}
                      <div className="min-w-0">
                        <h1 className="type-section-title truncate text-ui-text">{title}</h1>
                        <p className="mt-1 type-caption text-ui-text-muted">{t('chat.panelDescription', { name: subject.name })}</p>
                      </div>
                    </div>
                    <TargetChatPanelControls onClose={onClose} onMaximize={onMaximize} t={t} />
                  </div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                    <div className="flex min-w-0 items-start gap-3">
                      {headerLeading}
                      <div className="min-w-0">
                        <h1 className="type-route-title">{title}</h1>
                        {resolvedDescriptionKey ? (
                          <p className="type-body mt-2 max-w-2xl">{t(resolvedDescriptionKey, { name: subject.name })}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex w-full min-w-0 shrink-0 items-center gap-3 lg:w-auto lg:max-w-2xl lg:justify-end">
                      <Tooltip content={newChatUnavailableReason} disabled={!newChatUnavailableReason} className="min-w-0 flex-1 lg:flex-none">
                        <span className="inline-flex w-full">
                          <Button
                            type="button"
                            onClick={handleCreateSessionClick}
                            disabled={!canChat || !hasReadyAiRuntime}
                            variant="primary"
                            size="md"
                            data-chat-new-chat="true"
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

              <TargetChatContextNotices activeSession={automaticInvestigationsEnabled ? activeSession : null} isPanel={isPanel} sessionDeepLinkError={sessionDeepLinkError} t={t} />

              <div
                ref={transcriptRef}
                onScroll={onChatScroll}
                className={`flex-1 scroll-pb-10 overflow-y-auto bg-ui-bg custom-scrollbar ${
                  isPanel ? 'px-5 py-5 sm:px-6 sm:py-6' : 'stable-scrollbar-gutter px-[var(--ao-route-padding-x)] py-[var(--ao-route-padding-y)]'
                }`}
              >
                {shouldShowTranscriptSkeleton ? (
                  <ChatTranscriptSkeleton isPanel={isPanel} label={t('chat.loadingConversation')} />
                ) : hasConversationLoadError ? (
                  <ChatTranscriptLoadError isPanel={isPanel} title={t('chat.conversationLoadFailed')} body={t('chat.conversationLoadFailedBody')} />
                ) : visibleMessages.length === 0 && !hasReadyAiRuntime ? (
                  <TargetAssistantReadinessState status={aiRuntimeReadiness.status} canManageAiSettings={canManageAiSettings} onOpenAiSettings={onOpenAiSettings} t={t} />
                ) : visibleMessages.length === 0 ? (
                  <ChatEmptyPrompt
                    isPanel={isPanel}
                    title={t(resolvedPromptTitleKey, { name: subject.name })}
                    body={t(resolvedPromptBodyKey)}
                    suggestions={resolvedSuggestionKeys.map((suggestionKey) => ({
                      key: suggestionKey,
                      label: t(suggestionKey)
                    }))}
                    canSendSuggestion={canPost && !isRunActive && !isComposerRuntimeUnavailable}
                    onSendSuggestion={sendText}
                  />
                ) : (
                  <div className={`${isPanel ? 'max-w-3xl' : 'max-w-4xl'} mx-auto space-y-5 pb-2`}>
                    {hasEarlierMessages && (
                      <div className="flex justify-center">
                        <Button
                          type="button"
                          onClick={() => void onLoadEarlierMessages()}
                          disabled={isLoadingEarlierMessages}
                          variant="secondary"
                          size="sm"
                        >
                          {isLoadingEarlierMessages ? t('chat.loadingEarlier') : t('chat.loadEarlier')}
                        </Button>
                      </div>
                    )}
                    {visibleMessages.map((message, messageIndex) => {
                      const isUser = message.role === 'user';
                      const isAutomaticBrief =
                        automaticInvestigationsEnabled &&
                        isUser &&
                        activeSession?.origin === 'auto_triage' &&
                        message.metadata?.presentation === 'automatic_investigation_brief';
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
                      const isStaleCancelledAssistantStatus = !isUser && hasLaterUserMessage && traceToRender?.status === 'cancelled';
                      if (isAutomaticBrief && activeSession) {
                        return (
                          <AutomaticInvestigationBrief
                            key={message.id}
                            session={activeSession}
                            message={message}
                            timestampLabel={formatMessageTime(message.timestamp)}
                            t={t}
                          />
                        );
                      }
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
                                setTraceExpandedByRunId((current) => ({
                                  ...current,
                                  [runId]: expanded
                                }));
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
                        (!automaticInvestigationsEnabled || isMessageOwnedByCurrentUser(activeSession, message, currentUserId)) &&
                        (userTurnTrace?.status === 'cancelled' || userTurnTrace?.status === 'failed');
                      const isEditingMessage = editingMessageId === message.id;

                      return (
                        <UserMessageTurn
                          key={message.id}
                          message={message}
                          markdownComponents={userMarkdownComponents}
                          timestampLabel={formatMessageTime(message.timestamp)}
                          showAuthor={automaticInvestigationsEnabled && activeSession?.origin === 'auto_triage'}
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

              {hasReadyAiRuntime ? (
                <TargetChatComposer
                  allowedReasoningOptions={allowedReasoningOptions}
                  assistantCapabilitiesPreview={assistantCapabilitiesPreview}
                  assistantCapabilitiesPreviewError={assistantCapabilitiesPreviewError}
                  targetMentionsEnabled={targetMentionsEnabled}
                  canChat={canChat}
                  canCancelActiveRun={canCancelActiveRun}
                  canPost={canPost}
                  subject={subject}
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
                />
              ) : visibleMessages.length > 0 ? (
                <TargetAssistantReadinessState compact status={aiRuntimeReadiness.status} canManageAiSettings={canManageAiSettings} onOpenAiSettings={onOpenAiSettings} t={t} />
              ) : null}
            </>
          )}
        </div>

        <DrawerFrame
          unframed
          isOpen={!isPanel && isHistoryOpen && usesOverlayHistory}
          onClose={() => setIsHistoryOpen(false)}
          ariaLabel={t(automaticInvestigationsEnabled && historyView === 'investigations' ? 'chat.investigations' : 'chat.chats')}
          titleId={mobileHistoryPanelId}
          id={mobileHistoryPanelId}
          initialFocusRef={historyPanelRef}
          side="left"
          containerClassName="absolute z-[110] lg:hidden"
          overlayClassName="bg-ui-text/20 dark:bg-ui-bg/65"
          className="ml-12 h-full w-[min(21rem,calc(100vw-5rem))] max-w-none border-l-0 bg-ui-surface shadow-xl outline-none"
        >
          <ConversationHistory
            appName={subject.name}
            sessions={sessions}
            sessionOrigin={automaticInvestigationsEnabled
              ? historyView === 'investigations' ? 'auto_triage' : 'manual'
              : undefined}
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
        </DrawerFrame>

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
