import React from 'react';
import { useTranslation } from 'react-i18next';

import { DestructiveConfirmationDialog } from '@acornops/ui';
import type { WorkflowWebhook } from '@/services/control-plane/workflowWebhookApi';

interface WorkspaceWebhookDeleteDialogProps {
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
  webhook?: WorkflowWebhook;
}

export const WorkspaceWebhookDeleteDialog: React.FC<WorkspaceWebhookDeleteDialogProps> = ({
  error,
  onCancel,
  onConfirm,
  pending,
  webhook
}) => {
  const { t } = useTranslation();

  return (
    <DestructiveConfirmationDialog
      open={Boolean(webhook)}
      titleId="delete-workflow-webhook-title"
      title={webhook ? t('eventTriggers.delete.title', { name: webhook.name }) : ''}
      subtitle={t('common.irreversibleAction')}
      description={t('eventTriggers.delete.description')}
      error={webhook ? error : null}
      confirmLabel={t('eventTriggers.actions.delete')}
      loadingLabel={t('app.deleting')}
      cancelLabel={t('common.cancel')}
      pending={pending}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
};
