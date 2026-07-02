import React from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Dialog } from '@/components/common/Dialog';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneTargetToolItem, ControlPlaneWorkspaceAuditEvent } from '@/services/controlPlaneApi';
import { formatError } from '@/features/kubernetes-cluster-detail/components/detail/views/targetSkillsViewModel';

interface TargetInsightsActivityDialogProps {
  workspaceId: string;
  targetId: string;
  tool: ControlPlaneTargetToolItem;
  onClose: () => void;
}

export const TargetInsightsActivityDialog: React.FC<TargetInsightsActivityDialogProps> = ({
  workspaceId,
  targetId,
  tool,
  onClose
}) => {
  const { t } = useTranslation();
  const [activity, setActivity] = React.useState<ControlPlaneWorkspaceAuditEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    controlPlaneApi.listTargetInsightsActivity(workspaceId, targetId)
      .then((body) => {
        if (!cancelled) setActivity(body.items || []);
      })
      .catch((err) => {
        if (!cancelled) setError(formatError(err, t('tools.targetInsights.activityFailed'), 'targetInsights'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [targetId, t, workspaceId]);

  return (
    <Dialog
      titleId="target-insights-activity-dialog-title"
      onClose={onClose}
      className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-2xl"
    >
      <div className="flex items-start justify-between gap-4 border-b border-ui-border bg-ui-bg px-6 py-4">
        <div className="min-w-0">
          <h3 id="target-insights-activity-dialog-title" className="type-panel-title">{t('tools.targetInsights.activityTitle')}</h3>
          <p className="type-caption mt-1 text-ui-text-muted">{tool.description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-ui-text-muted transition-colors hover:bg-ui-surface hover:text-accent-strong"
          aria-label={t('tools.targetInsights.closeActivity')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-[18rem] flex-1 overflow-y-auto p-6 custom-scrollbar">
        {loading ? (
          <div className="flex min-h-[14rem] items-center justify-center">
            <InlineLoadingIndicator label={t('tools.targetInsights.loadingActivity')} />
          </div>
        ) : error ? (
          <div className="type-caption rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
            {error}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-ui-border bg-ui-surface">
            <div className="border-b border-ui-border bg-ui-bg px-5 py-4">
              <p className="type-row-title">{t('tools.targetInsights.activity')}</p>
              <p className="type-caption mt-1 text-ui-text-muted">{t('tools.targetInsights.activityBody')}</p>
            </div>
            <div className="divide-y divide-ui-border">
              {activity.length > 0 ? activity.map((event) => (
                <div key={event.id} className="px-5 py-4">
                  <p className="text-sm font-semibold text-ui-text">{event.summary}</p>
                  <p className="type-caption mt-1 text-ui-text-muted">{event.eventType} · {new Date(event.occurredAt).toLocaleString()}</p>
                </div>
              )) : (
                <p className="type-caption px-5 py-6 text-ui-text-muted">{t('tools.targetInsights.noActivity')}</p>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-ui-border bg-ui-bg px-6 py-4">
        <Button variant="secondary" size="sm" onClick={onClose}>{t('common.close')}</Button>
      </div>
    </Dialog>
  );
};
