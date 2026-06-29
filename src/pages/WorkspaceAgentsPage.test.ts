import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createDefaultAgentDefinitions,
  filterAgentDefinitions,
  getAgentAccessClass,
  getAgentActivitySummary,
  getAgentCapabilitySummary,
  getAgentDecisionSummary,
  getAgentNextActionLabel,
  getAgentReadinessLabel,
  getAgentReviewSignals,
  targetScopeFromTokens,
  type AgentDefinition
} from './agents/agentModel';
import { formatUserDateTime } from '@/utils/dateTime';

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
const componentVocabulary = readFileSync(resolve(root, 'src/components/common/ComponentVocabulary.tsx'), 'utf8');

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

  it('derives catalog decision labels from actionable readiness and access risk', () => {
    const agents = createDefaultAgentDefinitions('workspace-1');

    expect(getAgentReadinessLabel(agents[0])).toBe('Action needed');
    expect(getAgentAccessClass(agents[0])).toBe('Kubernetes read, write blocked');
    expect(getAgentReviewSignals(agents[0])).toEqual(['Broad target scope']);

    expect(getAgentReadinessLabel({
      ...agents[0],
      targetScope: ['kubernetes:prod-cluster'],
      workflowsUsingAgent: ['Cluster triage']
    })).toBe('Ready');

    expect(getAgentReadinessLabel({ ...agents[1], status: 'disabled' })).toBe('Disabled');
    expect(getAgentReadinessLabel({ ...agents[2], health: { status: 'unknown', summary: 'Test run required before activation' } })).toBe('Blocked');
  });

  it('summarizes the default agents by job, access, and current blocker', () => {
    const agents = createDefaultAgentDefinitions('workspace-1');

    expect(getAgentDecisionSummary(agents[0]).line).toBe('Cluster triage · read-only · broad scope');
    expect(getAgentDecisionSummary(agents[1]).line).toBe('Repository operation · write approval required · token review due');
    expect(getAgentDecisionSummary(agents[2]).line).toBe('Incident report PDF · selected chats only · test required');
  });

  it('summarizes recent run evidence without expanding capability details', () => {
    const agents = createDefaultAgentDefinitions('workspace-1');

    expect(getAgentActivitySummary(agents[0]).line).toBe('Last run: Today 09:12 · completed');
    expect(getAgentActivitySummary(agents[1]).line).toBe('Last run: Yesterday 15:30 · failed');
    expect(getAgentActivitySummary(agents[2]).line).toBe('No runs yet');
    expect(getAgentActivitySummary({
      ...agents[1],
      activity: { runCount: 8, lastRunAt: '2026-06-29T13:35:01.238Z', lastStatus: 'queued' }
    }).line).toBe(`Last run: ${formatUserDateTime('2026-06-29T13:35:01.238Z')} · queued`);
  });

  it('chooses one next action for the selected agent summary', () => {
    const agents = createDefaultAgentDefinitions('workspace-1');

    expect(getAgentNextActionLabel(agents[0])).toBe('Review access');
    expect(getAgentNextActionLabel(agents[2])).toBe('Run readiness test');
    expect(getAgentNextActionLabel({
      ...agents[0],
      targetScope: ['kubernetes:prod-cluster'],
      workflowsUsingAgent: ['Cluster triage']
    })).toBe('Open details');
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
    expect(agentsPage).toContain('Create or select agents by job, access, and current blocker.');
    expect(agentsPage).toContain('type-body mt-3 max-w-none break-words text-ui-text-muted');
    expect(agentsPage).toContain('Review queue');
    expect(agentsPage).toContain('agents need action');
    expect(agentsPage).toContain('Fix stale tests, risky scope, or ungated write access before assignment.');
    expect(agentsPage).toContain('border-status-warning/35 bg-status-warning-soft/70');
    expect(agentsPage).toContain('broad scope');
    expect(agentsPage).toContain('stale tests');
    expect(agentsPage).toContain('in use');
    expect(agentsPage).not.toContain('{reviewQueue.agentsNeedingAttention} need attention');
    expect(agentsPage).toContain('Agent assignment');
    expect(agentsPage).toContain('Scan what each agent does, whether it can write or expose data, and what blocks safe use.');
    expect(agentsPage).toContain('getAgentActivitySummary');
    expect(agentsPage).toContain('activitySummary.line');
    expect(agentsPage).toContain('View activity');
    expect(agentsPage).toContain('Workflow:</span>');
    expect(agentsPage).toContain('Last Run:</span>');
    expect(agentsPage).not.toContain('Work:</span>');
    expect(agentsPage).toContain('const [catalogFilters, setCatalogFilters] = useState<AgentCatalogFilters>(defaultAgentCatalogFilters);');
    expect(agentsPage).toContain("const [expandedAgentId, setExpandedAgentId] = useState('');");
    expect(agentsPage).toContain('onCatalogFiltersChange={setCatalogFilters}');
    expect(agentsPage).toContain('aria-label="Agent catalog filters"');
    expect(agentsPage).toContain('Focus');
    expect(agentsPage).toContain('Agent focus filter');
    expect(agentsPage).not.toContain('Assignment fit');
    expect(agentsPage).not.toContain('Capability surface');
    expect(agentsPage).not.toContain('Safety filter');
    expect(agentsPage).toContain('Ready');
    expect(agentsPage).toContain('Action needed');
    expect(agentsPage).toContain('In use');
    expect(agentsPage).toContain('Available');
    expect(agentsPage).toContain('Broad scope');
    expect(agentsPage).toContain('Write gated');
    expect(agentsPage).not.toContain('Has MCP');
    expect(agentsPage).toContain('Clear filters');
    expect(agentsPage).toContain('hasActiveAgentCatalogFilters');
    expect(agentsPage).not.toContain('reviewFilters.map');
    expect(agentsPage).not.toContain('MCP connected');
    expect(agentsPage).not.toContain('Capability groups');
    expect(agentsPage).not.toContain('Workflow usage');
    expect(agentsPage).not.toContain('CapabilityPreviewGroup');
    expect(agentsPage).toContain('getAgentReadinessReason');
    expect(agentsPage).not.toContain('getAgentCapabilityGroups');
    expect(agentsPage).not.toContain('getAgentWorkflowUsageSummary');
    expect(agentsPage).toContain('{readiness}</StatusBadge>');
    expect(agentsPage).toContain('Capabilities');
    expect(agentsPage).toContain('Assignment checks');
    expect(agentsPage).toContain('Targets');
    expect(agentsPage).toContain('Data available');
    expect(agentsPage).toContain('Approvals');
    expect(agentsPage).toContain('Workflows');
    expect(agentsPage).toContain('All Kubernetes clusters');
    expect(agentsPage).toContain('Workspace metadata');
    expect(agentsPage).toContain('Target inventory');
    expect(agentsPage).toContain('Selected chat sessions');
    expect(agentsPage).toContain('Current workspace');
    expect(agentsPage).toContain('Write actions blocked; sensitive actions require approval');
    expect(agentsPage).toContain('Sensitive and write actions require approval');
    expect(agentsPage).not.toContain('Target access');
    expect(agentsPage).not.toContain('Context access');
    expect(agentsPage).not.toContain('Approval gates');
    expect(agentsPage).not.toContain('approval gate');
    expect(agentsPage).not.toContain('Write access:');
    expect(agentsPage).toContain('aria-expanded={expanded}');
    expect(agentsPage).toContain('Run readiness');
    expect(agentsPage).toContain('Manage');
    expect(agentsPage).not.toContain('Profile</div>');
    expect(agentsPage).toContain('Manage agent');
    expect(agentsPage).not.toContain('More actions');
    expect(agentsPage).not.toContain('Access, triggers, and history');
    expect(agentsPage).not.toContain('Agent library');
    expect(agentsPage).not.toContain('Primary action');
    expect(agentsPage).not.toContain('Manage definition');
    expect(agentsPage).not.toContain('Operations');
    expect(agentsPage).not.toContain('Using fallback agent catalog until control-plane Agent routes are available.');
  });

  it('uses a single focused create form and keeps it permission-aware', () => {
    expect(agentsPage).toContain('Create agent');
    expect(agentsPage).toContain('Name the agent and its assignment purpose.');
    expect(agentsPage).toContain('Name');
    expect(agentsPage).toContain('Provider');
    expect(agentsPage).toContain('Assignment purpose');
    expect(agentsPage).toContain("import { ModalStepIndicator } from '@/components/common/ModalStepIndicator';");
    expect(agentsPage).toContain('Create agent steps');
    expect(agentsPage).toContain('createAgentStep');
    expect(agentsPage).toContain('steps={createAgentSteps}');
    expect(agentsPage).toContain('onStepSelect={(stepId) => goToCreateAgentStep(Number(stepId) as CreateAgentStep)}');
    expect(agentsPage).toContain('Step 1 is not done. Enter an agent name and assignment purpose before continuing.');
    expect(agentsPage).toContain('role="status" aria-live="polite"');
    expect(agentsPage).toContain('value={createDraft.name}');
    expect(agentsPage).toContain('value={createDraft.description}');
    expect(agentsPage).toContain('placeholder="Triage Kubernetes incidents and summarize safe next steps"');
    expect(agentsPage).toContain('Capabilities');
    expect(agentsPage).toContain('Review');
    expect(agentsPage).toContain('Restricted trust');
    expect(agentsPage).toContain('Write tools require approval');
    expect(agentsPage).toContain('!createDraft.description.trim()');
    expect(agentsPage).toContain('canManageAgents');
    expect(agentsPage).toContain('createWorkspaceAgent');
    expect(agentsPage).toContain('testWorkspaceAgent');
    expect(agentsPage).toContain('You can inspect agents, but need manage_agents permission to create or change them.');
    expect(agentsPage).toContain('<RightSidePanel');
    expect(agentsPage).toContain('descriptionId="create-agent-description"');
    expect(agentsPage).toContain('<CloseButton onClick={close} label="Close create agent drawer"');
    expect(agentsPage).toContain('Close create agent drawer');
    expect(agentsPage).not.toContain('Step 2');
    expect(agentsPage).not.toContain('Step 3');
    expect(agentsPage).toContain('AgentCreateReviewRow');
    expect(agentsPage).not.toContain('<Dialog');
    expect(agentsPage).not.toContain('mb-6 rounded-lg border border-ui-border bg-ui-surface p-5 shadow-sm');
  });

  it('gates agent mutations on manage_agents only', () => {
    expect(agentsPage).toContain('return workspace.permissions?.manage_agents === true;');
    expect(agentsPage).toContain('disabled={!canManageAgents || updatingAgentId === selectedAgent.id}');
    expect(agentsPage).not.toContain('manage_external_agents');
    expect(agentsPage).not.toContain('permissions?.manage_mcp');
  });

  it('lets managers edit existing agents with a change review before save', () => {
    expect(agentsPage).toContain('updateAgent as updateWorkspaceAgent');
    expect(agentsPage).toContain('Edit agent');
    expect(agentsPage).toContain('openEditAgentDrawer');
    expect(agentsPage).toContain('onEditAgent={openEditAgentDrawer}');
    expect(agentsPage).toContain('onEditAgent: (agent: AgentDefinition) => void;');
    expect(agentsPage).toContain('<Button type="button" variant="secondary" size="sm" onClick={() => onEditAgent(agent)} disabled={!canManageAgents}>');
    expect(agentsPage).toContain('value={editDraft.name} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, name: event.target.value }))} className="mt-2"');
    expect(agentsPage).toContain('value={editDraft.description} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, description: event.target.value }))} className="mt-2"');
    expect(agentsPage).toContain('saveAgentEdits');
    expect(agentsPage).toContain('disabled={!canManageAgents || updatingAgentId === selectedAgent.id}');
    expect(agentsPage).toContain('Changes before save');
    expect(agentsPage).toContain('getAgentEditChangeSummary');
    expect(agentsPage).toContain('Capability sources changed');
    expect(agentsPage).toContain('Targets changed');
    expect(agentsPage).toContain('Data sources changed');
    expect(agentsPage).toContain('Agent updated. Review affected workflows before the next run.');
    expect(agentsPage).toContain('descriptionId="edit-agent-description"');
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
    expect(agentsPage).toContain('Save snapshot');
    expect(agentsPage).toContain('Version history');
    expect(agentsPage).toContain('>Refresh</Button>');
    expect(agentsPage).toContain('Restore');
    expect(agentsPage).toContain('Refresh activity');
    expect(agentsPage).toContain('Add manual trigger');
    expect(agentsPage).toContain('Version snapshot saved as v${version.version}.');
    expect(agentsPage).toContain('Recent activity refreshed.');
    expect(agentsPage).toContain('Trigger enabled for this agent.');
    expect(agentsPage).toContain('Trigger deleted. Workflow assignments were not changed.');
  });

  it('opens activity as a run-style list instead of the management detail drawer', () => {
    expect(agentsPage).toContain('AgentActivityDrawer');
    expect(agentsPage).toContain('const [activityPanelOpen, setActivityPanelOpen] = useState(false);');
    expect(agentsPage).toContain('onOpenActivity={openAgentActivity}');
    expect(agentsPage).toContain('onOpenManagement={openAgentManagement}');
    expect(agentsPage).toContain('Agent activity');
    expect(agentsPage).toContain('Run history');
    expect(agentsPage).toContain('Close agent activity');
    expect(agentsPage).toContain('onRefreshActivity');
    expect(agentsPage).toContain('View activity');
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
    expect(agentsPage).toContain("schedule: { cron: newScheduleTriggerCron.trim(), timezone: newScheduleTriggerTimezone.trim() || getUserTimeZone() }");
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

  it('keeps agent profile details focused instead of showing a permanent activation checklist', () => {
    expect(agentsPage).not.toContain('AgentActivationChecklist');
    expect(agentsPage).not.toContain('Activation checklist');
    expect(agentsPage).not.toContain('Agent status is active');
    expect(agentsPage).not.toContain('Health check is healthy');
    expect(agentsPage).not.toContain('Target and context scope reviewed');
    expect(agentsPage).not.toContain('Workflow impact checked');
    expect(agentsPage).not.toContain('Run readiness test before launch');
    expect(agentsPage).toContain('Can this agent run safely?');
    expect(agentsPage).toContain('Before assignment');
    expect(agentsPage).toContain('No blockers before assignment');
    expect(agentsPage).toContain('Assignment impact');
    expect(agentsPage).toContain('Access evidence');
    expect(agentsPage).toContain('decisionSummary.line');
    expect(agentsPage).toContain('nextActionLabel');
    expect(agentsPage).not.toContain('actionLabelFor');
    expect(agentsPage).not.toContain('runActionFor');
    expect(agentsPage).not.toContain('Actions before assignment');
    expect(agentsPage).not.toContain('Allowed access');
    expect(agentsPage).not.toContain('Workflow impact');
  });

  it('shows the server-compiled readiness scope after agent tests', () => {
    expect(agentsPage).toContain('agentCompiledScopePreviews');
    expect(agentsPage).toContain('result.compiledScope');
    expect(agentsPage).toContain('Readiness scope preview');
    expect(agentsPage).toContain('Access returned by the last readiness test.');
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
    expect(agentsPage).toContain("role={localNotice.tone === 'danger' ? 'alert' : 'status'}");
    expect(agentsPage).toContain("aria-live={localNotice.tone === 'danger' ? 'assertive' : 'polite'}");
    expect(agentsPage).toContain('aria-atomic="true"');
    expect(agentsPage).toContain('border-status-danger/30 bg-status-danger-soft text-status-danger-text');
    expect(agentsPage).toContain('border-status-success/30 bg-status-success-soft text-status-success-text');
    expect(agentsPage).not.toContain('setLocalNotice(error instanceof Error ? error.message');
  });

  it('clarifies agent assignment readiness copy and recovery actions', () => {
    expect(agentsPage).toContain('Create or select agents by job, access, and current blocker.');
    expect(agentsPage).toContain('placeholder="Search agents, workflows, tools, scope"');
    expect(agentsPage).toContain('Control-plane agents did not load, so this page is showing the local catalog. Retry after control-plane access is restored.');
    expect(agentsPage).toContain('You can inspect agents, but need manage_agents permission to create or change them.');
    expect(agentsPage).toContain('Name the agent and its assignment purpose. It saves with restricted trust and approval required for write tools.');
    expect(agentsPage).toContain('Assignment purpose');
    expect(agentsPage).toContain('Capability sources');
    expect(agentsPage).toContain('Run readiness');
    expect(agentsPage).toContain('Readiness test queued for ${agentToTest.name}. Check recent activity for ${result.activity.id}.');
    expect(agentsPage).toContain('Agent saved with restricted trust and approval required for write tools.');
    expect(agentsPage).toContain('No agents match. Search by agent name, workflow, tool, skill, or scope.');
  });

  it('uses expandable assignment rows before dense agent detail panels', () => {
    expect(agentsPage).toContain('{readiness}</StatusBadge>');
    expect(agentsPage).toContain('Capabilities');
    expect(agentsPage).toContain('Assignment checks');
    expect(agentsPage).toContain('Recent activity');
    expect(agentsPage).toContain('Manage');
    expect(agentsPage).not.toContain('Profile</div>');
    expect(agentsPage.indexOf('Capabilities')).toBeLessThan(
      agentsPage.indexOf('Workflow controls')
    );
  });

  it('keeps collapsed agent rows free of extra action buttons', () => {
    expect(agentsPage).toContain('type="button"');
    expect(agentsPage).toContain("aria-expanded={expanded}");
    expect(agentsPage).toContain('aria-controls={`agent-assignment-detail-${agent.id}`}');
    expect(agentsPage).toContain("className={`${catalogGridClass} group w-full cursor-pointer text-left transition-colors");
    expect(agentsPage).toContain('useReducedMotion');
    expect(agentsPage).toContain('animate={shouldReduceMotion ? { rotate: 0 } : { rotate: expanded ? 180 : 0 }}');
    expect(agentsPage).toContain('<ICONS.ChevronDown className="h-4 w-4" />');
    expect(agentsPage).not.toContain('<ICONS.BookOpen className="h-4 w-4" />');
    expect(agentsPage).not.toContain('Profile</div>');
    expect(agentsPage).not.toContain('Actions for ${agent.name}');
    expect(agentsPage).not.toContain('Full profile');
    expect(agentsPage).not.toContain('Open full profile');
    expect(agentsPage).not.toContain('variant="tertiary"\n                      size="sm"\n                      onClick={() => {\n                        onSelectedAgentChange(agent.id);\n                        onExpandedAgentChange(expanded ? \'\' : agent.id);\n                      }}');
    expect(agentsPage).not.toContain('<Button type="button" variant="tertiary" size="sm" onClick={() => onOpenDetails(agent)}>');
  });

  it('keeps admin actions out of assignment checks', () => {
    expect(agentsPage).toContain('aria-label={`${agent.name} expanded actions`}');
    expect(agentsPage).toContain('aria-label={`${agent.name} assignment checks`}');
    expect(agentsPage).toContain('aria-label={`${agent.name} recent activity`}');
    expect(agentsPage.indexOf('aria-label={`${agent.name} expanded actions`}')).toBeLessThan(
      agentsPage.indexOf('aria-label={`${agent.name} assignment checks`}')
    );
    expect(agentsPage.indexOf('onClick={() => onEditAgent(agent)}')).toBeLessThan(
      agentsPage.indexOf('aria-label={`${agent.name} assignment checks`}')
    );
    expect(agentsPage).toContain('Full run logs are not available from agent activity yet.');
  });

  it('toggles the assignment row when selecting an agent from the catalog', () => {
    expect(agentsPage).toContain('const selectAgentAssignmentRow = (agentId: string) =>');
    expect(agentsPage).toContain('onSelectedAgentChange={selectAgentAssignmentRow}');
    expect(agentsPage).toContain('onClick={() => onSelectedAgentChange(agent.id)}');
    expect(agentsPage).toContain("setExpandedAgentId((current) => current === agentId ? '' : agentId);");
    expect(agentsPage).toContain('{canManageAgents && (');
    expect(agentsPage).toContain('<Button type="button" variant="tertiary" size="sm" onClick={() => onOpenManagement(agent)}>');
    expect(agentsPage).toContain('Manage');
    expect(agentsPage).not.toContain('onOpenDetails={(agent)');
  });

  it('removes duplicate agent header facts already covered by readiness', () => {
    expect(agentsPage).not.toContain('Owner: {selectedAgent.owner}');
    expect(agentsPage).not.toContain('Version: v{selectedAgent.version}');
    expect(agentsPage).not.toContain('{selectedAgent.health.summary}');
    expect(agentsPage).not.toContain('h-12 w-12 shrink-0');
  });

  it('keeps agent readiness compact and registry-like instead of launch-panel-like', () => {
    expect(agentsPage).toContain('Review queue');
    expect(agentsPage).toContain('Agent assignment');
    expect(agentsPage).toContain('aria-expanded={expanded}');
    expect(agentsPage).not.toContain('<h3 className="mt-3 type-panel-title">Assignment readiness</h3>');
    expect(agentsPage).not.toContain('Agent registry summary');
  });

  it('keeps agent detail header actions on one button size and type scale', () => {
    expect(agentsPage).toContain('<Button type="button" variant="primary" size="sm" onClick={() => onOpenEditAgentDrawer(selectedAgent)}');
    expect(agentsPage).toContain('<Button type="button" variant="tertiary" size="sm" onClick={onReviewSelectedAgentAccess}>Access</Button>');
    expect(agentsPage).toContain('Save snapshot');
    expect(agentsPage).toContain('Snapshot creates a rollback point for this definition.');
    expect(agentsPage).not.toContain('Saving version...');
    expect(agentsPage).not.toContain('Save version');
    expect(agentsPage).not.toContain('actionLabelFor');
    expect(agentsPage).not.toContain('runActionFor');
    expect(agentsPage).not.toContain('<Button type="button" variant="primary" size="md" className="justify-center" onClick={onTestSelectedAgent}');
    expect(agentsPage).not.toContain("buttonClassName({ variant: 'secondary', size: 'md', className: 'w-full cursor-pointer list-none justify-center' })");
    expect(agentsPage).not.toContain('className="flex h-9 cursor-pointer list-none items-center justify-center rounded-md border border-ui-border bg-ui-surface px-3 text-sm font-semibold text-ui-text');
  });

  it('keeps access and history flattened with section dividers and shared controls', () => {
    expect(agentsPage).toContain('Manage agent');
    expect(agentsPage).toContain('Access and capabilities');
    expect(agentsPage).toContain('Workflow controls');
    expect(agentsPage).toContain('Version history');
    expect(agentsPage).toContain('Recent activity');
    expect(agentsPage).toContain('grid gap-6 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]');
    expect(agentsPage).toContain('id="agent-access-policy" tabIndex={-1}');
    expect(agentsPage).toContain("accessPolicy.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });");
    expect(agentsPage).toContain('accessPolicy.focus({ preventScroll: true });');
    expect(agentsPage).toContain('min-w-0 space-y-6 border-t border-ui-border pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0');
    expect(agentsPage).toContain('mt-4 border-t border-ui-border pt-4');
    expect(agentsPage).toContain('<TextInput value={newManualTriggerName}');
    expect(agentsPage).toContain('<TextInput value={newScheduleTriggerName}');
    expect(agentsPage).toContain('<Textarea value={newEventTriggerFilter}');
    expect(agentsPage).not.toContain('grid gap-5 bg-ui-bg/45 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.85fr)]');
    expect(agentsPage).not.toContain('min-w-0 scroll-mt-6 rounded-md border border-ui-border bg-ui-surface px-4 py-4');
    expect(agentsPage).not.toContain('Use these after assignment risk is understood.');
    expect(agentsPage).not.toContain('mb-4 rounded-md border border-ui-border bg-ui-bg px-3 py-3');
    expect(agentsPage).not.toContain('agentFormInputClassName');
    expect(agentsPage).not.toContain('agentFormTextareaClassName');
  });

  it('uses the same uncluttered library and detail chrome as workflows', () => {
    expect(agentsPage).toContain('placeholder="Search agents, workflows, tools, scope"');
    expect(agentsPage).toContain('{visibleAgents.length} of {agents.length} agents');
    expect(agentsPage).toContain('className="grid min-w-0 gap-6"');
    expect(agentsPage).toContain('titleId="agent-details-title"');
    expect(agentsPage).toContain('<RightSidePanel');
    expect(agentsPage).toContain('className="block w-full max-w-[min(100vw,64rem)] overflow-y-auto bg-ui-surface p-0"');
    expect(agentsPage).toContain('chrome="drawer"');
    expect(agentsPage).toContain('role="list"');
    expect(agentsPage).toContain('aria-hidden="true"');
    expect(agentsPage).toContain('xl:grid-cols-[minmax(0,1fr)_minmax(16rem,0.42fr)]');
    expect(agentsPage).not.toContain('overflow-x-auto custom-scrollbar');
    expect(agentsPage).not.toContain('min-w-[66rem]');
    expect(agentsPage).not.toContain('table-fixed');
    expect(agentsPage).toContain('grid gap-6 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]');
    expect(agentsPage).toContain('Workflow controls');
    expect(agentsPage).not.toContain('<section className="rounded-lg border border-ui-border bg-ui-surface p-4">');
    expect(agentsPage).not.toContain('className="mt-3 space-y-3"');
  });

  it('filters the catalog by assignment fit, capability surface, and safety intent', () => {
    expect(agentsPage).toContain("focus: 'all'");
    expect(agentsPage).toContain("if (catalogFilters.focus === 'ready') return getAgentReadinessLabel(agent) === 'Ready';");
    expect(agentsPage).toContain("if (catalogFilters.focus === 'action_needed') return getAgentReadinessLabel(agent) === 'Action needed';");
    expect(agentsPage).toContain("if (catalogFilters.focus === 'in_use') return agent.workflowsUsingAgent.length > 0;");
    expect(agentsPage).toContain("if (catalogFilters.focus === 'available') return agent.workflowsUsingAgent.length === 0;");
    expect(agentsPage).toContain("if (catalogFilters.focus === 'broad_scope') return getAgentReviewSignals(agent).includes('Broad target scope');");
    expect(agentsPage).toContain("if (catalogFilters.focus === 'write_gated') return agent.approvalPolicy.writeActions === 'approval_required';");
  });

  it('keeps the agent catalog responsive without horizontal scrolling or text collisions', () => {
    expect(agentsPage).toContain('const catalogGridClass =');
    expect(agentsPage).toContain('flex-wrap');
    expect(agentsPage).not.toContain('overflow-x-auto');
    expect(agentsPage).toContain('xl:hidden');
    expect(agentsPage).toContain('[overflow-wrap:anywhere]');
    expect(agentsPage).toContain('min-w-0 break-words');
    expect(agentsPage).not.toContain('<table');
    expect(agentsPage).not.toContain('<td');
    expect(agentsPage).not.toContain('<th');
  });

  it('uses native buttons for expandable agent rows instead of interactive table rows', () => {
    expect(agentsPage).toContain('<ul role="list" aria-label="Agent catalog list"');
    expect(agentsPage).toContain('<button');
    expect(agentsPage).toContain('aria-current={selected ? \'true\' : undefined}');
    expect(agentsPage).toContain('id={`agent-assignment-detail-${agent.id}`}');
    expect(agentsPage).not.toContain('role="row"');
    expect(agentsPage).not.toContain('role="cell"');
    expect(agentsPage).not.toContain('handleAgentRowKeyDown');
  });

  it('hardens agent filters and detail tokens for touch and long identifiers', () => {
    expect(componentVocabulary).toContain('inline-flex min-h-11 shrink-0');
    expect(agentsPage).toContain('title={value}');
    expect(agentsPage).toContain('overflow-wrap:anywhere');
    expect(agentsPage).not.toContain('type-code truncate rounded-md bg-ui-bg px-2 py-1 text-xs text-ui-text-muted');
  });

  it('separates expanded rows and keeps capability details out of collapsed rows', () => {
    expect(agentsPage).not.toContain('CapabilityPreviewGroup');
    expect(agentsPage).not.toContain('label="MCP"');
    expect(agentsPage).not.toContain('label="Tools"');
    expect(agentsPage).not.toContain('label="Skills"');
    expect(agentsPage).toContain('Capabilities');
    expect(agentsPage).toContain('Assignment checks');
    expect(agentsPage).toContain("expanded ? 'border-accent/35 shadow-sm xl:mb-4'");
    expect(agentsPage).toContain("selected ? 'bg-accent-soft/80 outline outline-1 -outline-offset-1 outline-accent/35'");
    expect(agentsPage).toContain('border-y border-accent/20 bg-ui-bg/70');
  });

  it('uses the shared warning treatment for fallback catalog errors', () => {
    expect(agentsPage).toContain('Control-plane agents did not load, so this page is showing the local catalog.');
    expect(agentsPage).toContain('border-status-warning/30 bg-status-warning-soft px-3 py-2 text-xs font-semibold text-status-warning-text');
    expect(agentsPage).not.toContain('agentLoadError && (\n        <div className="mb-4 whitespace-normal break-words rounded-md border border-ui-border bg-ui-surface');
  });

  it('keeps typography and action colors aligned with the workflow surface', () => {
    expect(agentsPage).toContain('<h2 id={titleId} className="mt-2 type-section-title">{selectedAgent.name}</h2>');
    expect(agentsPage).not.toContain('text-2xl font-semibold tracking-normal');
    expect(agentsPage).not.toContain('variant="accent"');
  });

  it('formats enum badges as polished labels instead of raw lowercase values', () => {
    expect(agentsPage).toContain('formatAgentDisplayValue');
    expect(agentsPage).toContain('formatPolicyValue');
    expect(agentsPage).toContain('formatPolicyValue(selectedAgent.approvalPolicy.writeActions)');
    expect(agentsPage).toContain("formatAgentDisplayValue(trigger.enabled ? 'enabled' : 'disabled')");
    expect(agentsPage).toContain('const formatPolicyValue = (value: string): string => formatAgentDisplayValue(value);');
    expect(agentsPage).toContain("formatPolicyValue(selectedAgent.approvalPolicy.writeActions)");
    expect(agentsPage).not.toContain('>{selectedAgent.status}</StatusBadge>');
    expect(agentsPage).not.toContain('>{selectedAgent.providerType}</StatusBadge>');
    expect(agentsPage).not.toContain('>{selectedAgent.health.status}</StatusBadge>');
  });

  it('keeps the route wrapper inside the app shell on mobile', () => {
    expect(agentsPage).toContain('className="min-h-0 w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8"');
    expect(agentsPage).not.toContain('w-[100vw] max-w-[100vw]');
  });
});
