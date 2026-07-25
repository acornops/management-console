import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createWorkflowEventTrigger,
  deleteWorkflowEventTrigger,
  listWorkspaceWorkflowEventTriggers,
  rotateWorkflowEventTriggerSecret,
  updateWorkflowEventTrigger
} from './workflowEventTriggerApi';

describe('workflow event-trigger control-plane api', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('manages event triggers and one-time webhook secrets', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/api/v1/auth/csrf')) {
        return Promise.resolve(new Response(JSON.stringify({ csrfToken: 'csrf-token-1' }), { status: 200 }));
      }
      if (url.endsWith('/api/v1/workspaces/workspace-1/workflow-event-triggers') && !init?.method) {
        return Promise.resolve(new Response(JSON.stringify({
          items: [{ id: 'trigger-1', sourceType: 'webhook', endpointUrl: '/events' }]
        }), { status: 200 }));
      }
      if (url.endsWith('/api/v1/workspaces/workspace-1/workflow-event-triggers') && init?.method === 'POST') {
        return Promise.resolve(new Response(JSON.stringify({
          trigger: { id: 'trigger-1', sourceType: 'webhook' },
          webhook: { url: '/events', secret: 'secret-1', secretDisclosure: 'one_time' }
        }), { status: 201 }));
      }
      if (url.endsWith('/api/v1/workflow-event-triggers/trigger-1/rotate-secret')) {
        return Promise.resolve(new Response(JSON.stringify({
          trigger: { id: 'trigger-1', sourceType: 'webhook' },
          webhook: { url: '/events', secret: 'secret-2', secretDisclosure: 'one_time' }
        }), { status: 200 }));
      }
      if (url.endsWith('/api/v1/workflow-event-triggers/trigger-1') && init?.method === 'PATCH') {
        return Promise.resolve(new Response(JSON.stringify({
          trigger: { id: 'trigger-1', status: 'paused' }
        }), { status: 200 }));
      }
      return Promise.resolve(new Response(null, { status: 204 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(listWorkspaceWorkflowEventTriggers('workspace-1')).resolves.toMatchObject({
      items: [{ id: 'trigger-1' }]
    });
    await expect(createWorkflowEventTrigger('workspace-1', {
      workflowId: 'workflow-1',
      name: 'External review',
      sourceType: 'webhook'
    })).resolves.toMatchObject({ webhook: { secret: 'secret-1', secretDisclosure: 'one_time' } });
    await expect(updateWorkflowEventTrigger('workspace-1', 'trigger-1', { enabled: false })).resolves.toMatchObject({
      id: 'trigger-1',
      status: 'paused'
    });
    await expect(rotateWorkflowEventTriggerSecret('workspace-1', 'trigger-1')).resolves.toMatchObject({
      webhook: { secret: 'secret-2' }
    });
    await expect(deleteWorkflowEventTrigger('workspace-1', 'trigger-1')).resolves.toBeUndefined();

    const createCall = fetchMock.mock.calls.find((call) => call[1]?.method === 'POST'
      && String(call[0]).endsWith('/workspaces/workspace-1/workflow-event-triggers'));
    expect(JSON.parse(createCall?.[1]?.body as string)).toEqual({
      workflowId: 'workflow-1',
      name: 'External review',
      sourceType: 'webhook'
    });
    const patchCall = fetchMock.mock.calls.find((call) => call[1]?.method === 'PATCH'
      && String(call[0]).endsWith('/workflow-event-triggers/trigger-1'));
    expect(JSON.parse(patchCall?.[1]?.body as string)).toEqual({
      workspaceId: 'workspace-1',
      enabled: false
    });
  });
});
