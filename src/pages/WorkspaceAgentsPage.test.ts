import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mapApiAgent } from './WorkspaceAgentsPage.helpers';

const root = resolve(__dirname, '../..');
const source = (path: string) => readFileSync(resolve(root, path), 'utf8');
const page = source('src/pages/WorkspaceAgentsPage.tsx');
const catalog = source('src/pages/WorkspaceAgentsCatalog.tsx');
const drawers = source('src/pages/WorkspaceAgentsDrawers.tsx');
const workspace = source('src/pages/WorkspaceAgentDetailPanel.tsx');
const componentVocabulary = source('src/components/common/ComponentVocabulary.tsx');
const inlineConfirmation = source('src/components/common/InlineConfirmation.tsx');
const capabilities = source('src/pages/agents/AgentCapabilitiesPanel.tsx');
const english = source('src/i18n/locales/en.js');
const chinese = source('src/i18n/locales/zh.js');

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
    expect(catalog).not.toContain("t('agentsWorkflows.agents.catalogHeading')");
    expect(catalog).toContain('getAgentCapabilitySummary');
    expect(catalog).toContain('<WorkflowAssignment agent={agent} />');
    expect(catalog).toContain('aria-label={t(\'agentsWorkflows.agents.openProfile\'');
    expect(catalog).toContain('className="control-target absolute inset-0');
    expect(catalog).toContain('pointer-events-auto relative z-20');
    expect(catalog).not.toContain("['Agent', 'Status', 'Capabilities', 'Workflows']");
    expect(catalog).not.toContain('View profile');
    expect(catalog).not.toContain('Workspace agent profiles');
    expect(catalog).toContain("t('common.providedByAcornOps')");
    expect(workspace).toContain("t('common.providedByAcornOps')");
    expect(catalog).toContain('isSystemProvidedAgent(agent) &&');
    expect(workspace).toContain('systemProvided &&');
    expect(catalog).toContain("t('agentsWorkflows.agents.ownerVersion'");
    expect(catalog).not.toContain('formatAgentDisplayValue(agent.origin.type)');
  });

  it('attributes template-origin Agents to the system rather than the installing user', () => {
    const agent = mapApiAgent({
      id: 'agent-system', workspaceId: 'workspace-1', name: 'Target Diagnostics',
      origin: { type: 'template', templateId: 'acornops-starter', templateVersion: 1 },
      kind: 'specialist', reviewState: 'reviewed', createdBy: 'user-1', ownerUserId: 'user-1'
    }, 'Dev User', new Map([['user-1', 'Dev User']]));

    expect(agent.owner).toBe('AcornOps');
  });

  it('keeps live catalog rows mounted while background metadata refreshes', () => {
    expect(page).toContain('const [agents, setAgents] = useState<AgentDefinition[]>([]);');
    expect(page).toContain('const [agentCatalogReady, setAgentCatalogReady] = useState(false);');
    expect(page).toContain('loading={!agentCatalogReady}');
    expect(page).toContain('const agentCatalogWorkspaceIdRef = React.useRef(workspace.id);');
    expect(page).toContain('if (agentCatalogWorkspaceIdRef.current !== workspace.id) {');
    expect(page).toContain('agentCatalogWorkspaceIdRef.current = workspace.id;');
    expect(page).toContain('setAgents(mapped);');
    expect(page).not.toContain('items.length === 0');
    expect(catalog).toContain('<CollectionState');
    expect(catalog).toContain("phase={loading ? 'loading' : 'ready'}");
  });

  it('hydrates edit drafts from live agent data and keeps deletion routes synchronized', () => {
    expect(page).toContain('shouldRefreshAgentEditDraft(editingAgent.id, current, editDraftSourceRef.current)');
    expect(page).toContain('editDraftSourceRef.current = { agentId: editingAgent.id, draft: nextDraft };');
    expect(page).toContain("updateUrlSearch({ panel: nextAgent ? 'profile' : null, agent: nextAgent?.id || null, agentTab: nextAgent ? agentTab : null }, { replace: true });");
    expect(page).toContain('const nextAgent = remainingAgents.find(isWorkspaceCatalogAgent);');
  });

  it('places the permission-aware create action in the route header', () => {
    expect(catalog).toContain('variant="primary"');
    expect(catalog).toContain('disabled={!canManageAgents}');
    expect(page).toContain('<WorkspaceAgentsRouteHeader');
    expect(page.indexOf('<WorkspaceAgentsRouteHeader')).toBeLessThan(page.indexOf('<WorkspaceAgentsCatalog'));
  });

  it('uses one 64rem profile workspace with five tabs', () => {
    expect(page).toContain('AgentWorkspaceDrawer');
    expect(drawers).toContain('max-w-[min(100vw,64rem)]');
    expect(workspace).toContain("['overview', 'capabilities', 'activity', 'versions', 'settings']");
    expect(workspace).toContain("t('agentsWorkflows.agents.details.runAgent')");
    expect(workspace).not.toContain('Run readiness');
  });

  it('reserves close-button space once in the profile header', () => {
    expect(workspace).toContain('border-b border-ui-border px-5 py-5 pr-16');
    expect(workspace).toContain('className="flex shrink-0 flex-wrap gap-2"');
    expect(workspace).not.toContain('sm:pr-8');
  });

  it('keeps profile tabs URL-backed with roving keyboard focus and stable ARIA links', () => {
    expect(workspace).toContain('<SegmentedTabs');
    expect(workspace).toContain('idBase="agent-profile"');
    expect(workspace).toContain('allPanelsMounted={false}');
    expect(workspace.match(/role="tabpanel"/g)).toHaveLength(5);
    ['overview', 'capabilities', 'activity', 'versions', 'settings'].forEach((tab) => {
      expect(workspace).toContain(`id="agent-profile-${tab}-panel"`);
      expect(workspace).toContain(`aria-labelledby="agent-profile-${tab}-tab"`);
    });
    expect(componentVocabulary).toContain('aria-controls={idBase && (allPanelsMounted || tab.isActive) ? `${idBase}-${tab.value}-panel` : undefined}');
    expect(componentVocabulary).toContain('tabIndex={tab.isActive ? 0 : -1}');
    expect(componentVocabulary).toContain("tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });");
    ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].forEach((key) => {
      expect(componentVocabulary).toContain(`event.key === '${key}'`);
    });
    expect(page).toContain("initialUrlSearch.get('agentTab')");
    expect(page).toContain('agentTab: tab');
  });

  it('guards edits and disables unchanged save', () => {
    expect(page).toContain("window.confirm('Discard unsaved changes?')");
    expect(page).toContain('editChangeSummary.length > 0');
    expect(drawers).toContain('editChangeSummary.length === 0');
    expect(drawers).toContain('workspace-owned capability ceiling is configured independently');
    expect(drawers).not.toContain('EditAgentCapabilityPicker');
    expect(workspace).toContain('<AgentCapabilitiesPanel');
    expect(workspace).toContain('agent={selectedAgent}');
    expect(workspace).toContain('const systemProvided = isSystemProvidedAgent(selectedAgent);');
    expect(workspace).toContain("t('agentsWorkflows.duplicateToEdit')");
    expect(page).toContain('isSystemProvidedAgent(editingAgent)');
    expect(drawers).not.toContain('Write tools require approval');
    expect(drawers).not.toContain('<h3 className="type-micro-label">Policy</h3>');
    expect(workspace).toContain('permissionMode.${selectedAgent.permissionMode}');
    expect(workspace).toContain("t('agentsWorkflows.agents.details.permissionModeLabel')");
    expect(workspace).toContain("t('agentsWorkflows.agents.details.approvalGateLabel')");
    expect(workspace).not.toContain('Sensitive actions');
    expect(page).not.toContain('approvalPolicy:');
  });

  it('keeps the edit-agent form body scrollable inside the drawer', () => {
    expect(drawers).toContain('className="w-full max-w-[min(100vw,64rem)]"');
    expect(drawers).toContain('className="min-h-0 flex-1 overflow-y-auto px-5 py-5 custom-scrollbar"');
    expect(drawers).toContain('className="shrink-0 border-b border-ui-border bg-ui-bg px-5 py-4"');
    expect(drawers).toContain('className="flex shrink-0 items-center justify-between gap-3 border-t border-ui-border bg-ui-bg px-5 py-4"');
  });

  it('preserves RBAC, activity, versions, restore, and lifecycle requests', () => {
    expect(page).toContain('canManageWorkspaceAgents');
    expect(page).toContain('runWorkspaceAgent');
    expect(page).toContain('restoreAgentVersion');
    expect(page).toContain('deleteWorkspaceAgent');
    expect(workspace).toContain("import { DangerZone, DangerZoneRow } from '@/components/common/DangerZone';");
    expect(workspace).toContain("{props.activeTab === 'settings' && (");
    expect(workspace).toContain('<DangerZone className="mt-4">');
    expect(workspace).toContain('tone="danger"');
    expect(workspace).toContain("'agentsWorkflows.agents.details.confirmDeleteSystem'");
    expect(workspace).toContain("t('agentsWorkflows.agents.details.deleteBlocked', { count: selectedAgent.workflowsUsingAgent.length })");
    expect(page).toContain('Array.isArray(error.details?.workflows)');
    expect(page).toContain('Remove this Agent from ${dependentWorkflows.join(\', \')} before deleting it.');
    expect(workspace).not.toContain('{!systemProvided && <DangerZone');
    expect(workspace).not.toContain('border-t border-status-danger/30');
    expect(workspace).not.toContain('window.confirm(`Restore v${version.version}?');
    expect(workspace).toContain('restoreConfirmVersionId === version.id');
    expect(workspace).toContain('<InlineConfirmation');
    expect(inlineConfirmation).toContain('role="alert"');
    expect(workspace).not.toContain('role="alertdialog"');
    expect(capabilities).not.toContain('window.prompt');
    expect(capabilities).not.toContain('window.confirm');
  });

  it('localizes the complete agent profile and formats timestamps with the active locale', () => {
    expect(workspace).toContain('const { t, i18n } = useTranslation();');
    expect(workspace).toContain("formatAgentTimestamp(selectedAgent.activity.lastRunAt, t('agentsWorkflows.agents.details.noActivity'), locale)");
    expect(workspace).not.toContain('ariaLabel="Agent profile sections"');
    expect(english).toContain("profileSections: 'Agent profile sections'");
    expect(chinese).toContain("profileSections: 'Agent 资料分区'");
    expect(english).toContain("confirmRestore: 'Confirm restore'");
    expect(chinese).toContain("confirmRestore: '确认恢复'");
  });

  it('standardizes refresh actions with the shared button and icon vocabulary', () => {
    expect(workspace.match(/<ICONS\.RefreshCw/g)).toHaveLength(2);
    expect(workspace).toContain("props.agentActivityAction === selectedAgent.id ? 'animate-spin' : ''");
    expect(workspace).toContain("props.agentVersionAction === `${selectedAgent.id}:history` ? 'animate-spin' : ''");
    expect(workspace).not.toContain('variant="tertiary" size="sm" onClick={props.onRefreshSelectedAgentVersions}');
  });

  it('consolidates recovery and keeps mutation announcements', () => {
    expect(page).toContain('Some live data is unavailable');
    expect(page).toContain('actionLabel="Retry all"');
    expect(page).toContain("aria-live={localNotice.tone === 'danger' ? 'assertive' : 'polite'}");
  });
});
