import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const mcpServersDialogs = readFileSync(resolve(__dirname, 'McpServersDialogs.tsx'), 'utf8');
const mcpServersView = readFileSync(resolve(__dirname, 'McpServersView.tsx'), 'utf8');
const mcpServersCatalog = readFileSync(resolve(__dirname, 'mcpServersCatalog.ts'), 'utf8');

describe('MCP server form dialog polish', () => {
  it('keeps the about panel focused on connection and tool review context', () => {
    expect(mcpServersDialogs).toContain("t('mcpServers.aboutDiscovery')");
    expect(mcpServersDialogs).toContain("t('mcpServers.aboutWriteApproval')");
    expect(mcpServersDialogs).not.toContain('aboutAdminBoundary');
  });

  it('uses a compact accessible public-header add control', () => {
    expect(mcpServersDialogs).toContain("aria-label={t('mcpServers.addHeader')}");
    expect(mcpServersDialogs).toContain("title={t('mcpServers.addHeader')}");
    expect(mcpServersDialogs).toContain('inline-flex h-8 w-8');
    expect(mcpServersDialogs).not.toContain("{t('mcpServers.addHeader')}\n              </button>");
  });

  it('validates public headers before sending the create request', () => {
    expect(mcpServersCatalog).toContain('publicHeaderNamePattern');
    expect(mcpServersCatalog).toContain('reservedPublicHeaderNames');
    expect(mcpServersCatalog).toContain('deniedPublicHeaderNames');
    expect(mcpServersCatalog).toContain('validatePublicHeaderRows');
    expect(mcpServersView).toContain('publicHeadersValidationError');
    expect(mcpServersView).toContain('!publicHeadersValidationError');
  });

  it('keeps initial tool review inside the create wizard after a successful create', () => {
    expect(mcpServersView).toContain('const createdServer = await controlPlaneApi.createTargetMcpServer');
    expect(mcpServersView).toContain('setCreateReviewServerId(createdServer.id)');
    expect(mcpServersView).toContain("createStep={createReviewServerId ? 'review' : 'configure'}");
    expect(mcpServersDialogs).toContain("import { ModalStepIndicator } from '@/components/common/ModalStepIndicator'");
    expect(mcpServersDialogs).toContain('<ModalStepIndicator steps={createSteps} currentStepId={isReviewStep ? \'review\' : \'configure\'} className="mt-4" />');
    expect(mcpServersDialogs).toContain("'mcpServers.reviewToolsAction'");
    expect(mcpServersDialogs).toContain("t('mcpServers.finish')");
    expect(mcpServersView).not.toContain('setSelectedServerId(createdServer.id)');
  });

  it('does not show the empty MCP server CTA before the catalog has resolved', () => {
    expect(mcpServersView).toContain('const showInitialCatalogLoading = !catalog && !catalogError && !hasLocalFallbackServers;');
    expect(mcpServersView).toContain('const showEmptyCatalog = Boolean(catalog) && servers.length === 0;');
    expect(mcpServersView).toContain('{showInitialCatalogLoading && (');
    expect(mcpServersView).toContain('{showEmptyCatalog && (');
    expect(mcpServersView).not.toContain('setShowCatalogLoadingNotice');
    expect(mcpServersView).not.toContain('!showInitialCatalogLoading && servers.length === 0');
  });

  it('keeps the create review sidebar compact for narrow modal space', () => {
    expect(mcpServersDialogs).toContain('rounded-lg border border-ui-border bg-ui-bg px-4 py-3');
    expect(mcpServersDialogs).toContain('flex items-center justify-between gap-4 border-b border-ui-border py-2');
    expect(mcpServersDialogs).not.toContain('grid grid-cols-3 overflow-hidden rounded-lg border border-ui-border bg-ui-bg');
  });

  it('keeps create-review summary metrics compact and label-first', () => {
    expect(mcpServersDialogs).toContain(
      "<p className=\"type-caption text-ui-text-muted\">{t('mcpServers.totalTools')}</p>\n" +
      "                    <p className=\"text-base font-semibold tracking-tight text-ui-text\">{reviewTools.length}</p>"
    );
    expect(mcpServersDialogs).toContain(
      "<p className=\"type-caption text-ui-text-muted\">{t('mcpServers.enabledToolsMetric')}</p>\n" +
      "                    <p className=\"text-base font-semibold tracking-tight text-status-success-text\">{reviewEnabledCount}</p>"
    );
    expect(mcpServersDialogs).toContain(
      "<p className=\"type-caption text-ui-text-muted\">{t('mcpServers.writeCapableTools')}</p>\n" +
      "                    <p className=\"text-base font-semibold tracking-tight text-status-warning-text\">{reviewWriteCount}</p>"
    );
    expect(mcpServersDialogs).not.toContain(
      "<p className=\"text-lg font-semibold text-ui-text\">{reviewTools.length}</p>\n" +
      "                    <p className=\"type-caption text-ui-text-muted\">{t('mcpServers.totalToolsShort')}</p>"
    );
  });

  it('does not duplicate enabled state with per-tool success icons during create review', () => {
    expect(mcpServersDialogs).not.toContain('tool.enabledEffective && <CheckCircle2');
  });

  it('patches server enablement from the inventory without editing connection details', () => {
    expect(mcpServersView).toContain('const handleToggleServer = async (server: ClusterToolCatalogServer, enabled: boolean)');
    expect(mcpServersView).toContain('const { [serverId]: _staleServerTools, ...rest } = current;');
    expect(mcpServersView).toContain('tools: activeServerTools?.items || activeServer.tools');
    expect(mcpServersView).toContain('isLoadingTools={!activeServerTools || Boolean(activeServerTools.loadingInitial)}');
    expect(mcpServersView).toContain('await controlPlaneApi.updateTargetMcpServer(activeTarget.workspaceId, activeTarget.targetId, server.id, {\n        enabled\n      });');
    expect(mcpServersView).toContain('pendingToggleServerId={pendingToggleServerId}');
    expect(mcpServersView).toContain('onToggleServer={(targetServer, enabled) => void handleToggleServer(targetServer, enabled)}');
  });

  it('keeps MCP tool save failures visible in the active tools dialog', () => {
    expect(mcpServersView).toContain("const message = formatMcpMutationError(error, 'Failed updating MCP tool.');");
    expect(mcpServersView).toContain('error: message');
    expect(mcpServersView).toContain('throw error;');
    expect(mcpServersView).toContain('void handleToggleTool(createReviewServerWithPagedTools, tool, enabled).catch(() => undefined)');
  });
});
