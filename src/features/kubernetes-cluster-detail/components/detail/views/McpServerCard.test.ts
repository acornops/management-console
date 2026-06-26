import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const mcpServerCard = readFileSync(resolve(__dirname, 'McpServerCard.tsx'), 'utf8');

describe('McpServerCard desktop density', () => {
  it('keeps management actions easy to find while quieting repeated secondary context', () => {
    expect(mcpServerCard).toContain('data-mcp-server-secondary-context="true"');
    expect(mcpServerCard).toContain('data-mcp-server-primary-actions="true"');
    expect(mcpServerCard).toContain("aria-label={t('mcpServers.serverActionsNamed', { name: server.name })}");
    expect(mcpServerCard).toContain('role="menu"');
    expect(mcpServerCard).toContain('role="menuitem"');
    expect(mcpServerCard).toContain("onManageTools(server.id)");
    expect(mcpServerCard).toContain("t('mcpServers.healthCheck')");
    expect(mcpServerCard).toContain('aria-describedby={healthCheckHelpId}');
    expect(mcpServerCard).toContain("t('mcpServers.healthCheckHelp')");
    expect(mcpServerCard).toContain('type-panel-title truncate');
    expect(mcpServerCard).not.toContain('line-clamp-2 break-words');
    expect(mcpServerCard).toContain("t('mcpServers.managedByAcornOps')");
    expect(mcpServerCard).toContain('const isManagedServer = isManagedMcpServer(server);');
    expect(mcpServerCard).toContain("const serverSubtitle = isManagedServer ? t('mcpServers.managedByAcornOps') : server.url");
    expect(mcpServerCard).toContain("role=\"switch\"");
    expect(mcpServerCard).toContain("onToggleServer(server, !server.enabled)");
    expect(mcpServerCard).toContain('isBlockedByOtherServerToggle');
    expect(mcpServerCard).toContain('server.canToggle');
    expect(mcpServerCard).toContain('disabled={!canEditServers || !server.canToggle}');
    expect(mcpServerCard).toContain("t('mcpServers.serverRecordMissing')");
    expect(mcpServerCard).toContain('if (!canToggleServer) return;');
    expect(mcpServerCard).toContain('transition-colors duration-200 ease-out');
    expect(mcpServerCard).toContain('transition-transform duration-200 ease-out');
    expect(mcpServerCard).toContain("server.lastDiscoveryAt");
    expect(mcpServerCard).toContain("formatDiscoveryTimestamp(server.lastDiscoveryAt)");
    expect(mcpServerCard).toContain("t('mcpServers.notChecked')");
    expect(mcpServerCard).toContain('const statusDetail = !server.canToggle');
    expect(mcpServerCard).toContain('type-caption mt-0.5 truncate');
    expect(mcpServerCard).not.toContain('line-clamp-1 text-status-danger-text');
    expect(mcpServerCard).not.toContain('line-clamp-1 text-status-warning-text');
    expect(mcpServerCard).not.toContain('disabled={!canEditServers || isTogglingServer}');
    expect(mcpServerCard).not.toContain('h-3 w-3 animate-spin');
    expect(mcpServerCard).not.toContain('canEditServers && !pendingToggleServerId');
    expect(mcpServerCard).not.toContain('detailKey');
    expect(mcpServerCard).not.toContain('serverTypeLabel');
    expect(mcpServerCard).not.toContain("t('mcpServers.builtin')");
    expect(mcpServerCard).not.toContain("t('mcpServers.remote')");
    expect(mcpServerCard).not.toContain("t('mcpServers.writeApproval')");
    expect(mcpServerCard).not.toContain("t('mcpServers.approvalRequired')");
    expect(mcpServerCard).not.toContain('grid grid-cols-3 gap-x-4 gap-y-2');
    expect(mcpServerCard).not.toContain('rounded-xl');
  });
});
