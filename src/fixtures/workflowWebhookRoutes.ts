import { FIXTURE_IDS, type FixtureState } from './store';

interface FixtureResponse {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

interface RouteInput {
  request: Request;
  state: FixtureState;
  path: string;
  method: string;
}

function json(body: unknown, status = 200): FixtureResponse {
  return { status, body, headers: { 'content-type': 'application/json' } };
}

function noContent(): FixtureResponse {
  return { status: 204 };
}

function notFound(): FixtureResponse {
  return json({
    error: {
      code: 'FIXTURE_NOT_FOUND',
      message: 'Workflow webhook was not found in the frontend fixture store.'
    }
  }, 404);
}

async function bodyOf(request: Request): Promise<Record<string, any>> {
  try {
    const value = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, any>
      : {};
  } catch {
    return {};
  }
}

function id(): string {
  return `fixture-workflow-webhook-${Math.random().toString(36).slice(2, 9)}`;
}

export async function routeWorkflowWebhookFixtureRequest(
  input: RouteInput
): Promise<FixtureResponse | null> {
  const { request, state, path, method } = input;
  let match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/workflow-webhooks$/);
  if (match) {
    const workspaceId = decodeURIComponent(match[1]);
    if (method === 'GET') {
      return json({
        items: structuredClone(
          state.workflowWebhooks.filter((item) => item.workspaceId === workspaceId)
        )
      });
    }
    if (method === 'POST') {
      const requestBody = await bodyOf(request);
      const webhookId = id();
      const signingSecret = {
        url: `/api/v1/workflow-webhooks/${webhookId}/events`,
        secret: 'fixture-webhook-signing-secret',
        secretDisclosure: 'one_time'
      };
      const webhook = {
        id: webhookId,
        workspaceId,
        status: requestBody.enabled === false ? 'paused' : 'enabled',
        approvedContextGrants: [],
        principal: { type: 'user', id: FIXTURE_IDS.user },
        endpointUrl: signingSecret.url,
        ...requestBody
      };
      state.workflowWebhooks.push(webhook);
      return json({
        webhook: structuredClone(webhook),
        signingSecret
      }, 201);
    }
  }

  match = path.match(/^\/api\/v1\/workflow-webhooks\/([^/]+)\/rotate-secret$/);
  if (match && method === 'POST') {
    const webhook = state.workflowWebhooks.find(
      (item) => item.id === decodeURIComponent(match[1])
    );
    if (!webhook) return notFound();
    return json({
      webhook: structuredClone(webhook),
      signingSecret: {
        url: webhook.endpointUrl,
        secret: 'fixture-rotated-webhook-signing-secret',
        secretDisclosure: 'one_time'
      }
    });
  }

  match = path.match(/^\/api\/v1\/workflow-webhooks\/([^/]+)$/);
  if (!match) return null;
  const webhookId = decodeURIComponent(match[1]);
  const webhook = state.workflowWebhooks.find((item) => item.id === webhookId);
  if (!webhook) return notFound();
  if (method === 'PATCH') {
    const requestBody = await bodyOf(request);
    Object.assign(webhook, requestBody, {
      status: typeof requestBody.enabled === 'boolean'
        ? (requestBody.enabled ? 'enabled' : 'paused')
        : webhook.status
    });
    return json({ webhook: structuredClone(webhook) });
  }
  if (method === 'DELETE') {
    state.workflowWebhooks = state.workflowWebhooks.filter(
      (item) => item.id !== webhookId
    );
    return noContent();
  }
  return null;
}
