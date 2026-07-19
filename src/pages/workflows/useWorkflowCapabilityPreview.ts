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
  const unresolvedInput = getWorkflowLaunchInputState(input.workflow, input.options, input.message, input.agents, input.runInputs);
  const freeformInputNames = new Set(
    (input.workflow?.inputs || []).filter((definition) => definition.type === 'text').map((definition) => definition.name)
  );
  const previewInputs = Object.fromEntries(
    Object.entries(unresolvedInput.inputs).filter(([name]) => !freeformInputNames.has(name))
  );
  const launchOptions = React.useMemo<WorkflowOptionsCatalog>(() => {
    if (!input.workflow || !preview || preview.workflowId !== input.workflow.id) return input.options;
    const candidates = new Map(preview.targetCandidates.map((candidate) => [candidate.id, candidate]));
    const applyCompatibility = (option: WorkflowOptionsCatalog['clusters'][number]) => {
      const candidate = candidates.get(option.value);
      if (!candidate || candidate.status === 'ready') return option;
      return { ...option, disabled: true, disabledReason: candidate.reason || 'This target is unavailable for the selected workflow.' };
    };
    return {
      ...input.options,
      targets: (input.options.targets || []).map(applyCompatibility),
      clusters: input.options.clusters.map(applyCompatibility)
    };
  }, [input.options, input.workflow, preview]);
  const launchInput = getWorkflowLaunchInputState(input.workflow, launchOptions, input.message, input.agents, input.runInputs);
  const blocker = loading
    ? 'Wait for the effective access preview to finish.'
    : error
      ? 'Retry the effective access preview before launch.'
      : !preview
        ? 'Wait for the effective access preview to finish.'
        : preview.status === 'blocked'
        ? preview.selectedTarget?.reason || 'The effective access preview is blocked.'
        : preview.status === 'needs_target' && !launchInput.targetId
          ? 'Select one exact target before launch.'
          : null;

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
    const target = unresolvedInput.targetId && unresolvedInput.targetType
      ? { id: unresolvedInput.targetId, targetType: unresolvedInput.targetType }
      : undefined;
    previewWorkflowCapabilities(input.workspaceId, workflow.id, { approvedContextGrants: workflow.contextGrants, target, inputs: previewInputs })
      .then((response) => {
        if (requestRef.current !== requestId) return;
        if (response.workflowId !== workflow.id
          || (workflow.version !== undefined && response.workflowVersion !== workflow.version)
          || response.mode !== workflow.policy.mode
          || (target && (response.selectedTarget?.id !== target.id || response.selectedTarget.targetType !== target.targetType))) {
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
  }, [input.workspaceId, input.workflow?.id, input.workflow?.version, input.workflow?.policy.mode, input.workflow?.contextGrants.join('\0'), retryKey, unresolvedInput.targetId, unresolvedInput.targetType, JSON.stringify(previewInputs)]);

  return { preview, loading, error, launchOptions, launchInput, blocker, retry: () => setRetryKey((value) => value + 1) };
}
