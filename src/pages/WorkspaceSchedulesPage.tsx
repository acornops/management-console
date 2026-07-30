import React, { useEffect, useMemo, useState } from 'react';
import { hasWorkspacePermission } from '@/app/workspacePermissions';
import { useTranslation } from 'react-i18next';
import { Button } from '@acornops/ui';
import { Checkbox } from '@acornops/ui';
import { CollectionState } from '@acornops/ui';
import { DataTableHeader, DataTableHeaderCell } from '@acornops/ui';
import { createDiscoveryFilterGroup, DiscoveryFilterBar } from '@acornops/ui';
import { EmptyState } from '@acornops/ui';
import { InlineAlert } from '@acornops/ui';
import { InlineLoadingIndicator } from '@acornops/ui';
import { DrawerFrame } from '@acornops/ui';
import { PageShell } from '@acornops/ui';
import { Select, SelectOption } from '@acornops/ui';
import { formInputClassName, formTextareaClassName } from '@acornops/ui';
import { ICONS } from '@/constants';
import { Workspace } from '@/types';
import {
  createWorkflowSchedule,
  deleteWorkflowSchedule,
  listWorkspaceWorkflowSchedules,
  listWorkspaceWorkflows,
  previewWorkflowCapabilities,
  updateWorkflowSchedule,
  type WorkflowApiDefinition,
  type WorkflowCapabilitiesPreview,
  type WorkflowMcpRequirementPreview,
  type WorkflowSchedule,
  type WorkflowScheduleListResponse
} from '@/services/control-plane/workflowApi';
import type { WorkflowTriggerType } from '@/utils/routes';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { CursorCollectionPhase } from '@/hooks/resourceLifecycle';
import { WorkflowParameterFields } from '@/pages/WorkspaceWorkflowsPage.launchFields';
import { WorkflowMcpCredentialDialog, WorkflowPreviewAuthRow, workflowCapabilityBlockerMessage } from '@/pages/WorkspaceWorkflowsPage.components';
import {
  approvedContextGrants,
  createEmptyDraft,
  formatScheduleDateTime,
  scheduleToDraft,
  type ScheduleDraft
} from '@/pages/WorkspaceSchedulesPage.helpers';
import {
  scheduleWorkflowName,
  WorkspaceScheduleMobileCard,
  WorkspaceScheduleTableRow
} from '@/pages/WorkspaceScheduleRows';
import { WorkspaceScheduleDeleteDialog } from '@/pages/WorkspaceScheduleDeleteDialog';
import { WorkflowTriggersPageHeader } from '@/pages/WorkflowTriggersPageHeader';
import { updateUrlSearch, useUrlSearchState } from '@/hooks/useUrlSearchState';
import { TextInput, Textarea } from '@acornops/ui';
import { DataTable, DataTableBody, DataTableCell, DataTableRow } from '@acornops/ui';

interface WorkspaceSchedulesPageProps {
  workspace: Workspace;
  createTriggerType?: WorkflowTriggerType;
  createWorkflowId?: string;
  navigate: (path: string) => void;
}

type ScheduleStatusFilter = 'all' | 'enabled' | 'paused';

const scheduleFormInputClassName = formInputClassName('mt-2');
const scheduleFormTextareaClassName = formTextareaClassName('mt-2');

