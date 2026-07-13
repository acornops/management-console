import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const workflowsPage = [
  'src/pages/WorkspaceWorkflowsPage.tsx',
  'src/pages/WorkspaceWorkflowsPage.launchFields.tsx',
  'src/pages/WorkspaceWorkflowsPage.panels.tsx',
  'src/pages/WorkspaceWorkflowsPage.components.tsx'
].map((filePath) => readFileSync(resolve(root, filePath), 'utf8')).join('\n');
const workflowActions = [
  'src/pages/workflows/useWorkspaceWorkflowActions.ts',
  'src/pages/workflows/workflowScopeActions.ts'
].map((filePath) => readFileSync(resolve(root, filePath), 'utf8')).join('\n');
const workflowHelpers = readFileSync(resolve(root, 'src/pages/workflows/workflowPageHelpers.tsx'), 'utf8');
const expectSnippets = (source: string, snippets: string[]) => snippets.forEach((snippet) => expect(source).toContain(snippet));
const expectMissingSnippets = (source: string, snippets: string[]) => snippets.forEach((snippet) => expect(source).not.toContain(snippet));

describe('WorkspaceWorkflowsPage runtime controls', () => {
  it('surfaces workflow run approvals for review and server-side decisions', () => {
    expectSnippets(workflowsPage, ['listWorkflowRunApprovals', 'listWorkflowRunEvents', 'approvalRecords', 'TraceFooter', 'className="max-w-none"', 'window.setInterval', '2500', 'Stop workflow run', 'Approve', 'Reject']);
    expectSnippets(workflowActions, ['cancelWorkflowRun', 'decideWorkflowRunApproval']);
  });

  it('keeps launch-driven tab state synchronized with the workflow route', () => {
    expectSnippets(workflowsPage, ['setActiveTab: selectWorkflowTab']);
    expectSnippets(workflowActions, ["setActiveTab('runs');"]);
  });

  it('reviews effective capabilities and lets managers narrow built-in tools and skills', () => {
    expectSnippets(workflowsPage, ['Capability review', 'const AgentCapabilityReviewList', 'getWorkflowAgentCapabilityReview(workflow, agents)', 'agents={workflowAgents}', 'Coordinator: System Orchestrator', 'Selected agents', 'Approvals', "scopeSaveResult?.tab === 'capabilities'", 'sm:grid-cols-[9rem_minmax(0,1fr)]', 'lg:grid-cols-[15rem_minmax(0,1fr)]', 'first:border-t-0', 'ApprovalPolicyBadges', 'accessBadge="read"', '<ICONS.Bot className="h-4 w-4" aria-hidden="true" />', 'Edit capabilities', 'Save capability gate', 'Built-in MCP server', 'The AcornOps Kubernetes Tools connection is system-owned.']);
    expectMissingSnippets(workflowsPage, ['Workflow restrictions', 'Target context', 'const WorkflowScopeRow', 'values={workflow.enabledMcpServers}', 'values={workflow.enabledSkills}', 'values={workflow.allowedTools}', 'Inherited access', 'Capability rules', 'CapabilityRuleBadges', 'context grant', 'target type', '<TokenGroup title="Target selection"', '<TokenGroup title="Context grants"', '<TokenGroup title="Selected-agent MCP servers"', '<TokenGroup title="Selected-agent skills"', '<TokenGroup title="Allowed tools"', '<TokenGroup title="Disabled by workflow gate"', 'Add server', 'selectedScopeDirty', 'Edit capability gate', 'Discard', 'testWorkflowMcpServerConnection']);
    expectSnippets(workflowActions, ['Workflow capability gate saved. Future sessions will use the narrowed access.', 'setScopeSaveResult', 'enabledMcpServers', 'enabledSkills', 'agentIds', "setActiveTab('overview')"]);
    expectSnippets(workflowHelpers, ['<Switch', 'onCheckedChange={onChange}', 'agentIds']);
    expect(workflowActions).not.toContain('category: draft.category');
  });

  it('lets operators edit and delete user-authored workflow definitions without category authoring', () => {
    expectSnippets(workflowActions, ['updateWorkflow', 'deleteWorkflow', 'startEditingWorkflow', 'saveWorkflowDefinition', 'toggleWorkflowActive', 'deleteSelectedWorkflow', 'Workflow updated.']);
    expectSnippets(workflowsPage, ['const canManageWorkflowScope = Boolean(workspace.permissions?.manage_workflows);', 'Toggle workflow active state', "selectedWorkflow.source !== 'user'", 'delete-workflow-confirmation-input', 'Type the workflow name to confirm deletion.', 'deleteWorkflowConfirmation !== deleteTargetWorkflow.name', '<CloseButton', '<ICONS.Trash2 className="h-4 w-4" aria-hidden="true" />']);
    expect(workflowsPage).not.toContain('const canManageWorkflowScope = Boolean(workspace.permissions?.manage_mcp);');
    expect(workflowsPage).not.toContain('WORKFLOW_CATEGORY_INVALID');
  });
});
