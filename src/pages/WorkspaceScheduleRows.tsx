import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/common/Button';
import { WorkspaceScheduleExecutionFacts } from '@/pages/WorkspaceScheduleExecutionFacts';
import { agentMcpConfigurationPath } from '@/services/control-plane/mcpReadinessRecovery';
import type { WorkflowApiDefinition, WorkflowSchedule } from '@/services/control-plane/workflowApi';
import { formatUserDateTime } from '@/utils/dateTime';
import { AppPaths } from '@/utils/routes';

interface WorkspaceScheduleRowProps {
  schedule: WorkflowSchedule;
  workflows: WorkflowApiDefinition[];
  workspaceId: string;
  canManage: boolean;
  updating: boolean;
  deleting: boolean;
  onEdit: () => void;
  onRepair: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

export function scheduleWorkflowName(
  workflows: WorkflowApiDefinition[],
  workflowId: string
): string {
  return workflows.find((workflow) => workflow.id === workflowId)?.name || workflowId;
}

function isMcpAutoPause(schedule: WorkflowSchedule): boolean {
  return schedule.status === 'paused'
    && schedule.lastStatus === 'auto_paused'
    && /\bMCP\b|credential connection|approved MCP tool|remote MCP|installation unavailable/i.test(schedule.lastError || '');
}

function scheduleMcpRecoveryPath(
  workspaceId: string,
  workflows: WorkflowApiDefinition[],
  workflowId: string,
  lastError?: string
): string {
  const workflow = workflows.find((candidate) => candidate.id === workflowId);
  if (workflow?.executionMode === 'coordinated') {
    const params = new URLSearchParams({ workflow: workflow.id, tab: 'capabilities' });
    return `${AppPaths.workspaceWorkflows(workspaceId)}?${params.toString()}`;
  }
  const agentId = workflow?.agentIds[0];
  if (!agentId) return AppPaths.workspaceAgents(workspaceId);
  const serverId = lastError?.match(/MCP (?:server|tool) ([^/\s.]+)/i)?.[1];
  return agentMcpConfigurationPath({
    workspaceId,
    agentId,
    serverId,
    action: serverId
      ? /verify|replace|does not expose/i.test(lastError || '')
        ? 'verify_mcp_server'
        : 'connect_mcp_server'
      : undefined
  });
}

function ScheduleActions({
  schedule,
  canManage,
  updating,
  deleting,
  mcpAutoPaused,
  onEdit,
  onRepair,
  onToggle,
  onDelete
}: Omit<WorkspaceScheduleRowProps, 'workflows' | 'workspaceId'> & { mcpAutoPaused: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" onClick={onEdit} disabled={!canManage}>
        {t('schedules.actions.edit')}
      </Button>
      <Button
        size="sm"
        variant={mcpAutoPaused ? 'primary' : 'secondary'}
        onClick={mcpAutoPaused ? onRepair : onToggle}
        disabled={!canManage || updating}
      >
        {mcpAutoPaused
          ? t('schedules.actions.repairAndResume')
          : schedule.status === 'enabled'
            ? t('schedules.actions.pause')
            : t('schedules.actions.resume')}
      </Button>
      <Button
        size="sm"
        variant="tertiary"
        className="text-status-danger-text hover:bg-status-danger-soft hover:text-status-danger-text"
        onClick={onDelete}
        disabled={!canManage || deleting}
      >
        {t('schedules.actions.delete')}
      </Button>
    </div>
  );
}

export const WorkspaceScheduleMobileCard: React.FC<WorkspaceScheduleRowProps> = (props) => {
  const { t } = useTranslation();
  const { schedule, workflows, workspaceId } = props;
  const mcpAutoPaused = isMcpAutoPause(schedule);
  const nextRun = formatUserDateTime(schedule.nextRunAt, {
    fallback: schedule.nextRunAt || t('schedules.nextRunUnavailable')
  });

  return (
    <article className="p-[var(--surface-padding)]">
      <h2 className="type-row-title text-ui-text">{schedule.name}</h2>
      <p className="type-caption mt-1 font-semibold text-ui-text-muted">
        {scheduleWorkflowName(workflows, schedule.workflowId)}
      </p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="type-micro-label text-ui-text-muted">{t('schedules.table.cadence')}</dt>
          <dd className="type-caption mt-1 text-ui-text"><code>{schedule.cron}</code> · {schedule.timezone}</dd>
        </div>
        <div>
          <dt className="type-micro-label text-ui-text-muted">{t('schedules.table.nextRun')}</dt>
          <dd className="type-caption mt-1 font-semibold text-ui-text">{nextRun}</dd>
        </div>
        <div>
          <dt className="type-micro-label text-ui-text-muted">{t('schedules.table.scope')}</dt>
          <dd className="type-caption mt-1 text-ui-text">{t('schedules.runtimeValueCount', { count: Object.keys(schedule.inputs).length })}</dd>
        </div>
        <div>
          <dt className="type-micro-label text-ui-text-muted">{t('schedules.table.approvalGate')}</dt>
          <dd className="type-caption mt-1 text-ui-text">{t('schedules.contextGrantCount', { count: schedule.approvedContextGrants.length })}</dd>
        </div>
      </dl>
      <div className="mt-4 border-t border-ui-border pt-4">
        <WorkspaceScheduleExecutionFacts
          schedule={schedule}
          mcpAutoPaused={mcpAutoPaused}
          recoveryPath={scheduleMcpRecoveryPath(workspaceId, workflows, schedule.workflowId, schedule.lastError)}
        />
      </div>
      <div className="mt-4 border-t border-ui-border pt-4">
        <ScheduleActions {...props} mcpAutoPaused={mcpAutoPaused} />
      </div>
    </article>
  );
};

export const WorkspaceScheduleTableRow: React.FC<WorkspaceScheduleRowProps> = (props) => {
  const { t } = useTranslation();
  const { schedule, workflows, workspaceId } = props;
  const mcpAutoPaused = isMcpAutoPause(schedule);
  const nextRun = formatUserDateTime(schedule.nextRunAt, {
    fallback: schedule.nextRunAt || t('schedules.nextRunUnavailable')
  });

  return (
    <tr className="bg-ui-surface text-sm">
      <th scope="row" className="px-4 py-4 font-semibold text-ui-text">{schedule.name}</th>
      <td className="px-4 py-4 font-medium text-ui-text">{scheduleWorkflowName(workflows, schedule.workflowId)}</td>
      <td className="px-4 py-4 text-ui-text-muted"><code>{schedule.cron}</code> · {schedule.timezone}</td>
      <td className="px-4 py-4 font-semibold text-ui-text">{nextRun}</td>
      <td className="px-4 py-4 text-ui-text-muted">
        <span className="block">{t('schedules.runtimeValueCount', { count: Object.keys(schedule.inputs).length })}</span>
        <span className="mt-1 block">{t('schedules.contextGrantCount', { count: schedule.approvedContextGrants.length })}</span>
      </td>
      <td className="px-4 py-4">
        <div className="min-w-[15rem]">
          <WorkspaceScheduleExecutionFacts
            schedule={schedule}
            mcpAutoPaused={mcpAutoPaused}
            recoveryPath={scheduleMcpRecoveryPath(workspaceId, workflows, schedule.workflowId, schedule.lastError)}
          />
        </div>
      </td>
      <td className="px-4 py-4">
        <ScheduleActions {...props} mcpAutoPaused={mcpAutoPaused} />
      </td>
    </tr>
  );
};
