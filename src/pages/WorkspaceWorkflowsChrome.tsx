import { useTranslation } from 'react-i18next';
import React from 'react';

import { Button, PageHeader } from '@acornops/ui';
import { ICONS } from '@/constants';
import { WorkflowSections } from '@/pages/workflows/WorkflowSections';
import type { Workspace } from '@/types';

interface WorkspaceWorkflowsChromeProps {
  canManageWorkflows: boolean;
  hiddenOnCompact: boolean;
  navigate: (path: string) => void;
  onCreate: () => void;
  onOpenHelp: () => void;
  workflowOptionsReady: boolean;
  workspace: Workspace;
}

export const WorkspaceWorkflowsChrome: React.FC<WorkspaceWorkflowsChromeProps> = ({
  canManageWorkflows,
  hiddenOnCompact,
  navigate,
  onCreate,
  onOpenHelp,
  workflowOptionsReady,
  workspace
}) => {
  const { t } = useTranslation();
  return (
    <div className={hiddenOnCompact ? 'hidden min-[1440px]:contents' : 'contents'}>
      <PageHeader
        title={t('app.workflows')}
        description={t('workflowUi.pageDescription')}
        descriptionClassName="max-w-[96ch]"
        actions={<div className="flex flex-col items-start gap-2 lg:items-end">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="md" onClick={onOpenHelp}>{t('workflowUi.helpTitle')}</Button>
            <Button type="button" variant="primary" size="md" disabled={!canManageWorkflows || !workflowOptionsReady} onClick={onCreate}>
              <ICONS.Plus className="h-4 w-4" aria-hidden="true" /> {t('workflowUi.add')}
            </Button>
          </div>
          {!canManageWorkflows && <span className="type-caption max-w-64 type-emphasis text-ui-text-muted lg:text-right">{t('workflowUi.managePermission')}</span>}
        </div>}
      />
      <WorkflowSections activeSection="all" navigate={navigate} workspaceId={workspace.id} />
    </div>
  );
};
