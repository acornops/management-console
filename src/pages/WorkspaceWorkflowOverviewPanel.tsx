import React from 'react';

import {
  WorkflowPanel,
  WorkflowSection,
} from '@/pages/WorkspaceWorkflowsPage.components';
import type { WorkflowDefinition } from '@/pages/workflows/workflowModel';

export const WorkflowOverviewPanel: React.FC<{
  workflow: WorkflowDefinition;
  agentAssignment: React.ReactNode;
  showHeader?: boolean;
}> = ({
  workflow,
  agentAssignment,
  showHeader
}) => {
  return (
    <WorkflowPanel title="Overview" description="Review the execution setup and prompt before launch." showHeader={showHeader}>
      {agentAssignment}
      <WorkflowSection title="Prompt" description="Instructions sent to assigned Agents when a run starts.">
        <div className="mt-3 rounded-md border border-ui-border bg-ui-bg px-4 py-3">
          <p className="whitespace-pre-wrap break-words type-body text-ui-text">{workflow.starterPrompt}</p>
        </div>
      </WorkflowSection>
    </WorkflowPanel>
  );
};
