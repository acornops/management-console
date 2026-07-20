import { requestJson } from './http';

export type AgentStatus = 'draft' | 'active' | 'disabled';
export type AgentProviderType = 'internal' | 'external';
export type AgentTargetScopeApi = { type?: 'workspace' | 'selected_target'; targetTypes?: string[]; targetIds?: string[] };
export type RunPermissionMode = 'read_only' | 'ask_before_changes' | 'auto_allowed_changes';
export interface AgentMcpToolApi { name: string; serverId: string; alias: string; description?: string; capability: 'read' | 'write'; enabled: boolean; reviewState: 'pending' | 'approved' | 'rejected'; riskLevel: 'read_only' | 'non_destructive_write' | 'high_risk' | 'destructive'; autoAllowed: boolean }
export interface AgentMcpServerApi { id: string; name: string; url: string; enabled: boolean; credentialMode: 'none' | 'workspace' | 'individual'; authType?: string; authHeaderName?: string; authHeaderPrefix?: string; revision: number; targetConstraints: { targetTypes: string[]; targetIds: string[] }; provenance?: { sourceId: string; artifactName: string; version: string; digest: string; importedAt: string }; integrationProfileId?: string; integrationProfileVersion?: number; connectionStatus?: string; lastDiscoveryError?: string | null; tools: AgentMcpToolApi[] }
export interface WorkspaceNativeToolApi {
  id: string;
  title: string;
  description: string;
  semanticCapabilityId: string;
  invocationScopes: Array<'workflow'>;
  authorizationClass: 'selected_context' | 'internal_artifact';
  auditOperation: 'read' | 'write';
  approvalOperation: 'read' | 'write';
  requiredContextGrant?: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}
export interface AgentSkillApi { id: string; name: string; description: string; enabled: boolean; revision: number; contentDigest: string; source: { type: 'manual' | 'git' | 'template'; provider?: 'github' | 'gitlab'; url?: string; apiBaseUrl?: string; ref?: string; path?: string; pinnedCommit?: string }; files: Array<{ path: string; content: string; contentDigest: string }> }
export interface ServiceIdentityApi { id: string; workspaceId: string; name: string; status: 'active' | 'disabled'; role: string; createdBy: string; createdAt: string; updatedAt: string }
export interface AutomationTemplateApi {
  id: string; version: number; name: string; description: string; installMode: 'automatic' | 'opt_in';
  installationStatus: 'not_installed' | 'needs_setup' | 'ready' | 'active'; setupSteps: string[];
  blockerCodes: string[]; workflowId?: string;
}
export interface AutomationTemplateInstallationApi { workspaceId: string; templateId: string; templateVersion: number; state: 'pending' | 'complete'; installedBy: string; recordIds: Record<string, string>; installedAt: string }

function normalizeAutomationTemplate(value: unknown): AutomationTemplateApi {
  const template = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const installMode = template.installMode;
  const installationStatus = template.installationStatus;
  if (
    typeof template.id !== 'string'
    || typeof template.version !== 'number'
    || typeof template.name !== 'string'
    || typeof template.description !== 'string'
    || (installMode !== 'automatic' && installMode !== 'opt_in')
    || !['not_installed', 'needs_setup', 'ready', 'active'].includes(String(installationStatus))
    || !Array.isArray(template.setupSteps)
    || !Array.isArray(template.blockerCodes)
  ) {
    throw new Error('The automation template catalog returned an invalid template definition.');
  }
  return template as unknown as AutomationTemplateApi;
}

export function normalizeAutomationTemplateCatalog(value: unknown): {
  templates: AutomationTemplateApi[];
  installations: AutomationTemplateInstallationApi[];
} {
  const catalog = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  if (!Array.isArray(catalog.templates) || !Array.isArray(catalog.installations)) {
    throw new Error('The automation template catalog returned an invalid response.');
  }
  return {
    templates: catalog.templates.map(normalizeAutomationTemplate),
    installations: catalog.installations as AutomationTemplateInstallationApi[]
  };
}

export interface AgentCapability {
  source: 'builtin_tool' | 'mcp_tool' | 'skill' | 'context' | 'target';
  providerAgentId?: string;
  resourceType: string;
  resourceScope: string;
  toolId?: string;
  operation: 'read' | 'write';
  requiresApproval: boolean;
}

