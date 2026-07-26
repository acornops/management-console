import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/common/Button';
import { InlineConfirmation } from '@/components/common/InlineConfirmation';
import { StatusBadge } from '@/components/common/StatusBadge';
import { WorkspaceEventTriggerExecutionFacts } from '@/pages/WorkspaceEventTriggerExecutionFacts';
import type { WorkflowEventTrigger } from '@/services/control-plane/workflowEventTriggerApi';

interface WorkspaceEventTriggerCardProps {
  trigger: WorkflowEventTrigger;
  workflowName: string;
  canManage: boolean;
  busy: boolean;
  pendingRotate: boolean;
  pendingDelete: boolean;
  rotateButtonRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
  deleteButtonRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
  onCopyEndpoint: (endpoint: string) => void;
  onEdit: () => void;
  onToggle: () => void;
  onRequestRotate: () => void;
  onCancelRotate: () => void;
  onConfirmRotate: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

function triggerStatusTone(
  trigger: WorkflowEventTrigger
): React.ComponentProps<typeof StatusBadge>['tone'] {
  if (trigger.status === 'paused' && trigger.lastStatus === 'auto_paused') return 'warning';
  if (trigger.status === 'enabled') return 'success';
  return 'neutral';
}

export const WorkspaceEventTriggerCard: React.FC<WorkspaceEventTriggerCardProps> = ({
  trigger,
  workflowName,
  canManage,
  busy,
  pendingRotate,
  pendingDelete,
  rotateButtonRefs,
  deleteButtonRefs,
  onCopyEndpoint,
  onEdit,
  onToggle,
  onRequestRotate,
  onCancelRotate,
  onConfirmRotate,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete
}) => {
  const { t } = useTranslation();
  const needsFailureReview = trigger.lastStatus === 'failed'
    || trigger.lastStatus === 'rejected'
    || trigger.lastStatus === 'auto_paused';

  return (
    <article>
      <div className="p-[var(--surface-padding)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(16rem,1fr)_minmax(16rem,0.9fr)_minmax(13rem,auto)] lg:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="type-row-title text-ui-text">{trigger.name}</h2>
              <StatusBadge tone={triggerStatusTone(trigger)}>
                {trigger.status === 'paused' && trigger.lastStatus === 'auto_paused'
                  ? t('eventTriggers.status.autoPaused')
                  : trigger.status === 'enabled'
                    ? t('eventTriggers.status.enabled')
                    : t('eventTriggers.status.paused')}
              </StatusBadge>
              <StatusBadge tone="neutral">
                {trigger.sourceType === 'webhook'
                  ? t('eventTriggers.source.webhook')
                  : t('eventTriggers.source.acornopsEvent')}
              </StatusBadge>
            </div>
            <p className="mt-2 text-sm font-semibold text-ui-text">
              {t('eventTriggers.startsWorkflow', { workflow: workflowName })}
            </p>
            <p className="mt-1 type-caption text-ui-text-muted">
              {trigger.sourceType === 'webhook'
                ? t('eventTriggers.webhookDescription')
                : t('eventTriggers.issueCreatedDescription')}
            </p>
            {trigger.sourceType === 'webhook' && trigger.endpointUrl && (
              <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
                <code className="max-w-full break-all rounded-md border border-ui-border bg-ui-bg px-2 py-1 text-xs text-ui-text-muted">{trigger.endpointUrl}</code>
                <Button size="sm" variant="tertiary" onClick={() => onCopyEndpoint(trigger.endpointUrl!)}>
                  {t('eventTriggers.copyEndpoint')}
                </Button>
              </div>
            )}
          </div>

          <div className="min-w-0">
            <WorkspaceEventTriggerExecutionFacts trigger={trigger} ledger />
          </div>

          {canManage && (
            <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
              <Button size="sm" variant={needsFailureReview ? 'primary' : 'secondary'} onClick={onEdit} disabled={busy}>
                {needsFailureReview ? t('eventTriggers.actions.reviewFailure') : t('eventTriggers.actions.edit')}
              </Button>
              <Button size="sm" onClick={onToggle} disabled={busy}>
                {trigger.status === 'enabled' ? t('eventTriggers.actions.pause') : t('eventTriggers.actions.resume')}
              </Button>
              {trigger.sourceType === 'webhook' && (
                <Button
                  ref={(node) => {
                    if (node) rotateButtonRefs.current.set(trigger.id, node);
                    else rotateButtonRefs.current.delete(trigger.id);
                  }}
                  size="sm"
                  onClick={onRequestRotate}
                  disabled={busy}
                >
                  {t('eventTriggers.actions.rotateSecret')}
                </Button>
              )}
              <Button
                ref={(node) => {
                  if (node) deleteButtonRefs.current.set(trigger.id, node);
                  else deleteButtonRefs.current.delete(trigger.id);
                }}
                size="sm"
                variant="tertiary"
                className="text-status-danger-text hover:bg-status-danger-soft hover:text-status-danger-text"
                onClick={onRequestDelete}
                disabled={busy}
              >
                {t('eventTriggers.actions.delete')}
              </Button>
            </div>
          )}
          {!canManage && <div aria-hidden="true" />}
        </div>
      </div>

      {pendingRotate && (
        <InlineConfirmation
          id={`rotate-event-trigger-secret-${trigger.id}`}
          title={t('eventTriggers.rotate.title', { name: trigger.name })}
          description={t('eventTriggers.rotate.description')}
          tone="warning"
          confirmLabel={t('eventTriggers.actions.rotateSecret')}
          confirmDisabled={busy}
          cancelLabel={t('common.cancel')}
          onCancel={onCancelRotate}
          onConfirm={onConfirmRotate}
          className="border-t border-status-warning/20"
        />
      )}
      {pendingDelete && (
        <InlineConfirmation
          id={`delete-event-trigger-${trigger.id}`}
          title={t('eventTriggers.delete.title', { name: trigger.name })}
          description={t('eventTriggers.delete.description')}
          tone="danger"
          confirmLabel={t('eventTriggers.actions.delete')}
          confirmVariant="danger"
          confirmDisabled={busy}
          cancelLabel={t('common.cancel')}
          onCancel={onCancelDelete}
          onConfirm={onConfirmDelete}
          className="border-t border-status-danger/20"
        />
      )}
    </article>
  );
};
