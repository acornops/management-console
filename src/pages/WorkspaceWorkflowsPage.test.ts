import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  appendWorkflowSearchTag,
  createDefaultWorkflowDefinitions,
  filterWorkflowDefinitions,
  getWorkflowById,
  getWorkflowLaunchBlocker,
  getOptimisticWorkflowRunStatus,
  getWorkflowTabLabel,
  getWorkflowToolScopeSummary,
  type WorkflowDefinition,
  type WorkflowTab
} from './workflows/workflowModel';

const root = resolve(__dirname, '../..');
const workflowsPage = [
  readFileSync(resolve(root, 'src/pages/WorkspaceWorkflowsPage.tsx'), 'utf8'),
  readFileSync(resolve(root, 'src/pages/WorkspaceWorkflowsPage.components.tsx'), 'utf8')
].join('\n');
const workflowActions = readFileSync(resolve(root, 'src/pages/workflows/useWorkspaceWorkflowActions.ts'), 'utf8');
const workflowHelpers = readFileSync(resolve(root, 'src/pages/workflows/workflowPageHelpers.tsx'), 'utf8');
const desktopSidebar = readFileSync(resolve(root, 'src/app/AppDesktopSidebar.tsx'), 'utf8');
const mobileNavigation = readFileSync(resolve(root, 'src/app/AppMobileNavigation.tsx'), 'utf8');
const appPageContent = readFileSync(resolve(root, 'src/app/AppPageContent.tsx'), 'utf8');

