import React from 'react';
import { useTranslation } from 'react-i18next';
import { DestructiveConfirmationDialog } from '@acornops/ui';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneTargetToolItem } from '@/services/controlPlaneApi';
import { formatError } from '@/features/targets/admin/targetSkillsViewModel';

interface TargetInsightsResetDialogProps {
  workspaceId: string;
  targetId: string;
  tool: ControlPlaneTargetToolItem;
  canEdit: boolean;
  onClose: () => void;
}

export const TargetInsightsResetDialog: React.FC<TargetInsightsResetDialogProps> = ({
  workspaceId,
  targetId,
  tool,
  canEdit,
  onClose
}) => {
  const { t } = useTranslation();
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const resetBank = async () => {
    if (!canEdit) return;
    setSaving(true);
    setError('');
    try {
      await controlPlaneApi.resetTargetInsights(workspaceId, targetId);
      onClose();
    } catch (err) {
      setError(formatError(err, t('tools.targetInsights.resetFailed'), 'targetInsights'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DestructiveConfirmationDialog
      open
      titleId="target-insights-reset-dialog-title"
      title={t('tools.targetInsights.resetTitle')}
      subtitle={tool.label}
      description={t('tools.targetInsights.resetConfirm')}
      error={error}
      cancelLabel={t('tools.targetInsights.cancel')}
      closeLabel={t('tools.targetInsights.closeReset')}
      confirmLabel={t('tools.targetInsights.reset')}
      loadingLabel={t('common.saving')}
      confirmDisabled={!canEdit}
      pending={saving}
      onCancel={onClose}
      onConfirm={() => void resetBank()}
    />
  );
};
