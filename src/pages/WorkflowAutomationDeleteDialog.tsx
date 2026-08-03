import { useTranslation } from 'react-i18next';

import { DestructiveConfirmationDialog } from '@acornops/ui';

export interface WorkflowAutomationDeleteDialogProps {
  confirmLabel: string;
  description: string;
  error: string;
  name?: string;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
  title: string;
  titleId: string;
}

export function WorkflowAutomationDeleteDialog({
  confirmLabel,
  description,
  error,
  name,
  onCancel,
  onConfirm,
  pending,
  title,
  titleId
}: WorkflowAutomationDeleteDialogProps) {
  const { t } = useTranslation();
  return (
    <DestructiveConfirmationDialog
      open={Boolean(name)}
      titleId={titleId}
      title={name ? title : ''}
      subtitle={t('common.irreversibleAction')}
      description={description}
      error={name ? error : null}
      confirmLabel={confirmLabel}
      loadingLabel={t('app.deleting')}
      cancelLabel={t('common.cancel')}
      pending={pending}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
