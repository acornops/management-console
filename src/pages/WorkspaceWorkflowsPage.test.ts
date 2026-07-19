import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  filterWorkflowDefinitions,
  getWorkflowLaunchBlocker,
  getWorkflowPrimaryAction,
  getWorkflowTabLabel,
  type WorkflowDefinition,
  type WorkflowTab
} from './workflows/workflowModel';
import {
  buildWorkflowCreateInput,
  createWorkflowDraft,
  mapApiWorkflowToDefinition,
  mergeWorkflowRunsWithLocalDispatches
} from './workflows/workflowPageHelpers';

const root = resolve(__dirname, '../..');
const workflowsPage = [
  'src/pages/WorkspaceWorkflowsPage.tsx',
  'src/pages/WorkspaceWorkflowsPage.components.tsx',
  'src/pages/WorkspaceWorkflowsPage.createDrawer.tsx',
  'src/pages/WorkspaceWorkflowsPage.panels.tsx'
].map((filePath) => readFileSync(resolve(root, filePath), 'utf8')).join('\n');
const workflowActions = readFileSync(resolve(root, 'src/pages/workflows/useWorkspaceWorkflowActions.ts'), 'utf8');
const workflowScheduleDrawer = readFileSync(resolve(root, 'src/pages/WorkflowScheduleCreateDrawer.tsx'), 'utf8');
const workflowModel = readFileSync(resolve(root, 'src/pages/workflows/workflowModel.ts'), 'utf8');
const appPageContent = readFileSync(resolve(root, 'src/app/AppPageContent.tsx'), 'utf8');
const workspaceNavigation = readFileSync(resolve(root, 'src/app/workspaceNavigation.tsx'), 'utf8');
const englishLocale = readFileSync(resolve(root, 'src/i18n/locales/en.js'), 'utf8');
const mandarinLocale = readFileSync(resolve(root, 'src/i18n/locales/zh.js'), 'utf8');

function workflowFixture(overrides: Partial<WorkflowDefinition> = {}): WorkflowDefinition {
  const repositoryAgent = {
    agentId: 'agent-repository',
    name: 'Workflow Analyst',
    role: 'AcornOps-coordinated',
    required: true
  };
  return {
    id: 'workflow-1',
    workspaceId: 'workspace-1',
    version: 2,
    name: 'Cluster investigation',
    description: 'Investigate a selected cluster.',
    status: 'active',
    origin: { type: 'manual' },
    source: 'user',
    createdBy: 'user-1',
    owner: 'Operator',
    agentIds: [repositoryAgent.agentId, 'agent-specialist'],
    executionMode: 'coordinated',
    semanticCapabilityIds: ['target.diagnostics.read'],
    capabilityRestrictionMode: 'restrict',
    readiness: { status: 'ready', reasons: [] },
    tags: ['cluster', 'triage'],
    lastRun: 'No runs yet',
    agents: [repositoryAgent, {
      agentId: 'agent-specialist',
      name: 'Kubernetes Specialist',
      role: 'AcornOps-coordinated',
      required: true
    }],
    requiredPermissions: ['read_workspace_data', 'create_read_only_runs'],
    contextGrants: ['workspace_metadata'],
    inputs: [],
    policy: {
      mode: 'read_only',
      approvals: []
    },
    starterPrompt: 'Inspect the selected cluster.',
    runs: [],
    ...overrides
  };
}

