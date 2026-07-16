import { KubernetesCluster, ProjectMember, Workspace } from '@/types';
import type { TargetChatController } from '@/features/targets/chat/hooks/useTargetChat';
import type { ControlPlaneTargetIssueSummary } from '@/services/controlPlaneApi';

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
  onUpdateWriteConfirmationPolicy?: (overrideRequired: boolean | null) => Promise<void> | void;
  onReinstallAgent?: () => void;
  onOpenAiSettings: () => void;
  onOpenCopilot?: (prompt?: string) => void;
  onActiveViewChange?: (view: View) => void;
}

export type View = 'overview' | 'resources' | 'mcpServers' | 'skills' | 'tools' | 'chat' | 'settings';
