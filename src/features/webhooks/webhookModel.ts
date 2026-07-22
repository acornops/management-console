import {
  CONTROL_PLANE_WEBHOOK_EVENT_TYPES,
  type ControlPlaneWebhookEventType,
  type ControlPlaneWebhookSubscription
} from '@/services/controlPlaneApi';

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

export const webhookEventGroups: Array<{
  id: 'issueAlerts' | 'runAlerts' | 'targetHealth' | 'workspaceChanges';
  eventTypes: ControlPlaneWebhookEventType[];
}> = [
  {
    id: 'issueAlerts',
    eventTypes: ['issue.created.v1', 'issue.reopened.v1', 'issue.resolved.v1']
  },
  {
    id: 'runAlerts',
    eventTypes: ['run.failed.v1', 'run.cancelled.v1', 'run.tool_approval_requested.v1']
  },
  {
    id: 'targetHealth',
    eventTypes: ['target.status_changed.v1', 'agent.connected.v1', 'agent.disconnected.v1']
  },
  {
    id: 'workspaceChanges',
    eventTypes: ['workspace.created.v1', 'workspace.deleted.v1', 'target.registered.v1', 'target.updated.v1', 'target.deleted.v1']
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

export function webhookEventLabel(eventType: string): string {
  return eventType.replace(/\.v1$/, '').replaceAll('.', ' / ').replaceAll('_', ' ');
}
