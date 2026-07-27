import React from 'react';

import type { WorkflowDefinition, WorkflowTab } from './workflowModel';

export function useWorkflowExecutionDeepLink(
  activeTab: WorkflowTab,
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
      || activeTab !== 'runs'
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
  }, [activeTab, executionId, setExpandedRunLogId, workflow]);
}
