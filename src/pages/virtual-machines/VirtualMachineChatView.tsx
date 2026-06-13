import React from 'react';
import { TargetChatView } from '@/features/kubernetes-cluster-detail/components/detail/views/TargetChatView';
import { useTargetChat } from '@/features/kubernetes-cluster-detail/hooks/useTargetChat';
import { createMarkdownComponents } from '@/features/kubernetes-cluster-detail/lib/markdown';
import { controlPlaneApi, type ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import { ChatSession, HealthStatus, KubernetesCluster, Workspace } from '@/types';

interface VirtualMachineChatViewProps {
  vm: ControlPlaneVirtualMachine;
  workspace: Workspace;
  currentUserId: string;
  isDark: boolean;
  initialInputValue?: string;
  onInitialInputConsumed?: () => void;
}

const suggestionKeys = [
  'virtualMachines.chat.suggestions.unhealthyServices',
  'virtualMachines.chat.suggestions.hostLogErrors',
  'virtualMachines.chat.suggestions.networkListeners',
  'virtualMachines.chat.suggestions.processHealth'
];

function toVirtualMachineChatTarget(
  vm: ControlPlaneVirtualMachine,
  chatSessions: ChatSession[]
): KubernetesCluster {
  return {
    id: vm.id,
    name: vm.name,
    cluster: vm.hostname || vm.name,
    namespace: 'host',
    workspaceId: vm.workspaceId,
    agentConnectionState: vm.status === 'online' ? 'connected' : 'disconnected',
    owners: [],
    gitlabPipelines: [],
    status: vm.status === 'online' ? HealthStatus.GREEN : vm.status === 'degraded' ? HealthStatus.YELLOW : HealthStatus.RED,
    podStats: { running: 0, failed: 0, pending: 0 },
    metrics: { cpu: 'n/a', memory: 'n/a' },
    lastUpdate: vm.latestSnapshot?.timestamp || vm.updatedAt,
    mcpTools: [],
    chatSessions,
    workloads: [],
    nodes: [],
    namespaces: [],
    services: [],
    ingresses: [],
    pvcs: [],
    alerts: []
  };
}

export const VirtualMachineChatView: React.FC<VirtualMachineChatViewProps> = ({
  vm,
  workspace,
  currentUserId,
  isDark,
  initialInputValue,
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
    () => toVirtualMachineChatTarget(vm, chatSessions),
    [chatSessions, vm]
  );
  const sessionApi = React.useMemo(
    () => ({
      createSession: controlPlaneApi.createTargetSession,
      listSessions: controlPlaneApi.listTargetSessions
    }),
    []
  );
  const permissions = workspace.permissions;
  const canChat = Boolean(permissions?.create_sessions && permissions.create_read_only_runs);
  const canCancelRuns = Boolean(permissions?.cancel_runs);
  const canDeleteSessions = Boolean(permissions?.delete_sessions);
  const controller = useTargetChat({
    target,
    currentUserId,
    canChat,
    canRequestWriteRuns: false,
    isChatActive: true,
    initialActiveSessionId,
    onUpdateSessions: setChatSessions,
    sessionApi
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
      canApproveWriteActions={false}
      canCancelRuns={canCancelRuns}
      canDeleteSessions={canDeleteSessions}
      isRunActive={controller.isRunActive}
      isSessionsLoading={controller.isSessionsLoading}
      isLoadingEarlierMessages={controller.isLoadingEarlierMessages}
      hasEarlierMessages={controller.hasEarlierMessages}
      activeRunId={controller.activeRunId}
      isCancellingRun={controller.isCancellingRun}
      inputValue={controller.inputValue}
      sessions={controller.sessions}
      activeSessionId={controller.activeSessionId}
      assistantMarkdownComponents={assistantMarkdownComponents}
      userMarkdownComponents={userMarkdownComponents}
      visibleMessages={controller.visibleMessages}
      runTracesByRunId={controller.runTracesByRunId}
      transcriptRef={controller.transcriptRef}
      onChatScroll={controller.handleChatScroll}
      onLoadEarlierMessages={controller.handleLoadEarlierMessages}
      onInputChange={controller.setInputValue}
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