describe('WorkspaceWorkflowsPage model', () => {
  it('restores the operational workflow tabs', () => {
    const tabs: WorkflowTab[] = ['overview', 'agents', 'capabilities', 'runs', 'settings'];
    expect(tabs.map(getWorkflowTabLabel)).toEqual([
      'Overview',
      'Agents',
      'Capability review',
      'Runs',
      'Settings'
    ]);
    expect(workflowsPage).toContain("activeTab === 'capabilities'");
    expect(workflowsPage).toContain('<WorkflowCapabilitiesPanel');
    expect(workflowsPage).toContain("activeTab === 'runs'");
    expect(workflowsPage).toContain('<WorkflowRunsPanel');
  });

  it('keeps automatic coordination copy accessible and localized', () => {
    for (const locale of [englishLocale, mandarinLocale]) {
      expect(locale).toContain('workflowCoordination');
      expect(locale).toContain('agentsDescription');
      expect(locale).toContain('coordinatedFeedback');
      expect(locale).toContain('traceTitle');
    }
    expect(englishLocale).toContain('Choose one agent to run directly, or select several for AcornOps to coordinate.');
    expect(workflowsPage).toContain('aria-live="polite"');
    expect(workflowsPage).not.toContain("t('workflowCoordination.directFeedback'");
    expect(workflowsPage).toContain('<Checkbox');
    expect(workflowsPage).toContain('sm:grid-cols-[minmax(0,1fr)_auto]');
    expect(workflowsPage).not.toMatch(/entry agent/i);
    expect(workflowsPage).not.toMatch(/delegation candidate/i);
    expect(workflowsPage).not.toContain('1 + workflow.agents.length');
  });

  it('maps coordinated selected Agents as order-independent peers', () => {
    const workflow = mapApiWorkflowToDefinition({
      id: 'workflow-1',
      workspaceId: 'workspace-1',
      version: 3,
      origin: { type: 'manual' },
      name: 'Cluster investigation',
      description: 'Investigate a selected cluster.',
      status: 'active',
      createdBy: 'user-1',
      prompt: 'Inspect the selected cluster.',
      agentIds: ['agent-specialist', 'agent-repository'],
      executionMode: 'coordinated',
      requiredPermissions: ['read_workspace_data', 'create_read_only_runs'],
      capabilityPolicy: {
        mode: 'read_only',
        restrictionMode: 'restrict',
        semanticCapabilityIds: ['target.diagnostics.read'],
        contextGrants: ['workspace_metadata'],
        maxRuntimeSeconds: 900,
        retentionDays: 90,
        approvalRequirements: []
      },
      readiness: { status: 'ready', reasons: [] }
    }, undefined, 'workspace-1', {
      clusters: [],
      mcpServers: [],
      mcpTools: [],
      skills: [],
      agents: [
        { value: 'agent-repository', label: 'Workflow Analyst' },
        { value: 'agent-specialist', label: 'Kubernetes Specialist' }
      ],
      chatSessions: [],
      outputFormats: [],
      approvalPolicies: [],
      runtimeLimits: [],
      retentionPolicies: [],
      sourceAvailability: {}
    }, new Map([['user-1', 'Ning Zhang']]));

    expect(workflow.agents).toEqual([
      expect.objectContaining({ agentId: 'agent-repository', name: 'Workflow Analyst', role: 'AcornOps-coordinated' }),
      expect.objectContaining({ agentId: 'agent-specialist', name: 'Kubernetes Specialist', role: 'AcornOps-coordinated' })
    ]);
    expect(workflow.semanticCapabilityIds).toEqual(['target.diagnostics.read']);
    expect(workflow.owner).toBe('Ning Zhang');
  });

  it('does not expose internal semantic capabilities through workflow search', () => {
    const workflows = [workflowFixture()];
    expect(filterWorkflowDefinitions(workflows, 'cluster')).toEqual(workflows);
    expect(filterWorkflowDefinitions(workflows, 'target diagnostics')).toEqual([]);
    expect(filterWorkflowDefinitions(workflows, 'repository')).toEqual([]);
  });

  it('builds current workflow payloads from the restored create drawer', () => {
    const input = buildWorkflowCreateInput({
      ...createWorkflowDraft(),
      name: 'Incident follow up',
      description: 'Coordinate the after-action workflow.',
      starterPrompt: 'Prepare the follow up.',
      agentIds: ['agent-repository', 'agent-specialist'],
      restrictionMode: 'restrict',
      semanticCapabilityIds: 'target.diagnostics.read\nreport.generate'
    });

    expect(input).toMatchObject({
      name: 'Incident follow up',
      prompt: 'Prepare the follow up.',
      agentIds: ['agent-repository', 'agent-specialist'],
      capabilityPolicy: {
        restrictionMode: 'restrict',
        semanticCapabilityIds: ['report.generate', 'target.diagnostics.read']
      }
    });
    expect(input).not.toHaveProperty('requiredPermissions');
    expect(input.capabilityPolicy).not.toHaveProperty('mode');
    expect(input.capabilityPolicy).not.toHaveProperty('contextGrants');
    expect(input.capabilityPolicy).not.toHaveProperty('maxRuntimeSeconds');
    expect(input.capabilityPolicy).not.toHaveProperty('retentionDays');
    expect(input.capabilityPolicy).not.toHaveProperty('approvalRequirements');
  });

  it('inherits Agent capabilities by default and preserves explicit zero-capability restrictions', () => {
    const inherited = buildWorkflowCreateInput({
      ...createWorkflowDraft(), name: 'Inherited workflow', agentIds: ['agent-specialist'],
      semanticCapabilityIds: 'target.diagnostics.read'
    });
    expect(inherited.capabilityPolicy).toMatchObject({ restrictionMode: 'inherit', semanticCapabilityIds: [] });

    const denied = buildWorkflowCreateInput({
      ...createWorkflowDraft(), name: 'Context-only workflow', agentIds: ['agent-specialist'],
      restrictionMode: 'restrict', semanticCapabilityIds: ''
    });
    expect(denied.capabilityPolicy).toMatchObject({ restrictionMode: 'restrict', semanticCapabilityIds: [] });
  });

  it('keeps pending runs visible until control-plane polling confirms them', () => {
    const localRun: WorkflowDefinition['runs'][number] = {
      id: 'workflow-run-local',
      runId: 'run-local',
      status: 'dispatching',
      actor: 'You',
      duration: 'Queued',
      approvals: 0,
      output: 'Workflow run dispatched.',
      startedAt: 'Just now'
    };
    const serverRun = { ...localRun, status: 'running' as const, actor: 'Control plane' };

    expect(mergeWorkflowRunsWithLocalDispatches([], [localRun])).toEqual([localRun]);
    expect(mergeWorkflowRunsWithLocalDispatches([serverRun], [localRun])).toEqual([serverRun]);
    expect(workflowActions).toContain("setActiveTab('runs');");
    expect(workflowActions).toContain('await listWorkflowRunEvents(runId)');
  });

  it('blocks launch when current readiness or permissions do not allow a run', () => {
    const workflow = workflowFixture();
    const permissions = {
      create_sessions: true,
      create_read_only_runs: true,
      create_read_write_runs: false
    };

    expect(getWorkflowLaunchBlocker(workflow, 'Inspect cluster', permissions)).toBeNull();
    expect(getWorkflowLaunchBlocker({
      ...workflow,
      readiness: { status: 'blocked', reasons: ['Capability mapping is incomplete.'] }
    }, 'Inspect cluster', permissions)).toBe('Capability mapping is incomplete.');
    expect(getWorkflowLaunchBlocker({ ...workflow, status: 'paused' }, 'Inspect cluster', permissions)).toBe('Activate this workflow before launching it.');
  });

  it('selects one truthful primary action for each workflow state', () => {
    const workflow = workflowFixture();
    expect(getWorkflowPrimaryAction(workflow)).toBe('launch');
    expect(getWorkflowPrimaryAction({ ...workflow, status: 'paused' })).toBe('activate');
    expect(getWorkflowPrimaryAction({ ...workflow, status: 'draft' })).toBe('activate');
    expect(getWorkflowPrimaryAction({
      ...workflow,
      readiness: { status: 'needs_setup', reasons: ['Connect the required integration.'] }
    })).toBe('setup');
  });

  it('does not restore runtime fixture definitions', () => {
    expect(workflowModel).not.toContain('createDefaultWorkflowDefinitions');
    expect(workflowsPage).not.toContain('fallbackWorkflows');
    expect(workflowsPage).toContain('listWorkspaceWorkflows(workspace.id)');
    expect(workflowsPage).toContain('listWorkflowSessions(workspace.id, selectedWorkflow.id)');
  });

  it('keeps built-in workflows runnable while customization creates an editable draft', () => {
    expect(workflowsPage).toContain('isSystemProvidedWorkflow');
    expect(workflowsPage).toContain('workflowActions.duplicateSystemWorkflow()');
    expect(englishLocale).toContain("customize: 'Customize workflow'");
    expect(workflowsPage).not.toContain('SystemWorkflowDuplicateBanner');
    expect(workflowsPage).not.toContain('systemWorkflowDuplicateNotice');
    expect(workflowsPage).toContain('primaryAction={workflowPrimaryAction}');
    expect(workflowsPage).toContain('showCustomize={systemProvidedSelected}');
    expect(workflowActions).toContain('async function duplicateSystemWorkflow()');
    expect(workflowActions).toContain('if (isSystemProvidedWorkflow(workflow)) return;');
    expect(workflowActions).toContain('isSystemProvidedWorkflow(selectedWorkflow)');
    expect(workflowActions).not.toContain('if (isSystemProvidedWorkflow(workflow)) return;\n    setDeleteWorkflowError');
    expect(workflowsPage).toContain('This starter will not be restored automatically.');
  });

  it('keeps provider badges out of installed workflows and preserves custom ownership', () => {
    expect(workflowsPage).not.toContain("t('common.providedByAcornOps')");
    expect(workflowsPage).toContain("['Built-in', version].filter(Boolean).join(' · ')");
    expect(workflowsPage).toContain('>Built-in</span>{selectedWorkflow.version && <span');
    expect(workflowsPage).toContain('>v{selectedWorkflow.version}</span>');
    expect(workflowsPage).toContain('{selectedWorkflow.owner}{selectedWorkflow.version ? ` · v${selectedWorkflow.version}` : \'\'}');
    expect(workflowsPage).toContain("return 'read-only run'");
  });
});

