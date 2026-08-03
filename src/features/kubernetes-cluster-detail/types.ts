import { KubernetesCluster, ProjectMember, Workspace } from '@/types';
import type { TargetChatController } from '@/features/targets/chat/hooks/useTargetChat';
import type { ControlPlaneTargetIssueSummary } from '@/services/controlPlaneApi';
import type { RunPermissionMode } from '@/services/control-plane/runPermissionTypes';

export interface KubernetesClusterDetailProps {
  cluster: KubernetesCluster;
  requestedView?: View;
  currentUserRole: ProjectMember['role'];
  currentWorkspacePermissions?: Workspace['permissions'];
  workspaceName?: string;
  chatController: TargetChatController;
  issueSummary: ControlPlaneTargetIssueSummary | null;
  isDark: boolean;
  onSyncTools?: (tools: KubernetesCluster['mcpTools']) => void;
  onUpdateName?: (name: string) => Promise<void> | void;
  onUpdateNamespaceScope?: (scope: { include: string[]; exclude: string[] }) => Promise<void> | void;
  onUpdatePermissionMode?: (permissionMode: RunPermissionMode) => Promise<void> | void;
  onReinstallAgent?: () => void;
  onDeleteCluster?: () => Promise<void> | void;
  onOpenAiSettings: () => void;
  onOpenCopilot?: (prompt?: string) => void;
  onActiveViewChange?: (view: View) => void;
}

export type View = 'overview' | 'resources' | 'mcpServers' | 'skills' | 'tools' | 'chat' | 'settings';
