import { requestJson } from './http';
import type { ControlPlaneRunEvent, ControlPlaneRunToolApproval } from './types';

export interface WorkflowApiStep {
  id: string;
  title: string;
  requiredInputs: string[];
  agentIds?: string[];
  enabledSkills: string[];
  allowedMcpServers: string[];
  allowedTools: string[];
  contextGrants: string[];
  approvalRequired: boolean;
  outputArtifacts?: Array<{ id: string; type: string; title: string; required?: boolean }>;
}

export type WorkflowApiDefinition = Record<string, unknown> & {
  id: string;
  workspaceId: string;
  version: number;
  source?: 'system' | 'user';
  templateId?: string;
  name: string;
  description?: string;
  status?: 'active' | 'draft' | 'paused';
  createdBy?: string;
  createdByUser?: { id?: string; userId?: string; displayName?: string; email?: string };
  createdAt?: string;
  category?: string;
  orchestratorAgentId?: string;
  tags?: string[];
  inputs?: WorkflowApiInputDefinition[];
  enabledMcpServers?: string[];
  enabledSkills?: string[];
  starterPrompt?: string;
  requiredPermissions: string[];
  policy: {
    mode: 'read_only' | 'read_write';
    maxRuntimeSeconds: number;
    retentionDays: number;
    approvalRequirements: string[];
  };
  steps: WorkflowApiStep[];
};

export interface WorkflowApiInputDefinition {
  name: string;
  label: string;
  type: string;
  required: boolean;
  optionSource?: string;
}

export interface WorkflowOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
  provenance?: {
    source: 'workspace' | 'target';
    provider?: 'github' | 'gitlab';
    targetId?: string;
    targetName?: string;
  };
}

export interface WorkflowOptionsCatalog {
  clusters: WorkflowOption[];
  mcpServers: WorkflowOption[];
  mcpTools: WorkflowOption[];
  skills: WorkflowOption[];
  agents: WorkflowOption[];
  chatSessions: WorkflowOption[];
  outputFormats: WorkflowOption[];
  approvalPolicies: WorkflowOption[];
  runtimeLimits: WorkflowOption[];
  retentionPolicies: WorkflowOption[];
  sourceAvailability: Record<string, {
    status: 'available' | 'empty' | 'unavailable' | 'error';
    message?: string;
    retryable?: boolean;
    errorCode?: string;
  }>;
}

