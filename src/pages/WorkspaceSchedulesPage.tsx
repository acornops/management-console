import React, { useEffect, useMemo, useState } from 'react';
import { hasWorkspacePermission } from '@/app/workspacePermissions';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { CollectionState } from '@/components/common/CollectionState';
import { EmptyState } from '@/components/common/EmptyState';
import { InlineAlert } from '@/components/common/InlineAlert';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { DrawerFrame } from '@/components/common/OverlayFrames';
import { PageHeader, PageShell } from '@/components/common/PageComposition';
import { Select, SelectOption } from '@/components/common/Select';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formInputClassName, formTextareaClassName } from '@/components/common/formControlStyles';
import { ICONS } from '@/constants';
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
import { formatUserDateTime, getUserTimeZone } from '@/utils/dateTime';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { AppPaths } from '@/utils/routes';
import type { CursorCollectionPhase } from '@/hooks/resourceLifecycle';

interface WorkspaceSchedulesPageProps {
  workspace: Workspace;
  createWorkflowId?: string;
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
  runsAsUserId: string;
}

const createEmptyDraft = (): ScheduleDraft => ({
  workflowId: '',
  name: '',
  cron: '0 9 * * 1-5',
  timezone: getUserTimeZone(),
  enabled: true,
  approvedContextGrants: 'workspace_metadata',
  inputDefaultsText: '{}',
  runsAsUserId: ''
});

const scheduleFormInputClassName = formInputClassName('mt-2');
const scheduleFormTextareaClassName = formTextareaClassName('mt-2');
const scheduleCodeTextareaClassName = formTextareaClassName('mt-2 min-h-36 font-mono text-xs font-normal');

function formatDateTime(value?: string): string {
  return formatUserDateTime(value, { fallback: value || 'Not scheduled' });
}

function statusTone(status: WorkflowSchedule['status']): React.ComponentProps<typeof StatusBadge>['tone'] {
  return status === 'enabled' ? 'success' : 'neutral';
}

function workflowName(workflows: WorkflowApiDefinition[], workflowId: string): string {
  return workflows.find((workflow) => workflow.id === workflowId)?.name || workflowId;
}

function boundedScheduleError(value?: string): string {
  return value?.trim().slice(0, 240) || 'MCP prerequisites were not ready.';
}

function isMcpAutoPause(schedule: WorkflowSchedule): boolean {
  return schedule.status === 'paused'
    && schedule.lastStatus === 'auto_paused'
    && /\bMCP\b|\bPAT\b|personal connection|approved MCP tool|remote MCP|installation unavailable/i.test(schedule.lastError || '');
}

