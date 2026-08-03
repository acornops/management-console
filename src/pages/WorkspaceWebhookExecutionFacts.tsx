import React from 'react';
import { useTranslation } from 'react-i18next';

import { StatusBadge } from '@acornops/ui';
import { OperationalFailureDetails, operationalFailureCause } from '@/components/common/OperationalFailureDetails';
import { WorkflowTriggerExecutionFacts } from '@/features/workflow-activity/WorkflowTriggerExecutionFacts';
import type { WorkflowWebhook } from '@/services/control-plane/workflowWebhookApi';
import { formatUserDateTime } from '@/utils/dateTime';

function dispatchTone(
  status?: WorkflowWebhook['lastStatus']
): React.ComponentProps<typeof StatusBadge>['tone'] {
  if (status === 'dispatched') return 'success';
  if (status === 'failed' || status === 'rejected') return 'danger';
  if (status === 'auto_paused') return 'warning';
  return 'neutral';
}

function configurationLabel(trigger: WorkflowWebhook, t: ReturnType<typeof useTranslation>['t']) {
  if (trigger.status === 'paused' && trigger.lastStatus === 'auto_paused') {
    return t('eventTriggers.status.autoPaused');
  }
  return trigger.status === 'enabled'
    ? t('eventTriggers.status.enabled')
    : t('eventTriggers.status.paused');
}

export function WorkspaceWebhookExecutionFacts({
  trigger,
  ledger = false
}: {
  trigger: WorkflowWebhook;
  ledger?: boolean;
}) {
  const { t } = useTranslation();
  const configurationTone = trigger.status === 'enabled'
    ? 'success'
    : trigger.lastStatus === 'auto_paused'
      ? 'warning'
      : 'neutral';
  return (
    <>
      <WorkflowTriggerExecutionFacts
        className={[
          'mt-4 border-t border-ui-border pt-3 sm:grid-cols-3',
          ledger ? 'lg:mt-0 lg:grid-cols-1 lg:border-t-0 lg:pt-0' : ''
        ].join(' ')}
        configurationLabel={t('workflowActivity.configuration')}
        configuration={{ label: configurationLabel(trigger, t), tone: configurationTone }}
        dispatchLabel={t('workflowActivity.lastDispatch')}
        dispatch={trigger.lastStatus ? {
          label: t(`eventTriggers.lastStatus.${trigger.lastStatus}`),
          tone: dispatchTone(trigger.lastStatus)
        } : undefined}
        dispatchTimestamp={<span>{trigger.lastReceivedAt
          ? formatUserDateTime(trigger.lastReceivedAt, { fallback: trigger.lastReceivedAt })
          : t('eventTriggers.neverTriggered')}</span>}
        latestExecutionLabel={t('workflowActivity.latestExecution')}
        latestExecution={trigger.latestExecution}
        noDispatchLabel={t('workflowActivity.neverDispatched')}
        noExecutionLabel={t('workflowActivity.noExecution')}
      />
      {trigger.lastError && (
        <OperationalFailureDetails
          tone={trigger.lastStatus === 'auto_paused' ? 'warning' : 'danger'}
          cause={operationalFailureCause(trigger.lastError, t('eventTriggers.failure.cause'))}
          impact={t(trigger.lastStatus === 'rejected'
            ? 'eventTriggers.failure.rejectedImpact'
            : trigger.lastStatus === 'auto_paused'
              ? 'eventTriggers.failure.autoPausedImpact'
              : 'eventTriggers.failure.failedImpact')}
          nextStep={t('eventTriggers.failure.nextStep')}
          technicalDetail={trigger.lastError}
        />
      )}
    </>
  );
}
