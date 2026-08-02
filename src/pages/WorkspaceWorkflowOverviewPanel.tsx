import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@acornops/ui';

import { ICONS } from '@/constants';
import {
  AgentAssignmentList,
  WorkflowCapabilitySummary,
  WorkflowPanel,
  WorkflowSection,
} from '@/pages/WorkspaceWorkflowsPage.components';
import { WorkflowTermsHelp } from '@/pages/WorkflowTermsHelp';
import type { WorkflowDefinition } from '@/pages/workflows/workflowModel';
import type { WorkflowCapabilitiesPreview } from '@/services/control-plane/workflowApi';

export const WorkflowOverviewPanel: React.FC<{
  workflow: WorkflowDefinition;
  workspaceId: string;
  canManageWorkflow: boolean;
  preview: WorkflowCapabilitiesPreview | null;
  previewLoading: boolean;
  previewError: string;
  onRetryPreview: () => void;
  onReviewAgents: () => void;
  onReviewCapabilities: () => void;
  onOpenGuide?: () => void;
  showHeader?: boolean;
}> = ({
  workflow,
  workspaceId,
  canManageWorkflow,
  preview,
  previewLoading,
  previewError,
  onRetryPreview,
  onReviewAgents,
  onReviewCapabilities,
  onOpenGuide,
  showHeader
}) => {
  const { t } = useTranslation();
  return (
    <WorkflowPanel title="Overview" description="Review the workflow definition, assigned Agents, and capabilities before launch." showHeader={showHeader}>
      <WorkflowSection
        title={t('workflowCoordination.agentsTitle')}
        description={t('workflowCoordination.agentsDescription')}
        action={<Button type="button" variant="secondary" size="sm" onClick={onReviewAgents}><ICONS.Bot className="h-4 w-4" aria-hidden="true" />{canManageWorkflow ? 'Edit agents' : 'View agents'}</Button>}
      >
        <AgentAssignmentList
          className="mt-4"
          agents={workflow.agents}
          labelForAgent={() => workflow.executionMode === 'direct' ? t('workflowCoordination.directLabel') : t('workflowCoordination.coordinatedLabel')}
        />
      </WorkflowSection>
      <WorkflowSection
        title="Capabilities"
        description="Confirm the effective tools, integrations, and write policy used when this workflow runs."
        action={<Button type="button" variant="secondary" size="sm" onClick={onReviewCapabilities}><ICONS.Shield className="h-4 w-4" aria-hidden="true" />Review capabilities</Button>}
      >
        <WorkflowCapabilitySummary workspaceId={workspaceId} preview={preview} loading={previewLoading} error={previewError} onRetry={onRetryPreview} />
      </WorkflowSection>
      <WorkflowSection title="Prompt" description="The saved instructions sent to the assigned Agents when a run starts.">
        <div className="mt-3 rounded-md border border-ui-border bg-ui-bg px-4 py-3">
          <p className="whitespace-pre-wrap break-words type-body text-ui-text">{workflow.starterPrompt}</p>
        </div>
      </WorkflowSection>
      <WorkflowTermsHelp onOpenGuide={onOpenGuide} />
    </WorkflowPanel>
  );
};
