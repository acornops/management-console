import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { initializeI18n } from '@/i18n';
import { McpServerFormDialog } from '@/features/targets/admin/McpServersDialogs';
import { DEFAULT_SERVER_FORM } from '@/features/targets/admin/mcpServersCatalog';
import type {
  TargetToolCatalogItem,
  TargetToolCatalogServer
} from '@/features/targets/admin/targetMcpCatalogTypes';

beforeAll(async () => {
  await initializeI18n();
});

const firstTool: TargetToolCatalogItem = {
  name: 'records.list',
  description: 'List records',
  capability: 'read',
  version: 'v1',
  source: 'mcp',
  enabledConfigured: true,
  enabledEffective: true,
  effectiveDisabledReason: null
};

const reviewServer: TargetToolCatalogServer = {
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
    total: 51,
    readOnly: 39,
    writeCapable: 12,
    enabledConfigured: 40,
    enabledEffective: 40,
    writeConfigured: 8,
    writeEffective: 8
  },
  tools: [firstTool]
};

function renderReview(overrides: Partial<React.ComponentProps<typeof McpServerFormDialog>> = {}) {
  return renderToStaticMarkup(
    <McpServerFormDialog
      mode="create"
      createStep="review"
      urlReadOnly={false}
      form={{ ...DEFAULT_SERVER_FORM }}
      mutationError={null}
      pending={false}
      isValid
      serverUrlValidationError={null}
      authHeaderValidationError={null}
      publicHeadersValidationError={null}
      reviewServer={reviewServer}
      canManageTools
      pendingToolName={null}
      onClose={vi.fn()}
      onFormChange={vi.fn()}
      onSubmit={vi.fn()}
      onFinishReview={vi.fn()}
      {...overrides}
    />
  );
}

describe('MCP server create review', () => {
  it('shows authoritative catalog totals instead of counts from the currently rendered page', () => {
    const markup = renderReview();

    expect(markup).toMatch(/Total tools<\/p><p[^>]*>51<\/p>/);
    expect(markup).toMatch(/Enabled tools<\/p><p[^>]*>40<\/p>/);
    expect(markup).toMatch(/Write-capable tools<\/p><p[^>]*>12<\/p>/);
  });

  it('keeps Finish disabled and exposes a retry when any review page fails', () => {
    const markup = renderReview({
      reviewToolsError: 'Tool page 2 could not be loaded.',
      onRetryReviewTools: vi.fn()
    });

    expect(markup).toContain('Tool page 2 could not be loaded.');
    expect(markup).toMatch(/<button[^>]*>Retry<\/button>/);
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Finish<\/button>/);
  });
});
