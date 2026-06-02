import { ClusterToolCatalogItem, KubernetesCluster, ProjectMember, Workspace } from '@/types';
import type { TargetChatController } from '@/features/kubernetes-cluster-detail/hooks/useTargetChat';

export interface KubernetesClusterDetailProps {
  cluster: KubernetesCluster;
  requestedView?: View;
  currentUserRole: ProjectMember['role'];
  currentWorkspacePermissions?: Workspace['permissions'];
  workspaceName?: string;
  chatController: TargetChatController;
  isDark: boolean;
  onToggleTool?: (tool: ClusterToolCatalogItem, enabled: boolean) => void | Promise<void>;
  onSyncTools?: (tools: KubernetesCluster['mcpTools']) => void;
  onUpdateNamespaceScope?: (scope: { include: string[]; exclude: string[] }) => Promise<void> | void;
  onUpdateWriteConfirmationPolicy?: (overrideRequired: boolean | null) => Promise<void> | void;
  onOpenCopilot?: (prompt?: string) => void;
  onActiveViewChange?: (view: View) => void;
}

export type View = 'overview' | 'resources' | 'mcpServers' | 'chat' | 'settings';

export type RunTraceStatus = 'connecting' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface RunTraceStep {
  id: string;
  label: string;
  detail?: string;
  status: 'info' | 'success' | 'error';
  timestamp: number;
}

export interface RunTraceToolCall {
  callId: string;
  tool: string;
  status: 'running' | 'completed';
  isError?: boolean;
}

export interface RunTraceUsage {
  inputTokens: number;
  outputTokens: number;
  toolCalls: number;
}

export interface LiveRunTrace {
  runId: string;
  status: RunTraceStatus;
  steps: RunTraceStep[];
  toolCalls: RunTraceToolCall[];
  usage?: RunTraceUsage;
}
