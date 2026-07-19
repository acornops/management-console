import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const source = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('destination-first MCP discovery', () => {
  it('removes the workspace Catalog destination from shared desktop and mobile navigation', () => {
    const navigation = source('src/app/workspaceNavigation.tsx');

    expect(navigation).not.toContain("id: 'catalog'");
    expect(navigation).not.toContain("path: AppPaths.workspaceCatalog(workspace.id)");
  });

  it('exposes one Add MCP action with destination-bound browsing on Agent and target surfaces', () => {
    const action = source('src/features/catalog/AddMcpServerAction.tsx');
    const agent = source('src/pages/agents/AgentCapabilitiesPanel.tsx');
    const target = source('src/features/targets/admin/McpServersViewHeader.tsx');

    expect(action).toContain('Add MCP server');
    expect(action).toContain('Browse registries');
    expect(action).toContain('Connect by URL');
    expect(action).toContain("size = 'md'");
    expect(action).toContain('size={size}');
    expect(agent).toContain("destination: `agent:${agent.id}`");
    expect(agent).toContain('size="sm"');
    expect(target).toContain("destination: `target:${target.id}`");
    expect(agent).not.toContain('Install from Catalog');
    expect(target).not.toContain('Install from Catalog');
  });

  it('keeps the destination fixed while browsing and links registry administration canonically', () => {
    const catalog = source('src/pages/WorkspaceCatalogPage.tsx');

    expect(catalog).toContain('title="Browse MCP servers"');
    expect(catalog).toContain('This destination stays fixed while you browse.');
    expect(catalog).toContain('Back to destination');
    expect(catalog).toContain('AppPaths.workspaceMcpRegistries(workspace.id)');
    expect(catalog).toContain('No MCP registries are enabled');
  });

  it('provides complete workspace registry lifecycle controls and preserves bootstrap read-only behavior', () => {
    const registries = source('src/pages/WorkspaceCatalogSources.tsx');

    expect(registries).toContain('catalogApi.updateCatalogSource');
    expect(registries).toContain('catalogApi.synchronizeCatalogSource');
    expect(registries).toContain('catalogApi.deleteCatalogSource');
    expect(registries).toContain("source.managementMode === 'workspace'");
    expect(registries).toContain('credentialEditHelp');
    expect(registries).toContain('<Plus className="h-4 w-4" aria-hidden="true" />');
    expect(registries).toContain('className="shrink-0 whitespace-nowrap"');
  });
});
