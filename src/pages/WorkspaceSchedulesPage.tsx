import React, { useEffect, useMemo, useState } from 'react';
import { hasWorkspacePermission } from '@/app/workspacePermissions';
import { useTranslation } from 'react-i18next';
import { Button } from '@acornops/ui';
import { CollectionState } from '@acornops/ui';
import { DataSurface, DataTableHeader, DataTableHeaderCell, TableLoadingRows } from '@acornops/ui';
import { createDiscoveryFilterGroup, DiscoveryFilterBar } from '@acornops/ui';
import { EmptyState } from '@acornops/ui';
import { InlineAlert } from '@acornops/ui';
import { InlineLoadingIndicator } from '@acornops/ui';
import { CollectionLoadingSkeleton } from '@acornops/ui';
import { PageShell } from '@acornops/ui';
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
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { CursorCollectionPhase } from '@/hooks/resourceLifecycle';
import {
  createEmptyDraft,
  formatScheduleDateTime,
  isValidScheduleCron,
  isValidTimeZone,
  scheduleFrequencyFromCron,
  scheduleToDraft,
  type ScheduleFrequency,
  type ScheduleDraft
} from '@/pages/WorkspaceSchedulesPage.helpers';
import {
  scheduleWorkflowName,
  WorkspaceScheduleMobileCard,
  WorkspaceScheduleTableRow
} from '@/pages/WorkspaceScheduleRows';
import { WorkspaceScheduleDrawerTable } from '@/pages/WorkspaceScheduleDrawerTable';
import { WorkflowTriggerToolbar } from '@/pages/workflows/WorkflowTriggerToolbar';
import { WorkspaceSchedulesPageChrome } from '@/pages/WorkspaceSchedulesPageChrome';
import { WorkspaceScheduleDeleteDialog } from '@/pages/WorkspaceScheduleDeleteDialog';
import { WorkspaceScheduleDialog } from '@/pages/WorkspaceScheduleDialog';
import type { ScheduleDraftField } from '@/pages/WorkspaceScheduleFormFields';
import { WorkflowSections } from '@/pages/workflows/WorkflowSections';
import { updateUrlSearch, useUrlSearchState } from '@/hooks/useUrlSearchState';
import { DataTable, DataTableBody, DataTableRow } from '@acornops/ui';
import { hasSessionDataCacheValue, useSessionCachedState } from '@/hooks/sessionDataCache';

