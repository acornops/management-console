import React from 'react';

import { SegmentedTabs } from '@acornops/ui';
import { ICONS } from '@/constants';
import type { WorkflowView } from '@/pages/workflows/workflowModel';

const viewIcons: Record<WorkflowView, React.ElementType> = {
  overview: ICONS.LayoutGrid,
  agents: ICONS.Bot,
  capabilities: ICONS.Shield,
  runs: ICONS.Activity,
  settings: ICONS.Settings
};
const viewLabels: Record<WorkflowView, string> = {
  overview: 'Overview',
  agents: 'Agents',
  capabilities: 'Capabilities',
  runs: 'Runs',
  settings: 'Settings'
};
export const workflowInspectionViews: WorkflowView[] = ['overview', 'agents', 'capabilities', 'runs'];

export const WorkflowDetailTabs: React.FC<{
  activeView: WorkflowView;
  onChange: (view: WorkflowView) => void;
}> = ({ activeView, onChange }) => (
  <div className="flex min-w-0 items-end gap-3">
    <span className="type-micro-label hidden shrink-0 pb-3 text-ui-text-muted 2xl:block">Workflow</span>
    <SegmentedTabs<WorkflowView>
      activeValue={activeView}
      allPanelsMounted={false}
      ariaLabel="Workflow detail sections"
      className="min-w-0 flex-1 gap-0"
      idBase="workflow-detail-section"
      items={workflowInspectionViews.map((view) => {
        const Icon = viewIcons[view];
        return { value: view, label: viewLabels[view], icon: <Icon className="h-4 w-4" aria-hidden="true" /> };
      })}
      onValueChange={onChange}
    />
  </div>
);
