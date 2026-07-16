import React from 'react';
import { TargetChatView } from '@/features/targets/chat/components/TargetChatView';
import { useTargetChat } from '@/features/targets/chat/hooks/useTargetChat';
import { createMarkdownComponents } from '@/features/targets/chat/lib/markdown';
import { toVirtualMachineTargetDescriptor } from '@/features/targets/targetDescriptor';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import { ChatSession, Workspace } from '@/types';

interface VirtualMachineChatViewProps {
  vm: ControlPlaneVirtualMachine;
  workspace: Workspace;
  currentUserId: string;
  isDark: boolean;
  initialInputValue?: string;
  onOpenAiSettings: () => void;
  onInitialInputConsumed?: () => void;
}

const suggestionKeys = [
  'virtualMachines.chat.suggestions.unhealthyServices',
  'virtualMachines.chat.suggestions.hostLogErrors',
  'virtualMachines.chat.suggestions.networkListeners',
  'virtualMachines.chat.suggestions.processHealth'
];

export const VirtualMachineChatView: React.FC<VirtualMachineChatViewProps> = ({
  vm,
  workspace,
  currentUserId,
  isDark,
  initialInputValue,
  onOpenAiSettings,
  onInitialInputConsumed
}) => {
  const [chatSessions, setChatSessions] = React.useState<ChatSession[]>([]);
  const assistantMarkdownComponents = React.useMemo(() => createMarkdownComponents('assistant'), []);
  const userMarkdownComponents = React.useMemo(() => createMarkdownComponents('user'), []);
  const initialActiveSessionId = React.useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session');
    return session && session.trim().length > 0 ? session : null;
  }, [vm.id]);
  const target = React.useMemo(
    () => toVirtualMachineTargetDescriptor(vm, chatSessions),
    [chatSessions, vm]
  );
  const permissions = workspace.permissions;
  const canChat = Boolean(permissions?.create_sessions && permissions.create_read_only_runs);
  const canCancelRuns = Boolean(permissions?.cancel_runs);
  const canDeleteSessions = Boolean(permissions?.delete_sessions);
  const canManageAiSettings = Boolean(permissions?.manage_ai_settings);
  const controller = useTargetChat({
    target,
    currentUserId,
    canChat,
    canRequestWriteRuns: false,
    isChatActive: true,
    initialActiveSessionId,
    onUpdateSessions: setChatSessions
  });
  const { setInputValue } = controller;

  React.useEffect(() => {
    const prompt = initialInputValue?.trim();
    if (!prompt) return;
    setInputValue(prompt);
    onInitialInputConsumed?.();
  }, [initialInputValue, onInitialInputConsumed, setInputValue]);

  return (
    <TargetChatView
      target={target}
      isDark={isDark}
      titleKey="virtualMachines.chat.title"
      descriptionKey="virtualMachines.chat.description"
      promptTitleKey="virtualMachines.chat.promptTitle"
      promptBodyKey="virtualMachines.chat.promptBody"
      suggestionKeys={suggestionKeys}
      inputPlaceholderKey="virtualMachines.chat.inputPlaceholder"
      noChatAccessKey="virtualMachines.chat.noChatAccess"
      footerKey="virtualMachines.chat.footer"
      footerNoAccessKey="chat.footerNoAccess"
      canChat={canChat}
      isConversationOwner={controller.isActiveSessionOwner}
      conversationNotice={controller.conversationNotice}
      recentActivityWarning={controller.recentActivityWarning}
      canRequestWriteRuns={false}
      canApproveWriteActions={false}
      canCancelRuns={canCancelRuns}
      canDeleteSessions={canDeleteSessions}
      canManageAiSettings={canManageAiSettings}
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
      workspaceAiSettingsRefreshToken={controller.workspaceAiSettingsRefreshToken}
      assistantMarkdownComponents={assistantMarkdownComponents}
      userMarkdownComponents={userMarkdownComponents}
      visibleMessages={controller.visibleMessages}
      runTracesByRunId={controller.runTracesByRunId}
      transcriptRef={controller.transcriptRef}
      onChatScroll={controller.handleChatScroll}
      onLoadEarlierMessages={controller.handleLoadEarlierMessages}
      onOpenAiSettings={onOpenAiSettings}
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
};
