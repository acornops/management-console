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
      message: 'Workflow event trigger was not found in the frontend fixture store.'
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
  return `fixture-event-trigger-${Math.random().toString(36).slice(2, 9)}`;
}

export async function routeWorkflowEventTriggerFixtureRequest(
  input: RouteInput
): Promise<FixtureResponse | null> {
  const { request, state, path, method } = input;
  let match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/workflow-event-triggers$/);
  if (match) {
    const workspaceId = decodeURIComponent(match[1]);
    if (method === 'GET') {
      return json({
        items: structuredClone(
          state.workflowEventTriggers.filter((item) => item.workspaceId === workspaceId)
        )
      });
    }
    if (method === 'POST') {
      const requestBody = await bodyOf(request);
      const triggerId = id();
      const webhook = requestBody.sourceType === 'webhook'
        ? {
            url: `/api/v1/workflow-event-triggers/${triggerId}/events`,
            secret: 'fixture-webhook-signing-secret',
            secretDisclosure: 'one_time'
          }
        : undefined;
      const trigger = {
        id: triggerId,
        workspaceId,
        status: requestBody.enabled === false ? 'paused' : 'enabled',
        eventType: requestBody.sourceType === 'acornops_event' ? 'issue.created.v1' : null,
        inputBindings: {},
        approvedContextGrants: [],
        principal: { type: 'user', id: FIXTURE_IDS.user },
        endpointUrl: webhook?.url,
        ...requestBody
      };
      state.workflowEventTriggers.push(trigger);
      return json({
        trigger: structuredClone(trigger),
        ...(webhook ? { webhook } : {})
      }, 201);
    }
  }

  match = path.match(/^\/api\/v1\/workflow-event-triggers\/([^/]+)\/rotate-secret$/);
  if (match && method === 'POST') {
    const trigger = state.workflowEventTriggers.find(
      (item) => item.id === decodeURIComponent(match[1])
    );
    if (!trigger || trigger.sourceType !== 'webhook') return notFound();
    return json({
      trigger: structuredClone(trigger),
      webhook: {
        url: trigger.endpointUrl,
        secret: 'fixture-rotated-webhook-signing-secret',
        secretDisclosure: 'one_time'
      }
    });
  }

  match = path.match(/^\/api\/v1\/workflow-event-triggers\/([^/]+)$/);
  if (!match) return null;
  const triggerId = decodeURIComponent(match[1]);
  const trigger = state.workflowEventTriggers.find((item) => item.id === triggerId);
  if (!trigger) return notFound();
  if (method === 'PATCH') {
    const requestBody = await bodyOf(request);
    Object.assign(trigger, requestBody, {
      status: typeof requestBody.enabled === 'boolean'
        ? (requestBody.enabled ? 'enabled' : 'paused')
        : trigger.status
    });
    return json({ trigger: structuredClone(trigger) });
  }
  if (method === 'DELETE') {
    state.workflowEventTriggers = state.workflowEventTriggers.filter(
      (item) => item.id !== triggerId
    );
    return noContent();
  }
  return null;
}
