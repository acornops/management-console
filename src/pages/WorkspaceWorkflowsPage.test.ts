import { readFileSync } from 'node:fs'; import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  appendWorkflowSearchTag,
  createDefaultWorkflowDefinitions,
  findWorkflowByRouteTarget,
  filterWorkflowDefinitions,
  getWorkflowById,
  getWorkflowLaunchBlocker,
  getWorkflowRouteQuery,
  getWorkflowRouteSelectionTarget,
  getOptimisticWorkflowRunStatus,
  getWorkflowTabLabel,
  getWorkflowToolScopeSummary,
  type WorkflowDefinition,
  type WorkflowTab
} from './workflows/workflowModel';
import { createDefaultAgentDefinitions } from './agents/agentModel';
import {
  buildWorkflowCreateInput,
  createWorkflowDraft,
  createFallbackWorkflowOptions,
  getWorkflowScopeOptionsForAgents,
  getRunDiscussionState,
  isTerminalRunStatus,
  mapApiWorkflowToDefinition,
  mergeWorkflowRunsWithLocalDispatches
} from './workflows/workflowPageHelpers';

const root = resolve(__dirname, '../..');
const workflowsPage = [
  'src/pages/WorkspaceWorkflowsPage.tsx', 'src/pages/WorkspaceWorkflowsPage.components.tsx',
  'src/pages/WorkspaceWorkflowsPage.launchFields.tsx',
  'src/pages/WorkspaceWorkflowsPage.createDrawer.tsx', 'src/pages/WorkspaceWorkflowsPage.scope.tsx',
  'src/pages/WorkspaceWorkflowsPage.panels.tsx'
].map((filePath) => readFileSync(resolve(root, filePath), 'utf8')).join('\n');
const workflowActions = ['src/pages/workflows/useWorkspaceWorkflowActions.ts', 'src/pages/workflows/workflowScopeActions.ts']
  .map((filePath) => readFileSync(resolve(root, filePath), 'utf8')).join('\n');
const workflowHelpers = readFileSync(resolve(root, 'src/pages/workflows/workflowPageHelpers.tsx'), 'utf8');
const desktopSidebar = readFileSync(resolve(root, 'src/app/AppDesktopSidebar.tsx'), 'utf8');
const mobileNavigation = readFileSync(resolve(root, 'src/app/AppMobileNavigation.tsx'), 'utf8');
const appPageContent = readFileSync(resolve(root, 'src/app/AppPageContent.tsx'), 'utf8');
const workspaceNavigation = readFileSync(resolve(root, 'src/app/workspaceNavigation.tsx'), 'utf8');

function expectSnippets(source: string, snippets: string[]): void {
  snippets.forEach((snippet) => expect(source).toContain(snippet));
}

function expectMissingSnippets(source: string, snippets: string[]): void {
  snippets.forEach((snippet) => expect(source).not.toContain(snippet));
}

