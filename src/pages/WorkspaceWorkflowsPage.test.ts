import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  appendWorkflowSearchTag,
  createDefaultWorkflowDefinitions,
  filterWorkflowDefinitions,
  getWorkflowById,
  getOptimisticWorkflowRunStatus,
  getWorkflowTabLabel,
  getWorkflowToolScopeSummary,
  type WorkflowDefinition,
  type WorkflowTab
} from './workflows/workflowModel';

const root = resolve(__dirname, '../..');
const workflowsPage = readFileSync(resolve(root, 'src/pages/WorkspaceWorkflowsPage.tsx'), 'utf8');
const workflowActions = readFileSync(resolve(root, 'src/pages/workflows/useWorkspaceWorkflowActions.ts'), 'utf8');
const workflowHelpers = readFileSync(resolve(root, 'src/pages/workflows/workflowPageHelpers.tsx'), 'utf8');
const desktopSidebar = readFileSync(resolve(root, 'src/app/AppDesktopSidebar.tsx'), 'utf8');
const mobileNavigation = readFileSync(resolve(root, 'src/app/AppMobileNavigation.tsx'), 'utf8');
const appPageContent = readFileSync(resolve(root, 'src/app/AppPageContent.tsx'), 'utf8');

describe('WorkspaceWorkflowsPage model', () => {
  it('ships governed workspace automation examples separate from target chats', () => {
    const workflows = createDefaultWorkflowDefinitions();

    expect(workflows.map((workflow) => workflow.id)).toEqual([
      'cluster-triage',
      'repository-operation',
      'incident-report-pdf'
    ]);
    expect(workflows.every((workflow) => workflow.scope.type === 'workspace')).toBe(true);
    expect(workflows.some((workflow) => workflow.contextGrants.includes('selected_chat_sessions'))).toBe(true);
    expect(workflows.some((workflow) => workflow.enabledMcpServers.includes('github'))).toBe(true);
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

  it('summarizes MCP and tool scope from workflow-level scope rather than hiding tools client-side', () => {
    const workflows = createDefaultWorkflowDefinitions();
    const triageWorkflow = getWorkflowById(workflows, 'cluster-triage');

    expect(triageWorkflow?.policy.mode).toBe('read_only');
    expect(getWorkflowToolScopeSummary(triageWorkflow as WorkflowDefinition)).toBe('1 MCP server, 4 allowed tools');
  });

  it('keeps workflow detail tabs aligned with chat, runs, MCP, skills, and settings', () => {
    const tabs: WorkflowTab[] = ['chat', 'runs', 'mcp', 'skills', 'settings'];

    expect(tabs.map(getWorkflowTabLabel)).toEqual(['Chat', 'Runs', 'MCP', 'Skills', 'Settings']);
  });

  it('only marks newly launched runs as waiting for approval when an approval gate exists', () => {
    const workflows = createDefaultWorkflowDefinitions();

    expect(getOptimisticWorkflowRunStatus(getWorkflowById(workflows, 'cluster-triage') as WorkflowDefinition)).toBe('dispatching');
    expect(getOptimisticWorkflowRunStatus(getWorkflowById(workflows, 'repository-operation') as WorkflowDefinition)).toBe('waiting_approval');
    expect(getOptimisticWorkflowRunStatus(getWorkflowById(workflows, 'incident-report-pdf') as WorkflowDefinition)).toBe('waiting_approval');
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

  it('presents workflow launch as chat-first with run history and scoped configuration tabs', () => {
    expect(workflowsPage).toContain("activeTab === 'chat'");
    expect(workflowsPage).toContain("activeTab === 'runs'");
    expect(workflowsPage).toContain("activeTab === 'mcp'");
    expect(workflowsPage).toContain("activeTab === 'skills'");
    expect(workflowsPage).toContain("activeTab === 'settings'");
    expect(workflowsPage).toContain('getWorkflowToolScopeSummary(workflow)');
    expect(workflowsPage).toContain("variant=\"accent\"");
    expect(workflowsPage).toContain('Add workflow');
    expect(workflowsPage).toContain('Run prompt message');
    expect(workflowsPage).toContain('Launch workflow');
    expect(workflowsPage).toContain('workflowSearchTags');
    expect(workflowsPage).toContain('appendWorkflowSearchTag(current, tag)');
    expect(workflowsPage).not.toContain('list="workflow-search-tags"');
    expect(workflowsPage).toContain('Search workflows, tags, skills, MCP scope');
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
    expect(workflowsPage).not.toContain('Context grants');
  });

  it('keeps workflow discovery search-only without the category filter row', () => {
    expect(workflowsPage).toContain('Workflow library');
    expect(workflowsPage).toContain('Matching workflows');
    expect(workflowsPage).toContain('No workflows match this search.');
    expect(workflowsPage).not.toContain('aria-label="Workflow category filters"');
    expect(workflowsPage).not.toContain('Workflow categories');
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

  it('configures workflow-level MCP servers and skills with cluster MCP server style switches', () => {
    expect(workflowsPage).toContain('Workflow MCP scope');
    expect(workflowsPage).not.toContain('Filter MCP servers');
    expect(workflowsPage).not.toContain('workflow-mcp-server-tags');
    expect(workflowsPage).not.toContain('visibleMcpServerRows');
    expect(workflowsPage).toContain('Add server');
    expect(workflowsPage).toContain('selectedScopeDirty');
    expect(workflowsPage).toContain('isEditingScopeTab');
    expect(workflowsPage).toContain('Edit MCP scope');
    expect(workflowsPage).toContain('Edit skills');
    expect(workflowsPage).toContain('Save MCP changes');
    expect(workflowsPage).toContain("scopeSaveResult?.tab === 'mcp'");
    expect(workflowsPage).toContain("scopeSaveResult?.tab === 'skills'");
    expect(workflowsPage).not.toContain('Discard');
    expect(workflowsPage).not.toContain('testWorkflowMcpServerConnection');
    expect(workflowHelpers).toContain('role="switch"');
    expect(workflowActions).toContain('Workflow MCP scope saved. Future sessions will use the updated scope.');
    expect(workflowActions).toContain('setScopeSaveResult');
    expect(workflowActions).toContain('enabledMcpServers: splitLines(draft.enabledMcpServers)');
    expect(workflowActions).toContain('enabledSkills: splitLines(draft.enabledSkills)');
    expect(workflowActions).not.toContain('category: draft.category');
    expect(workflowsPage).not.toContain("['MCP servers', 'allowedMcpServers']");
    expect(workflowsPage).not.toContain("['Allowed tools', 'allowedTools']");
  });

  it('lets operators edit and delete user-authored workflow definitions without category authoring', () => {
    expect(workflowActions).toContain('updateWorkflow');
    expect(workflowActions).toContain('deleteWorkflow');
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
