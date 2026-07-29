import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { initializeI18n } from '@/i18n';
import { McpServersInventory } from '@/features/targets/admin/McpServersInventory';

beforeAll(async () => {
  await initializeI18n();
});

describe('McpServersInventory', () => {
  it('keeps the inventory summary and table shell around the embedded empty state', () => {
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
    expect(markup).toContain('No MCP servers have been registered.');
    expect(markup).not.toContain('id="mcp-server-search"');
    expect(markup).not.toContain('Showing 0 of 0');
  });
});
