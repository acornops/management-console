import {
  ClusterToolCatalog,
  ClusterToolCatalogItem,
  ClusterToolCatalogServer,
  KubernetesCluster
} from '@/types';
import {
  ControlPlaneClusterTool,
  ControlPlaneClusterToolCatalog,
  ControlPlaneMcpServer,
  ControlPlaneMcpServerTestConnectionResponse,
  TargetMcpServer,
  TargetMcpServerTestConnectionResult
} from './types';
import { toArray } from './formatters';

export function mapClusterTools(tools: ControlPlaneClusterTool[] | undefined): KubernetesCluster['mcpTools'] {
  return toArray(tools)
    .filter((tool) => Boolean(tool.name))
    .map((tool) => ({
      toolId: tool.name,
      enabled: Boolean(tool.enabled),
      toolType: tool.source === 'builtin' ? 'builtin' : 'mcp',
      capability: tool.capability === 'write' ? 'write' : 'read',
      description: tool.description,
      version: tool.version,
      sourceServerUrl: tool.mcp_server_url
    }));
}

export function mapClusterToolsFromCatalog(catalog: ControlPlaneClusterToolCatalog | undefined): KubernetesCluster['mcpTools'] {
  if (!catalog) return [];
  const mappedTools: KubernetesCluster['mcpTools'] = [];
  for (const server of toArray(catalog.servers)) {
    for (const tool of toArray(server.tools)) {
      mappedTools.push({
        toolId: tool.name,
        enabled: Boolean(tool.enabledEffective),
        toolType: tool.source === 'builtin' ? 'builtin' : 'mcp',
        capability: tool.capability === 'write' ? 'write' : 'read',
        description: tool.description,
        version: tool.version,
        sourceServerId: server.id,
        sourceServerName: server.name,
        sourceServerUrl: server.url,
        enabledConfigured: Boolean(tool.enabledConfigured),
        enabledEffective: Boolean(tool.enabledEffective),
        effectiveDisabledReason:
          tool.effectiveDisabledReason === 'server_disabled' || tool.effectiveDisabledReason === 'agent_write_disabled'
            ? tool.effectiveDisabledReason
            : null
      });
    }
  }
  return mappedTools;
}

export function mapClusterToolsCatalog(catalog: ControlPlaneClusterToolCatalog): ClusterToolCatalog {
  const targetId = catalog.targetId || catalog.clusterId || '';
  return {
    workspaceId: catalog.workspaceId,
    clusterId: catalog.clusterId || targetId,
    targetId,
    targetType: catalog.targetType,
    permissions: {
      canEdit: Boolean(catalog.permissions?.canEdit),
      editableRoles: Array.isArray(catalog.permissions?.editableRoles) ? catalog.permissions.editableRoles : []
    },
    servers: toArray(catalog.servers).map((server): ClusterToolCatalogServer => ({
      id: server.id,
      name: server.name,
      url: server.url,
      type: server.type === 'builtin' ? 'builtin' : 'mcp',
      enabled: Boolean(server.enabled),
      isSystem: Boolean(server.isSystem),
      canDelete: Boolean(server.canDelete),
      canEditConnection: Boolean(server.canEditConnection),
      canToggle: server.canToggle !== false,
      authType: server.authType || 'none',
      publicHeaders: server.publicHeaders || {},
      connectionStatus:
        server.connectionStatus === 'ok' || server.connectionStatus === 'error'
          ? server.connectionStatus
          : 'unknown',
      lastDiscoveryAt: server.lastDiscoveryAt || null,
      lastDiscoveryError: server.lastDiscoveryError || null,
      toolCounts: {
        total: Number(server.toolCounts?.total || 0),
        enabledConfigured: Number(server.toolCounts?.enabledConfigured || 0),
        enabledEffective: Number(server.toolCounts?.enabledEffective || 0),
        writeConfigured: Number(server.toolCounts?.writeConfigured || 0),
        writeEffective: Number(server.toolCounts?.writeEffective || 0)
      },
      tools: toArray(server.tools).map((tool): ClusterToolCatalogItem => ({
        name: tool.name,
        description: tool.description,
        capability: tool.capability === 'write' ? 'write' : 'read',
        version: tool.version || 'v1',
        source: tool.source === 'builtin' ? 'builtin' : 'mcp',
        enabledConfigured: Boolean(tool.enabledConfigured),
        enabledEffective: Boolean(tool.enabledEffective),
        effectiveDisabledReason:
          tool.effectiveDisabledReason === 'server_disabled' || tool.effectiveDisabledReason === 'agent_write_disabled'
            ? tool.effectiveDisabledReason
            : null
      }))
    }))
  };
}

export function mapMcpServer(server: ControlPlaneMcpServer): TargetMcpServer {
  return {
    id: server.id,
    workspaceId: server.workspace_id,
    targetId: server.target_id,
    serverName: server.server_name,
    serverUrl: server.server_url,
    enabled: Boolean(server.enabled),
    authType: server.auth_type || 'none',
    authSecretName: server.auth_secret_name,
    authHeaderName: server.auth_header_name,
    authHeaderPrefix: server.auth_header_prefix,
    publicHeaders: server.public_headers || undefined,
    connectionStatus:
      server.connection_status === 'ok' || server.connection_status === 'error'
        ? server.connection_status
        : 'unknown',
    lastDiscoveryAt: server.last_discovery_at || null,
    lastDiscoveryError: server.last_discovery_error || null,
    tools: mapClusterTools(server.tools)
  };
}

export function mapMcpServerTestConnectionResult(
  result: ControlPlaneMcpServerTestConnectionResponse
): TargetMcpServerTestConnectionResult {
  return {
    serverId: result.server_id,
    serverName: result.server_name,
    serverUrl: result.server_url,
    connectionStatus: result.connection_status === 'error' ? 'error' : 'ok',
    lastDiscoveryAt: result.last_discovery_at,
    discoveredToolCount: Number(result.discovered_tool_count || 0),
    discoveredTools: toArray(result.discovered_tools),
    error: result.error || null
  };
}
