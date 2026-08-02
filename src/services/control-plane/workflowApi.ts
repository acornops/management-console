import { requestJson } from './http';
import type { ControlPlaneRunEvent, ControlPlaneRunToolApproval } from './types';
import type { WorkflowExecutionSummary } from './workflowActivityApi';

export interface AutomationTemplateApi {
  id: string; name: string; description: string; installMode: 'automatic' | 'opt_in';
  installationStatus: 'not_installed' | 'needs_setup' | 'ready' | 'active'; setupSteps: string[];
  blockerCodes: string[]; workflowId?: string;
}
export interface AutomationTemplateInstallationApi { workspaceId: string; templateId: string; state: 'pending' | 'complete'; installedBy: string; recordIds: Record<string, string>; installedAt: string }

function normalizeAutomationTemplate(value: unknown): AutomationTemplateApi {
  const template = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const installMode = template.installMode;
  const installationStatus = template.installationStatus;
  if (
    typeof template.id !== 'string'
    || typeof template.name !== 'string'
    || typeof template.description !== 'string'
    || (installMode !== 'automatic' && installMode !== 'opt_in')
    || !['not_installed', 'needs_setup', 'ready', 'active'].includes(String(installationStatus))
    || !Array.isArray(template.setupSteps)
    || !Array.isArray(template.blockerCodes)
  ) {
    throw new Error('The workflow recommendation catalog returned an invalid recommendation.');
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
    throw new Error('The workflow recommendation catalog returned an invalid response.');
  }
  return {
    templates: catalog.templates.map(normalizeAutomationTemplate),
    installations: catalog.installations as AutomationTemplateInstallationApi[]
  };
}

export {
  listWorkspaceWorkflowExecutions
} from './workflowActivityApi';
export type {
  WorkflowExecutionOrigin,
  WorkflowExecutionPage,
  WorkflowExecutionStatus,
  WorkflowExecutionSummary,
  WorkspaceWorkflowExecutionFilters
} from './workflowActivityApi';

export type WorkflowApiDefinition = Record<string, unknown> & {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  status?: 'active' | 'draft' | 'paused';
  createdBy?: string;
  createdByUser?: { id?: string; userId?: string; displayName?: string; email?: string };
  createdAt?: string;
  prompt?: string;
  agentIds: string[];
  executionMode: 'direct' | 'coordinated';
  tags?: string[];
  readiness?: { status: 'ready' | 'needs_setup' | 'blocked'; reasons: string[] };
};

export interface WorkflowOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
  provenance?: {
    source: 'workspace' | 'agent';
    provider?: 'github' | 'gitlab';
    agentId?: string;
    serverId?: string;
    toolName?: string;
  };
}

export interface WorkflowOptionsCatalog {
  agents: WorkflowOption[];
  sourceAvailability: Record<'agents', {
    status: 'available' | 'empty' | 'unavailable' | 'error';
    message?: string;
    retryable?: boolean;
    errorCode?: string;
  }>;
}

export interface WorkflowSessionResponse {
  session: {
    id: string;
    workflowId: string;
    workspaceId: string;
  } & Record<string, unknown>;
}
export type WorkflowCapabilityPreviewReasonCode =
  | 'CAPABILITY_MAPPING_UNAVAILABLE'
  | 'MCP_CONNECTION_UNAVAILABLE';

export interface WorkflowCapabilityToolPreview {
  id: string;
  name: string;
  label: string;
  description?: string;
  access: 'read' | 'write';
  source: 'mcp' | 'builtin';
  serverId?: string;
  serverIds?: string[];
}

interface WorkflowMcpRequirementPreviewBase {
  serverId: string;
  serverName: string;
  authType: 'bearer_token' | 'custom_header' | 'oauth';
  connectionState: 'connection_missing' | 'connection_error' | 'connected';
  authRequirement: {
    scope: 'workspace' | 'individual';
    credentialLabel: string;
    requiredInformation: Array<{ name: string; description: string }>;
  };
  action:
    | 'connect_mcp_server'
    | 'authorize_mcp_server'
    | 'select_authorization_server'
    | 'reauthorize_mcp_server'
    | 'verify_mcp_server'
    | 'none';
}