describe('WorkspaceWorkflowsPage model', () => {
  it('ships governed workspace automation examples assigned to durable agents', () => {
    const workflows = createDefaultWorkflowDefinitions();
    const agentIds = new Set(createDefaultAgentDefinitions().map((agent) => agent.id));
    const workflowAgentIds = workflows.flatMap((workflow) => [
      ...workflow.agents.map((agent) => agent.agentId),
      ...workflow.steps.flatMap((step) => step.agentIds || [])
    ]).filter(Boolean);

    expect(workflows.map((workflow) => workflow.id)).toEqual([
      'cluster-triage',
      'repository-operation',
      'incident-report-pdf'
    ]);
    expect(workflowAgentIds.every((agentId) => agentIds.has(agentId))).toBe(true);
    expect(workflows.every((workflow) => workflow.scope.type === 'workspace')).toBe(true);
    expect(workflows.every((workflow) => workflow.orchestrator.agentId === 'agent-workflow-orchestrator')).toBe(true);
    expect(workflows.every((workflow) => workflow.agents.length > 0)).toBe(true);
    expect(workflows.some((workflow) => workflow.contextGrants.includes('selected_chat_sessions'))).toBe(true);
    expect(workflows.some((workflow) => workflow.agents.some((agent) => agent.name === 'Repository Operator'))).toBe(true);
  });

  it('filters the workflow library by name, enabled skills, MCP scope, and permission copy', () => {
    const workflows = createDefaultWorkflowDefinitions();

    expect(filterWorkflowDefinitions(workflows, 'cluster').map((workflow) => workflow.id)).toEqual(['cluster-triage']);
    expect(filterWorkflowDefinitions(workflows, 'repository').map((workflow) => workflow.id)).toEqual(['repository-operation']);
    expect(filterWorkflowDefinitions(workflows, 'approval').map((workflow) => workflow.id)).toEqual([
      'repository-operation',
      'incident-report-pdf'
    ]);
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

  it('hydrates workflow search and selection from agent catalog backlinks', () => {
    const workflows = createDefaultWorkflowDefinitions('workspace-1');

    expect(getWorkflowRouteQuery('?workflow=Repository%20operation&q=Repository%20operation')).toBe('Repository operation');
    expect(getWorkflowRouteSelectionTarget('?workflow=Repository%20operation&q=Repository%20operation')).toBe('Repository operation');
    expect(findWorkflowByRouteTarget(workflows, 'Repository operation')?.id).toBe('repository-operation');
    expect(findWorkflowByRouteTarget(workflows, 'repository-operation')?.name).toBe('Repository operation');
    expect(findWorkflowByRouteTarget(workflows, 'missing')).toBeUndefined();
  });

  it('uses URL route state to open the workflow selected from agent backlinks', () => {
    expect(workflowsPage).toContain('getWorkflowRouteQuery(window.location.search)');
    expect(workflowsPage).toContain('getWorkflowRouteSelectionTarget(window.location.search)');
    expect(workflowsPage).toContain('findWorkflowByRouteTarget(fallbackWorkflows, initialWorkflowTarget)');
    expect(workflowsPage).toContain('findWorkflowByRouteTarget(mapped, initialWorkflowTarget)');
  });

  it('summarizes effective capabilities as workflow gates over assigned agents', () => {
    const workflows = createDefaultWorkflowDefinitions();
    const triageWorkflow = getWorkflowById(workflows, 'cluster-triage');

    expect(triageWorkflow?.policy.mode).toBe('read_only');
    expect(getWorkflowToolScopeSummary(triageWorkflow as WorkflowDefinition)).toBe('Kubernetes Diagnostics, 3 allowed tools, read only');
  });

  it('keeps workflow detail tabs aligned with agent assignment and capability review', () => {
    const tabs: WorkflowTab[] = ['overview', 'agents', 'capabilities', 'runs', 'settings'];

    expect(tabs.map(getWorkflowTabLabel)).toEqual(['Overview', 'Agents', 'Capability review', 'Runs', 'Settings']);
  });

  it('uses bottom-underline workflow detail tabs instead of boxed pills', () => {
    expect(workflowsPage).toContain("SegmentedTabs, Textarea, TextInput } from '@/components/common/ComponentVocabulary';");
    expect(workflowsPage).toContain("import { Textarea } from '@/components/common/ComponentVocabulary';");
    expect(workflowsPage).toContain('<SegmentedTabs<WorkflowTab>');
    expect(workflowsPage).toContain('ariaLabel="Workflow section tabs"');
    expect(workflowsPage).toContain('idBase="workflow-section"');
    expect(workflowsPage).not.toContain('rounded-md border border-ui-border bg-ui-bg p-1');
  });

  it('only marks newly launched runs as waiting for approval when an approval gate exists', () => {
    const workflows = createDefaultWorkflowDefinitions();

    expect(getOptimisticWorkflowRunStatus(getWorkflowById(workflows, 'cluster-triage') as WorkflowDefinition)).toBe('dispatching');
    expect(getOptimisticWorkflowRunStatus(getWorkflowById(workflows, 'repository-operation') as WorkflowDefinition)).toBe('waiting_approval');
    expect(getOptimisticWorkflowRunStatus(getWorkflowById(workflows, 'incident-report-pdf') as WorkflowDefinition)).toBe('waiting_approval');
  });

  it('blocks workflow launch until status, message, and run permissions are ready', () => {
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
    expect(getWorkflowLaunchBlocker(readOnlyWorkflow, 'Start triage', { ...permissions, create_sessions: false })).toBe('You need create_sessions to launch workflows.');
    expect(getWorkflowLaunchBlocker({ ...readWriteWorkflow, status: 'active' }, 'Start operation', permissions)).toBe('You need create_read_write_runs to launch this workflow.');
  });

  it('builds user-authored workflow payloads with selected agents', () => {
    const draft = {
      ...createWorkflowDraft(),
      name: 'Incident follow up',
      description: 'Coordinate the after-action workflow.',
      starterPrompt: 'Prepare the follow up.',
      agentIds: ['agent-incident-owner', 'agent-cluster-triage', 'agent-release-coordinator'],
      enabledMcpServers: 'github',
      enabledSkills: 'acornops-open-pr',
      allowedTools: 'github.prs.create'
    };

    const input = buildWorkflowCreateInput(draft);

    expect(input.steps?.[0]?.agentIds).toEqual([
      'agent-incident-owner',
      'agent-cluster-triage',
      'agent-release-coordinator'
    ]);
    expect(input.starterPrompt).toBe('Prepare the follow up.');
    expect(input.steps?.[0]?.id).toBe('incident-follow-up-step');
    expect(input.steps?.[0]?.title).toBe('Generate run plan');
  });

  it('derives workflow create scope choices from selected agents', () => {
    const agents = createDefaultAgentDefinitions();
    const globalCatalog = createFallbackWorkflowOptions(createDefaultWorkflowDefinitions());

    const repositoryOnly = getWorkflowScopeOptionsForAgents(['agent-release-coordinator'], agents, globalCatalog);
    expect(repositoryOnly.mcpServers).toEqual([]);
    expect(repositoryOnly.mcpTools).toEqual([]);
    expect(repositoryOnly.skills.map((option) => option.value)).toEqual([
      'acornops-cross-repo-change',
      'acornops-open-pr'
    ]);
    expect(repositoryOnly.mcpTools.map((option) => option.value)).not.toContain('list_resources');

    const repositoryWithTriage = getWorkflowScopeOptionsForAgents(['agent-release-coordinator', 'agent-cluster-triage'], agents, globalCatalog);
    expect(repositoryWithTriage.mcpServers.map((option) => option.value)).toEqual(['acornops-target-agent']);
    expect(repositoryWithTriage.skills.map((option) => option.value)).toContain('acornops-target-boundary-design');
  });

  it('maps API workflow agent IDs through the workflow options catalog instead of lowercasing IDs', () => {
    const workflow = mapApiWorkflowToDefinition({
      id: 'workflow-1',
      workspaceId: 'workspace-1',
      version: 1,
      source: 'user',
      name: 'Repository workflow',
      status: 'active',
      requiredPermissions: ['read_workspace_data'],
      policy: {
        mode: 'read_only',
        maxRuntimeSeconds: 900,
        retentionDays: 90,
        approvalRequirements: []
      },
      steps: [{
        id: 'repository-step',
        title: 'Run repository step',
        requiredInputs: [],
        agentIds: ['agent-release-coordinator', 'agent-cluster-triage'],
        enabledSkills: [],
        allowedMcpServers: [],
        allowedTools: [],
        contextGrants: [],
        approvalRequired: false
      }]
    }, undefined, 'workspace-1', {
      ...createFallbackWorkflowOptions(createDefaultWorkflowDefinitions()),
      agents: [
        { value: 'agent-release-coordinator', label: 'Repository Operator' },
        { value: 'agent-cluster-triage', label: 'Kubernetes Diagnostics' }
      ]
    });

    expect(workflow.agents.map((agent) => agent.name)).toEqual(['Repository Operator', 'Kubernetes Diagnostics']);
  });

  it('keeps locally dispatched workflow runs visible until session polling confirms them', () => {
    const [workflow] = createDefaultWorkflowDefinitions();
    const localRun: WorkflowDefinition['runs'][number] = {
      id: 'workflow-run-local',
      runId: 'run-local',
      status: 'dispatching',
      actor: 'You',
      duration: 'Queued',
      approvals: 0,
      output: 'Workflow run dispatched to execution engine.',
      startedAt: 'Just now'
    };
    const olderServerRun: WorkflowDefinition['runs'][number] = {
      id: 'workflow-run-older',
      runId: 'run-older',
      status: 'completed',
      actor: 'Operator',
      duration: 'Completed',
      approvals: 0,
      output: 'Older run completed.',
      startedAt: '2026-06-23T00:00:00.000Z'
    };

    expect(mergeWorkflowRunsWithLocalDispatches([], [localRun])).toEqual([localRun]);
    expect(mergeWorkflowRunsWithLocalDispatches([olderServerRun], [localRun])).toEqual([localRun, olderServerRun]);
    expect(mergeWorkflowRunsWithLocalDispatches([{ ...localRun, status: 'running', actor: 'Control plane' }], [localRun])).toEqual([
      { ...localRun, status: 'running', actor: 'Control plane' }
    ]);
    expect(mergeWorkflowRunsWithLocalDispatches(workflow.runs, [])).toEqual(workflow.runs);
  });

  it('shows a local workflow run before waiting for launch API calls', () => {
    expect(workflowActions).toContain('const optimisticRunId = `local-workflow-run-${Date.now()}`;');
    expect(workflowActions).toContain('setActiveTab(\'runs\');');
    expect(workflowActions.indexOf('setActiveTab(\'runs\');')).toBeLessThan(
      workflowActions.indexOf('await createWorkflowSession')
    );
    expect(workflowActions.indexOf('setPendingWorkflowRuns')).toBeLessThan(
      workflowActions.indexOf('await createWorkflowSession')
    );
    expect(workflowActions).toContain("status: 'failed'");
  });

  it('supports operator instructions inside an expanded active workflow run', () => {
    expectSnippets(workflowsPage, ['workflowRunMessages', 'workflowRunMessageDrafts', 'workflowSessionId={workflowSessionIds[selectedWorkflow.id] || \'\'}', 'runMessagesByRunId={workflowRunMessages}', 'Run discussion', 'Send instruction', 'This run cannot accept more instructions. Start a follow-up run or retry from the workflow action.', "discussionState === 'active'", "discussionState === 'waiting_session'", "run.status === 'failed'", 'function WorkflowRunInstructionForm', 'instructionTextareaRef', 'textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;', 'rounded-lg border border-ui-border bg-ui-surface', 'resize-none overflow-y-auto border-0 bg-transparent', "event.key === 'Enter' && !event.shiftKey", 'event.preventDefault();', 'void workflowActions.sendWorkflowRunMessage(effectiveRunId, workflowSessionId);']);
    expectMissingSnippets(workflowsPage, ['Message workflow', 'Workflow conversation', 'Session connected']);
    expectSnippets(workflowActions, ['async function sendWorkflowRunMessage(runId: string, sessionId: string): Promise<void>', 'await postWorkflowSessionMessage(workspace.id, sessionId, {', 'role: \'operator\'', 'status: \'sending\'', 'status: \'failed\'']);
  });

  it('derives run discussion state from run activity and session readiness', () => {
    const [workflow] = createDefaultWorkflowDefinitions();
    const activeRun: WorkflowDefinition['runs'][number] = { ...workflow.runs[0], status: 'running' };
    const failedRun: WorkflowDefinition['runs'][number] = { ...workflow.runs[0], status: 'failed' };

    expect(isTerminalRunStatus('completed')).toBe(true);
    expect(isTerminalRunStatus('failed')).toBe(true);
    expect(isTerminalRunStatus('cancelled')).toBe(true);
    expect(isTerminalRunStatus('running')).toBe(false);
    expect(getRunDiscussionState(activeRun, 'session-1')).toBe('active');
    expect(getRunDiscussionState(activeRun, '')).toBe('waiting_session');
    expect(getRunDiscussionState(failedRun, 'session-1')).toBe('terminal');
  });
});

describe('WorkspaceWorkflowsPage integration surface', () => {
  it('adds Workflows as a top-level workspace route in desktop and mobile navigation', () => {
    expect(workspaceNavigation).toContain("id: 'workflows'");
    expect(workspaceNavigation).toContain("label: t('app.workflows')");
    expect(workspaceNavigation).toContain('AppPaths.workspaceWorkflows(workspace.id)');
    expect(desktopSidebar).toContain('getWorkspaceNavigationGroups');
    expect(mobileNavigation).toContain('getWorkspaceNavigationGroups');
    expect(workspaceNavigation).toContain("label: t('app.library')");
    expect(workspaceNavigation).toContain('AppPaths.workspaceSchedules(workspace.id)');
    expect(workflowsPage).not.toContain('WorkspaceAutomationRouteNav');
  });

  it('lazy loads the workflows page for the workspace workflows route', () => {
    expect(appPageContent).toContain("const loadWorkspaceWorkflowsPage = () =>");
    expect(appPageContent).toContain("import('@/pages/WorkspaceWorkflowsPage')");
    expect(appPageContent).toContain("case 'workspaceWorkflows':");
    expect(appPageContent).toContain('void loadWorkspaceWorkflowsPage();');
    expect(appPageContent).toContain("route.kind === 'workspaceWorkflows'");
    expect(appPageContent).toContain('<WorkspaceWorkflowsPage');
  });

  it('presents workflows as agent selection, capability review, and governed runs', () => {
    expect(workflowsPage).toContain("activeTab === 'overview'");
    expect(workflowsPage).toContain("activeTab === 'agents'");
    expect(workflowsPage).toContain("activeTab === 'capabilities'");
    expect(workflowsPage).toContain("activeTab === 'runs'");
    expect(workflowsPage).toContain("activeTab === 'settings'");
    expect(workflowsPage).not.toContain("activeTab === 'targets'");
    expect(workflowsPage).not.toContain("tab=\"targets\"");
    expect(workflowHelpers).toContain("export const tabs: WorkflowTab[] = ['overview', 'agents', 'capabilities', 'runs', 'settings'];");
    expect(workflowsPage).toContain('Workflow agents');
    expect(workflowsPage).toContain('Review agents');
    expect(workflowsPage).not.toContain('Runtime access');
    expect(workflowsPage).not.toContain('Workflow gate');
    expect(workflowsPage).toContain("variant=\"activation\"");
    expect(workflowsPage).toContain('Create workflow');
    expect(workflowsPage).toContain('createWorkflowStep');
    expect(workflowsPage).toContain('canManageWorkflowScope={canManageWorkflowScope}');
    expect(workflowsPage).toContain("import { ModalStepIndicator } from '@/components/common/ModalStepIndicator'");
    expect(workflowsPage).toContain('Create workflow setup');
    expect(workflowsPage).toContain('createDraft.agentIds');
    expect(workflowsPage).toContain('Coordinator: System Orchestrator');
    expect(workflowsPage).toContain('Selected agents');
    expect(workflowsPage).toContain('selectedAgentSelectionDraft');
    expect(workflowsPage).toContain('Edit agents');
    expect(workflowsPage).toContain('Save agents');
    expect(workflowActions).toContain('saveAgentSelection');
    expect(workflowActions).toContain('agentIds: selectedAgentIds');
    expect(workflowsPage).toContain('Describe');
    expect(workflowsPage).toContain('Access');
    expect(workflowsPage).toContain('Review');
    expect(workflowsPage).toContain('<ModalStepIndicator');
    expect(workflowsPage).toContain('steps={createWorkflowSteps}');
    expect(workflowsPage).toContain('currentStepId={`${createWorkflowStep}`}');
    expect(workflowsPage).toContain('onStepSelect={(stepId) => goToCreateWorkflowStep(Number(stepId) as CreateWorkflowStep)}');
    expect(workflowsPage).toContain('const [stepNavigationError, setStepNavigationError] = React.useState(\'\');');
    expect(workflowsPage).toContain('Step 1 is not done. Enter a workflow name before continuing.');
    expect(workflowsPage).toContain('role="status" aria-live="polite"');
    expect(workflowsPage).not.toContain('sm:grid-cols-3');
    expect(workflowsPage).not.toContain('aria-current={createWorkflowStep === item.step ?');
    expect(workflowsPage).toContain('Advanced scope');
    expect(workflowsPage).toContain('Workflow prompt');
    expect(workflowsPage).toContain('<RightSidePanel');
    expect(workflowsPage).toContain('descriptionId="create-workflow-description"');
    expect(workflowsPage).toContain('Define the run prompt, selected agents, and optional capability restrictions.');
    expect(workflowsPage).not.toContain('handleWorkflowCreateDrawerKeyDown');
    expect(workflowsPage).toContain('Close create workflow drawer');
    expect(workflowsPage).not.toContain('<summary className="cursor-pointer text-sm font-semibold text-ui-text">Advanced scope</summary>');
    expect(workflowsPage).not.toContain('<details className="rounded-md border border-ui-border bg-ui-bg px-3 py-2" open>');
    expect(workflowsPage).toContain('Control message');
    expect(workflowsPage).toContain('Launch workflow');
    expect(workflowsPage).not.toContain('Launch readiness');
    expect(workflowsPage).not.toContain('WorkflowLaunchReadiness');
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

  it('waits for the workflow catalog before polling workflow sessions', () => {
    expect(workflowsPage).toContain('const [workflowCatalogReady, setWorkflowCatalogReady] = useState(false);');
    expect(workflowsPage).toContain('setWorkflowCatalogReady(false);');
    expect(workflowsPage).toContain('setWorkflowCatalogReady(true);');
    expect(workflowsPage).toContain('setWorkflowCatalogReloadKey');
    expect(workflowsPage).toContain('WorkflowLoadFallbackNotice');
    expect(workflowsPage).toContain('if (!workflowCatalogReady || !selectedWorkflow) return;');
    expect(workflowsPage).toContain('}, [selectedWorkflow?.id, workspace.id, workflowCatalogReady]);');
    expect(workflowsPage).toContain('}, [fallbackWorkflows, initialWorkflowTarget, workspace.id, workflowCatalogReloadKey, workflowOwnerLabelsByUserId]);');
  });

  it('updates pending workflow run refs synchronously before session polling can overwrite runs', () => {
    expect(workflowsPage).toContain('const [pendingWorkflowRuns, setPendingWorkflowRunsState] = useState<Record<string, WorkflowDefinition[\'runs\']>>({});');
    expect(workflowsPage).toContain('function setPendingWorkflowRuns(update: PendingWorkflowRunsUpdate): void');
    expect(workflowsPage).toContain('pendingWorkflowRunsRef.current = next;');
    expect(workflowsPage).toContain('const pendingRuns = pendingWorkflowRunsRef.current[workflow.id] || [];');
    expect(workflowsPage).toContain('mergeWorkflowRunsWithLocalDispatches(workflow.runs, pendingRuns)');
    expect(workflowsPage.indexOf('pendingWorkflowRunsRef.current = next;')).toBeLessThan(
      workflowsPage.indexOf('setPendingWorkflowRunsState(next);')
    );
    expect(workflowsPage).not.toContain('pendingWorkflowRunsRef.current = pendingWorkflowRuns;');
  });

  it('keeps selected-agent summaries flat instead of nesting boxed rows inside boxed sections', () => {
    expect(workflowsPage).toContain('const AgentAssignmentList');
    expect(workflowsPage).toContain('divide-y divide-ui-border');
    expect(workflowsPage).toContain('No workflow agents selected.');
    expect(workflowsPage).not.toContain('rounded-md border border-ui-border bg-ui-bg p-3 text-sm font-semibold text-ui-text-muted">No workflow agents selected.');
    expect(workflowsPage).not.toContain('border border-ui-border bg-ui-bg p-3 ${roomy');
  });

  it('uses selected-agent capability restrictors instead of freeform advanced scope text boxes', () => {
    expect(workflowsPage).toContain('const WorkflowScopeMultiSelect');
    expect(workflowsPage).toContain('getWorkflowScopeOptionsForAgents(agentIdsFromDraft(createDraft), workflowAgents, workflowOptions)');
    expect(workflowsPage).toContain('options={createWorkflowScopeOptions.mcpServers}');
    expect(workflowsPage).toContain('options={createWorkflowScopeOptions.skills}');
    expect(workflowsPage).toContain('options={createWorkflowScopeOptions.mcpTools}');
    expect(workflowsPage).toContain('Available from selected agents');
    expect(workflowsPage).toContain('Workflows can only restrict capabilities inherited from selected agents.');
    expectSnippets(workflowsPage, ['label="Restrict MCP servers"', 'label="Restrict skills"', 'label="Restrict tools"', 'inline-flex min-h-11 max-w-full items-center gap-1']);
    expect(workflowsPage).toContain('disabled={options.length === 0}');
    expect(workflowsPage).toContain('aria-disabled={options.length === 0}');
    expect(workflowsPage).toContain('Select an agent with MCP servers before adding restrictions.');
    expect(workflowsPage).toContain('Select an agent with skills before adding restrictions.');
    expect(workflowsPage).toContain('Select an agent with tools before adding restrictions.');
    expect(workflowsPage).toContain('setLineValue(draft.enabledMcpServers, option.value, checked)');
    expect(workflowsPage).toContain('setLineValue(draft.enabledSkills, option.value, checked)');
    expect(workflowsPage).toContain('setLineValue(draft.allowedTools, option.value, checked)');
    expect(workflowsPage).not.toContain('Advanced scope narrows the capabilities inherited from the selected agents.');
    expect(workflowsPage).not.toContain('Choose agents with MCP servers before narrowing this scope.');
    expect(workflowsPage).not.toContain('Choose agents with skills before narrowing this scope.');
    expect(workflowsPage).not.toContain('Choose agents with tools before narrowing this scope.');
    expect(workflowsPage).not.toContain('<Textarea value={createDraft.enabledMcpServers}');
    expect(workflowsPage).not.toContain('<Textarea value={createDraft.enabledSkills}');
    expect(workflowsPage).not.toContain('<Textarea value={createDraft.allowedTools}');
    expect(workflowsPage).not.toContain('One server id per line');
    expect(workflowsPage).not.toContain('One skill id per line');
    expect(workflowsPage).not.toContain('One tool id per line');
  });

  it('renders every workflow subtab through the same operational panel pattern', () => {
    expect(workflowsPage).toContain('const WorkflowTabPanel');
    expect(workflowsPage).toContain('const WorkflowSection');
    expect((workflowsPage.match(/activeTab === '/g) ?? []).length).toBeGreaterThanOrEqual(5);
    expect(workflowsPage).toContain('ariaLabel="Workflow section tabs"');
    expect(workflowsPage).toContain('tab="overview"');
    expect(workflowsPage).toContain('role="tabpanel"');
    expect(workflowsPage).toContain('aria-labelledby={`workflow-section-${tab}-tab`}');
    expect(workflowsPage).toContain('description?: string;');
    expect(workflowsPage).toContain('{description && <p className="type-caption mt-1 w-full max-w-none text-ui-text-muted">{description}</p>}');
    expect(workflowsPage).not.toContain('space-y-5 rounded-md border border-ui-border bg-ui-surface px-4 py-4 shadow-sm sm:px-5 sm:py-5');
    expect(workflowsPage).not.toContain('max-w-4xl');
    expect(workflowsPage).not.toContain('max-w-5xl');
  });

  it('keeps workflow library rows compact and aligned on narrow screens', () => {
    expect(workflowsPage).toContain('min-w-0 w-full max-w-full space-y-3 lg:sticky lg:top-6 ${className}');
    expect(workflowsPage).not.toContain("style={{ maxWidth: 'calc(100vw - 2rem)' }}");
    expect(workflowsPage).toContain('flex flex-col gap-1 px-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3');
    expect(workflowsPage).toContain('grid gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto]');
    expect(workflowsPage).toContain('shrink-0 self-start');
    expect(workflowsPage).toContain('border-t border-ui-border/70 pt-2.5');
    expect(workflowsPage).toContain('type-caption mt-1 block whitespace-normal leading-5 text-ui-text-muted');
    expect(workflowsPage).toContain("{pluralize(workflow.agents.length, 'agent')}");
    expect(workflowsPage).toContain("{pluralize(workflow.allowedTools.length, 'tool')}");
    expect(workflowsPage).toContain('<span aria-hidden="true" className="text-ui-text-muted">·</span>');
    expect(workflowsPage).not.toContain('{workflow.allowedTools.length} tools');
    expect(workflowsPage).not.toContain('p-3.5 text-left');
    expect(workflowsPage).not.toContain('type-caption mt-1 block break-words leading-5 text-ui-text-muted [overflow-wrap:anywhere]');
  });

  it('uses guided launch-decision copy for high-stakes workflow starts', () => {
    expect(workflowsPage).not.toContain('Review owner, target scope, capability gate, approvals, and last run before launch.');
    expect(workflowsPage).not.toContain('type-body mt-3 max-w-none break-words text-ui-text-muted [overflow-wrap:anywhere]');
    expect(workflowsPage).not.toContain('Confirm the agent owner, runtime access, approval gates, and operator message before launching.');
    expect(workflowsPage).toContain('Resolve this before launch:');
  });

  it('renders workflow access mode as a badge instead of loose header text', () => {
    expect(workflowsPage).toContain('<WorkflowModeBadge mode={selectedWorkflow.policy.mode} />');
    expectSnippets(workflowsPage, ["if (mode === 'read_write') return 'read-write';", "if (mode === 'write_only') return 'write-only';", "return 'read-only';"]);
    expect(workflowsPage).not.toContain('<span className="type-caption font-semibold text-ui-text-muted">{selectedWorkflow.policy.mode.replace(\'_\', \' \')}</span>');
  });

  it('makes workflow review shortcuts visible secondary buttons with icons', () => {
    expect(workflowsPage).toContain('<Button type="button" variant="secondary" size="sm" onClick={() => selectWorkflowTab(\'agents\')}>');
    expect(workflowsPage).toContain('<ICONS.Bot className="h-4 w-4" aria-hidden="true" />');
    expect(workflowsPage).not.toContain('variant="tertiary" size="sm" onClick={onReviewCapabilities}');
    expect(workflowsPage).not.toContain('variant="tertiary" size="sm" onClick={() => setActiveTab(\'agents\')}');
  });

  it('keeps workflow tabs fitted without a horizontal scroll container', () => {
    expect(workflowsPage).toContain('className="flex flex-wrap gap-0 overflow-visible border-b border-ui-border"');
    expectMissingSnippets(workflowsPage, ['overflow-x-auto overscroll-x-contain', '[mask-image:linear-gradient']);
    expect(workflowsPage).not.toContain('<div className="bg-ui-surface px-3">\n              <SegmentedTabs<WorkflowTab>\n                activeValue={activeTab}\n                ariaLabel="Workflow section tabs"\n                items={workflowTabItems}');
  });

  it('offers workflow launch from the header without duplicating readiness cards', () => {
    expect((workflowsPage.match(/Launch workflow/g) || [])).toHaveLength(1);
    expect((workflowsPage.match(/workflowActions\.launchSelectedWorkflow\(\)/g) || [])).toHaveLength(1);
    expect(workflowsPage).toContain('disabled={launching || Boolean(launchBlocker) || needsLaunchAcknowledgement}');
    expect(workflowsPage).not.toContain('<WorkflowLaunchReadiness launchBlocker={launchBlocker} workflow={selectedWorkflow} workflowMessage={workflowMessage} />');
    expect(workflowsPage).not.toContain('<div className="flex justify-start">');
    expect(workflowsPage).not.toContain('<Button variant="primary" size="md" onClick={() => void workflowActions.launchSelectedWorkflow()}');
    expect(workflowsPage).not.toContain('Launch with the message above.');
    expect(workflowsPage).not.toContain('rounded-md border border-ui-border bg-ui-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between');
    expect(workflowsPage).toContain('Review assigned agents and the operator message used for the next run.');
  });

  it('removes duplicate workflow header facts', () => {
    expect(workflowsPage).not.toContain('Last run: {selectedWorkflow.lastRun}');
    expect(workflowsPage).not.toContain('h-12 w-12 shrink-0');
  });

  it('marks required create fields inline instead of showing a pre-save checklist', () => {
    expect(workflowsPage).toContain('id="workflow-launch-blocker"');
    expect(workflowsPage).toContain("aria-describedby={launchBlocker ? 'workflow-launch-blocker' : needsLaunchAcknowledgement ? 'workflow-launch-acknowledgement' : undefined}");
    expect(workflowsPage).not.toContain('Pre-save checklist');
    expect(workflowsPage).not.toContain('Missing: workflow name');
    expect(workflowsPage).not.toContain('Ready: workflow name');
    expect(workflowsPage).not.toContain('Supporting agents can be added after save');
    expect(workflowsPage).toContain('<RequiredFieldMarker />');
    expect(workflowsPage).toContain('Name <RequiredFieldMarker />');
    expect(workflowsPage).not.toContain('Description <RequiredFieldMarker />');
    expect(workflowsPage).not.toContain('Starting prompt <RequiredFieldMarker />');
  });

  it('adapts workflow selection guidance for narrow screens', () => {
    expect(workflowsPage).toContain('lg:hidden');
    expect(workflowsPage).toContain('Selected workflow:');
    expect(workflowsPage).not.toContain('Select a workflow to review launch readiness before launching.');
    expect(workflowsPage).toContain('{selectedWorkflow.name}');
  });

  it('puts selected workflow detail before the library on phones while preserving desktop master-detail order', () => {
    expect(workflowsPage).toContain('className?: string;');
    expect(workflowsPage).toContain('className="order-2 xl:order-1"');
    expect(workflowsPage).toContain('className="order-1 min-w-0 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm xl:order-2"');
    expect(workflowsPage.indexOf('{selectedWorkflow && (')).toBeLessThan(
      workflowsPage.indexOf('<WorkflowLibraryList')
    );
  });

  it('keeps workflow feedback accessible after launch readiness removal', () => {
    expect(workflowsPage).toContain('aria-live="polite"');
    expect(workflowsPage).toContain('aria-atomic="true"');
    expect(workflowsPage).not.toContain('aria-label="Launch readiness"');
  });

  it('announces workflow action results and exposes selected workflow controls', () => {
    expectSnippets(workflowsPage, ['role="status" aria-live="polite" aria-atomic="true"', 'role="alert" aria-live="assertive"', 'aria-current={workflow.id === selectedWorkflow?.id ? \'true\' : undefined}', 'aria-pressed={workflow.id === selectedWorkflow?.id}', 'aria-label={`Select workflow ${workflow.name}${workflow.id === selectedWorkflow?.id ? \', selected\' : \'\'}`}', '<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />', '<Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />']);
  });

  it('lazy-loads scheduling from the workflow route chunk', () => {
    expect(workflowsPage).toContain("const WorkflowScheduleCreateDrawer = React.lazy(() => import('@/pages/WorkflowScheduleCreateDrawer')");
    expect(workflowsPage).toContain('<React.Suspense fallback={null}>');
    expect(workflowsPage).not.toContain("import { WorkflowScheduleCreateDrawer } from '@/pages/WorkflowScheduleCreateDrawer';");
  });

  it('keeps workflow creation global and workflow search local to the library', () => {
    expect(workflowsPage).toContain('export const WorkflowRouteHeader: React.FC<{');
    expect(workflowsPage).toContain('Create, launch, and audit governed workspace automations with visible agent access and approval gates.');
    expect(workflowsPage).toContain('export const WorkflowLibraryList: React.FC<{');
    expect(workflowsPage).toContain('aria-label="Workflow library"');
    expect(workflowsPage).toContain('placeholder="Search workflows, agents, tools, tags"');
    expect(workflowsPage).toContain('aria-label="Search workflow library"');
    expect(workflowsPage).toContain('className="w-full lg:w-full"');
    expectSnippets(workflowsPage, ['Clear search', '(!query.trim() ? workflows[0] : undefined)']);
    expectMissingSnippets(workflowsPage, ['aria-label="Search workflows"', 'className="lg:w-80"', 'WorkflowSelectedFacts', 'WorkflowOperationalPath', 'Workflow operating path', 'Run gate', '1. Select']);
    expect(workflowsPage).toContain('Create workflow');
    expect(workflowsPage).toContain('disabled={!canManageWorkflowScope}');
    expect(workflowActions).toContain('if (!canManageWorkflowScope)');
    expect(workflowActions).toContain('You need manage_workflows to create workflows.');
    expect(workflowsPage).toContain('className="grid gap-5 bg-ui-bg/45 p-4 sm:p-5');
  });

  it('reserves activation buttons for launch while using shared type tokens', () => {
    expect(workflowsPage).toContain('<h2 className="mt-3 type-section-title break-words [overflow-wrap:anywhere]">{selectedWorkflow.name}</h2>');
    expect(workflowsPage).not.toContain('text-2xl font-semibold tracking-normal');
    expect(workflowsPage.match(/variant="activation"/g) ?? []).toHaveLength(1);
    expect(workflowsPage).toContain('className="w-full whitespace-nowrap sm:w-auto"');
    expect(workflowsPage).toContain('onLaunch={() => void workflowActions.launchSelectedWorkflow()}');
    expect(workflowsPage.match(/<Button variant="primary" size="md" onClick=\{\(\) => void workflowActions\.launchSelectedWorkflow\(\)\}/g) ?? []).toHaveLength(0);
    expect(workflowsPage).toContain('const [scheduleWorkflowId, setScheduleWorkflowId] = useState(');
    expect(workflowsPage).toContain("onSchedule={() => updateUrlSearch({ workflow: selectedWorkflow.id, panel: 'schedule' })}");
    expectSnippets(workflowsPage, ['Schedule workflow', 'You need manage_workflows to schedule workflows.', 'grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2', 'variant="activation"']);
    expect(workflowsPage).toContain('<WorkflowScheduleCreateDrawer');
    expect(workflowsPage).toContain('scheduleWorkflow={workflows.find((workflow) => workflow.id === scheduleWorkflowId)}');
    expect(workflowsPage).not.toContain('onScheduleWorkflow: (workflowId: string) => void;');
    expect(appPageContent).not.toContain('AppPaths.workspaceScheduleCreate(workspaceContext.id, workflowId)');
    expect(workflowsPage).toContain('<Button type="button" variant="primary" size="md" className="whitespace-nowrap self-start lg:self-auto"');
    expect(workflowsPage).toContain('onCreate={() => void workflowActions.createNewWorkflow()}');
    expect(workflowsPage).toContain('<Button type="button" variant="primary" size="sm" onClick={onCreate}');
  });

});
