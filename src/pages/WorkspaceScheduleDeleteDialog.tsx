import React from 'react';
import { useTranslation } from 'react-i18next';

import type { WorkflowSchedule } from '@/services/control-plane/workflowApi';
import { WorkflowAutomationDeleteDialog } from '@/pages/WorkflowAutomationDeleteDialog';

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
    <WorkflowAutomationDeleteDialog
      name={schedule?.name}
      titleId="delete-schedule-title"
      title={schedule ? t('schedules.delete.title', { name: schedule.name }) : ''}
      description={t('schedules.delete.description')}
      error={error}
      confirmLabel={t('schedules.actions.delete')}
      pending={pending}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
};
