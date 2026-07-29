import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@acornops/ui';
import { CloseButton } from '@acornops/ui';
import { DialogFrame } from '@acornops/ui';
import { InlineLoadingIndicator } from '@acornops/ui';
import { StatusBadge } from '@acornops/ui';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneTargetToolItem, ControlPlaneWorkspaceAuditEvent } from '@/services/controlPlaneApi';
import { formatError } from '@/features/targets/admin/targetSkillsViewModel';
import { appHref } from '@/app/workspaceNavigation';
import { AppPaths, withAssistantSession } from '@/utils/routes';

interface TargetInsightsActivityDialogProps {
  workspaceId: string;
  targetId: string;
  targetType: 'kubernetes' | 'virtual_machine';
  tool: ControlPlaneTargetToolItem;
  onClose: () => void;
}

type CheckpointOutcome = 'applied' | 'noop' | 'invalid_response' | 'provider_failure';

function metadataString(event: ControlPlaneWorkspaceAuditEvent, key: string): string | null {
  const value = event.metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function metadataCount(event: ControlPlaneWorkspaceAuditEvent, key: string): number | null {
  const value = event.metadata?.[key];
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

function checkpointOutcome(event: ControlPlaneWorkspaceAuditEvent): CheckpointOutcome | null {
  const outcome = metadataString(event, 'outcome');
  return outcome === 'applied' || outcome === 'noop' || outcome === 'invalid_response' || outcome === 'provider_failure'
    ? outcome
    : null;
}

export function targetInsightsCheckpointActivityDetails(
  event: ControlPlaneWorkspaceAuditEvent,
  target: { workspaceId: string; targetId: string; targetType: 'kubernetes' | 'virtual_machine' }
) {
  const outcome = checkpointOutcome(event);
  const sessionId = metadataString(event, 'sessionId');
  const sourcePath = sessionId
    ? withAssistantSession(
        target.targetType === 'kubernetes'
          ? AppPaths.workspaceKubernetesClusterDiagnostics(target.workspaceId, target.targetId, 'chat')
          : AppPaths.workspaceVirtualMachineDetail(target.workspaceId, target.targetId, 'chat'),
        sessionId
      )
    : null;
  return {
    outcome,
    reasonCode: metadataString(event, 'reasonCode'),
    provider: metadataString(event, 'provider'),
    model: metadataString(event, 'model'),
    appliedPatchCount: metadataCount(event, 'appliedPatchCount'),
    rejectedPatchCount: metadataCount(event, 'rejectedPatchCount'),
    sourcePath,
    tone: outcome === 'applied'
      ? 'success' as const
      : outcome === 'noop'
        ? 'neutral' as const
        : outcome
          ? 'danger' as const
          : null
  };
}

export const TargetInsightsActivityDialog: React.FC<TargetInsightsActivityDialogProps> = ({
  workspaceId,
  targetId,
  targetType,
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
    <DialogFrame unframed
      titleId="target-insights-activity-dialog-title"
      onClose={onClose}
      className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-2xl"
    >
      <div className="flex items-start justify-between gap-4 border-b border-ui-border bg-ui-bg px-6 py-4">
        <div className="min-w-0">
          <h3 id="target-insights-activity-dialog-title" className="type-panel-title">{t('tools.targetInsights.activityTitle')}</h3>
          <p className="type-caption mt-1 text-ui-text-muted">{tool.description}</p>
        </div>
        <CloseButton
          onClick={onClose}
          aria-label={t('tools.targetInsights.closeActivity')}
        />
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
              {activity.length > 0 ? activity.map((event) => {
                const {
                  outcome,
                  reasonCode,
                  provider,
                  model,
                  appliedPatchCount,
                  rejectedPatchCount,
                  sourcePath,
                  tone
                } = targetInsightsCheckpointActivityDetails(event, { workspaceId, targetId, targetType });

                return (
                  <div key={event.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-ui-text">{event.summary}</p>
                      {outcome && tone ? (
                        <StatusBadge tone={tone}>{t(`tools.targetInsights.checkpoint.outcomes.${outcome}`)}</StatusBadge>
                      ) : null}
                    </div>
                    <p className="type-caption mt-1 text-ui-text-muted">{new Date(event.occurredAt).toLocaleString()}</p>
                    {(reasonCode || provider || appliedPatchCount !== null || rejectedPatchCount !== null || sourcePath) ? (
                      <div className="type-caption mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-ui-text-muted">
                        {reasonCode ? (
                          <span>{t('tools.targetInsights.checkpoint.reason')}: {t(`tools.targetInsights.checkpoint.reasons.${reasonCode}`, { defaultValue: reasonCode })}</span>
                        ) : null}
                        {provider ? (
                          <span className="[overflow-wrap:anywhere]">{t('tools.targetInsights.checkpoint.model')}: {model ? `${provider} · ${model}` : provider}</span>
                        ) : null}
                        {appliedPatchCount ? (
                          <span>{t('tools.targetInsights.checkpoint.appliedCount', { count: appliedPatchCount })}</span>
                        ) : null}
                        {rejectedPatchCount ? (
                          <span>{t('tools.targetInsights.checkpoint.rejectedCount', { count: rejectedPatchCount })}</span>
                        ) : null}
                        {sourcePath ? (
                          <a className="font-semibold text-ui-link hover:underline" href={appHref(sourcePath)}>
                            {t('tools.targetInsights.checkpoint.openSession')}
                          </a>
                        ) : null}
                      </div>
                    ) : (
                      <p className="type-caption mt-1 text-ui-text-muted">{event.eventType}</p>
                    )}
                  </div>
                );
              }) : (
                <p className="type-caption px-5 py-6 text-ui-text-muted">{t('tools.targetInsights.noActivity')}</p>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-ui-border bg-ui-bg px-6 py-4">
        <Button variant="secondary" size="sm" onClick={onClose}>{t('common.close')}</Button>
      </div>
    </DialogFrame>
  );
};
