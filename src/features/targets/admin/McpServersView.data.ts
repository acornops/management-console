import type {
  TargetToolCatalog,
  TargetToolCatalogItem
} from '@/features/targets/admin/targetMcpCatalogTypes';
import type { TargetMcpToolSummary } from '@/features/targets/targetDescriptor';
import type { CapabilitySubject } from '@/features/capabilities/admin';
import {
  controlPlaneApi,
  type CreateTargetMcpServerInput,
  type TargetMcpServer,
  type TargetMcpServerTestConnectionResult,
  type UpdateTargetMcpServerInput
} from '@/services/controlPlaneApi';
import type { AgentTargetAccessPolicyApi, AgentTargetAccessSettingsApi } from '@/services/control-plane/agentApi';

export interface McpServersViewProps {
  subject: CapabilitySubject & { mcpTools?: TargetMcpToolSummary[] };
  canManageMcp?: boolean;
  canManageTools?: boolean;
  canRequestWriteRuns?: boolean;
  initialCatalog?: TargetToolCatalog | null;
  onCatalogChange?: (catalog: TargetToolCatalog) => void;
  onSyncTools?: (tools: TargetMcpToolSummary[]) => void;
  dataSource?: McpServersDataSource;
  connectionDestination?: { kind: 'target' | 'agent'; id: string };
  catalogDestination?: string;
  scheduleCount?: (workspaceId: string, subjectId: string, serverId: string) => Promise<number>;
  targetAccessSettings?: {
    canEdit: boolean;
    load: (workspaceId: string, subjectId: string, serverId: string) => Promise<AgentTargetAccessSettingsApi>;
    save: (workspaceId: string, subjectId: string, serverId: string, policy: AgentTargetAccessPolicyApi) => Promise<AgentTargetAccessSettingsApi>;
  };
}

export interface McpServersDataSource {
  createServer: (workspaceId: string, subjectId: string, input: CreateTargetMcpServerInput) => Promise<TargetMcpServer>;
  deleteServer: (workspaceId: string, subjectId: string, serverId: string) => Promise<void>;
  getCatalog: (workspaceId: string, subjectId: string) => Promise<TargetToolCatalog>;
  listServerTools: (workspaceId: string, subjectId: string, serverId: string, options: { limit: number; cursor?: string; signal: AbortSignal }) => Promise<{ items: TargetToolCatalogItem[]; nextCursor?: string }>;
  testServer: (workspaceId: string, subjectId: string, serverId: string) => Promise<TargetMcpServerTestConnectionResult>;
  updateServer: (workspaceId: string, subjectId: string, serverId: string, input: UpdateTargetMcpServerInput) => Promise<TargetMcpServer>;
  updateServerTool: (workspaceId: string, subjectId: string, serverId: string, toolName: string, input: { enabled: boolean; capability?: 'read' | 'write' }) => Promise<TargetToolCatalogItem>;
}

export const targetMcpServersDataSource: McpServersDataSource = {
  createServer: (workspaceId, subjectId, input) => controlPlaneApi.createTargetMcpServer(workspaceId, subjectId, input),
  deleteServer: (workspaceId, subjectId, serverId) => controlPlaneApi.deleteTargetMcpServer(workspaceId, subjectId, serverId),
  getCatalog: (workspaceId, subjectId) => controlPlaneApi.getTargetMcpCatalog(workspaceId, subjectId),
  listServerTools: (workspaceId, subjectId, serverId, options) => controlPlaneApi.listMcpServerTools(workspaceId, subjectId, serverId, options),
  testServer: (workspaceId, subjectId, serverId) => controlPlaneApi.testTargetMcpServerConnection(workspaceId, subjectId, serverId),
  updateServer: (workspaceId, subjectId, serverId, input) => controlPlaneApi.updateTargetMcpServer(workspaceId, subjectId, serverId, input),
  updateServerTool: (workspaceId, subjectId, serverId, toolName, input) => controlPlaneApi.updateTargetMcpServerTool(workspaceId, subjectId, serverId, toolName, input)
};

export function resolveMcpCatalogPhase(
  catalog: TargetToolCatalog | null,
  catalogError: string | null,
  hasLocalFallbackServers: boolean
): 'loading' | 'error' | 'ready' | 'refreshing' {
  if (!catalog && !catalogError && !hasLocalFallbackServers) return 'loading';
  if (catalogError) return 'error';
  return catalog ? 'ready' : 'refreshing';
}
