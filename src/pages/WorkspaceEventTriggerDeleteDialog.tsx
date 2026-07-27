import React from 'react';
import { useTranslation } from 'react-i18next';

import { DestructiveConfirmationDialog } from '@/components/common/DestructiveConfirmationDialog';
import type { WorkflowEventTrigger } from '@/services/control-plane/workflowEventTriggerApi';

interface WorkspaceEventTriggerDeleteDialogProps {
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
  trigger?: WorkflowEventTrigger;
}

export const WorkspaceEventTriggerDeleteDialog: React.FC<WorkspaceEventTriggerDeleteDialogProps> = ({
  error,
  onCancel,
  onConfirm,
  pending,
  trigger
}) => {
  const { t } = useTranslation();

  return (
    <DestructiveConfirmationDialog
      open={Boolean(trigger)}
      titleId="delete-event-trigger-title"
      title={trigger ? t('eventTriggers.delete.title', { name: trigger.name }) : ''}
      subtitle={t('common.irreversibleAction')}
      description={t('eventTriggers.delete.description')}
      error={trigger ? error : null}
      confirmLabel={t('eventTriggers.actions.delete')}
      loadingLabel={t('app.deleting')}
      cancelLabel={t('common.cancel')}
      pending={pending}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
};
