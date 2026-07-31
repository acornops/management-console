import React from 'react';
import {
  findWorkflowByRouteTarget,
  getWorkflowRouteSelectionTarget,
  type WorkflowDefinition,
  type WorkflowView
} from '@/pages/workflows/workflowModel';
import { workflowViews } from '@/pages/workflows/workflowPageHelpers';
import { updateUrlSearch, useUrlSearchState } from '@/hooks/useUrlSearchState';

interface WorkflowUrlStateOptions {
  workflows: WorkflowDefinition[];
  routeHydrated: boolean;
  selectedWorkflowId: string;
  activeView: WorkflowView;
  createPanelOpen: boolean;
  setSelectedWorkflowId: React.Dispatch<React.SetStateAction<string>>;
  setActiveView: React.Dispatch<React.SetStateAction<WorkflowView>>;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  setCreatePanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useWorkspaceWorkflowsUrlState(options: WorkflowUrlStateOptions) {
  const urlSearch = useUrlSearchState();
  const routeTarget = getWorkflowRouteSelectionTarget(`?${urlSearch.toString()}`);
  const routeWorkflow = findWorkflowByRouteTarget(options.workflows, routeTarget);
  React.useEffect(() => {
    const nextRouteWorkflow = findWorkflowByRouteTarget(options.workflows, getWorkflowRouteSelectionTarget(`?${urlSearch.toString()}`));
    const routeView = urlSearch.get('tab') as WorkflowView | null;
    const panel = urlSearch.get('panel');
    if (nextRouteWorkflow) options.setSelectedWorkflowId(nextRouteWorkflow.id);
    options.setQuery(urlSearch.get('q') || '');
    options.setActiveView(routeView && workflowViews.includes(routeView) ? routeView : 'overview');
    options.setCreatePanelOpen(panel === 'create');
  }, [urlSearch, options.workflows]);
  React.useEffect(() => {
    if (!options.routeHydrated) return;
    if (routeTarget) {
      if (routeWorkflow) {
        if (urlSearch.get('workflow') !== routeWorkflow.id) {
          updateUrlSearch({ workflow: routeWorkflow.id }, { replace: true });
        }
      } else {
        const fallbackWorkflowId = options.workflows[0]?.id || '';
        options.setSelectedWorkflowId(fallbackWorkflowId);
        options.setActiveView('overview');
        updateUrlSearch({ workflow: fallbackWorkflowId || null, tab: null }, { replace: true });
      }
      return;
    }
  }, [options.routeHydrated, options.workflows, routeTarget, routeWorkflow, urlSearch]);
  React.useEffect(() => {
    if (!options.createPanelOpen && urlSearch.get('panel') === 'create') updateUrlSearch({ panel: null }, { replace: true });
  }, [options.createPanelOpen]);
  return {
    hasExplicitWorkflowSelection: Boolean(routeTarget),
    selectWorkflow(workflowId: string, updateOptions: { replace?: boolean } = {}) {
      options.setSelectedWorkflowId(workflowId);
      options.setActiveView('overview');
      updateUrlSearch({ workflow: workflowId || null, tab: null }, updateOptions);
    },
    clearWorkflowSelection() {
      options.setActiveView('overview');
      updateUrlSearch({ workflow: null, tab: null });
    },
    selectWorkflowView(view: WorkflowView, previewWorkflowId = options.selectedWorkflowId) {
      if (previewWorkflowId) options.setSelectedWorkflowId(previewWorkflowId);
      options.setActiveView(view);
      updateUrlSearch({ workflow: previewWorkflowId || null, tab: view === 'overview' ? null : view });
    }
  };
}
