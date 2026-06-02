import React from 'react';
import { useTargetChat } from '@/features/kubernetes-cluster-detail/hooks/useTargetChat';
import type { TargetChatController } from '@/features/kubernetes-cluster-detail/hooks/useTargetChat';
import { ChatSession, KubernetesCluster, Workspace } from '@/types';

interface AppClusterChatRuntimeProps {
  cluster: KubernetesCluster | null;
  currentUserId: string;
  currentUserRole: Workspace['members'][number]['role'];
  currentWorkspacePermissions?: Workspace['permissions'];
  initialActiveSessionId?: string | null;
  isChatActive: boolean;
  onConversationDeleted?: (sessionName: string, targetName: string) => void;
  onUpdateSessions: (clusterId: string, sessions: ChatSession[]) => void;
  children: (controller: TargetChatController | null) => React.ReactNode;
}

interface AppClusterChatRuntimeInnerProps extends Omit<AppClusterChatRuntimeProps, 'cluster' | 'children'> {
  cluster: KubernetesCluster;
  children: (controller: TargetChatController) => React.ReactNode;
}

const AppClusterChatRuntimeInner: React.FC<AppClusterChatRuntimeInnerProps> = ({
  cluster,
  currentUserId,
  currentWorkspacePermissions,
  initialActiveSessionId,
  isChatActive,
  onConversationDeleted,
  onUpdateSessions,
  children
}) => {
  const canChat = Boolean(currentWorkspacePermissions?.create_sessions && currentWorkspacePermissions.create_read_only_runs);
  const canRequestWriteRuns = Boolean(currentWorkspacePermissions?.create_read_write_runs);

  const controller = useTargetChat({
    target: cluster,
    currentUserId,
    canChat,
    canRequestWriteRuns,
    isChatActive,
    onUpdateSessions: (sessions) => onUpdateSessions(cluster.id, sessions),
    onSessionDeleted: (session) => {
      onConversationDeleted?.(session.name, cluster.name);
    },
    initialActiveSessionId
  });

  return <>{children(controller)}</>;
};

export const AppClusterChatRuntime: React.FC<AppClusterChatRuntimeProps> = ({
  cluster,
  children,
  ...props
}) => {
  if (!cluster) {
    return <>{children(null)}</>;
  }

  return (
    <AppClusterChatRuntimeInner key={cluster.id} cluster={cluster} {...props}>
      {children}
    </AppClusterChatRuntimeInner>
  );
};
