import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button, StatusBadge } from '@acornops/ui';
import { OperationalFailureDetails, operationalFailureCause } from '@/components/common/OperationalFailureDetails';
import { WorkflowTriggerExecutionFacts } from '@/features/workflow-activity/WorkflowTriggerExecutionFacts';
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
      <WorkflowTriggerExecutionFacts
        configurationLabel={t('workflowActivity.configuration')}
        configuration={{
          label: schedule.status === 'enabled' ? t('schedules.status.active') : t('schedules.status.paused'),
          tone: mcpAutoPaused ? 'warning' : schedule.status === 'enabled' ? 'success' : 'neutral'
        }}
        dispatchLabel={t('workflowActivity.lastDispatch')}
        dispatch={schedule.lastStatus ? {
          label: t(`workflowActivity.dispatch.${schedule.lastStatus}`),
          tone: dispatchTone(schedule.lastStatus)
        } : undefined}
        dispatchTimestamp={schedule.lastRunAt ? <span>{formatUserDateTime(schedule.lastRunAt)}</span> : undefined}
        latestExecutionLabel={t('workflowActivity.latestExecution')}
        latestExecution={schedule.latestExecution}
        noDispatchLabel={t('workflowActivity.neverDispatched')}
        noExecutionLabel={t('workflowActivity.noExecution')}
      />
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
