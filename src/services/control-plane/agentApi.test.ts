import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  changeAgentConversationAccess,
  createAgent,
  createAgentConversation,
  deleteAgent,
  deleteAgentConversation,
  duplicateAgent,
  getAgent,
  getAgentConversation,
  listAgentConversations,
  listWorkspaceAgents,
  listWorkspaceNativeTools,
  postAgentConversationMessage,
  grantAgentNativeTool,
  revokeAgentNativeTool,
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

  it('uses the Agent conversation contract for history, access, and messages', async () => {
    const conversation = {
      id: 'conversation-1',
      workspaceId: 'workspace/a',
      agentId: 'agent/a',
      title: 'Incident reporter',
      createdBy: 'user-1',
      accessMode: 'read_only',
      createdAt: '2026-07-29T00:00:00.000Z'
    };
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/api/v1/auth/csrf')) {
        return Promise.resolve(new Response(JSON.stringify({ csrfToken: 'csrf-token-1' }), { status: 200 }));
      }
      if (init?.method === 'DELETE') return Promise.resolve(new Response(null, { status: 204 }));
      if (url.endsWith('/conversations') && !init?.method) {
        return Promise.resolve(new Response(JSON.stringify({ items: [conversation] }), { status: 200 }));
      }
      if (url.endsWith('/access')) {
        return Promise.resolve(new Response(JSON.stringify({
          conversation: { ...conversation, accessMode: 'read_write' }
        }), { status: 200 }));
      }
      if (url.endsWith('/messages')) {
        return Promise.resolve(new Response(JSON.stringify({
          message_id: 'message-1',
          run_id: 'run-1',
          executionId: 'execution-1',
          status: 'queued'
        }), { status: 202 }));
      }
      return Promise.resolve(new Response(JSON.stringify({
        conversation,
        messages: [],
        runs: []
      }), { status: init?.method === 'POST' ? 201 : 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(listAgentConversations('workspace/a', 'agent/a')).resolves.toEqual([conversation]);
    await expect(createAgentConversation('workspace/a', 'agent/a')).resolves.toMatchObject({ conversation });
    await expect(getAgentConversation('conversation-1')).resolves.toMatchObject({ conversation });
    await expect(changeAgentConversationAccess('conversation-1', 'read_write')).resolves.toMatchObject({
      accessMode: 'read_write'
    });
    await expect(postAgentConversationMessage('conversation-1', 'Inspect the incident.', 'request-1')).resolves.toMatchObject({
      run_id: 'run-1'
    });
    await expect(deleteAgentConversation('conversation-1')).resolves.toBeUndefined();

    expect(fetchMock.mock.calls.map((call) => String(call[0])).filter((url) => !url.endsWith('/auth/csrf'))).toEqual([
      'http://localhost:8081/api/v1/workspaces/workspace%2Fa/agents/agent%2Fa/conversations',
      'http://localhost:8081/api/v1/workspaces/workspace%2Fa/agents/agent%2Fa/conversations',
      'http://localhost:8081/api/v1/agent-conversations/conversation-1',
      'http://localhost:8081/api/v1/agent-conversations/conversation-1/access',
      'http://localhost:8081/api/v1/agent-conversations/conversation-1/messages',
      'http://localhost:8081/api/v1/agent-conversations/conversation-1'
    ]);
    const accessCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/access'));
    const messageCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/messages'));
    expect(JSON.parse(accessCall?.[1]?.body as string)).toEqual({ accessMode: 'read_write' });
    expect(JSON.parse(messageCall?.[1]?.body as string)).toEqual({
      content: 'Inspect the incident.',
      clientRequestId: 'request-1'
    });
  });

  it('lists and assigns code-owned native tools through manage_agents routes', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/api/v1/auth/csrf')) return Promise.resolve(new Response(JSON.stringify({ csrfToken: 'csrf-token-1' }), { status: 200 }));
      if (url.endsWith('/catalog/native-tools')) return Promise.resolve(new Response(JSON.stringify({ items: [{ id: 'documents.create', title: 'Create document', description: 'Create a provenance-linked PDF or Markdown document from the current conversation and available evidence.', invocationScopes: ['workflow', 'agent_chat'] }] }), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify({ agent: { id: 'agent-1', workspaceId: 'workspace-1', tools: init?.method === 'PUT' ? ['documents.create'] : [] } }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(listWorkspaceNativeTools('workspace-1')).resolves.toMatchObject([{
      id: 'documents.create',
      description: 'Create a provenance-linked PDF or Markdown document from the current conversation and available evidence.',
      invocationScopes: ['workflow', 'agent_chat']
    }]);
    await expect(grantAgentNativeTool('workspace-1', 'agent-1', 'documents.create')).resolves.toMatchObject({ tools: ['documents.create'] });
    await grantAgentNativeTool('workspace-1', 'agent-1', 'http.fetch.get', {
      allowedUrlPatterns: ['https://status.example.com/api/*']
    });
    await expect(revokeAgentNativeTool('workspace-1', 'agent-1', 'documents.create')).resolves.toMatchObject({ tools: [] });

    const mutations = fetchMock.mock.calls.filter((call) => ['PUT', 'DELETE'].includes(call[1]?.method as string));
    expect(mutations.map((call) => call[1]?.method)).toEqual(['PUT', 'PUT', 'DELETE']);
    expect(String(mutations[0][0])).toContain('/agents/agent-1/native-tools/documents.create');
    expect(mutations[1][1]?.body).toBe(JSON.stringify({
      config: { allowedUrlPatterns: ['https://status.example.com/api/*'] }
    }));
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

  it('calls the agent deletion route', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/api/v1/auth/csrf')) {
        return Promise.resolve(new Response(JSON.stringify({ csrfToken: 'csrf-token-1' }), { status: 200 }));
      }
      if (url.endsWith('/api/v1/agents/agent-1') && init?.method === 'DELETE') {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      return Promise.resolve(new Response(null, { status: 204 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(deleteAgent('workspace-1', 'agent-1')).resolves.toBeUndefined();

    expect(fetchMock.mock.calls.some((call) => String(call[0]).endsWith('/api/v1/agents/agent-1') && call[1]?.method === 'DELETE')).toBe(true);
  });
});
