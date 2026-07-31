import React from 'react';
import type { WorkflowDefinition } from '@/pages/workflows/workflowModel';
import { previewWorkflowCapabilities, type WorkflowCapabilitiesPreview } from '@/services/control-plane/workflowApi';

export function useWorkflowCapabilityPreview(input: {
  workspaceId: string;
  workflow?: WorkflowDefinition;
}) {
  const [preview, setPreview] = React.useState<WorkflowCapabilitiesPreview | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [retryKey, setRetryKey] = React.useState(0);
  const requestRef = React.useRef(0);
  const blocker = loading
    ? 'Wait for the capability check to finish.'
    : error
      ? 'Retry the capability check before launch.'
      : !preview
        ? 'Wait for the capability check to finish.'
        : preview.status === 'blocked'
        ? 'The capability check is blocked.'
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
    const timer = window.setTimeout(() => previewWorkflowCapabilities(input.workspaceId, workflow.id, {
      approvedContextGrants: workflow.contextGrants
    })
      .then((response) => {
        if (requestRef.current !== requestId) return;
        if (response.workflowId !== workflow.id
          || (workflow.version !== undefined && response.workflowVersion !== workflow.version)
          || response.mode !== workflow.policy.mode) {
          setError('The capability check is stale. Retry before launch.');
          return;
        }
        setPreview(response);
      })
      .catch((reason) => {
        if (requestRef.current !== requestId) return;
        setError(reason instanceof Error ? reason.message : 'The capability check could not be loaded.');
      })
      .finally(() => {
        if (requestRef.current === requestId) setLoading(false);
      }), 300);
    return () => {
      window.clearTimeout(timer);
      if (requestRef.current === requestId) requestRef.current += 1;
    };
  }, [input.workspaceId, input.workflow?.id, input.workflow?.version, input.workflow?.policy.mode, input.workflow?.contextGrants.join('\0'), retryKey]);

  return { preview, loading, error, blocker, retry: () => setRetryKey((value) => value + 1) };
}
