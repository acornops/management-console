import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createAgent,
  createAgentTrigger,
  createAgentVersion,
  deleteAgent,
  deleteAgentTrigger,
  getAgent,
  listAgentActivity,
  listAgentVersions,
  listWorkspaceAgents,
  restoreAgentVersion,
  testAgent,
  updateAgentTrigger,
  updateAgent
} from './agentApi';

describe('agent control-plane api', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('loads workspace agents from the intended consumer route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [{ id: 'agent-1', workspaceId: 'workspace-1', name: 'Kubernetes Diagnostics' }] }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(listWorkspaceAgents('workspace-1', { includeInactive: true })).resolves.toEqual([
      { id: 'agent-1', workspaceId: 'workspace-1', name: 'Kubernetes Diagnostics' }
    ]);

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8081/api/v1/workspaces/workspace-1/agents?includeInactive=true');
  });

  it('creates and updates durable agents through workspace-scoped consumer payloads', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/api/v1/auth/csrf')) {
        return Promise.resolve(new Response(JSON.stringify({ csrfToken: 'csrf-token-1' }), { status: 200 }));
      }
      if (url.endsWith('/api/v1/workspaces/workspace-1/agents') && init?.method === 'POST') {
        return Promise.resolve(new Response(JSON.stringify({
          agent: {
            id: 'agent-1',
            workspaceId: 'workspace-1',
            name: 'Repository Operator',
            providerType: 'external',
            status: 'draft'
          }
        }), { status: 201 }));
      }
      return Promise.resolve(new Response(JSON.stringify({
        agent: {
          id: 'agent-1',
          workspaceId: 'workspace-1',
          name: 'Repository Operator',
          providerType: 'external',
          status: 'active'
        }
      }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(createAgent('workspace-1', {
      name: 'Repository Operator',
      description: 'Prepare repository changes with explicit approval gates.',
      instructions: 'Prepare repository changes.',
      providerType: 'external'
    })).resolves.toMatchObject({ id: 'agent-1', providerType: 'external' });

    await expect(updateAgent('workspace-1', 'agent-1', {
      status: 'active',
      approvalPolicy: { sensitiveActions: 'approval_required' }
    })).resolves.toMatchObject({ id: 'agent-1', status: 'active' });

    const createCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/api/v1/workspaces/workspace-1/agents'));
    const updateCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/api/v1/agents/agent-1'));
    expect(createCall?.[1]).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(JSON.parse(createCall?.[1]?.body as string)).toEqual({
      name: 'Repository Operator',
      description: 'Prepare repository changes with explicit approval gates.',
      instructions: 'Prepare repository changes.',
      providerType: 'external'
    });
    expect(updateCall?.[1]).toMatchObject({ method: 'PATCH', credentials: 'include' });
    expect(JSON.parse(updateCall?.[1]?.body as string)).toEqual({
      workspaceId: 'workspace-1',
      status: 'active',
      approvalPolicy: { sensitiveActions: 'approval_required' }
    });
  });

  it('loads a single agent detail by durable agent id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ agent: { id: 'agent-1', workspaceId: 'workspace-1', name: 'Incident Reporter' } }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getAgent('workspace-1', 'agent-1')).resolves.toMatchObject({
      id: 'agent-1',
      workspaceId: 'workspace-1',
      name: 'Incident Reporter'
    });

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8081/api/v1/agents/agent-1?workspaceId=workspace-1');
  });

  it('calls agent version, test, activity, and trigger routes', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/api/v1/auth/csrf')) {
        return Promise.resolve(new Response(JSON.stringify({ csrfToken: 'csrf-token-1' }), { status: 200 }));
      }
      if (url.endsWith('/api/v1/agents/agent-1/versions') && init?.method === 'POST') {
        return Promise.resolve(new Response(JSON.stringify({ version: { id: 'version-1', agentId: 'agent-1', workspaceId: 'workspace-1', version: 2, createdAt: 'now' } }), { status: 201 }));
      }
      if (url.includes('/api/v1/agents/agent-1/versions?workspaceId=workspace-1')) {
        return Promise.resolve(new Response(JSON.stringify({ items: [{ id: 'version-1', agentId: 'agent-1', workspaceId: 'workspace-1', version: 2, createdAt: 'now' }] }), { status: 200 }));
      }
      if (url.endsWith('/api/v1/agents/agent-1/versions/version-1/restore')) {
        return Promise.resolve(new Response(JSON.stringify({ agent: { id: 'agent-1', workspaceId: 'workspace-1', name: 'Restored agent', version: 3 } }), { status: 200 }));
      }
      if (url.endsWith('/api/v1/agents/agent-1/test')) {
        return Promise.resolve(new Response(JSON.stringify({ activity: { id: 'activity-1', agentId: 'agent-1', workspaceId: 'workspace-1', agentVersion: 2, status: 'queued', createdAt: 'now' }, compiledScope: { agentId: 'agent-1' } }), { status: 202 }));
      }
      if (url.includes('/api/v1/agents/agent-1/activity')) {
        return Promise.resolve(new Response(JSON.stringify({ items: [{ id: 'activity-1', agentId: 'agent-1', workspaceId: 'workspace-1', agentVersion: 2, status: 'queued', createdAt: 'now' }] }), { status: 200 }));
      }
      if (url.endsWith('/api/v1/agents/agent-1/triggers') && init?.method === 'POST') {
        return Promise.resolve(new Response(JSON.stringify({ trigger: { id: 'trigger-1', type: 'schedule', enabled: true } }), { status: 201 }));
      }
      if (url.endsWith('/api/v1/agents/agent-1/triggers/trigger-1') && init?.method === 'PATCH') {
        return Promise.resolve(new Response(JSON.stringify({ trigger: { id: 'trigger-1', type: 'schedule', enabled: false } }), { status: 200 }));
      }
      if (url.endsWith('/api/v1/agents/agent-1') && init?.method === 'DELETE') {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return Promise.resolve(new Response(null, { status: 204 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(createAgentVersion('workspace-1', 'agent-1')).resolves.toMatchObject({ id: 'version-1' });
    await expect(listAgentVersions('workspace-1', 'agent-1')).resolves.toHaveLength(1);
    await expect(restoreAgentVersion('workspace-1', 'agent-1', 'version-1')).resolves.toMatchObject({ version: 3 });
    await expect(testAgent('workspace-1', 'agent-1', { approvedContextGrants: ['workspace_metadata'] })).resolves.toMatchObject({ compiledScope: { agentId: 'agent-1' } });
    await expect(listAgentActivity('workspace-1', 'agent-1')).resolves.toHaveLength(1);
    await expect(createAgentTrigger('workspace-1', 'agent-1', { type: 'schedule', enabled: true })).resolves.toMatchObject({ id: 'trigger-1' });
    await expect(updateAgentTrigger('workspace-1', 'agent-1', 'trigger-1', { enabled: false })).resolves.toMatchObject({ enabled: false });
    await expect(deleteAgent('workspace-1', 'agent-1')).resolves.toBeUndefined();
    await expect(deleteAgentTrigger('workspace-1', 'agent-1', 'trigger-1')).resolves.toBeUndefined();

    expect(fetchMock.mock.calls.some((call) => String(call[0]).endsWith('/api/v1/agents/agent-1/test'))).toBe(true);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('/api/v1/agents/agent-1/versions?workspaceId=workspace-1'))).toBe(true);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).endsWith('/api/v1/agents/agent-1/versions/version-1/restore'))).toBe(true);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).endsWith('/api/v1/agents/agent-1') && call[1]?.method === 'DELETE')).toBe(true);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('/api/v1/agents/agent-1/activity?workspaceId=workspace-1'))).toBe(true);
  });
});
