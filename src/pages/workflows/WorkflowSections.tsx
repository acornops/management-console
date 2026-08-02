import React from 'react';
import { GitBranch } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { SegmentedTabs } from '@acornops/ui';
import { ICONS } from '@/constants';
import { useWorkspaceWorkflowActivity } from '@/features/workflow-activity/WorkspaceWorkflowActivityContext';
import { AppPaths, type WorkflowSection } from '@/utils/routes';

type WorkflowPageSection = WorkflowSection | 'activity';

interface WorkflowSectionsProps {
  activeSection: WorkflowPageSection;
  className?: string;
  workspaceId: string;
  navigate: (path: string) => void;
}

export const WorkflowSections: React.FC<WorkflowSectionsProps> = ({
  activeSection,
  className = '',
  workspaceId,
  navigate
}) => {
  const { t } = useTranslation();
  const activity = useWorkspaceWorkflowActivity();

  return (
    <div className={`mb-5 min-w-0 ${className}`}>
      <SegmentedTabs<WorkflowPageSection>
        activeValue={activeSection}
        ariaLabel={t('workflows.sections.label')}
        className="min-w-0 flex-1 gap-0 [&_button]:px-2 sm:[&_button]:px-3 [&_button>span:first-child]:hidden sm:[&_button>span:first-child]:inline-flex"
        idBase="workflow-section"
        allPanelsMounted={false}
        items={[
        {
          value: 'all',
          label: t('workflows.sections.all'),
          icon: <GitBranch className="h-4 w-4" aria-hidden="true" />
        },
        {
          value: 'schedules',
          label: t('workflows.sections.schedules'),
          icon: <ICONS.CalendarClock className="h-4 w-4" aria-hidden="true" />
        },
        {
          value: 'activity',
          label: t('workflows.sections.activity'),
          icon: <ICONS.Activity className="h-4 w-4" aria-hidden="true" />,
          count: activity.openCount > 0 ? activity.openCount : undefined
        }
        ]}
        onValueChange={(section) => {
          if (section === activeSection) return;
          navigate(
            section === 'activity'
              ? AppPaths.workspaceActivity(workspaceId)
              : AppPaths.workspaceWorkflows(workspaceId, section)
          );
        }}
      />
    </div>
  );
};
