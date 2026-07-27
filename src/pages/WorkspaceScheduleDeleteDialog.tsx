import React from 'react';
import { useTranslation } from 'react-i18next';

import { DestructiveConfirmationDialog } from '@/components/common/DestructiveConfirmationDialog';
import type { WorkflowSchedule } from '@/services/control-plane/workflowApi';

interface WorkspaceScheduleDeleteDialogProps {
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
  schedule?: WorkflowSchedule;
}

export const WorkspaceScheduleDeleteDialog: React.FC<WorkspaceScheduleDeleteDialogProps> = ({
  error,
  onCancel,
  onConfirm,
  pending,
  schedule
}) => {
  const { t } = useTranslation();

  return (
    <DestructiveConfirmationDialog
      open={Boolean(schedule)}
      titleId="delete-schedule-title"
      title={schedule ? t('schedules.delete.title', { name: schedule.name }) : ''}
      subtitle={t('common.irreversibleAction')}
      description={t('schedules.delete.description')}
      error={schedule ? error : null}
      confirmLabel={t('schedules.actions.delete')}
      loadingLabel={t('app.deleting')}
      cancelLabel={t('common.cancel')}
      pending={pending}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
};
