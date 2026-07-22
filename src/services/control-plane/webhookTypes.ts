export const CONTROL_PLANE_WEBHOOK_EVENT_TYPES = [
  'workspace.created.v1',
  'workspace.deleted.v1',
  'target.registered.v1',
  'target.updated.v1',
  'target.deleted.v1',
  'target.status_changed.v1',
  'agent.connected.v1',
  'agent.disconnected.v1',
  'agent.capabilities_changed.v1',
  'agent.key_rotated.v1',
  'session.created.v1',
  'session.deleted.v1',
  'message.received.v1',
  'run.created.v1',
  'run.started.v1',
  'run.completed.v1',
  'run.failed.v1',
  'run.cancelled.v1',
  'run.cancel_requested.v1',
  'run.tool_approval_requested.v1',
  'run.tool_approval_decided.v1',
  'tool.called.v1',
  'mcp.server.created.v1',
  'mcp.server.updated.v1',
  'mcp.server.deleted.v1',
  'mcp.server.tested.v1',
  'tool.catalog.changed.v1'
] as const;

export type ControlPlaneWebhookEventType = typeof CONTROL_PLANE_WEBHOOK_EVENT_TYPES[number];

export interface ControlPlaneWebhookSubscription {
  id: string;
  workspaceId: string;
  targetId?: string | null;
  name: string;
  url: string;
  eventTypes: ControlPlaneWebhookEventType[];
  enabled: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ControlPlaneWebhookCreated extends ControlPlaneWebhookSubscription {
  secret: string;
}

export interface ControlPlaneWebhookHistory {
  id: string;
  subscriptionId: string;
  eventId: string;
  eventType: string;
  workspaceId: string;
  targetId?: string | null;
  subjectType: string;
  subjectId: string;
  payload: Record<string, unknown>;
  status: 'success' | 'failed';
  responseStatus?: number | null;
  error?: string | null;
  durationMs?: number | null;
  sentAt: string;
}

export interface ControlPlaneWebhookInput {
  name: string;
  url: string;
  eventTypes: ControlPlaneWebhookEventType[];
  targetId?: string | null;
  enabled?: boolean;
}

export interface ControlPlaneWebhookPatch {
  name?: string;
  url?: string;
  eventTypes?: ControlPlaneWebhookEventType[];
  targetId?: string | null;
  enabled?: boolean;
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Control plane returned an invalid ${label}`);
  }
  return value as JsonRecord;
}

function requiredString(record: JsonRecord, key: string, label: string): string {
  if (typeof record[key] !== 'string' || record[key].length === 0) {
    throw new Error(`Control plane returned an invalid ${label}: missing ${key}`);
  }
  return record[key];
}

function optionalString(record: JsonRecord, key: string): string | undefined {
  return typeof record[key] === 'string' ? record[key] : undefined;
}

function optionalNullableString(record: JsonRecord, key: string): string | null | undefined {
  return record[key] === null ? null : optionalString(record, key);
}

const eventTypeSet = new Set<string>(CONTROL_PLANE_WEBHOOK_EVENT_TYPES);

function parseEventTypes(value: unknown, label: string): ControlPlaneWebhookEventType[] {
  if (!Array.isArray(value) || value.some((eventType) => typeof eventType !== 'string' || !eventTypeSet.has(eventType))) {
    throw new Error(`Control plane returned an invalid ${label}: unsupported event type`);
  }
  return [...new Set(value)] as ControlPlaneWebhookEventType[];
}

export function parseWebhookSubscription(value: unknown): ControlPlaneWebhookSubscription {
  const record = asRecord(value, 'webhook subscription');
  if (typeof record.enabled !== 'boolean') {
    throw new Error('Control plane returned an invalid webhook subscription: missing enabled');
  }
  return {
    id: requiredString(record, 'id', 'webhook subscription'),
    workspaceId: requiredString(record, 'workspaceId', 'webhook subscription'),
    targetId: optionalNullableString(record, 'targetId'),
    name: requiredString(record, 'name', 'webhook subscription'),
    url: requiredString(record, 'url', 'webhook subscription'),
    eventTypes: parseEventTypes(record.eventTypes, 'webhook subscription'),
    enabled: record.enabled,
    createdBy: optionalString(record, 'createdBy'),
    createdAt: optionalString(record, 'createdAt'),
    updatedAt: optionalString(record, 'updatedAt')
  };
}

export function parseWebhookCreated(value: unknown): ControlPlaneWebhookCreated {
  const record = asRecord(value, 'created webhook');
  return {
    ...parseWebhookSubscription(record),
    secret: requiredString(record, 'secret', 'created webhook')
  };
}

export function parseWebhookHistory(value: unknown): ControlPlaneWebhookHistory {
  const record = asRecord(value, 'webhook delivery history');
  if (record.status !== 'success' && record.status !== 'failed') {
    throw new Error('Control plane returned an invalid webhook delivery history: unsupported status');
  }
  const payload = record.payload === undefined ? {} : asRecord(record.payload, 'webhook delivery payload');
  return {
    id: requiredString(record, 'id', 'webhook delivery history'),
    subscriptionId: requiredString(record, 'subscriptionId', 'webhook delivery history'),
    eventId: requiredString(record, 'eventId', 'webhook delivery history'),
    eventType: requiredString(record, 'eventType', 'webhook delivery history'),
    workspaceId: requiredString(record, 'workspaceId', 'webhook delivery history'),
    targetId: optionalNullableString(record, 'targetId'),
    subjectType: requiredString(record, 'subjectType', 'webhook delivery history'),
    subjectId: requiredString(record, 'subjectId', 'webhook delivery history'),
    payload,
    status: record.status,
    responseStatus: typeof record.responseStatus === 'number' ? record.responseStatus : null,
    error: optionalNullableString(record, 'error'),
    durationMs: typeof record.durationMs === 'number' ? record.durationMs : null,
    sentAt: requiredString(record, 'sentAt', 'webhook delivery history')
  };
}

export function parseWebhookPage(value: unknown): ControlPlaneWebhookSubscription[] {
  const items = Array.isArray(value) ? value : asRecord(value, 'webhook page').items;
  if (!Array.isArray(items)) throw new Error('Control plane returned an invalid webhook page: missing items');
  return items.map(parseWebhookSubscription);
}

export function parseWebhookHistoryPage(value: unknown): ControlPlaneWebhookHistory[] {
  const items = Array.isArray(value) ? value : asRecord(value, 'webhook history page').items;
  if (!Array.isArray(items)) throw new Error('Control plane returned an invalid webhook history page: missing items');
  return items.map(parseWebhookHistory);
}
