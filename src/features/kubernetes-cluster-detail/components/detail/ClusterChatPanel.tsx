import React from 'react';
import { ControlledTargetChatView } from '@/features/targets/chat/components/ControlledTargetChatView';
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


  React.useEffect(() => {
    if (!initialPrompt || handledPromptIdRef.current === initialPrompt.id) {
      return;
    }
    handledPromptIdRef.current = initialPrompt.id;
    void chatController.handleCreateSessionWithInput(initialPrompt.text);
    onInitialPromptHandled();
  }, [chatController.handleCreateSessionWithInput, initialPrompt, onInitialPromptHandled]);

  return (
    <ControlledTargetChatView
      controller={chatController}
      subject={target}
      isDark={isDark}
      canChat={canChat}
      canRequestWriteRuns={canRequestWriteRuns}
      canApproveWriteActions={canRequestWriteRuns}
      canCancelRuns={canCancelRuns}
      canDeleteSessions={canDeleteSessions}
      canManageAiSettings={canManageAiSettings}
      assistantMarkdownComponents={assistantMarkdownComponents}
      userMarkdownComponents={userMarkdownComponents}
      footerKey={resolveClusterChatFooterKey(cluster, canRequestWriteRuns)}
      onOpenAiSettings={onOpenAiSettings}
      displayMode="panel"
      onClose={onClose}
      onMaximize={onMaximize}
    />
  );
};
