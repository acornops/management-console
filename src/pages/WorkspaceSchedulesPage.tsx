import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Select, SelectOption } from '@/components/common/Select';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formInputClassName, formTextareaClassName } from '@/components/common/formControlStyles';
import { ICONS } from '@/constants';
import { headerMotion } from '@/lib/motion';
import { Workspace } from '@/types';
import {
  createWorkflowSchedule,
  deleteWorkflowSchedule,
  listWorkspaceWorkflowSchedules,
  listWorkspaceWorkflows,
  updateWorkflowSchedule,
  type WorkflowApiDefinition,
  type WorkflowSchedule,
  type WorkflowScheduleListResponse
} from '@/services/control-plane/workflowApi';

interface WorkspaceSchedulesPageProps {
  workspace: Workspace;
}

interface ScheduleDraft {
  id?: string;
  workflowId: string;
  name: string;
  cron: string;
  timezone: string;
  enabled: boolean;
  approvedContextGrants: string;
  inputDefaultsText: string;
}

const emptyDraft: ScheduleDraft = {
  workflowId: '',
  name: '',
  cron: '0 9 * * 1-5',
  timezone: 'UTC',
  enabled: true,
  approvedContextGrants: 'workspace_metadata',
  inputDefaultsText: '{}'
};

const scheduleFormInputClassName = formInputClassName('mt-2');
const scheduleFormTextareaClassName = formTextareaClassName('mt-2');
const scheduleCodeTextareaClassName = formTextareaClassName('mt-2 min-h-36 font-mono text-xs font-normal');

function formatDateTime(value?: string): string {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(date);
}

function statusTone(status: WorkflowSchedule['status']): React.ComponentProps<typeof StatusBadge>['tone'] {
  return status === 'enabled' ? 'success' : 'neutral';
}

function workflowName(workflows: WorkflowApiDefinition[], workflowId: string): string {
  return workflows.find((workflow) => workflow.id === workflowId)?.name || workflowId;
}

function scheduleToDraft(schedule: WorkflowSchedule): ScheduleDraft {
  return {
    id: schedule.id,
    workflowId: schedule.workflowId,
    name: schedule.name,
    cron: schedule.cron,
    timezone: schedule.timezone,
    enabled: schedule.status === 'enabled',
    approvedContextGrants: schedule.approvedContextGrants.join('\n'),
    inputDefaultsText: JSON.stringify(schedule.inputDefaults || {}, null, 2)
  };
}

function parseJsonObject(value: string): Record<string, unknown> {
  const trimmed = value.trim();
  if (!trimmed) return {};
  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Input defaults must be a JSON object.');
  }
  return parsed as Record<string, unknown>;
}

