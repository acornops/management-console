import { listWorkspaceWorkflowSchedules, previewWorkflowCapabilities, type WorkflowApiDefinition, type WorkflowSchedule } from '@/services/control-plane/workflowApi';

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

export async function enabledScheduleImpactForTarget(
  workspaceId: string,
  schedules: WorkflowSchedule[],
  targetId: string,
  serverId: string
): Promise<WorkflowSchedule[]> {
  const enabledSchedules = schedules.filter((schedule) => schedule.status === 'enabled');
  const previews = await Promise.allSettled(enabledSchedules.map((schedule) =>
    previewWorkflowCapabilities(workspaceId, schedule.workflowId, {
      approvedContextGrants: schedule.approvedContextGrants,
      content: schedule.controlMessage
    })
  ));
  return enabledSchedules.filter((schedule, index) => {
    const result = previews[index];
    if (result.status !== 'fulfilled' || result.value.selectedTarget?.id !== targetId) return false;
    return [...result.value.tools.read, ...result.value.tools.write]
      .some((tool) => tool.source === 'target' && tool.serverId === serverId);
  });
}

export async function targetMcpCredentialModeScheduleCount(
  workspaceId: string,
  targetId: string,
  serverId: string
): Promise<number> {
  const schedules = await listWorkspaceWorkflowSchedules(workspaceId);
  return (await enabledScheduleImpactForTarget(workspaceId, schedules.items, targetId, serverId)).length;
}
