import { describe, expect, it } from 'vitest';
import {
  applyToolCountsDelta,
  buildMcpToolUpdateInput,
  completeMcpOAuthConnection,
  findMcpCatalogServer,
  findMcpOAuthCallbackServer,
  getOptimisticToolEffectiveState,
  mcpOAuthCallbackMatchesServer,
  mcpToolCollectionStrategy
} from './McpServersView.helpers';
import type { TargetToolCatalogItem, TargetToolCatalogServer } from './targetMcpCatalogTypes';

const tool = (overrides: Partial<TargetToolCatalogItem> = {}): TargetToolCatalogItem => ({
  name: 'records.lookup',
  description: 'Look up records',
  capability: 'write',
  version: 'v1',
  source: 'mcp',
  enabledConfigured: true,
  enabledEffective: true,
  effectiveDisabledReason: null,
  ...overrides
});

const counts: TargetToolCatalogServer['toolCounts'] = {
  total: 1,
  readOnly: 0,
  writeCapable: 1,
  enabledConfigured: 1,
  enabledEffective: 1,
  writeConfigured: 1,
  writeEffective: 1
};

describe('target MCP tool capability updates', () => {
  it('drains every tool page only while reviewing a newly created server', () => {
    expect(mcpToolCollectionStrategy('server-1', 'server-1')).toBe('drain');
    expect(mcpToolCollectionStrategy(null, 'server-1')).toBe('sentinel');
    expect(mcpToolCollectionStrategy('server-1', 'server-2')).toBe('sentinel');
  });

  it('keeps a successful create review addressable when the refreshed catalog misses it', () => {
    const pendingServer = { id: 'new-server' } as TargetToolCatalogServer;

    expect(findMcpCatalogServer([], 'new-server', pendingServer)).toBe(pendingServer);
    expect(findMcpCatalogServer([], 'different-server', pendingServer)).toBeNull();
    expect(mcpToolCollectionStrategy('new-server', 'new-server')).toBe('drain');
  });

  it('closes OAuth, reloads connection state, and refreshes the completed installation', async () => {
    const server = { id: 'server-1' } as TargetToolCatalogServer;
    const calls: string[] = [];

    await completeMcpOAuthConnection({
      server,
      closeDialog: () => calls.push('close'),
      reloadConnections: async () => { calls.push('connections'); },
      refreshConnectedServer: async (value) => { calls.push(`server:${value.id}`); },
      refreshCatalog: async () => { calls.push('catalog'); },
      onRefreshError: () => { calls.push('error'); }
    });

    expect(calls).toEqual(['close', 'connections', 'server:server-1']);
  });

  it('falls back to a catalog refresh when OAuth returns without an open installation', async () => {
    const calls: string[] = [];

    await completeMcpOAuthConnection({
      server: null,
      closeDialog: () => calls.push('close'),
      reloadConnections: async () => { calls.push('connections'); },
      refreshConnectedServer: async () => { calls.push('server'); },
      refreshCatalog: async () => { calls.push('catalog'); },
      onRefreshError: () => { calls.push('error'); }
    });

    expect(calls).toEqual(['close', 'connections', 'catalog']);
  });

  it('uses the correlated pending create identity after the credential dialog closes', async () => {
    const pendingCreateServer = { id: 'new-server' } as TargetToolCatalogServer;
    const calls: string[] = [];

    await completeMcpOAuthConnection({
      server: findMcpOAuthCallbackServer([], 'new-server', pendingCreateServer),
      closeDialog: () => calls.push('close'),
      reloadConnections: async () => { calls.push('connections'); },
      refreshConnectedServer: async (server) => { calls.push(`server:${server.id}`); },
      refreshCatalog: async () => { calls.push('catalog'); },
      onRefreshError: () => { calls.push('error'); }
    });

    expect(calls).toEqual(['close', 'connections', 'server:new-server']);
  });

  it('keeps concurrent OAuth callbacks correlated when they return out of order', () => {
    const olderServer = { id: 'older-server' } as TargetToolCatalogServer;
    const currentPendingServer = { id: 'current-server' } as TargetToolCatalogServer;

    expect(findMcpOAuthCallbackServer(
      [olderServer], 'older-server', currentPendingServer
    )).toBe(olderServer);
    expect(findMcpOAuthCallbackServer(
      [olderServer], 'current-server', currentPendingServer
    )).toBe(currentPendingServer);
    expect(findMcpOAuthCallbackServer(
      [olderServer], 'unknown-server', currentPendingServer
    )).toBeNull();
    expect(findMcpOAuthCallbackServer(
      [olderServer], null, currentPendingServer
    )).toBeNull();
    expect(mcpOAuthCallbackMatchesServer('older-server', currentPendingServer)).toBe(false);
    expect(mcpOAuthCallbackMatchesServer('current-server', currentPendingServer)).toBe(true);
    expect(mcpOAuthCallbackMatchesServer(null, currentPendingServer)).toBe(false);
  });

  it('closes OAuth and reports refresh failures without rejecting the callback promise', async () => {
    const server = { id: 'server-1' } as TargetToolCatalogServer;
    const calls: string[] = [];

    await expect(completeMcpOAuthConnection({
      server,
      closeDialog: () => calls.push('close'),
      reloadConnections: async () => {
        calls.push('connections');
        throw new Error('connection refresh failed');
      },
      refreshConnectedServer: async () => {
        calls.push('server');
        throw new Error('catalog refresh failed');
      },
      refreshCatalog: async () => { calls.push('catalog'); },
      onRefreshError: () => { calls.push('error'); }
    })).resolves.toBeUndefined();

    expect(calls).toEqual(['close', 'connections', 'server', 'error']);
  });

  it('sends producer-valid payloads for built-in and discovered tool updates', () => {
    const managedServer = { isSystem: false };
    const systemServer = { isSystem: true };
    const discoveredTool = tool({ capability: 'read', source: 'mcp' });
    const builtinTool = tool({ capability: 'read', source: 'builtin' });

    expect(buildMcpToolUpdateInput(managedServer, discoveredTool, true, 'read'))
      .toEqual({ enabled: true, capability: 'read' });
    expect(buildMcpToolUpdateInput(managedServer, discoveredTool, false, 'read'))
      .toEqual({ enabled: false });
    expect(buildMcpToolUpdateInput(managedServer, discoveredTool, false, 'write'))
      .toEqual({ enabled: false, capability: 'write' });
    expect(buildMcpToolUpdateInput(managedServer, builtinTool, true, 'read'))
      .toEqual({ enabled: true });
    expect(buildMcpToolUpdateInput(systemServer, discoveredTool, true, 'read'))
      .toEqual({ enabled: true });
  });

  it('removes enabled write counts when a tool is reviewed as read-only', () => {
    const previous = tool();
    const next = tool({ capability: 'read' });

    expect(applyToolCountsDelta(counts, previous, next)).toEqual({
      total: 1,
      readOnly: 1,
      writeCapable: 0,
      enabledConfigured: 1,
      enabledEffective: 1,
      writeConfigured: 0,
      writeEffective: 0
    });
  });

  it('makes an enabled read tool effective when only write mode was blocked', () => {
    expect(getOptimisticToolEffectiveState(
      { enabled: true },
      tool({ capability: 'read', enabledEffective: false, effectiveDisabledReason: 'agent_write_disabled' }),
      true
    )).toEqual({
      enabledEffective: true,
      effectiveDisabledReason: null
    });
  });

  it('keeps tools ineffective while the target agent is disconnected', () => {
    expect(getOptimisticToolEffectiveState(
      { enabled: true },
      tool({ capability: 'read', enabledEffective: false, effectiveDisabledReason: 'agent_disconnected' }),
      true
    )).toEqual({
      enabledEffective: false,
      effectiveDisabledReason: 'agent_disconnected'
    });
  });
});
