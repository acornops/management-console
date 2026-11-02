import { useTranslation } from 'react-i18next';
import React from 'react';
import { Webhook } from 'lucide-react';

import { SegmentedTabs } from '@acornops/ui';
import { ICONS } from '@/constants';
import type { WorkflowView } from '@/pages/workflows/workflowModel';

const viewIcons: Record<WorkflowView, React.ElementType> = {
  overview: ICONS.LayoutGrid,
  capabilities: ICONS.Shield,
  schedules: ICONS.CalendarClock,
  webhooks: Webhook,
  runs: ICONS.Activity,
  settings: ICONS.Settings
};
const viewLabelKeys: Record<WorkflowView, string> = {
  overview: 'app.overview',
  capabilities: 'app.capabilities',
  schedules: 'workflows.sections.schedules',
  webhooks: 'app.webhooks',
  runs: 'workflowActivity.title',
  settings: 'app.settings'
};
export const workflowInspectionViews: WorkflowView[] = ['overview', 'capabilities', 'schedules', 'webhooks', 'runs'];

export const WorkflowDetailTabs: React.FC<{
  activeView: WorkflowView;
  workflowName: string;
  onChange: (view: WorkflowView) => void;
}> = ({ activeView, workflowName, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="min-w-0">
      <span className="sr-only">{t('workflowUi.sectionsFor', { name: workflowName })}</span>
      <SegmentedTabs<WorkflowView>
        activeValue={activeView}
        allPanelsMounted={false}
        ariaLabel={t('workflowUi.detailSections')}
        className="min-w-0 flex-1 gap-0"
        idBase="workflow-detail-section"
        labelSize="compact"
        items={workflowInspectionViews.map((view) => {
          const Icon = viewIcons[view];
          return { value: view, label: t(viewLabelKeys[view]), icon: <Icon className="h-4 w-4" aria-hidden="true" /> };
        })}
        onValueChange={onChange}
      />
      <p className="type-caption py-1 text-right text-ui-text-muted sm:hidden">{t('workflowUi.scrollSections')}</p>
    </div>
  );
};
