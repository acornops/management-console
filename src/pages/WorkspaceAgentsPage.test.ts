import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createDefaultAgentDefinitions,
  filterAgentDefinitions,
  getAgentAccessClass,
  getAgentCapabilitySummary,
  getAgentReadinessLabel,
  getAgentReviewSignals,
  targetScopeFromTokens,
  type AgentDefinition
} from './agents/agentModel';

const root = resolve(__dirname, '../..');
const agentsPage = [
  'src/pages/WorkspaceAgentsPage.tsx',
  'src/pages/WorkspaceAgentsPage.helpers.tsx',
  'src/pages/WorkspaceAgentsCatalog.tsx',
  'src/pages/WorkspaceAgentsDrawers.tsx',
  'src/pages/WorkspaceAgentDetailPanel.tsx'
]
  .map((filePath) => readFileSync(resolve(root, filePath), 'utf8'))
  .join('\n');

describe('WorkspaceAgentsPage model', () => {
  it('ships durable fallback agents with structured capability provenance', () => {
    const agents = createDefaultAgentDefinitions('workspace-1');

    expect(agents.map((agent) => agent.id)).toEqual([
      'agent-cluster-triage',
      'agent-release-coordinator',
      'agent-incident-reporter'
    ]);
    expect(agents.every((agent) => agent.workspaceId === 'workspace-1')).toBe(true);
    expect(agents.some((agent) => agent.providerType === 'external')).toBe(true);
    expect(agents[0].capabilities.every((capability) => capability.source)).toBe(true);
    expect(agents[0].approvalPolicy.sensitiveActions).toBe('approval_required');
  });

  it('filters agents by capability source, scope, workflow usage, and provider', () => {
    const agents = createDefaultAgentDefinitions('workspace-1');

    expect(filterAgentDefinitions(agents, 'kubernetes').map((agent) => agent.id)).toEqual(['agent-cluster-triage']);
    expect(filterAgentDefinitions(agents, 'github').map((agent) => agent.id)).toEqual(['agent-release-coordinator']);
    expect(filterAgentDefinitions(agents, 'incident pdf').map((agent) => agent.id)).toEqual(['agent-incident-reporter']);
    expect(filterAgentDefinitions(agents, 'external').map((agent) => agent.id)).toEqual(['agent-release-coordinator']);
  });

  it('summarizes derived access instead of storing a separate abstract ACL', () => {
    const agent = createDefaultAgentDefinitions('workspace-1')[0] as AgentDefinition;

    expect(getAgentCapabilitySummary(agent)).toBe('1 MCP server, 4 tools, 2 skills, approval required');
  });

  it('derives catalog decision labels from readiness and access risk', () => {
    const agents = createDefaultAgentDefinitions('workspace-1');

    expect(getAgentReadinessLabel(agents[0])).toBe('Needs review');
    expect(getAgentAccessClass(agents[0])).toBe('Kubernetes read, write blocked');
    expect(getAgentReviewSignals(agents[0])).toEqual([
      'Broad target scope',
      '1 workflow depends on this definition'
    ]);

    expect(getAgentReadinessLabel({ ...agents[1], status: 'disabled' })).toBe('Disabled');
    expect(getAgentReadinessLabel({ ...agents[2], health: { status: 'unknown', summary: 'Test run required before activation' } })).toBe('Blocked');
  });

  it('serializes editable target scope tokens into the control-plane target scope object', () => {
    expect(targetScopeFromTokens(['scope:selected_target', 'target-type:kubernetes', 'target:cluster-1'])).toEqual({
      type: 'selected_target',
      targetTypes: ['kubernetes'],
      targetIds: ['cluster-1']
    });
    expect(targetScopeFromTokens(['kubernetes:*', 'vm:prod-1'])).toEqual({
      type: 'selected_target',
      targetTypes: ['kubernetes'],
      targetIds: ['prod-1']
    });
    expect(targetScopeFromTokens(['workspace:current'])).toEqual({ type: 'workspace' });
  });
});

