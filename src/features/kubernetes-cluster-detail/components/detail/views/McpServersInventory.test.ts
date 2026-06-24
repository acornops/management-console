import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const mcpServersInventory = readFileSync(resolve(__dirname, 'McpServersInventory.tsx'), 'utf8');
const mcpServerCard = readFileSync(resolve(__dirname, 'McpServerCard.tsx'), 'utf8');

describe('McpServersInventory table polish', () => {
  it('keeps the MCP server inventory aligned to the console table pattern', () => {
    expect(mcpServersInventory).toContain('<table className="w-full table-fixed text-left" aria-label={t(\'mcpServers.title\')}>');
    expect(mcpServersInventory).toContain('<colgroup>');
    expect(mcpServersInventory).toContain('<th scope="col"');
    expect(mcpServersInventory).toContain("{t('mcpServers.enabled')}");
    expect(mcpServersInventory).toContain('pendingToggleServerId={pendingToggleServerId}');
    expect(mcpServersInventory).toContain('onToggleServer={onToggleServer}');
    expect(mcpServerCard).toContain('<tr data-mcp-server-row="true"');
  });

  it('does not render redundant page-local navigation or inactive policy actions', () => {
    expect(mcpServersInventory).not.toContain("t('mcpServers.serversTab')");
    expect(mcpServersInventory).not.toContain("t('mcpServers.toolsTab')");
    expect(mcpServersInventory).not.toContain("t('mcpServers.toolAccessPolicy')");
  });

  it('keeps summary metrics separate and quiet', () => {
    expect(mcpServersInventory).toContain("t('mcpServers.serverInventoryTitle')");
    expect(mcpServersInventory).toContain("t('mcpServers.serverInventoryBody')");
    expect(mcpServersInventory).toContain("t('mcpServers.serversMetric')");
    expect(mcpServersInventory).toContain("t('mcpServers.enabledToolsMetric')");
    expect(mcpServersInventory).not.toContain("t('mcpServers.serverCount'");
    expect(mcpServersInventory).not.toContain("t('mcpServers.approvalRequired')");
    expect(mcpServersInventory).not.toContain("t('mcpServers.accessSummaryTitle')");
    expect(mcpServersInventory).not.toContain("t('mcpServers.accessSummaryBody')");
  });
});
