import {
  ClusterToolCatalog,
  ClusterToolCatalogItem,
  ClusterToolCatalogServer,
  KubernetesCluster
} from '@/types';
import { ControlPlaneRequestError } from '@/services/control-plane/http';

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

export function createPublicHeaderRow(name = '', value = ''): ServerFormState['publicHeaders'][number] {
  return {
    id: `${name || 'header'}-${Math.random().toString(36).slice(2)}`,
    name,
    value
  };
}

export function publicHeaderRowsFromRecord(headers: Record<string, string> | undefined): ServerFormState['publicHeaders'] {
  return Object.entries(headers || {}).map(([name, value]) => createPublicHeaderRow(name, value));
}

export function publicHeadersFromRows(rows: ServerFormState['publicHeaders']): Record<string, string> | undefined {
  const headers = rows.reduce<Record<string, string>>((acc, row) => {
    const name = row.name.trim();
    if (name) {
      acc[name] = row.value;
    }
    return acc;
  }, {});
  return Object.keys(headers).length > 0 ? headers : undefined;
}

export type PublicHeadersValidationKey =
  | 'publicHeadersTooMany'
  | 'publicHeaderNameRequired'
  | 'publicHeaderNameInvalid'
  | 'publicHeaderDuplicate'
  | 'publicHeaderReserved'
  | 'publicHeaderCredentialLike'
  | 'publicHeaderValueInvalid';

const publicHeaderNamePattern = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const reservedPublicHeaderNames = new Set([
  'host',
  'connection',
  'content-length',
  'transfer-encoding',
  'upgrade',
  'keep-alive',
  'proxy-connection',
  'te',
  'trailer',
  'x-workspace-id',
  'x-target-id',
  'x-target-type',
  'x-run-id',
  'x-tool-name'
]);
const deniedPublicHeaderNames = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'x-access-token'
]);
const deniedPublicHeaderPatterns = ['token', 'secret', 'credential', 'api-key', 'apikey'];

export function validatePublicHeaderRows(rows: ServerFormState['publicHeaders']): PublicHeadersValidationKey | null {
  const activeRows = rows.filter((row) => row.name.trim() || row.value.length > 0);
  if (activeRows.length === 0) return null;
  if (activeRows.length > 64) return 'publicHeadersTooMany';

  const seenHeaders = new Set<string>();
  for (const row of activeRows) {
    const name = row.name.trim();
    const normalizedName = name.toLowerCase();
    if (!name) return 'publicHeaderNameRequired';
    if (!publicHeaderNamePattern.test(name)) return 'publicHeaderNameInvalid';
    if (seenHeaders.has(normalizedName)) return 'publicHeaderDuplicate';
    seenHeaders.add(normalizedName);
    if (reservedPublicHeaderNames.has(normalizedName)) return 'publicHeaderReserved';
    if (deniedPublicHeaderNames.has(normalizedName) || deniedPublicHeaderPatterns.some((pattern) => normalizedName.includes(pattern))) {
      return 'publicHeaderCredentialLike';
    }
    if (row.value.length > 4096 || /[\r\n]/.test(row.value)) return 'publicHeaderValueInvalid';
  }
  return null;
}

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
      canToggle: Boolean(tool.sourceServerId || type === 'builtin'),
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
    targetId: cluster.id,
    targetType: 'kubernetes',
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

export function isManagedMcpServer(server: Pick<ClusterToolCatalogServer, 'type' | 'isSystem' | 'url'>): boolean {
  return server.type === 'builtin' || server.isSystem || /\/internal\/v\d+\/mcp(?:$|[/?#])/i.test(server.url);
}

export function formatMcpMutationError(error: unknown, fallback: string): string {
  if (error instanceof ControlPlaneRequestError) {
    const formErrors = error.details?.formErrors;
    const fieldErrors = error.details?.fieldErrors;
    const detail = [
      ...(Array.isArray(formErrors) ? formErrors : []),
      ...(fieldErrors && typeof fieldErrors === 'object'
        ? Object.entries(fieldErrors).flatMap(([field, messages]) =>
            Array.isArray(messages) ? messages.map((message) => `${field}: ${message}`) : []
          )
        : [])
    ].find((message): message is string => typeof message === 'string' && message.trim().length > 0);
    if (detail) return detail;
  }
  const raw = error instanceof Error ? error.message : fallback;
  return raw.replace(/^Control plane request failed \(\d+\):\s*/i, '') || fallback;
}

export function formatDiscoveryTimestamp(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}
