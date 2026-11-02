import { useTranslation } from 'react-i18next';
import React from 'react';
import type { WorkflowDefinition } from '@/pages/workflows/workflowModel';
import { previewWorkflowCapabilities, type WorkflowCapabilitiesPreview } from '@/services/control-plane/workflowApi';

export function useWorkflowCapabilityPreview(input: {
  workspaceId: string;
  workflow?: WorkflowDefinition;
  enabled: boolean;
}) {
  const { t } = useTranslation();
  const [preview, setPreview] = React.useState<WorkflowCapabilitiesPreview | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [retryKey, setRetryKey] = React.useState(0);
  const requestRef = React.useRef(0);
  const blocker = loading
    ? t('workflowUi.waitCapabilityCheck')
    : error
      ? t('workflowUi.retryCapabilityCheck')
      : !preview
        ? t('workflowUi.waitCapabilityCheck')
        : preview.status === 'blocked'
        ? t('workflowUi.capabilityBlocked')
        : null;

  React.useEffect(() => {
    if (!input.workflow || !input.enabled) {
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
    const controller = new AbortController();
    const timer = window.setTimeout(() => previewWorkflowCapabilities(input.workspaceId, workflow.id, {
      signal: controller.signal
    })
      .then((response) => {
        if (requestRef.current !== requestId) return;
        if (response.workflowId !== workflow.id || response.mode !== workflow.policy.mode) {
          setError('workflowUi.capabilityStale');
          return;
        }
        setPreview(response);
      })
      .catch(() => {
        if (requestRef.current !== requestId) return;
        setError('workflowUi.capabilityFailed');
      })
      .finally(() => {
        if (requestRef.current === requestId) setLoading(false);
      }), 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      if (requestRef.current === requestId) requestRef.current += 1;
    };
  }, [input.enabled, input.workspaceId, input.workflow?.id, input.workflow?.policy.mode, retryKey]);

  return { preview, loading, error: error ? t(error) : '', blocker, retry: () => setRetryKey((value) => value + 1) };
}
