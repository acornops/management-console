import React from 'react';
import { Webhook } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@acornops/ui';
import { ICONS } from '@/constants';
import type { WorkflowPrimaryAction } from '@/pages/workflows/workflowModel';

export const WorkflowLaunchActions: React.FC<{
  activating: boolean;
  canManageWorkflows: boolean;
  launchBlocker: string | null;
  launching: boolean;
  onActivate: () => void;
  onEdit: () => void;
  onLaunch: () => void;
  onSchedule: () => void;
  onWebhooks: () => void;
  primaryAction: WorkflowPrimaryAction;
}> = ({
  activating,
  canManageWorkflows,
  launchBlocker,
  launching,
  onActivate,
  onEdit,
  onLaunch,
  onSchedule,
  onWebhooks,
  primaryAction
}) => {
  const { t } = useTranslation();

  return (
    <div className="mt-3 flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end" aria-label="Workflow actions">
      <Button className="w-full whitespace-nowrap sm:w-auto" variant="secondary" size="md" onClick={onEdit} disabled={!canManageWorkflows}>
        <ICONS.Pencil className="h-4 w-4" aria-hidden="true" />
        {t('workflows.actions.edit')}
      </Button>
      {primaryAction === 'launch' && (
        <Button className="w-full whitespace-nowrap sm:w-auto" variant="secondary" size="md" onClick={onSchedule} disabled={!canManageWorkflows}>
          <ICONS.Clock className="h-4 w-4" aria-hidden="true" />
          {t('workflows.actions.schedules')}
        </Button>
      )}
      {primaryAction === 'launch' && (
        <Button className="w-full whitespace-nowrap sm:w-auto" variant="secondary" size="md" onClick={onWebhooks} disabled={!canManageWorkflows}>
          <Webhook className="h-4 w-4" aria-hidden="true" />
          {t('workflows.actions.webhooks')}
        </Button>
      )}
      {primaryAction === 'activate' ? (
        <Button className="w-full whitespace-nowrap sm:w-auto" variant="activation" size="md" onClick={onActivate} disabled={!canManageWorkflows || activating}>
          <ICONS.Zap className="h-4 w-4" aria-hidden="true" />
          {activating ? t('workflows.actions.activating') : t('workflows.actions.activate')}
        </Button>
      ) : (
        <Button className="w-full whitespace-nowrap sm:w-auto" variant="activation" size="md" onClick={onLaunch} disabled={launching} title={launchBlocker || undefined}>
          <ICONS.Send className="h-4 w-4" aria-hidden="true" />
          {launching ? t('workflows.actions.starting') : t('workflows.actions.launch')}
        </Button>
      )}
    </div>
  );
};
