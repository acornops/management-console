import { requestJson } from './http';

function agentMcpServerPath(workspaceId: string, agentId: string, serverId: string): string {
  return `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agentId)}/mcp/servers/${encodeURIComponent(serverId)}`;
}

function targetMcpServerPath(workspaceId: string, targetId: string, serverId: string): string {
  return `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/mcp/servers/${encodeURIComponent(serverId)}`;
}


export interface CatalogSource {
  id: string;
  workspaceId: string;
  displayName: string;
  baseUrl: string;
  authType: 'none' | 'bearer_token' | 'custom_header';
  credentialConfigured: boolean;
  authHeaderName?: string;
  networkRoute: 'direct' | 'connector';
  enabled: boolean;
  managementMode: 'workspace' | 'bootstrap';
  bindings: Array<{
    id: string;
    artifactKind: 'mcp_server' | 'agent_skill';
    adapterType: string;
    adapterBasePath: string;
    syncStatus: 'pending' | 'syncing' | 'ready' | 'error';
    lastSyncAt?: string;
    lastSyncError?: string;
  }>;
}

export interface CatalogSourceList {
  items: CatalogSource[];
  capabilities: {
    workspaceManagedSourcesEnabled: boolean;
    supportedNetworkRoutes: ['direct'];
  };
}

export interface CatalogSourceMutationInput {
  displayName?: string;
  baseUrl?: string;
  enabled?: boolean;
  networkRoute?: 'direct';
  auth?: {
    type: 'none' | 'bearer_token' | 'custom_header';
    credential?: string;
    headerName?: string;
  };
}

export interface CatalogArtifactEndpoint {
  type: 'streamable-http';
  url: string;
  supported?: boolean;
  requiresConfiguration?: boolean;
  requiresPersonalAuth?: boolean;
  headerNames?: string[];
  secretHeaderNames?: string[];
  configurationFields?: Array<{
    name: string;
    location: 'url' | 'header';
    headerName?: string;
    required?: boolean;
    secret?: boolean;
    format?: 'string' | 'number' | 'boolean';
    description?: string;
    default?: string;
    fixedValue?: string;
    placeholder?: string;
    choices?: string[];
  }>;
}

export interface CatalogArtifact {
  id: string;
  workspaceId: string;
  sourceId: string;
  bindingId: string;
  artifactKind: 'mcp_server' | 'agent_skill';
  name: string;
  title?: string;
  description: string;
  version: string;
  digest: string;
  metadata: Record<string, unknown>;
  compatible: boolean;
  incompatibilityReason?: string;
  remoteEndpoints: CatalogArtifactEndpoint[];
  publishedAt?: string;
  upstreamUpdatedAt?: string;
}

export interface CatalogImportInput {
  artifact: { artifactId?: string; sourceId?: string; artifactName?: string };
  version: string;
  remoteEndpoint: string;
  serverName?: string;
  enabled?: boolean;
  endpointConfiguration?: Record<string, string>;
}

export interface McpPersonalConnection {
  serverId: string;
  status: 'missing' | 'connected' | 'error';
  authType: 'bearer_token' | 'custom_header';
  action?: 'connect_mcp_server' | 'verify_mcp_server';
  errorCode?: string;
}

export interface McpPersonalCredentialInput {
  credential: string;
  consentGranted: true;
}

