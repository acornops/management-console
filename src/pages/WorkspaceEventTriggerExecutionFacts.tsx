import React from 'react';
import { useTranslation } from 'react-i18next';

import { StatusBadge } from '@acornops/ui';
import { WorkflowExecutionLink } from '@/features/workflow-activity/WorkflowActivityUi';
import type { WorkflowEventTrigger } from '@/services/control-plane/workflowEventTriggerApi';
import { formatUserDateTime } from '@/utils/dateTime';

function dispatchTone(
  status?: WorkflowEventTrigger['lastStatus']
): React.ComponentProps<typeof StatusBadge>['tone'] {
  if (status === 'dispatched') return 'success';
  if (status === 'failed' || status === 'rejected') return 'danger';
  if (status === 'auto_paused') return 'warning';
  return 'neutral';
}

function configurationLabel(trigger: WorkflowEventTrigger, t: ReturnType<typeof useTranslation>['t']) {
  if (trigger.status === 'paused' && trigger.lastStatus === 'auto_paused') {
    return t('eventTriggers.status.autoPaused');
  }
  return trigger.status === 'enabled'
    ? t('eventTriggers.status.enabled')
    : t('eventTriggers.status.paused');
}

export function WorkspaceEventTriggerExecutionFacts({
  trigger,
  ledger = false
}: {
  trigger: WorkflowEventTrigger;
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
      <dl className={[
        'mt-4 grid gap-3 border-t border-ui-border pt-3 sm:grid-cols-3',
        ledger ? 'lg:mt-0 lg:grid-cols-1 lg:border-t-0 lg:pt-0' : ''
      ].join(' ')}>
        <div>
          <dt className="type-micro-label text-ui-text-muted">{t('workflowActivity.configuration')}</dt>
          <dd className="mt-1">
            <StatusBadge tone={configurationTone}>{configurationLabel(trigger, t)}</StatusBadge>
          </dd>
        </div>
        <div>
          <dt className="type-micro-label text-ui-text-muted">{t('workflowActivity.lastDispatch')}</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-2 type-caption text-ui-text">
            {trigger.lastStatus
              ? <StatusBadge tone={dispatchTone(trigger.lastStatus)}>{t(`eventTriggers.lastStatus.${trigger.lastStatus}`)}</StatusBadge>
              : t('workflowActivity.neverDispatched')}
            <span>
              {trigger.lastTriggeredAt
                ? formatUserDateTime(trigger.lastTriggeredAt, { fallback: trigger.lastTriggeredAt })
                : t('eventTriggers.neverTriggered')}
            </span>
          </dd>
        </div>
        <div>
          <dt className="type-micro-label text-ui-text-muted">{t('workflowActivity.latestExecution')}</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-2">
            {trigger.latestExecution ? (
              <WorkflowExecutionLink execution={trigger.latestExecution} />
            ) : <span className="type-caption text-ui-text-muted">{t('workflowActivity.noExecution')}</span>}
          </dd>
        </div>
      </dl>
      {trigger.lastError && (
        <p className="mt-2 max-w-3xl type-caption text-status-danger-text">{trigger.lastError}</p>
      )}
    </>
  );
}
