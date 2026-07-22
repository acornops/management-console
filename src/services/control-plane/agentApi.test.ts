import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createAgent,
  createAgentTrigger,
  createAgentVersion,
  deleteAgent,
  deleteAgentTrigger,
  duplicateAgent,
  getAgent,
  listAutomationTemplates,
  listAgentActivity,
  listAgentVersions,
  listWorkspaceAgents,
  listWorkspaceNativeTools,
  grantAgentNativeTool,
  revokeAgentNativeTool,
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

  it('validates automation template catalog responses at the control-plane boundary', async () => {
    const validTemplate = {
      id: 'target-remediation', version: 3, name: 'Target remediation', description: 'Safely change one target.',
      installMode: 'opt_in', installationStatus: 'not_installed', setupSteps: ['Install workflow'],
      blockerCodes: ['TEMPLATE_NOT_INSTALLED']
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ templates: [validTemplate], installations: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ templates: [{ id: 'broken-template' }], installations: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(listAutomationTemplates('workspace-1')).resolves.toEqual({ templates: [validTemplate], installations: [] });
    await expect(listAutomationTemplates('workspace-1')).rejects.toThrow('invalid template definition');
  });

  it('lists and assigns code-owned native tools through manage_agents routes', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/api/v1/auth/csrf')) return Promise.resolve(new Response(JSON.stringify({ csrfToken: 'csrf-token-1' }), { status: 200 }));
      if (url.endsWith('/catalog/native-tools')) return Promise.resolve(new Response(JSON.stringify({ items: [{ id: 'reports.pdf.generate', title: 'Generate PDF report', invocationScopes: ['workflow'] }] }), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify({ agent: { id: 'agent-1', workspaceId: 'workspace-1', tools: init?.method === 'PUT' ? ['reports.pdf.generate'] : [] } }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(listWorkspaceNativeTools('workspace-1')).resolves.toMatchObject([{ id: 'reports.pdf.generate', invocationScopes: ['workflow'] }]);
    await expect(grantAgentNativeTool('workspace-1', 'agent-1', 'reports.pdf.generate')).resolves.toMatchObject({ tools: ['reports.pdf.generate'] });
    await expect(revokeAgentNativeTool('workspace-1', 'agent-1', 'reports.pdf.generate')).resolves.toMatchObject({ tools: [] });

    const mutations = fetchMock.mock.calls.filter((call) => ['PUT', 'DELETE'].includes(call[1]?.method as string));
    expect(mutations.map((call) => call[1]?.method)).toEqual(['PUT', 'DELETE']);
    expect(String(mutations[0][0])).toContain('/agents/agent-1/native-tools/reports.pdf.generate');
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
            name: 'Workflow Analyst',
            providerType: 'external',
            status: 'draft'
          }
        }), { status: 201 }));
      }
      return Promise.resolve(new Response(JSON.stringify({
        agent: {
          id: 'agent-1',
          workspaceId: 'workspace-1',
          name: 'Workflow Analyst',
          providerType: 'external',
          status: 'active'
        }
      }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(createAgent('workspace-1', {
      name: 'Workflow Analyst',
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
      name: 'Workflow Analyst',
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

  it('duplicates an effective agent definition into a custom draft', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/api/v1/auth/csrf')) return Promise.resolve(new Response(JSON.stringify({ csrfToken: 'csrf-token-1' }), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify({ agent: { id: 'agent-copy', workspaceId: 'workspace-1', name: 'Diagnostics copy', source: 'user', createdBy: 'user-1', status: 'draft' } }), { status: 201 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(duplicateAgent('workspace-1', 'agent-cluster-triage', 'Diagnostics copy')).resolves.toMatchObject({ id: 'agent-copy', source: 'user', status: 'draft' });
    const call = fetchMock.mock.calls.find((item) => String(item[0]).endsWith('/api/v1/agents/agent-cluster-triage/duplicate'));
    expect(call?.[1]).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(JSON.parse(call?.[1]?.body as string)).toEqual({ workspaceId: 'workspace-1', name: 'Diagnostics copy' });
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
