import React from 'react';
import { TargetChatView } from '@/features/targets/chat/components/TargetChatView';
import { resolveClusterChatFooterKey } from '@/features/kubernetes-cluster-detail/components/detail/clusterChatFooter';
import { createMarkdownComponents } from '@/features/targets/chat/lib/markdown';
import type { TargetChatController } from '@/features/targets/chat/hooks/useTargetChat';
import { toKubernetesTargetDescriptor } from '@/features/targets/targetDescriptor';
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
  const target = React.useMemo(() => toKubernetesTargetDescriptor(cluster), [cluster]);

  const canChat = Boolean(currentWorkspacePermissions?.create_sessions && currentWorkspacePermissions.create_read_only_runs);
  const canRequestWriteRuns = Boolean(currentWorkspacePermissions?.create_read_write_runs);
  const canCancelRuns = Boolean(currentWorkspacePermissions?.cancel_runs);
  const canDeleteSessions = Boolean(currentWorkspacePermissions?.delete_sessions);
  const canManageAiSettings = Boolean(currentWorkspacePermissions?.manage_ai_settings);

  const {
    sessions,
    activeSessionId,
    composerRuntimeSelection,
    workspaceAiSettings,
    isWorkspaceAiSettingsLoading,
    workspaceAiSettingsError,
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
    setComposerRuntimeSelection,
    handleCreateSessionWithInput,
    handleChatScroll,
    handleLoadEarlierMessages,
    handleSend,
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
    void handleCreateSessionWithInput(initialPrompt.text);
    onInitialPromptHandled();
  }, [handleCreateSessionWithInput, initialPrompt, onInitialPromptHandled]);

  return (
    <TargetChatView
      target={target}
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
      composerRuntimeSelection={composerRuntimeSelection}
      workspaceAiSettings={workspaceAiSettings}
      isWorkspaceAiSettingsLoading={isWorkspaceAiSettingsLoading}
      workspaceAiSettingsError={workspaceAiSettingsError}
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
      onComposerRuntimeSelectionChange={setComposerRuntimeSelection}
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
