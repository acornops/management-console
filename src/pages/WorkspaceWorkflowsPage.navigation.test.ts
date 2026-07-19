import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  findLegacyWorkflowQuerySelection,
  getWorkflowRouteSelectionTarget,
  type WorkflowDefinition
} from './workflows/workflowModel';

const root = resolve(__dirname, '../..');
const source = (path: string) => readFileSync(resolve(root, path), 'utf8');
const page = source('src/pages/WorkspaceWorkflowsPage.tsx');
const components = source('src/pages/WorkspaceWorkflowsPage.components.tsx');
const urlState = source('src/pages/workflows/useWorkspaceWorkflowsUrlState.ts');
const actions = source('src/pages/workflows/useWorkspaceWorkflowActions.ts');
const workflows = [
  { id: 'workflow-1', name: 'Cluster Investigation' },
  { id: 'workflow-2', name: 'Incident Follow Up' }
] as WorkflowDefinition[];

describe('workflow route-backed master-detail navigation', () => {
  it('treats workflow as selection and q as search while accepting legacy aliases', () => {
    expect(getWorkflowRouteSelectionTarget('?workflow=workflow-1&q=cluster')).toBe('workflow-1');
    expect(getWorkflowRouteSelectionTarget('?workflowId=workflow-1')).toBe('workflow-1');
    expect(getWorkflowRouteSelectionTarget('?selectedWorkflow=workflow-2')).toBe('workflow-2');
    expect(getWorkflowRouteSelectionTarget('?q=Cluster%20Investigation')).toBe('');
  });

  it('canonicalizes an initial exact-name q link once without treating fuzzy search as selection', () => {
    expect(findLegacyWorkflowQuerySelection(workflows, '?q=cluster%20investigation')?.id).toBe('workflow-1');
    expect(findLegacyWorkflowQuerySelection(workflows, '?q=cluster')).toBeUndefined();
    expect(findLegacyWorkflowQuerySelection(workflows, '?workflow=workflow-2&q=Cluster%20Investigation')).toBeUndefined();
    expect(urlState).toContain('const legacyQueryHandled = React.useRef(false);');
    expect(urlState).toContain("updateUrlSearch({ workflow: legacyWorkflow.id, q: null }, { replace: true });");
  });

  it('pushes explicit selections, resets tabs, and makes preview tab interaction explicit', () => {
    expect(urlState).toContain("updateUrlSearch({ workflow: workflowId || null, workflowId: null, selectedWorkflow: null, tab: null }, updateOptions);");
    expect(urlState).toContain('selectWorkflowTab(tab: WorkflowTab, previewWorkflowId = options.selectedWorkflowId)');
    expect(urlState).toContain("updateUrlSearch({ workflow: previewWorkflowId || null, tab: tab === 'overview' ? null : tab });");
    expect(page).toContain('onValueChange={(tab) => selectWorkflowTab(tab, selectedWorkflow.id)}');
  });

  it('restores browser state and replaces invalid or deleted selections', () => {
    expect(urlState).toContain('const urlSearch = useUrlSearchState();');
    expect(urlState).toContain("updateUrlSearch({ workflow: fallbackWorkflowId || null, workflowId: null, selectedWorkflow: null, tab: null }, { replace: true });");
    expect(actions).toContain("selectResultingWorkflow(nextWorkflows[0]?.id || '', { replace: true });");
    expect(actions).toContain('selectResultingWorkflow(mapped.id);');
  });

  it('clears only workflow detail state on Back and restores row focus', () => {
    expect(urlState).toContain('updateUrlSearch({ workflow: null, tab: null });');
    expect(page).toContain('clearWorkflowSelection()');
    expect(page).toContain('window.requestAnimationFrame(() => workflowRowRefs.current.get(workflowId)?.focus())');
  });

  it('retains loading, error, empty, search, and all five detail panels', () => {
    expect(components).toContain("import { MasterDetailEmptyState, MasterDetailListHeader, MasterDetailLoading");
    expect(components).toContain('ready && visibleWorkflows.length === 0 && !loadError');
    expect(components).toContain('<MasterDetailEmptyState');
    for (const snippet of [
      'Loading workflows…',
      'Workflows could not be loaded from the control plane.',
      'No workflows configured.',
      'No workflows match this search.',
      'Search workflow library'
    ]) expect(`${components}\n${page}`).toContain(snippet);
    for (const tab of ['overview', 'agents', 'capabilities', 'runs', 'settings']) {
      expect(page).toContain(`activeTab === '${tab}'`);
    }
  });
});
