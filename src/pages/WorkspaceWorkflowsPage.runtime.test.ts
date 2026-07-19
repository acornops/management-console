import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const workflowComponents = readFileSync(resolve(root, 'src/pages/WorkspaceWorkflowsPage.components.tsx'), 'utf8');
const workflowsPage = [
  'src/pages/WorkspaceWorkflowsPage.tsx',
  'src/pages/WorkspaceWorkflowsPage.createDrawer.tsx',
  'src/pages/WorkspaceWorkflowsPage.launchFields.tsx',
  'src/pages/WorkspaceWorkflowsPage.panels.tsx',
  'src/pages/WorkspaceWorkflowsPage.components.tsx',
  'src/pages/workflows/useWorkflowCapabilityPreview.ts'
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
    expectSnippets(workflowsPage, ['setActiveTab: (tab: WorkflowTab) => selectWorkflowTab(tab, selectedWorkflow?.id)']);
    expectSnippets(workflowActions, ["setActiveTab('runs');"]);
  });

  it('reviews concrete Agent access without exposing internal semantic capability identifiers', () => {
    expectSnippets(workflowsPage, ['Capability review', 'const AgentCapabilityReviewList', 'getWorkflowAgentCapabilityReview(workflow, agents)', 'agents={workflowAgents}', 'Agent action policy', 'Workflow approval gates', 'sm:grid-cols-[9rem_minmax(0,1fr)]', 'lg:grid-cols-[15rem_minmax(0,1fr)]', 'first:border-t-0', 'ApprovalPolicyBadges', '<ICONS.Bot className="h-4 w-4" aria-hidden="true" />', 'Direct MCP servers', 'Installed skills', 'Directly attached tools', 'technical']);
    expectMissingSnippets(workflowsPage, ['Semantic capabilities', 'semantic capabilities', 'Allowed semantic capabilities', 'Restrict Agent capabilities', 'Inherited Agent capabilities', 'Restricted capability subset', 'Effective capabilities', 'Edit capabilities', 'Save capability policy', 'scopeOptions.semanticCapabilities', 'onSetSemanticCapabilityValue', 'Coordinator: System Orchestrator', 'Add server', 'testWorkflowMcpServerConnection', 'accessBadge="read"', 'Blocked capabilities', 'No approval constraints configured.', 'Target tools resolve per run', 'Exact tools resolve against', 'onSetStepToolValue', 'onSetWorkflowScopeValue']);
    expectSnippets(workflowActions, ['Workflow capability policy saved. Future sessions will inherit the selected Agents’ current capabilities.', 'Workflow capability policy saved. Future sessions will use the explicit capability restriction.', 'setScopeSaveResult', 'capabilityPolicy', 'restrictionMode', 'semanticCapabilityIds', 'agentIds', 'selectResultingWorkflow(mapped.id)', 'setSemanticCapabilityValue']);
    expectMissingSnippets(workflowActions, ['entryAgentId', 'delegationPolicy', 'setStepScopeValue', 'setWorkflowScopeValue', 'draft.steps']);
    expectSnippets(workflowHelpers, ['<Switch', 'onCheckedChange={onChange}', 'agentIds']);
    expect(workflowActions).not.toContain('category: draft.category');
  });

  it('blocks launch until a fresh preview is ready and replaces the session ceiling with dispatch authority', () => {
    expectSnippets(workflowsPage, ['previewWorkflowCapabilities', "const blocker = loading", ': !preview', "preview.status === 'blocked'", 'The capability preview is stale. Retry before launch.', '<WorkflowCapabilityLedger', 'Retry preview', 'Run dispatched with {launchResult.toolCount} tools', '<WorkflowPreviewAuthRow', 'Required auth', 'Required information', 'auth.credentialLabel', 'requirement.serverName', 'Connection required', 'Connect credential', '<McpPatDialog', 'credentialRequirement.authType', 'credentialRequirement.owningAgent.id', 'credentialRequirement.serverId', 'catalogApi.putAgentMcpConnection', 'onRetry();', 'preview.approvalRequirements.length > 0', 'values={preview.approvalRequirements}']);
    expectMissingSnippets(workflowComponents, ['credentialRequirement.provider', "provider === 'gitlab'", 'profile_missing', 'profile_drift', 'Set up server']);
    expectMissingSnippets(workflowsPage, ['preview.tools.write.length > 0 && preview.approvalRequirements.length > 0']);
    expectSnippets(workflowActions, ['const authoritativeScope = result.compiledAccessScope;', 'setCompiledScopes((current) => ({ ...current, [selectedWorkflow.id]: authoritativeScope }))']);
    expectMissingSnippets(workflowActions, ['sessionResponse.compiledAccessScope }));']);
  });

  it('lets operators edit custom workflows and delete visible workflow definitions without category authoring', () => {
    expectSnippets(workflowActions, ['updateWorkflow', 'deleteWorkflow', 'startEditingWorkflow', 'saveWorkflowDefinition', 'toggleWorkflowActive', 'deleteSelectedWorkflow', 'Workflow updated.']);
    expectSnippets(workflowsPage, ['const canManageWorkflowScope = Boolean(workspace.permissions?.manage_workflows);', 'Toggle workflow active state', 'mt-3 flex items-center justify-between gap-4 rounded-md border border-ui-border bg-ui-bg px-4 py-3', 'rounded-md border border-ui-border bg-ui-bg px-4 py-3', 'This starter will not be restored automatically.', 'delete-workflow-confirmation-input', 'Type the workflow name to confirm deletion.', 'deleteWorkflowConfirmation !== deleteTargetWorkflow.name', '<CloseButton', '<ICONS.Trash2 className="h-4 w-4" aria-hidden="true" />']);
    expect(workflowsPage).not.toContain("selectedWorkflow.source !== 'user'");
    expect(workflowsPage).not.toContain('const canManageWorkflowScope = Boolean(workspace.permissions?.manage_mcp);');
    expect(workflowsPage).not.toContain('WORKFLOW_CATEGORY_INVALID');
  });

  it('persists workflow tags through the workflow update endpoint', () => {
    expectSnippets(workflowActions, ['persistWorkflowTags', 'await updateWorkflow(workspace.id, workflow.id', 'tags', 'Workflow tags updated.']);
    expectSnippets(workflowsPage, ['<WorkflowTagsEditor', 'pending={updatingWorkflowId === selectedWorkflow.id}', 'void workflowActions.addWorkflowTag', 'void workflowActions.removeWorkflowTag']);
  });
});
