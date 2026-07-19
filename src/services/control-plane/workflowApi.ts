import { requestJson } from './http';
import type { ControlPlaneRunEvent, ControlPlaneRunToolApproval } from './types';

export type WorkflowApiDefinition = Record<string, unknown> & {
  id: string;
  workspaceId: string;
  version: number;
  origin?: { type: 'template' | 'manual'; templateId?: string; templateVersion?: number };
  source?: 'system' | 'user';
  templateId?: string;
  name: string;
  description?: string;
  status?: 'active' | 'draft' | 'paused';
  createdBy?: string;
  createdByUser?: { id?: string; userId?: string; displayName?: string; email?: string };
  createdAt?: string;
  prompt?: string;
  starterPrompt?: string;
  agentIds: string[];
  executionMode: 'direct' | 'coordinated';
  targetConstraints?: { targetTypes: string[]; targetIds: string[] };
  tags?: string[];
  inputs?: WorkflowApiInputDefinition[];
  requiredPermissions?: string[];
  capabilityPolicy: {
    mode: 'read_only' | 'read_write';
    restrictionMode: 'inherit' | 'restrict';
    semanticCapabilityIds: string[];
    contextGrants: string[];
    maxRuntimeSeconds: number;
    retentionDays: number;
    approvalRequirements: string[];
  };
  readiness?: { status: 'ready' | 'needs_setup' | 'blocked'; reasons: string[] };
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
    source: 'workspace' | 'target' | 'agent';
    provider?: 'github' | 'gitlab';
    targetId?: string;
    targetName?: string;
    targetType?: 'kubernetes' | 'virtual_machine';
    agentId?: string;
    serverId?: string;
    toolName?: string;
  };
}

