import type { FixtureResponse } from './router';
import { FIXTURE_IDS, type FixtureState } from './store';

const NOW = '2026-07-15T08:30:00.000Z';

function json(body: unknown, status = 200): FixtureResponse {
  return { status, body, headers: { 'content-type': 'application/json' } };
}

async function bodyOf(request: Request): Promise<Record<string, any>> {
  const value = await request.json();
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

function fixtureId(): string {
  return `fixture-webhook-${Math.random().toString(36).slice(2, 9)}`;
}

export async function routeWebhookFixtureRequest(input: {
  method: string;
  path: string;
  request: Request;
  state: FixtureState;
}): Promise<FixtureResponse | null> {
  let match = input.path.match(/^\/api\/v1\/workspaces\/([^/]+)\/webhooks$/);
  if (match) {
    if (input.method === 'GET') return json({ items: structuredClone(input.state.webhooks) });
    if (input.method === 'POST') {
      const body = await bodyOf(input.request);
      const webhook = {
        id: fixtureId(), workspaceId: decodeURIComponent(match[1]), targetId: body.targetId ?? null,
        name: String(body.name || 'Fixture webhook'), url: String(body.url || ''),
        eventTypes: Array.isArray(body.eventTypes) ? body.eventTypes : [], enabled: body.enabled !== false,
        createdBy: FIXTURE_IDS.user, createdAt: NOW, updatedAt: NOW
      };
      input.state.webhooks.push(webhook);
      input.state.webhookHistory[webhook.id] = [];
      return json({ ...structuredClone(webhook), secret: 'whsec_fixture_local_only' }, 201);
    }
  }

  match = input.path.match(/^\/api\/v1\/workspaces\/([^/]+)\/webhooks\/([^/]+)\/history$/);
  if (match && input.method === 'GET') {
    return json({ items: structuredClone(input.state.webhookHistory[decodeURIComponent(match[2])] || []) });
  }

  match = input.path.match(/^\/api\/v1\/workspaces\/([^/]+)\/webhooks\/([^/]+)$/);
  if (!match) return null;
  const webhookId = decodeURIComponent(match[2]);
  const webhook = input.state.webhooks.find((item) => item.id === webhookId);
  if (!webhook) return json({ error: { code: 'FIXTURE_NOT_FOUND', message: 'Webhook was not found in the frontend fixture store.' } }, 404);
  if (input.method === 'PATCH') {
    Object.assign(webhook, await bodyOf(input.request), { updatedAt: NOW });
    return json(structuredClone(webhook));
  }
  if (input.method === 'DELETE') {
    input.state.webhooks = input.state.webhooks.filter((item) => item.id !== webhookId);
    delete input.state.webhookHistory[webhookId];
    return { status: 204 };
  }
  return null;
}
