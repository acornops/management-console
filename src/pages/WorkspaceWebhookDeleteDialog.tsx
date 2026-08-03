import React from 'react';
import { useTranslation } from 'react-i18next';

import type { WorkflowWebhook } from '@/services/control-plane/workflowWebhookApi';
import { WorkflowAutomationDeleteDialog } from '@/pages/WorkflowAutomationDeleteDialog';

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
    <WorkflowAutomationDeleteDialog
      name={webhook?.name}
      titleId="delete-workflow-webhook-title"
      title={webhook ? t('eventTriggers.delete.title', { name: webhook.name }) : ''}
      description={t('eventTriggers.delete.description')}
      error={error}
      confirmLabel={t('eventTriggers.actions.delete')}
      pending={pending}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
};
