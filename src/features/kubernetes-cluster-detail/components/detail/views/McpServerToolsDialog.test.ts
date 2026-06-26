import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const mcpServerToolsDialog = readFileSync(resolve(__dirname, 'McpServerToolsDialog.tsx'), 'utf8');

describe('McpServerToolsDialog summary polish', () => {
  it('uses managed server copy instead of exposing internal control-plane URLs', () => {
    expect(mcpServerToolsDialog).toContain('const isManagedServer = isManagedMcpServer(server);');
    expect(mcpServerToolsDialog).toContain("const serverSubtitle = isManagedServer ? t('mcpServers.managedByAcornOps') : server.url");
    expect(mcpServerToolsDialog).toContain("isManagedServer ? 'type-caption mt-1 text-ui-text-muted' : 'type-code mt-1 truncate text-ui-text-muted'");
  });

  it('keeps tool summary metrics label-first like the MCP servers page summary', () => {
    expect(mcpServerToolsDialog).toContain("t('mcpServers.toolAccessSummaryTitle')");
    expect(mcpServerToolsDialog).toContain("t('mcpServers.toolAccessSummaryBody')");
    expect(mcpServerToolsDialog).toContain(
      "<p className=\"type-caption text-ui-text-muted\">{t('mcpServers.totalTools')}</p>\n" +
      "                    <p className=\"mt-0.5 text-xl font-semibold tracking-tight text-ui-text\">{server.toolCounts.total}</p>"
    );
    expect(mcpServerToolsDialog).toContain(
      "<p className=\"type-caption text-ui-text-muted\">{t('mcpServers.enabledToolsMetric')}</p>\n" +
      "                    <p className=\"mt-0.5 text-xl font-semibold tracking-tight text-ui-text\">{server.toolCounts.enabledEffective}</p>"
    );
    expect(mcpServerToolsDialog).toContain(
      "<p className=\"type-caption text-ui-text-muted\">{t('mcpServers.readOnlyTools')}</p>\n" +
      "                    <p className=\"mt-0.5 inline-flex items-center gap-2 text-xl font-semibold tracking-tight text-ui-text\">\n" +
      "                      {server.toolCounts.total - server.toolCounts.writeConfigured}\n" +
      "                      <span className=\"h-2 w-2 rounded-full bg-status-success\" />"
    );
    expect(mcpServerToolsDialog).toContain(
      "<p className=\"type-caption text-ui-text-muted\">{t('mcpServers.writeCapableTools')}</p>\n" +
      "                    <p className=\"mt-0.5 inline-flex items-center gap-2 text-xl font-semibold tracking-tight text-ui-text\">\n" +
      "                      {server.toolCounts.writeConfigured}\n" +
      "                      <span className=\"h-2 w-2 rounded-full bg-status-warning\" />"
    );
    expect(mcpServerToolsDialog).not.toContain(
      "<p className=\"text-xl font-semibold text-ui-text\">{server.toolCounts.total}</p>\n" +
      "                    <p className=\"type-caption text-ui-text-muted\">{t('mcpServers.totalTools')}</p>"
    );
  });

  it('keeps tool rows from repeating description text across columns', () => {
    expect(mcpServerToolsDialog).toContain("title={getToolLabel(tool)}>{getToolLabel(tool)}</h4>");
    expect(mcpServerToolsDialog).toContain('lg:grid-cols-[minmax(18rem,1fr)_8rem_auto]');
    expect(mcpServerToolsDialog).not.toContain('title={tool.description}>{tool.description}</p>');
  });

  it('does not duplicate enabled state with per-row success icons', () => {
    expect(mcpServerToolsDialog).not.toContain('CheckCircle2');
    expect(mcpServerToolsDialog).not.toContain('tool.enabledEffective &&');
  });

  it('shows whole-server block reasons once before the sections', () => {
    expect(mcpServerToolsDialog).toContain('const globalBlockReason = getSectionBlockReason(server.tools);');
    expect(mcpServerToolsDialog).toContain('const blockReason = globalBlockReason ? null : getSectionBlockReason(tools);');
    expect(mcpServerToolsDialog).toContain('{globalBlockReason && (');
  });

  it('keeps the tool editor open when a save fails', () => {
    expect(mcpServerToolsDialog).toContain('await onToggleTool(tool, configuredOverrides[tool.name] ?? tool.enabledConfigured);');
    expect(mcpServerToolsDialog).toContain('} catch {');
    expect(mcpServerToolsDialog).toContain('The parent owns the visible error');
    expect(mcpServerToolsDialog).toContain('{toolsError && (');
  });
});
