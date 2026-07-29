import { Button } from '@acornops/ui';
import { updateUrlSearch } from '@/hooks/useUrlSearchState';
import { WorkflowRecommendationDrawer } from '@/pages/WorkflowRecommendationDrawer';
import type { Workspace } from '@/types';
import { useTranslation } from 'react-i18next';

export const WorkflowRecommendationActions = ({
  workspace,
  open,
  focusWorkflowId,
  onOpenChange,
  onChanged
}: {
  workspace: Workspace;
  open: boolean;
  focusWorkflowId?: string;
  onOpenChange: (open: boolean) => void;
  onChanged: (workflowId?: string) => void;
}) => {
  const { t } = useTranslation();
  const canInstall = Boolean(workspace.permissions?.manage_workflows && workspace.permissions?.manage_agents);
  return <>
    <Button type="button" variant="secondary" size="md" onClick={() => { updateUrlSearch({ panel: 'recommendations' }); onOpenChange(true); }}>{t('workflowRecommendations.open')}</Button>
    <WorkflowRecommendationDrawer
      open={open}
      workspaceId={workspace.id}
      focusWorkflowId={focusWorkflowId}
      canInstall={canInstall}
      onClose={() => { onOpenChange(false); updateUrlSearch({ panel: null }, { replace: true }); }}
      onChanged={onChanged}
    />
  </>;
};
