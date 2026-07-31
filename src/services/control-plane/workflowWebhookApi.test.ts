import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createWorkflowWebhook,
  deleteWorkflowWebhook,
  listWorkspaceWorkflowWebhooks,
  rotateWorkflowWebhookSecret,
  updateWorkflowWebhook
} from './workflowWebhookApi';

describe('workflow webhook control-plane api', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('manages workflow webhooks and one-time signing secrets', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/api/v1/auth/csrf')) {
        return Promise.resolve(new Response(JSON.stringify({ csrfToken: 'csrf-token-1' }), { status: 200 }));
      }
      if (url.endsWith('/api/v1/workspaces/workspace-1/workflow-webhooks') && !init?.method) {
        return Promise.resolve(new Response(JSON.stringify({
          items: [{ id: 'webhook-1', endpointUrl: '/events' }]
        }), { status: 200 }));
      }
      if (url.endsWith('/api/v1/workspaces/workspace-1/workflow-webhooks') && init?.method === 'POST') {
        return Promise.resolve(new Response(JSON.stringify({
          webhook: { id: 'webhook-1' },
          signingSecret: { url: '/events', secret: 'secret-1', secretDisclosure: 'one_time' }
        }), { status: 201 }));
      }
      if (url.endsWith('/api/v1/workflow-webhooks/webhook-1/rotate-secret')) {
        return Promise.resolve(new Response(JSON.stringify({
          webhook: { id: 'webhook-1' },
          signingSecret: { url: '/events', secret: 'secret-2', secretDisclosure: 'one_time' }
        }), { status: 200 }));
      }
      if (url.endsWith('/api/v1/workflow-webhooks/webhook-1') && init?.method === 'PATCH') {
        return Promise.resolve(new Response(JSON.stringify({
          webhook: { id: 'webhook-1', status: 'paused' }
        }), { status: 200 }));
      }
      return Promise.resolve(new Response(null, { status: 204 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(listWorkspaceWorkflowWebhooks('workspace-1')).resolves.toMatchObject({
      items: [{ id: 'webhook-1' }]
    });
    await expect(createWorkflowWebhook('workspace-1', {
      workflowId: 'workflow-1',
      name: 'External review'
    })).resolves.toMatchObject({ signingSecret: { secret: 'secret-1', secretDisclosure: 'one_time' } });
    await expect(updateWorkflowWebhook('workspace-1', 'webhook-1', { enabled: false })).resolves.toMatchObject({
      id: 'webhook-1',
      status: 'paused'
    });
    await expect(rotateWorkflowWebhookSecret('workspace-1', 'webhook-1')).resolves.toMatchObject({
      signingSecret: { secret: 'secret-2' }
    });
    await expect(deleteWorkflowWebhook('workspace-1', 'webhook-1')).resolves.toBeUndefined();

    const createCall = fetchMock.mock.calls.find((call) => call[1]?.method === 'POST'
      && String(call[0]).endsWith('/workspaces/workspace-1/workflow-webhooks'));
    expect(JSON.parse(createCall?.[1]?.body as string)).toEqual({
      workflowId: 'workflow-1',
      name: 'External review'
    });
    const patchCall = fetchMock.mock.calls.find((call) => call[1]?.method === 'PATCH'
      && String(call[0]).endsWith('/workflow-webhooks/webhook-1'));
    expect(JSON.parse(patchCall?.[1]?.body as string)).toEqual({
      workspaceId: 'workspace-1',
      enabled: false
    });
  });
});