export interface WorkflowMcpServer {
  id: string;
  workspaceId: string;
  scope: 'workspace';
  name: string;
  url: string;
  enabled: boolean;
  authType: 'none' | 'bearer_token' | 'custom_header';
  authHeaderName?: string;
  credentialConfigured: boolean;
  publicHeaders: Record<string, string>;
  status: 'connected' | 'disabled' | 'not_checked' | 'error';
  lastCheckedAt?: string;
  discoveryError?: string;
  tools: WorkflowMcpTool[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowMcpTool {
  name: string;
  title: string;
  capability: 'read' | 'write';
  enabled: boolean;
}

export interface WorkflowMcpServerInput {
  name: string;
  url: string;
  enabled?: boolean;
  auth?: { type: WorkflowMcpServer['authType']; credential?: string; headerName?: string };
  publicHeaders?: Record<string, string>;
}

export interface WorkflowSessionResponse {
  session: {
    id: string;
    workflowId: string;
    workspaceId: string;
    workflowVersion: number;
  } & Record<string, unknown>;
  compiledAccessScope: Record<string, unknown>;
}

export interface WorkflowRunSummary {
  id: string;
  workflowRunId?: string;
  status?: string;
  createdBy?: string;
  requestedAt?: string;
  startedAt?: string;
  endedAt?: string;
  assistantMessage?: {
    content?: string;
  };
}

export type WorkflowRunApproval = ControlPlaneRunToolApproval;
export type WorkflowRunEvent = ControlPlaneRunEvent;

export interface WorkflowSchedule {
  id: string;
  workspaceId: string;
  workflowId: string;
  workflowVersion: number;
  name: string;
  status: 'enabled' | 'paused';
  cron: string;
  timezone: string;
  inputDefaults: Record<string, unknown>;
  approvedContextGrants: string[];
  createdBy?: { userId: string; displayName?: string };
  updatedBy?: { userId: string; displayName?: string };
  createdAt: string;
  updatedAt: string;
  nextRunAt?: string;
  lastRunAt?: string;
  lastStatus?: 'dispatched' | 'failed' | 'auto_paused' | 'skipped';
  lastError?: string;
}

export interface WorkflowScheduleSummary {
  total: number;
  active: number;
  paused: number;
  approvalGated: number;
  nextRunAt?: string;
}

export interface WorkflowScheduleListResponse {
  items: WorkflowSchedule[];
  summary: WorkflowScheduleSummary;
}

export interface WorkflowScheduleInput {
  workflowId: string;
  name: string;
  enabled?: boolean;
  cron: string;
  timezone: string;
  inputDefaults?: Record<string, unknown>;
  approvedContextGrants?: string[];
}

export type WorkflowScheduleUpdateInput = Partial<WorkflowScheduleInput>;

export interface WorkflowSchedulePreview {
  valid: boolean;
  summary: string;
  nextRunTimes: string[];
  errors: Array<{ field: string; message: string }>;
}

export interface WorkspaceApprovalInboxRow {
  approvalId: string;
  runId: string;
  source: 'target_tool' | 'workflow_gate';
  workflowId?: string;
  targetId?: string;
  targetType?: string;
  summary: string;
  toolName: string;
  requestedBy?: string;
  expiresAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  decision?: 'approved' | 'rejected';
  decidedBy?: string;
  decidedAt?: string;
  requestedAt: string;
}

export interface WorkspaceApprovalInboxResponse {
  items: WorkspaceApprovalInboxRow[];
  pendingCount?: number;
  nextCursor?: string;
}

export function normalizeWorkspaceApprovalInboxResponse(value: unknown): WorkspaceApprovalInboxResponse {
  const response = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const pendingCount = typeof response.pendingCount === 'number' && Number.isInteger(response.pendingCount) && response.pendingCount >= 0
    ? response.pendingCount
    : undefined;
  return {
    items: Array.isArray(response.items) ? response.items as WorkspaceApprovalInboxRow[] : [],
    ...(pendingCount === undefined ? {} : { pendingCount }),
    ...(typeof response.nextCursor === 'string' ? { nextCursor: response.nextCursor } : {})
  };
}

export type WorkflowSessionSummary = WorkflowSessionResponse['session'] & {
  runs?: WorkflowRunSummary[];
};

export interface WorkflowScopeUpdateInput {
  category?: string;
  enabledMcpServers?: string[];
  enabledSkills?: string[];
  policy?: {
    mode?: 'read_only' | 'read_write';
    approvalRequirements?: string[];
  };
  steps?: Array<{
    id: string;
    agentIds?: string[];
    allowedMcpServers?: string[];
    allowedTools?: string[];
    contextGrants?: string[];
    approvalRequired?: boolean;
  }>;
}

export interface WorkflowCreateInput {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  starterPrompt?: string;
  inputs?: WorkflowApiInputDefinition[];
  enabledMcpServers?: string[];
  enabledSkills?: string[];
  requiredPermissions?: string[];
  policy?: {
    mode?: 'read_only' | 'read_write';
    maxRuntimeSeconds?: number;
    retentionDays?: number;
    approvalRequirements?: string[];
  };
  steps?: WorkflowApiStep[];
}

export type WorkflowUpdateInput = Partial<WorkflowCreateInput> & {
  status?: WorkflowApiDefinition['status'];
};

export function listWorkspaceWorkflows(workspaceId: string): Promise<WorkflowApiDefinition[]> {
  return requestJson<{ items: WorkflowApiDefinition[] }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/workflows`
  ).then((page) => page.items);
}

export function listWorkflowOptions(workspaceId: string): Promise<WorkflowOptionsCatalog> {
  return requestJson<WorkflowOptionsCatalog>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/workflow-options`
  );
}

export function listWorkspaceWorkflowSchedules(workspaceId: string): Promise<WorkflowScheduleListResponse> {
  return requestJson<WorkflowScheduleListResponse>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/workflow-schedules`
  );
}

export function createWorkflowSchedule(workspaceId: string, input: WorkflowScheduleInput): Promise<WorkflowSchedule> {
  return requestJson<{ schedule: WorkflowSchedule }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/workflow-schedules`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    }
  ).then((response) => response.schedule);
}

