import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button, StatusBadge } from '@acornops/ui';
import { ICONS } from '@/constants';
import type { WorkflowPrimaryAction } from '@/pages/workflows/workflowModel';

export const WorkflowLaunchActions: React.FC<{
  activating: boolean;
  canManageWorkflows: boolean;
  launchBlocker: string | null;
  launching: boolean;
  onActivate: () => void;
  onEdit: () => void;
  onLaunch: () => void;
  onReviewReadiness: () => void;
  primaryAction: WorkflowPrimaryAction;
}> = ({
  activating,
  canManageWorkflows,
  launchBlocker,
  launching,
  onActivate,
  onEdit,
  onLaunch,
  onReviewReadiness,
  primaryAction
}) => {
  const { t } = useTranslation();
  const launchBlocked = primaryAction === 'launch' && Boolean(launchBlocker);

  return (
    <div className="mt-3 flex w-full flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between" aria-label="Selected workflow actions">
      {(primaryAction === 'activate' || launchBlocked) && (
        <div className="flex min-w-0 items-center gap-2" role="status" aria-live="polite" aria-atomic="true">
          <StatusBadge tone="warning">
            {primaryAction === 'activate' ? 'Inactive' : 'Blocked'}
          </StatusBadge>
          <span className="type-caption min-w-0 max-w-2xl break-words text-ui-text-muted">
            {primaryAction === 'activate' ? 'Activate this workflow before starting a run.' : launchBlocker}
          </span>
        </div>
      )}
      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap sm:justify-end 2xl:ml-auto 2xl:w-auto 2xl:shrink-0">
        <Button className="w-full whitespace-nowrap sm:w-auto" variant="secondary" size="md" onClick={onEdit} disabled={!canManageWorkflows}>
          <ICONS.Pencil className="h-4 w-4" aria-hidden="true" />
          {t('workflows.actions.edit')}
        </Button>
        {primaryAction === 'activate' ? (
          <Button className="w-full whitespace-nowrap sm:w-auto" variant="activation" size="md" onClick={onActivate} disabled={!canManageWorkflows || activating}>
            <ICONS.Zap className="h-4 w-4" aria-hidden="true" />
            {activating ? t('workflows.actions.activating') : t('workflows.actions.activate')}
          </Button>
        ) : launchBlocked ? (
          <Button className="w-full whitespace-nowrap sm:w-auto" variant="secondary" size="md" onClick={onReviewReadiness}>
            <ICONS.Shield className="h-4 w-4" aria-hidden="true" />
            {t('workflows.actions.reviewReadiness')}
          </Button>
        ) : (
          <Button className="w-full whitespace-nowrap sm:w-auto" variant="activation" size="md" onClick={onLaunch} disabled={launching} aria-keyshortcuts="Control+Enter Meta+Enter">
            <ICONS.Send className="h-4 w-4" aria-hidden="true" />
            {launching ? t('workflows.actions.starting') : t('workflows.actions.launch')}
          </Button>
        )}
      </div>
    </div>
  );
};
