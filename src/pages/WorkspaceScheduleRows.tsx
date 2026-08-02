import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@acornops/ui';
import { MenuItem } from '@acornops/ui';
import { OverflowActionMenu } from '@acornops/ui';
import { ICONS } from '@/constants';
import { WorkspaceScheduleExecutionFacts } from '@/pages/WorkspaceScheduleExecutionFacts';
import { agentMcpConfigurationPath } from '@/services/control-plane/mcpReadinessRecovery';
import type { WorkflowApiDefinition, WorkflowSchedule } from '@/services/control-plane/workflowApi';
import { formatUserDateTime } from '@/utils/dateTime';
import { AppPaths } from '@/utils/routes';
import { DataTableCell, DataTableRow } from '@acornops/ui';

interface WorkspaceScheduleRowProps {
  schedule: WorkflowSchedule;
  workflows: WorkflowApiDefinition[] | ReadonlyMap<string, WorkflowApiDefinition>;
  workspaceId: string;
  canManage: boolean;
  updating: boolean;
  deleting: boolean;
  actionButtonRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
  onEdit: () => void;
  onRepair: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

export function scheduleWorkflowName(
  workflows: WorkflowApiDefinition[] | ReadonlyMap<string, WorkflowApiDefinition>,
  workflowId: string
): string {
  return (Array.isArray(workflows)
    ? workflows.find((workflow) => workflow.id === workflowId)
    : workflows.get(workflowId))?.name || workflowId;
}

export function isMcpAutoPause(schedule: WorkflowSchedule): boolean {
  return schedule.status === 'paused'
    && schedule.lastStatus === 'auto_paused'
    && /\bMCP\b|credential connection|approved MCP tool|remote MCP|installation unavailable/i.test(schedule.lastError || '');
}

function scheduleMcpRecoveryPath(
  workspaceId: string,
  workflows: WorkflowApiDefinition[] | ReadonlyMap<string, WorkflowApiDefinition>,
  workflowId: string,
  lastError?: string
): string {
  const workflow = Array.isArray(workflows)
    ? workflows.find((candidate) => candidate.id === workflowId)
    : workflows.get(workflowId);
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

export function WorkspaceScheduleActionMenu(props: WorkspaceScheduleRowProps & { mcpAutoPaused: boolean }) {
  const { t } = useTranslation();
  const {
    schedule,
    canManage,
    updating,
    deleting,
    actionButtonRefs,
    mcpAutoPaused,
    onEdit,
    onRepair,
    onToggle,
    onDelete
  } = props;
  const runAction = (close: () => void, action: () => void) => {
    close();
    actionButtonRefs.current.get(schedule.id)?.focus({ preventScroll: true });
    action();
  };

  return (
    <OverflowActionMenu
      ref={(node) => {
        if (node) actionButtonRefs.current.set(schedule.id, node);
        else actionButtonRefs.current.delete(schedule.id);
      }}
      label={t('schedules.actionsFor', { name: schedule.name })}
      disabled={!canManage || deleting}
    >
      {(close) => <>
        <MenuItem onClick={() => runAction(close, onEdit)}>
          <ICONS.Pencil className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
          {t('schedules.actions.edit')}
        </MenuItem>
        <MenuItem disabled={updating} onClick={() => runAction(close, mcpAutoPaused ? onRepair : onToggle)}>
          {mcpAutoPaused
            ? <ICONS.Wrench className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
            : <ICONS.Zap className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />}
          {mcpAutoPaused
            ? t('schedules.actions.repairAndResume')
            : schedule.status === 'enabled'
              ? t('schedules.actions.pause')
              : t('schedules.actions.resume')}
        </MenuItem>
        <MenuItem destructive onClick={() => runAction(close, onDelete)}>
          <ICONS.Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t('schedules.actions.delete')}
        </MenuItem>
      </>}
    </OverflowActionMenu>
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
    <article className="p-[var(--ao-surface-padding)]">
      <h2 className="type-row-title text-ui-text">{schedule.name}</h2>
      <p className="type-caption mt-1 type-emphasis text-ui-text-muted">
        {scheduleWorkflowName(workflows, schedule.workflowId)}
      </p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="type-micro-label text-ui-text-muted">{t('schedules.table.cadence')}</dt>
          <dd className="type-caption mt-1 text-ui-text"><code>{schedule.cron}</code> · {schedule.timezone}</dd>
        </div>
        <div>
          <dt className="type-micro-label text-ui-text-muted">{t('schedules.table.nextRun')}</dt>
          <dd className="type-caption mt-1 type-emphasis text-ui-text">{nextRun}</dd>
        </div>
        <div>
          <dt className="type-micro-label text-ui-text-muted">{t('schedules.table.approvalGate')}</dt>
          <dd className="type-caption mt-1 text-ui-text">{t('schedules.accessInherited')}</dd>
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
        <div className="flex items-center justify-end gap-2">
          {mcpAutoPaused && (
            <Button size="sm" variant="primary" onClick={props.onRepair} disabled={!props.canManage || props.updating}>
              {t('schedules.actions.repairAndResume')}
            </Button>
          )}
          <WorkspaceScheduleActionMenu {...props} mcpAutoPaused={mcpAutoPaused} />
        </div>
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
    <DataTableRow className="bg-ui-surface type-body">
      <DataTableCell as="th" scope="row" density="dense" className="type-emphasis text-ui-text">{schedule.name}</DataTableCell>
      <DataTableCell density="dense" className="type-ui text-ui-text">{scheduleWorkflowName(workflows, schedule.workflowId)}</DataTableCell>
      <DataTableCell density="dense" className="text-ui-text-muted"><code>{schedule.cron}</code> · {schedule.timezone}</DataTableCell>
      <DataTableCell density="dense" className="type-emphasis text-ui-text">{nextRun}</DataTableCell>
      <DataTableCell density="dense" className="text-ui-text-muted">
        <span className="block">{t('schedules.accessInherited')}</span>
      </DataTableCell>
      <DataTableCell density="dense">
        <div className="min-w-[12rem]">
          <WorkspaceScheduleExecutionFacts
            schedule={schedule}
            mcpAutoPaused={mcpAutoPaused}
            recoveryPath={scheduleMcpRecoveryPath(workspaceId, workflows, schedule.workflowId, schedule.lastError)}
          />
        </div>
      </DataTableCell>
      <DataTableCell density="dense">
        <div className="flex items-center justify-end gap-2">
          {mcpAutoPaused && (
            <Button size="sm" variant="primary" onClick={props.onRepair} disabled={!props.canManage || props.updating}>
              {t('schedules.actions.repairAndResume')}
            </Button>
          )}
          <WorkspaceScheduleActionMenu {...props} mcpAutoPaused={mcpAutoPaused} />
        </div>
      </DataTableCell>
    </DataTableRow>
  );
};