export function previewWorkflowSchedule(workspaceId: string, input: WorkflowScheduleInput): Promise<WorkflowSchedulePreview> {
  return requestJson<WorkflowSchedulePreview>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/workflow-schedules/preview`,
    { method: 'POST', body: JSON.stringify(input) }
  );
}

export function updateWorkflowSchedule(
  workspaceId: string,
  scheduleId: string,
  input: WorkflowScheduleUpdateInput
): Promise<WorkflowSchedule> {
  return requestJson<{ schedule: WorkflowSchedule }>(
    `/api/v1/workflow-schedules/${encodeURIComponent(scheduleId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        workspaceId,
        ...input
      })
    }
  ).then((response) => response.schedule);
}

export function deleteWorkflowSchedule(workspaceId: string, scheduleId: string): Promise<void> {
  return requestJson<void>(
    `/api/v1/workflow-schedules/${encodeURIComponent(scheduleId)}`,
    {
      method: 'DELETE',
      body: JSON.stringify({ workspaceId })
    }
  ).then(() => undefined);
}

export function listWorkspaceApprovalInbox(
  workspaceId: string,
  params: { status?: 'pending' | 'decided' | 'all'; limit?: number; cursor?: string } = {}
): Promise<WorkspaceApprovalInboxResponse> {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  if (params.limit) search.set('limit', String(params.limit));
  if (params.cursor) search.set('cursor', params.cursor);
  const query = search.toString();
  return requestJson<unknown>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/approvals${query ? `?${query}` : ''}`
  ).then(normalizeWorkspaceApprovalInboxResponse);
}

export function createWorkflow(workspaceId: string, input: WorkflowCreateInput): Promise<WorkflowApiDefinition> {
  return requestJson<{ workflow: WorkflowApiDefinition }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/workflows`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    }
  ).then((response) => response.workflow);
}

export function updateWorkflow(
  workspaceId: string,
  workflowId: string,
  input: WorkflowUpdateInput
): Promise<WorkflowApiDefinition> {
  return requestJson<{ workflow: WorkflowApiDefinition }>(
    `/api/v1/workflows/${encodeURIComponent(workflowId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        workspaceId,
        ...input
      })
    }
  ).then((response) => response.workflow);
}

export function deleteWorkflow(workspaceId: string, workflowId: string): Promise<void> {
  return requestJson<{ deleted: boolean }>(
    `/api/v1/workflows/${encodeURIComponent(workflowId)}`,
    {
      method: 'DELETE',
      body: JSON.stringify({ workspaceId })
    }
  ).then(() => undefined);
}

export function listWorkflowMcpServers(workspaceId: string): Promise<WorkflowMcpServer[]> {
  return requestJson<{ items: WorkflowMcpServer[] }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/mcp/servers`
  ).then((page) => page.items);
}

export function createWorkflowMcpServer(
  workspaceId: string,
  input: WorkflowMcpServerInput
): Promise<WorkflowMcpServer> {
  return requestJson<{ server: WorkflowMcpServer }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/mcp/servers`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    }
  ).then((response) => response.server);
}

export function updateWorkflowMcpServer(
  workspaceId: string,
  serverId: string,
  input: Partial<WorkflowMcpServerInput>
): Promise<WorkflowMcpServer> {
  return requestJson<{ server: WorkflowMcpServer }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/mcp/servers/${encodeURIComponent(serverId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input)
    }
  ).then((response) => response.server);
}

export function deleteWorkflowMcpServer(workspaceId: string, serverId: string): Promise<void> {
  return requestJson<{ deleted: boolean }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/mcp/servers/${encodeURIComponent(serverId)}`,
    { method: 'DELETE' }
  ).then(() => undefined);
}

