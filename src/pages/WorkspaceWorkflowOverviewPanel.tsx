import { useTranslation } from 'react-i18next';
import React from 'react';

import {
  WorkflowPanel,
  WorkflowSection,
} from '@/pages/WorkspaceWorkflowsPage.components';
import type { WorkflowDefinition } from '@/pages/workflows/workflowModel';

export const WorkflowOverviewPanel: React.FC<{
  workflow: WorkflowDefinition;
  agentAssignment: React.ReactNode;
  showHeader?: boolean;
}> = ({
  workflow,
  agentAssignment,
  showHeader
}) => {
  const { t } = useTranslation();
  return (
    <WorkflowPanel title={t('app.overview')} description={t('workflowUi.overviewDescription')} showHeader={showHeader}>
      {agentAssignment}
      <WorkflowSection title={t('workflowUi.promptLabel')} description={t('workflowUi.promptDescription')}>
        <div className="mt-3 rounded-md border border-ui-border bg-ui-bg px-4 py-3">
          <p className="whitespace-pre-wrap break-words type-body text-ui-text">{workflow.starterPrompt}</p>
        </div>
      </WorkflowSection>
    </WorkflowPanel>
  );
};
