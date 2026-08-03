import { TargetChatView } from '@/features/targets/chat/components/TargetChatView';
import type { TargetChatViewProps } from '@/features/targets/chat/components/TargetChatView.types';
import type { TargetChatController } from '@/features/targets/chat/hooks/useTargetChat';

type ControllerProp =
  | 'isConversationOwner'
  | 'conversationNotice'
  | 'sessionDeepLinkError'
  | 'recentActivityWarning'
  | 'isRunActive'
  | 'isSessionsLoading'
  | 'isLoadingEarlierMessages'
  | 'hasEarlierMessages'
  | 'activeRunId'
  | 'isCancellingRun'
  | 'inputValue'
  | 'sessions'
  | 'activeSessionId'
  | 'composerRuntimeSelection'
  | 'workspaceAiSettings'
  | 'isWorkspaceAiSettingsLoading'
  | 'workspaceAiSettingsError'
  | 'visibleMessages'
  | 'runTracesByRunId'
  | 'sessionAssistantStatuses'
  | 'transcriptRef'
  | 'onChatScroll'
  | 'onLoadEarlierMessages'
  | 'onInputChange'
  | 'onComposerRuntimeSelectionChange'
  | 'onSend'
  | 'onEditLastUserMessage'
  | 'onApprove'
  | 'onReject'
  | 'onSelectSession'
  | 'onCreateSession'
  | 'onDismissRecentActivityWarning'
  | 'onOpenRecentActivitySession'
  | 'onDeleteSession'
  | 'onCancelRun'
  | 'isInFlightAssistantPlaceholder';

interface ControlledTargetChatViewProps extends Omit<TargetChatViewProps, ControllerProp> {
  controller: TargetChatController;
}

/** Maps the shared conversation controller to the shared presentation surface. */
export function ControlledTargetChatView({ controller, ...props }: ControlledTargetChatViewProps) {
  return (
    <TargetChatView
      {...props}
      isConversationOwner={controller.isActiveSessionOwner}
      conversationNotice={controller.conversationNotice}
      sessionDeepLinkError={controller.sessionDeepLinkError}
      recentActivityWarning={controller.recentActivityWarning}
      isRunActive={controller.isRunActive}
      isSessionsLoading={controller.isSessionsLoading}
      isLoadingEarlierMessages={controller.isLoadingEarlierMessages}
      hasEarlierMessages={controller.hasEarlierMessages}
      activeRunId={controller.activeRunId}
      isCancellingRun={controller.isCancellingRun}
      inputValue={controller.inputValue}
      sessions={controller.sessions}
      activeSessionId={controller.activeSessionId}
      composerRuntimeSelection={controller.composerRuntimeSelection}
      workspaceAiSettings={controller.workspaceAiSettings}
      isWorkspaceAiSettingsLoading={controller.isWorkspaceAiSettingsLoading}
      workspaceAiSettingsError={controller.workspaceAiSettingsError}
      visibleMessages={controller.visibleMessages}
      runTracesByRunId={controller.runTracesByRunId}
      sessionAssistantStatuses={controller.sessionAssistantStatuses}
      transcriptRef={controller.transcriptRef}
      onChatScroll={controller.handleChatScroll}
      onLoadEarlierMessages={controller.handleLoadEarlierMessages}
      onInputChange={controller.setInputValue}
      onComposerRuntimeSelectionChange={controller.setComposerRuntimeSelection}
      onSend={controller.handleSend}
      onEditLastUserMessage={controller.handleEditLastUserMessage}
      onApprove={controller.handleApprove}
      onReject={controller.handleReject}
      onSelectSession={controller.setActiveSessionId}
      onCreateSession={controller.handleCreateSession}
      onDismissRecentActivityWarning={controller.handleDismissRecentActivityWarning}
      onOpenRecentActivitySession={controller.handleOpenRecentActivitySession}
      onDeleteSession={controller.handleDeleteSession}
      onCancelRun={controller.handleCancelRun}
      isInFlightAssistantPlaceholder={controller.isInFlightAssistantPlaceholder}
    />
  );
}
