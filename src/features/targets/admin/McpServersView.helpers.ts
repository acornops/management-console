import type {
  TargetToolCatalogItem,
  TargetToolCatalogServer
} from '@/features/targets/admin/targetMcpCatalogTypes';
import type { TargetMcpServer } from '@/services/control-plane/targetMcpTypes';
import type { CursorCollectionStrategy } from '@/hooks/useCursorCollection';

export interface ServerToolsPageState {
  items: TargetToolCatalogItem[];
  nextCursor?: string;
  loadingInitial: boolean;
  loadingMore: boolean;
  error: string | null;
}

export function findMcpCatalogServer(
  servers: TargetToolCatalogServer[],
  serverId: string | null,
  fallbackServer?: TargetToolCatalogServer | null
): TargetToolCatalogServer | null {
  if (!serverId) return null;
  return servers.find((server) => server.id === serverId)
    || (fallbackServer?.id === serverId ? fallbackServer : null);
}

export function mcpToolCollectionStrategy(
  createReviewServerId: string | null,
  toolsServerId: string
): CursorCollectionStrategy {
  return createReviewServerId && createReviewServerId === toolsServerId ? 'drain' : 'sentinel';
}

export function findMcpOAuthCallbackServer(
  servers: TargetToolCatalogServer[],
  callbackServerId: string | null,
  pendingCreateServer?: TargetToolCatalogServer | null
): TargetToolCatalogServer | null {
  return callbackServerId
    ? findMcpCatalogServer(servers, callbackServerId, pendingCreateServer)
    : null;
}

export function mcpOAuthCallbackMatchesServer(
  callbackServerId: string | null,
  server: TargetToolCatalogServer | null
): boolean {
  return Boolean(callbackServerId && server?.id === callbackServerId);
}

export async function completeMcpOAuthConnection(options: {
  server: TargetToolCatalogServer | null;
  closeDialog: () => void;
  reloadConnections: () => Promise<void>;
  refreshConnectedServer: (server: TargetToolCatalogServer) => Promise<void>;
  refreshCatalog: () => Promise<void>;
  onRefreshError: (error: unknown) => void;
}): Promise<void> {
  options.closeDialog();
  let refreshError: unknown = null;
  try {
    await options.reloadConnections();
  } catch (error) {
    refreshError = error;
  }
  try {
    if (options.server) {
      await options.refreshConnectedServer(options.server);
    } else {
      await options.refreshCatalog();
    }
  } catch (error) {
    refreshError ??= error;
  }
  if (refreshError) options.onRefreshError(refreshError);
}

export function buildMcpToolUpdateInput(
  server: Pick<TargetToolCatalogServer, 'isSystem'>,
  tool: Pick<TargetToolCatalogItem, 'capability' | 'source'>,
  enabled: boolean,
  capability: 'read' | 'write'
): { enabled: boolean; capability?: 'read' | 'write' } {
  if (server.isSystem || tool.source === 'builtin') return { enabled };
  return enabled || capability !== tool.capability ? { enabled, capability } : { enabled };
}

export function getOptimisticToolEffectiveState(
  server: Pick<TargetToolCatalogServer, 'enabled'>,
  tool: Pick<TargetToolCatalogItem, 'capability' | 'effectiveDisabledReason'>,
  enabledConfigured: boolean
): Pick<TargetToolCatalogItem, 'enabledEffective' | 'effectiveDisabledReason'> {
  if (!enabledConfigured) return { enabledEffective: false, effectiveDisabledReason: null };
  if (!server.enabled) return { enabledEffective: false, effectiveDisabledReason: 'server_disabled' };
  if (tool.effectiveDisabledReason === 'agent_disconnected') {
    return { enabledEffective: false, effectiveDisabledReason: 'agent_disconnected' };
  }
  if (tool.capability === 'write' && tool.effectiveDisabledReason === 'agent_write_disabled') {
    return { enabledEffective: false, effectiveDisabledReason: 'agent_write_disabled' };
  }
  return { enabledEffective: true, effectiveDisabledReason: null };
}

export function applyToolCountsDelta(
  counts: TargetToolCatalogServer['toolCounts'],
  previousTool: TargetToolCatalogItem,
  nextTool: TargetToolCatalogItem
): TargetToolCatalogServer['toolCounts'] {
  const delta = (nextValue: boolean, previousValue: boolean) => Number(nextValue) - Number(previousValue);
  const wasConfiguredWrite = previousTool.capability === 'write' && previousTool.enabledConfigured;
  const isConfiguredWrite = nextTool.capability === 'write' && nextTool.enabledConfigured;
  const wasEffectiveWrite = previousTool.capability === 'write' && previousTool.enabledEffective;
  const isEffectiveWrite = nextTool.capability === 'write' && nextTool.enabledEffective;
  const wasReadOnly = previousTool.capability === 'read';
  const isReadOnly = nextTool.capability === 'read';
  const wasWriteCapable = previousTool.capability === 'write';
  const isWriteCapable = nextTool.capability === 'write';
  return {
    ...counts,
    readOnly: counts.readOnly + delta(isReadOnly, wasReadOnly),
    writeCapable: counts.writeCapable + delta(isWriteCapable, wasWriteCapable),
    enabledConfigured: counts.enabledConfigured + delta(nextTool.enabledConfigured, previousTool.enabledConfigured),
    enabledEffective: counts.enabledEffective + delta(nextTool.enabledEffective, previousTool.enabledEffective),
    writeConfigured: counts.writeConfigured + delta(isConfiguredWrite, wasConfiguredWrite),
    writeEffective: counts.writeEffective + delta(isEffectiveWrite, wasEffectiveWrite)
  };
}

export function pendingCatalogServer(created: TargetMcpServer): TargetToolCatalogServer {
  return {
    id: created.id,
    name: created.serverName,
    url: created.serverUrl,
    type: 'mcp',
    enabled: created.enabled,
    isSystem: false,
    canDelete: true,
    canEditConnection: true,
    canToggle: true,
    authType: created.authType,
    credentialMode: created.credentialMode,
    authHeaderName: created.authHeaderName,
    authHeaderPrefix: created.authHeaderPrefix,
    revision: created.revision || 1,
    publicHeaders: created.publicHeaders,
    credentialTransitioning: created.credentialTransitioning === true,
    connectionStatus: created.connectionStatus,
    lastDiscoveryAt: created.lastDiscoveryAt || null,
    lastDiscoveryError: created.lastDiscoveryError || null,
    inherited: created.inherited,
    toolCounts: {
      total: 0,
      readOnly: 0,
      writeCapable: 0,
      enabledConfigured: 0,
      enabledEffective: 0,
      writeConfigured: 0,
      writeEffective: 0
    },
    tools: []
  };
}