function scheduleMcpRecoveryPath(
  workspaceId: string,
  workflows: WorkflowApiDefinition[],
  workflowId: string
): string {
  const workflow = workflows.find((candidate) => candidate.id === workflowId);
  if (workflow?.executionMode === 'coordinated') {
    const params = new URLSearchParams({ workflow: workflow.id, tab: 'capabilities' });
    return `${AppPaths.workspaceWorkflows(workspaceId)}?${params.toString()}`;
  }
  const agentId = workflow?.agentIds[0];
  if (!agentId) return AppPaths.workspaceAgents(workspaceId);
  const params = new URLSearchParams({
    agent: agentId,
    panel: 'profile',
    agentTab: 'capabilities',
    capabilityTab: 'mcp'
  });
  return `${AppPaths.workspaceAgents(workspaceId)}?${params.toString()}`;
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
    inputDefaultsText: JSON.stringify(schedule.inputDefaults || {}, null, 2),
    runsAsUserId: schedule.principal.id
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

export const WorkspaceSchedulesPage: React.FC<WorkspaceSchedulesPageProps> = ({ workspace, createWorkflowId }) => {
  const { t } = useTranslation();
  const consumedCreateWorkflowIdRef = React.useRef<string | undefined>(undefined);
  const [schedulePage, setSchedulePage] = useState<WorkflowScheduleListResponse | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowApiDefinition[]>([]);
  const [schedulePhase, setSchedulePhase] = useState<CursorCollectionPhase>('loading');
  const [scheduleError, setScheduleError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState<ScheduleDraft>(() => createEmptyDraft());
  const [draftError, setDraftError] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [deletingScheduleId, setDeletingScheduleId] = useState('');
  const [updatingScheduleId, setUpdatingScheduleId] = useState('');
  const [currentUser, setCurrentUser] = useState<{ id: string; label: string } | null>(null);

  const canManageSchedules = hasWorkspacePermission(workspace, 'manage_workflows');

  const refreshSchedules = async () => {
    setSchedulePhase(schedulePage === null ? 'loading' : 'refreshing');
    setScheduleError('');
    try {
      const [schedulesResponse, workflowsResponse, loadedUser] = await Promise.all([
        listWorkspaceWorkflowSchedules(workspace.id),
        listWorkspaceWorkflows(workspace.id),
        controlPlaneApi.getCurrentUser()
      ]);
      setSchedulePage(schedulesResponse);
      setWorkflows(workflowsResponse);
      setCurrentUser({ id: loadedUser.id, label: loadedUser.name || loadedUser.email });
      if (!draft.workflowId && workflowsResponse[0]?.id) {
        setDraft((current) => ({ ...current, workflowId: workflowsResponse[0].id, runsAsUserId: current.runsAsUserId || loadedUser.id }));
      }
      setSchedulePhase('ready');
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : t('schedules.loadError'));
      setSchedulePhase('error');
    }
  };

  useEffect(() => {
    void refreshSchedules();
  }, [workspace.id]);

  const schedules = schedulePage?.items || [];
  const summary = schedulePage?.summary || { total: 0, active: 0, paused: 0, approvalGated: 0 };
  const schedulesBusy = schedulePhase === 'loading' || schedulePhase === 'refreshing';
  const activeWorkflows = useMemo(() => workflows.filter((workflow) => workflow.status !== 'paused'), [workflows]);
  const workflowOptions = useMemo<Array<SelectOption<string>>>(
    () => workflows.map((workflow) => ({ value: workflow.id, label: workflow.name })),
    [workflows]
  );

  const openCreateDrawer = (workflowId?: string) => {
    setDraft({ ...createEmptyDraft(), workflowId: workflowId || activeWorkflows[0]?.id || workflows[0]?.id || '', runsAsUserId: currentUser?.id || '' });
    setDraftError('');
    setDrawerOpen(true);
  };

  useEffect(() => {
    if (!createWorkflowId || consumedCreateWorkflowIdRef.current === createWorkflowId) return;
    consumedCreateWorkflowIdRef.current = createWorkflowId;
    openCreateDrawer(createWorkflowId);
  }, [createWorkflowId]);

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
          inputDefaults,
          principal: { type: 'user', id: currentUser?.id || draft.runsAsUserId }
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
    <PageShell>
      <PageHeader
        title={t('schedules.title')}
        description={t('schedules.subtitle', { workspace: workspace.name })}
        actions={<>
          <Button size="md" variant="secondary" onClick={() => void refreshSchedules()} disabled={schedulesBusy}>
            <ICONS.RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t('common.refresh', { defaultValue: 'Refresh' })}
          </Button>
          <Button size="md" variant="primary" onClick={() => openCreateDrawer()} disabled={!canManageSchedules}>
            <ICONS.Plus className="h-4 w-4" aria-hidden="true" />
            {t('schedules.actions.create')}
          </Button>
        </>}
      />

      {!canManageSchedules && (
        <div className="mb-5 rounded-md border border-ui-border bg-ui-surface px-4 py-3 text-sm font-medium text-ui-text-muted">
          {t('schedules.permissionNotice')}
        </div>
      )}
      {scheduleError && schedulePhase !== 'error' && <InlineAlert tone="danger" className="mb-5">{scheduleError}</InlineAlert>}

      <CollectionState
        phase={schedulePhase}
        itemCount={schedules.length}
        loading={<InlineLoadingIndicator label={t('common.loading')} className="w-full justify-center py-10" />}
        empty={<EmptyState
          icon={<ICONS.Clock />}
          title={t('schedules.emptyTitle')}
          description={t('schedules.emptyBody')}
        />}
        error={<EmptyState
          role="alert"
          icon={<ICONS.AlertTriangle />}
          title={t('schedules.loadError')}
          description={scheduleError}
          actions={<Button variant="secondary" onClick={() => void refreshSchedules()}>{t('common.retry', { defaultValue: 'Retry' })}</Button>}
        />}
        feedback={scheduleError ? <InlineAlert tone="danger" className="mb-5">{scheduleError}</InlineAlert> : <InlineLoadingIndicator label={t('common.loading')} className="mb-5" />}
        announcement={schedulePhase === 'ready' ? `${schedules.length} ${t('schedules.totalLabel')}` : undefined}
      >
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
                {schedules.map((schedule) => {
                  const mcpAutoPaused = isMcpAutoPause(schedule);
                  return (
                  <tr key={schedule.id} className="bg-ui-surface text-sm">
                    <th scope="row" className="px-4 py-4 font-semibold text-ui-text">{schedule.name}</th>
                    <td className="px-4 py-4 font-medium text-ui-text">{workflowName(workflows, schedule.workflowId)}</td>
                    <td className="px-4 py-4 text-ui-text-muted"><code>{schedule.cron}</code> · {schedule.timezone}</td>
                    <td className="px-4 py-4 font-semibold text-ui-text">{formatDateTime(schedule.nextRunAt)}</td>
                    <td className="px-4 py-4 text-ui-text-muted">{Object.keys(schedule.inputDefaults || {}).length} {t('schedules.inputDefaultsLabel')}</td>
                    <td className="px-4 py-4 text-ui-text-muted">{schedule.approvedContextGrants.length} {t('schedules.contextGrantLabel')}</td>
                    <td className="px-4 py-4">
                      <StatusBadge tone={mcpAutoPaused ? 'warning' : statusTone(schedule.status)}>{mcpAutoPaused ? 'Auto-paused' : schedule.status === 'enabled' ? t('schedules.status.active') : t('schedules.status.paused')}</StatusBadge>
                      {mcpAutoPaused && (
                        <div className="mt-2 max-w-sm text-status-warning-text">
                          <p className="type-caption">{boundedScheduleError(schedule.lastError)}</p>
                          <p className="type-caption mt-1 font-semibold">Repair MCP before resuming. Resume remains a manual action.</p>
                          <a className="type-caption mt-1 inline-flex font-semibold underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-control-boundary" href={scheduleMcpRecoveryPath(workspace.id, workflows, schedule.workflowId)}>{t('workflowCoordination.reviewWorkflowAccess')}</a>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openEditDrawer(schedule)} disabled={!canManageSchedules}>{t('schedules.actions.edit')}</Button>
                        <Button size="sm" variant="secondary" onClick={() => void toggleSchedule(schedule)} disabled={!canManageSchedules || updatingScheduleId === schedule.id}>
                          {schedule.status === 'enabled' ? t('schedules.actions.pause') : t('schedules.actions.resume')}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => void deleteSchedule(schedule)} disabled={!canManageSchedules || deletingScheduleId === schedule.id}>
                          {t('schedules.actions.delete')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </CollectionState>

      <DrawerFrame
        open={drawerOpen}
        onClose={closeDrawer}
        closeDisabled={savingSchedule}
        titleId="schedule-drawer-title"
        title={draft.id ? t('schedules.form.editTitle') : t('schedules.form.createTitle')}
        description={t('schedules.form.body')}
        closeLabel={t('schedules.form.close')}
        width="lg"
        bodyClassName="space-y-4"
        footer={<>
          <Button size="sm" variant="tertiary" onClick={closeDrawer}>{t('common.cancel', { defaultValue: 'Cancel' })}</Button>
          <Button size="sm" variant="primary" onClick={() => void saveDraft()} disabled={savingSchedule || !draft.workflowId || !draft.name.trim() || !draft.runsAsUserId}>
            {savingSchedule ? t('schedules.form.saving') : t('schedules.form.save')}
          </Button>
        </>}
      >
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
              <div className="block text-sm font-semibold text-ui-text">
                Runs as
                <div className="mt-2 min-h-11 rounded-md border border-ui-border bg-ui-bg px-3 py-2.5 font-normal text-ui-text">
                  {currentUser?.id === draft.runsAsUserId ? currentUser.label : draft.runsAsUserId}
                </div>
                <span className="type-caption mt-1 block text-ui-text-muted">Schedules keep their user owner. Workspace membership and permissions are rechecked for every run.</span>
              </div>
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
                <Checkbox checked={draft.enabled} onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))} />
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
      </DrawerFrame>
    </PageShell>
  );
};