describe('WorkspaceAgentsPage surface', () => {
  it('uses a stable catalog with an attention layer and assignment-risk inspector', () => {
    expect(agentsPage).toContain('Review queue');
    expect(agentsPage).toContain('need attention');
    expect(agentsPage).toContain('broad target scope');
    expect(agentsPage).toContain('stale readiness');
    expect(agentsPage).toContain('disabled but referenced');
    expect(agentsPage).toContain('Agent catalog');
    expect(agentsPage).toContain('Filtering narrows this stable list; it does not reorder agents.');
    expect(agentsPage).toContain("const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');");
    expect(agentsPage).toContain('onClick={() => onReviewFilterChange(filter.value)}');
    expect(agentsPage).toContain('aria-label="Agent catalog filters"');
    expect(agentsPage).toContain('Access class');
    expect(agentsPage).toContain('Assignment risk');
    expect(agentsPage).toContain('Why this needs review');
    expect(agentsPage).toContain('Capability envelope');
    expect(agentsPage).toContain('Dependency impact');
    expect(agentsPage).toContain('More actions');
    expect(agentsPage).toContain('Run readiness test');
    expect(agentsPage).toContain('Open full profile');
    expect(agentsPage).not.toContain('Agent library');
    expect(agentsPage).not.toContain('Primary action');
    expect(agentsPage).not.toContain('Manage definition');
    expect(agentsPage).not.toContain('Operations');
    expect(agentsPage).not.toContain('Using fallback agent catalog until control-plane Agent routes are available.');
  });

  it('uses a single focused create form and keeps it permission-aware', () => {
    expect(agentsPage).toContain('Create agent');
    expect(agentsPage).toContain('Required fields');
    expect(agentsPage).toContain('Name');
    expect(agentsPage).toContain('Provider');
    expect(agentsPage).toContain('Assignment purpose');
    expect(agentsPage).toContain('Capability sources');
    expect(agentsPage).toContain('Save defaults');
    expect(agentsPage).toContain('Restricted trust');
    expect(agentsPage).toContain('Write tools require approval');
    expect(agentsPage).toContain('!createDraft.description.trim()');
    expect(agentsPage).toContain('canManageAgents');
    expect(agentsPage).toContain('createWorkspaceAgent');
    expect(agentsPage).toContain('testWorkspaceAgent');
    expect(agentsPage).toContain('You can inspect agents, but need manage_agents permission to create or change them.');
    expect(agentsPage).toContain('role="dialog"');
    expect(agentsPage).toContain('aria-describedby="create-agent-description"');
    expect(agentsPage).toContain('onKeyDown={handleCreateAgentDrawerKeyDown}');
    expect(agentsPage).toContain('Close create agent drawer');
    expect(agentsPage).not.toContain('createAgentStep');
    expect(agentsPage).not.toContain('Create agent steps');
    expect(agentsPage).not.toContain('Step 1');
    expect(agentsPage).not.toContain('Step 2');
    expect(agentsPage).not.toContain('Step 3');
    expect(agentsPage).not.toContain('AgentReviewRow');
    expect(agentsPage).not.toContain('<Dialog');
    expect(agentsPage).not.toContain('mb-6 rounded-lg border border-ui-border bg-ui-surface p-5 shadow-sm');
  });

  it('gates agent mutations on manage_agents only', () => {
    expect(agentsPage).toContain('return workspace.permissions?.manage_agents === true;');
    expect(agentsPage).toContain('disabled={!canManageAgents || testingAgentId === selectedAgent.id}');
    expect(agentsPage).not.toContain('manage_external_agents');
    expect(agentsPage).not.toContain('permissions?.manage_mcp');
  });

  it('lets managers edit existing agents with a change review before save', () => {
    expect(agentsPage).toContain('updateAgent as updateWorkspaceAgent');
    expect(agentsPage).toContain('Edit agent');
    expect(agentsPage).toContain('openEditAgentDrawer');
    expect(agentsPage).toContain('saveAgentEdits');
    expect(agentsPage).toContain('disabled={!canManageAgents || updatingAgentId === selectedAgent.id}');
    expect(agentsPage).toContain('Changes before save');
    expect(agentsPage).toContain('getAgentEditChangeSummary');
    expect(agentsPage).toContain('Capability sources changed');
    expect(agentsPage).toContain('Target scope changed');
    expect(agentsPage).toContain('Context access changed');
    expect(agentsPage).toContain('Agent updated. Review affected workflows before the next run.');
    expect(agentsPage).toContain('aria-describedby="edit-agent-description"');
  });

  it('lets managers transfer agent ownership from workspace members', () => {
    expect(agentsPage).toContain('controlPlaneApi.listWorkspaceMembers');
    expect(agentsPage).toContain('ProjectMember');
    expect(agentsPage).toContain('ownerUserId');
    expect(agentsPage).toContain('ownerUserOptions');
    expect(agentsPage).toContain('Agent owner');
    expect(agentsPage).toContain('Only loaded workspace members are available for owner transfer.');
    expect(agentsPage).toContain('Owner changed');
    expect(agentsPage).toContain('ownerUserId: editDraft.ownerUserId.trim() || undefined');
  });

  it('uses server-owned capability options instead of making managers guess ids', () => {
    expect(agentsPage).toContain('listWorkflowOptions');
    expect(agentsPage).toContain('type WorkflowOptionsCatalog');
    expect(agentsPage).toContain('createFallbackAgentCapabilityOptions');
    expect(agentsPage).toContain('normalizeAgentCapabilityOptions');
    expect(agentsPage).toContain('agentCapabilityOptions');
    expect(agentsPage).toContain('AgentCapabilityOptionButtons');
    expect(agentsPage).toContain('Capability catalog');
    expect(agentsPage).toContain('Capability catalog did not load; fields show IDs already attached to these agents.');
    expect(agentsPage).toContain("appendUniqueToken(current, value)");
    expect(agentsPage).toContain("setEditDraft((draft) => draft && ({ ...draft, tools: appendUniqueToken(draft.tools, value) }))");
  });

  it('manages agent versions, activity, and triggers through existing agent routes', () => {
    expect(agentsPage).toContain('createAgentVersion as createWorkspaceAgentVersion');
    expect(agentsPage).toContain('listAgentVersions');
    expect(agentsPage).toContain('restoreAgentVersion');
    expect(agentsPage).toContain('listAgentActivity');
    expect(agentsPage).toContain('createAgentTrigger');
    expect(agentsPage).toContain('updateAgentTrigger');
    expect(agentsPage).toContain('deleteAgentTrigger');
    expect(agentsPage).toContain('saveSelectedAgentVersion');
    expect(agentsPage).toContain('refreshSelectedAgentVersions');
    expect(agentsPage).toContain('restoreSelectedAgentVersion');
    expect(agentsPage).toContain('refreshSelectedAgentActivity');
    expect(agentsPage).toContain('createManualTrigger');
    expect(agentsPage).toContain('toggleAgentTrigger');
    expect(agentsPage).toContain('deleteAgentTriggerForSelectedAgent');
    expect(agentsPage).toContain('Save version');
    expect(agentsPage).toContain('Version history');
    expect(agentsPage).toContain('Refresh versions');
    expect(agentsPage).toContain('Restore');
    expect(agentsPage).toContain('Refresh activity');
    expect(agentsPage).toContain('Add manual trigger');
    expect(agentsPage).toContain('Version snapshot saved as v${version.version}.');
    expect(agentsPage).toContain('Recent activity refreshed.');
    expect(agentsPage).toContain('Trigger enabled for this agent.');
    expect(agentsPage).toContain('Trigger deleted. Workflow assignments were not changed.');
  });

  it('requires managers to label manual triggers before creation', () => {
    expect(agentsPage).toContain('newManualTriggerName');
    expect(agentsPage).toContain('Manual trigger label');
    expect(agentsPage).toContain("newManualTriggerName.trim() || 'Manual run'");
    expect(agentsPage).toContain("name: newManualTriggerName.trim() || 'Manual run'");
    expect(agentsPage).toContain("setNewManualTriggerName('')");
  });

  it('lets managers add scheduled triggers through the existing trigger route', () => {
    expect(agentsPage).toContain('newScheduleTriggerName');
    expect(agentsPage).toContain('newScheduleTriggerCron');
    expect(agentsPage).toContain('newScheduleTriggerTimezone');
    expect(agentsPage).toContain('createScheduleTrigger');
    expect(agentsPage).toContain("type: 'schedule'");
    expect(agentsPage).toContain("schedule: { cron: newScheduleTriggerCron.trim(), timezone: newScheduleTriggerTimezone.trim() || 'UTC' }");
    expect(agentsPage).toContain('Scheduled trigger label');
    expect(agentsPage).toContain('Cron schedule');
    expect(agentsPage).toContain('Timezone');
    expect(agentsPage).toContain('Add scheduled trigger');
  });

  it('lets managers add event and webhook triggers with a JSON filter', () => {
    expect(agentsPage).toContain('eventTriggerTypeOptions');
    expect(agentsPage).toContain('newEventTriggerType');
    expect(agentsPage).toContain('newEventTriggerFilter');
    expect(agentsPage).toContain('createEventTrigger');
    expect(agentsPage).toContain('JSON.parse(newEventTriggerFilter)');
    expect(agentsPage).toContain('Event trigger label');
    expect(agentsPage).toContain('Event type');
    expect(agentsPage).toContain('Event filter JSON');
    expect(agentsPage).toContain('Add event trigger');
    expect(agentsPage).toContain('Event filter must be a JSON object, for example {"eventType":"deployment.completed"}.');
  });

  it('surfaces an activation checklist for high-stakes assignment decisions', () => {
    expect(agentsPage).toContain('AgentActivationChecklist');
    expect(agentsPage).toContain('Activation checklist');
    expect(agentsPage).toContain('Agent status is active');
    expect(agentsPage).toContain('Health check is healthy');
    expect(agentsPage).toContain('Target and context scope reviewed');
    expect(agentsPage).toContain('Write actions require approval');
    expect(agentsPage).toContain('Workflow impact checked');
    expect(agentsPage).toContain('Run readiness test before launch');
  });

  it('shows the server-compiled readiness scope after agent tests', () => {
    expect(agentsPage).toContain('agentCompiledScopePreviews');
    expect(agentsPage).toContain('result.compiledScope');
    expect(agentsPage).toContain('Compiled scope preview');
    expect(agentsPage).toContain('Server-compiled access from the latest readiness test.');
    expect(agentsPage).toContain('JSON.stringify(selectedCompiledScopePreview, null, 2)');
  });

  it('requires deliberate lifecycle changes for agents assigned to workflows', () => {
    expect(agentsPage).toContain('disableSelectedAgent');
    expect(agentsPage).toContain('reactivateSelectedAgent');
    expect(agentsPage).toContain('deleteSelectedAgent');
    expect(agentsPage).toContain('deleteWorkspaceAgent');
    expect(agentsPage).toContain('disableConfirmAgentId');
    expect(agentsPage).toContain('deleteConfirmAgentId');
    expect(agentsPage).toContain('Disable agent');
    expect(agentsPage).toContain('Confirm disable');
    expect(agentsPage).toContain('Reactivate agent');
    expect(agentsPage).toContain("selectedAgent.source === 'user'");
    expect(agentsPage).toContain('Remove this agent from workflows before deleting it.');
    expect(agentsPage).toContain('Confirm delete');
    expect(agentsPage).toContain('Agent deleted. Workflow assignments were not changed.');
    expect(agentsPage).toContain('Affected workflows');
    expect(agentsPage).toContain('This agent is assigned to {selectedAgent.workflowsUsingAgent.length} workflows. Those workflows may fail or need reassignment while it is disabled.');
    expect(agentsPage).toContain("listWorkspaceAgents(workspace.id, { includeInactive: true })");
    expect(agentsPage).toContain('Agent disabled. Existing workflow assignments still reference it until you update them.');
    expect(agentsPage).toContain('Agent reactivated. Run readiness before assigning it to new workflows.');
    expect(agentsPage).not.toContain("{ value: 'paused', label: 'Paused' }");
    expect(agentsPage).not.toContain("{ value: 'error', label: 'Error' }");
  });

  it('uses severity-specific notices for agent mutations and tests', () => {
    expect(agentsPage).toContain("type LocalNotice = { tone: 'success' | 'danger'; message: string }");
    expect(agentsPage).toContain("setLocalNotice({ tone: 'success'");
    expect(agentsPage).toContain("setLocalNotice({ tone: 'danger'");
    expect(agentsPage).toContain("localNotice.tone === 'danger'");
    expect(agentsPage).toContain('border-status-danger/30 bg-status-danger-soft text-status-danger-text');
    expect(agentsPage).toContain('border-status-success/30 bg-status-success-soft text-status-success-text');
    expect(agentsPage).not.toContain('setLocalNotice(error instanceof Error ? error.message');
  });

  it('clarifies agent assignment readiness copy and recovery actions', () => {
    expect(agentsPage).toContain("Compare each agent's capability sources, target scope, and workflow impact before changing automation access.");
    expect(agentsPage).toContain('placeholder="Search by agent, tool, skill, scope, provider"');
    expect(agentsPage).toContain('Control-plane agents did not load, so this page is showing the local catalog. Retry after control-plane access is restored.');
    expect(agentsPage).toContain('You can inspect agents, but need manage_agents permission to create or change them.');
    expect(agentsPage).toContain('Name the agent and its assignment purpose. It saves with restricted trust and approval required for write tools.');
    expect(agentsPage).toContain('Assignment purpose');
    expect(agentsPage).toContain('Capability sources');
    expect(agentsPage).toContain('Run readiness test');
    expect(agentsPage).toContain('Readiness test queued for ${selectedAgent.name}. Check recent activity for ${result.activity.id}.');
    expect(agentsPage).toContain('Agent saved with restricted trust and approval required for write tools.');
    expect(agentsPage).toContain('No agents match. Search by agent name, tool, skill, scope, or provider.');
  });

  it('places assignment readiness before dense agent detail panels', () => {
    expect(agentsPage).toContain('Assignment risk');
    expect(agentsPage).toContain('Why this needs review');
    expect(agentsPage).toContain('Capability envelope');
    expect(agentsPage).toContain('Dependency impact');
    expect(agentsPage).toContain('Open full profile');
    expect(agentsPage.indexOf('Assignment risk')).toBeLessThan(
      agentsPage.indexOf('className="grid gap-5 bg-ui-bg/45 p-4 sm:p-5')
    );
  });

  it('removes duplicate agent header facts already covered by readiness', () => {
    expect(agentsPage).not.toContain('Owner: {selectedAgent.owner}');
    expect(agentsPage).not.toContain('Version: v{selectedAgent.version}');
    expect(agentsPage).not.toContain('{selectedAgent.health.summary}');
    expect(agentsPage).not.toContain('h-12 w-12 shrink-0');
  });

  it('keeps agent readiness compact and registry-like instead of launch-panel-like', () => {
    expect(agentsPage).toContain('Review queue');
    expect(agentsPage).toContain('Agent catalog');
    expect(agentsPage).toContain('More actions');
    expect(agentsPage).not.toContain('<h3 className="mt-3 type-panel-title">Assignment readiness</h3>');
    expect(agentsPage).not.toContain('Agent registry summary');
  });

  it('uses the same uncluttered library and detail chrome as workflows', () => {
    expect(agentsPage).toContain('placeholder="Search by agent, tool, skill, scope, provider"');
    expect(agentsPage).toContain('{visibleAgents.length} of {agents.length} agents');
    expect(agentsPage).toContain('className="min-w-0 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm xl:sticky xl:top-6"');
    expect(agentsPage).toContain('className="grid gap-5 bg-ui-bg/45 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.85fr)]"');
    expect(agentsPage).toContain('Profile tools');
    expect(agentsPage).not.toContain('<section className="rounded-lg border border-ui-border bg-ui-surface p-4">');
  });

  it('uses the shared warning treatment for fallback catalog errors', () => {
    expect(agentsPage).toContain('Control-plane agents did not load, so this page is showing the local catalog.');
    expect(agentsPage).toContain('border-status-warning/30 bg-status-warning-soft px-3 py-2 text-xs font-semibold text-status-warning-text');
    expect(agentsPage).not.toContain('agentLoadError && (\n        <div className="mb-4 whitespace-normal break-words rounded-md border border-ui-border bg-ui-surface');
  });

  it('keeps typography and action colors aligned with the workflow surface', () => {
    expect(agentsPage).toContain('<h2 className="mt-3 type-section-title">{selectedAgent.name}</h2>');
    expect(agentsPage).not.toContain('text-2xl font-semibold tracking-normal');
    expect(agentsPage).not.toContain('variant="accent"');
  });

  it('formats enum badges as polished labels instead of raw lowercase values', () => {
    expect(agentsPage).toContain('formatAgentDisplayValue');
    expect(agentsPage).toContain('formatPolicyValue');
    expect(agentsPage).toContain('formatAgentDisplayValue(agent.approvalPolicy.writeActions)');
    expect(agentsPage).toContain("formatAgentDisplayValue(trigger.enabled ? 'enabled' : 'disabled')");
    expect(agentsPage).toContain('const formatPolicyValue = (value: string): string => formatAgentDisplayValue(value);');
    expect(agentsPage).toContain("formatPolicyValue(agent.approvalPolicy.writeActions)");
    expect(agentsPage).not.toContain('>{selectedAgent.status}</StatusBadge>');
    expect(agentsPage).not.toContain('>{selectedAgent.providerType}</StatusBadge>');
    expect(agentsPage).not.toContain('>{selectedAgent.health.status}</StatusBadge>');
  });

  it('keeps the route wrapper inside the app shell on mobile', () => {
    expect(agentsPage).toContain('className="min-h-0 w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar sm:px-6 lg:px-10 lg:py-8"');
    expect(agentsPage).not.toContain('w-[100vw] max-w-[100vw]');
  });
});
