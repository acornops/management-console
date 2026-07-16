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
