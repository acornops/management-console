import React from 'react';
import { useTargetChat } from '@/features/targets/chat/hooks/useTargetChat';
import type { TargetChatController } from '@/features/targets/chat/hooks/useTargetChat';
import { useConversationAssistantStatuses } from '@/features/targets/chat/hooks/useConversationAssistantStatuses';
import { toKubernetesTargetDescriptor } from '@/features/targets/targetDescriptor';
import { ChatSession, KubernetesCluster, Workspace } from '@/types';
import { deriveAssistantRuntimeStatus, type AssistantNavStatus } from '@/app/assistantNavStatus';

interface AppClusterChatRuntimeProps {
  cluster: KubernetesCluster | null;
  currentUserId: string;
  currentUserRole: Workspace['members'][number]['role'];
  currentWorkspacePermissions?: Workspace['permissions'];
  initialActiveSessionId?: string | null;
  isChatActive: boolean;
  onAssistantRuntimeStatusChange?: (status: AssistantNavStatus) => void;
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
  onAssistantRuntimeStatusChange,
  onConversationDeleted,
  onUpdateSessions,
  children
}) => {
  const canChat = Boolean(currentWorkspacePermissions?.create_sessions && currentWorkspacePermissions.create_read_only_runs);
  const canRequestWriteRuns = Boolean(currentWorkspacePermissions?.create_read_write_runs);
  const target = React.useMemo(() => toKubernetesTargetDescriptor(cluster), [cluster]);

  const controller = useTargetChat({
    target,
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
  const assistantRuntimeStatus = deriveAssistantRuntimeStatus(controller);
  const sessionAssistantStatuses = useConversationAssistantStatuses({
    activeSessionId: controller.activeSessionId,
    isChatVisible: isChatActive,
    runTracesByRunId: controller.runTracesByRunId,
    sessions: controller.sessions
  });
  const controllerWithAssistantStatuses = React.useMemo<TargetChatController>(() => ({
    ...controller,
    sessionAssistantStatuses
  }), [controller, sessionAssistantStatuses]);

  React.useEffect(() => {
    onAssistantRuntimeStatusChange?.(assistantRuntimeStatus);
  }, [assistantRuntimeStatus, onAssistantRuntimeStatusChange]);

  return <>{children(controllerWithAssistantStatuses)}</>;
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
