import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { initializeI18n } from '@/i18n';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { en } from '@/i18n/locales/en.js';
import { zh } from '@/i18n/locales/zh.js';
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
  it.each([
    ['en', 'Approval depends on run permissions', 'Approval required', 'Saved effective'],
    ['zh', '是否审批取决于运行权限', '需要审批', '已保存的生效值']
  ])('keeps approval guidance and plain enabled counts in %s', async (language, approval, unconditional, saved) => {
    const i18n = createInstance();
    await i18n.init({ lng: language, resources: { en: { translation: en }, zh: { translation: zh } } });
    const markup = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <McpServerToolsDialog server={{ ...server, toolCounts: { ...server.toolCounts, enabledEffective: 200 } }} canManageTools pendingToolName={null} onClose={vi.fn()} onToggleTool={vi.fn()} />
      </I18nextProvider>
    );
    expect(markup).toContain(approval);
    expect(markup).not.toContain(`>${unconditional}<`);
    expect(markup).not.toContain(saved);
    expect(markup).toContain('>200<');
  });

  it('keeps search and group-wide controls without capability or state filters', () => {
    const markup = renderToStaticMarkup(
      <McpServerToolsDialog server={server} canManageTools pendingToolName={null} onClose={vi.fn()} onToggleTool={vi.fn()} />
    );
    expect(markup).toContain('type="search"');
    expect(markup).toContain('Search tools');
    expect(markup).not.toContain('Tool capability');
    expect(markup).not.toContain('Configured tool state');
    expect(markup).toContain('All 2 tools');
    expect(markup).toContain('All 1 tool');
  });

  it('keeps large tool collections inside a bounded scroll region', () => {
    const markup = renderToStaticMarkup(
      <McpServerToolsDialog
        server={server}
        canManageTools
        pendingToolName={null}
        onClose={vi.fn()}
        onToggleTool={vi.fn()}
      />
    );

    expect(markup).toContain('max-h-[88vh]');
    expect(markup).toContain('min-h-0 flex-1 overflow-y-auto');
  });

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

  it('allows revocation-only operators to disable but not enable tools', () => {
    const markup = renderToStaticMarkup(
      <McpServerToolsDialog
        server={server}
        canManageTools={false}
        canDisableTools
        pendingToolName={null}
        onClose={vi.fn()}
        onToggleTool={vi.fn()}
      />
    );

    expect(markup).toMatch(/aria-label="Enable all read-only tools"[^>]*disabled=""/);
    expect(markup).toMatch(/aria-label="Disable all write-capable tools"(?![^>]*disabled="")/);
    expect(markup).toMatch(/aria-label="Disable records\.list"(?![^>]*disabled="")/);
    expect(markup).toMatch(/aria-label="Enable records\.get"[^>]*disabled=""/);
  });

  it('builds overrides for every tool returned by the drained collection', () => {
    expect(getBulkConfiguredOverrides(tools, false)).toEqual({
      'records.list': false,
      'records.get': false,
      'records.update': false
    });
  });
});
