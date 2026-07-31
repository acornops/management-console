import React from 'react';
import { SegmentedTabs } from '@acornops/ui';
import { useTranslation } from 'react-i18next';

import { useWorkspaceWorkflowActivity } from '@/features/workflow-activity/WorkspaceWorkflowActivityContext';
import { AppPaths, type WorkflowWorkspaceView } from '@/utils/routes';

interface WorkflowWorkspaceViewTabsProps {
  activeView: WorkflowWorkspaceView;
  children: React.ReactNode;
  navigate: (path: string) => void;
  workspaceId: string;
}

export const WorkflowWorkspaceViewTabs: React.FC<WorkflowWorkspaceViewTabsProps> = ({
  activeView,
  children,
  navigate,
  workspaceId
}) => {
  const { t } = useTranslation();
  const activity = useWorkspaceWorkflowActivity();

  return (
    <div className="mb-4 min-w-0 space-y-3">
      <div className="flex min-h-11 min-w-0 items-center">
        <SegmentedTabs<WorkflowWorkspaceView>
          activeValue={activeView}
          allPanelsMounted={false}
          ariaLabel={t('workflowWorkspaceViews.label')}
          className="w-full border-b-0"
          items={[
            {
              value: 'workflows',
              label: t('workflowWorkspaceViews.showWorkflows')
            },
            {
              value: 'activity',
              label: t('workflowWorkspaceViews.showActivity'),
              count: activity.openCount > 0 ? activity.openCount : undefined
            }
          ]}
          onValueChange={(view) => navigate(
            view === 'activity'
              ? AppPaths.workspaceActivity(workspaceId)
              : AppPaths.workspaceWorkflows(workspaceId)
          )}
        />
      </div>
      <div className="w-full min-w-0">{children}</div>
    </div>
  );
};
