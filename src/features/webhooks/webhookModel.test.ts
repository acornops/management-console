import { describe, expect, it } from 'vitest';

import {
  isWebhookEventGroupSelected,
  sortedWebhookEvents,
  toggleWebhookEventGroup,
  webhookEventGroups
} from './webhookModel';
import { CONTROL_PLANE_WEBHOOK_EVENT_TYPES } from '@/services/controlPlaneApi';

const issueAlerts = webhookEventGroups.find((group) => group.id === 'issueAlerts')!;

describe('webhook event groups', () => {
  it('selects every event in a group without duplicating existing selections', () => {
    const selected = toggleWebhookEventGroup(
      ['workspace.deleted.v1', 'issue.created.v1'],
      issueAlerts.eventTypes
    );

    expect(selected).toEqual([
      'workspace.deleted.v1',
      'issue.created.v1',
      'issue.reopened.v1',
      'issue.resolved.v1'
    ]);
    expect(isWebhookEventGroupSelected(selected, issueAlerts.eventTypes)).toBe(true);
  });

  it('clears every event in a fully selected group and preserves unrelated selections', () => {
    const selected = toggleWebhookEventGroup(
      ['workspace.deleted.v1', ...issueAlerts.eventTypes],
      issueAlerts.eventTypes
    );

    expect(selected).toEqual(['workspace.deleted.v1']);
    expect(isWebhookEventGroupSelected(selected, issueAlerts.eventTypes)).toBe(false);
  });

  it('repairs a partially selected group by selecting all of its events', () => {
    const selected = toggleWebhookEventGroup(
      ['issue.created.v1', 'issue.resolved.v1'],
      issueAlerts.eventTypes
    );

    expect(selected).toEqual(issueAlerts.eventTypes);
  });

  it('does not offer workspace creation as an outbound event', () => {
    expect(CONTROL_PLANE_WEBHOOK_EVENT_TYPES).not.toContain('workspace.created.v1');
    expect(CONTROL_PLANE_WEBHOOK_EVENT_TYPES).toContain('workspace.deleted.v1');
  });

  it('assigns every individual event to exactly one group', () => {
    const groupedEvents = webhookEventGroups.flatMap((group) => group.eventTypes);

    expect(groupedEvents).toHaveLength(CONTROL_PLANE_WEBHOOK_EVENT_TYPES.length);
    expect(new Set(groupedEvents).size).toBe(groupedEvents.length);
    expect(sortedWebhookEvents(groupedEvents)).toEqual([...CONTROL_PLANE_WEBHOOK_EVENT_TYPES]);
  });
});
