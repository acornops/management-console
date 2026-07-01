import React from 'react';
import { RotateCcw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Dialog } from '@/components/common/Dialog';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneTargetToolItem } from '@/services/controlPlaneApi';
import { formatError } from '@/features/kubernetes-cluster-detail/components/detail/views/targetSkillsViewModel';

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
      setError(formatError(err, t('tools.targetInsights.resetFailed')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      titleId="target-insights-reset-dialog-title"
      closeDisabled={saving}
      onClose={onClose}
      className="w-full max-w-lg overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-2xl"
    >
      <div className="flex items-start justify-between gap-4 border-b border-ui-border bg-ui-bg px-6 py-4">
        <div className="min-w-0">
          <h3 id="target-insights-reset-dialog-title" className="type-panel-title">{t('tools.targetInsights.resetTitle')}</h3>
          <p className="type-caption mt-1 text-ui-text-muted">{tool.label}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded-lg p-1.5 text-ui-text-muted transition-colors hover:bg-ui-surface hover:text-accent-strong disabled:opacity-50"
          aria-label={t('tools.targetInsights.closeReset')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="px-6 py-5">
        <div className="flex gap-3 rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
          <RotateCcw className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="text-sm font-semibold">{t('tools.targetInsights.resetWarningTitle')}</p>
            <p className="type-caption mt-1">{t('tools.targetInsights.resetConfirm')}</p>
          </div>
        </div>
        {error && (
          <div className="type-caption mt-4 rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
            {error}
          </div>
        )}
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-ui-border bg-ui-bg px-6 py-4">
        {!canEdit ? (
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>{t('common.close')}</Button>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>{t('tools.targetInsights.cancel')}</Button>
            <Button variant="danger" size="sm" onClick={() => void resetBank()} disabled={saving}>
              {saving ? t('common.saving') : t('tools.targetInsights.reset')}
            </Button>
          </>
        )}
      </div>
    </Dialog>
  );
};