export type WorkflowMcpRequirementPreview = WorkflowMcpRequirementPreviewBase & {
  owningAgent: { id: string; name: string };
};

export interface WorkflowCapabilitiesPreview {
  workflowId: string;
  mode: 'read_only' | 'read_write';
  semanticCapabilityIds: string[];
  checkedAt: string;
  status: 'ready' | 'blocked';
  reasonCodes: WorkflowCapabilityPreviewReasonCode[];
  tools: { read: WorkflowCapabilityToolPreview[]; write: WorkflowCapabilityToolPreview[] };
  directMcpServers: Array<{ id: string; name: string }>;
  enabledSkills: Array<{ id: string; name: string }>;
  mcpRequirements: WorkflowMcpRequirementPreview[];
  approvalRequirements: string[];
  counts: {
    tools: number; readTools: number; writeTools: number;
    directMcpServers: number; enabledSkills: number; approvals: number;
  };
}

function previewArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

export function normalizeWorkflowCapabilitiesPreview(
  value: Partial<WorkflowCapabilitiesPreview> | null | undefined
): WorkflowCapabilitiesPreview {
  const tools = value?.tools;
  const readTools = previewArray<WorkflowCapabilityToolPreview>(tools?.read);
  const writeTools = previewArray<WorkflowCapabilityToolPreview>(tools?.write);
  const directMcpServers = previewArray<{ id: string; name: string }>(value?.directMcpServers);
  const enabledSkills = previewArray<{ id: string; name: string }>(value?.enabledSkills);
  const approvalRequirements = previewArray<string>(value?.approvalRequirements);
  const counts = value?.counts;

  return {
    workflowId: typeof value?.workflowId === 'string' ? value.workflowId : '',
    mode: value?.mode === 'read_write' ? 'read_write' : 'read_only',
    semanticCapabilityIds: previewArray<string>(value?.semanticCapabilityIds),
    checkedAt: typeof value?.checkedAt === 'string' ? value.checkedAt : '',
    status: value?.status === 'ready' ? 'ready' : 'blocked',
    reasonCodes: previewArray<WorkflowCapabilityPreviewReasonCode>(value?.reasonCodes),
    tools: { read: readTools, write: writeTools },
    directMcpServers,
    enabledSkills,
    mcpRequirements: previewArray<WorkflowMcpRequirementPreview>(value?.mcpRequirements),
    approvalRequirements,
    counts: {
      tools: typeof counts?.tools === 'number' ? counts.tools : readTools.length + writeTools.length,
      readTools: typeof counts?.readTools === 'number' ? counts.readTools : readTools.length,
      writeTools: typeof counts?.writeTools === 'number' ? counts.writeTools : writeTools.length,
      directMcpServers: typeof counts?.directMcpServers === 'number' ? counts.directMcpServers : directMcpServers.length,
      enabledSkills: typeof counts?.enabledSkills === 'number' ? counts.enabledSkills : enabledSkills.length,
      approvals: typeof counts?.approvals === 'number' ? counts.approvals : approvalRequirements.length
    }
  };
}

export interface WorkflowMessageAccepted {
  message_id: string;
  run_id: string;
  executionId: string;
  status: string;
}

