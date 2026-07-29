import React from 'react';
import { useTranslation } from 'react-i18next';

import { StatusBadge } from '@acornops/ui';
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
  recoveryPath
}: {
  schedule: WorkflowSchedule;
  mcpAutoPaused: boolean;
  recoveryPath: string;
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
        <div className="mt-3 max-w-sm text-status-warning-text">
          <p className="type-caption">
            {schedule.lastError?.trim().slice(0, 240) || t('workflowActivity.scheduleMcpUnavailable')}
          </p>
          <p className="type-caption mt-1 font-semibold">{t('workflowActivity.scheduleRepairHint')}</p>
          <a
            className="type-caption mt-1 inline-flex font-semibold underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-control-boundary"
            href={recoveryPath}
          >
            {t('workflowCoordination.reviewWorkflowAccess')}
          </a>
        </div>
      )}
      {!mcpAutoPaused && schedule.lastError && (
        <p className="mt-2 max-w-sm type-caption text-status-danger-text">{schedule.lastError}</p>
      )}
    </>
  );
}
