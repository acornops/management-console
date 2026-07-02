import { readFileSync } from 'node:fs'; import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
const root = resolve(__dirname, '../..');
const agentsPage = [
  'src/pages/WorkspaceAgentsPage.tsx', 'src/pages/WorkspaceAgentsPage.helpers.tsx',
  'src/pages/WorkspaceAgentsCatalog.tsx', 'src/pages/WorkspaceAgentsDrawers.tsx',
  'src/pages/WorkspaceAgentActivityDrawer.tsx', 'src/pages/WorkspaceAgentDetailPanel.tsx'
].map((filePath) => readFileSync(resolve(root, filePath), 'utf8')).join('\n');
const agentsCatalog = readFileSync(resolve(root, 'src/pages/WorkspaceAgentsCatalog.tsx'), 'utf8');
const componentVocabulary = readFileSync(resolve(root, 'src/components/common/ComponentVocabulary.tsx'), 'utf8');

describe('WorkspaceAgentsPage surface', () => {
  it('uses a lightweight operator catalog with drawer-based management', () => {
    expect(agentsPage).toContain('Browse workspace agent profiles and manage the capabilities workflows can use.');
    expect(agentsPage).toContain('type-body mt-3 max-w-none break-words text-ui-text-muted');
    expect(agentsPage).toContain('border-ui-border bg-ui-surface');
    expect(agentsPage).not.toContain('border-status-warning/35 bg-status-warning-soft/70');
    expect(agentsPage).not.toContain('broad scope');
    expect(agentsPage).toContain('No recent test');
    expect(agentsPage).toContain('assigned');
    expect(agentsPage).not.toContain('profiles need review');
    expect(agentsPage).not.toContain('Resolve stale tests, access review, or ungated write access before workflow assignment.');
    expect(agentsPage).not.toContain('{reviewQueue.agentsNeedingAttention} need attention');
    expect(agentsPage).toContain('Workspace agent profiles');
    expect(agentsPage).toContain('Browse capability ownership, workflow usage, and assignment eligibility. Open a profile for approvals, versions, and activity.');
    expect(agentsCatalog).not.toContain('getAgentActivitySummary');
    expect(agentsCatalog).not.toContain('ActivityStatusCell');
    expect(agentsCatalog).not.toContain('formatActivityStatusLabel(activitySummary.status)');
    expect(agentsCatalog).not.toContain('activitySummary.lastRun');
    expect(agentsCatalog).not.toContain('>{activitySummary.line}</div>');
    expect(agentsCatalog).not.toContain('View activity');
    expect(agentsCatalog).toContain('Profile & activity');
    expect(agentsPage).toContain('CatalogCell label="Eligibility"');
    expect(agentsPage).not.toContain('CatalogCell label="Readiness"');
    expect(agentsPage).toContain('CatalogCell label="Workflows"');
    expect(agentsCatalog).not.toContain('CatalogCell label="Scope"');
    expect(agentsPage).toContain('AgentReadinessCell');
    expect(agentsPage).not.toContain('CatalogCell label="Approvals"');
    expect(agentsPage).not.toContain('CatalogCell label="Activity"');
    expect(agentsPage).not.toContain('Workflow:</span>');
    expect(agentsPage).not.toContain('Last Run:</span>');
    expect(agentsPage).not.toContain('Issue:</span>');
    expect(agentsPage).not.toContain('Access:</span>');
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
    expect(agentsPage).toContain('Needs test');
    expect(agentsPage).toContain('Needs review');
    expect(agentsPage).not.toContain('Action needed');
    expect(agentsCatalog).not.toContain("value: 'in_use'");
    expect(agentsCatalog).not.toContain("value: 'available'");
    expect(agentsCatalog).not.toContain("value: 'broad_scope'");
    expect(agentsCatalog).not.toContain("value: 'write_gated'");
    expect(agentsPage).not.toContain('Broad scope');
    expect(agentsCatalog).not.toContain('Write approvals');
    expect(agentsPage).not.toContain('Has MCP');
    expect(agentsPage).toContain('Clear filters');
    expect(agentsPage).toContain('hasActiveAgentCatalogFilters');
    expect(agentsPage).not.toContain('reviewFilters.map');
    expect(agentsPage).not.toContain('MCP connected');
    expect(agentsPage).not.toContain('Capability groups');
    expect(agentsPage).not.toContain('Workflow usage');
    expect(agentsPage).not.toContain('CapabilityPreviewGroup');
    expect(agentsPage).toContain('getAgentEligibilityReason');
    expect(agentsPage).not.toContain('getAgentCapabilityGroups');
    expect(agentsPage).toContain('getAgentWorkflowUsageSummary');
    expect(agentsPage).toContain('AgentEligibilityBadge');
    expect(agentsPage).toContain("getAgentEligibilityVisual(eligibility)");
    expect(agentsPage).toContain("'Needs review'");
    expect(agentsPage).toContain('border-status-danger/25 bg-status-danger-soft text-status-danger-text');
    expect(agentsPage).toContain('border-status-warning/25 bg-status-warning-soft text-status-warning-text');
    expect(agentsPage).toContain('border-status-success/25 bg-status-success-soft text-status-success-text');
    expect(agentsPage).toContain('border-ui-border bg-ui-bg text-ui-text-muted');
    expect(agentsPage).toContain('Recent evidence');
    expect(agentsPage).toContain('Policy snapshot');
    expect(agentsCatalog).not.toContain('Assignment checks');
    expect(agentsCatalog).not.toContain('AssignmentCheck');
    expect(agentsCatalog).not.toContain('<AssignmentCheck label="Targets" value={targetSummary} />');
    expect(agentsCatalog).not.toContain('<AssignmentCheck label="Data available" value={getAgentContextSummary(agent)} />');
    expect(agentsCatalog).not.toContain('getAgentTargetSummary');
    expect(agentsCatalog).not.toContain('getAgentContextSummary');
    expect(agentsCatalog).not.toContain('targetSummary');
    expect(agentsPage).not.toContain('Targets');
    expect(agentsPage).not.toContain('Data available');
    expect(agentsPage).toContain('Approvals');
    expect(agentsPage).toContain('Workflows');
    expect(agentsCatalog).not.toContain('All Kubernetes clusters');
    expect(agentsCatalog).not.toContain('Workspace metadata');
    expect(agentsCatalog).not.toContain('Target inventory');
    expect(agentsCatalog).not.toContain('Selected chat sessions');
    expect(agentsPage).toContain('Workspace');
    expect(agentsCatalog).not.toContain("if (kind === 'scope') return formatAgentDisplayValue(value);");
    expect(agentsPage).not.toContain("'workspace:current': 'Current workspace'");
    expect(agentsPage).toContain('Write actions blocked; sensitive actions require approval');
    expect(agentsPage).toContain('Sensitive and write actions require approval');
    expect(agentsPage).toContain('ApprovalPolicyStack');
    ["getApprovalPolicyChip('Write', agent.approvalPolicy.writeActions)", "getApprovalPolicyChip('Sensitive', agent.approvalPolicy.sensitiveActions)"].forEach((snippet) => expect(agentsPage).toContain(snippet));
    ["scopeLabel: label", "label: 'Blocked'", "label: 'Approval required'", "label: 'Allowed'"].forEach((snippet) => expect(agentsCatalog).toContain(snippet));
    ['label: `${label} blocked`', 'label: `${label} approval`', 'label: `${label} allowed`'].forEach((snippet) => expect(agentsCatalog).not.toContain(snippet));
    expect(agentsPage).toContain('ICONS.Lock');
    expect(agentsPage).toContain('ICONS.Shield');
    expect(agentsPage).toContain('ICONS.CheckCircle2');
    expect(agentsPage).toContain("className: 'border-status-danger/25 bg-status-danger-soft text-status-danger-text'");
    expect(agentsPage).toContain("className: 'border-status-warning/25 bg-status-warning-soft text-status-warning-text'");
    expect(agentsPage).toContain("className: 'border-status-success/25 bg-status-success-soft text-status-success-text'");
    expect(agentsPage).toContain('<ApprovalPolicyStack agent={agent} />');
    expect(agentsPage).not.toContain('Target access');
    expect(agentsPage).not.toContain('Context access');
    expect(agentsPage).not.toContain('Approval gates');
    expect(agentsPage).not.toContain('approval gate');
    expect(agentsPage).not.toContain('Write access:');
    expect(agentsPage).toContain('aria-expanded={expanded}');
    expect(agentsPage).toContain('Run readiness');
    expect(agentsPage).not.toContain('capability entries');
    expect(agentsPage).not.toContain('Tools allowed');
    expect(agentsPage).not.toContain('Profile</div>');
    expect(agentsPage).toContain('Open profile');
    expect(agentsPage).toContain('Configuration');
    expect(agentsPage).not.toContain('Manage agent');
    expect(agentsPage).not.toContain('More actions');
    expect(agentsPage).not.toContain('Access, triggers, and history');
    expect(agentsPage).not.toContain('Primary action');
    expect(agentsPage).not.toContain('Manage definition');
    expect(agentsPage).not.toContain('Operations');
    expect(agentsPage).not.toContain('Using fallback agent catalog until control-plane Agent routes are available.');
  });

  it('gives rows a stronger scan hierarchy and links workflow dependencies back to workflows', () => {
    expect(agentsPage).toContain("import { AppPaths } from '@/utils/routes';");
    expect(agentsPage).toContain('function workflowCatalogHref(workspaceId: string, workflowName: string): string');
    expect(agentsPage).toContain('new URLSearchParams({ workflow: workflowName, q: workflowName })');
    expect(agentsPage).toContain('`${AppPaths.workspaceWorkflows(workspaceId)}?${params.toString()}`');
    expect(agentsPage).toContain('function getAgentMetadataItems(agent: AgentDefinition): string[]');
    expect(agentsPage).toContain('const items: string[] = [];');
    expect(agentsPage).toContain("if (agent.source === 'user') items.push('Custom');");
    expect(agentsPage).toContain("const owner = agent.owner.trim();");
    expect(agentsPage).toContain("if (agent.ownerUserId === 'system' || owner.toLowerCase() === 'system')");
    expect(agentsPage).toContain("items.push('System');");
    expect(agentsPage).toContain('} else if (owner) {');
    expect(agentsPage).not.toContain("items.push(agent.providerType === 'external' ? 'External Connection' : 'AcornOps Runtime');");
    expect(agentsPage).not.toContain('AcornOps Runtime');
    expect(agentsPage).not.toContain('External Connection');
    expect(agentsPage).not.toContain("items.push(`${formatAgentDisplayValue(agent.providerType)} provider`);");
    expect(agentsPage).toContain('items.push(`v${agent.version}`);');
    expect(agentsPage).toContain('AgentMetadataLine');
    expect(agentsPage).toContain('<AgentMetadataLine agent={agent} />');
    expect(agentsPage).toContain('visual.reasonClassName');
    expect(agentsPage).toContain('type-row-title block min-w-0 break-words text-ui-text group-hover:text-accent-strong [overflow-wrap:anywhere]');
    expect(agentsPage).not.toContain('type-panel-title block min-w-0 break-words text-ui-text group-hover:text-accent-strong [overflow-wrap:anywhere]');
    expect(agentsPage).not.toContain('AgentReviewReason');
    expect(agentsPage).not.toContain('AgentMetadataStrip');
    expect(agentsPage).not.toContain('metadataClassNames');
    expect(agentsPage).toContain('h-1 w-1 shrink-0 rounded-full bg-ui-text-muted');
    expect(agentsPage).toContain('text-status-warning-text');
    expect(agentsPage).toContain('text-status-success-text');
    expect(agentsPage).not.toContain('before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full');
    expect(agentsPage).not.toContain("Review: {readinessReason}");
    expect(agentsPage).not.toContain('border-status-warning/25 bg-status-warning-soft px-2 py-0.5');
    expect(agentsPage).not.toContain('rounded-md border px-2 py-1 text-xs font-bold leading-none');
    expect(agentsPage).not.toContain('rounded-md border border-ui-border bg-ui-bg px-2 py-0.5');
    expect(agentsPage).not.toContain('Owner {agent.owner} · {getAgentSourceLabel(agent)} · v{agent.version}');
    expect(agentsCatalog).not.toContain('className="text-sm font-medium text-ui-text"');
    expect(agentsCatalog).not.toContain('className="type-caption mt-1 min-w-0 break-words text-ui-text-muted [overflow-wrap:anywhere]"');
    expect(agentsPage).toContain('WorkflowBacklinkList');
    expect(agentsPage).toContain('href={workflowCatalogHref(agent.workspaceId, workflow)}');
    expect(agentsPage).toContain('aria-label={`Open workflow ${workflow}`}');
    expect(agentsPage).toContain('title={`Open ${workflow} in Workflows`}');
    expect(agentsPage).toContain("['Agent', 'Eligibility', 'Workflows', 'Assignment action', '']");
    expect(agentsPage).toContain('AgentWorkflowUsageCell');
    expect(agentsPage).toContain('<AgentWorkflowUsageCell agent={agent} />');
    expect(agentsPage).not.toContain('AgentWorkflowUsageLine');
    expect(agentsPage).not.toContain('<AgentWorkflowUsageLine agent={agent} />');
    expect(agentsPage).toContain('AgentReadinessCell');
    expect(agentsPage).toContain('function getAgentNextStep(agent: AgentDefinition): string');
    expect(agentsPage).toContain("if (signals.includes('No recent readiness test')) return 'Open profile, then run readiness';");
    expect(agentsPage).toContain('<AgentReadinessCell agent={agent} eligibility={eligibility} eligibilityReason={eligibilityReason} />');
    expect(agentsPage).toContain('gap-x-3 gap-y-3 px-3 py-3 sm:px-4 sm:py-3.5');
    expect(agentsPage).toContain('xl:grid-cols-[minmax(0,1.35fr)_minmax(9rem,0.52fr)_minmax(9rem,0.52fr)_minmax(11rem,max-content)_2rem]');
    expect(agentsPage).toContain('inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1');
    expect(agentsPage).toContain('type-caption min-w-0 break-words [overflow-wrap:anywhere]');
    expect(agentsPage).not.toContain('max-w-[14rem] truncate');
    expect(agentsPage).not.toContain('gap-4 px-5 py-4');
    expect(agentsPage).not.toContain('flex min-w-0 flex-col items-start gap-2');
    expect(agentsPage).toContain("getAgentWorkflowUsageSummary(agent).countLabel");
    expect(agentsPage).toContain("getAgentWorkflowUsageSummary(agent).previewLabel");
    expect(agentsPage).not.toContain("['Agent', 'State', 'Scope', '']");
    expect(agentsPage).not.toContain("['Agent', 'Readiness', 'Scope', '']");
    expect(agentsPage).not.toContain("['Agent', 'Readiness', 'Workflows', 'Scope', 'Approvals', 'Activity', '']");
    expect(agentsPage).not.toContain("['Agent', 'Eligibility', 'Workflows', 'Scope', '']");
    expect(agentsPage).not.toContain('const workflowDetail = agent.workflowsUsingAgent.length > 0');
    expect(agentsPage).not.toContain('AssignmentCheck label="Workflows" value={workflowDetail}');
    expect(agentsPage).not.toContain('function formatAgentScopeHeadline');
    expect(agentsPage).not.toContain("return `Scope: ${targetSummary}`;");
    expect(agentsCatalog).not.toContain('{targetSummary}</div>');
    expect(agentsPage).not.toContain('AssignmentCheck label="Targets" value={targetSummary}');
  });

  it('uses a single focused create form and keeps it permission-aware', () => {
    expect(agentsPage).toContain('Create agent');
    expect(agentsPage).toContain('New agent');
    expect(agentsPage).toContain('Name the agent and its assignment purpose.');
    expect(agentsPage).toContain('Name');
    expect(agentsPage).not.toContain('type-micro-label">Provider');
    expect(agentsPage).not.toContain('ariaLabel="Provider"');
    expect(agentsPage).not.toContain('AgentCreateReviewRow label="Provider"');
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
    expect(agentsPage).toContain('You can inspect agents. Ask a workspace manager for manage_agents permission to create or change them.');
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
    expect(agentsPage).toContain('<Button type="button" variant="secondary" size="sm" className="w-full justify-center sm:w-auto" onClick={() => onEditAgent(agent)} disabled={!canManageAgents}>');
    expect(agentsPage).toContain('value={editDraft.name} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, name: event.target.value }))} className="mt-2"');
    expect(agentsPage).toContain('value={editDraft.description} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, description: event.target.value }))} className="mt-2"');
    expect(agentsPage).toContain('saveAgentEdits');
    expect(agentsPage).toContain('disabled={!canManageAgents || updatingAgentId === selectedAgent.id}');
    expect(agentsPage).toContain('Changes before save');
    expect(agentsPage).toContain('getAgentEditChangeSummary');
    expect(agentsPage).toContain('Capability sources changed');
    expect(agentsPage).not.toContain('Targets changed');
    expect(agentsPage).not.toContain('Data sources changed');
    expect(agentsPage).not.toContain('External data rule changed');
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
    expect(agentsPage).toContain('label="MCP servers"');
    expect(agentsPage).toContain('label="Tools"');
    expect(agentsPage).toContain('label="Skills"');
    expect(agentsPage).toContain('selectedValues={splitCapabilityInput(draftMcpServers)}');
    expect(agentsPage).toContain('selectedValues={splitCapabilityInput(draftTools)}');
    expect(agentsPage).toContain('selectedValues={splitCapabilityInput(draftSkills)}');
    expect(agentsPage).toContain('setDraftMcpServers(joinCapabilityInput(nextValues))');
    expect(agentsPage).toContain('setDraftTools(joinCapabilityInput(nextValues))');
    expect(agentsPage).toContain('setDraftSkills(joinCapabilityInput(nextValues))');
    expect(agentsPage).toContain('Paste approved IDs');
    expect(agentsPage).toContain('One MCP server ID per line');
    expect(agentsPage).toContain('One tool ID per line');
    expect(agentsPage).toContain('One skill ID per line');
    expect(agentsPage).toContain('Capability options did not load. Existing IDs remain visible; new edits may have fewer picker choices.');
    expect(agentsPage).not.toContain("onSelect={(value) => setDraftMcpServers((current) => appendUniqueToken(current, value))}");
    expect(agentsPage).not.toContain("onSelect={(value) => setDraftTools((current) => appendUniqueToken(current, value))}");
    expect(agentsPage).not.toContain("onSelect={(value) => setDraftSkills((current) => appendUniqueToken(current, value))}");
    expect(agentsPage).toContain("setEditDraft((draft) => draft && ({ ...draft, tools: appendUniqueToken(draft.tools, value) }))");
  });

  it('manages agent versions and activity without workflow trigger controls', () => {
    expect(agentsPage).toContain('createAgentVersion as createWorkspaceAgentVersion');
    expect(agentsPage).toContain('listAgentVersions');
    expect(agentsPage).toContain('restoreAgentVersion');
    expect(agentsPage).toContain('listAgentActivity');
    expect(agentsPage).not.toContain('createAgentTrigger');
    expect(agentsPage).not.toContain('updateAgentTrigger');
    expect(agentsPage).not.toContain('deleteAgentTrigger');
    expect(agentsPage).toContain('saveSelectedAgentVersion');
    expect(agentsPage).toContain('refreshSelectedAgentVersions');
    expect(agentsPage).toContain('restoreSelectedAgentVersion');
    expect(agentsPage).toContain('refreshSelectedAgentActivity');
    expect(agentsPage).not.toContain('onCreateManualTrigger');
    expect(agentsPage).not.toContain('onCreateScheduleTrigger');
    expect(agentsPage).not.toContain('onCreateEventTrigger');
    expect(agentsPage).not.toContain('onToggleAgentTrigger');
    expect(agentsPage).not.toContain('onDeleteAgentTrigger');
    expect(agentsPage).toContain('Save snapshot');
    expect(agentsPage).toContain('Version history');
    expect(agentsPage).toContain('>Refresh</Button>');
    expect(agentsPage).toContain('Restore');
    expect(agentsPage).toContain('Refresh activity');
    expect(agentsPage).toContain('Version snapshot saved as v${version.version}.');
    expect(agentsPage).toContain('Recent activity refreshed.');
    expect(agentsPage).not.toContain('Add manual trigger');
    expect(agentsPage).not.toContain('Trigger enabled for this agent.');
    expect(agentsPage).not.toContain('Trigger deleted. Workflow assignments were not changed.');
  });

  it('keeps activity reachable through the management profile drawer', () => {
    expect(agentsPage).toContain('AgentActivityDrawer');
    expect(agentsPage).toContain('const [activityPanelOpen, setActivityPanelOpen] = useState(false);');
    expect(agentsPage).not.toContain('onOpenActivity={openAgentActivity}');
    expect(agentsPage).toContain('onOpenManagement={openAgentManagement}');
    expect(agentsPage).toContain('Agent activity');
    expect(agentsPage).toContain('Run history');
    expect(agentsPage).toContain('Close agent activity');
    expect(agentsPage).toContain('onRefreshActivity');
    expect(agentsCatalog).not.toContain('View activity');
    expect(agentsCatalog).toContain('Profile & activity');
  });

  it('does not expose workflow trigger controls from agent profiles', () => {
    expect(agentsPage).not.toContain('newManualTriggerName');
    expect(agentsPage).not.toContain('Manual trigger label');
    expect(agentsPage).not.toContain("newManualTriggerName.trim() || 'Manual run'");
    expect(agentsPage).not.toContain("name: newManualTriggerName.trim() || 'Manual run'");
    expect(agentsPage).not.toContain("setNewManualTriggerName('')");
  });

  it('keeps scheduled trigger creation out of agent profile management', () => {
    expect(agentsPage).not.toContain('newScheduleTriggerName');
    expect(agentsPage).not.toContain('newScheduleTriggerCron');
    expect(agentsPage).not.toContain('newScheduleTriggerTimezone');
    expect(agentsPage).not.toContain('createScheduleTrigger');
    expect(agentsPage).not.toContain("type: 'schedule'");
    expect(agentsPage).not.toContain('Scheduled trigger label');
    expect(agentsPage).not.toContain('Cron schedule');
    expect(agentsPage).not.toContain('Add scheduled trigger');
  });

  it('keeps event trigger creation out of agent profile management', () => {
    expect(agentsPage).not.toContain('eventTriggerTypeOptions');
    expect(agentsPage).not.toContain('newEventTriggerType');
    expect(agentsPage).not.toContain('newEventTriggerFilter');
    expect(agentsPage).not.toContain('createEventTrigger');
    expect(agentsPage).not.toContain('JSON.parse(newEventTriggerFilter)');
    expect(agentsPage).not.toContain('Event trigger label');
    expect(agentsPage).not.toContain('Event type');
    expect(agentsPage).not.toContain('Event filter JSON');
    expect(agentsPage).not.toContain('Add event trigger');
    expect(agentsPage).not.toContain('Event filter must be a JSON object, for example {"eventType":"deployment.completed"}.');
  });

  it('keeps agent profile details focused instead of showing a permanent activation checklist', () => {
    expect(agentsPage).not.toContain('AgentActivationChecklist');
    expect(agentsPage).not.toContain('Activation checklist');
    expect(agentsPage).not.toContain('Agent status is active');
    expect(agentsPage).not.toContain('Health check is healthy');
    expect(agentsPage).not.toContain('Target and context scope reviewed');
    expect(agentsPage).not.toContain('Workflow impact checked');
    expect(agentsPage).not.toContain('Run readiness test before launch');
    expect(agentsPage).not.toContain('Can this agent run safely?');
    expect(agentsPage).not.toContain('Before assignment');
    expect(agentsPage).not.toContain('No blockers before assignment');
    expect(agentsPage).not.toContain('Assignment impact');
    expect(agentsPage).not.toContain('Access evidence');
    expect(agentsPage).toContain('decisionSummary.line');
    expect(agentsPage).not.toContain('nextActionLabel');
    expect(agentsPage).not.toContain('actionLabelFor');
    expect(agentsPage).not.toContain('runActionFor');
    expect(agentsPage).not.toContain('Actions before assignment');
    expect(agentsPage).not.toContain('Allowed access');
    expect(agentsPage).not.toContain('Workflow impact');
  });

  it('keeps server-compiled readiness scope out of the agent profile UI', () => {
    expect(agentsPage).not.toContain('agentCompiledScopePreviews');
    expect(agentsPage).not.toContain('result.compiledScope');
    expect(agentsPage).not.toContain('Readiness scope preview');
    expect(agentsPage).not.toContain('Access returned by the last readiness test.');
    expect(agentsPage).not.toContain('JSON.stringify(selectedCompiledScopePreview, null, 2)');
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
    expect(agentsPage).toContain('Agent deleted.');
    expect(agentsPage).not.toContain('Agent deleted. Workflow assignments were not changed.');
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
    expect(agentsPage).toContain('Browse workspace agent profiles and manage the capabilities workflows can use.');
    expect(agentsPage).toContain('placeholder="Search agents, workflows, tools"');
    expect(agentsPage).not.toContain('placeholder="Search agents, workflows, tools, scope"');
    expect(agentsPage).toContain('Local fallback catalog');
    expect(agentsPage).toContain('Fallback data is active. Control-plane agents did not load, so saved definitions and live activity may be stale. Live control-plane data was last requested from this workspace route.');
    expect(agentsPage).toContain('Capability options unavailable');
    expect(agentsPage).toContain('Fallback data is active. Capability options did not load, so existing IDs remain visible but new edits may have fewer picker choices. Live control-plane data was last requested from workflow options.');
    expect(agentsPage).toContain('Owner choices limited');
    expect(agentsPage).toContain('Fallback data is active. Workspace members did not load, so owner choices are limited to members already available in this workspace view. Live control-plane data was last requested from member records.');
    expect(agentsPage).toContain('You can inspect agents. Ask a workspace manager for manage_agents permission to create or change them.');
    expect(agentsPage).toContain('Name the agent and its assignment purpose. It saves with restricted trust and approval required for write tools.');
    expect(agentsPage).toContain('Assignment purpose');
    expect(agentsPage).toContain('Capability sources');
    expect(agentsPage).toContain('Run readiness');
    expect(agentsPage).toContain('Readiness test queued for ${agentToTest.name}. Check recent activity for ${result.activity.id}.');
    expect(agentsPage).toContain('Agent saved with restricted trust and approval required for write tools.');
    expect(agentsPage).toContain('No agents in this workspace');
    expect(agentsPage).toContain('Create an agent to define the tools, data, and approvals workflows can use.');
    expect(agentsPage).toContain('Nothing matches this view');
    expect(agentsPage).toContain('Clear filters or adjust search to return to the workspace agent catalog.');
    expect(agentsPage).toContain('AgentCatalogEmptyState');
    expect(agentsPage).toContain('onClearFilters={() => onCatalogFiltersChange(defaultAgentCatalogFilters)}');
    expect(agentsPage).not.toContain('No agents match. Search by agent name, workflow, tool, skill, or scope.');
  });

  it('uses expandable assignment rows before dense agent detail panels', () => {
    expect(agentsPage).toContain('<AgentEligibilityBadge eligibility={eligibility} />');
    expect(agentsPage).toContain('Recent evidence');
    expect(agentsPage).toContain('Policy snapshot');
    expect(agentsCatalog).not.toContain('View activity');
    expect(agentsCatalog).toContain('Profile & activity');
    expect(agentsPage).not.toContain('Profile</div>');
    expect(agentsPage).not.toContain('Workflow controls');
  });

  it('keeps expanded profile rows visually quiet and integrated with the catalog', () => {
    expect(agentsPage).toContain("selected ? 'bg-accent-soft/55 outline outline-1 -outline-offset-1 outline-accent/35 ring-1 ring-accent/15'");
    expect(agentsPage).toContain("expanded ? 'border-accent/25 bg-ui-surface shadow-sm ring-1 ring-accent/10 xl:mb-3'");
    expect(agentsPage).toContain('border-t border-accent/20 bg-ui-bg/85 px-3 py-4 sm:px-5');
    expect(agentsPage).toContain('Latest profile evidence');
    expect(agentsPage).not.toContain('Profile actions');
    expect(agentsPage).toContain('grid min-w-0 grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end');
    expect(agentsCatalog).not.toContain('onOpenActivity(agent)');
    expect(agentsCatalog).toContain('<Button type="button" variant="secondary" size="sm" className="w-full justify-center sm:w-auto" onClick={() => onOpenManagement(agent)}>');
    expect(agentsPage).toContain('rounded-md border border-ui-border bg-ui-bg/65 px-4 py-3');
    expect(agentsPage).toContain('rounded-md border border-ui-border bg-ui-surface p-3 shadow-sm sm:p-4');
    expect(agentsPage).not.toContain("selected ? 'bg-accent-soft/80 outline outline-1 -outline-offset-1 outline-accent/35'");
    expect(agentsPage).not.toContain("expanded ? 'border-accent/35 shadow-sm xl:mb-4'");
    expect(agentsPage).not.toContain('border-y border-accent/20 bg-ui-bg/70');
    expect(agentsPage).not.toContain('Use this preview to decide whether the agent is ready for workflow assignment.');
  });

  it('keeps collapsed agent rows actionable without nesting row buttons', () => {
    expect(agentsPage).toContain('type="button"');
    expect(agentsPage).toContain("aria-expanded={expanded}");
    expect(agentsPage).toContain('aria-controls={`agent-assignment-detail-${agent.id}`}');
    expect(agentsPage).toContain('AgentRowActionCell');
    expect(agentsPage).toContain('CatalogCell label="Assignment action"');
    expect(agentsPage).toContain("className={`${catalogGridClass} transition-colors");
    expect(agentsPage).toContain('className="group block w-full min-w-0 rounded-md text-left');
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
    expect(agentsPage).toContain('aria-label={`${agent.name} policy snapshot`}');
    expect(agentsPage).toContain('aria-label={`${agent.name} recent evidence`}');
    expect(agentsPage.indexOf('aria-label={`${agent.name} expanded actions`}')).toBeLessThan(
      agentsPage.indexOf('aria-label={`${agent.name} policy snapshot`}')
    );
    expect(agentsPage.indexOf('onClick={() => onEditAgent(agent)}')).toBeLessThan(
      agentsPage.indexOf('aria-label={`${agent.name} policy snapshot`}')
    );
    expect(agentsPage).toContain('Open agent management for configuration, versions, and full activity.');
  });

  it('toggles the assignment row when selecting an agent from the catalog', () => {
    expect(agentsPage).toContain('const selectAgentAssignmentRow = (agentId: string) =>');
    expect(agentsPage).toContain('onSelectedAgentChange={selectAgentAssignmentRow}');
    expect(agentsPage).toContain('onClick={() => onSelectedAgentChange(agent.id)}');
    expect(agentsPage).toContain("setExpandedAgentId((current) => current === agentId ? '' : agentId);");
    expect(agentsPage).toContain('{canManageAgents && (');
    expect(agentsPage).toContain('<Button type="button" variant="secondary" size="sm" className="w-full justify-center sm:w-auto" onClick={() => onOpenManagement(agent)}>');
    expect(agentsPage).toContain('Open profile');
    expect(agentsPage).not.toContain('onOpenDetails={(agent)');
  });

  it('removes duplicate agent header facts already covered by readiness', () => {
    expect(agentsPage).not.toContain('Owner: {selectedAgent.owner}');
    expect(agentsPage).not.toContain('Version: v{selectedAgent.version}');
    expect(agentsPage).not.toContain('{selectedAgent.health.summary}');
    expect(agentsPage).not.toContain('h-12 w-12 shrink-0');
  });

  it('keeps agent readiness compact and registry-like instead of launch-panel-like', () => {
    expect(agentsPage).toContain('Workspace agent profiles');
    expect(agentsPage).toContain('aria-expanded={expanded}');
    expect(agentsPage).not.toContain('Profile queue');
    expect(agentsPage).not.toContain('Assignment readiness');
    expect(agentsPage).not.toContain('<h3 className="mt-3 type-panel-title">Assignment readiness</h3>');
    expect(agentsPage).not.toContain('Agent registry summary');
  });

  it('keeps agent detail header actions on one button size and type scale', () => {
    expect(agentsPage).toContain('<Button type="button" variant="primary" size="sm" onClick={() => onOpenEditAgentDrawer(selectedAgent)}');
    expect(agentsPage).not.toContain('onReviewSelectedAgentAccess');
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
    expect(agentsPage).toContain('Configuration');
    expect(agentsPage).toContain('Capabilities');
    expect(agentsPage).toContain('<details className="border-b border-ui-border bg-ui-surface" open>');
    expect(agentsPage).not.toContain('Workflow controls');
    expect(agentsPage).not.toContain('Workflow assignments');
    expect(agentsPage).not.toContain('No workflows use this agent yet.');
    expect(agentsPage).toContain('Version history');
    expect(agentsPage).toContain('Recent activity');
    expect(agentsPage).toContain('grid gap-6 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]');
    expect(agentsPage).not.toContain('id="agent-access-policy" tabIndex={-1}');
    expect(agentsPage).not.toContain('accessPolicy.scrollIntoView');
    expect(agentsPage).not.toContain('accessPolicy.focus');
    expect(agentsPage).toContain('min-w-0 space-y-6 border-t border-ui-border pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0');
    expect(agentsPage).not.toContain('<TextInput value={newManualTriggerName}');
    expect(agentsPage).not.toContain('<TextInput value={newScheduleTriggerName}');
    expect(agentsPage).not.toContain('<Textarea value={newEventTriggerFilter}');
    expect(agentsPage).not.toContain('grid gap-5 bg-ui-bg/45 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.85fr)]');
    expect(agentsPage).not.toContain('min-w-0 scroll-mt-6 rounded-md border border-ui-border bg-ui-surface px-4 py-4');
    expect(agentsPage).not.toContain('Use these after assignment risk is understood.');
    expect(agentsPage).not.toContain('mb-4 rounded-md border border-ui-border bg-ui-bg px-3 py-3');
    expect(agentsPage).not.toContain('agentFormInputClassName');
    expect(agentsPage).not.toContain('agentFormTextareaClassName');
  });

  it('filters the catalog by assignment readiness without duplicating row evidence', () => {
    expect(agentsPage).toContain("focus: 'all'");
    expect(agentsPage).toContain("if (filters.focus === 'needs_review') return getAgentEligibilityLabel(agent) === 'Needs review';");
    expect(agentsPage).toContain("if (filters.focus === 'needs_test') return getAgentEligibilityLabel(agent) === 'Needs test';");
    expect(agentsPage).toContain("if (filters.focus === 'ready') return getAgentEligibilityLabel(agent) === 'Ready';");
    expect(agentsPage).not.toContain("if (filters.focus === 'in_use') return agent.workflowsUsingAgent.length > 0;");
    expect(agentsPage).not.toContain("if (filters.focus === 'available') return agent.workflowsUsingAgent.length === 0;");
    expect(agentsPage).not.toContain("if (filters.focus === 'broad_scope') return getAgentReviewSignals(agent).includes('Broad target scope');");
    expect(agentsPage).not.toContain("if (filters.focus === 'write_gated') return agent.approvalPolicy.writeActions === 'approval_required';");
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

  it('keeps fallback catalog errors recoverable without overpowering the route', () => {
    expect(agentsPage).toContain('Local fallback catalog');
    expect(agentsPage).toContain('Fallback data is active. Control-plane agents did not load, so saved definitions and live activity may be stale. Live control-plane data was last requested from this workspace route.');
    expect(agentsPage).toContain('actionLabel="Retry agents"');
    expect(agentsPage).toContain('border border-ui-border bg-ui-surface px-3 py-2 text-xs font-semibold text-ui-text-muted shadow-sm');
    expect(agentsPage).toContain('role="status"');
    expect(agentsPage).not.toContain('border-status-warning/30 bg-status-warning-soft px-3 py-2 text-xs font-semibold text-status-warning-text');
  });

  it('keeps typography and action colors aligned with the workflow surface', () => {
    expect(agentsPage).toContain('<h2 id={titleId} className="mt-2 type-section-title">{selectedAgent.name}</h2>');
    expect(agentsPage).not.toContain('text-2xl font-semibold tracking-normal');
    expect(agentsPage).not.toContain('variant="accent"');
  });

  it('keeps the route wrapper inside the app shell on mobile', () => {
    expect(agentsPage).toContain('className="min-h-0 min-w-0 w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto bg-ui-bg px-3 py-5 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8"');
    expect(agentsPage).not.toContain('w-[100vw] max-w-[100vw]');
  });
});