export interface WorkflowOptionsCatalog {
  targets?: WorkflowOption[];
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

export interface WorkflowSessionResponse {
  session: {
    id: string;
    workflowId: string;
    workspaceId: string;
    workflowVersion: number;
  } & Record<string, unknown>;
  compiledAccessScope: Record<string, unknown>;
}

export type WorkflowCapabilityPreviewReasonCode =
  | 'TARGET_REQUIRED' | 'TARGET_NOT_FOUND' | 'TARGET_TYPE_MISMATCH' | 'TARGET_OFFLINE'
  | 'TARGET_STATUS_UNKNOWN' | 'TARGET_WRITE_UNSUPPORTED' | 'CAPABILITY_MAPPING_UNAVAILABLE'
  | 'TARGET_TOOL_MAPPING_UNAVAILABLE' | 'TARGET_TOOL_CATALOG_UNAVAILABLE'
  | 'MCP_CONNECTION_UNAVAILABLE';

export interface WorkflowTargetCapabilityCandidate {
  id: string;
  name: string;
  targetType: 'kubernetes' | 'virtual_machine';
  status: 'ready' | 'unavailable' | 'unsupported';
  reasonCode?: WorkflowCapabilityPreviewReasonCode;
  reason?: string;
}

export interface WorkflowCapabilityToolPreview {
  id: string;
  name: string;
  label: string;
  description?: string;
  access: 'read' | 'write';
  source: 'target' | 'mcp' | 'builtin';
}

export interface WorkflowMcpRequirementPreview {
  serverId: string;
  serverName: string;
  authType: 'bearer_token' | 'custom_header';
  owningAgent: { id: string; name: string };
  connectionState: 'connection_missing' | 'connection_error' | 'connected';
  authRequirement: {
    scope: 'personal';
    credentialLabel: string;
    requiredInformation: Array<{ name: string; description: string }>;
  };
  action: 'connect_mcp_server' | 'verify_mcp_server' | 'none';
}

export interface WorkflowCapabilitiesPreview {
  workflowId: string;
  workflowVersion: number;
  mode: 'read_only' | 'read_write';
  semanticCapabilityIds: string[];
  checkedAt: string;
  status: 'needs_target' | 'ready' | 'blocked';
  reasonCodes: WorkflowCapabilityPreviewReasonCode[];
  targetCandidates: WorkflowTargetCapabilityCandidate[];
  selectedTarget?: WorkflowTargetCapabilityCandidate;
  compiledAccessScope?: Record<string, unknown>;
  tools: { read: WorkflowCapabilityToolPreview[]; write: WorkflowCapabilityToolPreview[] };
  directMcpServers: Array<{ id: string; name: string }>;
  enabledSkills: Array<{ id: string; name: string }>;
  mcpRequirements: WorkflowMcpRequirementPreview[];
  approvalRequirements: string[];
  counts: {
    targets: number; readyTargets: number; tools: number; readTools: number; writeTools: number;
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
  const targetCandidates = previewArray<WorkflowTargetCapabilityCandidate>(value?.targetCandidates);
  const directMcpServers = previewArray<{ id: string; name: string }>(value?.directMcpServers);
  const enabledSkills = previewArray<{ id: string; name: string }>(value?.enabledSkills);
  const approvalRequirements = previewArray<string>(value?.approvalRequirements);
  const counts = value?.counts;

  return {
    workflowId: typeof value?.workflowId === 'string' ? value.workflowId : '',
    workflowVersion: typeof value?.workflowVersion === 'number' ? value.workflowVersion : 0,
    mode: value?.mode === 'read_write' ? 'read_write' : 'read_only',
    semanticCapabilityIds: previewArray<string>(value?.semanticCapabilityIds),
    checkedAt: typeof value?.checkedAt === 'string' ? value.checkedAt : '',
    status: value?.status === 'ready' || value?.status === 'needs_target' ? value.status : 'blocked',
    reasonCodes: previewArray<WorkflowCapabilityPreviewReasonCode>(value?.reasonCodes),
    targetCandidates,
    ...(value?.selectedTarget ? { selectedTarget: value.selectedTarget } : {}),
    ...(value?.compiledAccessScope ? { compiledAccessScope: value.compiledAccessScope } : {}),
    tools: { read: readTools, write: writeTools },
    directMcpServers,
    enabledSkills,
    mcpRequirements: previewArray<WorkflowMcpRequirementPreview>(value?.mcpRequirements),
    approvalRequirements,
    counts: {
      targets: typeof counts?.targets === 'number' ? counts.targets : targetCandidates.length,
      readyTargets: typeof counts?.readyTargets === 'number' ? counts.readyTargets : targetCandidates.filter((candidate) => candidate.status === 'ready').length,
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
  workflow_run_id: string;
  executionId: string;
  status: string;
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
  principal: { type: 'user'; id: string };
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
  source: 'target_tool' | 'workflow_gate' | 'agent_gate' | 'agent_tool' | 'workflow_tool';
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
  agentIds: string[];
  targetConstraints?: { targetTypes: string[]; targetIds: string[] } | null;
  capabilityPolicy?: {
    mode?: 'read_only' | 'read_write';
    restrictionMode?: 'inherit' | 'restrict';
    semanticCapabilityIds?: string[];
    contextGrants?: string[];
    approvalRequirements?: string[];
  };
}

export interface WorkflowCreateInput {
  name: string;
  description?: string;
  prompt: string;
  agentIds: string[];
  targetConstraints?: { targetTypes: string[]; targetIds: string[] };
  tags?: string[];
  inputs?: WorkflowApiInputDefinition[];
  requiredPermissions?: string[];
  capabilityPolicy?: {
    mode?: 'read_only' | 'read_write';
    restrictionMode?: 'inherit' | 'restrict';
    semanticCapabilityIds?: string[];
    contextGrants?: string[];
    /** @deprecated Accepted for compatibility; the deployment limit is authoritative. */
    maxRuntimeSeconds?: number;
    /** @deprecated Accepted for compatibility; the deployment retention policy is authoritative. */
    retentionDays?: number;
    approvalRequirements?: string[];
  };
}

export type WorkflowUpdateInput = Partial<Omit<WorkflowCreateInput, 'agentIds'>> & {
  agentIds: string[];
  status?: WorkflowApiDefinition['status'];
};

export interface WorkflowCoordinationChild {
  id: string;
  childRunId?: string;
  capabilityId: string;
  target: { id: string; targetType: 'kubernetes' | 'virtual_machine' };
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
    target?: { id: string; targetType: 'kubernetes' | 'virtual_machine' };
    inputs?: Record<string, unknown>;
  } = {}
): Promise<WorkflowCapabilitiesPreview> {
  return requestJson<Partial<WorkflowCapabilitiesPreview>>(
    `/api/v1/workflows/${encodeURIComponent(workflowId)}/capabilities-preview`,
    {
      method: 'POST',
      body: JSON.stringify({
        workspaceId,
        approvedContextGrants: input.approvedContextGrants || [],
        inputs: input.inputs || {},
        ...(input.target ? { target: input.target } : {})
      })
    }
  ).then(normalizeWorkflowCapabilitiesPreview);
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
  input: {
    content: string;
    inputs?: Record<string, unknown>;
    targetId?: string;
    targetType?: 'kubernetes' | 'virtual_machine';
  }
): Promise<WorkflowMessageAccepted> {
  return requestJson<WorkflowMessageAccepted>(
    `/api/v1/workflow-sessions/${encodeURIComponent(sessionId)}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({
        workspaceId,
        content: input.content,
        inputs: input.inputs || {},
        ...(input.targetId ? { targetId: input.targetId } : {}),
        ...(input.targetType ? { targetType: input.targetType } : {})
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