describe('WorkspaceWorkflowsPage model', () => {
  it('ships governed workspace automation examples assigned to durable agents', () => {
    const workflows = createDefaultWorkflowDefinitions();

    expect(workflows.map((workflow) => workflow.id)).toEqual([
      'cluster-triage',
      'repository-operation',
      'incident-report-pdf'
    ]);
    expect(workflows.every((workflow) => workflow.scope.type === 'workspace')).toBe(true);
    expect(workflows.every((workflow) => workflow.primaryAgent.agentId)).toBe(true);
    expect(workflows.some((workflow) => workflow.supportingAgents.length > 0)).toBe(true);
    expect(workflows.some((workflow) => workflow.contextGrants.includes('selected_chat_sessions'))).toBe(true);
    expect(workflows.some((workflow) => workflow.primaryAgent.name === 'Repository Operator')).toBe(true);
  });

  it('filters the workflow library by name, enabled skills, MCP scope, and permission copy', () => {
    const workflows = createDefaultWorkflowDefinitions();

    expect(filterWorkflowDefinitions(workflows, 'cluster').map((workflow) => workflow.id)).toEqual(['cluster-triage']);
    expect(filterWorkflowDefinitions(workflows, 'github').map((workflow) => workflow.id)).toEqual(['repository-operation']);
    expect(filterWorkflowDefinitions(workflows, 'approval').map((workflow) => workflow.id)).toEqual(['repository-operation']);
  });

  it('supports repo-style workflow tags in defaults and search', () => {
    const workflows = createDefaultWorkflowDefinitions();
    const repoWorkflow = getWorkflowById(workflows, 'repository-operation');

    expect(repoWorkflow?.tags).toEqual(['repository', 'configuration', 'pull-request']);
    expect(filterWorkflowDefinitions(workflows, 'pdf').map((workflow) => workflow.id)).toEqual(['incident-report-pdf']);
    expect(filterWorkflowDefinitions(workflows, 'triage').map((workflow) => workflow.id)).toEqual(['cluster-triage']);
    expect(filterWorkflowDefinitions(workflows, 'cluster incident').map((workflow) => workflow.id)).toEqual(['cluster-triage']);
    expect(filterWorkflowDefinitions(workflows, 'incident pdf').map((workflow) => workflow.id)).toEqual(['incident-report-pdf']);
    expect(appendWorkflowSearchTag('incident', 'pdf')).toBe('incident pdf');
    expect(appendWorkflowSearchTag('incident pdf', 'pdf')).toBe('incident pdf');
  });

  it('summarizes effective capabilities as workflow gates over assigned agents', () => {
    const workflows = createDefaultWorkflowDefinitions();
    const triageWorkflow = getWorkflowById(workflows, 'cluster-triage');

    expect(triageWorkflow?.policy.mode).toBe('read_only');
    expect(getWorkflowToolScopeSummary(triageWorkflow as WorkflowDefinition)).toBe('Kubernetes Diagnostics, 4 allowed tools, read only');
  });

  it('keeps workflow detail tabs aligned with agent assignment and capability review', () => {
    const tabs: WorkflowTab[] = ['overview', 'agents', 'targets', 'capabilities', 'runs', 'settings'];

    expect(tabs.map(getWorkflowTabLabel)).toEqual(['Overview', 'Agents', 'Targets', 'Capability review', 'Runs', 'Settings']);
  });

  it('uses bottom-underline workflow detail tabs instead of boxed pills', () => {
    expect(workflowsPage).toContain('className="flex gap-2 overflow-x-auto border-b border-ui-border"');
    expect(workflowsPage).toContain('className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25');
    expect(workflowsPage).toContain("'border-accent text-accent-strong'");
    expect(workflowsPage).not.toContain('rounded-md border border-ui-border bg-ui-bg p-1');
  });

  it('only marks newly launched runs as waiting for approval when an approval gate exists', () => {
    const workflows = createDefaultWorkflowDefinitions();

    expect(getOptimisticWorkflowRunStatus(getWorkflowById(workflows, 'cluster-triage') as WorkflowDefinition)).toBe('dispatching');
    expect(getOptimisticWorkflowRunStatus(getWorkflowById(workflows, 'repository-operation') as WorkflowDefinition)).toBe('waiting_approval');
    expect(getOptimisticWorkflowRunStatus(getWorkflowById(workflows, 'incident-report-pdf') as WorkflowDefinition)).toBe('waiting_approval');
  });

  it('blocks workflow launch until status, message, agent assignment, and run permissions are ready', () => {
    const [readOnlyWorkflow] = createDefaultWorkflowDefinitions();
    const readWriteWorkflow = getWorkflowById(createDefaultWorkflowDefinitions(), 'repository-operation') as WorkflowDefinition;
    const permissions = {
      create_sessions: true,
      create_read_only_runs: true,
      create_read_write_runs: false
    };

    expect(getWorkflowLaunchBlocker(readOnlyWorkflow, 'Start triage', permissions)).toBeNull();
    expect(getWorkflowLaunchBlocker({ ...readOnlyWorkflow, status: 'paused' }, 'Start triage', permissions)).toBe('Activate this workflow before launching it.');
    expect(getWorkflowLaunchBlocker(readOnlyWorkflow, '   ', permissions)).toBe('Add a control message before launching.');
    expect(getWorkflowLaunchBlocker({ ...readOnlyWorkflow, primaryAgent: { ...readOnlyWorkflow.primaryAgent, agentId: '' } }, 'Start triage', permissions)).toBe('Assign a primary agent before launching.');
    expect(getWorkflowLaunchBlocker(readOnlyWorkflow, 'Start triage', { ...permissions, create_sessions: false })).toBe('You need create_sessions to launch workflows.');
    expect(getWorkflowLaunchBlocker(readWriteWorkflow, 'Start operation', permissions)).toBe('You need create_read_write_runs to launch this workflow.');
  });
});

