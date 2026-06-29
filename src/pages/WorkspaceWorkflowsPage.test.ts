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
import { createDefaultAgentDefinitions } from './agents/agentModel';
import {
  buildWorkflowCreateInput,
  createWorkflowDraft,
  createFallbackWorkflowOptions,
  getRunDiscussionState,
  isTerminalRunStatus,
  mapApiWorkflowToDefinition,
  mergeWorkflowRunsWithLocalDispatches
} from './workflows/workflowPageHelpers';

const root = resolve(__dirname, '../..');
const workflowsPage = [
  readFileSync(resolve(root, 'src/pages/WorkspaceWorkflowsPage.tsx'), 'utf8'),
  readFileSync(resolve(root, 'src/pages/WorkspaceWorkflowsPage.components.tsx'), 'utf8'),
  readFileSync(resolve(root, 'src/pages/WorkspaceWorkflowsPage.panels.tsx'), 'utf8')
].join('\n');
const workflowActions = readFileSync(resolve(root, 'src/pages/workflows/useWorkspaceWorkflowActions.ts'), 'utf8');
const workflowHelpers = readFileSync(resolve(root, 'src/pages/workflows/workflowPageHelpers.tsx'), 'utf8');
const desktopSidebar = readFileSync(resolve(root, 'src/app/AppDesktopSidebar.tsx'), 'utf8');
const mobileNavigation = readFileSync(resolve(root, 'src/app/AppMobileNavigation.tsx'), 'utf8');
const appPageContent = readFileSync(resolve(root, 'src/app/AppPageContent.tsx'), 'utf8');

