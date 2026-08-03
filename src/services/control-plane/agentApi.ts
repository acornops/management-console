import { requestJson } from './http';
import type { ImportSkillInput, ResolveGitSkillInput } from './skillTypes';

export type AgentStatus = 'draft' | 'active' | 'disabled';
export type AgentProviderType = 'internal' | 'external';
export type RunPermissionMode = 'read_only' | 'ask_before_changes' | 'auto_allowed_changes';
export interface AgentMcpToolApi { name: string; serverId: string; alias: string; description?: string; capability: 'read' | 'write'; enabled: boolean; reviewState: 'pending' | 'approved' | 'rejected'; riskLevel: 'read_only' | 'non_destructive_write' | 'high_risk' | 'destructive'; autoAllowed: boolean }
export interface AgentMcpServerApi { id: string; name: string; url: string; enabled: boolean; isSystem: boolean; canDelete: boolean; canEditConnection: boolean; canToggle: boolean; credentialMode: 'none' | 'workspace' | 'individual'; authType?: string; authHeaderName?: string; authHeaderPrefix?: string; revision: number; provenance?: { sourceId: string; artifactName: string; version: string; digest: string; importedAt: string }; integrationProfileId?: string; integrationProfileVersion?: number; connectionStatus?: string; lastDiscoveryError?: string | null; tools: AgentMcpToolApi[]; inherited?: boolean }
export interface AgentTargetAccessPolicyApi { mode: 'all' | 'allowlist' | 'denylist'; targetIds: string[] }
export interface AgentTargetAccessSettingsApi {
  policy: AgentTargetAccessPolicyApi;
  targets: Array<{
    id: string;
    name: string;
    targetType: 'kubernetes' | 'virtual_machine';
    status: 'online' | 'offline' | 'degraded' | 'unknown';
  }>;
}
export interface WorkspaceNativeToolApi {
  id: string;
  modelAlias: string;
  title: string;
  description: string;
  semanticCapabilityId: string;
  invocationScopes: Array<'workflow' | 'target_chat' | 'agent_chat'>;
  authorizationClass: 'internal_artifact' | 'external_http_read';
  auditOperation: 'read' | 'write';
  approvalOperation: 'read' | 'write';
  configSchema?: Record<string, unknown>;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}
export interface AgentSkillApi { id: string; name: string; description: string; enabled: boolean; revision: number; contentDigest: string; source: { type: 'manual' | 'git' | 'template'; provider?: 'github' | 'gitlab'; url?: string; apiBaseUrl?: string; ref?: string; path?: string; pinnedCommit?: string }; files: Array<{ path: string; content: string; contentDigest: string }>; inherited?: boolean }
export interface ServiceIdentityApi { id: string; workspaceId: string; name: string; status: 'active' | 'disabled'; role: string; createdBy: string; createdAt: string; updatedAt: string }
export interface AgentCapability {
  source: 'builtin_tool' | 'mcp_tool' | 'skill';
  providerAgentId?: string;
  resourceType: string;
  resourceScope: string;
  toolId?: string;
  operation: 'read' | 'write';
  requiresApproval: boolean;
}

export type AgentConversationAccessMode = 'read_only' | 'read_write';
export interface AgentConversationSummaryApi {
  id: string;
  workspaceId: string;
  agentId: string;
  title: string;
  createdBy: string;
  accessMode: AgentConversationAccessMode;
  permissionMode: RunPermissionMode;
  launchedAt?: string;
  createdAt: string;
  expiresAt: string;
  status: 'open' | 'archived';
}
export interface AgentConversationMessageApi {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  runId?: string;
  createdAt: string;
}
export interface AgentConversationRunApi {
  id: string;
  workspaceId: string;
  agentId: string;
  sessionId: string;
  messageId: string;
  toolAccessMode: AgentConversationAccessMode;
  status: string;
  requestedAt: string;
  startedAt: string | null;
  endedAt: string | null;
  errorCode: string | null;
  assistantMessage?: { content?: string };
  events: Array<{
    schema_version: number;
    run_id: string;
    seq: number;
    ts: string;
    type: string;
    payload: Record<string, unknown>;
  }>;
}
export interface AgentConversationApiResponse {
  conversation: AgentConversationSummaryApi;
  messages: AgentConversationMessageApi[];
  runs: AgentConversationRunApi[];
}

