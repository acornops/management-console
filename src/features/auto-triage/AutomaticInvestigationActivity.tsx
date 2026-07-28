import React from 'react';
import { ArrowRight, Bot, Clock3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { appHref, handleAppLinkClick } from '@/app/workspaceNavigation';
import { Button, buttonClassName } from '@/components/common/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import type { AutomaticInvestigationSummary, TargetType } from '@/services/controlPlaneApi';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import { AppPaths, withAssistantSession } from '@/utils/routes';

function investigationPath(
  workspaceId: string,
  targetId: string,
  targetType: TargetType,
  activity: AutomaticInvestigationSummary
): string | null {
  if (activity.state === 'failed' || activity.state === 'deleted') return null;
  if (activity.state === 'awaiting_approval' && activity.runId) {
    return AppPaths.workspaceApprovals(workspaceId, { runId: activity.runId });
  }
  if (!activity.sessionId) return null;
  const chatPath = targetType === 'kubernetes'
    ? AppPaths.workspaceKubernetesClusterDiagnostics(workspaceId, targetId, 'chat')
    : AppPaths.workspaceVirtualMachineDetail(workspaceId, targetId, 'chat');
  return withAssistantSession(chatPath, activity.sessionId);
}

function stateTone(state: AutomaticInvestigationSummary['state']): React.ComponentProps<typeof StatusBadge>['tone'] {
  if (state === 'findings_ready') return 'success';
  if (state === 'awaiting_approval') return 'warning';
  if (state === 'failed') return 'danger';
  return 'neutral';
}

function actionKey(state: AutomaticInvestigationSummary['state']): string {
  if (state === 'awaiting_approval') return 'reviewApproval';
  if (state === 'findings_ready') return 'viewFindings';
  if (state === 'failed') return 'retry';
  if (state === 'queued') return 'starting';
  return 'open';
}

function delayedCopyKey(errorCode?: string): string {
  if (errorCode === 'AI_PROVIDER_NEEDS_SETUP') return 'automaticInvestigation.delay.aiProviderNeedsSetup';
  if (errorCode === 'TARGET_DISCONNECTED') return 'automaticInvestigation.delay.targetDisconnected';
  if (errorCode === 'NO_DIAGNOSTIC_TOOLS') return 'automaticInvestigation.delay.noDiagnosticTools';
  return 'automaticInvestigation.delay.retrying';
}

export function shouldShowManualAssistantFallback(
  activity?: AutomaticInvestigationSummary
): boolean {
  if (!activity) return true;
  if (activity.state === 'failed') return !activity.canRetry;
  if (activity.state === 'cancelled') return !activity.sessionId;
  return activity.state === 'deleted';
}

export const AutomaticInvestigationActivity: React.FC<{
  workspaceId: string;
  targetId: string;
  targetType: TargetType;
  issueId: string;
  activity?: AutomaticInvestigationSummary;
  navigate?: (path: string) => void;
}> = ({ workspaceId, targetId, targetType, issueId, activity, navigate }) => {
  const { t } = useTranslation();
  const [localActivity, setLocalActivity] = React.useState(activity);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [retryError, setRetryError] = React.useState('');

  React.useEffect(() => setLocalActivity(activity), [activity]);
  if (!localActivity) return null;

  const path = investigationPath(workspaceId, targetId, targetType, localActivity);
  const canRetry = localActivity.state === 'failed' && localActivity.canRetry;
  const isDelayed = localActivity.state === 'queued' && Boolean(localActivity.errorCode);
  const retry = async () => {
    setIsRetrying(true);
    setRetryError('');
    try {
      const nextActivity = await controlPlaneApi.retryIssueAutomaticInvestigation(workspaceId, issueId);
      setLocalActivity(nextActivity);
    } catch (error) {
      setRetryError(formatControlPlaneError(error, t('automaticInvestigation.retryFailed'), { area: 'cluster' }));
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className={`mt-3 rounded-md border px-3 py-3 ${
      localActivity.state === 'failed'
        ? 'border-status-danger/30 bg-status-danger-soft'
        : localActivity.state === 'awaiting_approval'
          ? 'border-status-warning/30 bg-status-warning-soft'
          : 'border-ui-border bg-ui-bg'
    }`} data-automatic-investigation-activity={localActivity.state}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Bot className="h-4 w-4 text-accent-strong" aria-hidden="true" />
            <span className="type-caption font-semibold text-ui-text">{t('automaticInvestigation.label')}</span>
            <StatusBadge tone={stateTone(localActivity.state)}>
              {t(isDelayed
                ? 'automaticInvestigation.state.delayed'
                : `automaticInvestigation.state.${localActivity.state}`)}
            </StatusBadge>
          </div>
          <p className="type-caption mt-1 text-ui-text-muted">
            {t(isDelayed
              ? delayedCopyKey(localActivity.errorCode)
              : `automaticInvestigation.copy.${localActivity.state}`)}
          </p>
          {retryError && <p className="type-caption mt-1 font-semibold text-status-danger-text" role="alert">{retryError}</p>}
        </div>

        {canRetry ? (
          <Button
            variant="primary"
            size="sm"
            disabled={isRetrying}
            onClick={() => void retry()}
            className="w-full shrink-0 sm:w-auto"
          >
            {isRetrying ? t('automaticInvestigation.retrying') : t('automaticInvestigation.actions.retry')}
          </Button>
        ) : path ? (
          <a
            href={appHref(path)}
            onClick={navigate ? (event) => handleAppLinkClick(event, path, navigate) : undefined}
            className={buttonClassName({
              variant: localActivity.state === 'awaiting_approval' ? 'primary' : 'secondary',
              size: 'sm',
              className: 'w-full shrink-0 sm:w-auto'
            })}
          >
            {t(`automaticInvestigation.actions.${actionKey(localActivity.state)}`)}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        ) : localActivity.state === 'queued' ? (
          <Button variant="secondary" size="sm" disabled className="w-full shrink-0 sm:w-auto">
            <Clock3 className="h-4 w-4" aria-hidden="true" />
            {t(isDelayed
              ? 'automaticInvestigation.actions.waiting'
              : 'automaticInvestigation.actions.starting')}
          </Button>
        ) : null}
      </div>
    </div>
  );
};