describe('WorkspaceWorkflowsPage integration surface', () => {
  it('keeps Workflows route-stable and lazy loaded', () => {
    expect(workspaceNavigation).toContain("id: 'workflows'");
    expect(workspaceNavigation).toContain('AppPaths.workspaceWorkflows(workspace.id)');
    expect(appPageContent).toContain("import('@/pages/WorkspaceWorkflowsPage')");
    expect(appPageContent).toContain("route.kind === 'workspaceWorkflows'");
  });

  it('keeps capability, approval, trace, and discussion inspection in the restored page', () => {
    [
      'AgentCapabilityReviewList',
      'Run discussion',
      'listWorkflowRunApprovals',
      'listWorkflowRunEvents',
      'decideApproval',
      'stopWorkflowRun'
    ].forEach((snippet) => expect(workflowsPage + workflowActions).toContain(snippet));
  });

  it('keeps workflow navigation and schedule choices accessible at narrow widths', () => {
    expect(workflowsPage).toContain('allPanelsMounted={false}');
    expect(workflowsPage).toContain('className="gap-0"');
    expect(workflowsPage).not.toContain('<span aria-hidden="true">{tag}</span>');
    expect(workflowScheduleDrawer).toContain('<fieldset className="min-w-0 space-y-3">');
    expect(workflowScheduleDrawer).toContain('<Radio');
    expect(workflowScheduleDrawer).toContain('name="workflow-schedule-frequency"');
    expect(workflowScheduleDrawer).toContain('checked={frequency === value}');
  });

  it('hydrates supporting catalogs before mapping the workflow catalog', () => {
    expect(workflowsPage).toContain('workflowOwnerCatalogWorkspaceId !== workspace.id');
    expect(workflowsPage).toContain('workflowAgentCatalogWorkspaceId !== workspace.id');
    expect(workflowsPage).toContain('workflowOptionsCatalogWorkspaceId !== workspace.id');
    expect(workflowsPage).not.toContain('[effectiveWorkflowOptions, initialWorkflowTarget, workspace.id, workflowCatalogReloadKey, workflowOwnerLabelsByUserId]');
  });
});
