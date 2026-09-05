import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentMcpServerApi } from '@/services/control-plane/agentApi';
import type { AgentDefinition } from '@/pages/agents/agentModel';

const agentApi = vi.hoisted(() => ({
  createAgentMcpServer: vi.fn(),
  listAgentMcpServers: vi.fn(),
  reviewAgentMcpTool: vi.fn(),
  testAgentMcpServer: vi.fn(),
  updateAgentMcpServer: vi.fn()
}));

vi.mock('@/services/control-plane/agentApi', async () => ({
  ...await vi.importActual<typeof import('@/services/control-plane/agentApi')>('@/services/control-plane/agentApi'),
  ...agentApi
}));

import { createAgentMcpDataSource } from '@/pages/agents/agentCapabilityAdminAdapters';

const agent: AgentDefinition = {
  id: 'agent-1',
  workspaceId: 'workspace-1',
  name: 'Agent',
  avatarEmoji: 'A',
  description: '',
  instructions: '',
  status: 'active',
  reviewState: 'reviewed',
  providerType: 'internal',
  createdBy: 'user-1',
  owner: 'Owner',
  mcpServers: [],
  tools: [],
  nativeToolConfigs: {},
  skills: [],
  semanticCapabilityIds: [],
  permissionMode: 'ask_before_changes',
  trustPolicy: { boundary: 'workspace', dataEgress: 'restricted' },
  capabilities: [],
  readiness: { status: 'ready', reasons: [] }
};

const oauthServer: AgentMcpServerApi = {
  id: 'server-1',
  name: 'OAuth server',
  url: 'https://mcp.example.test/server',
  enabled: true,
  isSystem: false,
  canDelete: true,
  canEditConnection: true,
  canToggle: true,
  credentialMode: 'individual',
  authType: 'oauth',
  revision: 2,
  publicHeaders: { 'x-client-version': '2026-08' },
  connectionStatus: 'ok',
  lastDiscoveryAt: '2026-08-03T08:00:00.000Z',
  lastDiscoveryError: null,
  tools: []
};

const reviewedTool = {
  name: 'records.list', serverId: oauthServer.id, alias: 'records.list',
  capability: 'read' as const, enabled: true, reviewState: 'approved' as const,
  riskLevel: 'read_only' as const, autoAllowed: false
};

describe('Agent MCP data source', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    agentApi.listAgentMcpServers.mockResolvedValue([oauthServer]);
    agentApi.createAgentMcpServer.mockResolvedValue(oauthServer);
    agentApi.updateAgentMcpServer.mockResolvedValue(oauthServer);
    agentApi.reviewAgentMcpTool.mockResolvedValue(reviewedTool);
    agentApi.testAgentMcpServer.mockResolvedValue({
      server_id: oauthServer.id,
      server_name: oauthServer.name,
      server_url: oauthServer.url,
      connection_status: 'ok',
      last_discovery_at: oauthServer.lastDiscoveryAt,
      discovered_tool_count: 0,
      discovered_tools: [],
      error: null
    });
  });

  it('preserves OAuth, public headers, and discovery state', async () => {
    const catalog = await createAgentMcpDataSource(agent, true).getCatalog(agent.workspaceId, agent.id);

    expect(catalog.servers[0]).toMatchObject({
      authType: 'oauth',
      credentialMode: 'individual',
      publicHeaders: { 'x-client-version': '2026-08' },
      connectionStatus: 'ok',
      lastDiscoveryAt: '2026-08-03T08:00:00.000Z'
    });
  });

  it('preserves platform-default provenance in Agent catalog mappings', async () => {
    agentApi.listAgentMcpServers.mockResolvedValue([{ ...oauthServer, inherited: true }]);
    agentApi.createAgentMcpServer.mockResolvedValue({ ...oauthServer, inherited: true });

    const dataSource = createAgentMcpDataSource(agent, true);
    const catalog = await dataSource.getCatalog(agent.workspaceId, agent.id);
    const installation = await dataSource.createServer(agent.workspaceId, agent.id, {
      name: oauthServer.name,
      url: oauthServer.url,
      enabled: true,
      credentialMode: 'individual',
      auth: { type: 'oauth' }
    });

    expect(catalog.servers[0].inherited).toBe(true);
    expect(installation.inherited).toBe(true);
  });

  it('forwards the complete common MCP configuration', async () => {
    const dataSource = createAgentMcpDataSource(agent, true);
    const input = {
      name: oauthServer.name,
      url: oauthServer.url,
      enabled: false,
      credentialMode: 'individual' as const,
      auth: { type: 'oauth' as const },
      publicHeaders: { 'x-client-version': '2026-08' }
    };

    await dataSource.createServer(agent.workspaceId, agent.id, input);
    await dataSource.updateServer(agent.workspaceId, agent.id, oauthServer.id, {
      ...input,
      auth: { type: 'custom_header', headerName: 'X-API-Key', headerPrefix: 'Token ' },
      expectedRevision: 2
    });

    expect(agentApi.createAgentMcpServer).toHaveBeenCalledWith(agent.workspaceId, agent.id, {
      name: oauthServer.name,
      url: oauthServer.url,
      enabled: false,
      credentialMode: 'individual',
      authType: 'oauth',
      authHeaderName: undefined,
      authHeaderPrefix: undefined,
      publicHeaders: { 'x-client-version': '2026-08' }
    });
    expect(agentApi.updateAgentMcpServer).toHaveBeenCalledWith(agent.workspaceId, agent.id, oauthServer.id, {
      name: oauthServer.name,
      enabled: false,
      credentialMode: 'individual',
      authType: 'custom_header',
      authHeaderName: 'X-API-Key',
      authHeaderPrefix: 'Token ',
      publicHeaders: { 'x-client-version': '2026-08' },
      expectedRevision: 2
    });
  });

  it('uses the server-provided discovery result', async () => {
    const result = await createAgentMcpDataSource(agent, true).testServer(
      agent.workspaceId,
      agent.id,
      oauthServer.id
    );

    expect(result).toEqual({
      serverId: oauthServer.id,
      serverName: oauthServer.name,
      serverUrl: oauthServer.url,
      connectionStatus: 'ok',
      lastDiscoveryAt: '2026-08-03T08:00:00.000Z',
      discoveredToolCount: 0,
      discoveredTools: [],
      error: null
    });
  });

  it('approves managed Agent tools with capability while keeping system updates enable-only', async () => {
    const dataSource = createAgentMcpDataSource(agent, true);

    await dataSource.updateServerTool(
      agent.workspaceId, agent.id, oauthServer.id, reviewedTool.name,
      { enabled: true, capability: 'read' }
    );
    expect(agentApi.reviewAgentMcpTool).toHaveBeenLastCalledWith(
      agent.workspaceId, agent.id, oauthServer.id, reviewedTool.name,
      { enabled: true, capability: 'read', reviewState: 'approved' }
    );

    agentApi.listAgentMcpServers.mockResolvedValue([{ ...oauthServer, isSystem: true }]);
    await dataSource.updateServerTool(
      agent.workspaceId, agent.id, oauthServer.id, reviewedTool.name,
      { enabled: true, capability: 'read' }
    );
    expect(agentApi.reviewAgentMcpTool).toHaveBeenLastCalledWith(
      agent.workspaceId, agent.id, oauthServer.id, reviewedTool.name,
      { enabled: true }
    );
  });
});
