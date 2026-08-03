import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button, StatusBadge } from '@acornops/ui';
import { OperationalFailureDetails, operationalFailureCause } from '@/components/common/OperationalFailureDetails';
import { WorkflowExecutionLink } from '@/features/workflow-activity/WorkflowActivityUi';
import type { WorkflowSchedule } from '@/services/control-plane/workflowApi';
import { formatUserDateTime } from '@/utils/dateTime';

function dispatchTone(
  status?: WorkflowSchedule['lastStatus']
): React.ComponentProps<typeof StatusBadge>['tone'] {
  if (status === 'dispatched') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'auto_paused') return 'warning';
  return 'neutral';
}

export function WorkspaceScheduleExecutionFacts({
  schedule,
  mcpAutoPaused,
  recoveryPath,
  canReview = false,
  onReview
}: {
  schedule: WorkflowSchedule;
  mcpAutoPaused: boolean;
  recoveryPath: string;
  canReview?: boolean;
  onReview?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <dl className="grid gap-3">
        <div>
          <dt className="type-micro-label text-ui-text-muted">{t('workflowActivity.configuration')}</dt>
          <dd className="mt-1">
            <StatusBadge tone={mcpAutoPaused ? 'warning' : schedule.status === 'enabled' ? 'success' : 'neutral'}>
              {schedule.status === 'enabled'
                ? t('schedules.status.active')
                : t('schedules.status.paused')}
            </StatusBadge>
          </dd>
        </div>
        <div>
          <dt className="type-micro-label text-ui-text-muted">{t('workflowActivity.lastDispatch')}</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-2 type-caption text-ui-text">
            {schedule.lastStatus
              ? <StatusBadge tone={dispatchTone(schedule.lastStatus)}>{t(`workflowActivity.dispatch.${schedule.lastStatus}`)}</StatusBadge>
              : t('workflowActivity.neverDispatched')}
            {schedule.lastRunAt && <span>{formatUserDateTime(schedule.lastRunAt)}</span>}
          </dd>
        </div>
        <div>
          <dt className="type-micro-label text-ui-text-muted">{t('workflowActivity.latestExecution')}</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-2">
            {schedule.latestExecution ? (
              <WorkflowExecutionLink execution={schedule.latestExecution} />
            ) : <span className="type-caption text-ui-text-muted">{t('workflowActivity.noExecution')}</span>}
          </dd>
        </div>
      </dl>
      {mcpAutoPaused && (
        <OperationalFailureDetails
          tone="warning"
          cause={t('workflowActivity.scheduleMcpUnavailable')}
          impact={t('workflowActivity.scheduleMcpImpact')}
          nextStep={t('workflowActivity.scheduleRepairHint')}
          technicalDetail={schedule.lastError}
          action={<a
            className="inline-flex type-emphasis underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-control-boundary"
            href={recoveryPath}
          >
            {t('workflowCoordination.reviewWorkflowAccess')}
          </a>}
        />
      )}
      {!mcpAutoPaused && schedule.lastError && (
        <OperationalFailureDetails
          cause={operationalFailureCause(schedule.lastError, t('workflowActivity.scheduleFailureCause'))}
          impact={t('workflowActivity.scheduleFailureImpact')}
          nextStep={t('workflowActivity.scheduleFailureNextStep')}
          technicalDetail={schedule.lastError}
          action={canReview && onReview ? (
            <Button size="sm" variant="primary" onClick={onReview}>
              {t('workflowActivity.actions.reviewFailure')}
            </Button>
          ) : undefined}
        />
      )}
    </>
  );
}
