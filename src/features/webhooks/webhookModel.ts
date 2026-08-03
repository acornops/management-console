import {
  CONTROL_PLANE_WEBHOOK_EVENT_TYPES,
  type ControlPlaneWebhookEventType,
  type ControlPlaneWebhookSubscription
} from '@/services/controlPlaneApi';
import { formatIdentifierLabel } from '@/utils/textFormatting';

export interface WebhookDraft {
  name: string;
  url: string;
  eventTypes: ControlPlaneWebhookEventType[];
  enabled: boolean;
}

export const emptyWebhookDraft = (): WebhookDraft => ({
  name: '',
  url: '',
  eventTypes: ['issue.created.v1', 'issue.reopened.v1', 'issue.resolved.v1'],
  enabled: true
});

export function suggestWebhookName(value: string): string {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    const hostname = url.hostname.replace(/^www\./, '');
    return hostname ? `${hostname} webhook` : '';
  } catch {
    return '';
  }
}

export const webhookEventGroups: Array<{
  id:
    | 'workspaceChanges'
    | 'targetHealth'
    | 'agentChanges'
    | 'sessionActivity'
    | 'runAlerts'
    | 'issueAlerts'
    | 'toolingActivity';
  eventTypes: ControlPlaneWebhookEventType[];
}> = [
  {
    id: 'workspaceChanges',
    eventTypes: ['workspace.deleted.v1', 'target.registered.v1', 'target.updated.v1', 'target.deleted.v1']
  },
  {
    id: 'targetHealth',
    eventTypes: ['target.status_changed.v1', 'agent.connected.v1', 'agent.disconnected.v1']
  },
  {
    id: 'agentChanges',
    eventTypes: ['agent.capabilities_changed.v1', 'agent.key_rotated.v1']
  },
  {
    id: 'sessionActivity',
    eventTypes: ['session.created.v1', 'session.deleted.v1', 'message.received.v1']
  },
  {
    id: 'runAlerts',
    eventTypes: [
      'run.created.v1',
      'run.started.v1',
      'run.completed.v1',
      'run.failed.v1',
      'run.cancelled.v1',
      'run.cancel_requested.v1',
      'run.tool_approval_requested.v1',
      'run.tool_approval_decided.v1'
    ]
  },
  {
    id: 'issueAlerts',
    eventTypes: ['issue.created.v1', 'issue.reopened.v1', 'issue.resolved.v1']
  },
  {
    id: 'toolingActivity',
    eventTypes: [
      'tool.called.v1',
      'mcp.server.created.v1',
      'mcp.server.updated.v1',
      'mcp.server.deleted.v1',
      'mcp.server.tested.v1',
      'tool.catalog.changed.v1'
    ]
  }
];

export function draftFromWebhook(webhook: ControlPlaneWebhookSubscription): WebhookDraft {
  return {
    name: webhook.name,
    url: webhook.url,
    eventTypes: webhook.eventTypes,
    enabled: webhook.enabled
  };
}

export function sortedWebhookEvents(events: ControlPlaneWebhookEventType[]): ControlPlaneWebhookEventType[] {
  const order = new Map(CONTROL_PLANE_WEBHOOK_EVENT_TYPES.map((eventType, index) => [eventType, index]));
  return [...new Set(events)].sort((left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0));
}

export function isWebhookEventGroupSelected(
  selectedEvents: ControlPlaneWebhookEventType[],
  groupEvents: ControlPlaneWebhookEventType[]
): boolean {
  const selected = new Set(selectedEvents);
  return groupEvents.every((eventType) => selected.has(eventType));
}

export function toggleWebhookEventGroup(
  selectedEvents: ControlPlaneWebhookEventType[],
  groupEvents: ControlPlaneWebhookEventType[]
): ControlPlaneWebhookEventType[] {
  const next = new Set(selectedEvents);
  const groupSelected = groupEvents.every((eventType) => next.has(eventType));
  groupEvents.forEach((eventType) => {
    if (groupSelected) next.delete(eventType);
    else next.add(eventType);
  });
  return sortedWebhookEvents(Array.from(next));
}

export function webhookEventLabel(eventType: string): string {
  return eventType
    .replace(/\.v1$/, '')
    .split('.')
    .map((segment) => formatIdentifierLabel(segment))
    .join(' / ');
}
