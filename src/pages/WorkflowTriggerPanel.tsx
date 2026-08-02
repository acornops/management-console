import React from 'react';

import type { Workspace } from '@/types';
import type { WorkflowDefinition, WorkflowView } from '@/pages/workflows/workflowModel';

const WorkspaceSchedulesPage = React.lazy(() => import('@/pages/WorkspaceSchedulesPage').then((module) => ({ default: module.WorkspaceSchedulesPage })));
const WorkspaceIncomingWebhooksPage = React.lazy(() => import('@/pages/WorkspaceIncomingWebhooksPage').then((module) => ({ default: module.WorkspaceIncomingWebhooksPage })));

export const WorkflowTriggerPanel: React.FC<{
  activeView: Extract<WorkflowView, 'schedules' | 'webhooks'>;
  workflow: WorkflowDefinition;
  workspace: Workspace;
}> = ({ activeView, workflow, workspace }) => (
  <React.Suspense fallback={<p className="p-5 type-body text-ui-text-muted" role="status">Loading {activeView}…</p>}>
    {activeView === 'schedules' ? (
      <WorkspaceSchedulesPage embedded constrainedWorkflowId={workflow.id} workspace={workspace} />
    ) : (
      <WorkspaceIncomingWebhooksPage embedded constrainedWorkflowId={workflow.id} workspace={workspace} />
    )}
  </React.Suspense>
);
