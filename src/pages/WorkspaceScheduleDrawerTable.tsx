import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableRow,
  CollectionLoadingSkeleton,
  StatusBadge,
  TableLoadingRows
} from '@acornops/ui';
import {
  isMcpAutoPause,
  WorkspaceScheduleActionMenu,
  WorkspaceScheduleMobileCard
} from '@/pages/WorkspaceScheduleRows';
import { formatScheduleDateTime } from '@/pages/WorkspaceSchedulesPage.helpers';
import type {
  WorkflowApiDefinition,
  WorkflowSchedule
} from '@/services/control-plane/workflowApi';
import type { CursorCollectionPhase } from '@/hooks/resourceLifecycle';
import { ResponsiveLedger } from '@/components/common/ResponsiveLedger';

interface WorkspaceScheduleDrawerTableProps {
  actionButtonRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
  canManage: boolean;
  deletingId: string;
  empty: React.ReactNode;
  error: React.ReactNode;
  onDelete: (schedule: WorkflowSchedule) => void;
  onEdit: (schedule: WorkflowSchedule) => void;
  onRepair: (schedule: WorkflowSchedule) => void;
  onToggle: (schedule: WorkflowSchedule) => void;
  phase: CursorCollectionPhase;
  schedules: WorkflowSchedule[];
  updatingId: string;
  workflows: WorkflowApiDefinition[] | ReadonlyMap<string, WorkflowApiDefinition>;
  workspaceId: string;
}

export const WorkspaceScheduleDrawerTable: React.FC<WorkspaceScheduleDrawerTableProps> = ({
  actionButtonRefs,
  canManage,
  deletingId,
  empty,
  error,
  onDelete,
  onEdit,
  onRepair,
  onToggle,
  phase,
  schedules,
  updatingId,
  workflows,
  workspaceId
}) => {
  const { t } = useTranslation();
  return (
    <ResponsiveLedger
      compact={<>
        {schedules.length > 0 ? schedules.map((schedule) => (
          <WorkspaceScheduleMobileCard
            key={schedule.id}
            schedule={schedule}
            workflows={workflows}
            workspaceId={workspaceId}
            canManage={canManage}
            updating={updatingId === schedule.id}
            deleting={deletingId === schedule.id}
            actionButtonRefs={actionButtonRefs}
            onEdit={() => onEdit(schedule)}
            onRepair={() => onRepair(schedule)}
            onToggle={() => onToggle(schedule)}
            onDelete={() => onDelete(schedule)}
          />
        )) : phase === 'loading' || phase === 'refreshing' || phase === 'loadingMore' ? (
          <CollectionLoadingSkeleton label={t('schedules.loading')} />
        ) : phase === 'error' ? error : empty}
      </>}
      wide={<DataTable caption={t('schedules.tableLabel')} className="min-w-[42rem] w-full border-collapse text-left">
        <DataTableHeader collectionState={{ phase, itemCount: schedules.length, showDuringInitialLoading: true }}>
          <DataTableRow>
            <DataTableHeaderCell density="dense">{t('schedules.table.schedule')}</DataTableHeaderCell>
            <DataTableHeaderCell density="dense">{t('schedules.table.cadence')}</DataTableHeaderCell>
            <DataTableHeaderCell density="dense">{t('schedules.table.nextRun')}</DataTableHeaderCell>
            <DataTableHeaderCell density="dense">{t('common.status')}</DataTableHeaderCell>
            <DataTableHeaderCell density="dense" numeric>{t('schedules.table.actions')}</DataTableHeaderCell>
          </DataTableRow>
        </DataTableHeader>
        <DataTableBody className="divide-y divide-ui-border">
          {schedules.length > 0 ? schedules.map((schedule) => (
            <DataTableRow key={schedule.id}>
              <DataTableCell as="th" scope="row" density="dense" className="py-3 type-emphasis text-ui-text">{schedule.name}</DataTableCell>
              <DataTableCell density="dense" className="py-3 text-ui-text-muted"><code>{schedule.cron}</code><span className="mt-1 block type-caption">{schedule.timezone}</span></DataTableCell>
              <DataTableCell density="dense" className="py-3 text-ui-text">{formatScheduleDateTime(schedule.nextRunAt, t('schedules.nextRunUnavailable'))}</DataTableCell>
              <DataTableCell density="dense" className="py-3">
                <StatusBadge tone={schedule.status === 'enabled' ? 'success' : 'neutral'}>
                  {schedule.status === 'enabled' ? t('schedules.status.active') : t('schedules.status.paused')}
                </StatusBadge>
              </DataTableCell>
              <DataTableCell density="dense" className="py-3">
                <div className="flex justify-end">
                  <WorkspaceScheduleActionMenu
                    schedule={schedule}
                    workflows={workflows}
                    workspaceId={workspaceId}
                    canManage={canManage}
                    updating={updatingId === schedule.id}
                    deleting={deletingId === schedule.id}
                    actionButtonRefs={actionButtonRefs}
                    mcpAutoPaused={isMcpAutoPause(schedule)}
                    onEdit={() => onEdit(schedule)}
                    onRepair={() => onRepair(schedule)}
                    onToggle={() => onToggle(schedule)}
                    onDelete={() => onDelete(schedule)}
                  />
                </div>
              </DataTableCell>
            </DataTableRow>
          )) : phase === 'loading' || phase === 'refreshing' || phase === 'loadingMore' ? (
            <TableLoadingRows columns={5} label={t('schedules.loading')} />
          ) : (
            <DataTableRow>
              <DataTableCell colSpan={5} density="dense" className="p-0">
                {phase === 'error' ? error : empty}
              </DataTableCell>
            </DataTableRow>
          )}
        </DataTableBody>
      </DataTable>}
    />
  );
};
