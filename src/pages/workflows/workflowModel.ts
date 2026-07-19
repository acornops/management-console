export type WorkflowStatus = 'active' | 'draft' | 'paused';
export type WorkflowCapabilityMode = 'read_only' | 'read_write';
export type WorkflowCapabilityRestrictionMode = 'inherit' | 'restrict';
export type WorkflowTab = 'overview' | 'agents' | 'capabilities' | 'runs' | 'settings';
export type WorkflowPrimaryAction = 'launch' | 'activate' | 'setup';

export interface WorkflowInput {
  name: string;
  label: string;
  type: 'text' | 'select' | 'cluster' | 'chat_session_list' | 'repository' | 'format';
  required: boolean;
  optionSource?: string;
}

export interface WorkflowRunRecord {
  id: string;
  runId?: string;
  status: 'queued' | 'dispatching' | 'running' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled' | 'cancelling';
  actor: string;
  duration: string;
  approvals: number;
  output: string;
  startedAt: string;
}

export interface WorkflowRunMessage {
  id: string;
  runId: string;
  role: 'operator' | 'agent' | 'system';
  author: string;
  content: string;
  createdAt: string;
  status: 'sending' | 'sent' | 'failed';
}

export interface WorkflowAgentReference {
  agentId: string;
  name: string;
  role: string;
  required: boolean;
}

export interface WorkflowDefinition {
  id: string;
  workspaceId: string;
  version?: number;
  name: string;
  description: string;
  status: WorkflowStatus;
  source?: 'system' | 'user';
  origin?: { type: 'template' | 'manual'; templateId?: string; templateVersion?: number };
  createdBy?: string;
  agentIds: string[];
  executionMode: 'direct' | 'coordinated';
  semanticCapabilityIds: string[];
  capabilityRestrictionMode: WorkflowCapabilityRestrictionMode;
  targetConstraints?: { targetTypes: string[]; targetIds: string[] };
  readiness?: { status: 'ready' | 'needs_setup' | 'blocked'; reasons: string[] };
  owner: string;
  tags: string[];
  lastRun: string;
  agents: WorkflowAgentReference[];
  requiredPermissions: string[];
  contextGrants: string[];
  inputs: WorkflowInput[];
  policy: {
    mode: WorkflowCapabilityMode;
    approvals: string[];
  };
  starterPrompt: string;
  runs: WorkflowRunRecord[];
}

export function isSystemProvidedWorkflow(workflow: Pick<WorkflowDefinition, 'origin' | 'source'>): boolean {
  return workflow.origin?.type === 'template' || workflow.source === 'system';
}

export function getWorkflowDeleteBlocker(workflow: WorkflowDefinition | undefined, canManage: boolean): string {
  if (!workflow || canManage) return '';
  return 'You need manage_workflows to delete workflows.';
}

export type WorkflowLaunchPermissions = Partial<Record<'create_sessions' | 'create_read_only_runs' | 'create_read_write_runs', boolean>>;

export function parseWorkflowSearchTokens(query: string): string[] {
  return query.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
}

export function appendWorkflowSearchTag(query: string, tag: string): string {
  const current = query.trim();
  const currentTokens = parseWorkflowSearchTokens(current);
  const tagTokens = parseWorkflowSearchTokens(tag);
  if (tagTokens.every((token) => currentTokens.includes(token))) return current;
  return [current, tag].filter(Boolean).join(' ');
}

function workflowRouteParams(search: string): URLSearchParams {
  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
}

function normalizeWorkflowRouteTarget(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getWorkflowRouteQuery(search: string): string {
  return workflowRouteParams(search).get('q')?.trim() || '';
}

export function getWorkflowRouteSelectionTarget(search: string): string {
  const params = workflowRouteParams(search);
  return (
    params.get('workflow') ||
    params.get('workflowId') ||
    params.get('selectedWorkflow') ||
    ''
  ).trim();
}

export function findLegacyWorkflowQuerySelection(workflows: WorkflowDefinition[], search: string): WorkflowDefinition | undefined {
  const params = workflowRouteParams(search);
  if (getWorkflowRouteSelectionTarget(search)) return undefined;
  const normalizedQuery = normalizeWorkflowRouteTarget(params.get('q') || '');
  if (!normalizedQuery) return undefined;
  return workflows.find((workflow) => normalizeWorkflowRouteTarget(workflow.name) === normalizedQuery);
}

export function filterWorkflowDefinitions(workflows: WorkflowDefinition[], query: string): WorkflowDefinition[] {
  const queryTokens = parseWorkflowSearchTokens(query);
  if (queryTokens.length === 0) return workflows;

  return workflows.filter((workflow) => {
    const searchable = [
      workflow.name,
      workflow.description,
      workflow.tags.join(' '),
      workflow.status,
      workflow.policy.mode,
      workflow.policy.approvals.join(' '),
      workflow.requiredPermissions.join(' '),
      workflow.contextGrants.join(' ')
    ].join(' ').toLowerCase().replace(/[^a-z0-9]+/g, ' ');
    return queryTokens.every((token) => searchable.includes(token));
  });
}

export function getWorkflowById(workflows: WorkflowDefinition[], workflowId: string): WorkflowDefinition | undefined {
  return workflows.find((workflow) => workflow.id === workflowId);
}

export function findWorkflowByRouteTarget(workflows: WorkflowDefinition[], target: string): WorkflowDefinition | undefined {
  const normalizedTarget = normalizeWorkflowRouteTarget(target);
  if (!normalizedTarget) return undefined;
  return workflows.find((workflow) => (
    normalizeWorkflowRouteTarget(workflow.id) === normalizedTarget ||
    normalizeWorkflowRouteTarget(workflow.name) === normalizedTarget
  ));
}

export function getOptimisticWorkflowRunStatus(workflow: WorkflowDefinition): WorkflowRunRecord['status'] {
  return workflow.policy.approvals.length > 0 ? 'waiting_approval' : 'dispatching';
}

export function getWorkflowPrimaryAction(workflow: WorkflowDefinition): WorkflowPrimaryAction {
  if (workflow.readiness?.status && workflow.readiness.status !== 'ready') return 'setup';
  return workflow.status === 'active' ? 'launch' : 'activate';
}

export function getWorkflowLaunchBlocker(
  workflow: WorkflowDefinition,
  message: string,
  permissions?: WorkflowLaunchPermissions
): string | null {
  if (workflow.status !== 'active') return 'Activate this workflow before launching it.';
  if (workflow.readiness?.status && workflow.readiness.status !== 'ready') {
    return workflow.readiness.reasons[0] || 'Complete workflow setup before launch.';
  }
  if (!message.trim()) return 'Add a control message before launching.';
  if (!permissions?.create_sessions) return 'You need create_sessions to launch workflows.';
  if (workflow.policy.mode === 'read_write' && !permissions.create_read_write_runs) {
    return 'You need create_read_write_runs to launch this workflow.';
  }
  if (workflow.policy.mode === 'read_only' && !permissions.create_read_only_runs) {
    return 'You need create_read_only_runs to launch this workflow.';
  }
  return null;
}

export function getWorkflowTabLabel(tab: WorkflowTab): string {
  if (tab === 'overview') return 'Overview';
  if (tab === 'agents') return 'Agents';
  if (tab === 'capabilities') return 'Capability review';
  if (tab === 'runs') return 'Runs';
  return 'Settings';
}
