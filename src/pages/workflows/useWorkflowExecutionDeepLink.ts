import React from 'react';

import type { WorkflowDefinition, WorkflowView } from './workflowModel';

export function useWorkflowExecutionDeepLink(
  activeView: WorkflowView,
  workflow: WorkflowDefinition | undefined,
  setExpandedRunLogId: React.Dispatch<React.SetStateAction<string>>
) {
  const executionId = React.useMemo(
    () => new URLSearchParams(window.location.search).get('execution') || '',
    []
  );
  const focusedExecutionRef = React.useRef('');

  React.useEffect(() => {
    if (
      !executionId
      || focusedExecutionRef.current === executionId
      || activeView !== 'runs'
      || !workflow
    ) return;
    const run = workflow.runs.find((candidate) => candidate.executionId === executionId);
    if (!run) return;
    focusedExecutionRef.current = executionId;
    setExpandedRunLogId(run.runId || run.id);
    window.requestAnimationFrame(() => {
      document.getElementById(`workflow-execution-${executionId}`)?.focus({
        preventScroll: false
      });
    });
  }, [activeView, executionId, setExpandedRunLogId, workflow]);
}
