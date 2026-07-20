import { afterEach, describe, expect, it, vi } from 'vitest';

import { catalogApi } from './catalogApi';

describe('catalog control-plane api', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses target-scoped catalog import and revision-protected reimport routes', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/api/v1/auth/csrf')) return Promise.resolve(new Response(JSON.stringify({ csrfToken: 'csrf-1' }), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify({ server: { id: 'server-1' } }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    const input = {
      artifact: { artifactId: 'artifact-1' },
      version: '1.2.3',
      remoteEndpoint: 'https://mcp.example/mcp',
      endpointConfiguration: { region: 'sg' }
    };

    await catalogApi.importTargetMcpServer('workspace/a', 'target/a', input);
    await catalogApi.reimportTargetMcpServer('workspace/a', 'target/a', 'server/a', { ...input, expectedRevision: 4 });

    const mutations = fetchMock.mock.calls.filter((call) => call[1]?.method === 'POST');
    expect(mutations.map((call) => call[0])).toEqual([
      'http://localhost:8081/api/v1/workspaces/workspace%2Fa/targets/target%2Fa/mcp/servers/import',
      'http://localhost:8081/api/v1/workspaces/workspace%2Fa/targets/target%2Fa/mcp/servers/server%2Fa/reimport'
    ]);
    expect(JSON.parse(mutations[1][1].body)).toMatchObject({ expectedRevision: 4, version: '1.2.3' });
  });

  it('covers Agent and target credential connection lifecycle routes', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/api/v1/auth/csrf')) return Promise.resolve(new Response(JSON.stringify({ csrfToken: 'csrf-1' }), { status: 200 }));
      if (init?.method === 'DELETE') return Promise.resolve(new Response(null, { status: 204 }));
      return Promise.resolve(new Response(JSON.stringify({ connection: { serverId: 'server-1', status: 'connected', authType: 'bearer_token' } }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    await catalogApi.getAgentMcpConnection('workspace-1', 'agent-1', 'server-1');
    await catalogApi.putAgentMcpConnection('workspace-1', 'agent-1', 'server-1', { credential: 'write-only-agent-token', consentGranted: true });
    await catalogApi.putTargetMcpConnection('workspace-1', 'target-1', 'server-1', { credential: 'write-only-target-token', consentGranted: true });
    await catalogApi.verifyAgentMcpConnection('workspace-1', 'agent-1', 'server-1');
    await catalogApi.verifyTargetMcpConnection('workspace-1', 'target-1', 'server-1');
    await catalogApi.disconnectTargetMcp('workspace-1', 'target-1', 'server-1');

    const agentPut = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/agents/agent-1/mcp/servers/server-1/connection') && call[1]?.method === 'PUT');
    const targetPut = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/targets/target-1/mcp/servers/server-1/connection') && call[1]?.method === 'PUT');
    expect(JSON.parse(agentPut?.[1]?.body as string)).toEqual({ credential: 'write-only-agent-token', consentGranted: true });
    expect(JSON.parse(targetPut?.[1]?.body as string)).toEqual({ credential: 'write-only-target-token', consentGranted: true });
    expect(fetchMock.mock.calls.some((call) => String(call[0]).endsWith('/agents/agent-1/mcp/servers/server-1/connection/verify') && call[1]?.method === 'POST')).toBe(true);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).endsWith('/targets/target-1/mcp/servers/server-1/connection/verify') && call[1]?.method === 'POST')).toBe(true);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).endsWith('/targets/target-1/mcp/servers/server-1/connection') && call[1]?.method === 'DELETE')).toBe(true);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('/oauth/'))).toBe(false);
  });

  it('covers MCP registry capabilities and lifecycle routes without returning credentials', async () => {
    const source = {
      id: 'source-1', workspaceId: 'workspace-1', displayName: 'Internal',
      baseUrl: 'https://registry.example', authType: 'bearer_token',
      credentialConfigured: true, networkRoute: 'direct', enabled: true,
      managementMode: 'workspace', bindings: []
    };
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/api/v1/auth/csrf')) return Promise.resolve(new Response(JSON.stringify({ csrfToken: 'csrf-1' }), { status: 200 }));
      if (init?.method === 'DELETE') return Promise.resolve(new Response(null, { status: 204 }));
      if (url.endsWith('/sync')) return Promise.resolve(new Response(JSON.stringify({ artifactCount: 3 }), { status: 200 }));
      if (init?.method === 'PATCH') return Promise.resolve(new Response(JSON.stringify({ source: { ...source, enabled: false } }), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify({
        items: [source],
        capabilities: { workspaceManagedSourcesEnabled: true, supportedNetworkRoutes: ['direct'] }
      }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const listed = await catalogApi.listCatalogSources('workspace-1');
    await catalogApi.updateCatalogSource('workspace-1', 'source-1', { enabled: false });
    const artifactCount = await catalogApi.synchronizeCatalogSource('workspace-1', 'source-1');
    await catalogApi.deleteCatalogSource('workspace-1', 'source-1');

    expect(listed.capabilities.supportedNetworkRoutes).toEqual(['direct']);
    expect(artifactCount).toBe(3);
    const patchCall = fetchMock.mock.calls.find((call) => call[1]?.method === 'PATCH');
    expect(JSON.parse(patchCall?.[1]?.body as string)).toEqual({ enabled: false });
    expect(JSON.stringify(listed)).not.toContain('credentialValue');
  });
});