export interface AgentDefinitionApi {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  instructions?: string;
  status?: AgentStatus;
  origin: { type: 'template' | 'manual'; templateId?: string; templateVersion?: number };
  kind: 'specialist';
  reviewState: 'draft' | 'reviewed';
  providerType?: AgentProviderType;
  ownerUserId?: string;
  createdBy: string;
  version?: number;
  mcpServers?: string[];
  mcpTools?: Array<{ serverId: string; toolName: string }>;
  mcpInstallations?: AgentMcpServerApi[];
  tools?: string[];
  skills?: string[];
  skillInstallations?: AgentSkillApi[];
  permissionMode?: RunPermissionMode;
  semanticCapabilityIds?: string[];
  targetScope?: string[] | AgentTargetScopeApi;
  contextScope?: string[];
  contextGrants?: string[];
  approvalPolicy?: Record<string, unknown>;
  trustPolicy?: Record<string, unknown>;
  triggers?: AgentTriggerDefinitionApi[];
  activity?: { runCount?: number; lastRunAt?: string; lastStatus?: string };
  readiness?: { status: 'ready' | 'needs_setup' | 'blocked'; reasons: string[] };
  capabilitySummary?: string;
  capabilities?: AgentCapability[];
  workflowsUsingAgent?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type AgentCreateInput = Partial<Omit<AgentDefinitionApi, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>> & {
  name: string;
  instructions: string;
};

export type AgentUpdateInput = Partial<AgentCreateInput> & {
  status?: AgentStatus;
};

export interface AgentTriggerDefinitionApi {
  id: string;
  type: 'manual' | 'workflow_step' | 'schedule' | 'webhook' | 'target_event';
  enabled: boolean;
  name?: string;
  schedule?: { cron: string; timezone: string };
  eventFilter?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface AgentActivityRecordApi {
  id: string;
  agentId: string;
  workspaceId: string;
  agentVersion: number;
  triggerId?: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  inputContext?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export interface AgentVersionSnapshotApi {
  id: string;
  agentId: string;
  workspaceId: string;
  version: number;
  snapshot?: AgentDefinitionApi;
  createdBy?: string;
  createdAt: string;
}

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

export function grantAgentNativeTool(workspaceId: string, agentId: string, toolId: string): Promise<AgentDefinitionApi> {
  return requestJson<{ agent: AgentDefinitionApi }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agentId)}/native-tools/${encodeURIComponent(toolId)}`,
    { method: 'PUT' }
  ).then((response) => response.agent);
}

export function revokeAgentNativeTool(workspaceId: string, agentId: string, toolId: string): Promise<AgentDefinitionApi> {
  return requestJson<{ agent: AgentDefinitionApi }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agentId)}/native-tools/${encodeURIComponent(toolId)}`,
    { method: 'DELETE' }
  ).then((response) => response.agent);
}

export function listAutomationTemplates(workspaceId: string): Promise<{
  templates: AutomationTemplateApi[];
  installations: AutomationTemplateInstallationApi[];
}> {
  return requestJson<unknown>(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/automation-templates`)
    .then(normalizeAutomationTemplateCatalog);
}

export function installAutomationTemplate(workspaceId: string, templateId: string): Promise<{ workflowId: string; alreadyInstalled: boolean }> {
  return requestJson(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/automation-templates/${encodeURIComponent(templateId)}/install`, { method: 'POST' });
}

