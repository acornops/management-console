import { requestJson } from './http';

export type AgentStatus = 'draft' | 'active' | 'disabled';
export type AgentProviderType = 'internal' | 'external';
export type AgentTargetScopeApi = { type?: 'workspace' | 'selected_target'; targetTypes?: string[]; targetIds?: string[] };

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
  source?: 'system' | 'user';
  providerType?: AgentProviderType;
  ownerUserId?: string;
  version?: number;
  mcpServers?: string[];
  tools?: string[];
  skills?: string[];
  targetScope?: string[] | AgentTargetScopeApi;
  contextScope?: string[];
  contextGrants?: string[];
  approvalPolicy?: Record<string, unknown>;
  trustPolicy?: Record<string, unknown>;
  triggers?: AgentTriggerDefinitionApi[];
  activity?: { runCount?: number; lastRunAt?: string; lastStatus?: string };
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
  type: 'manual' | 'workflow_step' | 'schedule' | 'webhook' | 'audit_event' | 'target_event' | 'external_adapter';
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
): Promise<{ activity: AgentActivityRecordApi; compiledScope: Record<string, unknown> }> {
  return requestJson<{ activity: AgentActivityRecordApi; compiledScope: Record<string, unknown> }>(
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
