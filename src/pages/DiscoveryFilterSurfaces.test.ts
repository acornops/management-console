import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { clearMcpCatalogDiscoveryState } from './WorkspaceCatalogPage';

const root = resolve(__dirname, '../..');
const source = (path: string) => readFileSync(resolve(root, path), 'utf8');
const clusters = source('src/pages/KubernetesClustersPage.tsx');
const virtualMachines = source('src/pages/virtual-machines/VirtualMachinesListView.tsx');
const virtualMachinesPage = source('src/pages/VirtualMachinesPage.tsx');
const agents = source('src/pages/WorkspaceAgentsCatalog.tsx');
const agentsPage = source('src/pages/WorkspaceAgentsPage.tsx');
const workflows = source('src/pages/WorkspaceWorkflowsPage.tsx');
const workflowComponents = source('src/pages/WorkspaceWorkflowsPage.components.tsx');
const workflowSurface = `${workflows}\n${workflowComponents}`;
const workflowUrlState = source('src/pages/workflows/useWorkspaceWorkflowsUrlState.ts');
const mcpCatalog = source('src/pages/WorkspaceCatalogPage.tsx');

describe('top-level discovery surfaces', () => {
  it('uses the shared component on all five collection pages', () => {
    [clusters, virtualMachines, agents, workflowSurface, mcpCatalog].forEach((page) => {
      expect(page).toContain('<DiscoveryFilterBar');
    });
    expect(clusters).toContain('createDiscoveryFilterGroup<ClusterCatalogStatusFilter>');
    expect(virtualMachines).toContain('createDiscoveryFilterGroup<VmConnectionFilter>');
    expect(agents).toContain('createDiscoveryFilterGroup<AgentFocusFilter>');
    expect(workflowSurface).not.toContain('createDiscoveryFilterGroup');
    expect(mcpCatalog.match(/createDiscoveryFilterGroup</g)).toHaveLength(2);
  });

  it('replaces agent toggles and MCP raw search with typed shared controls', () => {
    expect(agents).not.toContain('FilterToggleGroup');
    expect(agents).toContain('count: agents.filter');
    expect(mcpCatalog).not.toContain('RefreshCw, Search');
    expect(mcpCatalog).not.toContain('<input value={routeState.q');
    expect(mcpCatalog).toContain('actions={<>');
    expect(mcpCatalog).toContain('{canSynchronize && <a href={AppPaths.workspaceMcpRegistries(workspace.id)}');
    expect(mcpCatalog).toContain('{canSynchronize && !noEnabledRegistries && (');
  });

  it('keeps result counts in the bar instead of catalog headings', () => {
    expect(agents).not.toContain('<span className="type-caption whitespace-nowrap text-ui-text-muted">{loading');
    expect(workflowComponents).not.toContain('{visibleWorkflows.length} of {workflows.length} workflows');
    expect(mcpCatalog).not.toContain('{artifacts.length} loaded</span>');
    expect(agents).toContain('resultSummary={loading ?');
    expect(workflowComponents).toContain('resultSummary={ready ?');
    expect(mcpCatalog).toContain('resultSummary={loading ?');
  });

  it('restores and clears each route-backed discovery state', () => {
    expect(agentsPage).toContain("const [query, setQuery] = useState(initialUrlSearch.get('q') || '');");
    expect(agentsPage).toContain("const initialFocus = initialUrlSearch.get('focus');");
    expect(agentsPage).toContain('updateUrlSearch({ q: null, focus: null }, { replace: true });');

    expect(workflowUrlState).toContain("options.setQuery(urlSearch.get('q') || '');");
    expect(workflows).toContain('updateUrlSearch({ q: next || null }, { replace: true });');
    expect(workflowComponents).toContain("onClearAll={() => onQueryChange('')}");

    expect(clusters).toContain('onClearAll={() => setCatalogState({})}');
    expect(virtualMachinesPage).toContain('onClearFilters={() => updateCatalogState({ q: undefined, status: undefined })}');
    expect(clusters).toContain('onChange: handleStatusChange');
    expect(virtualMachines).toContain('onChange: onStatusChange');
  });

  it('clears only MCP discovery fields and preserves route selection state', () => {
    expect(clearMcpCatalogDiscoveryState({
      q: 'github',
      source: 'registry',
      compatibility: 'compatible',
      artifact: 'artifact-a',
      destination: 'agent:agent-a'
    })).toEqual({
      artifact: 'artifact-a',
      destination: 'agent:agent-a'
    });
    expect(mcpCatalog).toContain('clearMcpCatalogDiscoveryState(routeState)');
    expect(mcpCatalog).toContain('onChange: (source) => setRouteState({ source: source || undefined })');
    expect(mcpCatalog).toContain("onChange: (compatibility) => setRouteState({ compatibility: compatibility === 'all' ? undefined : compatibility })");
  });

  it('hides genuinely empty unfiltered collections but retains active no-match recovery', () => {
    expect(clusters).toContain('controls={hasClusterInventory || hasActiveFilter ? (');
    expect(virtualMachines).toContain('(items.length > 0 || hasActiveFilter) && (');
    expect(agents).toContain('(loading || agents.length > 0 || hasActiveFilters) && (');
    expect(workflowComponents).toContain('(!ready || totalCount > 0 || Boolean(query.trim())) ? (');
    expect(mcpCatalog).toContain('(loading || artifacts.length > 0 || hasActiveDiscoveryFilters) && (');
  });
});
