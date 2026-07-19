import { Button } from '@/components/common/Button';
import { updateUrlSearch } from '@/hooks/useUrlSearchState';
import { WorkflowTemplateSetupDrawer } from '@/pages/WorkflowTemplateSetupDrawer';
import type { Workspace } from '@/types';
import { useTranslation } from 'react-i18next';

export const WorkflowTemplateActions = ({
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
    <Button type="button" variant="secondary" size="md" onClick={() => { updateUrlSearch({ panel: 'templates' }); onOpenChange(true); }}>{t('workflowTemplates.open')}</Button>
    <WorkflowTemplateSetupDrawer
      open={open}
      workspaceId={workspace.id}
      focusWorkflowId={focusWorkflowId}
      canInstall={canInstall}
      onClose={() => { onOpenChange(false); updateUrlSearch({ panel: null }, { replace: true }); }}
      onChanged={onChanged}
    />
  </>;
};
