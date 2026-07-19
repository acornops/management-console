import React from 'react';
import {
  findLegacyWorkflowQuerySelection,
  findWorkflowByRouteTarget,
  getWorkflowRouteSelectionTarget,
  type WorkflowDefinition,
  type WorkflowTab
} from '@/pages/workflows/workflowModel';
import { tabs } from '@/pages/workflows/workflowPageHelpers';
import { updateUrlSearch, useUrlSearchState } from '@/hooks/useUrlSearchState';

interface WorkflowUrlStateOptions {
  workflows: WorkflowDefinition[];
  routeHydrated: boolean;
  selectedWorkflowId: string;
  activeTab: WorkflowTab;
  createPanelOpen: boolean;
  setSelectedWorkflowId: React.Dispatch<React.SetStateAction<string>>;
  setActiveTab: React.Dispatch<React.SetStateAction<WorkflowTab>>;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  setCreatePanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setScheduleWorkflowId: React.Dispatch<React.SetStateAction<string>>;
}

export function useWorkspaceWorkflowsUrlState(options: WorkflowUrlStateOptions) {
  const urlSearch = useUrlSearchState();
  const legacyQueryHandled = React.useRef(false);
  const routeTarget = getWorkflowRouteSelectionTarget(`?${urlSearch.toString()}`);
  const routeWorkflow = findWorkflowByRouteTarget(options.workflows, routeTarget);
  React.useEffect(() => {
    const nextRouteWorkflow = findWorkflowByRouteTarget(options.workflows, getWorkflowRouteSelectionTarget(`?${urlSearch.toString()}`));
    const routeTab = urlSearch.get('tab') as WorkflowTab | null;
    const panel = urlSearch.get('panel');
    if (nextRouteWorkflow) options.setSelectedWorkflowId(nextRouteWorkflow.id);
    options.setQuery(urlSearch.get('q') || '');
    options.setActiveTab(routeTab && tabs.includes(routeTab) ? routeTab : 'overview');
    options.setCreatePanelOpen(panel === 'create');
    options.setScheduleWorkflowId(panel === 'schedule' ? nextRouteWorkflow?.id || options.selectedWorkflowId : '');
  }, [urlSearch, options.workflows]);
  React.useEffect(() => {
    if (!options.routeHydrated) return;
    if (routeTarget) {
      if (routeWorkflow) {
        const hasLegacyAlias = urlSearch.has('workflowId') || urlSearch.has('selectedWorkflow');
        if (urlSearch.get('workflow') !== routeWorkflow.id || hasLegacyAlias) {
          updateUrlSearch({ workflow: routeWorkflow.id, workflowId: null, selectedWorkflow: null }, { replace: true });
        }
      } else {
        const fallbackWorkflowId = options.workflows[0]?.id || '';
        options.setSelectedWorkflowId(fallbackWorkflowId);
        options.setActiveTab('overview');
        updateUrlSearch({ workflow: fallbackWorkflowId || null, workflowId: null, selectedWorkflow: null, tab: null }, { replace: true });
      }
      return;
    }
    if (legacyQueryHandled.current) return;
    legacyQueryHandled.current = true;
    const legacyWorkflow = findLegacyWorkflowQuerySelection(options.workflows, `?${urlSearch.toString()}`);
    if (!legacyWorkflow) return;
    options.setSelectedWorkflowId(legacyWorkflow.id);
    options.setQuery('');
    updateUrlSearch({ workflow: legacyWorkflow.id, q: null }, { replace: true });
  }, [options.routeHydrated, options.workflows, routeTarget, routeWorkflow, urlSearch]);
  React.useEffect(() => {
    if (!options.createPanelOpen && urlSearch.get('panel') === 'create') updateUrlSearch({ panel: null }, { replace: true });
  }, [options.createPanelOpen]);
  return {
    hasExplicitWorkflowSelection: Boolean(routeTarget),
    selectWorkflow(workflowId: string, updateOptions: { replace?: boolean } = {}) {
      options.setSelectedWorkflowId(workflowId);
      options.setActiveTab('overview');
      updateUrlSearch({ workflow: workflowId || null, workflowId: null, selectedWorkflow: null, tab: null }, updateOptions);
    },
    clearWorkflowSelection() {
      options.setActiveTab('overview');
      updateUrlSearch({ workflow: null, tab: null });
    },
    selectWorkflowTab(tab: WorkflowTab, previewWorkflowId = options.selectedWorkflowId) {
      if (previewWorkflowId) options.setSelectedWorkflowId(previewWorkflowId);
      options.setActiveTab(tab);
      updateUrlSearch({ workflow: previewWorkflowId || null, tab: tab === 'overview' ? null : tab });
    }
  };
}
