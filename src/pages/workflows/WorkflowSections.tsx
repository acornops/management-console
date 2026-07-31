import React from 'react';
import { CalendarClock, GitBranch, Webhook } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { SegmentedTabs } from '@acornops/ui';
import { AppPaths, type WorkflowSection } from '@/utils/routes';

interface WorkflowSectionsProps {
  activeSection: WorkflowSection;
  workspaceId: string;
  navigate: (path: string) => void;
}

export const WorkflowSections: React.FC<WorkflowSectionsProps> = ({
  activeSection,
  workspaceId,
  navigate
}) => {
  const { t } = useTranslation();
  return (
    <SegmentedTabs<WorkflowSection>
      activeValue={activeSection}
      ariaLabel={t('workflows.sections.label')}
      className="mb-8 max-w-4xl"
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
        }
      ]}
      onValueChange={(section) => {
        if (section !== activeSection) {
          navigate(AppPaths.workspaceWorkflows(workspaceId, section));
        }
      }}
    />
  );
};
