import {
  ClusterToolCatalog,
  ClusterToolCatalogItem,
  ClusterToolCatalogServer,
  KubernetesCluster
} from '@/types';

type McpTool = KubernetesCluster['mcpTools'][number];

export interface ServerFormState {
  name: string;
  url: string;
  enabled: boolean;
  authType: 'none' | 'bearer_token' | 'custom_header';
  secretValue: string;
  headerName: string;
  publicHeaders: Array<{ id: string; name: string; value: string }>;
}

export const DEFAULT_SERVER_FORM: ServerFormState = {
  name: '',
  url: '',
  enabled: true,
  authType: 'none',
  secretValue: '',
  headerName: '',
  publicHeaders: []
};

function getServerKey(tool: McpTool): string {
  if (tool.sourceServerId) return tool.sourceServerId;
  if (tool.toolType === 'builtin') return 'builtin-local';
  if (tool.sourceServerUrl) return `mcp:${tool.sourceServerUrl}`;
  if (tool.sourceServerName) return `mcp:${tool.sourceServerName}`;
  return 'mcp-local';
}

function getServerName(tool: McpTool, appName: string): string {
  if (tool.sourceServerName) return tool.sourceServerName;
  if (tool.toolType === 'builtin') return 'Built-in Tools';
  return `${appName} MCP Server`;
}

function getServerUrl(tool: McpTool): string {
  if (tool.sourceServerUrl) return tool.sourceServerUrl;
  if (tool.toolType === 'builtin') return 'local://builtin';
  return 'local://mcp';
}

function mapTool(tool: McpTool): ClusterToolCatalogItem {
  return {
    name: tool.toolId,
    description: tool.description || 'No description provided.',
    capability: tool.capability === 'write' ? 'write' : 'read',
    version: tool.version || 'v1',
    source: tool.toolType === 'builtin' ? 'builtin' : 'mcp',
    enabledConfigured: Boolean(tool.enabledConfigured ?? tool.enabled),
    enabledEffective: Boolean(tool.enabledEffective ?? tool.enabled),
    effectiveDisabledReason:
      tool.effectiveDisabledReason === 'server_disabled' || tool.effectiveDisabledReason === 'agent_write_disabled'
        ? tool.effectiveDisabledReason
        : null
  };
}

export function computeToolCounts(tools: ClusterToolCatalogItem[]): ClusterToolCatalogServer['toolCounts'] {
  return {
    total: tools.length,
    enabledConfigured: tools.filter((tool) => tool.enabledConfigured).length,
    enabledEffective: tools.filter((tool) => tool.enabledEffective).length,
    writeConfigured: tools.filter((tool) => tool.capability === 'write' && tool.enabledConfigured).length,
    writeEffective: tools.filter((tool) => tool.capability === 'write' && tool.enabledEffective).length
  };
}

export function buildLocalCatalog(cluster: KubernetesCluster, canEdit: boolean): ClusterToolCatalog {
  const servers = new Map<string, ClusterToolCatalogServer>();

  for (const tool of cluster.mcpTools || []) {
    const id = getServerKey(tool);
    const type = tool.toolType === 'builtin' ? 'builtin' : 'mcp';
    const existing = servers.get(id);
    if (existing) {
      existing.tools.push(mapTool(tool));
      existing.toolCounts = computeToolCounts(existing.tools);
      continue;
    }

    const tools = [mapTool(tool)];
    servers.set(id, {
      id,
      name: getServerName(tool, cluster.name),
      url: getServerUrl(tool),
      type,
      enabled: true,
      isSystem: type === 'builtin',
      canDelete: Boolean(tool.sourceServerId && type === 'mcp'),
      canEditConnection: Boolean(tool.sourceServerId && type === 'mcp'),
      authType: 'none',
      publicHeaders: {},
      connectionStatus: 'unknown',
      lastDiscoveryAt: null,
      lastDiscoveryError: null,
      toolCounts: computeToolCounts(tools),
      tools
    });
  }

  return {
    workspaceId: cluster.workspaceId,
    clusterId: cluster.id,
    permissions: {
      canEdit,
      editableRoles: []
    },
    servers: Array.from(servers.values()).sort((left, right) => left.name.localeCompare(right.name))
  };
}

export function flattenCatalogTools(catalog: ClusterToolCatalog): KubernetesCluster['mcpTools'] {
  const tools: KubernetesCluster['mcpTools'] = [];
  for (const server of catalog.servers) {
    for (const tool of server.tools) {
      tools.push({
        toolId: tool.name,
        enabled: tool.enabledEffective,
        toolType: tool.source === 'builtin' ? 'builtin' : 'mcp',
        capability: tool.capability,
        description: tool.description,
        version: tool.version,
        sourceServerId: server.id,
        sourceServerName: server.name,
        sourceServerUrl: server.url,
        enabledConfigured: tool.enabledConfigured,
        enabledEffective: tool.enabledEffective,
        effectiveDisabledReason: tool.effectiveDisabledReason
      });
    }
  }
  return tools;
}

export function getToolLabel(tool: ClusterToolCatalogItem): string {
  return tool.description || `Tool ${tool.name}`;
}

export function formatDiscoveryTimestamp(value: string | null): string {
  if (!value) return 'Never';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}
