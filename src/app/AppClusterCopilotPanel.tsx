import React from 'react';
import { useTranslation } from 'react-i18next';
import { AssistantDockFrame } from '@/app/AssistantDockFrame';
import { ClusterChatPanel } from '@/features/kubernetes-cluster-detail/components/detail/ClusterChatPanel';
import type { TargetChatController } from '@/features/targets/chat/hooks/useTargetChat';
import { KubernetesCluster, Workspace } from '@/types';
import { AppPaths, withAssistantSession } from '@/utils/routes';

interface AppClusterCopilotPanelProps {
  cluster: KubernetesCluster | null;
  chatController: TargetChatController | null;
  currentUserRole: Workspace['members'][number]['role'];
  currentWorkspacePermissions?: Workspace['permissions'];
  initialPrompt: { id: number; text: string } | null;
  isDark: boolean;
  isOpen: boolean;
  width: number;
  navigate: (path: string) => void;
  onClose: () => void;
  onInitialPromptHandled: () => void;
  onResizeWidth: (width: number) => void;
}

export const AppClusterCopilotPanel: React.FC<AppClusterCopilotPanelProps> = ({
  cluster,
  chatController,
  currentUserRole,
  currentWorkspacePermissions,
  initialPrompt,
  isDark,
  isOpen,
  width,
  navigate,
  onClose,
  onInitialPromptHandled,
  onResizeWidth
}) => {
  const { t } = useTranslation();
  if (!cluster || !chatController) return null;

  return (
    <AssistantDockFrame
      ariaLabel={t('app.clusterAssistant')}
      dockId="cluster"
      isOpen={isOpen}
      resizeLabel={t('app.resizeClusterAssistant')}
      width={width}
      onClose={onClose}
      onWidthChange={onResizeWidth}
    >
      <ClusterChatPanel
        cluster={cluster}
        chatController={chatController}
        currentUserRole={currentUserRole}
        currentWorkspacePermissions={currentWorkspacePermissions}
        initialPrompt={initialPrompt}
        isDark={isDark}
        onClose={onClose}
        onMaximize={() => {
          onClose();
          navigate(AppPaths.workspaceKubernetesClusterDiagnostics(cluster.workspaceId, cluster.id, 'chat'));
        }}
        onOpenAiSettings={() => {
          onClose();
          const returnTo = withAssistantSession(
            AppPaths.workspaceKubernetesClusterDiagnostics(cluster.workspaceId, cluster.id, 'chat'),
            chatController.activeSessionId
          );
          navigate(AppPaths.workspaceAiSettings(cluster.workspaceId, returnTo));
        }}
        onInitialPromptHandled={onInitialPromptHandled}
      />
    </AssistantDockFrame>
  );
};
