import { requestJson } from './http';

export type WorkflowExecutionStatus =
  | 'queued'
  | 'dispatching'
  | 'running'
  | 'waiting_for_approval'
  | 'needs_review'
  | 'cancelling'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type WorkflowExecutionOrigin =
  | { schemaVersion: 1; kind: 'manual' | 'external_integration' | 'agent_chat' | 'historical_event'; label: string }
  | { schemaVersion: 1; kind: 'schedule'; label: string; scheduleId: string }
  | { schemaVersion: 1; kind: 'webhook'; label: string; webhookId: string };

export interface WorkflowExecutionSummary {
  id: string;
  workspaceId: string;
  workflow: { id: string; name: string; version: number };
  status: WorkflowExecutionStatus;
  origin: WorkflowExecutionOrigin;
  rootRun?: {
    id: string;
    targetId?: string;
    targetName?: string;
    targetType?: 'kubernetes' | 'virtual_machine';
    requestedAt: string;
    startedAt?: string;
    endedAt?: string;
  };
  createdBy?: string;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  updatedAt: string;
}

export interface WorkflowActivitySummary {
  openCount: number;
  attentionCount: number;
  totalCount?: number;
  openExecution?: WorkflowExecutionSummary;
  latestExecution?: WorkflowExecutionSummary;
}

export interface WorkflowExecutionPage {
  items: WorkflowExecutionSummary[];
  nextCursor?: string | null;
  summary: { openCount: number; attentionCount: number; latestUpdatedAt?: string };
}

export interface WorkspaceWorkflowExecutionFilters {
  search?: string;
  state?: 'all' | 'open' | 'attention' | 'completed' | 'failed' | 'cancelled';
  origin?: WorkflowExecutionOrigin['kind'];
  workflowId?: string;
  sourceIssueId?: string;
  limit?: number;
  cursor?: string;
}

const executionStatuses = new Set<WorkflowExecutionStatus>([
  'queued',
  'dispatching',
  'running',
  'waiting_for_approval',
  'needs_review',
  'cancelling',
  'completed',
  'failed',
  'cancelled'
]);

const originKinds = new Set<WorkflowExecutionOrigin['kind']>([
  'manual',
  'external_integration',
  'agent_chat',
  'schedule',
  'webhook',
  'historical_event'
]);

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const timestamp = (value: unknown): string | undefined => {
  const candidate = text(value);
  return candidate && Number.isFinite(Date.parse(candidate)) ? candidate : undefined;
};

function parseOrigin(value: unknown): WorkflowExecutionOrigin | null {
  const input = record(value);
  const kind = input?.kind;
  const label = text(input?.label);
  if (!input || input.schemaVersion !== 1 || !label || !originKinds.has(kind as WorkflowExecutionOrigin['kind'])) {
    return null;
  }
  if (kind === 'manual' || kind === 'external_integration' || kind === 'agent_chat' || kind === 'historical_event') {
    return { schemaVersion: 1, kind, label };
  }
  if (kind === 'schedule') {
    const scheduleId = text(input.scheduleId);
    return scheduleId ? { schemaVersion: 1, kind, label, scheduleId } : null;
  }
  const webhookId = text(input.webhookId);
  return webhookId ? { schemaVersion: 1, kind: 'webhook', label, webhookId } : null;
}