interface WorkspaceSchedulesPageProps {
  workspace: Workspace;
  create?: boolean;
  createWorkflowId?: string;
  constrainedWorkflowId?: string;
  embedded?: boolean;
  navigate?: (path: string) => void;
}
type ScheduleStatusFilter = 'all' | 'enabled' | 'paused';
export const WorkspaceSchedulesPage: React.FC<WorkspaceSchedulesPageProps> = ({
  workspace,
  create,
  createWorkflowId,
  constrainedWorkflowId,
  embedded = false,
  navigate
}) => {
  const { t } = useTranslation();
  const urlSearch = useUrlSearchState();
  const consumedCreateIntentRef = React.useRef('');
  const scheduleCachePrefix = `workspace:${workspace.id}:workflow-schedules:`;
  const schedulePageCacheKey = `${scheduleCachePrefix}page`;
  const [schedulePage, setSchedulePage] = useSessionCachedState<WorkflowScheduleListResponse | null>(schedulePageCacheKey, null);
  const [workflows, setWorkflows] = useSessionCachedState<WorkflowApiDefinition[]>(`${scheduleCachePrefix}workflows`, []);
  const [schedulePhase, setSchedulePhase] = useState<CursorCollectionPhase>(() => hasSessionDataCacheValue(schedulePageCacheKey) ? 'ready' : 'loading');
  const [scheduleError, setScheduleError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState<ScheduleDraft>(() => createEmptyDraft());
  const [draftError, setDraftError] = useState('');
  const [draftFieldErrors, setDraftFieldErrors] = useState<Partial<Record<ScheduleDraftField, string>>>({});
  const [discardConfirmationOpen, setDiscardConfirmationOpen] = useState(false);
  const [scheduleEditorMode, setScheduleEditorMode] = useState<ScheduleFrequency>('weekdays');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [deletingScheduleId, setDeletingScheduleId] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [updatingScheduleId, setUpdatingScheduleId] = useState('');
  const [currentUser, setCurrentUser] = useSessionCachedState<{ id: string; label: string } | null>(`${scheduleCachePrefix}current-user`, null);
  const [capabilityPreview, setCapabilityPreview] = useState<WorkflowCapabilitiesPreview | null>(null);
  const [capabilityPreviewError, setCapabilityPreviewError] = useState('');
  const [capabilityPreviewing, setCapabilityPreviewing] = useState(false);
  const [credentialRequirement, setCredentialRequirement] = useState<WorkflowMcpRequirementPreview | null>(null);
  const [capabilityPreviewRevision, setCapabilityPreviewRevision] = useState(0);
  const capabilityPreviewRequestRef = React.useRef(0);
  const initialDraftRef = React.useRef<ScheduleDraft>(createEmptyDraft());
  const scheduleActionButtonRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const canManageSchedules = hasWorkspacePermission(workspace, 'manage_workflows');
  const draftDirty = drawerOpen && JSON.stringify(draft) !== JSON.stringify(initialDraftRef.current);
  const scheduleFrequency = scheduleEditorMode;
  const setDraftBaseline = (nextDraft: ScheduleDraft) => {
    initialDraftRef.current = nextDraft;
    setScheduleEditorMode(scheduleFrequencyFromCron(nextDraft.cron));
    setDraft(nextDraft);
    setDraftFieldErrors({});
    setDiscardConfirmationOpen(false);
  };
  const refreshSchedules = async (_initial = false) => {
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
    } catch {
      setScheduleError('Schedules could not be loaded. Retry to reconnect to the control plane.');
      setSchedulePhase(schedulePage === null ? 'error' : 'ready');
    }
  };

  useEffect(() => {
    setDeleteTargetId('');
    setDeleteError('');
    void refreshSchedules(true);
  }, [workspace.id]);

  const schedules = schedulePage?.items || [];
  const workflowsById = useMemo(
    () => new Map(workflows.map((workflow) => [workflow.id, workflow])),
    [workflows]
  );
  const deleteTargetSchedule = schedules.find((schedule) => schedule.id === deleteTargetId);
  const summary = schedulePage?.summary || { total: 0, active: 0, paused: 0, approvalGated: 0 };
  const query = embedded ? '' : urlSearch.get('q') || '';
  const status = !embedded && (urlSearch.get('status') === 'enabled' || urlSearch.get('status') === 'paused')
    ? urlSearch.get('status') as Exclude<ScheduleStatusFilter, 'all'>
    : 'all';
  const workflowFilter = constrainedWorkflowId || urlSearch.get('workflow') || 'all';
  const normalizedQuery = query.trim().toLowerCase();
  const visibleSchedules = useMemo(() => schedules.filter((schedule) => {
    if (status !== 'all' && schedule.status !== status) return false;
    if (workflowFilter !== 'all' && schedule.workflowId !== workflowFilter) return false;
    if (!normalizedQuery) return true;
    return [
      schedule.name,
      scheduleWorkflowName(workflowsById, schedule.workflowId),
      schedule.cron,
      schedule.timezone
    ].some((value) => value.toLowerCase().includes(normalizedQuery));
  }), [normalizedQuery, schedules, status, workflowFilter, workflowsById]);
  const hasActiveFilters = Boolean(
    normalizedQuery
    || status !== 'all'
    || (!constrainedWorkflowId && workflowFilter !== 'all')
  );
  const clearFilters = () => {
    updateUrlSearch(
      { q: null, status: null, workflow: null },
      { replace: true }
    );
    window.requestAnimationFrame(() => document.getElementById('workflow-triggers-search')?.focus());
  };
  const schedulesBusy = schedulePhase === 'loading' || schedulePhase === 'refreshing';
  const schedulesPending = schedulePhase === 'loading';
  const openDeleteDialog = (schedule: WorkflowSchedule) => {
    setDeleteError('');
    setDeleteTargetId(schedule.id);
  };
  const activeWorkflows = useMemo(() => workflows.filter((workflow) => workflow.status !== 'paused'), [workflows]);

  const openCreateDrawer = (workflowId?: string) => {
    const selectedWorkflowId = workflowId || activeWorkflows[0]?.id || workflows[0]?.id || '';
    const selectedWorkflow = workflows.find((candidate) => candidate.id === selectedWorkflowId);
    setDraftBaseline({
      ...createEmptyDraft(),
      workflowId: selectedWorkflowId,
      name: selectedWorkflow ? `${selectedWorkflow.name} schedule` : '',
      runsAsUserId: currentUser?.id || ''
    });
    setDraftError('');
    setCapabilityPreview(null);
    setCapabilityPreviewError('');
    setDrawerOpen(true);
  };

  useEffect(() => {
    const createIntent = createWorkflowId
      ? `workflow:${createWorkflowId}`
      : create
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
  }, [create, createWorkflowId, currentUser?.id, schedulePhase]);

  const openEditDrawer = (schedule: WorkflowSchedule) => {
    setDraftBaseline(scheduleToDraft(schedule));
    setDraftError('');
    setCapabilityPreview(null);
    setCapabilityPreviewError('');
    setDrawerOpen(true);
  };

  const openMcpRepairDrawer = (schedule: WorkflowSchedule) => {
    setDraftBaseline({ ...scheduleToDraft(schedule), enabled: true });
    setDraftError('');
    setCapabilityPreview(null);
    setCapabilityPreviewError('');
    setDrawerOpen(true);
  };

  const forceCloseDrawer = () => {
    if (savingSchedule) return;
    setDrawerOpen(false);
    setDraftError('');
    setDraftFieldErrors({});
    setDiscardConfirmationOpen(false);
    setCredentialRequirement(null);
  };
  const closeDrawer = () => {
    if (savingSchedule) return;
    if (draftDirty) {
      setDiscardConfirmationOpen(true);
      return;
    }
    forceCloseDrawer();
  };

  useEffect(() => {
    if (!draftDirty) return undefined;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [draftDirty]);

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
      previewWorkflowCapabilities(workspace.id, draft.workflowId).then((preview) => {
        if (capabilityPreviewRequestRef.current !== requestId) return;
        setCapabilityPreview(preview);
        setCapabilityPreviewError('');
      }).catch(() => {
        if (capabilityPreviewRequestRef.current !== requestId) return;
        setCapabilityPreview(null);
        setCapabilityPreviewError('Schedule readiness could not be checked. Retry before saving this schedule.');
      }).finally(() => {
        if (capabilityPreviewRequestRef.current === requestId) setCapabilityPreviewing(false);
      });
    }, 350);
    return () => {
      window.clearTimeout(timer);
      if (capabilityPreviewRequestRef.current === requestId) capabilityPreviewRequestRef.current += 1;
    };
  }, [capabilityPreviewRevision, draft.workflowId, draftOwnerIsCurrentUser, drawerOpen, t, workspace.id]);

  const draftCapabilityReady = !draft.enabled
    || !draftOwnerIsCurrentUser
    || (capabilityPreview?.status === 'ready' && !capabilityPreviewError);

  const saveDraft = async () => {
    if (!canManageSchedules || savingSchedule) return;
    setDraftError('');
    const nextFieldErrors: Partial<Record<ScheduleDraftField, string>> = {};
    if (!draft.workflowId) nextFieldErrors.workflowId = t('schedules.form.workflowRequired');
    if (!draft.name.trim()) nextFieldErrors.name = t('schedules.form.nameRequired');
    if (!draft.runsAsUserId) nextFieldErrors.runsAsUserId = t('schedules.form.ownerRequired');
    if (!isValidScheduleCron(draft.cron)) nextFieldErrors.cron = t('schedules.form.cronInvalid');
    if (!isValidTimeZone(draft.timezone)) nextFieldErrors.timezone = t('schedules.form.timezoneInvalid');
    setDraftFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      setDraftError(t('schedules.form.reviewFields'));
      return;
    }
    setSavingSchedule(true);
    try {
      if (draft.id) {
        await updateWorkflowSchedule(workspace.id, draft.id, {
          workflowId: draft.workflowId,
          name: draft.name.trim(),
          cron: draft.cron.trim(),
          timezone: draft.timezone.trim(),
          enabled: draft.enabled
        });
      } else {
        await createWorkflowSchedule(workspace.id, {
          workflowId: draft.workflowId,
          name: draft.name.trim(),
          cron: draft.cron.trim(),
          timezone: draft.timezone.trim(),
          enabled: draft.enabled,
          principal: { type: 'user', id: currentUser?.id || draft.runsAsUserId }
        });
      }
      setDrawerOpen(false);
      initialDraftRef.current = draft;
      await refreshSchedules();
    } catch {
      setDraftError('Schedule could not be saved. Your changes are still here. Review the highlighted fields or try again.');
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
    } catch {
      setScheduleError('The schedule status could not be changed. Refresh the list and try again.');
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
    } catch {
      setDeleteError('The schedule could not be deleted. It remains unchanged; try again.');
      return false;
    } finally {
      setDeletingScheduleId('');
    }
  };
  const scheduleLoadingState = (
    <CollectionLoadingSkeleton label={t('schedules.loading')} />
  );
  const scheduleEmptyState = (
    <EmptyState
      embedded
      icon={<ICONS.CalendarClock />}
      title={hasActiveFilters ? t('schedules.filters.emptyTitle') : t('schedules.emptyTitle')}
      description={hasActiveFilters ? t('schedules.filters.emptyDescription') : t('schedules.emptyBody')}
      actions={hasActiveFilters
        ? <Button variant="secondary" size="sm" onClick={clearFilters}>{t('common.clearAll')}</Button>
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
      actions={<Button variant="secondary" size="sm" onClick={() => void refreshSchedules()}>{t('common.retry', { defaultValue: 'Retry' })}</Button>}
    />
  );
  const scheduleFeedback = scheduleError
    ? <InlineAlert tone="danger">{scheduleError}</InlineAlert>
    : <InlineLoadingIndicator label={t('common.loading')} />;
  const scheduleAnnouncement = schedulePhase === 'ready'
    ? t('schedules.filters.showing', { count: visibleSchedules.length, total: schedules.length })
    : undefined;

  return (
    <PageShell embedded={embedded} className={embedded ? 'px-1 py-1' : undefined}>
      <WorkspaceSchedulesPageChrome
        busy={schedulesBusy} canCreate={canManageSchedules && activeWorkflows.length > 0}
        canManage={canManageSchedules} embedded={embedded}
        error={scheduleError} showError={schedulePhase !== 'error'}
        workspaceName={workspace.name}
        onRefresh={() => void refreshSchedules()} onCreate={() => openCreateDrawer()}
        drawerToolbar={<WorkflowTriggerToolbar
          busy={schedulesBusy} canCreate={canManageSchedules && activeWorkflows.length > 0}
          createLabel={t('schedules.actions.create')}
          refreshLabel={t('common.refresh')}
          summary={schedulesPending ? t('schedules.loading') : t('schedules.count', { count: visibleSchedules.length })}
          onRefresh={() => void refreshSchedules()} onCreate={() => openCreateDrawer(constrainedWorkflowId)}
        />}
      />

      {!embedded && navigate && (
        <WorkflowSections activeSection="schedules" navigate={navigate} workspaceId={workspace.id} />
      )}

      <div
        id={!embedded ? 'workflow-section-schedules-panel' : undefined}
        role={!embedded ? 'tabpanel' : undefined}
        aria-labelledby={!embedded ? 'workflow-section-schedules-tab' : undefined}
        className="contents"
      >

      {!embedded && <DiscoveryFilterBar
        idPrefix="workflow-triggers"
        query={query}
        queryLabel={t('schedules.filters.search')}
        queryPlaceholder={t('schedules.filters.search')}
        queryClearLabel={t('common.clearSearch')}
        resultSummary={schedulesPending
          ? t('schedules.loading')
          : hasActiveFilters
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
              { value: 'all', label: t('schedules.filters.allStatuses'), count: schedulesPending ? undefined : summary.total },
              { value: 'enabled', label: t('schedules.status.active'), count: schedulesPending ? undefined : summary.active },
              { value: 'paused', label: t('schedules.status.paused'), count: schedulesPending ? undefined : summary.paused }
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
      />}

      <DataSurface aria-label={t('schedules.tableLabel')}>
        {embedded ? (
          <WorkspaceScheduleDrawerTable
            actionButtonRefs={scheduleActionButtonRefs}
            canManage={canManageSchedules}
            deletingId={deletingScheduleId}
            empty={scheduleEmptyState}
            error={scheduleErrorState}
            loading={scheduleLoadingState}
            onDelete={openDeleteDialog}
            onEdit={openEditDrawer}
            onRepair={openMcpRepairDrawer}
            onToggle={(schedule) => void toggleSchedule(schedule)}
            phase={schedulePhase}
            schedules={visibleSchedules}
            updatingId={updatingScheduleId}
            workflows={workflowsById}
            workspaceId={workspace.id}
          />
        ) : (
          <>
        <div className="xl:hidden">
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
                  workflows={workflowsById}
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
        <div className="hidden overflow-x-auto xl:block">
          {visibleSchedules.length === 0 && schedulePhase !== 'loading' ? (
            schedulePhase === 'error' ? scheduleErrorState : scheduleEmptyState
          ) : (
            <DataTable caption={t('schedules.tableLabel')} className="min-w-[58rem] w-full border-collapse text-left">
              <DataTableHeader collectionState={{ phase: schedulePhase, itemCount: visibleSchedules.length, showDuringInitialLoading: true }}>
                <DataTableRow>
                  <DataTableHeaderCell density="dense" className="whitespace-nowrap">{t('schedules.table.schedule')}</DataTableHeaderCell>
                  <DataTableHeaderCell density="dense" className="whitespace-nowrap">{t('schedules.table.workflow')}</DataTableHeaderCell>
                  <DataTableHeaderCell density="dense" className="whitespace-nowrap">{t('schedules.table.cadence')}</DataTableHeaderCell>
                  <DataTableHeaderCell density="dense" className="whitespace-nowrap">{t('schedules.table.nextRun')}</DataTableHeaderCell>
                  <DataTableHeaderCell density="dense" className="whitespace-nowrap">{t('schedules.table.access')}</DataTableHeaderCell>
                  <DataTableHeaderCell density="dense" className="whitespace-nowrap">{t('workflowActivity.activity')}</DataTableHeaderCell>
                  <DataTableHeaderCell density="dense" numeric className="whitespace-nowrap">{t('schedules.table.actions')}</DataTableHeaderCell>
                </DataTableRow>
              </DataTableHeader>
              <DataTableBody className="divide-y divide-ui-border">
                {visibleSchedules.length > 0 ? visibleSchedules.map((schedule) => (
                  <WorkspaceScheduleTableRow
                    key={schedule.id}
                    schedule={schedule}
                    workflows={workflowsById}
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
                  <TableLoadingRows columns={7} label={t('schedules.loading')} cellClassName="px-4 py-4" />
                )}
              </DataTableBody>
            </DataTable>
          )}
          {visibleSchedules.length > 0
            && (schedulePhase === 'refreshing' || schedulePhase === 'loadingMore' || schedulePhase === 'error')
            && <div className="border-t border-ui-border p-4">{scheduleFeedback}</div>}
        </div>
          </>
        )}
        {scheduleAnnouncement && (
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {scheduleAnnouncement}
          </div>
        )}
      </DataSurface>

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

      <WorkspaceScheduleDialog
        open={drawerOpen}
        draft={draft}
        draftError={draftError}
        draftFieldErrors={draftFieldErrors}
        discardConfirmationOpen={discardConfirmationOpen}
        saving={savingSchedule}
        workflows={workflows}
        currentUser={currentUser}
        draftOwnerIsCurrentUser={draftOwnerIsCurrentUser}
        scheduleFrequency={scheduleFrequency}
        capabilityPreview={capabilityPreview}
        capabilityPreviewError={capabilityPreviewError}
        capabilityPreviewing={capabilityPreviewing}
        draftCapabilityReady={draftCapabilityReady}
        credentialRequirement={credentialRequirement}
        workspaceId={workspace.id}
        setDraft={setDraft}
        setDraftFieldErrors={setDraftFieldErrors}
        setScheduleFrequency={setScheduleEditorMode}
        setCredentialRequirement={setCredentialRequirement}
        onClose={closeDrawer}
        onDiscardCancel={() => setDiscardConfirmationOpen(false)}
        onDiscardConfirm={forceCloseDrawer}
        onSave={() => void saveDraft()}
        onRetryCapabilityPreview={() => setCapabilityPreviewRevision((value) => value + 1)}
        onCredentialConnected={() => setCapabilityPreviewRevision((value) => value + 1)}
      />
      </div>
    </PageShell>
  );
};
