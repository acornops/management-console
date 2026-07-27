import React from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarClock, Webhook, Zap } from 'lucide-react';

import { Button } from '@/components/common/Button';
import { SegmentedTabs } from '@/components/common/ComponentVocabulary';
import { PageHeader } from '@/components/common/PageComposition';
import { ICONS } from '@/constants';
import { WorkflowTriggerCreateMenu } from '@/pages/WorkflowTriggerCreateMenu';
import type { Workspace } from '@/types';
import { AppPaths, type WorkflowTriggerType } from '@/utils/routes';

interface WorkflowTriggersPageHeaderProps {
  workspace: Workspace;
  currentType: WorkflowTriggerType;
  createDisabled: boolean;
  refreshDisabled: boolean;
  navigate: (path: string) => void;
  onCreateCurrent: () => void;
  onRefresh: () => void;
}

let pendingTriggerTabFocus: {
  workspaceId: string;
  triggerType: WorkflowTriggerType;
} | null = null;

export const WorkflowTriggersPageHeader: React.FC<WorkflowTriggersPageHeaderProps> = ({
  workspace,
  currentType,
  createDisabled,
  refreshDisabled,
  navigate,
  onCreateCurrent,
  onRefresh
}) => {
  const { t } = useTranslation();

  React.useEffect(() => {
    if (
      pendingTriggerTabFocus?.workspaceId !== workspace.id
      || pendingTriggerTabFocus.triggerType !== currentType
    ) return undefined;
    const frame = window.requestAnimationFrame(() => {
      pendingTriggerTabFocus = null;
      document.getElementById(`workflow-trigger-type-${currentType}-tab`)?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [currentType, workspace.id]);

  return (
    <>
      <PageHeader
        title={t('triggers.title')}
        description={t('triggers.subtitle', { workspace: workspace.name })}
        actions={<>
          <Button size="md" variant="secondary" onClick={onRefresh} disabled={refreshDisabled}>
            <ICONS.RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t('common.refresh')}
          </Button>
          <WorkflowTriggerCreateMenu
            disabled={createDisabled}
            onCreate={(triggerType) => {
              if (triggerType === currentType) {
                onCreateCurrent();
                return;
              }
              navigate(AppPaths.workspaceTriggerCreate(workspace.id, triggerType));
            }}
          />
        </>}
      />
      <SegmentedTabs<WorkflowTriggerType>
        activeValue={currentType}
        ariaLabel={t('triggers.tabsLabel')}
        className="mb-8 max-w-4xl"
        idBase="workflow-trigger-type"
        allPanelsMounted={false}
        items={[
          {
            value: 'schedule',
            label: <>
              <span className="sm:hidden">{t('triggers.typesCompact.schedule')}</span>
              <span className="hidden sm:inline">{t('triggers.types.schedule')}</span>
            </>,
            icon: <CalendarClock className="h-4 w-4" aria-hidden="true" />
          },
          {
            value: 'acornops_event',
            label: <>
              <span className="sm:hidden">{t('triggers.typesCompact.acornopsEvent')}</span>
              <span className="hidden sm:inline">{t('triggers.typesCompact.acornopsEvent')}</span>
            </>,
            icon: <Zap className="h-4 w-4" aria-hidden="true" />
          },
          {
            value: 'webhook',
            label: <>
              <span className="sm:hidden">{t('triggers.typesCompact.webhook')}</span>
              <span className="hidden sm:inline">{t('triggers.types.webhook')}</span>
            </>,
            icon: <Webhook className="h-4 w-4" aria-hidden="true" />
          }
        ]}
        onValueChange={(triggerType) => {
          if (triggerType !== currentType) {
            pendingTriggerTabFocus = { workspaceId: workspace.id, triggerType };
            navigate(AppPaths.workspaceTriggers(workspace.id, triggerType));
          }
        }}
      />
    </>
  );
};
