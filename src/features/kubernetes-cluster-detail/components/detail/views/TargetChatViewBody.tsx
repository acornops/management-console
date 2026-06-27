import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { TFunction } from 'i18next';
import { History, Plus, Upload } from 'lucide-react';
import type { Components } from 'react-markdown';
import { Button } from '@/components/common/Button';
import { Tooltip } from '@/components/common/Tooltip';
import { ConversationHistory } from '@/features/kubernetes-cluster-detail/components/detail/ConversationHistory';
import { LiveRunTrace } from '@/features/kubernetes-cluster-detail/types';
import { AssistantTurn } from '@/features/kubernetes-cluster-detail/components/detail/views/AssistantTurn';
import { TargetChatComposer } from '@/features/kubernetes-cluster-detail/components/detail/views/TargetChatComposer';
import { TargetChatPanelControls } from '@/features/kubernetes-cluster-detail/components/detail/views/TargetChatPanelControls';
import { ChatEmptyPrompt, ChatTranscriptLoadError, ChatTranscriptSkeleton } from '@/features/kubernetes-cluster-detail/components/detail/views/ChatTranscriptStates';
import { DeleteConversationDialog } from '@/features/kubernetes-cluster-detail/components/detail/views/DeleteConversationDialog';
import { UserMessageTurn } from '@/features/kubernetes-cluster-detail/components/detail/views/UserMessageTurn';
import {
  ComposerAttachment,
  ComposerModelOption,
  formatMessageTime
} from '@/features/kubernetes-cluster-detail/components/detail/views/targetChatViewHelpers';
import type { ChatMessage, ChatSession, KubernetesCluster, ReasoningEffort } from '@/types';
import type { AssistantNavStatus } from '@/app/assistantNavStatus';
import type { ControlPlaneTargetAssistantToolPreview } from '@/services/control-plane/types';

export interface TargetChatViewBodyProps {
  activeRunId: string | null;
  activeSession: ChatSession | null;
  activeSessionId: string | null;
  allowedReasoningOptions: Array<{ value: string; labelKey: string }>;
  assistantMarkdownComponents: Components;
  assistantToolPreview: ControlPlaneTargetAssistantToolPreview | null;
  assistantToolPreviewError: string;
  canApproveWriteActions: boolean;
  canCancelActiveRun: boolean;
  canChat: boolean;
  canDeleteSessions: boolean;
  canPost: boolean;
  cluster: KubernetesCluster;
  composerActionLabel: string;
  composerAttachmentNotice: string;
  composerAttachments: ComposerAttachment[];
  composerModelOptions: ComposerModelOption[];
  composerRootRef: React.RefObject<HTMLDivElement | null>;
  composerSubmitUnavailableReason: string;
  composerTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  conversationNotice: string | null;
  deleteSessionError: string | null;
  deleteTargetSession: ChatSession | null;
  deletingSessionId: string | null;
  desktopHistoryPanelId: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  hasComposerSubmitPayload: boolean;
  hasConversationLoadError: boolean;
  hasEarlierMessages: boolean;
  handleAttachmentInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  handleChatWindowDragEnter: (event: React.DragEvent<HTMLDivElement>) => void;
  handleChatWindowDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  handleChatWindowDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  handleChatWindowDrop: (event: React.DragEvent<HTMLDivElement>) => void | Promise<void>;
  handleComposerKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleCreateSessionClick: () => void;
  handleModelAndEffortChange: (value: ReasoningEffort) => void;
  handleModelChange: (option: ComposerModelOption) => void;
  historyButtonRef: React.RefObject<HTMLButtonElement | null>;
  historyControlLabel: string;
  historyPanelRef: React.RefObject<HTMLElement | null>;
  inputValue: string;
  isAssistantToolPreviewLoading: boolean;
  isCancellingRun: boolean;
  isComposerRuntimeUnavailable: boolean;
  isFileDragActive: boolean;
  isHistoryOpen: boolean;
  isLoadingEarlierMessages: boolean;
  isModelMenuOpen: boolean;
  isModelSubmenuOpen: boolean;
  isPanel: boolean;
  isRunActive: boolean;
  isSessionsLoading: boolean;
  isSubmittingEdit: boolean;
  isWorkspaceAiSettingsLoading: boolean;
  lastUserMessageIndex: number;
  mobileHistoryPanelId: string;
  modelMenuPanelId: string;
  modelMenuRef: React.RefObject<HTMLDivElement | null>;
  modelSelectorId: string;
  modelSubmenuButtonId: string;
  modelSubmenuPanelId: string;
  newChatUnavailableReason: string;
  onApprove: (approvalId: string) => void | Promise<void>;
  onCancelRun: () => Promise<void>;
  onChatScroll: () => void;
  onDismissRecentActivityWarning: () => void;
  onInputChange: (value: string) => void;
  onLoadEarlierMessages: () => void | Promise<void>;
  onOpenRecentActivitySession: (sessionId: string) => void;
  onReject: (approvalId: string) => void | Promise<void>;
  onClose?: () => void;
  onMaximize?: () => void;
  recentActivityWarning: ChatSession['recentActivityWarning'] | null;
  removeComposerAttachment: (attachmentId: string) => void;
  requestedToolAccessMode: 'read_only' | 'read_write';
  resolvedDescriptionKey: string;
  resolvedFooterKey: string;
  resolvedFooterNoAccessKey: string;
  resolvedInputPlaceholderKey: string;
  resolvedNoChatAccessKey: string;
  resolvedPromptBodyKey: string;
  resolvedPromptTitleKey: string;
  resolvedSuggestionKeys: string[];
  runTracesByRunId: Record<string, LiveRunTrace>;
  selectSession: (sessionId: string) => void;
  selectedEffort: ReasoningEffort;
  selectedEffortLabel: string;
  selectedModel: string;
  selectedModelLabel: string;
  selectedProvider: string;
  sendText: (text: string) => void | Promise<void>;
  sessionAssistantStatuses: Record<string, AssistantNavStatus>;
  sessions: ChatSession[];
  setEditingMessageValue: React.Dispatch<React.SetStateAction<string>>;
  setIsHistoryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsModelMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsModelSubmenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setTraceExpandedByRunId: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  shouldShowTranscriptSkeleton: boolean;
  submitComposerMessage: () => void | Promise<void>;
  t: TFunction;
  title: string;
  traceExpandedByRunId: Record<string, boolean>;
  transcriptRef: (node: HTMLDivElement | null) => void;
  userMarkdownComponents: Components;
  userTurnRunIdsByIndex: Map<number, string | undefined>;
  visibleMessages: ChatMessage[];
  workspaceAiSettingsError: string;
  startEditingMessage: (messageId: string, content: string) => void;
  cancelEditingMessage: () => void;
  closeDeleteSessionModal: () => void;
  confirmDeleteSession: () => void | Promise<void>;
  editingMessageId: string | null;
  editingMessageValue: string;
  isInFlightAssistantPlaceholder: (message: ChatMessage) => boolean;
  openDeleteSessionModal: (sessionId: string) => void;
  submitEditedMessage: (messageId: string) => void | Promise<void>;
}

