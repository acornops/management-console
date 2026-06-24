import { requestJson } from './http';
import type { ControlPlaneRunEvent, ControlPlaneRunToolApproval } from './types';

export interface WorkflowApiStep {
  id: string;
  title: string;
  requiredInputs: string[];
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
  category?: string;
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
}

export interface WorkflowOptionsCatalog {
  clusters: WorkflowOption[];
  repositories: WorkflowOption[];
  mcpServers: WorkflowOption[];
  mcpTools: WorkflowOption[];
  skills: WorkflowOption[];
  chatSessions: WorkflowOption[];
  outputFormats: WorkflowOption[];
  approvalPolicies: WorkflowOption[];
  runtimeLimits: WorkflowOption[];
  retentionPolicies: WorkflowOption[];
}

export interface WorkflowMcpServer {
  id: string;
  name: string;
  type?: string;
  status?: string;
  baseUrl?: string;
  command?: string;
  args?: string[];
  environment?: Record<string, string>;
  toolCount?: number;
  tools?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowMcpServerInput {
  id?: string;
  name: string;
  type?: string;
  baseUrl?: string;
  command?: string;
  args?: string[];
  environment?: Record<string, string>;
  tools?: string[];
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

export function listWorkflowMcpServerTools(workspaceId: string, serverId: string): Promise<string[]> {
  return requestJson<{ items: Array<string | { name?: string; id?: string }> }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/mcp/servers/${encodeURIComponent(serverId)}/tools`
  ).then((page) => page.items
    .map((tool) => typeof tool === 'string' ? tool : tool.name || tool.id || '')
    .filter(Boolean));
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
