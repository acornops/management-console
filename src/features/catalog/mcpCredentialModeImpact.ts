import {
  listWorkspaceWorkflowSchedules,
  listWorkspaceWorkflows,
  type WorkflowApiDefinition,
  type WorkflowSchedule
} from '@/services/control-plane/workflowApi';

export function enabledScheduleImpactForAgent(
  workflows: WorkflowApiDefinition[],
  schedules: WorkflowSchedule[],
  agentId: string
): WorkflowSchedule[] {
  const workflowIds = new Set(
    workflows
      .filter((workflow) => workflow.agentIds.includes(agentId))
      .map((workflow) => workflow.id)
  );
  return schedules.filter((schedule) => schedule.status === 'enabled' && workflowIds.has(schedule.workflowId));
}

export async function countEnabledScheduleImpactForAgent(
  workspaceId: string,
  agentId: string
): Promise<number> {
  const [workflows, schedules] = await Promise.all([
    listWorkspaceWorkflows(workspaceId),
    listWorkspaceWorkflowSchedules(workspaceId)
  ]);
  return enabledScheduleImpactForAgent(workflows, schedules.items, agentId).length;
}
