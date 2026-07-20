import React from 'react';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import type { WorkflowDefinition } from '@/pages/workflows/workflowModel';
import { getWorkflowLaunchInputState } from '@/pages/WorkspaceWorkflowsPage.launchFields';
import { previewWorkflowCapabilities, type WorkflowCapabilitiesPreview, type WorkflowOptionsCatalog } from '@/services/control-plane/workflowApi';

export function useWorkflowCapabilityPreview(input: {
  workspaceId: string;
  workflow?: WorkflowDefinition;
  options: WorkflowOptionsCatalog;
  message: string;
  agents: AgentDefinition[];
  runInputs?: Record<string, unknown>;
}) {
  const [preview, setPreview] = React.useState<WorkflowCapabilitiesPreview | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [retryKey, setRetryKey] = React.useState(0);
  const requestRef = React.useRef(0);
  const launchOptions = input.options;
  const launchInput = getWorkflowLaunchInputState(input.workflow, launchOptions, input.message, input.agents, input.runInputs);
  const blocker = loading
    ? 'Wait for the effective access preview to finish.'
    : error
      ? 'Retry the effective access preview before launch.'
      : !preview
        ? 'Wait for the effective access preview to finish.'
        : preview.status === 'blocked'
        ? preview.selectedTarget?.reason || 'The effective access preview is blocked.'
        : launchInput.blocker;

  React.useEffect(() => {
    if (!input.workflow) {
      requestRef.current += 1;
      setPreview(null);
      setLoading(false);
      setError('');
      return;
    }
    const workflow = input.workflow;
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setError('');
    setPreview(null);
    previewWorkflowCapabilities(input.workspaceId, workflow.id, { approvedContextGrants: workflow.contextGrants, content: input.message })
      .then((response) => {
        if (requestRef.current !== requestId) return;
        if (response.workflowId !== workflow.id
          || (workflow.version !== undefined && response.workflowVersion !== workflow.version)
          || response.mode !== workflow.policy.mode) {
          setError('The capability preview is stale. Retry before launch.');
          return;
        }
        setPreview(response);
      })
      .catch((reason) => {
        if (requestRef.current !== requestId) return;
        setError(reason instanceof Error ? reason.message : 'The effective access preview could not be loaded.');
      })
      .finally(() => {
        if (requestRef.current === requestId) setLoading(false);
      });
    return () => {
      if (requestRef.current === requestId) requestRef.current += 1;
    };
  }, [input.workspaceId, input.workflow?.id, input.workflow?.version, input.workflow?.policy.mode, input.workflow?.contextGrants.join('\0'), input.message, retryKey]);

  return { preview, loading, error, launchOptions, launchInput, blocker, retry: () => setRetryKey((value) => value + 1) };
}
