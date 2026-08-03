import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { initializeI18n } from '@/i18n';
import {
  getBulkConfiguredOverrides,
  McpServerToolsDialog
} from '@/features/targets/admin/McpServerToolsDialog';
import type {
  TargetToolCatalogItem,
  TargetToolCatalogServer
} from '@/features/targets/admin/targetMcpCatalogTypes';

beforeAll(async () => {
  await initializeI18n();
});

const tool = (
  name: string,
  capability: 'read' | 'write',
  enabledConfigured: boolean
): TargetToolCatalogItem => ({
  name,
  description: name,
  capability,
  version: 'v1',
  source: 'mcp',
  enabledConfigured,
  enabledEffective: enabledConfigured,
  effectiveDisabledReason: null
});

const tools = [
  tool('records.list', 'read', true),
  tool('records.get', 'read', false),
  tool('records.update', 'write', true)
];

const server: TargetToolCatalogServer = {
  id: 'records-mcp',
  name: 'Records MCP',
  url: 'https://mcp.example.com',
  type: 'mcp',
  enabled: true,
  isSystem: false,
  canDelete: true,
  canEditConnection: true,
  canToggle: true,
  authType: 'none',
  credentialMode: 'none',
  connectionStatus: 'ok',
  lastDiscoveryAt: null,
  lastDiscoveryError: null,
  toolCounts: {
    total: 3,
    readOnly: 2,
    writeCapable: 1,
    enabledConfigured: 2,
    enabledEffective: 2,
    writeConfigured: 1,
    writeEffective: 1
  },
  tools
};

describe('McpServerToolsDialog group controls', () => {
  it('offers separate accessible controls for read-only and write-capable tools', () => {
    const markup = renderToStaticMarkup(
      <McpServerToolsDialog
        server={server}
        canManageTools
        pendingToolName={null}
        onClose={vi.fn()}
        onToggleTool={vi.fn()}
      />
    );

    expect(markup).toContain('aria-label="Enable all read-only tools"');
    expect(markup).toContain('aria-label="Disable all write-capable tools"');
    expect(markup).toMatch(/aria-checked="false"[^>]*aria-label="Enable all read-only tools"/);
    expect(markup).toMatch(/aria-checked="true"[^>]*aria-label="Disable all write-capable tools"/);
  });

  it('disables group controls when the operator cannot manage tools', () => {
    const markup = renderToStaticMarkup(
      <McpServerToolsDialog
        server={server}
        canManageTools={false}
        pendingToolName={null}
        onClose={vi.fn()}
        onToggleTool={vi.fn()}
      />
    );

    expect(markup).toMatch(/aria-label="Enable all read-only tools"[^>]*disabled=""/);
    expect(markup).toMatch(/aria-label="Disable all write-capable tools"[^>]*disabled=""/);
  });

  it('builds overrides for every tool returned by the drained collection', () => {
    expect(getBulkConfiguredOverrides(tools, false)).toEqual({
      'records.list': false,
      'records.get': false,
      'records.update': false
    });
  });
});