export interface AgentDefinitionApi {
  id: string;
  workspaceId: string;
  name: string;
  avatarEmoji: string;
  description?: string;
  instructions?: string;
  status?: AgentStatus;
  reviewState: 'draft' | 'reviewed';
  providerType?: AgentProviderType;
  ownerUserId?: string;
  createdBy: string;
  mcpServers?: string[];
  mcpTools?: Array<{ serverId: string; toolName: string }>;
  mcpInstallations?: AgentMcpServerApi[];
  tools?: string[];
  nativeToolConfigs?: Record<string, Record<string, unknown>>;
  skills?: string[];
  skillInstallations?: AgentSkillApi[];
  permissionMode?: RunPermissionMode;
  semanticCapabilityIds?: string[];
  approvalPolicy?: Record<string, unknown>;
  trustPolicy?: Record<string, unknown>;
  readiness?: { status: 'ready' | 'needs_setup' | 'blocked'; reasons: string[] };
  capabilitySummary?: string;
  capabilities?: AgentCapability[];
  templateRef?: {
    templateId: string;
    recordKey: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export function listAgentConversations(
  workspaceId: string,
  agentId: string
): Promise<AgentConversationSummaryApi[]> {
  return requestJson<{ items: AgentConversationSummaryApi[] }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agentId)}/conversations`
  ).then((response) => response.items);
}

export function createAgentConversation(
  workspaceId: string,
  agentId: string
): Promise<AgentConversationApiResponse> {
  return requestJson<AgentConversationApiResponse>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agentId)}/conversations`,
    { method: 'POST' }
  );
}

export function getAgentConversation(conversationId: string): Promise<AgentConversationApiResponse> {
  return requestJson<AgentConversationApiResponse>(
    `/api/v1/agent-conversations/${encodeURIComponent(conversationId)}`
  );
}

export function deleteAgentConversation(conversationId: string): Promise<void> {
  return requestJson<void>(
    `/api/v1/agent-conversations/${encodeURIComponent(conversationId)}`,
    { method: 'DELETE' }
  );
}

export function changeAgentConversationAccess(
  conversationId: string,
  accessMode: AgentConversationAccessMode
): Promise<AgentConversationSummaryApi> {
  return requestJson<{ conversation: AgentConversationSummaryApi }>(
    `/api/v1/agent-conversations/${encodeURIComponent(conversationId)}/access`,
    { method: 'PATCH', body: JSON.stringify({ accessMode }) }
  ).then((response) => response.conversation);
}

export function postAgentConversationMessage(
  conversationId: string,
  content: string,
  clientRequestId?: string
): Promise<{ message_id: string; run_id: string; status: string }> {
  return requestJson(
    `/api/v1/agent-conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ content, ...(clientRequestId ? { clientRequestId } : {}) })
    }
  );
}

export type AgentCreateInput = Partial<Omit<AgentDefinitionApi, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>> & {
  name: string;
  instructions: string;
};

export type AgentUpdateInput = Partial<AgentCreateInput> & {
  status?: AgentStatus;
};

export function listWorkspaceAgents(workspaceId: string, options: { includeInactive?: boolean } = {}): Promise<AgentDefinitionApi[]> {
  const query = options.includeInactive ? '?includeInactive=true' : '';
  return requestJson<{ items: AgentDefinitionApi[] }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/agents${query}`
  ).then((page) => page.items);
}

export function listWorkspaceNativeTools(workspaceId: string): Promise<WorkspaceNativeToolApi[]> {
  return requestJson<{ items: WorkspaceNativeToolApi[] }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/catalog/native-tools`
  ).then((response) => response.items);
}

export function grantAgentNativeTool(
  workspaceId: string,
  agentId: string,
  toolId: string,
  config?: Record<string, unknown>
): Promise<AgentDefinitionApi> {
  return requestJson<{ agent: AgentDefinitionApi }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agentId)}/native-tools/${encodeURIComponent(toolId)}`,
    {
      method: 'PUT',
      ...(config ? { body: JSON.stringify({ config }) } : {})
    }
  ).then((response) => response.agent);
}