export function testWorkflowMcpServerConnection(workspaceId: string, serverId: string): Promise<Record<string, unknown>> {
  return requestJson<Record<string, unknown>>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/mcp/servers/${encodeURIComponent(serverId)}/test-connection`,
    { method: 'POST' }
  );
}

export function listWorkflowMcpServerTools(workspaceId: string, serverId: string): Promise<WorkflowMcpTool[]> {
  return requestJson<{ items: WorkflowMcpTool[] }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/mcp/servers/${encodeURIComponent(serverId)}/tools`
  ).then((page) => page.items);
}

export function updateWorkflowMcpTool(
  workspaceId: string,
  serverId: string,
  toolName: string,
  patch: { enabled: boolean; capability: 'read' | 'write' }
): Promise<WorkflowMcpTool> {
  return requestJson<{ tool: WorkflowMcpTool }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/mcp/servers/${encodeURIComponent(serverId)}/tools/${encodeURIComponent(toolName)}`,
    { method: 'PATCH', body: JSON.stringify(patch) }
  ).then((response) => response.tool);
}

export function listWorkflowSessions(
  workspaceId: string,
  workflowId: string
): Promise<WorkflowSessionSummary[]> {
  return requestJson<{ items: WorkflowSessionSummary[] }>(
    `/api/v1/workflows/${encodeURIComponent(workflowId)}/sessions?workspaceId=${encodeURIComponent(workspaceId)}`
  ).then((page) => page.items);
}

export function createWorkflowSession(
  workspaceId: string,
  workflowId: string,
  input: { approvedContextGrants?: string[] } = {}
): Promise<WorkflowSessionResponse> {
  return requestJson<WorkflowSessionResponse>(
    `/api/v1/workflows/${encodeURIComponent(workflowId)}/sessions`,
    {
      method: 'POST',
      body: JSON.stringify({
        workspaceId,
        approvedContextGrants: input.approvedContextGrants || []
      })
    }
  );
}

export function updateWorkflowScope(
  workspaceId: string,
  workflowId: string,
  input: WorkflowScopeUpdateInput
): Promise<WorkflowApiDefinition> {
  return requestJson<{ workflow: WorkflowApiDefinition }>(
    `/api/v1/workflows/${encodeURIComponent(workflowId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        workspaceId,
        ...input
      })
    }
  ).then((response) => response.workflow);
}

export function postWorkflowSessionMessage(
  workspaceId: string,
  sessionId: string,
  input: { content: string; inputs?: Record<string, unknown> }
): Promise<Record<string, unknown>> {
  return requestJson<Record<string, unknown>>(
    `/api/v1/workflow-sessions/${encodeURIComponent(sessionId)}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({
        workspaceId,
        content: input.content,
        inputs: input.inputs || {}
      })
    }
  );
}

export function listWorkflowRunApprovals(runId: string): Promise<WorkflowRunApproval[]> {
  return requestJson<WorkflowRunApproval[]>(`/api/v1/runs/${encodeURIComponent(runId)}/approvals`);
}

export function listWorkflowRunEvents(runId: string): Promise<WorkflowRunEvent[]> {
  return requestJson<WorkflowRunEvent[]>(`/api/v1/runs/${encodeURIComponent(runId)}/events`);
}

export function cancelWorkflowRun(runId: string): Promise<void> {
  return requestJson<{ status: string }>(
    `/api/v1/runs/${encodeURIComponent(runId)}/cancel`,
    { method: 'POST' }
  ).then(() => undefined);
}

export function decideWorkflowRunApproval(
  runId: string,
  approvalId: string,
  decision: 'approved' | 'rejected'
): Promise<WorkflowRunApproval> {
  return requestJson<WorkflowRunApproval>(
    `/api/v1/runs/${encodeURIComponent(runId)}/approvals/${encodeURIComponent(approvalId)}/decision`,
    { method: 'POST', body: JSON.stringify({ decision }) }
  );
}
