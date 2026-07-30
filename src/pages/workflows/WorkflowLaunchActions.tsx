import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox } from '@acornops/ui';

import { ICONS } from '@/constants';
import type { WorkflowPrimaryAction } from '@/pages/workflows/workflowModel';

export const WorkflowLaunchActions: React.FC<{
  activating: boolean;
  canManageWorkflowScope: boolean;
  isWriteCapable: boolean;
  launchAcknowledged: boolean;
  launchBlocker: string | null;
  launchFields?: React.ReactNode;
  launching: boolean;
  needsLaunchAcknowledgement: boolean;
  onAcknowledgementChange: (checked: boolean) => void;
  onActivate: () => void;
  onEdit: () => void;
  onLaunch: () => void;
  onSchedule: () => void;
  primaryAction: WorkflowPrimaryAction;
  tags: string[];
}> = ({ activating, canManageWorkflowScope, isWriteCapable, launchAcknowledged, launchBlocker, launchFields, launching, needsLaunchAcknowledgement, onAcknowledgementChange, onActivate, onEdit, onLaunch, onSchedule, primaryAction, tags }) => {
  const { t } = useTranslation();
  const visibleLaunchBlocker = primaryAction === 'launch' ? launchBlocker : null;
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div className="min-w-0">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2" aria-label="Selected workflow tags">
            {tags.map((tag) => (
              <span key={tag} className="inline-flex min-h-7 items-center rounded-md border border-ui-border bg-ui-surface px-2.5 type-caption type-emphasis text-ui-text-muted">
                {tag}
              </span>
            ))}
          </div>
        )}
        {launchFields && <div className={`${tags.length > 0 ? 'mt-3' : ''}`}>{launchFields}</div>}
        {isWriteCapable && primaryAction === 'launch' && !visibleLaunchBlocker && (
          <label id="workflow-launch-acknowledgement" className={`${tags.length > 0 ? 'mt-2' : ''} flex min-h-11 cursor-pointer items-center gap-2 text-ui-text-muted transition-colors hover:text-ui-text focus-within:text-ui-text`}>
            <Checkbox checked={launchAcknowledged} onChange={(event) => onAcknowledgementChange(event.target.checked)} className="shrink-0" />
            <span className="type-caption type-emphasis">I understand this workflow can modify live systems.</span>
          </label>
        )}
        {visibleLaunchBlocker && (
          <span id="workflow-launch-blocker" className={`${tags.length > 0 ? 'mt-2' : ''} block type-caption type-emphasis text-ui-text-muted`}>
            Resolve this before launch: {visibleLaunchBlocker}
          </span>
        )}
      </div>
      <div className="grid gap-1 sm:justify-items-end">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
          <Button className="w-full whitespace-nowrap sm:w-auto" variant="secondary" size="md" onClick={onEdit} disabled={!canManageWorkflowScope}>
            <ICONS.Pencil className="h-4 w-4" aria-hidden="true" />
            {t('agentsWorkflows.workflowActions.edit')}
          </Button>
          {primaryAction === 'launch' && (
            <Button className="w-full whitespace-nowrap sm:w-auto" variant="secondary" size="md" onClick={onSchedule} disabled={!canManageWorkflowScope} aria-describedby={!canManageWorkflowScope ? 'workflow-schedule-blocker' : undefined}>
              <ICONS.Clock className="h-4 w-4" aria-hidden="true" />
              {t('agentsWorkflows.workflowActions.schedule')}
            </Button>
          )}
          {primaryAction === 'activate' && (
            <Button className="w-full whitespace-nowrap sm:w-auto" variant="activation" size="md" onClick={onActivate} disabled={!canManageWorkflowScope || activating} aria-describedby={!canManageWorkflowScope ? 'workflow-activate-blocker' : undefined}>
              <ICONS.Zap className="h-4 w-4" aria-hidden="true" />
              {activating ? t('agentsWorkflows.workflowActions.activating') : t('agentsWorkflows.workflowActions.activate')}
            </Button>
          )}
          {primaryAction === 'launch' && (
            <Button className="w-full whitespace-nowrap sm:w-auto" variant="activation" size="md" onClick={onLaunch} disabled={launching || Boolean(visibleLaunchBlocker) || needsLaunchAcknowledgement} title={visibleLaunchBlocker || undefined} aria-describedby={visibleLaunchBlocker ? 'workflow-launch-blocker' : needsLaunchAcknowledgement ? 'workflow-launch-acknowledgement' : undefined}>
              <ICONS.Send className="h-4 w-4" aria-hidden="true" />
              {launching ? t('agentsWorkflows.workflowActions.starting') : t('agentsWorkflows.workflowActions.launch')}
            </Button>
          )}
        </div>
        {primaryAction === 'launch' && !canManageWorkflowScope && (
          <p id="workflow-schedule-blocker" className="type-caption type-emphasis text-ui-text-muted sm:text-right">
            You need manage_workflows to schedule workflows.
          </p>
        )}
        {primaryAction === 'activate' && !canManageWorkflowScope && (
          <p id="workflow-activate-blocker" className="type-caption type-emphasis text-ui-text-muted sm:text-right">
            {t('agentsWorkflows.workflowActions.activatePermission')}
          </p>
        )}
      </div>
    </div>
  );
};