export const catalogApi = {
  async listCatalogSources(workspaceId: string): Promise<CatalogSourceList> {
    const response = await requestJson<CatalogSourceList>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/catalog/sources`
    );
    return {
      items: response.items || [],
      capabilities: response.capabilities || {
        workspaceManagedSourcesEnabled: false,
        supportedNetworkRoutes: ['direct']
      }
    };
  },

  async createCatalogSource(
    workspaceId: string,
    input: CatalogSourceMutationInput & { displayName: string; baseUrl: string }
  ): Promise<CatalogSource> {
    const response = await requestJson<{ source: CatalogSource }>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/catalog/sources`,
      { method: 'POST', body: JSON.stringify(input) }
    );
    return response.source;
  },

  async updateCatalogSource(
    workspaceId: string,
    sourceId: string,
    input: CatalogSourceMutationInput
  ): Promise<CatalogSource> {
    const response = await requestJson<{ source: CatalogSource }>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/catalog/sources/${encodeURIComponent(sourceId)}`,
      { method: 'PATCH', body: JSON.stringify(input) }
    );
    return response.source;
  },

  async synchronizeCatalogSource(workspaceId: string, sourceId: string): Promise<number> {
    const response = await requestJson<{ artifactCount: number }>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/catalog/sources/${encodeURIComponent(sourceId)}/sync`,
      { method: 'POST' }
    );
    return response.artifactCount;
  },

  async deleteCatalogSource(workspaceId: string, sourceId: string): Promise<void> {
    await requestJson(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/catalog/sources/${encodeURIComponent(sourceId)}`,
      { method: 'DELETE' }
    );
  },

  async listCatalogArtifacts(workspaceId: string, options: {
    sourceId?: string;
    q?: string;
    compatible?: boolean;
    refresh?: boolean;
    cursor?: string;
    limit?: number;
    signal?: AbortSignal;
  } = {}): Promise<{ items: CatalogArtifact[]; nextCursor?: string }> {
    const query = new URLSearchParams();
    if (options.sourceId) query.set('sourceId', options.sourceId);
    if (options.q) query.set('q', options.q);
    if (options.compatible !== undefined) query.set('compatible', String(options.compatible));
    if (options.refresh) query.set('refresh', 'true');
    if (options.cursor) query.set('cursor', options.cursor);
    if (options.limit) query.set('limit', String(options.limit));
    const path = `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/catalog/artifacts`;
    const suffix = query.size ? `?${query.toString()}` : '';
    return options.signal
      ? requestJson<{ items: CatalogArtifact[]; nextCursor?: string }>(path + suffix, { signal: options.signal })
      : requestJson<{ items: CatalogArtifact[]; nextCursor?: string }>(path + suffix);
  },

  async importAgentMcpServer(workspaceId: string, agentId: string, input: CatalogImportInput): Promise<{ id: string }> {
    const response = await requestJson<{ server: { id: string } }>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agentId)}/mcp/servers/import`,
      { method: 'POST', body: JSON.stringify(input) }
    );
    return response.server;
  },

  async reimportAgentMcpServer(workspaceId: string, agentId: string, serverId: string, input: CatalogImportInput & { expectedRevision: number }): Promise<{ id: string }> {
    const response = await requestJson<{ server: { id: string } }>(
      `${agentMcpServerPath(workspaceId, agentId, serverId)}/reimport`,
      { method: 'POST', body: JSON.stringify(input) }
    );
    return response.server;
  },

  async importTargetMcpServer(workspaceId: string, targetId: string, input: CatalogImportInput): Promise<{ id: string }> {
    const response = await requestJson<{ server: { id: string } }>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/mcp/servers/import`,
      { method: 'POST', body: JSON.stringify(input) }
    );
    return response.server;
  },

  async reimportTargetMcpServer(workspaceId: string, targetId: string, serverId: string, input: CatalogImportInput & { expectedRevision: number }): Promise<{ id: string }> {
    const response = await requestJson<{ server: { id: string } }>(
      `${targetMcpServerPath(workspaceId, targetId, serverId)}/reimport`,
      { method: 'POST', body: JSON.stringify(input) }
    );
    return response.server;
  },

  async getAgentMcpConnection(workspaceId: string, agentId: string, serverId: string): Promise<McpPersonalConnection> {
    const response = await requestJson<{ connection: McpPersonalConnection }>(`${agentMcpServerPath(workspaceId, agentId, serverId)}/connection`);
    return response.connection;
  },

  async putAgentMcpConnection(workspaceId: string, agentId: string, serverId: string, input: McpPersonalCredentialInput): Promise<McpPersonalConnection> {
    const response = await requestJson<{ connection: McpPersonalConnection }>(`${agentMcpServerPath(workspaceId, agentId, serverId)}/connection`, { method: 'PUT', body: JSON.stringify(input) });
    return response.connection;
  },

  async verifyAgentMcpConnection(workspaceId: string, agentId: string, serverId: string): Promise<McpPersonalConnection> {
    const response = await requestJson<{ connection: McpPersonalConnection }>(`${agentMcpServerPath(workspaceId, agentId, serverId)}/connection/verify`, { method: 'POST' });
    return response.connection;
  },

  async disconnectAgentMcp(workspaceId: string, agentId: string, serverId: string): Promise<void> {
    await requestJson(`${agentMcpServerPath(workspaceId, agentId, serverId)}/connection`, { method: 'DELETE' });
  },

  async getTargetMcpConnection(workspaceId: string, targetId: string, serverId: string): Promise<McpPersonalConnection> {
    const response = await requestJson<{ connection: McpPersonalConnection }>(`${targetMcpServerPath(workspaceId, targetId, serverId)}/connection`);
    return response.connection;
  },

  async putTargetMcpConnection(workspaceId: string, targetId: string, serverId: string, input: McpPersonalCredentialInput): Promise<McpPersonalConnection> {
    const response = await requestJson<{ connection: McpPersonalConnection }>(`${targetMcpServerPath(workspaceId, targetId, serverId)}/connection`, { method: 'PUT', body: JSON.stringify(input) });
    return response.connection;
  },

  async verifyTargetMcpConnection(workspaceId: string, targetId: string, serverId: string): Promise<McpPersonalConnection> {
    const response = await requestJson<{ connection: McpPersonalConnection }>(`${targetMcpServerPath(workspaceId, targetId, serverId)}/connection/verify`, { method: 'POST' });
    return response.connection;
  },

  async disconnectTargetMcp(workspaceId: string, targetId: string, serverId: string): Promise<void> {
    await requestJson(`${targetMcpServerPath(workspaceId, targetId, serverId)}/connection`, { method: 'DELETE' });
  }
};
