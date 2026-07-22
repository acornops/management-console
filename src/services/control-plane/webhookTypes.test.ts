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
      attemptNumber: 2,
      willRetry: true,
      nextAttemptAt: '2026-07-22T00:01:01.000Z',
      terminalReason: null,
      sentAt: '2026-07-22T00:00:01.000Z'
    };
    expect(parseWebhookHistoryPage({ items: [history] })).toEqual([history]);
  });

  it.each(['paused', 'superseded', 'cancelled'] as const)('accepts durable %s delivery history', (status) => {
    const [history] = parseWebhookHistoryPage({
      items: [{
        id: `history-${status}`,
        subscriptionId: 'webhook-1',
        eventId: 'evt-1',
        eventType: 'issue.created.v1',
        workspaceId: 'workspace-1',
        targetId: null,
        subjectType: 'issue',
        subjectId: 'issue-1',
        payload: {},
        status,
        responseStatus: null,
        error: null,
        durationMs: null,
        attemptNumber: 1,
        willRetry: false,
        nextAttemptAt: null,
        terminalReason: status === 'paused' ? 'issue_recovering' : 'issue_lifecycle_advanced',
        sentAt: '2026-07-22T00:00:01.000Z'
      }]
    });
    expect(history).toMatchObject({ status, attemptNumber: 1, willRetry: false });
  });

  it('fails closed on unsupported events or malformed history', () => {
    expect(() => parseWebhookPage({ items: [{ ...subscription, eventTypes: ['future.event.v2'] }] })).toThrow('unsupported event type');
    expect(() => parseWebhookHistoryPage({ items: [{ id: 'history-1' }] })).toThrow('unsupported status');
  });

  it('requires durable attempt metadata', () => {
    expect(() => parseWebhookHistoryPage({ items: [{
      id: 'history-1',
      subscriptionId: 'webhook-1',
      eventId: 'evt-1',
      eventType: 'issue.created.v1',
      workspaceId: 'workspace-1',
      subjectType: 'issue',
      subjectId: 'issue-1',
      payload: {},
      status: 'success',
      sentAt: '2026-07-22T00:00:01.000Z'
    }] })).toThrow('missing attemptNumber');
  });
});