export const WorkspaceSchedulesPage: React.FC<WorkspaceSchedulesPageProps> = ({ workspace }) => {
  const { t } = useTranslation();
  const [schedulePage, setSchedulePage] = useState<WorkflowScheduleListResponse | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowApiDefinition[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);
  const [scheduleError, setScheduleError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState<ScheduleDraft>(emptyDraft);
  const [draftError, setDraftError] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [deletingScheduleId, setDeletingScheduleId] = useState('');
  const [updatingScheduleId, setUpdatingScheduleId] = useState('');

  const canManageSchedules = Boolean(
    workspace.permissions?.manage_workflows ||
    workspace.currentUserRoleTemplate?.capabilities.includes('manage_workflows')
  );

  const refreshSchedules = async () => {
    setIsLoadingSchedules(true);
    setScheduleError('');
    try {
      const [schedulesResponse, workflowsResponse] = await Promise.all([
        listWorkspaceWorkflowSchedules(workspace.id),
        listWorkspaceWorkflows(workspace.id)
      ]);
      setSchedulePage(schedulesResponse);
      setWorkflows(workflowsResponse);
      if (!draft.workflowId && workflowsResponse[0]?.id) {
        setDraft((current) => ({ ...current, workflowId: workflowsResponse[0].id }));
      }
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : t('schedules.loadError'));
    } finally {
      setIsLoadingSchedules(false);
    }
  };

  useEffect(() => {
    void refreshSchedules();
  }, [workspace.id]);

  const schedules = schedulePage?.items || [];
  const summary = schedulePage?.summary || { total: 0, active: 0, paused: 0, approvalGated: 0 };
  const activeWorkflows = useMemo(() => workflows.filter((workflow) => workflow.status !== 'paused'), [workflows]);
  const workflowOptions = useMemo<Array<SelectOption<string>>>(
    () => workflows.map((workflow) => ({ value: workflow.id, label: workflow.name })),
    [workflows]
  );

  const openCreateDrawer = () => {
    setDraft({ ...emptyDraft, workflowId: activeWorkflows[0]?.id || workflows[0]?.id || '' });
    setDraftError('');
    setDrawerOpen(true);
  };

  const openEditDrawer = (schedule: WorkflowSchedule) => {
    setDraft(scheduleToDraft(schedule));
    setDraftError('');
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (savingSchedule) return;
    setDrawerOpen(false);
    setDraftError('');
  };

  const saveDraft = async () => {
    if (!canManageSchedules || savingSchedule) return;
    setDraftError('');
    setSavingSchedule(true);
    try {
      const inputDefaults = parseJsonObject(draft.inputDefaultsText);
      const approvedContextGrants = draft.approvedContextGrants
        .split(/\n|,/)
        .map((value) => value.trim())
        .filter(Boolean);
      if (!draft.workflowId || !draft.name.trim() || !draft.cron.trim() || !draft.timezone.trim()) {
        throw new Error(t('schedules.form.required'));
      }
      if (draft.id) {
        await updateWorkflowSchedule(workspace.id, draft.id, {
          workflowId: draft.workflowId,
          name: draft.name.trim(),
          cron: draft.cron.trim(),
          timezone: draft.timezone.trim(),
          enabled: draft.enabled,
          approvedContextGrants,
          inputDefaults
        });
      } else {
        await createWorkflowSchedule(workspace.id, {
          workflowId: draft.workflowId,
          name: draft.name.trim(),
          cron: draft.cron.trim(),
          timezone: draft.timezone.trim(),
          enabled: draft.enabled,
          approvedContextGrants,
          inputDefaults
        });
      }
      setDrawerOpen(false);
      await refreshSchedules();
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : t('schedules.form.saveError'));
    } finally {
      setSavingSchedule(false);
    }
  };

  const toggleSchedule = async (schedule: WorkflowSchedule) => {
    if (!canManageSchedules || updatingScheduleId) return;
    setUpdatingScheduleId(schedule.id);
    try {
      await updateWorkflowSchedule(workspace.id, schedule.id, { enabled: schedule.status !== 'enabled' });
      await refreshSchedules();
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : t('schedules.form.saveError'));
    } finally {
      setUpdatingScheduleId('');
    }
  };

  const deleteSchedule = async (schedule: WorkflowSchedule) => {
    if (!canManageSchedules || deletingScheduleId) return;
    setDeletingScheduleId(schedule.id);
    try {
      await deleteWorkflowSchedule(workspace.id, schedule.id);
      await refreshSchedules();
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : t('schedules.form.deleteError'));
    } finally {
      setDeletingScheduleId('');
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
      <motion.header {...headerMotion} className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="type-route-title">{t('schedules.title')}</h1>
          <p className="type-body mt-2 max-w-2xl">{t('schedules.subtitle', { workspace: workspace.name })}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => void refreshSchedules()} disabled={isLoadingSchedules}>
            <ICONS.RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t('common.refresh', { defaultValue: 'Refresh' })}
          </Button>
          <Button size="sm" variant="primary" onClick={openCreateDrawer} disabled={!canManageSchedules}>
            <ICONS.Plus className="h-4 w-4" aria-hidden="true" />
            {t('schedules.actions.create')}
          </Button>
        </div>
      </motion.header>

      {!canManageSchedules && (
        <div className="mb-5 rounded-md border border-ui-border bg-ui-surface px-4 py-3 text-sm font-medium text-ui-text-muted">
          {t('schedules.permissionNotice')}
        </div>
      )}
      {scheduleError && (
        <div className="mb-5 rounded-md border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm font-semibold text-status-danger-text">
          {scheduleError}
        </div>
      )}

      <section aria-label={t('schedules.summaryLabel')} className="mb-5 overflow-hidden rounded-lg border border-ui-border bg-ui-surface">
        <div className="grid divide-y divide-ui-border sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          {[
            { labelKey: 'schedules.summary.active', value: String(summary.active) },
            { labelKey: 'schedules.summary.paused', value: String(summary.paused) },
            { labelKey: 'schedules.summary.approvalGated', value: String(summary.approvalGated) },
            { labelKey: 'schedules.summary.nextRun', value: formatDateTime(summary.nextRunAt) }
          ].map((metric) => (
            <div key={metric.labelKey} className="px-4 py-3">
              <div className="type-micro-label text-ui-text-muted">{t(metric.labelKey)}</div>
              <div className="mt-1 text-sm font-bold text-ui-text">{metric.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
        <div className="flex flex-col gap-3 border-b border-ui-border bg-ui-bg px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-surface text-accent-strong">
              <ICONS.Clock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="type-section-title">{t('schedules.queueTitle')}</h2>
              <p className="type-caption mt-1 text-ui-text-muted">{t('schedules.queueBody')}</p>
            </div>
          </div>
          <div className="type-caption font-semibold text-ui-text-muted">{summary.total} {t('schedules.totalLabel')}</div>
        </div>

        {isLoadingSchedules ? (
          <div className="space-y-3 p-5" aria-busy="true">
            {[0, 1, 2].map((item) => <div key={item} className="h-12 rounded-md bg-ui-bg" />)}
          </div>
        ) : schedules.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <h3 className="type-section-title">{t('schedules.emptyTitle')}</h3>
            <p className="type-body mx-auto mt-2 max-w-xl text-ui-text-muted">{t('schedules.emptyBody')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[70rem] w-full border-collapse text-left">
              <thead className="border-b border-ui-border bg-ui-surface">
                <tr className="type-micro-label text-ui-text-muted">
                  <th scope="col" className="px-4 py-3">{t('schedules.table.schedule')}</th>
                  <th scope="col" className="px-4 py-3">{t('schedules.table.workflow')}</th>
                  <th scope="col" className="px-4 py-3">{t('schedules.table.cadence')}</th>
                  <th scope="col" className="px-4 py-3">{t('schedules.table.nextRun')}</th>
                  <th scope="col" className="px-4 py-3">{t('schedules.table.scope')}</th>
                  <th scope="col" className="px-4 py-3">{t('schedules.table.approvalGate')}</th>
                  <th scope="col" className="px-4 py-3">{t('schedules.table.status')}</th>
                  <th scope="col" className="px-4 py-3">{t('schedules.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border">
                {schedules.map((schedule) => (
                  <tr key={schedule.id} className="bg-ui-surface text-sm">
                    <th scope="row" className="px-4 py-4 font-semibold text-ui-text">{schedule.name}</th>
                    <td className="px-4 py-4 font-medium text-ui-text">{workflowName(workflows, schedule.workflowId)}</td>
                    <td className="px-4 py-4 text-ui-text-muted"><code>{schedule.cron}</code> · {schedule.timezone}</td>
                    <td className="px-4 py-4 font-semibold text-ui-text">{formatDateTime(schedule.nextRunAt)}</td>
                    <td className="px-4 py-4 text-ui-text-muted">{Object.keys(schedule.inputDefaults || {}).length} {t('schedules.inputDefaultsLabel')}</td>
                    <td className="px-4 py-4 text-ui-text-muted">{schedule.approvedContextGrants.length} {t('schedules.contextGrantLabel')}</td>
                    <td className="px-4 py-4"><StatusBadge tone={statusTone(schedule.status)}>{schedule.status === 'enabled' ? t('schedules.status.active') : t('schedules.status.paused')}</StatusBadge></td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openEditDrawer(schedule)} disabled={!canManageSchedules}>{t('schedules.actions.edit')}</Button>
                        <Button size="sm" variant="secondary" onClick={() => void toggleSchedule(schedule)} disabled={!canManageSchedules || updatingScheduleId === schedule.id}>
                          {schedule.status === 'enabled' ? t('schedules.actions.pause') : t('schedules.actions.resume')}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => void deleteSchedule(schedule)} disabled={!canManageSchedules || deletingScheduleId === schedule.id}>
                          <ICONS.Trash2 className="h-4 w-4" aria-hidden="true" />
                          {t('schedules.actions.delete')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button type="button" aria-label={t('schedules.form.close')} className="absolute inset-0 bg-ui-text/20" onClick={closeDrawer} />
          <aside role="dialog" aria-modal="true" aria-labelledby="schedule-drawer-title" className="relative flex h-full w-full max-w-2xl flex-col border-l border-ui-border bg-ui-surface shadow-2xl">
            <div className="flex items-start justify-between border-b border-ui-border px-5 py-4">
              <div>
                <h2 id="schedule-drawer-title" className="type-section-title">{draft.id ? t('schedules.form.editTitle') : t('schedules.form.createTitle')}</h2>
                <p className="type-caption mt-1 text-ui-text-muted">{t('schedules.form.body')}</p>
              </div>
              <Button type="button" variant="tertiary" size="sm" onClick={closeDrawer}>
                <ICONS.X className="h-4 w-4" aria-hidden="true" />
                {t('common.close', { defaultValue: 'Close' })}
              </Button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {draftError && <div className="rounded-md border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-sm font-semibold text-status-danger-text">{draftError}</div>}
              <label className="block text-sm font-semibold text-ui-text">
                {t('schedules.form.workflow')}
                <Select<string>
                  value={draft.workflowId}
                  options={workflowOptions}
                  onChange={(workflowId) => setDraft((current) => ({ ...current, workflowId }))}
                  className="mt-2"
                  ariaLabel={t('schedules.form.workflow')}
                />
              </label>
              <label className="block text-sm font-semibold text-ui-text">
                {t('schedules.form.name')}
                <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className={scheduleFormInputClassName} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-ui-text">
                  {t('schedules.form.cron')}
                  <input value={draft.cron} onChange={(event) => setDraft((current) => ({ ...current, cron: event.target.value }))} className={scheduleFormInputClassName} />
                </label>
                <label className="block text-sm font-semibold text-ui-text">
                  {t('schedules.form.timezone')}
                  <input value={draft.timezone} onChange={(event) => setDraft((current) => ({ ...current, timezone: event.target.value }))} className={scheduleFormInputClassName} />
                </label>
              </div>
              <label className="flex items-center gap-3 text-sm font-semibold text-ui-text">
                <input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))} className="h-4 w-4 rounded border-ui-border text-accent focus:ring-accent" />
                {t('schedules.form.enabled')}
              </label>
              <label className="block text-sm font-semibold text-ui-text">
                {t('schedules.form.approvedContextGrants')}
                <textarea value={draft.approvedContextGrants} onChange={(event) => setDraft((current) => ({ ...current, approvedContextGrants: event.target.value }))} className={scheduleFormTextareaClassName} />
              </label>
              <label className="block text-sm font-semibold text-ui-text">
                {t('schedules.form.inputDefaults')}
                <textarea value={draft.inputDefaultsText} onChange={(event) => setDraft((current) => ({ ...current, inputDefaultsText: event.target.value }))} className={scheduleCodeTextareaClassName} />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-ui-border px-5 py-4">
              <Button variant="tertiary" onClick={closeDrawer}>{t('common.cancel', { defaultValue: 'Cancel' })}</Button>
              <Button variant="primary" onClick={() => void saveDraft()} disabled={savingSchedule || !draft.workflowId || !draft.name.trim()}>
                {savingSchedule ? t('schedules.form.saving') : t('schedules.form.save')}
              </Button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