export interface WorkflowRunSummary {
  id: string;
  executionId?: string;
  executorRole?: 'coordinator' | 'specialist';
  parentRunId?: string;
  agentId?: string;
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
  name: string;
  status: 'enabled' | 'paused';
  cron: string;
  timezone: string;
  approvedContextGrants: string[];
  principal: { type: 'user'; id: string };
  createdBy?: { userId: string; displayName?: string };
  updatedBy?: { userId: string; displayName?: string };
  createdAt: string;
  updatedAt: string;
  nextRunAt?: string;
  lastRunAt?: string;
  lastStatus?: 'dispatched' | 'failed' | 'auto_paused' | 'skipped';
  lastError?: string;
  lastExecutionId?: string;
  lastRunId?: string;
  latestExecution?: WorkflowExecutionSummary;
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
  approvedContextGrants?: string[];
  principal: { type: 'user'; id: string };
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
  source: 'interactive_tool' | 'workflow_gate' | 'agent_gate' | 'agent_tool' | 'workflow_tool';
  workflowId?: string;
  summary: string;
  toolName: string;
  requestedBy?: string;
  sessionId?: string;
  sessionOrigin?: 'manual' | 'auto_triage';
  sessionTitle?: string;
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

export interface WorkflowCreateInput {
  name: string;
  description?: string;
  prompt: string;
  agentIds: string[];
  tags?: string[];
}

export type WorkflowUpdateInput = Partial<Omit<WorkflowCreateInput, 'agentIds'>> & {
  agentIds: string[];
  status?: WorkflowApiDefinition['status'];
};

export interface WorkflowCoordinationChild {
  id: string;
  childRunId?: string;
  capabilityId: string;
  agent: { id: string; name: string };
  required: boolean;
  status: string;
  failure?: { code: string; message: string };
}

export interface WorkflowExecutionResponse {
  execution: Record<string, unknown>;
  attempts: Array<Record<string, unknown>>;
  coordination?: {
    label: 'AcornOps coordination';
    status: string;
    children: WorkflowCoordinationChild[];
  };
}

export function listWorkspaceWorkflows(workspaceId: string): Promise<WorkflowApiDefinition[]> {
  return requestJson<{ items: WorkflowApiDefinition[] }>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/workflows`
  ).then((page) => page.items);
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

export function getWorkflowExecution(executionId: string): Promise<WorkflowExecutionResponse> {
  return requestJson<WorkflowExecutionResponse>(
    `/api/v1/workflow-executions/${encodeURIComponent(executionId)}`
  );
}

export function listWorkflowOptions(workspaceId: string, agentId?: string): Promise<WorkflowOptionsCatalog> {
  const query = agentId ? `?agentId=${encodeURIComponent(agentId)}` : '';
  return requestJson<WorkflowOptionsCatalog>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/workflow-options${query}`
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
  params: { status?: 'pending' | 'decided' | 'all'; limit?: number; cursor?: string; runId?: string; approvalId?: string } = {}
): Promise<WorkspaceApprovalInboxResponse> {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  if (params.limit) search.set('limit', String(params.limit));
  if (params.cursor) search.set('cursor', params.cursor);
  if (params.runId) search.set('runId', params.runId);
  if (params.approvalId) search.set('approvalId', params.approvalId);
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

export function duplicateWorkflow(
  workspaceId: string,
  workflowId: string,
  name?: string
): Promise<WorkflowApiDefinition> {
  return requestJson<{ workflow: WorkflowApiDefinition }>(
    `/api/v1/workflows/${encodeURIComponent(workflowId)}/duplicate`,
    {
      method: 'POST',
      body: JSON.stringify({ workspaceId, ...(name?.trim() ? { name: name.trim() } : {}) })
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

export function previewWorkflowCapabilities(
  workspaceId: string,
  workflowId: string,
  input: {
    approvedContextGrants?: string[];
  } = {}
): Promise<WorkflowCapabilitiesPreview> {
  return requestJson<Partial<WorkflowCapabilitiesPreview>>(
    `/api/v1/workflows/${encodeURIComponent(workflowId)}/capabilities-preview`,
    {
      method: 'POST',
      body: JSON.stringify({
        workspaceId,
        approvedContextGrants: input.approvedContextGrants || []
      })
    }
  ).then(normalizeWorkflowCapabilitiesPreview);
}

export function postWorkflowSessionMessage(
  sessionId: string,
  input:
    | { kind: 'launch'; clientRequestId?: string }
    | { kind: 'follow_up'; content: string; clientRequestId?: string }
): Promise<WorkflowMessageAccepted> {
  return requestJson<WorkflowMessageAccepted>(
    `/api/v1/workflow-sessions/${encodeURIComponent(sessionId)}/messages`,
    {
      method: 'POST',
      body: JSON.stringify(input)
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
