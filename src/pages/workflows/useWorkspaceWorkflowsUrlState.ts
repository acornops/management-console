import React from 'react';
import {
  findWorkflowByRouteTarget,
  getWorkflowRouteSelectionTarget,
  type WorkflowDefinition,
  type WorkflowTab
} from '@/pages/workflows/workflowModel';
import { tabs } from '@/pages/workflows/workflowPageHelpers';
import { updateUrlSearch, useUrlSearchState } from '@/hooks/useUrlSearchState';

interface WorkflowUrlStateOptions {
  workflows: WorkflowDefinition[];
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
  React.useEffect(() => {
    const routeWorkflow = findWorkflowByRouteTarget(options.workflows, getWorkflowRouteSelectionTarget(`?${urlSearch.toString()}`));
    const routeTab = urlSearch.get('tab') as WorkflowTab | null;
    const panel = urlSearch.get('panel');
    if (routeWorkflow) options.setSelectedWorkflowId(routeWorkflow.id);
    options.setQuery(urlSearch.get('q') || '');
    options.setActiveTab(routeTab && tabs.includes(routeTab) ? routeTab : 'overview');
    options.setCreatePanelOpen(panel === 'create');
    options.setScheduleWorkflowId(panel === 'schedule' ? routeWorkflow?.id || options.selectedWorkflowId : '');
  }, [urlSearch, options.workflows]);
  React.useEffect(() => {
    if (!options.createPanelOpen && urlSearch.get('panel') === 'create') updateUrlSearch({ panel: null }, { replace: true });
  }, [options.createPanelOpen]);
  React.useEffect(() => {
    if (options.selectedWorkflowId && urlSearch.get('workflow') !== options.selectedWorkflowId) {
      updateUrlSearch({ workflow: options.selectedWorkflowId }, { replace: true });
    }
  }, [options.selectedWorkflowId]);
  React.useEffect(() => {
    const routeTab = urlSearch.get('tab') || 'overview';
    if (routeTab !== options.activeTab) updateUrlSearch({ tab: options.activeTab === 'overview' ? null : options.activeTab }, { replace: true });
  }, [options.activeTab]);
  return {
    selectWorkflow(workflowId: string) {
      options.setSelectedWorkflowId(workflowId);
      updateUrlSearch({ workflow: workflowId });
    },
    selectWorkflowTab(tab: WorkflowTab) {
      options.setActiveTab(tab);
      updateUrlSearch({ tab: tab === 'overview' ? null : tab });
    }
  };
}