describe('WorkspaceWorkflowsPage integration surface', () => {
  it('adds Workflows as a top-level workspace route in desktop and mobile navigation', () => {
    expect(desktopSidebar).toContain("label={t('app.workflows')}");
    expect(desktopSidebar).toContain('AppPaths.workspaceWorkflows(selectedWorkspaceId)');
    expect(mobileNavigation).toContain("['workflows', t('app.workflows'), AppPaths.workspaceWorkflows, 0]");
  });

  it('lazy loads the workflows page for the workspace workflows route', () => {
    expect(appPageContent).toContain("const loadWorkspaceWorkflowsPage = () =>");
    expect(appPageContent).toContain("import('@/pages/WorkspaceWorkflowsPage')");
    expect(appPageContent).toContain("case 'workspaceWorkflows':");
    expect(appPageContent).toContain('void loadWorkspaceWorkflowsPage();');
    expect(appPageContent).toContain("route.kind === 'workspaceWorkflows'");
    expect(appPageContent).toContain('<WorkspaceWorkflowsPage');
  });

  it('presents workflows as agent assignment, target context, capability review, and governed runs', () => {
    expect(workflowsPage).toContain("activeTab === 'overview'");
    expect(workflowsPage).toContain("activeTab === 'agents'");
    expect(workflowsPage).toContain("activeTab === 'targets'");
    expect(workflowsPage).toContain("activeTab === 'capabilities'");
    expect(workflowsPage).toContain("activeTab === 'runs'");
    expect(workflowsPage).toContain("activeTab === 'settings'");
    expect(workflowsPage).toContain('Assigned agents');
    expect(workflowsPage).toContain('Review agents');
    expect(workflowsPage).toContain('getWorkflowToolScopeSummary(selectedWorkflow)');
    expect(workflowsPage).toContain("variant=\"accent\"");
    expect(workflowsPage).toContain('Create workflow');
    expect(workflowsPage).toContain('createWorkflowStep');
    expect(workflowsPage).toContain('canManageWorkflowScope={canManageWorkflowScope}');
    expect(workflowsPage).toContain('Create workflow steps');
    expect(workflowsPage).toContain('createDraft.primaryAgentId');
    expect(workflowsPage).toContain('Primary agent');
    expect(workflowsPage).toContain('Step 1');
    expect(workflowsPage).toContain('Identity');
    expect(workflowsPage).toContain('Step 2');
    expect(workflowsPage).toContain('Capabilities');
    expect(workflowsPage).toContain('Step 3');
    expect(workflowsPage).toContain('Review');
    expect(workflowsPage).toContain('Advanced scope');
    expect(workflowsPage).toContain('role="dialog"');
    expect(workflowsPage).toContain('aria-describedby="create-workflow-description"');
    expect(workflowsPage).toContain('onKeyDown={handleWorkflowCreateDrawerKeyDown}');
    expect(workflowsPage).toContain('Close create workflow drawer');
    expect(workflowsPage).not.toContain('<summary className="cursor-pointer text-sm font-semibold text-ui-text">Advanced scope</summary>');
    expect(workflowsPage).not.toContain('<details className="rounded-md border border-ui-border bg-ui-bg px-3 py-2" open>');
    expect(workflowsPage).toContain('Control message');
    expect(workflowsPage).toContain('Launch workflow');
    expect(workflowsPage).toContain('launchBlocker');
    expect(workflowsPage).toContain('workflowSearchTags');
    expect(workflowsPage).toContain('appendWorkflowSearchTag(current, tag)');
    expect(workflowsPage).not.toContain('list="workflow-search-tags"');
    expect(workflowsPage).toContain('Search workflows');
    expect(workflowsPage).not.toContain('Server-defined');
    expect(workflowsPage).not.toContain("activeTab === 'definition'");
    expect(workflowsPage).not.toContain("activeTab === 'access'");
    expect(workflowsPage).not.toContain("setActiveTab('runs')");
    expect(workflowsPage).not.toContain('Prepare run');
    expect(workflowsPage).not.toContain('Workflow chat history is workspace-scoped and separate from target chat sessions.');
    expect(workflowsPage).not.toContain('Trigger input');
    expect(workflowsPage).not.toContain('createDraft.category');
    expect(workflowsPage).not.toContain('<span className="type-micro-label">Policy</span>');
    expect(workflowsPage).not.toContain('Required permissions');
  });

  it('keeps assigned-agent summaries flat instead of nesting boxed rows inside boxed sections', () => {
    expect(workflowsPage).toContain('const AgentAssignmentList');
    expect(workflowsPage).toContain('divide-y divide-ui-border');
    expect(workflowsPage).toContain('No supporting agents assigned.');
    expect(workflowsPage).not.toContain('rounded-md border border-ui-border bg-ui-bg p-3 text-sm font-semibold text-ui-text-muted">No supporting agents assigned.');
    expect(workflowsPage).not.toContain('border border-ui-border bg-ui-bg p-3 ${roomy');
  });

  it('renders every workflow subtab through the same operational panel pattern', () => {
    expect(workflowsPage).toContain('const WorkflowTabPanel');
    expect(workflowsPage).toContain('const WorkflowSection');
    expect(workflowsPage.match(/<WorkflowTabPanel\b/g) ?? []).toHaveLength(6);
    expect(workflowsPage).toContain('aria-label="Workflow section tabs"');
    expect(workflowsPage).not.toContain('max-w-4xl');
    expect(workflowsPage).not.toContain('max-w-5xl');
  });

  it('keeps workflow discovery search-only without the category filter row', () => {
    expect(workflowsPage).toContain('Workflow library');
    expect(workflowsPage).toContain('Matching workflows');
    expect(workflowsPage).toContain('placeholder="Search workflows, agents, tools, tags"');
    expect(workflowsPage).toContain('{visibleWorkflows.length} of {workflows.length} workflows');
    expect(workflowsPage).toContain('className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 sm:justify-between"');
    expect(workflowsPage).toContain('<div className="type-micro-label text-ui-text">{query.trim() ? \'Matching workflows\' : \'Workflow library\'}</div>');
    expect(workflowsPage).toContain('<div className="type-caption font-semibold text-ui-text-muted">{visibleWorkflows.length} of {workflows.length} workflows</div>');
    expect(workflowsPage).not.toContain('type-caption mt-1 font-semibold text-ui-text-muted">{visibleWorkflows.length} of {workflows.length} workflows');
    expect(workflowsPage).not.toContain('border-y border-ui-border/80 bg-ui-surface-strong/65');
    expect(workflowsPage).not.toContain('className="bg-ui-surface pl-9 shadow-sm lg:w-full"');
    expect(workflowsPage).toContain('No workflows match this search.');
    expect(workflowsPage).not.toContain('aria-label="Workflow category filters"');
    expect(workflowsPage).not.toContain('Workflow categories');
    expect(workflowsPage).not.toContain('rounded-lg border border-ui-border bg-ui-surface p-3 shadow-sm');
  });

  it('keeps workflow page actions in the route header like agents', () => {
    expect(workflowsPage).toContain('<div className="flex flex-col gap-2 sm:flex-row sm:items-center">');
    expect(workflowsPage).toContain('className="lg:w-80"');
    expect(workflowsPage).toContain('Create workflow');
    expect(workflowsPage).toContain('disabled={!canManageWorkflowScope}');
    expect(workflowActions).toContain('if (!canManageWorkflowScope)');
    expect(workflowActions).toContain('You need manage_workflows to create workflows.');
    expect(workflowsPage).toContain('className="grid gap-5 bg-ui-bg/45 p-4 sm:p-5');
  });

  it('keeps the route wrapper inside the app shell on mobile', () => {
    expect(workflowsPage).toContain('className="min-h-0 w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar sm:px-6 lg:px-10 lg:py-8"');
    expect(workflowsPage).not.toContain('w-[100vw] max-w-[100vw]');
  });

  it('reserves accent buttons for launch while using shared type tokens', () => {
    expect(workflowsPage).toContain('<h2 className="mt-3 type-section-title">{selectedWorkflow.name}</h2>');
    expect(workflowsPage).not.toContain('text-2xl font-semibold tracking-normal');
    expect(workflowsPage.match(/variant="accent"/g) ?? []).toHaveLength(1);
    expect(workflowsPage).toContain('<Button variant="accent" size="md" onClick={() => void workflowActions.launchSelectedWorkflow()}');
    expect(workflowsPage).toContain('<Button type="button" variant="secondary" size="md" className="whitespace-nowrap"');
    expect(workflowsPage).toContain('onCreate={() => void workflowActions.createNewWorkflow()}');
    expect(workflowsPage).toContain('<Button type="button" variant="primary" size="sm" onClick={onCreate}');
  });

  it('surfaces workflow run approvals for review and server-side decisions', () => {
    expect(workflowsPage).toContain('listWorkflowRunApprovals');
    expect(workflowsPage).toContain('listWorkflowRunEvents');
    expect(workflowActions).toContain('cancelWorkflowRun');
    expect(workflowActions).toContain('decideWorkflowRunApproval');
    expect(workflowsPage).toContain('approvalRecords');
    expect(workflowsPage).toContain('TraceFooter');
    expect(workflowsPage).toContain('window.setInterval');
    expect(workflowsPage).toContain('2500');
    expect(workflowsPage).toContain('Stop workflow run');
    expect(workflowsPage).toContain('Approve');
    expect(workflowsPage).toContain('Reject');
  });

  it('reviews effective capabilities without configuring new MCP servers or skills directly on workflows', () => {
    expect(workflowsPage).toContain('Capability review');
    expect(workflowsPage).toContain('Inherited access');
    expect(workflowsPage).toContain('Workflow restrictions');
    expect(workflowsPage).toContain('const CapabilityReviewRow');
    expect(workflowsPage).toContain('Primary agent');
    expect(workflowsPage).toContain('Supporting agents');
    expect(workflowsPage).toContain('Target context');
    expect(workflowsPage).toContain('const WorkflowScopeRow');
    expect(workflowsPage).not.toContain('<TokenGroup title="Target selection"');
    expect(workflowsPage).not.toContain('<TokenGroup title="Context grants"');
    expect(workflowsPage).not.toContain('<TokenGroup title="Assigned-agent MCP servers"');
    expect(workflowsPage).not.toContain('<TokenGroup title="Assigned-agent skills"');
    expect(workflowsPage).not.toContain('<TokenGroup title="Allowed tools"');
    expect(workflowsPage).not.toContain('<TokenGroup title="Disabled by workflow gate"');
    expect(workflowsPage).toContain('Workflow gate');
    expect(workflowsPage).toContain('Approvals');
    expect(workflowsPage).not.toContain('Add server');
    expect(workflowsPage).toContain('selectedScopeDirty');
    expect(workflowsPage).toContain('Edit capability gate');
    expect(workflowsPage).toContain('Save capability gate');
    expect(workflowsPage).toContain("scopeSaveResult?.tab === 'capabilities'");
    expect(workflowsPage).not.toContain('Discard');
    expect(workflowsPage).not.toContain('testWorkflowMcpServerConnection');
    expect(workflowHelpers).toContain('role="switch"');
    expect(workflowActions).toContain('Workflow capability gate saved. Future sessions will use the narrowed access.');
    expect(workflowActions).toContain('setScopeSaveResult');
    expect(workflowActions).toContain('enabledMcpServers: selectedWorkflow.enabledMcpServers');
    expect(workflowActions).toContain('enabledSkills: selectedWorkflow.enabledSkills');
    expect(workflowActions).toContain('assignedAgentIds');
    expect(workflowActions).toContain("setActiveTab('overview')");
    expect(workflowHelpers).toContain('primaryAgentId');
    expect(workflowActions).not.toContain('category: draft.category');
    expect(workflowsPage).not.toContain("['MCP servers', 'allowedMcpServers']");
    expect(workflowsPage).not.toContain("['Allowed tools', 'allowedTools']");
  });

  it('lets operators edit and delete user-authored workflow definitions without category authoring', () => {
    expect(workflowActions).toContain('updateWorkflow');
    expect(workflowActions).toContain('deleteWorkflow');
    expect(workflowsPage).toContain('const canManageWorkflowScope = Boolean(workspace.permissions?.manage_workflows);');
    expect(workflowsPage).not.toContain('const canManageWorkflowScope = Boolean(workspace.permissions?.manage_mcp);');
    expect(workflowsPage).toContain('startEditingWorkflow');
    expect(workflowsPage).toContain('saveWorkflowDefinition');
    expect(workflowsPage).toContain('toggleWorkflowActive');
    expect(workflowsPage).toContain('Toggle workflow active state');
    expect(workflowsPage).toContain('deleteSelectedWorkflow');
    expect(workflowsPage).toContain("selectedWorkflow.source !== 'user'");
    expect(workflowActions).toContain('Workflow updated.');
    expect(workflowsPage).not.toContain('WORKFLOW_CATEGORY_INVALID');
  });

  it('lets operators add and remove workflow tags without changing MCP scope categories', () => {
    expect(workflowsPage).toContain('addWorkflowTag');
    expect(workflowsPage).toContain('removeWorkflowTag');
    expect(workflowsPage).toContain('Workflow tags');
    expect(workflowsPage).toContain('Add tag');
    expect(workflowsPage).toContain('aria-label={`Remove workflow tag ${tag}`}');
  });
});
