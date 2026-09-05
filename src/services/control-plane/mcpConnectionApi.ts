import { isFrontendFixtureRuntime } from '@/config/appDataMode';

import { requestJson } from './http';

function agentMcpServerPath(workspaceId: string, agentId: string, serverId: string): string {
  return `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/agents/${encodeURIComponent(agentId)}/mcp/servers/${encodeURIComponent(serverId)}`;
}

function targetMcpServerPath(workspaceId: string, targetId: string, serverId: string): string {
  return `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/mcp/servers/${encodeURIComponent(serverId)}`;
}

export interface McpConnection {
  serverId: string;
  credentialMode: 'workspace' | 'individual';
  status: 'missing' | 'pending_authorization' | 'connected' | 'reauthorization_required' | 'error';
  managementScope: 'workspace' | 'individual';
  canManage: boolean;
  authType: 'bearer_token' | 'custom_header' | 'oauth';
  action?:
    | 'connect_mcp_server'
    | 'authorize_mcp_server'
    | 'select_authorization_server'
    | 'reauthorize_mcp_server'
    | 'verify_mcp_server';
  errorCode?: string;
  issuerOrigin?: string;
  registrationMethod?: 'cimd' | 'dcr';
  scopes?: string[];
  tokenExpiresAt?: string;
  refreshCapable?: boolean;
  verifiedAt?: string;
  updatedAt?: string;
}

export interface McpCredentialInput {
  credential: string;
  consentGranted: true;
}

export interface McpOAuthIssuerCandidate {
  issuer: string;
  issuerOrigin: string;
  registrationMethod: 'cimd' | 'dcr';
  scopes: string[];
  offlineAccessRequested: boolean;
}

export interface McpOAuthPreparation {
  preparationHandle: string;
  resourceOrigin: string;
  issuerSelectionRequired: boolean;
  candidates: McpOAuthIssuerCandidate[];
}

export interface McpOAuthStartInput {
  preparationHandle: string;
  issuer?: string;
  consentGranted: true;
}

export interface McpOAuthStart {
  authorizationUrl: string;
}

function requireExternalMcpOAuth(): void {
  if (isFrontendFixtureRuntime()) {
    throw new Error('External MCP OAuth is unavailable in frontend fixture mode.');
  }
}

export const mcpConnectionApi = {
  async getAgentMcpConnection(workspaceId: string, agentId: string, serverId: string): Promise<McpConnection> {
    const response = await requestJson<{ connection: McpConnection }>(`${agentMcpServerPath(workspaceId, agentId, serverId)}/connection`);
    return response.connection;
  },

  async putAgentMcpConnection(workspaceId: string, agentId: string, serverId: string, input: McpCredentialInput): Promise<McpConnection> {
    const response = await requestJson<{ connection: McpConnection }>(`${agentMcpServerPath(workspaceId, agentId, serverId)}/connection`, { method: 'PUT', body: JSON.stringify(input) });
    return response.connection;
  },

  async verifyAgentMcpConnection(workspaceId: string, agentId: string, serverId: string): Promise<McpConnection> {
    const response = await requestJson<{ connection: McpConnection }>(`${agentMcpServerPath(workspaceId, agentId, serverId)}/connection/verify`, { method: 'POST' });
    return response.connection;
  },

  async prepareAgentMcpOAuth(workspaceId: string, agentId: string, serverId: string, returnPath: string): Promise<McpOAuthPreparation> {
    requireExternalMcpOAuth();
    return requestJson<McpOAuthPreparation>(`${agentMcpServerPath(workspaceId, agentId, serverId)}/connection/oauth/prepare`, {
      method: 'POST',
      body: JSON.stringify({ returnPath })
    });
  },

  async startAgentMcpOAuth(workspaceId: string, agentId: string, serverId: string, input: McpOAuthStartInput): Promise<McpOAuthStart> {
    requireExternalMcpOAuth();
    return requestJson<McpOAuthStart>(`${agentMcpServerPath(workspaceId, agentId, serverId)}/connection/oauth/start`, {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async disconnectAgentMcp(workspaceId: string, agentId: string, serverId: string): Promise<void> {
    await requestJson(`${agentMcpServerPath(workspaceId, agentId, serverId)}/connection`, { method: 'DELETE' });
  },

  async getTargetMcpConnection(workspaceId: string, targetId: string, serverId: string): Promise<McpConnection> {
    const response = await requestJson<{ connection: McpConnection }>(`${targetMcpServerPath(workspaceId, targetId, serverId)}/connection`);
    return response.connection;
  },

  async putTargetMcpConnection(workspaceId: string, targetId: string, serverId: string, input: McpCredentialInput): Promise<McpConnection> {
    const response = await requestJson<{ connection: McpConnection }>(`${targetMcpServerPath(workspaceId, targetId, serverId)}/connection`, { method: 'PUT', body: JSON.stringify(input) });
    return response.connection;
  },

  async verifyTargetMcpConnection(workspaceId: string, targetId: string, serverId: string): Promise<McpConnection> {
    const response = await requestJson<{ connection: McpConnection }>(`${targetMcpServerPath(workspaceId, targetId, serverId)}/connection/verify`, { method: 'POST' });
    return response.connection;
  },

  async prepareTargetMcpOAuth(workspaceId: string, targetId: string, serverId: string, returnPath: string): Promise<McpOAuthPreparation> {
    requireExternalMcpOAuth();
    return requestJson<McpOAuthPreparation>(`${targetMcpServerPath(workspaceId, targetId, serverId)}/connection/oauth/prepare`, {
      method: 'POST',
      body: JSON.stringify({ returnPath })
    });
  },

  async startTargetMcpOAuth(workspaceId: string, targetId: string, serverId: string, input: McpOAuthStartInput): Promise<McpOAuthStart> {
    requireExternalMcpOAuth();
    return requestJson<McpOAuthStart>(`${targetMcpServerPath(workspaceId, targetId, serverId)}/connection/oauth/start`, {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async disconnectTargetMcp(workspaceId: string, targetId: string, serverId: string): Promise<void> {
    await requestJson(`${targetMcpServerPath(workspaceId, targetId, serverId)}/connection`, { method: 'DELETE' });
  }
};
