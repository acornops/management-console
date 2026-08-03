import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { initializeI18n } from '@/i18n';
import { McpServersInventory } from '@/features/targets/admin/McpServersInventory';
import {
  canOpenMcpServerSettings,
  canRefreshAuthenticatedMcpTools,
  getMcpServerStatusDisplay
} from '@/features/targets/admin/McpServerCard';
import type { TargetToolCatalogServer } from '@/features/targets/admin/targetMcpCatalogTypes';
import type { McpConnection } from '@/services/control-plane/catalogApi';

beforeAll(async () => {
  await initializeI18n();
});

describe('McpServersInventory', () => {
  const systemServer: TargetToolCatalogServer = {
    id: 'targets-mcp',
    name: 'AcornOps Targets',
    url: 'http://control-plane/internal/v1/mcp',
    type: 'mcp',
    enabled: true,
    isSystem: true,
    canDelete: false,
    canEditConnection: false,
    canToggle: true,
    authType: 'none',
    credentialMode: 'none',
    connectionStatus: 'ok',
    lastDiscoveryAt: null,
    lastDiscoveryError: null,
    toolCounts: { total: 3, readOnly: 3, writeCapable: 0, enabledConfigured: 3, enabledEffective: 3, writeConfigured: 0, writeEffective: 0 },
    tools: []
  };

  it('omits zero-value summary metrics while keeping the list shell around the embedded empty state', () => {
    const markup = renderToStaticMarkup(
      <McpServersInventory
        servers={[]}
        canEditServers
        pendingTestServerId={null}
        pendingToggleServerId={null}
        testResultsByServerId={{}}
        connections={{}}
        connectionErrors={{}}
        pendingConnectionServerId={null}
        retryAfterSecondsFor={() => 0}
        recoveryServerId={null}
        onManageTools={vi.fn()}
        onTestConnection={vi.fn()}
        onToggleServer={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onConnect={vi.fn()}
        onVerify={vi.fn()}
        onDisconnect={vi.fn()}
        onRetry={vi.fn()}
      />
    );

    expect(markup).not.toContain('data-mcp-server-access-summary="true"');
    expect(markup).toContain('data-mcp-server-list="true"');
    expect(markup).toContain('data-empty-state="true"');
    expect(markup).toContain('data-empty-state-surface="embedded"');
    expect(markup).toContain('<h3');
    expect(markup).toContain('No MCP servers have been registered.');
    expect(markup).not.toContain('<table');
    expect(markup).not.toContain('lucide-plus');
    expect(markup).toContain('lucide-server');
    expect(markup).not.toContain('id="mcp-server-search"');
    expect(markup).not.toContain('Showing 0 of 0');
  });

  it('shows settings only for the built-in Targets server when the parent supplies the action', () => {
    const openSettings = vi.fn();
    expect(canOpenMcpServerSettings(systemServer, openSettings)).toBe(true);
    expect(canOpenMcpServerSettings({ ...systemServer, isSystem: false }, openSettings)).toBe(false);
    expect(canOpenMcpServerSettings({ ...systemServer, name: 'Another system server' }, openSettings)).toBe(false);
    expect(canOpenMcpServerSettings(systemServer)).toBe(false);
  });

  it.each([
    ['custom_header', 'workspace'],
    ['bearer_token', 'individual'],
    ['oauth', 'individual']
  ] as const)('uses the %s connection state in the table status for %s credentials', (authType, credentialMode) => {
    const server: TargetToolCatalogServer = {
      ...systemServer,
      id: `${authType}-${credentialMode}`,
      name: `${authType} server`,
      type: 'mcp',
      isSystem: false,
      authType,
      credentialMode,
      connectionStatus: 'unknown'
    };
    const connection: McpConnection = {
      serverId: server.id,
      credentialMode,
      status: 'connected',
      managementScope: credentialMode,
      canManage: true,
      authType
    };

    expect(getMcpServerStatusDisplay(server, connection)).toEqual({
      labelKey: 'mcpServers.statusConnected',
      tone: 'success'
    });
  });

  it('maps authenticated connection failures to the existing attention statuses', () => {
    const server = { ...systemServer, type: 'mcp' as const, isSystem: false, connectionStatus: 'unknown' as const };

    expect(getMcpServerStatusDisplay(server, { status: 'missing' })).toEqual({
      labelKey: 'mcpServers.statusNeedsAuth',
      tone: 'warning'
    });
    expect(getMcpServerStatusDisplay(server, { status: 'error', errorCode: 'MCP_AUTHENTICATION_REJECTED' })).toEqual({
      labelKey: 'mcpServers.statusNeedsAuth',
      tone: 'warning'
    });
    expect(getMcpServerStatusDisplay(server, { status: 'error', errorCode: 'MCP_DISCOVERY_TIMEOUT' })).toEqual({
      labelKey: 'mcpServers.statusDiscoveryFailed',
      tone: 'danger'
    });
  });

  it('offers tool refresh only for a manageable connected credential', () => {
    const server = { ...systemServer, credentialMode: 'workspace' as const };

    expect(canRefreshAuthenticatedMcpTools(server, {
      canManage: true,
      status: 'connected'
    })).toBe(true);
    expect(canRefreshAuthenticatedMcpTools(server, {
      canManage: false,
      status: 'connected'
    })).toBe(false);
    expect(canRefreshAuthenticatedMcpTools(server, {
      canManage: true,
      status: 'error'
    })).toBe(false);
    expect(canRefreshAuthenticatedMcpTools(server, {
      canManage: true,
      status: 'connected'
    }, 'Connection status unavailable')).toBe(false);
    expect(canRefreshAuthenticatedMcpTools({ credentialMode: 'none' }, {
      canManage: true,
      status: 'connected'
    })).toBe(false);
  });

  it('renders a credential-backed connection in the status column', () => {
    const server: TargetToolCatalogServer = {
      ...systemServer,
      id: 'custom-header-server',
      name: 'Custom header server',
      url: 'https://mcp.example.com',
      type: 'mcp',
      isSystem: false,
      authType: 'custom_header',
      credentialMode: 'workspace',
      connectionStatus: 'unknown'
    };
    const connection: McpConnection = {
      serverId: server.id,
      credentialMode: 'workspace',
      status: 'connected',
      managementScope: 'workspace',
      canManage: true,
      authType: 'custom_header'
    };
    const markup = renderToStaticMarkup(
      <McpServersInventory
        servers={[server]}
        canEditServers
        pendingTestServerId={null}
        pendingToggleServerId={null}
        testResultsByServerId={{}}
        connections={{ [server.id]: connection }}
        connectionErrors={{}}
        pendingConnectionServerId={null}
        retryAfterSecondsFor={() => 0}
        recoveryServerId={null}
        onManageTools={vi.fn()}
        onTestConnection={vi.fn()}
        onToggleServer={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onConnect={vi.fn()}
        onVerify={vi.fn()}
        onDisconnect={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    const rowMarkup = markup.match(/<tr[^>]*data-mcp-server-row="true"[\s\S]*?<\/tr>/)?.[0] || '';
    const statusColumnIndex = rowMarkup.indexOf('data-mcp-server-secondary-context="true"');

    expect(rowMarkup).not.toContain('No check yet');
    expect(rowMarkup).toContain('Connected');
    expect(rowMarkup.slice(0, statusColumnIndex)).not.toContain('Workspace connection: Connected');
    expect(rowMarkup.slice(statusColumnIndex)).toContain('Workspace connection: Connected');
  });

  it('does not report disabled write-capable tools as read-only', () => {
    const markup = renderToStaticMarkup(
      <McpServersInventory
        servers={[{
          ...systemServer,
          toolCounts: {
            total: 12,
            readOnly: 0,
            writeCapable: 12,
            enabledConfigured: 0,
            enabledEffective: 0,
            writeConfigured: 0,
            writeEffective: 0
          }
        }]}
        canEditServers
        pendingTestServerId={null}
        pendingToggleServerId={null}
        testResultsByServerId={{}}
        connections={{}}
        connectionErrors={{}}
        pendingConnectionServerId={null}
        retryAfterSecondsFor={() => 0}
        recoveryServerId={null}
        onManageTools={vi.fn()}
        onTestConnection={vi.fn()}
        onToggleServer={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onConnect={vi.fn()}
        onVerify={vi.fn()}
        onDisconnect={vi.fn()}
        onRetry={vi.fn()}
      />
    );

    expect(markup).toMatch(/data-mcp-write-capable-count="true"[^>]*>12</);
    expect(markup).not.toContain('data-mcp-read-only-count="true"');
    expect(markup).toContain('0<span class="type-caption text-ui-text-muted"> / 12</span>');
    expect(markup).toContain('0 Read · 12 Write');
  });
});
