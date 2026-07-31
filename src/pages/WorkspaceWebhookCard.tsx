import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@acornops/ui';
import { MenuItem } from '@acornops/ui';
import { InlineConfirmation } from '@acornops/ui';
import { OverflowActionMenu } from '@acornops/ui';
import { StatusBadge } from '@acornops/ui';
import { ICONS } from '@/constants';
import { WorkspaceWebhookExecutionFacts } from '@/pages/WorkspaceWebhookExecutionFacts';
import type { WorkflowWebhook } from '@/services/control-plane/workflowWebhookApi';

interface WorkspaceWebhookCardProps {
  trigger: WorkflowWebhook;
  workflowName: string;
  canManage: boolean;
  busy: boolean;
  pendingRotate: boolean;
  actionButtonRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
  onCopyEndpoint: (endpoint: string) => void;
  onEdit: () => void;
  onToggle: () => void;
  onRequestRotate: () => void;
  onCancelRotate: () => void;
  onConfirmRotate: () => void;
  onRequestDelete: () => void;
}

export const WorkspaceWebhookActionMenu: React.FC<WorkspaceWebhookCardProps> = ({
  trigger,
  canManage,
  busy,
  actionButtonRefs,
  onEdit,
  onToggle,
  onRequestRotate,
  onRequestDelete
}) => {
  const { t } = useTranslation();
  if (!canManage) return <span aria-hidden="true" className="type-caption text-ui-text-muted">—</span>;

  const runAction = (close: () => void, action: () => void) => {
    close();
    actionButtonRefs.current.get(trigger.id)?.focus({ preventScroll: true });
    action();
  };

  return (
    <OverflowActionMenu
      ref={(node) => {
        if (node) actionButtonRefs.current.set(trigger.id, node);
        else actionButtonRefs.current.delete(trigger.id);
      }}
      label={t('eventTriggers.actionsFor', { name: trigger.name })}
      disabled={busy}
      estimatedHeight={188}
    >
      {(close) => <>
        <MenuItem onClick={() => runAction(close, onEdit)}>
          <ICONS.Pencil className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
          {t('eventTriggers.actions.edit')}
        </MenuItem>
        <MenuItem onClick={() => runAction(close, onToggle)}>
          <ICONS.Zap className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
          {trigger.status === 'enabled' ? t('eventTriggers.actions.pause') : t('eventTriggers.actions.resume')}
        </MenuItem>
        <MenuItem onClick={() => runAction(close, onRequestRotate)}>
          <ICONS.RefreshCw className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
          {t('eventTriggers.actions.rotateSecret')}
        </MenuItem>
        <MenuItem destructive onClick={() => runAction(close, onRequestDelete)}>
          <ICONS.Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t('eventTriggers.actions.delete')}
        </MenuItem>
      </>}
    </OverflowActionMenu>
  );
};

export const workspaceWebhookLedgerGridClass =
  'grid-cols-[minmax(0,1fr)_auto] xl:grid-cols-[minmax(11rem,0.9fr)_minmax(9rem,0.75fr)_minmax(0,1fr)_minmax(11rem,0.9fr)_4.5rem]';

function triggerStatusTone(
  trigger: WorkflowWebhook
): React.ComponentProps<typeof StatusBadge>['tone'] {
  if (trigger.status === 'paused' && trigger.lastStatus === 'auto_paused') return 'warning';
  if (trigger.status === 'enabled') return 'success';
  return 'neutral';
}

export const WorkspaceWebhookCard: React.FC<WorkspaceWebhookCardProps> = ({
  trigger,
  workflowName,
  canManage,
  busy,
  pendingRotate,
  actionButtonRefs,
  onCopyEndpoint,
  onEdit,
  onToggle,
  onRequestRotate,
  onCancelRotate,
  onConfirmRotate,
  onRequestDelete
}) => {
  const { t } = useTranslation();
  const needsFailureReview = trigger.lastStatus === 'failed'
    || trigger.lastStatus === 'rejected'
    || trigger.lastStatus === 'auto_paused';
  return (
    <article>
      <div className="p-[var(--ao-surface-padding)] xl:px-8 xl:py-6">
        <div className={`grid gap-4 xl:items-start ${workspaceWebhookLedgerGridClass}`}>
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
            </div>
          </div>

          <div className="col-span-2 min-w-0 xl:col-span-1">
            <p className="type-micro-label mb-1 text-ui-text-muted xl:hidden">{t('eventTriggers.columns.workflow')}</p>
            <p className="type-body type-emphasis text-ui-text">{workflowName}</p>
          </div>

          <div className="col-span-2 min-w-0 xl:col-span-1">
            <p className="type-micro-label mb-1 text-ui-text-muted xl:hidden">{t('eventTriggers.columns.configuration')}</p>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="neutral">{t('eventTriggers.source.webhook')}</StatusBadge>
            </div>
            {trigger.endpointUrl && (
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
                <code className="max-w-full break-all type-caption text-ui-text-muted">{trigger.endpointUrl}</code>
                <Button size="sm" variant="tertiary" onClick={() => onCopyEndpoint(trigger.endpointUrl!)}>
                  {t('eventTriggers.copyEndpoint')}
                </Button>
              </div>
            )}
            <p className="mt-2 type-caption text-ui-text-muted">
              {t('eventTriggers.contextGrantCount', { count: trigger.approvedContextGrants.length })}
            </p>
          </div>

          <div className="col-span-2 min-w-0 xl:col-span-1">
            <p className="type-micro-label mb-1 text-ui-text-muted xl:hidden">{t('workflowActivity.activity')}</p>
            <WorkspaceWebhookExecutionFacts trigger={trigger} ledger />
          </div>

          {canManage ? (
            <div className="col-start-2 row-start-1 flex shrink-0 flex-wrap items-center justify-end gap-2 xl:col-start-auto xl:row-start-auto">
              {needsFailureReview && (
                <Button size="sm" variant="primary" onClick={onEdit} disabled={busy}>
                  {t('eventTriggers.actions.reviewFailure')}
                </Button>
              )}
              <WorkspaceWebhookActionMenu
                trigger={trigger}
                workflowName={workflowName}
                canManage={canManage}
                busy={busy}
                pendingRotate={pendingRotate}
                actionButtonRefs={actionButtonRefs}
                onCopyEndpoint={onCopyEndpoint}
                onEdit={onEdit}
                onToggle={onToggle}
                onRequestRotate={onRequestRotate}
                onCancelRotate={onCancelRotate}
                onConfirmRotate={onConfirmRotate}
                onRequestDelete={onRequestDelete}
              />
            </div>
          ) : (
            <div
              aria-hidden="true"
              className="col-start-2 row-start-1 text-right type-caption text-ui-text-muted xl:col-start-auto xl:row-start-auto"
            >
              —
            </div>
          )}
        </div>
      </div>

      {pendingRotate && (
        <InlineConfirmation
          id={`rotate-workflow-webhook-secret-${trigger.id}`}
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
    </article>
  );
};