export function activateAutomationTemplate(workspaceId: string, templateId: string): Promise<{ workflowId: string; status: 'active' }> {
  return requestJson(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/automation-templates/${encodeURIComponent(templateId)}/activate`, { method: 'POST' });
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

export function createAgentVersion(workspaceId: string, agentId: string): Promise<AgentVersionSnapshotApi> {
  return requestJson<{ version: AgentVersionSnapshotApi }>(
    `/api/v1/agents/${encodeURIComponent(agentId)}/versions`,
    {
      method: 'POST',
      body: JSON.stringify({ workspaceId })
    }
  ).then((response) => response.version);
}

export function listAgentVersions(workspaceId: string, agentId: string): Promise<AgentVersionSnapshotApi[]> {
  return requestJson<{ items: AgentVersionSnapshotApi[] }>(
    `/api/v1/agents/${encodeURIComponent(agentId)}/versions?workspaceId=${encodeURIComponent(workspaceId)}`
  ).then((response) => response.items);
}

export function restoreAgentVersion(
  workspaceId: string,
  agentId: string,
  versionId: string
): Promise<AgentDefinitionApi> {
  return requestJson<{ agent: AgentDefinitionApi }>(
    `/api/v1/agents/${encodeURIComponent(agentId)}/versions/${encodeURIComponent(versionId)}/restore`,
    {
      method: 'POST',
      body: JSON.stringify({ workspaceId })
    }
  ).then((response) => response.agent);
}

export function testAgent(
  workspaceId: string,
  agentId: string,
  input: { approvedContextGrants?: string[]; inputContext?: Record<string, unknown>; triggerId?: string } = {}
): Promise<{ compiledScope: Record<string, unknown>; executing: false }> {
  return requestJson<{ compiledScope: Record<string, unknown>; executing: false }>(
    `/api/v1/agents/${encodeURIComponent(agentId)}/test`,
    {
      method: 'POST',
      body: JSON.stringify({
        workspaceId,
        ...input
      })
    }
  );
}

export function runAgent(
  workspaceId: string,
  agentId: string,
  input: { prompt: string; inputContext?: Record<string, unknown>; targetId?: string; approvedContextGrants?: string[]; triggerId?: string; clientRequestId?: string }
): Promise<{ runId: string; activityId: string; source: 'agent'; status: AgentActivityRecordApi['status'] }> {
  return requestJson(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agentId)}/runs`,
    { method: 'POST', body: JSON.stringify(input) }
  );
}

export function listAgentActivity(workspaceId: string, agentId: string): Promise<AgentActivityRecordApi[]> {
  return requestJson<{ items: AgentActivityRecordApi[] }>(
    `/api/v1/agents/${encodeURIComponent(agentId)}/activity?workspaceId=${encodeURIComponent(workspaceId)}`
  ).then((response) => response.items);
}

export function createAgentTrigger(
  workspaceId: string,
  agentId: string,
  input: Omit<AgentTriggerDefinitionApi, 'id' | 'createdAt' | 'updatedAt'>
): Promise<AgentTriggerDefinitionApi> {
  return requestJson<{ trigger: AgentTriggerDefinitionApi }>(
    `/api/v1/agents/${encodeURIComponent(agentId)}/triggers`,
    {
      method: 'POST',
      body: JSON.stringify({
        workspaceId,
        ...input
      })
    }
  ).then((response) => response.trigger);
}

export function updateAgentTrigger(
  workspaceId: string,
  agentId: string,
  triggerId: string,
  input: Partial<Omit<AgentTriggerDefinitionApi, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<AgentTriggerDefinitionApi> {
  return requestJson<{ trigger: AgentTriggerDefinitionApi }>(
    `/api/v1/agents/${encodeURIComponent(agentId)}/triggers/${encodeURIComponent(triggerId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        workspaceId,
        ...input
      })
    }
  ).then((response) => response.trigger);
}

export function deleteAgentTrigger(workspaceId: string, agentId: string, triggerId: string): Promise<void> {
  return requestJson<void>(
    `/api/v1/agents/${encodeURIComponent(agentId)}/triggers/${encodeURIComponent(triggerId)}`,
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
export function createAgentMcpServer(workspaceId: string, agentId: string, input: { name: string; url: string; credentialMode?: 'none' | 'workspace' | 'individual'; authType?: 'none' | 'bearer_token' | 'custom_header'; authHeaderName?: string }): Promise<AgentMcpServerApi> {
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
export function importAgentSkill(workspaceId: string, agentId: string, input: { files: Array<{ path: string; content: string }>; source: { type: 'git'; provider: 'github' | 'gitlab'; url: string; apiBaseUrl?: string; ref: string; path?: string; pinnedCommit: string } }): Promise<AgentSkillApi> {
  return requestJson<{ skill: AgentSkillApi }>(`${agentCapabilityBase(workspaceId, agentId)}/skills/import`, { method: 'POST', body: JSON.stringify(input) }).then((response) => response.skill);
}
export function reimportAgentSkill(workspaceId: string, agentId: string, skillId: string, input: { files: Array<{ path: string; content: string }>; source: { type: 'git'; provider: 'github' | 'gitlab'; url: string; apiBaseUrl?: string; ref: string; path?: string; pinnedCommit: string }; expectedRevision: number }): Promise<AgentSkillApi> {
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
