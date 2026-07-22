import type { WorkflowDefinition } from './workflowModel';

export const LOCAL_WORKFLOW_RUN_ID_PREFIX = 'local-workflow-run-';

export function isServerWorkflowRunId(runId: string | undefined): runId is string {
  if (!runId?.trim()) return false;
  return !runId.startsWith(LOCAL_WORKFLOW_RUN_ID_PREFIX);
}

export function serverWorkflowRunIds(runs: WorkflowDefinition['runs']): string[] {
  return runs.map((run) => run.runId).filter(isServerWorkflowRunId);
}
