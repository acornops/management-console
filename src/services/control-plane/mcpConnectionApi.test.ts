import { afterEach, describe, expect, it, vi } from 'vitest';

import { mcpConnectionApi } from './mcpConnectionApi';

describe('MCP connection control-plane API', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('covers Agent and target credential connection lifecycle routes', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/api/v1/auth/csrf')) {
        return Promise.resolve(new Response(JSON.stringify({ csrfToken: 'csrf-1' }), { status: 200 }));
      }
      if (init?.method === 'DELETE') return Promise.resolve(new Response(null, { status: 204 }));
      return Promise.resolve(new Response(JSON.stringify({
        connection: { serverId: 'server-1', status: 'connected', authType: 'bearer_token' }
      }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    await mcpConnectionApi.getAgentMcpConnection('workspace-1', 'agent-1', 'server-1');
    await mcpConnectionApi.putAgentMcpConnection('workspace-1', 'agent-1', 'server-1', {
      credential: 'write-only-agent-token',
      consentGranted: true
    });
    await mcpConnectionApi.putTargetMcpConnection('workspace-1', 'target-1', 'server-1', {
      credential: 'write-only-target-token',
      consentGranted: true
    });
    await mcpConnectionApi.verifyAgentMcpConnection('workspace-1', 'agent-1', 'server-1');
    await mcpConnectionApi.verifyTargetMcpConnection('workspace-1', 'target-1', 'server-1');
    await mcpConnectionApi.disconnectTargetMcp('workspace-1', 'target-1', 'server-1');

    const agentPut = fetchMock.mock.calls.find((call) =>
      String(call[0]).endsWith('/agents/agent-1/mcp/servers/server-1/connection') && call[1]?.method === 'PUT'
    );
    const targetPut = fetchMock.mock.calls.find((call) =>
      String(call[0]).endsWith('/targets/target-1/mcp/servers/server-1/connection') && call[1]?.method === 'PUT'
    );
    expect(JSON.parse(agentPut?.[1]?.body as string)).toEqual({
      credential: 'write-only-agent-token',
      consentGranted: true
    });
    expect(JSON.parse(targetPut?.[1]?.body as string)).toEqual({
      credential: 'write-only-target-token',
      consentGranted: true
    });
    expect(fetchMock.mock.calls.some((call) =>
      String(call[0]).endsWith('/agents/agent-1/mcp/servers/server-1/connection/verify') && call[1]?.method === 'POST'
    )).toBe(true);
    expect(fetchMock.mock.calls.some((call) =>
      String(call[0]).endsWith('/targets/target-1/mcp/servers/server-1/connection/verify') && call[1]?.method === 'POST'
    )).toBe(true);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('/oauth/'))).toBe(false);
  });

  it('prepares and starts provider-neutral OAuth for Agent and target installations', async () => {
    const preparation = {
      preparationHandle: 'p'.repeat(43),
      resourceOrigin: 'https://mcp.example',
      issuerSelectionRequired: true,
      candidates: [{
        issuer: 'https://identity.example/realms/engineering',
        issuerOrigin: 'https://identity.example',
        registrationMethod: 'dcr' as const,
        scopes: ['mcp:read', 'offline_access'],
        offlineAccessRequested: true
      }]
    };
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/api/v1/auth/csrf')) {
        return Promise.resolve(new Response(JSON.stringify({ csrfToken: 'csrf-1' }), { status: 200 }));
      }
      if (url.endsWith('/oauth/prepare')) {
        return Promise.resolve(new Response(JSON.stringify(preparation), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({
        authorizationUrl: 'https://identity.example/authorize?opaque=1'
      }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const prepared = await mcpConnectionApi.prepareAgentMcpOAuth(
      'workspace-1',
      'agent-1',
      'server-1',
      '/workspaces/workspace-1/agents/agent-1/mcp-servers'
    );
    const started = await mcpConnectionApi.startAgentMcpOAuth(
      'workspace-1',
      'agent-1',
      'server-1',
      {
        preparationHandle: preparation.preparationHandle,
        issuer: preparation.candidates[0].issuer,
        consentGranted: true
      }
    );
    await mcpConnectionApi.prepareTargetMcpOAuth(
      'workspace-1',
      'target-1',
      'server-1',
      '/workspaces/workspace-1/kubernetes-clusters/target-1/mcp-servers'
    );

    expect(prepared).toEqual(preparation);
    expect(started.authorizationUrl).toMatch(/^https:\/\/identity\.example\//);
    const oauthCalls = fetchMock.mock.calls.filter((call) => String(call[0]).includes('/connection/oauth/'));
    expect(oauthCalls.map((call) => String(call[0]))).toEqual([
      'http://localhost:8081/api/v1/workspaces/workspace-1/agents/agent-1/mcp/servers/server-1/connection/oauth/prepare',
      'http://localhost:8081/api/v1/workspaces/workspace-1/agents/agent-1/mcp/servers/server-1/connection/oauth/start',
      'http://localhost:8081/api/v1/workspaces/workspace-1/targets/target-1/mcp/servers/server-1/connection/oauth/prepare'
    ]);
    expect(JSON.stringify(oauthCalls)).not.toMatch(/clientSecret|accessToken|refreshToken/i);
  });
});
