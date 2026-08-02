import React from 'react';

import { ActionMenu, Button, MenuItem, PageHeader } from '@acornops/ui';
import { ICONS } from '@/constants';
import { WorkflowRecommendationActions } from '@/pages/WorkflowRecommendationActions';
import { WorkflowSections } from '@/pages/workflows/WorkflowSections';
import type { Workspace } from '@/types';
import { updateUrlSearch } from '@/hooks/useUrlSearchState';

interface WorkspaceWorkflowsChromeProps {
  canManageWorkflows: boolean;
  focusWorkflowId?: string;
  hiddenOnCompact: boolean;
  navigate: (path: string) => void;
  onCreate: () => void;
  onOpenGuide: () => void;
  onRecommendationChanged: (workflowId?: string) => void;
  recommendationsOpen: boolean;
  setRecommendationsOpen: (open: boolean) => void;
  workflowOptionsReady: boolean;
  workspace: Workspace;
}

export const WorkspaceWorkflowsChrome: React.FC<WorkspaceWorkflowsChromeProps> = ({
  canManageWorkflows,
  focusWorkflowId,
  hiddenOnCompact,
  navigate,
  onCreate,
  onOpenGuide,
  onRecommendationChanged,
  recommendationsOpen,
  setRecommendationsOpen,
  workflowOptionsReady,
  workspace
}) => (
  <div className={hiddenOnCompact ? 'hidden lg:contents' : 'contents'}>
    <PageHeader
      className="mb-5"
      title="Workflows"
      description="Choose who runs each automation, what they can access, when it runs, and whether changes need approval."
      actions={<div className="flex flex-col items-start gap-2 lg:items-end">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="md" onClick={onOpenGuide}>Workflow guide</Button>
          <ActionMenu
            label="Add workflow"
            trigger={<Button type="button" variant="primary" size="md"><ICONS.Plus className="h-4 w-4" aria-hidden="true" /> Add workflow</Button>}
          >
            {(close) => <>
              <MenuItem onClick={() => { close(); updateUrlSearch({ panel: 'recommendations' }); setRecommendationsOpen(true); }}>Use a template</MenuItem>
              <MenuItem disabled={!canManageWorkflows || !workflowOptionsReady} onClick={() => { close(); onCreate(); }}>Create custom workflow</MenuItem>
            </>}
          </ActionMenu>
          <WorkflowRecommendationActions
            workspace={workspace}
            open={recommendationsOpen}
            focusWorkflowId={focusWorkflowId}
            onOpenChange={setRecommendationsOpen}
            onChanged={onRecommendationChanged}
            showTrigger={false}
          />
        </div>
        {!canManageWorkflows && <span className="type-caption max-w-64 type-emphasis text-ui-text-muted lg:text-right">Ask a workspace manager for manage_workflows to create or edit workflow definitions.</span>}
      </div>}
    />
    <WorkflowSections activeSection="all" navigate={navigate} workspaceId={workspace.id} />
  </div>
);