function parseExecution(value: unknown): WorkflowExecutionSummary | null {
  const input = record(value);
  const workflow = record(input?.workflow);
  const status = input?.status;
  const origin = parseOrigin(input?.origin);
  const createdAt = timestamp(input?.createdAt);
  const updatedAt = timestamp(input?.updatedAt);
  if (
    !input
    || !text(input.id)
    || !text(input.workspaceId)
    || !workflow
    || !text(workflow.id)
    || !text(workflow.name)
    || !Number.isInteger(workflow.version)
    || Number(workflow.version) < 1
    || !executionStatuses.has(status as WorkflowExecutionStatus)
    || !origin
    || !createdAt
    || !updatedAt
  ) return null;

  const rootInput = input.rootRun === undefined ? null : record(input.rootRun);
  const rootRequestedAt = rootInput ? timestamp(rootInput.requestedAt) : undefined;
  if (input.rootRun !== undefined && (!rootInput || !text(rootInput.id) || !rootRequestedAt)) return null;
  const rootTargetType = rootInput?.targetType;
  if (
    rootTargetType !== undefined
    && rootTargetType !== 'kubernetes'
    && rootTargetType !== 'virtual_machine'
  ) return null;
  const parsedRootTargetType = rootTargetType as 'kubernetes' | 'virtual_machine' | undefined;

  return {
    id: text(input.id)!,
    workspaceId: text(input.workspaceId)!,
    workflow: {
      id: text(workflow.id)!,
      name: text(workflow.name)!,
      version: Number(workflow.version)
    },
    status: status as WorkflowExecutionStatus,
    origin,
    ...(rootInput ? {
      rootRun: {
        id: text(rootInput.id)!,
        ...(text(rootInput.targetId) ? { targetId: text(rootInput.targetId) } : {}),
        ...(text(rootInput.targetName) ? { targetName: text(rootInput.targetName) } : {}),
        ...(parsedRootTargetType ? { targetType: parsedRootTargetType } : {}),
        requestedAt: rootRequestedAt!,
        ...(timestamp(rootInput.startedAt) ? { startedAt: timestamp(rootInput.startedAt) } : {}),
        ...(timestamp(rootInput.endedAt) ? { endedAt: timestamp(rootInput.endedAt) } : {})
      }
    } : {}),
    ...(text(input.createdBy) ? { createdBy: text(input.createdBy) } : {}),
    createdAt,
    ...(timestamp(input.startedAt) ? { startedAt: timestamp(input.startedAt) } : {}),
    ...(timestamp(input.endedAt) ? { endedAt: timestamp(input.endedAt) } : {}),
    updatedAt
  };
}

export function normalizeWorkflowExecutionPage(value: unknown): WorkflowExecutionPage {
  const input = record(value);
  const summary = record(input?.summary);
  const items = Array.isArray(input?.items) ? input.items.map(parseExecution) : null;
  const openCount = summary?.openCount;
  const attentionCount = summary?.attentionCount;
  if (
    !input
    || !items
    || items.some((item) => item === null)
    || !Number.isInteger(openCount)
    || Number(openCount) < 0
    || !Number.isInteger(attentionCount)
    || Number(attentionCount) < 0
  ) {
    throw new Error('Control plane returned invalid workflow activity data');
  }
  const rawNextCursor = input.nextCursor;
  if (rawNextCursor !== undefined && rawNextCursor !== null && typeof rawNextCursor !== 'string') {
    throw new Error('Control plane returned invalid workflow activity data');
  }
  const nextCursor = rawNextCursor as string | null | undefined;
  const latestUpdatedAt = summary.latestUpdatedAt === undefined
    ? undefined
    : timestamp(summary.latestUpdatedAt);
  if (summary.latestUpdatedAt !== undefined && !latestUpdatedAt) {
    throw new Error('Control plane returned invalid workflow activity data');
  }
  return {
    items: items as WorkflowExecutionSummary[],
    ...(nextCursor === undefined ? {} : { nextCursor }),
    summary: {
      openCount: Number(openCount),
      attentionCount: Number(attentionCount),
      ...(latestUpdatedAt ? { latestUpdatedAt } : {})
    }
  };
}

export async function listWorkspaceWorkflowExecutions(
  workspaceId: string,
  filters: WorkspaceWorkflowExecutionFilters = {}
): Promise<WorkflowExecutionPage> {
  const params = new URLSearchParams();
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  if (filters.state && filters.state !== 'all') params.set('state', filters.state);
  if (filters.origin) params.set('origin', filters.origin);
  if (filters.workflowId) params.set('workflowId', filters.workflowId);
  if (filters.sourceIssueId) params.set('sourceIssueId', filters.sourceIssueId);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.cursor) params.set('cursor', filters.cursor);
  const query = params.toString();
  return normalizeWorkflowExecutionPage(await requestJson<unknown>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/workflow-executions${query ? `?${query}` : ''}`
  ));
}
