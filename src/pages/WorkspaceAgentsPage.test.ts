import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const source = (path: string) => readFileSync(resolve(root, path), 'utf8');
const page = source('src/pages/WorkspaceAgentsPage.tsx');
const catalog = source('src/pages/WorkspaceAgentsCatalog.tsx');
const drawers = source('src/pages/WorkspaceAgentsDrawers.tsx');
const workspace = source('src/pages/WorkspaceAgentDetailPanel.tsx');

describe('WorkspaceAgentsPage surface', () => {
  it('restores canonical profile tabs and legacy activity URLs', () => {
    expect(page).toContain("initialUrlSearch.get('agentTab')");
    expect(page).toContain("panel === 'activity' ? 'activity'");
    expect(page).toContain("panel: 'profile', agent: routeAgentId, agentTab: 'activity'");
    expect(page).toContain("window.addEventListener('beforeunload'");
  });

  it('uses server status rather than readiness-derived catalog state', () => {
    expect(catalog).toContain("'all' | 'active' | 'draft' | 'disabled'");
    expect(catalog).toContain('agent.status ===');
    expect(catalog).not.toContain('Needs review');
    expect(catalog).not.toContain('Needs test');
    expect(catalog).not.toContain('Ready for workflow assignment');
  });

  it('renders a ledger catalog with full-row profile navigation and independent workflow links', () => {
    expect(catalog).toContain("t('agentsWorkflows.agents.catalogHeading')");
    expect(catalog).toContain('getAgentCapabilitySummary');
    expect(catalog).toContain('<WorkflowAssignment agent={agent} />');
    expect(catalog).toContain('aria-label={t(\'agentsWorkflows.agents.openProfile\'');
    expect(catalog).toContain('className="absolute inset-0');
    expect(catalog).toContain('pointer-events-auto relative z-20');
    expect(catalog).not.toContain("['Agent', 'Status', 'Capabilities', 'Workflows']");
    expect(catalog).not.toContain('View profile');
    expect(catalog).not.toContain('Workspace agent profiles');
  });

  it('places the permission-aware create action in the route header', () => {
    expect(catalog).toContain('variant="primary"');
    expect(catalog).toContain('disabled={!canManageAgents}');
    expect(page).toContain('<WorkspaceAgentsRouteHeader');
    expect(page.indexOf('<WorkspaceAgentsRouteHeader')).toBeLessThan(page.indexOf('<WorkspaceAgentsCatalog'));
  });

  it('uses one 64rem profile workspace with four tabs', () => {
    expect(page).toContain('AgentWorkspaceDrawer');
    expect(drawers).toContain('max-w-[min(100vw,64rem)]');
    expect(workspace).toContain("['overview', 'capabilities', 'activity', 'versions']");
    expect(workspace).toContain("'Run agent'");
    expect(workspace).not.toContain('Run readiness');
  });

  it('guards edits and disables unchanged save', () => {
    expect(page).toContain("window.confirm('Discard unsaved changes?')");
    expect(page).toContain('editChangeSummary.length > 0');
    expect(drawers).toContain('editChangeSummary.length === 0');
    expect(drawers).toContain('EditAgentCapabilityPicker');
    expect(drawers).toContain('AgentCapabilityMultiSelect');
  });

  it('preserves RBAC, activity, versions, restore, and lifecycle requests', () => {
    expect(page).toContain('canManageWorkspaceAgents');
    expect(page).toContain('runWorkspaceAgent');
    expect(page).toContain('restoreAgentVersion');
    expect(page).toContain('deleteWorkspaceAgent');
    expect(workspace).toContain('Danger zone');
    expect(workspace).toContain('window.confirm(`Restore v${version.version}?');
  });

  it('consolidates recovery and keeps mutation announcements', () => {
    expect(page).toContain('Some live data is unavailable');
    expect(page).toContain('actionLabel="Retry all"');
    expect(page).toContain("aria-live={localNotice.tone === 'danger' ? 'assertive' : 'polite'}");
  });
});