describe('WorkspaceWorkflowsPage model', () => {
  it('ships governed workspace automation examples assigned to durable agents', () => {
    const workflows = createDefaultWorkflowDefinitions();
    const agentIds = new Set(createDefaultAgentDefinitions().map((agent) => agent.id));
    const assignedAgentIds = workflows.flatMap((workflow) => [
      workflow.primaryAgent.agentId,
      ...workflow.supportingAgents.map((agent) => agent.agentId),
      ...workflow.steps.flatMap((step) => step.assignedAgentIds || [])
    ]).filter(Boolean);

    expect(workflows.map((workflow) => workflow.id)).toEqual([
      'cluster-triage',
      'repository-operation',
      'incident-report-pdf'
    ]);
    expect(assignedAgentIds.every((agentId) => agentIds.has(agentId))).toBe(true);
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
    expect(workflowsPage).toContain("SegmentedTabs, Textarea, TextInput } from '@/components/common/ComponentVocabulary';");
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

  it('builds user-authored workflow payloads with primary and supporting agents', () => {
    const draft = {
      ...createWorkflowDraft(),
      name: 'Incident follow up',
      description: 'Coordinate the after-action workflow.',
      starterPrompt: 'Prepare the follow up.',
      primaryAgentId: 'agent-incident-owner',
      supportingAgentIds: ['agent-cluster-triage', 'agent-release-coordinator'],
      enabledMcpServers: 'github',
      enabledSkills: 'acornops-open-pr',
      allowedTools: 'github.prs.create'
    };

    const input = buildWorkflowCreateInput(draft);

    expect(input.steps?.[0]?.assignedAgentIds).toEqual([
      'agent-incident-owner',
      'agent-cluster-triage',
      'agent-release-coordinator'
    ]);
    expect(input.starterPrompt).toBe('Prepare the follow up.');
    expect(input.steps?.[0]?.id).toBe('incident-follow-up-step');
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
        assignedAgentIds: ['agent-release-coordinator', 'agent-cluster-triage'],
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

    expect(workflow.primaryAgent.name).toBe('Repository Operator');
    expect(workflow.supportingAgents.map((agent) => agent.name)).toEqual(['Kubernetes Diagnostics']);
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
    expect(workflowsPage).toContain('workflowRunMessages');
    expect(workflowsPage).toContain('workflowRunMessageDrafts');
    expect(workflowsPage).toContain('workflowSessionId={workflowSessionIds[selectedWorkflow.id] || \'\'}');
    expect(workflowsPage).toContain('runMessagesByRunId={workflowRunMessages}');
    expect(workflowsPage).toContain('Run discussion');
    expect(workflowsPage).toContain('Send instruction');
    expect(workflowsPage).toContain('This run cannot accept more instructions. Start a follow-up run or retry from the workflow action.');
    expect(workflowsPage).toContain("discussionState === 'active'");
    expect(workflowsPage).toContain("discussionState === 'waiting_session'");
    expect(workflowsPage).toContain("run.status === 'failed'");
    expect(workflowsPage).toContain('function WorkflowRunInstructionForm');
    expect(workflowsPage).toContain('instructionTextareaRef');
    expect(workflowsPage).toContain('textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;');
    expect(workflowsPage).toContain('rounded-lg border border-ui-border bg-ui-surface');
    expect(workflowsPage).toContain('resize-none overflow-y-auto border-0 bg-transparent');
    expect(workflowsPage).toContain("event.key === 'Enter' && !event.shiftKey");
    expect(workflowsPage).toContain('event.preventDefault();');
    expect(workflowsPage).toContain('void workflowActions.sendWorkflowRunMessage(effectiveRunId, workflowSessionId);');
    expect(workflowsPage).not.toContain('Message workflow');
    expect(workflowsPage).not.toContain('Workflow conversation');
    expect(workflowsPage).not.toContain('Session connected');
    expect(workflowActions).toContain('async function sendWorkflowRunMessage(runId: string, sessionId: string): Promise<void>');
    expect(workflowActions).toContain('await postWorkflowSessionMessage(workspace.id, sessionId, {');
    expect(workflowActions).toContain('role: \'operator\'');
    expect(workflowActions).toContain('status: \'sending\'');
    expect(workflowActions).toContain('status: \'failed\'');
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
    expect(workflowsPage).toContain('Runtime access');
    expect(workflowsPage).toContain('Workflow gate');
    expect(workflowsPage).toContain("variant=\"accent\"");
    expect(workflowsPage).toContain('Create workflow');
    expect(workflowsPage).toContain('createWorkflowStep');
    expect(workflowsPage).toContain('canManageWorkflowScope={canManageWorkflowScope}');
    expect(workflowsPage).toContain("import { ModalStepIndicator } from '@/components/common/ModalStepIndicator'");
    expect(workflowsPage).toContain('Create workflow steps');
    expect(workflowsPage).toContain('createDraft.primaryAgentId');
    expect(workflowsPage).toContain('createDraft.supportingAgentIds');
    expect(workflowsPage).toContain('Primary agent');
    expect(workflowsPage).toContain('Supporting agents');
    expect(workflowsPage).toContain('selectedAgentAssignmentDraft');
    expect(workflowsPage).toContain('Edit agents');
    expect(workflowsPage).toContain('Save agent assignment');
    expect(workflowActions).toContain('saveAgentAssignments');
    expect(workflowActions).toContain('assignedAgentIds: selectedAgentIds');
    expect(workflowsPage).toContain('Identity');
    expect(workflowsPage).toContain('Capabilities');
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
    expect(workflowsPage).toContain('<RightSidePanel');
    expect(workflowsPage).toContain('descriptionId="create-workflow-description"');
    expect(workflowsPage).not.toContain('handleWorkflowCreateDrawerKeyDown');
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

  it('waits for the workflow catalog before polling workflow sessions', () => {
    expect(workflowsPage).toContain('const [workflowCatalogReady, setWorkflowCatalogReady] = useState(false);');
    expect(workflowsPage).toContain('setWorkflowCatalogReady(false);');
    expect(workflowsPage).toContain('setWorkflowCatalogReady(true);');
    expect(workflowsPage).toContain('setWorkflowCatalogReloadKey');
    expect(workflowsPage).toContain('WorkflowLoadFallbackNotice');
    expect(workflowsPage).toContain('if (!workflowCatalogReady || !selectedWorkflow) return;');
    expect(workflowsPage).toContain('}, [selectedWorkflow?.id, workspace.id, workflowCatalogReady]);');
    expect(workflowsPage).toContain('}, [fallbackWorkflows, workspace.id, workflowCatalogReloadKey, workflowOwnerLabelsByUserId]);');
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

  it('keeps assigned-agent summaries flat instead of nesting boxed rows inside boxed sections', () => {
    expect(workflowsPage).toContain('const AgentAssignmentList');
    expect(workflowsPage).toContain('divide-y divide-ui-border');
    expect(workflowsPage).toContain('No supporting agents assigned.');
    expect(workflowsPage).not.toContain('rounded-md border border-ui-border bg-ui-bg p-3 text-sm font-semibold text-ui-text-muted">No supporting agents assigned.');
    expect(workflowsPage).not.toContain('border border-ui-border bg-ui-bg p-3 ${roomy');
  });

  it('gives workflow create text boxes a polished shared field treatment', () => {
    expect(workflowsPage).toContain("import { CloseButton, Textarea, TextInput } from '@/components/common/ComponentVocabulary';");
    expect(workflowsPage).toContain("import { RightSidePanel } from '@/components/common/RightSidePanel';");
    expect(workflowsPage).toContain('<RightSidePanel');
    expect(workflowsPage).toContain('<CloseButton onClick={close} label="Close create workflow drawer" />');
    expect(workflowsPage).toContain('<TextInput');
    expect(workflowsPage).toContain('id="create-workflow-name-input"');
    expect(workflowsPage).toContain('value={createDraft.name}');
    expect(workflowsPage).toContain('<TextInput id="create-workflow-description-input" value={createDraft.description}');
    expect(workflowsPage).toContain('<Textarea id="create-workflow-starter-prompt-input" value={createDraft.starterPrompt}');
    expect(workflowsPage).toContain('<Textarea value={createDraft.enabledMcpServers}');
    expect(workflowsPage).not.toContain('createWorkflowInputClass');
    expect(workflowsPage).not.toContain('createWorkflowTextareaClass');
    expect(workflowsPage).not.toContain("import { formInputClassName, formTextareaClassName } from '@/components/common/formControlStyles';");
    expect(workflowsPage).not.toContain('className="mt-2 min-h-10 w-full rounded-md border border-ui-border bg-ui-bg px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent"');
  });

  it('renders every workflow subtab through the same operational panel pattern', () => {
    expect(workflowsPage).toContain('const WorkflowTabPanel');
    expect(workflowsPage).toContain('const WorkflowSection');
    expect(workflowsPage.match(/activeTab === '/g) ?? []).toHaveLength(6);
    expect(workflowsPage).toContain('ariaLabel="Workflow section tabs"');
    expect(workflowsPage).toContain('tab="overview"');
    expect(workflowsPage).toContain('role="tabpanel"');
    expect(workflowsPage).toContain('aria-labelledby={`workflow-section-${tab}-tab`}');
    expect(workflowsPage).toContain('description?: string;');
    expect(workflowsPage).toContain('{description && <p className="type-caption mt-1 max-w-3xl text-ui-text-muted">{description}</p>}');
    expect(workflowsPage).not.toContain('space-y-5 rounded-md border border-ui-border bg-ui-surface px-4 py-4 shadow-sm sm:px-5 sm:py-5');
    expect(workflowsPage).not.toContain('max-w-4xl');
    expect(workflowsPage).not.toContain('max-w-5xl');
  });

  it('keeps workflow discovery search-only without the category filter row', () => {
    expect(workflowsPage).toContain('placeholder="Search workflows, agents, tools, tags"');
    expect(workflowsPage).toContain('{visibleWorkflows.length} of {workflows.length} workflows');
    expect(workflowsPage).toContain('aria-label="Workflow library"');
    expect(workflowsPage).toContain('Workflow library');
    expect(workflowsPage).toContain('<div className="type-caption font-semibold text-ui-text-muted">{visibleWorkflows.length} of {workflows.length} workflows</div>');
    expect(workflowsPage).not.toContain("query.trim() ? 'Matching workflows' : 'Workflow library'");
    expect(workflowsPage).not.toContain('type-caption mt-1 font-semibold text-ui-text-muted">{visibleWorkflows.length} of {workflows.length} workflows');
    expect(workflowsPage).not.toContain('border-y border-ui-border/80 bg-ui-surface-strong/65');
    expect(workflowsPage).not.toContain('className="bg-ui-surface pl-9 shadow-sm lg:w-full"');
    expect(workflowsPage).toContain('No workflows match this search.');
    expect(workflowsPage).not.toContain('aria-label="Workflow category filters"');
    expect(workflowsPage).not.toContain('Workflow categories');
    expect(workflowsPage).not.toContain('rounded-lg border border-ui-border bg-ui-surface p-3 shadow-sm');
  });

  it('keeps workflow library rows compact and aligned on narrow screens', () => {
    expect(workflowsPage).toContain('className="min-w-0 space-y-3 lg:sticky lg:top-6"');
    expect(workflowsPage).toContain("style={{ maxWidth: 'calc(100vw - 2rem)' }}");
    expect(workflowsPage).toContain('flex flex-col gap-1 px-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3');
    expect(workflowsPage).toContain('grid gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto]');
    expect(workflowsPage).toContain('shrink-0 self-start');
    expect(workflowsPage).toContain('border-t border-ui-border/70 pt-2.5');
    expect(workflowsPage).toContain('type-caption mt-1 block whitespace-normal leading-5 text-ui-text-muted');
    expect(workflowsPage).toContain('{workflow.supportingAgents.length} agents');
    expect(workflowsPage).toContain('{workflow.allowedTools.length} tools');
    expect(workflowsPage).not.toContain('p-3.5 text-left');
    expect(workflowsPage).not.toContain('type-caption mt-1 block break-words leading-5 text-ui-text-muted [overflow-wrap:anywhere]');
    expect(workflowsPage).not.toContain('supporting agents, {workflow.allowedTools.length} allowed tools');
  });

  it('uses guided launch-decision copy for high-stakes workflow starts', () => {
    expect(workflowsPage).not.toContain('Review owner, target scope, capability gate, approvals, and last run before launch.');
    expect(workflowsPage).not.toContain('type-body mt-3 max-w-none break-words text-ui-text-muted [overflow-wrap:anywhere]');
    expect(workflowsPage).not.toContain('Confirm the agent owner, runtime access, approval gates, and operator message before launching.');
    expect(workflowsPage).toContain('Resolve this before launch:');
  });

  it('places launch readiness before workflow tabs', () => {
    expect(workflowsPage).toContain('WorkflowLaunchReadiness');
    expect(workflowsPage).toContain('aria-label="Workflow launch readiness"');
    expect(workflowsPage).toContain('Needs attention before launch');
    expect(workflowsPage).toContain('className="grid min-w-0 gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-4"');
    expect(workflowsPage).toContain('icon={ICONS.User}');
    expect(workflowsPage).toContain('icon={ICONS.Wrench}');
    expect(workflowsPage).toContain('icon={ICONS.Shield}');
    expect(workflowsPage).toContain('icon={ICONS.Clock}');
    expect(workflowsPage).toContain("const accessValue = pluralize(selectedAccessTools.length, 'tool');");
    expect(workflowsPage).toContain("const noApprovalSummary = 'No approval gates configured';");
    expect(workflowsPage).toContain("const approvalValue = totalApprovalSignals > 0 ? pluralize(totalApprovalSignals, 'gate') : 'No gates';");
    expect(workflowsPage).toContain("const lastRunValue = workflow.lastRun ? formatWorkflowTimestamp(workflow.lastRun, workflow.lastRun) : 'Not run';");
    expect(workflowsPage).toContain('{launchBlocker && <StatusBadge tone="warning">Needs attention before launch</StatusBadge>}');
    expect(workflowsPage).not.toContain('onReviewCapabilities');
    expect(workflowsPage).not.toContain('Review capability gate');
    expect(workflowsPage).not.toContain('Ready to launch');
    expect(workflowsPage).not.toContain('isReady ?');
    expect(workflowsPage).not.toContain('Launch decision');
    expect(workflowsPage).not.toContain('This workflow can start with the current owner, message, permissions, and runtime access.');
    expect(workflowsPage).not.toContain('Review the capability gate when the tool count, target scope, or approval model changes.');
    expect(workflowsPage.indexOf('<WorkflowLaunchReadiness')).toBeLessThan(
      workflowsPage.indexOf('ariaLabel="Workflow section tabs"')
    );
  });

  it('makes workflow review shortcuts visible secondary buttons with icons', () => {
    expect(workflowsPage).toContain('<Button type="button" variant="secondary" size="sm" onClick={() => setActiveTab(\'agents\')}>');
    expect(workflowsPage).toContain('<ICONS.Bot className="h-4 w-4" aria-hidden="true" />');
    expect(workflowsPage).not.toContain('variant="tertiary" size="sm" onClick={onReviewCapabilities}');
    expect(workflowsPage).not.toContain('variant="tertiary" size="sm" onClick={() => setActiveTab(\'agents\')}');
  });

  it('keeps workflow tabs fitted instead of showing a horizontal scrollbar', () => {
    expect(workflowsPage).toContain('className="flex flex-wrap gap-0 overflow-visible border-b border-ui-border"');
    expect(workflowsPage).not.toContain('<div className="bg-ui-surface px-3">\n              <SegmentedTabs<WorkflowTab>\n                activeValue={activeTab}\n                ariaLabel="Workflow section tabs"\n                items={workflowTabItems}');
  });

  it('removes redundant workflow tab eyebrow labels', () => {
    expect(workflowsPage).not.toContain('<p className="type-micro-label text-ui-text-muted">{eyebrow}</p>');
    expect(workflowsPage).not.toContain('eyebrow="Run setup"');
    expect(workflowsPage).not.toContain('eyebrow="Assignment"');
    expect(workflowsPage).not.toContain('eyebrow="Runtime context"');
    expect(workflowsPage).not.toContain('eyebrow="Audit trail"');
    expect(workflowsPage).not.toContain('eyebrow="Access gate"');
    expect(workflowsPage).not.toContain('eyebrow="Definition"');
  });

  it('removes duplicate workflow header facts already covered by launch readiness', () => {
    expect(workflowsPage).not.toContain('Primary agent: {selectedWorkflow.primaryAgent.name}');
    expect(workflowsPage).not.toContain('Supporting agents: {selectedWorkflow.supportingAgents.length}');
    expect(workflowsPage).not.toContain('Last run: {selectedWorkflow.lastRun}');
    expect(workflowsPage).not.toContain('h-12 w-12 shrink-0');
  });

  it('marks required create fields inline instead of showing a pre-save checklist', () => {
    expect(workflowsPage).toContain('id="workflow-launch-blocker"');
    expect(workflowsPage).toContain("aria-describedby={launchBlocker ? 'workflow-launch-blocker' : undefined}");
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

  it('polishes launch readiness changes for assistive technology', () => {
    expect(workflowsPage).toContain('aria-live="polite"');
    expect(workflowsPage).toContain('aria-atomic="true"');
  });

  it('keeps workflow creation global and workflow search local to the library', () => {
    expect(workflowsPage).toContain('export const WorkflowRouteHeader: React.FC<{');
    expect(workflowsPage).toContain('Create, launch, and audit governed workspace automations.');
    expect(workflowsPage).toContain('export const WorkflowLibraryList: React.FC<{');
    expect(workflowsPage).toContain('aria-label="Workflow library"');
    expect(workflowsPage).toContain('placeholder="Search workflows, agents, tools, tags"');
    expect(workflowsPage).toContain('aria-label="Search workflow library"');
    expect(workflowsPage).toContain('className="w-full lg:w-full"');
    expect(workflowsPage).not.toContain('aria-label="Search workflows"');
    expect(workflowsPage).not.toContain('className="lg:w-80"');
    expect(workflowsPage).toContain('Create workflow');
    expect(workflowsPage).toContain('disabled={!canManageWorkflowScope}');
    expect(workflowActions).toContain('if (!canManageWorkflowScope)');
    expect(workflowActions).toContain('You need manage_workflows to create workflows.');
    expect(workflowsPage).toContain('className="grid gap-5 bg-ui-bg/45 p-4 sm:p-5');
  });

  it('removes redundant workflow helper copy from tab and section headers', () => {
    expect(workflowsPage).not.toContain('description="Confirm the agent owner, runtime access, approval gates, and operator message before launching."');
    expect(workflowsPage).not.toContain('description="Steps run in order. Each step uses assigned agents first, then the workflow gate narrows runtime access."');
    expect(workflowsPage).not.toContain('description="The primary agent owns the run. Supporting agents contribute specialist capability."');
    expect(workflowsPage).not.toContain('Workflow gate narrows assigned-agent capabilities.');
    expect(workflowsPage).not.toContain('description="Edit the operator prompt used when launching this workflow."');
    expect(workflowsPage).not.toContain('description="Review who owns the run and which specialist agents can contribute context or decisions."');
    expect(workflowsPage).not.toContain('description="Compiled before run start. The workflow can read only this target scope and workspace context."');
    expect(workflowsPage).not.toContain('description="Review previous executions, approvals, live trace details, and cancellation controls."');
    expect(workflowsPage).not.toContain('description="Access is inherited from assigned agents, then narrowed by this workflow before each run starts."');
    expect(workflowsPage).not.toContain('description="Manage workflow availability, starter prompt, tags, and user-authored workflow deletion."');
    expect(workflowsPage).not.toContain('description="Control whether this workflow can start new runs."');
    expect(workflowsPage).not.toContain('description="Edit the default prompt copied into the launch message."');
    expect(workflowsPage).not.toContain('Only user-authored workflows can be deleted.');
  });

  it('keeps workflow settings spacing tight and avoids duplicate destructive labels', () => {
    expect(workflowsPage).toContain('<WorkflowSection title="Availability">\n                    <div className="mt-3 flex items-center justify-between gap-4 rounded-md border border-ui-border bg-ui-bg px-4 py-3">');
    expect(workflowsPage).toContain('title="Starter prompt"');
    expect(workflowsPage).toContain('<div className="mt-2 grid gap-3">');
    expect(workflowsPage).not.toContain('<div className="mt-3 grid gap-3">');
    expect(workflowsPage).toContain('Default run message');
    expect(workflowsPage).toContain('The starter prompt is copied into the launch message for new workflow sessions.');
    expect(workflowsPage).toContain('aria-label="Edit workflow details"');
    expect(workflowsPage).not.toContain('<WorkflowSection title="Delete workflow">');
  });

  it('keeps the route wrapper inside the app shell on mobile', () => {
    expect(workflowsPage).toContain('className="min-h-0 w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8"');
    expect(workflowsPage).not.toContain('w-[100vw] max-w-[100vw]');
  });

  it('reserves accent buttons for launch while using shared type tokens', () => {
    expect(workflowsPage).toContain('<h2 className="mt-3 type-section-title break-words [overflow-wrap:anywhere]">{selectedWorkflow.name}</h2>');
    expect(workflowsPage).not.toContain('text-2xl font-semibold tracking-normal');
    expect(workflowsPage.match(/variant="accent"/g) ?? []).toHaveLength(1);
    expect(workflowsPage).toContain('<Button variant="accent" size="md" onClick={() => void workflowActions.launchSelectedWorkflow()}');
    expect(workflowsPage).toContain('const [scheduleWorkflowId, setScheduleWorkflowId] = useState(\'\');');
    expect(workflowsPage).toContain('<Button variant="secondary" size="md" onClick={() => setScheduleWorkflowId(selectedWorkflow.id)}');
    expect(workflowsPage).toContain('Schedule workflow');
    expect(workflowsPage).toContain('<WorkflowScheduleCreateDrawer');
    expect(workflowsPage).toContain('scheduleWorkflow={workflows.find((workflow) => workflow.id === scheduleWorkflowId)}');
    expect(workflowsPage).not.toContain('onScheduleWorkflow: (workflowId: string) => void;');
    expect(appPageContent).not.toContain('AppPaths.workspaceScheduleCreate(workspaceContext.id, workflowId)');
    expect(workflowsPage).toContain('<Button type="button" variant="secondary" size="md" className="whitespace-nowrap self-start lg:self-auto"');
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
    expect(workflowsPage).toContain('className="max-w-none"');
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
    expect(workflowsPage).not.toContain('selectedScopeDirty');
    expect(workflowsPage).not.toContain('Edit capability gate');
    expect(workflowsPage).not.toContain('Save capability gate');
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
    expect(workflowsPage).toContain('<WorkflowReadinessFact icon={ICONS.User} label="Owner" value={workflow.owner} />');
    expect(workflowsPage).not.toContain('<WorkflowReadinessFact icon={ICONS.Bot} label="Owner" value={workflow.primaryAgent.name} />');
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
    expect(workflowsPage).toContain('delete-workflow-confirmation-input');
    expect(workflowsPage).toContain('Type the workflow name to confirm deletion.');
    expect(workflowsPage).toContain('deleteWorkflowConfirmation !== deleteTargetWorkflow.name');
    expect(workflowsPage).toContain('<CloseButton');
    expect(workflowsPage).toContain('<ICONS.Trash2 className="h-4 w-4" aria-hidden="true" />');
    expect(workflowActions).toContain('Workflow updated.');
    expect(workflowsPage).not.toContain('WORKFLOW_CATEGORY_INVALID');
  });

  it('lets operators add and remove workflow tags without changing MCP scope categories', () => {
    expect(workflowsPage).toContain('addWorkflowTag');
    expect(workflowsPage).toContain('removeWorkflowTag');
    expect(workflowsPage).toContain('Workflow tags');
    expect(workflowsPage).toContain('Add tag');
    expect(workflowsPage).toContain('aria-hidden="true"');
    expect(workflowsPage).toContain('aria-label={`Remove workflow tag ${tag}`}');
    expect(workflowsPage).not.toContain('onClick={() => workflowActions.removeWorkflowTag(selectedWorkflow.id, tag)} className="rounded-md border border-ui-border bg-ui-bg px-2.5 py-1.5 text-xs font-bold text-ui-text-muted"');
  });
});