export function revokeAgentNativeTool(workspaceId: string, agentId: string, toolId: string): Promise<AgentDefinitionApi> {
  return requestJson<{ agent: AgentDefinitionApi }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agentId)}/native-tools/${encodeURIComponent(toolId)}`,
    { method: 'DELETE' }
  ).then((response) => response.agent);
}

export function getAgent(workspaceId: string, agentId: string): Promise<AgentDefinitionApi> {
  return requestJson<{ agent: AgentDefinitionApi }>(
    `/api/v1/agents/${encodeURIComponent(agentId)}?workspaceId=${encodeURIComponent(workspaceId)}`
  ).then((response) => response.agent);
}

export function createAgent(workspaceId: string, input: AgentCreateInput): Promise<AgentDefinitionApi> {
  return requestJson<{ agent: AgentDefinitionApi }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/agents`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    }
  ).then((response) => response.agent);
}

export function updateAgent(
  workspaceId: string,
  agentId: string,
  input: AgentUpdateInput
): Promise<AgentDefinitionApi> {
  return requestJson<{ agent: AgentDefinitionApi }>(
    `/api/v1/agents/${encodeURIComponent(agentId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        workspaceId,
        ...input
      })
    }
  ).then((response) => response.agent);
}

export function duplicateAgent(
  workspaceId: string,
  agentId: string,
  name?: string
): Promise<AgentDefinitionApi> {
  return requestJson<{ agent: AgentDefinitionApi }>(
    `/api/v1/agents/${encodeURIComponent(agentId)}/duplicate`,
    {
      method: 'POST',
      body: JSON.stringify({ workspaceId, ...(name?.trim() ? { name: name.trim() } : {}) })
    }
  ).then((response) => response.agent);
}

export function deleteAgent(workspaceId: string, agentId: string): Promise<void> {
  return requestJson<void>(
    `/api/v1/agents/${encodeURIComponent(agentId)}`,
    {
      method: 'DELETE',
      body: JSON.stringify({ workspaceId })
    }
  );
}

const agentCapabilityBase = (workspaceId: string, agentId: string) => `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agentId)}`;

export function listAgentMcpServers(workspaceId: string, agentId: string): Promise<AgentMcpServerApi[]> {
  return requestJson<{ items: AgentMcpServerApi[] }>(`${agentCapabilityBase(workspaceId, agentId)}/mcp/servers`).then((response) => response.items);
}
export function getAgentTargetAccessSettings(workspaceId: string, agentId: string, serverId: string): Promise<AgentTargetAccessSettingsApi> {
  return requestJson<AgentTargetAccessSettingsApi>(`${agentCapabilityBase(workspaceId, agentId)}/mcp/servers/${encodeURIComponent(serverId)}/target-access`);
}
export function updateAgentTargetAccessSettings(workspaceId: string, agentId: string, serverId: string, policy: AgentTargetAccessPolicyApi): Promise<AgentTargetAccessSettingsApi> {
  return requestJson<AgentTargetAccessSettingsApi>(`${agentCapabilityBase(workspaceId, agentId)}/mcp/servers/${encodeURIComponent(serverId)}/target-access`, {
    method: 'PUT',
    body: JSON.stringify(policy)
  });
}
export function createAgentMcpServer(workspaceId: string, agentId: string, input: { name: string; url: string; credentialMode?: 'none' | 'workspace' | 'individual'; authType?: 'none' | 'bearer_token' | 'custom_header' | 'oauth'; authHeaderName?: string }): Promise<AgentMcpServerApi> {
  return requestJson<{ server: AgentMcpServerApi }>(`${agentCapabilityBase(workspaceId, agentId)}/mcp/servers`, { method: 'POST', body: JSON.stringify(input) }).then((response) => response.server);
}
export function updateAgentMcpServer(workspaceId: string, agentId: string, serverId: string, input: Record<string, unknown>): Promise<AgentMcpServerApi> {
  return requestJson<{ server: AgentMcpServerApi }>(`${agentCapabilityBase(workspaceId, agentId)}/mcp/servers/${encodeURIComponent(serverId)}`, { method: 'PATCH', body: JSON.stringify(input) }).then((response) => response.server);
}
export function deleteAgentMcpServer(workspaceId: string, agentId: string, serverId: string): Promise<void> {
  return requestJson(`${agentCapabilityBase(workspaceId, agentId)}/mcp/servers/${encodeURIComponent(serverId)}`, { method: 'DELETE' });
}
export function testAgentMcpServer(workspaceId: string, agentId: string, serverId: string): Promise<unknown> {
  return requestJson(`${agentCapabilityBase(workspaceId, agentId)}/mcp/servers/${encodeURIComponent(serverId)}/test-connection`, { method: 'POST' });
}
export function reviewAgentMcpTool(workspaceId: string, agentId: string, serverId: string, toolName: string, input: Partial<Pick<AgentMcpToolApi, 'enabled' | 'capability' | 'reviewState' | 'riskLevel' | 'autoAllowed'>>): Promise<AgentMcpToolApi> {
  return requestJson<{ tool: AgentMcpToolApi }>(`${agentCapabilityBase(workspaceId, agentId)}/mcp/servers/${encodeURIComponent(serverId)}/tools/${encodeURIComponent(toolName)}`, { method: 'PATCH', body: JSON.stringify(input) }).then((response) => response.tool);
}
export function listAgentSkills(workspaceId: string, agentId: string): Promise<AgentSkillApi[]> {
  return requestJson<{ items: AgentSkillApi[] }>(`${agentCapabilityBase(workspaceId, agentId)}/skills`).then((response) => response.items);
}
export function createAgentSkill(workspaceId: string, agentId: string, input: { name: string; description?: string; files: Array<{ path: string; content: string }> }): Promise<AgentSkillApi> {
  return requestJson<{ skill: AgentSkillApi }>(`${agentCapabilityBase(workspaceId, agentId)}/skills`, { method: 'POST', body: JSON.stringify(input) }).then((response) => response.skill);
}
export function importAgentSkill(workspaceId: string, agentId: string, input: { files: Array<{ path: string; content: string }>; source: { type: 'git'; provider: 'github' | 'gitlab'; url: string; ref: string; path?: string; pinnedCommit: string } }): Promise<AgentSkillApi> {
  return requestJson<{ skill: AgentSkillApi }>(`${agentCapabilityBase(workspaceId, agentId)}/skills/import`, { method: 'POST', body: JSON.stringify(input) }).then((response) => response.skill);
}
export function resolveAgentGitSkill(workspaceId: string, agentId: string, input: ResolveGitSkillInput): Promise<ImportSkillInput> {
  return requestJson<ImportSkillInput>(`${agentCapabilityBase(workspaceId, agentId)}/skills/resolve`, { method: 'POST', body: JSON.stringify(input) });
}
export function reimportAgentSkill(workspaceId: string, agentId: string, skillId: string, input: { files: Array<{ path: string; content: string }>; source: { type: 'git'; provider: 'github' | 'gitlab'; url: string; ref: string; path?: string; pinnedCommit: string }; expectedRevision: number }): Promise<AgentSkillApi> {
  return requestJson<{ skill: AgentSkillApi }>(`${agentCapabilityBase(workspaceId, agentId)}/skills/${encodeURIComponent(skillId)}/reimport`, { method: 'POST', body: JSON.stringify(input) }).then((response) => response.skill);
}
export function updateAgentSkill(workspaceId: string, agentId: string, skillId: string, input: { name?: string; description?: string; enabled?: boolean; files?: Array<{ path: string; content: string }>; expectedRevision?: number }): Promise<AgentSkillApi> {
  return requestJson<{ skill: AgentSkillApi }>(`${agentCapabilityBase(workspaceId, agentId)}/skills/${encodeURIComponent(skillId)}`, { method: 'PATCH', body: JSON.stringify(input) }).then((response) => response.skill);
}
export function listServiceIdentities(workspaceId: string): Promise<ServiceIdentityApi[]> {
  return requestJson<{ items: ServiceIdentityApi[] }>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/service-identities`).then((response) => response.items);
}
export function deleteAgentSkill(workspaceId: string, agentId: string, skillId: string): Promise<void> {
  return requestJson(`${agentCapabilityBase(workspaceId, agentId)}/skills/${encodeURIComponent(skillId)}`, { method: 'DELETE' });
}