export const TargetChatViewBody: React.FC<TargetChatViewBodyProps> = (props) => {
  const {
    activeRunId,
    activeSession,
    activeSessionId,
    allowedReasoningOptions,
    assistantMarkdownComponents,
    assistantToolPreview,
    assistantToolPreviewError,
    canApproveWriteActions,
    canCancelActiveRun,
    canChat,
    canDeleteSessions,
    canPost,
    cluster,
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
    isAssistantToolPreviewLoading,
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
    onInputChange,
    onLoadEarlierMessages,
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

  return (
    <div
      className="flex-1 flex min-w-0 overflow-hidden bg-ui-bg relative"
      onDragEnter={handleChatWindowDragEnter}
      onDragOver={handleChatWindowDragOver}
      onDragLeave={handleChatWindowDragLeave}
      onDrop={(event) => void handleChatWindowDrop(event)}
    >
      <AnimatePresence>
        {isFileDragActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute inset-0 z-[140] flex items-center justify-center bg-ui-bg/75 p-6 backdrop-blur-[2px]"
          >
            <div className="flex min-h-48 w-full max-w-2xl flex-col items-center justify-center rounded-2xl border border-dashed border-accent/50 bg-accent/10 px-8 py-10 text-center shadow-lg shadow-ui-text/5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-ui-surface text-accent-strong">
                <Upload className="h-5 w-5" />
              </div>
              <p className="mt-4 text-base font-semibold text-ui-text">
                {canPost && !isRunActive ? t('chat.dropFilesTitle') : t('chat.dropFilesUnavailableTitle')}
              </p>
              <p className="mt-2 max-w-md text-sm font-medium leading-6 text-ui-text-muted">
                {canPost && !isRunActive ? t('chat.dropFilesBody') : t(resolvedNoChatAccessKey)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
                <TargetChatPanelControls onClose={onClose} onMaximize={onMaximize} t={t} />
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
                      onClick={handleCreateSessionClick}
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

        <TargetChatComposer
          allowedReasoningOptions={allowedReasoningOptions}
          assistantToolPreview={assistantToolPreview}
          assistantToolPreviewError={assistantToolPreviewError}
          canChat={canChat}
          canCancelActiveRun={canCancelActiveRun}
          canPost={canPost}
          cluster={cluster}
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
          isAssistantToolPreviewLoading={isAssistantToolPreviewLoading}
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
          onDismissRecentActivityWarning={onDismissRecentActivityWarning}
          onInputChange={onInputChange}
          onOpenRecentActivitySession={onOpenRecentActivitySession}
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
          submitComposerMessage={submitComposerMessage}
          t={t}
          workspaceAiSettingsError={workspaceAiSettingsError}
        />
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
