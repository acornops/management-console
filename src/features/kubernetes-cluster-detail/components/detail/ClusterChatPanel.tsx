import React from 'react';
import { TargetChatView } from '@/features/kubernetes-cluster-detail/components/detail/views/TargetChatView';
import { resolveClusterChatFooterKey } from '@/features/kubernetes-cluster-detail/components/detail/views/targetChatViewHelpers';
import { createMarkdownComponents } from '@/features/kubernetes-cluster-detail/lib/markdown';
import type { TargetChatController } from '@/features/kubernetes-cluster-detail/hooks/useTargetChat';
import { KubernetesCluster, Workspace } from '@/types';

interface InitialPrompt {
  id: number;
  text: string;
}

interface ClusterChatPanelProps {
  cluster: KubernetesCluster;
  currentUserRole: Workspace['members'][number]['role'];
  currentWorkspacePermissions?: Workspace['permissions'];
  chatController: TargetChatController;
  initialPrompt: InitialPrompt | null;
  isDark: boolean;
  onClose: () => void;
  onMaximize: () => void;
  onOpenAiSettings: () => void;
  onInitialPromptHandled: () => void;
}

export const ClusterChatPanel: React.FC<ClusterChatPanelProps> = ({
  cluster,
  currentWorkspacePermissions,
  chatController,
  initialPrompt,
  isDark,
  onClose,
  onMaximize,
  onOpenAiSettings,
  onInitialPromptHandled
}) => {
  const handledPromptIdRef = React.useRef<number | null>(null);
  const assistantMarkdownComponents = React.useMemo(() => createMarkdownComponents('assistant'), []);
  const userMarkdownComponents = React.useMemo(() => createMarkdownComponents('user'), []);

  const canChat = Boolean(currentWorkspacePermissions?.create_sessions && currentWorkspacePermissions.create_read_only_runs);
  const canRequestWriteRuns = Boolean(currentWorkspacePermissions?.create_read_write_runs);
  const canCancelRuns = Boolean(currentWorkspacePermissions?.cancel_runs);
  const canDeleteSessions = Boolean(currentWorkspacePermissions?.delete_sessions);
  const canManageAiSettings = Boolean(currentWorkspacePermissions?.manage_ai_settings);

  const {
    sessions,
    activeSessionId,
    isActiveSessionOwner,
    conversationNotice,
    recentActivityWarning,
    inputValue,
    isRunActive,
    isSessionsLoading,
    isLoadingEarlierMessages,
    hasEarlierMessages,
    activeRunId,
    isCancellingRun,
    visibleMessages,
    runTracesByRunId,
    sessionAssistantStatuses,
    transcriptRef,
    setActiveSessionId,
    handleCreateSession,
    handleDismissRecentActivityWarning,
    handleOpenRecentActivitySession,
    handleDeleteSession,
    handleCancelRun,
    setInputValue,
    handleChatScroll,
    handleLoadEarlierMessages,
    handleSend,
    handleSendInNewSession,
    handleEditLastUserMessage,
    handleApprove,
    handleReject,
    isInFlightAssistantPlaceholder
  } = chatController;

  React.useEffect(() => {
    if (!initialPrompt || handledPromptIdRef.current === initialPrompt.id) {
      return;
    }
    handledPromptIdRef.current = initialPrompt.id;
    void handleSendInNewSession(initialPrompt.text);
    onInitialPromptHandled();
  }, [handleSendInNewSession, initialPrompt, onInitialPromptHandled]);

  return (
    <TargetChatView
      target={cluster}
      isDark={isDark}
      canChat={canChat}
      isConversationOwner={isActiveSessionOwner}
      conversationNotice={conversationNotice}
      recentActivityWarning={recentActivityWarning}
      canRequestWriteRuns={canRequestWriteRuns}
      canApproveWriteActions={canRequestWriteRuns}
      canCancelRuns={canCancelRuns}
      canDeleteSessions={canDeleteSessions}
      canManageAiSettings={canManageAiSettings}
      isRunActive={isRunActive}
      isSessionsLoading={isSessionsLoading}
      isLoadingEarlierMessages={isLoadingEarlierMessages}
      hasEarlierMessages={hasEarlierMessages}
      activeRunId={activeRunId}
      isCancellingRun={isCancellingRun}
      inputValue={inputValue}
      sessions={sessions}
      activeSessionId={activeSessionId}
      assistantMarkdownComponents={assistantMarkdownComponents}
      userMarkdownComponents={userMarkdownComponents}
      visibleMessages={visibleMessages}
      runTracesByRunId={runTracesByRunId}
      sessionAssistantStatuses={sessionAssistantStatuses}
      transcriptRef={transcriptRef}
      footerKey={resolveClusterChatFooterKey(cluster, canRequestWriteRuns)}
      onChatScroll={handleChatScroll}
      onLoadEarlierMessages={handleLoadEarlierMessages}
      onOpenAiSettings={onOpenAiSettings}
      onInputChange={setInputValue}
      onSend={handleSend}
      onEditLastUserMessage={handleEditLastUserMessage}
      onApprove={handleApprove}
      onReject={handleReject}
      onSelectSession={setActiveSessionId}
      onCreateSession={handleCreateSession}
      onDismissRecentActivityWarning={handleDismissRecentActivityWarning}
      onOpenRecentActivitySession={handleOpenRecentActivitySession}
      onDeleteSession={handleDeleteSession}
      onCancelRun={handleCancelRun}
      isInFlightAssistantPlaceholder={isInFlightAssistantPlaceholder}
      displayMode="panel"
      onClose={onClose}
      onMaximize={onMaximize}
    />
  );
};
