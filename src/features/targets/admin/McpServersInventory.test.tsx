import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { initializeI18n } from '@/i18n';
import { McpServersInventory } from '@/features/targets/admin/McpServersInventory';
import { canOpenMcpServerSettings } from '@/features/targets/admin/McpServerCard';
import type { TargetToolCatalogServer } from '@/features/targets/admin/targetMcpCatalogTypes';

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

  it('keeps the inventory summary and list shell around the embedded empty state', () => {
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

    expect(markup).toContain('data-mcp-server-access-summary="true"');
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

    expect(markup).toMatch(/data-mcp-read-only-count="true"[^>]*>0</);
    expect(markup).toMatch(/data-mcp-write-capable-count="true"[^>]*>12</);
    expect(markup).toContain('0 Read · 12 Write');
  });
});
