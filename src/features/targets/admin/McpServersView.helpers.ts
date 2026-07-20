import type {
  TargetToolCatalogItem,
  TargetToolCatalogServer
} from '@/features/targets/admin/targetMcpCatalogTypes';
import type { TargetMcpServer } from '@/services/control-plane/targetMcpTypes';

export interface ServerToolsPageState {
  items: TargetToolCatalogItem[];
  nextCursor?: string;
  loadingInitial: boolean;
  loadingMore: boolean;
  error: string | null;
}

export function getOptimisticToolEffectiveState(
  server: Pick<TargetToolCatalogServer, 'enabled'>,
  tool: Pick<TargetToolCatalogItem, 'effectiveDisabledReason'>,
  enabledConfigured: boolean
): Pick<TargetToolCatalogItem, 'enabledEffective' | 'effectiveDisabledReason'> {
  if (!enabledConfigured) return { enabledEffective: false, effectiveDisabledReason: null };
  if (!server.enabled) return { enabledEffective: false, effectiveDisabledReason: 'server_disabled' };
  if (tool.effectiveDisabledReason === 'agent_write_disabled') {
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
  const isWrite = previousTool.capability === 'write';
  return {
    ...counts,
    enabledConfigured: counts.enabledConfigured + delta(nextTool.enabledConfigured, previousTool.enabledConfigured),
    enabledEffective: counts.enabledEffective + delta(nextTool.enabledEffective, previousTool.enabledEffective),
    writeConfigured: isWrite
      ? counts.writeConfigured + delta(nextTool.enabledConfigured, previousTool.enabledConfigured)
      : counts.writeConfigured,
    writeEffective: isWrite
      ? counts.writeEffective + delta(nextTool.enabledEffective, previousTool.enabledEffective)
      : counts.writeEffective
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
    connectionStatus: created.connectionStatus,
    lastDiscoveryAt: created.lastDiscoveryAt || null,
    lastDiscoveryError: created.lastDiscoveryError || null,
    toolCounts: {
      total: 0,
      enabledConfigured: 0,
      enabledEffective: 0,
      writeConfigured: 0,
      writeEffective: 0
    },
    tools: []
  };
}
