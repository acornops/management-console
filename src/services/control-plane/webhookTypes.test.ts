import { describe, expect, it } from 'vitest';

import {
  parseWebhookCreated,
  parseWebhookHistoryPage,
  parseWebhookPage
} from './webhookTypes';

const subscription = {
  id: 'webhook-1',
  workspaceId: 'workspace-1',
  targetId: null,
  name: 'Mattermost',
  url: 'https://bot.example.com/acornops/webhook',
  eventTypes: ['run.failed.v1'],
  enabled: true,
  createdAt: '2026-07-22T00:00:00.000Z'
};

describe('webhook response parsing', () => {
  it('accepts current paged lists and older bare-array demo responses', () => {
    expect(parseWebhookPage({ items: [subscription] })).toEqual([subscription]);
    expect(parseWebhookPage([subscription])).toEqual([subscription]);
  });

  it('requires the one-time secret on create responses', () => {
    expect(parseWebhookCreated({ ...subscription, secret: 'secret-1' })).toMatchObject({ secret: 'secret-1' });
    expect(() => parseWebhookCreated(subscription)).toThrow('missing secret');
  });

  it('normalizes current webhook history envelopes', () => {
    const history = {
      id: 'history-1',
      subscriptionId: 'webhook-1',
      eventId: 'event-1',
      eventType: 'run.failed.v1',
      workspaceId: 'workspace-1',
      targetId: null,
      subjectType: 'run',
      subjectId: 'run-1',
      payload: {},
      status: 'failed',
      responseStatus: 503,
      error: 'unavailable',
      durationMs: 25,
      sentAt: '2026-07-22T00:00:01.000Z'
    };
    expect(parseWebhookHistoryPage({ items: [history] })).toEqual([history]);
  });

  it('fails closed on unsupported events or malformed history', () => {
    expect(() => parseWebhookPage({ items: [{ ...subscription, eventTypes: ['future.event.v2'] }] })).toThrow('unsupported event type');
    expect(() => parseWebhookHistoryPage({ items: [{ id: 'history-1' }] })).toThrow('unsupported status');
  });
});
