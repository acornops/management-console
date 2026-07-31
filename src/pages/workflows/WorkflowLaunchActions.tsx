import React from 'react';
import { Activity, CalendarClock, Pencil, Send, Webhook, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button, Tooltip } from '@acornops/ui';
import type { WorkflowPrimaryAction } from '@/pages/workflows/workflowModel';

interface WorkflowIconActionProps {
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tooltip?: string;
  variant?: React.ComponentProps<typeof Button>['variant'];
}

const WorkflowIconAction: React.FC<WorkflowIconActionProps> = ({
  disabled,
  icon,
  label,
  onClick,
  tooltip,
  variant = 'icon'
}) => (
  <Tooltip content={tooltip || label} side="bottom">
    <Button
      type="button"
      variant={variant}
      size="icon"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
    </Button>
  </Tooltip>
);

export const WorkflowLaunchActions: React.FC<{
  activating: boolean;
  canManageWorkflows: boolean;
  launchBlocker: string | null;
  launching: boolean;
  onActivate: () => void;
  onActivity: () => void;
  onEdit: () => void;
  onLaunch: () => void;
  onSchedules: () => void;
  onWebhooks: () => void;
  primaryAction: WorkflowPrimaryAction;
}> = ({
  activating,
  canManageWorkflows,
  launchBlocker,
  launching,
  onActivate,
  onActivity,
  onEdit,
  onLaunch,
  onSchedules,
  onWebhooks,
  primaryAction
}) => {
  const { t } = useTranslation();
  const launchLabel = t('agentsWorkflows.workflowActions.launch');
  const activateLabel = t('agentsWorkflows.workflowActions.activate');

  return (
    <div
      className="flex flex-wrap items-center justify-end gap-2"
      aria-label="Workflow actions"
    >
      <div className="flex items-center gap-2" aria-label="Workflow operations">
        <WorkflowIconAction
          label="Run activity"
          icon={<Activity className="h-4 w-4" aria-hidden="true" />}
          onClick={onActivity}
        />
        <WorkflowIconAction
          label="Schedules"
          icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
          onClick={onSchedules}
        />
        <WorkflowIconAction
          label="Incoming webhooks"
          icon={<Webhook className="h-4 w-4" aria-hidden="true" />}
          onClick={onWebhooks}
        />
      </div>
      <span className="mx-0.5 hidden h-6 w-px bg-ui-border sm:block" aria-hidden="true" />
      <div className="flex items-center gap-2" aria-label="Workflow definition and launch">
        <WorkflowIconAction
          label={t('agentsWorkflows.workflowActions.edit')}
          tooltip={!canManageWorkflows ? 'You need manage_workflows to edit this workflow.' : t('agentsWorkflows.workflowActions.edit')}
          icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
          disabled={!canManageWorkflows}
          onClick={onEdit}
        />
        {primaryAction === 'activate' ? (
          <WorkflowIconAction
            label={activateLabel}
            tooltip={!canManageWorkflows ? t('agentsWorkflows.workflowActions.activatePermission') : activateLabel}
            icon={<Zap className="h-4 w-4" aria-hidden="true" />}
            variant="activation"
            disabled={!canManageWorkflows || activating}
            onClick={onActivate}
          />
        ) : (
          <WorkflowIconAction
            label={launchLabel}
            tooltip={launchBlocker || launchLabel}
            icon={<Send className="h-4 w-4" aria-hidden="true" />}
            variant="activation"
            disabled={launching}
            onClick={onLaunch}
          />
        )}
      </div>
    </div>
  );
};
