import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/common/Button';
import { MenuItem } from '@/components/common/FormControls';
import { InlineConfirmation } from '@/components/common/InlineConfirmation';
import { OverflowActionMenu } from '@/components/common/OverflowActionMenu';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ICONS } from '@/constants';
import { WorkspaceEventTriggerExecutionFacts } from '@/pages/WorkspaceEventTriggerExecutionFacts';
import type { WorkflowEventTrigger } from '@/services/control-plane/workflowEventTriggerApi';

interface WorkspaceEventTriggerCardProps {
  trigger: WorkflowEventTrigger;
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
  const runAction = (close: () => void, action: () => void) => {
    close();
    actionButtonRefs.current.get(trigger.id)?.focus({ preventScroll: true });
    action();
  };

  return (
    <article>
      <div className="p-[var(--surface-padding)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(13rem,0.9fr)_minmax(12rem,0.75fr)_minmax(15rem,1fr)_minmax(14rem,0.9fr)_minmax(3rem,auto)] lg:items-start">
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

          <div className="min-w-0">
            <p className="type-micro-label mb-1 text-ui-text-muted lg:hidden">{t('eventTriggers.columns.workflow')}</p>
            <p className="text-sm font-semibold text-ui-text">{workflowName}</p>
          </div>

          <div className="min-w-0">
            <p className="type-micro-label mb-1 text-ui-text-muted lg:hidden">{t('eventTriggers.columns.configuration')}</p>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="neutral">
                {trigger.sourceType === 'webhook'
                  ? t('eventTriggers.source.webhook')
                  : t('eventTriggers.source.acornopsEvent')}
              </StatusBadge>
              {trigger.eventType && <code className="type-caption text-ui-text-muted">{trigger.eventType}</code>}
            </div>
            {trigger.sourceType === 'webhook' && trigger.endpointUrl && (
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
                <code className="max-w-full break-all text-xs text-ui-text-muted">{trigger.endpointUrl}</code>
                <Button size="sm" variant="tertiary" onClick={() => onCopyEndpoint(trigger.endpointUrl!)}>
                  {t('eventTriggers.copyEndpoint')}
                </Button>
              </div>
            )}
            <p className="mt-2 type-caption text-ui-text-muted">
              {t('eventTriggers.inputCount', { count: Object.keys(trigger.inputBindings).length })}
              {' · '}
              {t('eventTriggers.contextGrantCount', { count: trigger.approvedContextGrants.length })}
            </p>
          </div>

          <div className="min-w-0">
            <p className="type-micro-label mb-1 text-ui-text-muted lg:hidden">{t('workflowActivity.activity')}</p>
            <WorkspaceEventTriggerExecutionFacts trigger={trigger} ledger />
          </div>

          {canManage ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
              {needsFailureReview && (
                <Button size="sm" variant="primary" onClick={onEdit} disabled={busy}>
                  {t('eventTriggers.actions.reviewFailure')}
                </Button>
              )}
              <OverflowActionMenu
                ref={(node) => {
                  if (node) actionButtonRefs.current.set(trigger.id, node);
                  else actionButtonRefs.current.delete(trigger.id);
                }}
                label={t('eventTriggers.actionsFor', { name: trigger.name })}
                disabled={busy}
                estimatedHeight={trigger.sourceType === 'webhook' ? 188 : 152}
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
                  {trigger.sourceType === 'webhook' && (
                    <MenuItem onClick={() => runAction(close, onRequestRotate)}>
                      <ICONS.RefreshCw className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
                      {t('eventTriggers.actions.rotateSecret')}
                    </MenuItem>
                  )}
                  <MenuItem destructive onClick={() => runAction(close, onRequestDelete)}>
                    <ICONS.Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {t('eventTriggers.actions.delete')}
                  </MenuItem>
                </>}
              </OverflowActionMenu>
            </div>
          ) : <div aria-hidden="true" className="text-right type-caption text-ui-text-muted">—</div>}
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
    </article>
  );
};
