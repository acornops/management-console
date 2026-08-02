import React from 'react';
import { Activity, CalendarClock, GitBranch, Webhook } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { SegmentedTabs } from '@acornops/ui';
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
    <div className={`mb-5 flex min-w-0 items-end gap-4 ${className}`}>
      <span className="type-micro-label hidden shrink-0 pb-3 text-ui-text-muted xl:block">
        {t('workflows.sections.scope')}
      </span>
      <SegmentedTabs<WorkflowPageSection>
        activeValue={activeSection}
        ariaLabel={t('workflows.sections.label')}
        className="min-w-0 flex-1 gap-0"
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
          icon: <CalendarClock className="h-4 w-4" aria-hidden="true" />
        },
        {
          value: 'incomingWebhooks',
          label: t('workflows.sections.incomingWebhooks'),
          icon: <Webhook className="h-4 w-4" aria-hidden="true" />
        },
        {
          value: 'activity',
          label: t('workflows.sections.activity'),
          icon: <Activity className="h-4 w-4" aria-hidden="true" />,
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
