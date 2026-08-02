import React from 'react';
import { DrawerFrame } from '@acornops/ui';

import type { Workspace } from '@/types';
import type { WorkflowDefinition } from '@/pages/workflows/workflowModel';

const WorkspaceSchedulesPage = React.lazy(() => import('@/pages/WorkspaceSchedulesPage').then((module) => ({ default: module.WorkspaceSchedulesPage })));
const WorkspaceIncomingWebhooksPage = React.lazy(() => import('@/pages/WorkspaceIncomingWebhooksPage').then((module) => ({ default: module.WorkspaceIncomingWebhooksPage })));

export const WorkflowTriggerDrawers: React.FC<{
  managementPanel: string | null;
  onClose: () => void;
  workflow: WorkflowDefinition;
  workspace: Workspace;
}> = ({ managementPanel, onClose, workflow, workspace }) => (
  <>
    <DrawerFrame
      open={managementPanel === 'schedules' || managementPanel === 'schedule'}
      width="xl"
      title="Schedules"
      titleId="workflow-schedules-drawer-title"
      description={`Manage recurring runs for ${workflow.name}.`}
      bodyClassName="p-0"
      onClose={onClose}
    >
      <React.Suspense fallback={null}>
        <WorkspaceSchedulesPage
          embedded
          constrainedWorkflowId={workflow.id}
          create={managementPanel === 'schedule'}
          createWorkflowId={managementPanel === 'schedule' ? workflow.id : undefined}
          workspace={workspace}
        />
      </React.Suspense>
    </DrawerFrame>

    <DrawerFrame
      open={managementPanel === 'webhooks'}
      width="xl"
      title="Webhooks"
      titleId="workflow-webhooks-drawer-title"
      description={`Manage incoming webhook triggers for ${workflow.name}.`}
      bodyClassName="p-0"
      onClose={onClose}
    >
      <React.Suspense fallback={null}>
        <WorkspaceIncomingWebhooksPage embedded constrainedWorkflowId={workflow.id} workspace={workspace} />
      </React.Suspense>
    </DrawerFrame>
  </>
);