export const WorkspaceSchedulesPage: React.FC<WorkspaceSchedulesPageProps> = ({
  workspace,
  createTriggerType,
  createWorkflowId,
  navigate
}) => {
  const { t } = useTranslation();
  const urlSearch = useUrlSearchState();
  const consumedCreateIntentRef = React.useRef('');
  const [schedulePage, setSchedulePage] = useState<WorkflowScheduleListResponse | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowApiDefinition[]>([]);
  const [schedulePhase, setSchedulePhase] = useState<CursorCollectionPhase>('loading');
  const [scheduleError, setScheduleError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState<ScheduleDraft>(() => createEmptyDraft());
  const [draftError, setDraftError] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [deletingScheduleId, setDeletingScheduleId] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [updatingScheduleId, setUpdatingScheduleId] = useState('');
  const [currentUser, setCurrentUser] = useState<{ id: string; label: string } | null>(null);
  const [capabilityPreview, setCapabilityPreview] = useState<WorkflowCapabilitiesPreview | null>(null);
  const [capabilityPreviewError, setCapabilityPreviewError] = useState('');
  const [capabilityPreviewing, setCapabilityPreviewing] = useState(false);
  const [credentialRequirement, setCredentialRequirement] = useState<WorkflowMcpRequirementPreview | null>(null);
  const [capabilityPreviewRevision, setCapabilityPreviewRevision] = useState(0);
  const capabilityPreviewRequestRef = React.useRef(0);
  const scheduleActionButtonRefs = React.useRef(new Map<string, HTMLButtonElement>());

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
    setDeleteTargetId('');
    setDeleteError('');
    void refreshSchedules();
  }, [workspace.id]);

  const schedules = schedulePage?.items || [];
  const deleteTargetSchedule = schedules.find((schedule) => schedule.id === deleteTargetId);
  const summary = schedulePage?.summary || { total: 0, active: 0, paused: 0, approvalGated: 0 };
  const query = urlSearch.get('q') || '';
  const status = urlSearch.get('status') === 'enabled' || urlSearch.get('status') === 'paused'
    ? urlSearch.get('status') as Exclude<ScheduleStatusFilter, 'all'>
    : 'all';
  const workflowFilter = urlSearch.get('workflow') || 'all';
  const normalizedQuery = query.trim().toLowerCase();
  const visibleSchedules = useMemo(() => schedules.filter((schedule) => {
    if (status !== 'all' && schedule.status !== status) return false;
    if (workflowFilter !== 'all' && schedule.workflowId !== workflowFilter) return false;
    if (!normalizedQuery) return true;
    return [
      schedule.name,
      scheduleWorkflowName(workflows, schedule.workflowId),
      schedule.cron,
      schedule.timezone
    ].some((value) => value.toLowerCase().includes(normalizedQuery));
  }), [normalizedQuery, schedules, status, workflowFilter, workflows]);
  const hasActiveFilters = Boolean(normalizedQuery || status !== 'all' || workflowFilter !== 'all');
  const clearFilters = () => {
    updateUrlSearch(
      { q: null, status: null, workflow: null },
      { replace: true }
    );
    window.requestAnimationFrame(() => document.getElementById('workflow-triggers-search')?.focus());
  };
  const schedulesBusy = schedulePhase === 'loading' || schedulePhase === 'refreshing';
  const openDeleteDialog = (schedule: WorkflowSchedule) => {
    setDeleteError('');
    setDeleteTargetId(schedule.id);
  };
  const activeWorkflows = useMemo(() => workflows.filter((workflow) => workflow.status !== 'paused'), [workflows]);
  const workflowOptions = useMemo<Array<SelectOption<string>>>(
    () => workflows.map((workflow) => ({ value: workflow.id, label: workflow.name })),
    [workflows]
  );

  const openCreateDrawer = (workflowId?: string) => {
    const selectedWorkflowId = workflowId || activeWorkflows[0]?.id || workflows[0]?.id || '';
    const selectedWorkflow = workflows.find((candidate) => candidate.id === selectedWorkflowId);
    setDraft({ ...createEmptyDraft(), workflowId: selectedWorkflowId, inputs: {}, runsAsUserId: currentUser?.id || '' });
    setDraftError('');
    setCapabilityPreview(null);
    setCapabilityPreviewError('');
    setDrawerOpen(true);
  };

  useEffect(() => {
    const createIntent = createWorkflowId
      ? `workflow:${createWorkflowId}`
      : createTriggerType === 'schedule'
        ? 'schedule'
        : '';
    if (
      !createIntent
      || consumedCreateIntentRef.current === createIntent
      || schedulePhase !== 'ready'
      || !currentUser
    ) return;
    consumedCreateIntentRef.current = createIntent;
    openCreateDrawer(createWorkflowId);
  }, [createTriggerType, createWorkflowId, currentUser?.id, schedulePhase]);

  const openEditDrawer = (schedule: WorkflowSchedule) => {
    setDraft(scheduleToDraft(schedule));
    setDraftError('');
    setCapabilityPreview(null);
    setCapabilityPreviewError('');
    setDrawerOpen(true);
  };

  const openMcpRepairDrawer = (schedule: WorkflowSchedule) => {
    setDraft({ ...scheduleToDraft(schedule), enabled: true });
    setDraftError('');
    setCapabilityPreview(null);
    setCapabilityPreviewError('');
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (savingSchedule) return;
    setDrawerOpen(false);
    setDraftError('');
    setCredentialRequirement(null);
  };

  const draftOwnerIsCurrentUser = Boolean(currentUser?.id && currentUser.id === draft.runsAsUserId);

  useEffect(() => {
    if (!drawerOpen || !draft.workflowId || !draftOwnerIsCurrentUser) {
      setCapabilityPreview(null);
      setCapabilityPreviewError('');
      setCapabilityPreviewing(false);
      return;
    }
    const requestId = capabilityPreviewRequestRef.current + 1;
    capabilityPreviewRequestRef.current = requestId;
    setCapabilityPreviewing(true);
    const timer = window.setTimeout(() => {
      previewWorkflowCapabilities(workspace.id, draft.workflowId, {
        approvedContextGrants: approvedContextGrants(draft.approvedContextGrants),
        inputs: draft.inputs
      }).then((preview) => {
        if (capabilityPreviewRequestRef.current !== requestId) return;
        setCapabilityPreview(preview);
        setCapabilityPreviewError('');
      }).catch((cause) => {
        if (capabilityPreviewRequestRef.current !== requestId) return;
        setCapabilityPreview(null);
        setCapabilityPreviewError(cause instanceof Error ? cause.message : t('agentsWorkflows.schedule.previewUnavailable'));
      }).finally(() => {
        if (capabilityPreviewRequestRef.current === requestId) setCapabilityPreviewing(false);
      });
    }, 350);
    return () => {
      window.clearTimeout(timer);
      if (capabilityPreviewRequestRef.current === requestId) capabilityPreviewRequestRef.current += 1;
    };
  }, [capabilityPreviewRevision, draft.approvedContextGrants, draft.inputs, draft.workflowId, draftOwnerIsCurrentUser, drawerOpen, t, workspace.id]);

  const draftCapabilityReady = !draft.enabled
    || !draftOwnerIsCurrentUser
    || (capabilityPreview?.status === 'ready' && !capabilityPreviewError);

  const saveDraft = async () => {
    if (!canManageSchedules || savingSchedule) return;
    setDraftError('');
    setSavingSchedule(true);
    try {
      const contextGrants = approvedContextGrants(draft.approvedContextGrants);
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
          approvedContextGrants: contextGrants,
          inputs: draft.inputs
        });
      } else {
        await createWorkflowSchedule(workspace.id, {
          workflowId: draft.workflowId,
          name: draft.name.trim(),
          cron: draft.cron.trim(),
          timezone: draft.timezone.trim(),
          enabled: draft.enabled,
          approvedContextGrants: contextGrants,
          inputs: draft.inputs,
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

  const deleteSchedule = async (schedule: WorkflowSchedule): Promise<boolean> => {
    if (!canManageSchedules || deletingScheduleId) return false;
    setDeleteError('');
    setDeletingScheduleId(schedule.id);
    try {
      await deleteWorkflowSchedule(workspace.id, schedule.id);
      await refreshSchedules();
      return true;
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('schedules.form.deleteError'));
      return false;
    } finally {
      setDeletingScheduleId('');
    }
  };
  const scheduleLoadingState = (
    <InlineLoadingIndicator label={t('common.loading')} className="w-full justify-center py-10" />
  );
  const scheduleEmptyState = (
    <EmptyState
      embedded
      icon={hasActiveFilters ? <ICONS.Search /> : <ICONS.Clock />}
      title={hasActiveFilters ? t('schedules.filters.emptyTitle') : t('schedules.emptyTitle')}
      description={hasActiveFilters ? t('schedules.filters.emptyDescription') : t('schedules.emptyBody')}
      actions={hasActiveFilters
        ? <Button variant="secondary" onClick={clearFilters}>{t('common.clearAll')}</Button>
        : undefined}
    />
  );
  const scheduleErrorState = (
    <EmptyState
      embedded
      role="alert"
      icon={<ICONS.AlertTriangle />}
      title={t('schedules.loadError')}
      description={scheduleError}
      actions={<Button variant="secondary" onClick={() => void refreshSchedules()}>{t('common.retry', { defaultValue: 'Retry' })}</Button>}
    />
  );
  const scheduleFeedback = scheduleError
    ? <InlineAlert tone="danger">{scheduleError}</InlineAlert>
    : <InlineLoadingIndicator label={t('common.loading')} />;
  const scheduleAnnouncement = schedulePhase === 'ready'
    ? t('schedules.filters.showing', { count: visibleSchedules.length, total: schedules.length })
    : undefined;

  return (
    <PageShell>
      <WorkflowTriggersPageHeader
        workspace={workspace}
        currentType="schedule"
        createDisabled={!canManageSchedules || !activeWorkflows.length}
        refreshDisabled={schedulesBusy}
        navigate={navigate}
        onCreateCurrent={() => openCreateDrawer()}
        onRefresh={() => void refreshSchedules()}
      />

      <div
        id="workflow-trigger-type-schedule-panel"
        role="tabpanel"
        aria-labelledby="workflow-trigger-type-schedule-tab"
      >
      {!canManageSchedules && (
        <div className="mb-5 rounded-md border border-ui-border bg-ui-surface px-4 py-3 type-ui text-ui-text-muted">
          {t('schedules.permissionNotice')}
        </div>
      )}
      {scheduleError && schedulePhase !== 'error' && <InlineAlert tone="danger" className="mb-5">{scheduleError}</InlineAlert>}

      <DiscoveryFilterBar
        idPrefix="workflow-triggers"
        query={query}
        queryLabel={t('schedules.filters.search')}
        queryPlaceholder={t('schedules.filters.search')}
        queryClearLabel={t('common.clearSearch')}
        resultSummary={hasActiveFilters
          ? t('schedules.filters.showing', { count: visibleSchedules.length, total: schedules.length })
          : t('schedules.filters.summary', {
              count: schedules.length,
              nextRun: formatScheduleDateTime(summary.nextRunAt, t('schedules.nextRunUnavailable'))
            })}
        filters={[
          createDiscoveryFilterGroup<ScheduleStatusFilter>({
            id: 'status',
            label: t('schedules.filters.status'),
            value: status,
            defaultValue: 'all',
            options: [
              { value: 'all', label: t('schedules.filters.allStatuses'), count: summary.total },
              { value: 'enabled', label: t('schedules.status.active'), count: summary.active },
              { value: 'paused', label: t('schedules.status.paused'), count: summary.paused }
            ],
            onChange: (value) => updateUrlSearch({ status: value === 'all' ? null : value })
          }),
          createDiscoveryFilterGroup<string>({
            id: 'workflow',
            label: t('schedules.filters.workflow'),
            value: workflowFilter,
            defaultValue: 'all',
            options: [
              { value: 'all', label: t('schedules.filters.allWorkflows') },
              ...workflows.map((workflow) => ({ value: workflow.id, label: workflow.name }))
            ],
            onChange: (value) => updateUrlSearch({ workflow: value === 'all' ? null : value })
          })
        ]}
        clearAllLabel={t('common.clearAll')}
        onQueryChange={(value) => updateUrlSearch({ q: value || null }, { replace: true })}
        onClearAll={clearFilters}
        className="mb-4"
      />

      <section aria-label={t('schedules.tableLabel')} className="min-w-0 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
        <div className="2xl:hidden">
          <CollectionState
            phase={schedulePhase}
            itemCount={visibleSchedules.length}
            loading={scheduleLoadingState}
            empty={scheduleEmptyState}
            error={scheduleErrorState}
            feedback={<div className="border-t border-ui-border p-4">{scheduleFeedback}</div>}
          >
            <div className="divide-y divide-ui-border">
              {visibleSchedules.map((schedule) => (
                <WorkspaceScheduleMobileCard
                  key={schedule.id}
                  schedule={schedule}
                  workflows={workflows}
                  workspaceId={workspace.id}
                  canManage={canManageSchedules}
                  updating={updatingScheduleId === schedule.id}
                  deleting={deletingScheduleId === schedule.id}
                  actionButtonRefs={scheduleActionButtonRefs}
                  onEdit={() => openEditDrawer(schedule)}
                  onRepair={() => openMcpRepairDrawer(schedule)}
                  onToggle={() => void toggleSchedule(schedule)}
                  onDelete={() => openDeleteDialog(schedule)}
                />
              ))}
            </div>
          </CollectionState>
        </div>
        <div className="hidden overflow-x-auto 2xl:block">
          <DataTable caption={t('schedules.tableLabel')} className="min-w-[58rem] w-full border-collapse text-left">
            <DataTableHeader collectionState={{ phase: schedulePhase, itemCount: visibleSchedules.length }}>
              <DataTableRow>
                <DataTableHeaderCell density="dense" className="whitespace-nowrap">{t('schedules.table.schedule')}</DataTableHeaderCell>
                <DataTableHeaderCell density="dense" className="whitespace-nowrap">{t('schedules.table.workflow')}</DataTableHeaderCell>
                <DataTableHeaderCell density="dense" className="whitespace-nowrap">{t('schedules.table.cadence')}</DataTableHeaderCell>
                <DataTableHeaderCell density="dense" className="whitespace-nowrap">{t('schedules.table.nextRun')}</DataTableHeaderCell>
                <DataTableHeaderCell density="dense" className="whitespace-nowrap">{t('schedules.table.inputsAndAccess')}</DataTableHeaderCell>
                <DataTableHeaderCell density="dense" className="whitespace-nowrap">{t('workflowActivity.activity')}</DataTableHeaderCell>
                <DataTableHeaderCell density="dense" numeric className="whitespace-nowrap">{t('schedules.table.actions')}</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody className="divide-y divide-ui-border">
              {visibleSchedules.length > 0 ? visibleSchedules.map((schedule) => (
                <WorkspaceScheduleTableRow
                  key={schedule.id}
                  schedule={schedule}
                  workflows={workflows}
                  workspaceId={workspace.id}
                  canManage={canManageSchedules}
                  updating={updatingScheduleId === schedule.id}
                  deleting={deletingScheduleId === schedule.id}
                  actionButtonRefs={scheduleActionButtonRefs}
                  onEdit={() => openEditDrawer(schedule)}
                  onRepair={() => openMcpRepairDrawer(schedule)}
                  onToggle={() => void toggleSchedule(schedule)}
                  onDelete={() => openDeleteDialog(schedule)}
                />
              )) : (
                <DataTableRow>
                  <DataTableCell colSpan={7} className="p-0">
                    {schedulePhase === 'loading'
                      ? scheduleLoadingState
                      : schedulePhase === 'error'
                        ? scheduleErrorState
                        : scheduleEmptyState}
                  </DataTableCell>
                </DataTableRow>
              )}
            </DataTableBody>
          </DataTable>
          {visibleSchedules.length > 0
            && (schedulePhase === 'refreshing' || schedulePhase === 'loadingMore' || schedulePhase === 'error')
            && <div className="border-t border-ui-border p-4">{scheduleFeedback}</div>}
        </div>
        {scheduleAnnouncement && (
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {scheduleAnnouncement}
          </div>
        )}
      </section>
      </div>

      <WorkspaceScheduleDeleteDialog
        schedule={deleteTargetSchedule}
        error={deleteError}
        pending={Boolean(deleteTargetSchedule && deletingScheduleId === deleteTargetSchedule.id)}
        onCancel={() => {
          if (deletingScheduleId) return;
          const scheduleId = deleteTargetSchedule?.id;
          setDeleteTargetId('');
          setDeleteError('');
          if (scheduleId) window.requestAnimationFrame(() => scheduleActionButtonRefs.current.get(scheduleId)?.focus({ preventScroll: true }));
        }}
        onConfirm={() => {
          if (!deleteTargetSchedule) return;
          void deleteSchedule(deleteTargetSchedule).then((deleted) => {
            if (deleted) setDeleteTargetId('');
          });
        }}
      />

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
          <Button size="sm" variant="primary" onClick={() => void saveDraft()} disabled={savingSchedule || capabilityPreviewing || !draftCapabilityReady || !draft.workflowId || !draft.name.trim() || !draft.runsAsUserId}>
            {savingSchedule ? t('schedules.form.saving') : t('schedules.form.save')}
          </Button>
        </>}
      >
              {draftError && <div className="rounded-md border border-status-danger/30 bg-status-danger/10 px-3 py-2 type-body type-emphasis text-status-danger-text">{draftError}</div>}
              <label className="block type-body type-emphasis text-ui-text">
                {t('schedules.form.workflow')}
                <Select<string>
                  value={draft.workflowId}
                  options={workflowOptions}
                  onChange={(workflowId) => setDraft((current) => ({ ...current, workflowId, inputs: {} }))}
                  className="mt-2"
                  ariaLabel={t('schedules.form.workflow')}
                />
              </label>
              <label className="block type-body type-emphasis text-ui-text">
                {t('schedules.form.name')}
                <TextInput value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className={scheduleFormInputClassName} />
              </label>
              <div className="block type-body type-emphasis text-ui-text">
                {t('schedules.form.runsAs')}
                <div className="mt-2 min-h-11 rounded-md border border-ui-border bg-ui-bg px-3 py-2.5 type-body text-ui-text">
                  {currentUser?.id === draft.runsAsUserId ? currentUser.label : draft.runsAsUserId}
                </div>
                <span className="type-caption mt-1 block text-ui-text-muted">{t('schedules.form.runsAsHelp')}</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block type-body type-emphasis text-ui-text">
                  {t('schedules.form.cron')}
                  <TextInput value={draft.cron} onChange={(event) => setDraft((current) => ({ ...current, cron: event.target.value }))} className={scheduleFormInputClassName} />
                  <span className="type-caption mt-1 block type-body text-ui-text-muted">{t('schedules.form.cronHelp')}</span>
                </label>
                <label className="block type-body type-emphasis text-ui-text">
                  {t('schedules.form.timezone')}
                  <TextInput value={draft.timezone} onChange={(event) => setDraft((current) => ({ ...current, timezone: event.target.value }))} className={scheduleFormInputClassName} />
                </label>
              </div>
              <label className="flex items-center gap-3 type-body type-emphasis text-ui-text">
                <Checkbox checked={draft.enabled} onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))} />
                {t('schedules.form.enabled')}
              </label>
              <label className="block type-body type-emphasis text-ui-text">
                {t('schedules.form.approvedContextGrants')}
                <Textarea value={draft.approvedContextGrants} onChange={(event) => setDraft((current) => ({ ...current, approvedContextGrants: event.target.value }))} className={scheduleFormTextareaClassName} />
                <span className="type-caption mt-1 block type-body text-ui-text-muted">{t('schedules.form.approvedContextGrantsHelp')}</span>
              </label>
              {workflows.find((workflow) => workflow.id === draft.workflowId) ? (
                <section className="grid gap-3">
                  <div>
                    <h3 className="type-row-title text-ui-text">{t('schedules.form.workflowInputs')}</h3>
                    <p className="type-caption mt-1 text-ui-text-muted">{t('schedules.form.workflowInputsHelp')}</p>
                  </div>
                  <WorkflowParameterFields
                    workflow={workflows.find((workflow) => workflow.id === draft.workflowId)!}
                    values={draft.inputs}
                    onChange={(inputs) => setDraft((current) => ({ ...current, inputs }))}
                  />
                </section>
              ) : null}
              {draftOwnerIsCurrentUser ? (
                <section aria-labelledby="schedule-credential-readiness" className="rounded-md border border-ui-border bg-ui-bg px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 id="schedule-credential-readiness" className="type-row-title">{t(capabilityPreview?.mcpRequirements.length ? 'agentsWorkflows.schedule.credentialReadiness' : 'agentsWorkflows.schedule.capabilityReadiness')}</h3>
                      <p className="type-caption mt-1 text-ui-text-muted">{capabilityPreview?.mcpRequirements.length
                        ? t('agentsWorkflows.schedule.credentialReadinessHelp', { owner: currentUser?.label || t('agentsWorkflows.schedule.scheduleOwner') })
                        : t('agentsWorkflows.schedule.capabilityReadinessHelp')}</p>
                    </div>
                    {capabilityPreviewError && <Button type="button" size="sm" variant="secondary" onClick={() => setCapabilityPreviewRevision((value) => value + 1)}>{t('common.retry')}</Button>}
                  </div>
                  {capabilityPreviewing ? (
                    <InlineLoadingIndicator label={t('agentsWorkflows.schedule.previewing')} className="mt-3" />
                  ) : capabilityPreviewError ? (
                    <p role="alert" className="type-caption mt-3 text-status-danger-text">{capabilityPreviewError}</p>
                  ) : capabilityPreview?.mcpRequirements.length ? (
                    <dl className="mt-3 border-t border-ui-border pt-1">
                      <WorkflowPreviewAuthRow requirements={capabilityPreview.mcpRequirements} onConnectCredential={setCredentialRequirement} />
                    </dl>
                  ) : capabilityPreview?.status === 'ready' ? (
                    <p role="status" className="type-caption mt-3 type-emphasis text-status-success-text">{t('schedules.form.credentialsReady')}</p>
                  ) : capabilityPreview ? (
                    <p role="alert" className="type-caption mt-3 text-status-warning-text">{workflowCapabilityBlockerMessage(capabilityPreview, t('agentsWorkflows.schedule.capabilityBlocked'))}</p>
                  ) : null}
                </section>
              ) : (
                <InlineAlert tone="warning">{t('schedules.form.otherOwnerCredentialHelp')}</InlineAlert>
              )}
      </DrawerFrame>
      {credentialRequirement && (
        <WorkflowMcpCredentialDialog
          workspaceId={workspace.id}
          requirement={credentialRequirement}
          onClose={() => setCredentialRequirement(null)}
          onConnected={() => setCapabilityPreviewRevision((value) => value + 1)}
        />
      )}
    </PageShell>
  );
};
