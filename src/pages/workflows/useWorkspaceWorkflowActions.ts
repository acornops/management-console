import { getOptimisticWorkflowRunStatus, type WorkflowDefinition } from '@/pages/workflows/workflowModel';
import {
  cancelWorkflowRun,
  createWorkflow,
  createWorkflowSession,
  listWorkflowRunApprovals,
  deleteWorkflow,
  listWorkflowRunEvents,
  postWorkflowSessionMessage,
  updateWorkflow
} from '@/services/control-plane/workflowApi';
import {
  agentIdsFromDraft,
  createAgentSelectionDraft,
  buildWorkflowCreateInput,
  createWorkflowDraft,
  createWorkflowEditDraft,
  mapApiWorkflowToDefinition,
  uniqueValues,
  type WorkflowEditDraft
} from './workflowPageHelpers';
import { resolveMcpReadinessRecovery } from '@/services/control-plane/mcpReadinessRecovery';
import { isServerWorkflowRunId } from './workflowRunIdentity';
import { useTranslation } from 'react-i18next';

type WorkflowActionsContext = Record<string, any>;

export function useWorkspaceWorkflowActions(ctx: WorkflowActionsContext) {
  const { t } = useTranslation();
  const {
    workspace, workflows, setWorkflows,
    selectedWorkflow, selectedWorkflowEditDraft,
    setLaunchDrawerWorkflowId,
    setLaunchError, setLaunchRecovery, setLaunchingWorkflowId, setActiveView, setApprovalRecords, setApprovalError,
    setPendingWorkflowRuns, expandedRunLogId, setExpandedRunLogId, runEventsByRunId, setRunEventsByRunId,
    setRunLogError, setCancelRunError, setCancelRunAction,
    setNewWorkflowTag,
    newWorkflowTag, setWorkflowEditDrafts, setWorkflowUpdateError, setWorkflowUpdateResult, setDeleteWorkflowError,
    workflowUndoCheckpoint, setWorkflowUndoCheckpoint,
    setDeleteWorkflowId, setUpdatingWorkflowId, selectResultingWorkflow, setDeletingWorkflowId,
    createDraft, setCreateDraft, setCreatePanelOpen, setCreateError, setCreatingWorkflow,
    canManageWorkflows, workflowOptionsReady, launchBlocker, workflowOptions, agentSelectionDrafts, setAgentSelectionDrafts,
    setEditingAgentSelectionId, setAgentSelectionError, setSavingAgentSelectionId,
    ownerLabelsByUserId: providedOwnerLabelsByUserId, workflowAgents
  } = ctx;
  const ownerLabelEntries: Array<[string, string]> = (workspace.members || [])
    .filter((member: { userId?: string }) => member.userId)
    .map((member: { userId: string; name?: string; email?: string }) => [member.userId, member.name || member.email || member.userId]);
  const ownerLabelsByUserId = providedOwnerLabelsByUserId instanceof Map
    ? providedOwnerLabelsByUserId
    : new Map<string, string>(ownerLabelEntries);
  function closeCreateWorkflowPanel(): void {
    setCreatePanelOpen(false);
    setCreateError('');
  }

  async function launchSelectedWorkflow(): Promise<void> {
    if (!selectedWorkflow) return;
    setLaunchError('');
    setLaunchRecovery(null);
    if (launchBlocker) {
      setLaunchError(launchBlocker);
      return;
    }
    const optimisticRunId = `local-workflow-run-${Date.now()}`;
    const optimisticRun: WorkflowDefinition['runs'][number] = {
      id: optimisticRunId,
      status: getOptimisticWorkflowRunStatus(selectedWorkflow),
      actor: t('workflowUi.you'),
      duration: t('workflowUi.starting'),
      approvals: selectedWorkflow.policy.approvals.length,
      output: t('workflowUi.startingRun'),
      startedAt: t('workflowUi.justNow')
    };
    setActiveView('runs');
    setPendingWorkflowRuns((current: Record<string, WorkflowDefinition['runs']>) => ({
      ...current,
      [selectedWorkflow.id]: [
        optimisticRun,
        ...(current[selectedWorkflow.id] || []).filter((run) => run.id !== optimisticRun.id)
      ]
    }));
    setWorkflows((current) => current.map((workflow) => workflow.id === selectedWorkflow.id
      ? {
          ...workflow,
          lastRun: t('workflowUi.justNow'),
          runs: [
            optimisticRun,
            ...workflow.runs
          ]
        }
      : workflow));
    setLaunchingWorkflowId(selectedWorkflow.id);
    try {
      const sessionResponse = await createWorkflowSession(workspace.id, selectedWorkflow.id);
      const effectiveSessionId = sessionResponse.session.id;
      const result = await postWorkflowSessionMessage(effectiveSessionId, {
        kind: 'launch'
      });
      if (!result.run_id) {
        throw new Error(t('workflowUi.missingRunId'));
      }
      const runId = result.run_id;
      setLaunchDrawerWorkflowId('');
      const confirmedRun: WorkflowDefinition['runs'][number] = {
        ...optimisticRun,
        id: runId,
        runId,
        status: getOptimisticWorkflowRunStatus(selectedWorkflow),
        duration: t('workflowActivity.status.queued'),
        output: t('workflowUi.dispatched')
      };
      setPendingWorkflowRuns((current: Record<string, WorkflowDefinition['runs']>) => ({
        ...current,
        [selectedWorkflow.id]: [
          confirmedRun,
          ...(current[selectedWorkflow.id] || []).filter((run) => run.id !== optimisticRunId && run.runId !== optimisticRunId && run.id !== confirmedRun.id && run.runId !== confirmedRun.runId)
        ]
      }));
      setWorkflows((current) => current.map((workflow) => workflow.id === selectedWorkflow.id
        ? {
            ...workflow,
            lastRun: t('workflowUi.justNow'),
            runs: workflow.runs.map((run) => run.id === optimisticRunId || run.runId === optimisticRunId ? confirmedRun : run)
          }
        : workflow));
    } catch (error) {
      const recoveryAgentId = selectedWorkflow.agentIds[0];
      const recovery = recoveryAgentId
        ? resolveMcpReadinessRecovery(error, { workspaceId: workspace.id, scopeType: 'agent', agentId: recoveryAgentId })
        : null;
      const message = recovery?.message || t('workflowUi.launchFailed');
      setLaunchRecovery(recovery);
      const failedRun: WorkflowDefinition['runs'][number] = {
        ...optimisticRun,
        status: 'failed',
        duration: t('workflowActivity.dispatch.failed'),
        output: message
      };
      setLaunchError(message);
      setPendingWorkflowRuns((current: Record<string, WorkflowDefinition['runs']>) => ({
        ...current,
        [selectedWorkflow.id]: [
          failedRun,
          ...(current[selectedWorkflow.id] || []).filter((run) => run.id !== optimisticRunId && run.runId !== optimisticRunId)
        ]
      }));
      setWorkflows((current) => current.map((workflow) => workflow.id === selectedWorkflow.id
        ? {
            ...workflow,
            runs: workflow.runs.map((run) => run.id === optimisticRunId || run.runId === optimisticRunId ? failedRun : run)
          }
        : workflow));
    } finally {
      setLaunchingWorkflowId('');
    }
  }

  async function refreshApprovalRecords(runId: string): Promise<void> {
    if (!isServerWorkflowRunId(runId)) return;
    setApprovalError('');
    try {
      const approvals = await listWorkflowRunApprovals(runId);
      setApprovalRecords((current) => ({
        ...current,
        [runId]: approvals
      }));
    } catch {
      setApprovalError(t('approvals.review.refreshError'));
    }
  }

  async function toggleRunLogs(runId: string): Promise<void> {
    if (!isServerWorkflowRunId(runId)) return;
    if (expandedRunLogId === runId) {
      setExpandedRunLogId('');
      return;
    }
    setExpandedRunLogId(runId);
    setRunLogError('');
    if (runEventsByRunId[runId]) return;
    try {
      const events = await listWorkflowRunEvents(runId);
      setRunEventsByRunId((current) => ({ ...current, [runId]: events }));
    } catch {
      setRunLogError(t('workflowUi.runLoadFailed'));
    }
  }

  async function stopWorkflowRun(runId: string): Promise<void> {
    if (!isServerWorkflowRunId(runId)) return;
    setCancelRunError('');
    setCancelRunAction(runId);
    try {
      await cancelWorkflowRun(runId);
      setWorkflows((current) => current.map((workflow) => ({
        ...workflow,
        runs: workflow.runs.map((run) => run.runId === runId || run.id === runId
          ? { ...run, status: 'cancelling', output: t('workflowUi.cancellationRequested') }
          : run)
      })));
      setRunEventsByRunId((current) => ({
        ...current,
        [runId]: [
          ...(current[runId] || []),
          {
            schema_version: 1,
            run_id: runId,
            seq: (current[runId]?.length || 0) + 1,
            ts: new Date().toISOString(),
            type: 'run_cancel_requested',
            payload: { source: 'management_console' }
          }
        ]
      }));
    } catch {
      setCancelRunError(t('workflowUi.stopFailed'));
    } finally {
      setCancelRunAction('');
    }
  }

  async function persistWorkflowTags(workflow: WorkflowDefinition, tags: string[]): Promise<boolean> {
    setWorkflowUpdateError('');
    setWorkflowUpdateResult('');
    if (!canManageWorkflows) {
      setWorkflowUpdateError(t('workflowUi.tagsPermission'));
      return false;
    }
    setUpdatingWorkflowId(workflow.id);
    setWorkflowUndoCheckpoint(workflow);
    try {
      const updated = await updateWorkflow(workspace.id, workflow.id, {
        agentIds: workflow.agentIds,
        tags
      });
      const mapped = mapApiWorkflowToDefinition(updated, workflow, workspace.id, workflowOptions, ownerLabelsByUserId, workflowAgents);
      setWorkflows((current) => current.map((item) => item.id === workflow.id
        ? { ...mapped, runs: item.runs, lastRun: item.lastRun }
        : item));
      setWorkflowEditDrafts((current) => ({ ...current, [workflow.id]: createWorkflowEditDraft(mapped) }));
      setWorkflowUpdateResult(t('workflowUi.tagsUpdated'));
      return true;
    } catch {
      setWorkflowUpdateError(t('workflowUi.tagsFailed'));
      return false;
    } finally {
      setUpdatingWorkflowId('');
    }
  }

  async function addWorkflowTag(workflowId: string): Promise<void> {
    const workflow = workflows.find((item: WorkflowDefinition) => item.id === workflowId);
    if (!workflow) return;
    const tag = newWorkflowTag.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!tag) return;
    if (await persistWorkflowTags(workflow, uniqueValues([...workflow.tags, tag]))) {
      setNewWorkflowTag('');
    }
  }

  async function removeWorkflowTag(workflowId: string, tag: string): Promise<void> {
    const workflow = workflows.find((item: WorkflowDefinition) => item.id === workflowId);
    if (!workflow) return;
    await persistWorkflowTags(workflow, workflow.tags.filter((value) => value !== tag));
  }

  function startEditingWorkflow(workflow: WorkflowDefinition): void {
    setWorkflowEditDrafts((current) => ({ ...current, [workflow.id]: createWorkflowEditDraft(workflow) }));
    setWorkflowUpdateError('');
    setWorkflowUpdateResult('');
    setDeleteWorkflowError('');
    setDeleteWorkflowId('');
  }

  function cancelEditingWorkflow(workflow: WorkflowDefinition): void {
    setWorkflowEditDrafts((current) => ({ ...current, [workflow.id]: createWorkflowEditDraft(workflow) }));
    setWorkflowUpdateError('');
  }

  function updateWorkflowEditDraft(workflowId: string, update: Partial<WorkflowEditDraft>): void {
    setWorkflowUpdateResult('');
    setWorkflowEditDrafts((current) => {
      const workflow = workflows.find((item) => item.id === workflowId);
      const currentDraft = current[workflowId] || (workflow ? createWorkflowEditDraft(workflow) : undefined);
      if (!currentDraft) return current;
      return { ...current, [workflowId]: { ...currentDraft, ...update } };
    });
  }

  function startEditingAgentSelection(workflow: WorkflowDefinition): void {
    setAgentSelectionDrafts((current) => ({ ...current, [workflow.id]: current[workflow.id] || createAgentSelectionDraft(workflow) }));
    setAgentSelectionError('');
    setEditingAgentSelectionId(workflow.id);
  }

  function cancelEditingAgentSelection(workflow: WorkflowDefinition): void {
    setAgentSelectionDrafts((current) => ({ ...current, [workflow.id]: createAgentSelectionDraft(workflow) }));
    setAgentSelectionError('');
    setEditingAgentSelectionId('');
  }

  function updateAgentSelectionDraft(workflowId: string, update: Partial<ReturnType<typeof createAgentSelectionDraft>>): void {
    setAgentSelectionDrafts((current) => {
      const workflow = workflows.find((item) => item.id === workflowId);
      const currentDraft = current[workflowId] || (workflow ? createAgentSelectionDraft(workflow) : undefined);
      if (!currentDraft) return current;
      return { ...current, [workflowId]: { ...currentDraft, ...update } };
    });
  }

  async function saveAgentSelection(): Promise<void> {
    if (!selectedWorkflow) return;
    const draft = agentSelectionDrafts[selectedWorkflow.id] || createAgentSelectionDraft(selectedWorkflow);
    const selectedAgentIds = agentIdsFromDraft(draft);
    setAgentSelectionError('');
    setWorkflowUpdateResult('');
    setSavingAgentSelectionId(selectedWorkflow.id);
    setWorkflowUndoCheckpoint(selectedWorkflow);
    try {
      const updated = await updateWorkflow(workspace.id, selectedWorkflow.id, {
        agentIds: selectedAgentIds
      });
      const mapped = mapApiWorkflowToDefinition(updated, selectedWorkflow, workspace.id, workflowOptions, ownerLabelsByUserId, workflowAgents);
      setWorkflows((current) => current.map((workflow) => workflow.id === selectedWorkflow.id
        ? { ...mapped, runs: workflow.runs, lastRun: workflow.lastRun }
        : workflow));
      setAgentSelectionDrafts((current) => ({ ...current, [selectedWorkflow.id]: createAgentSelectionDraft(mapped) }));
      setWorkflowUpdateResult(t('workflowUi.assignmentUpdated'));
      setEditingAgentSelectionId('');
    } catch {
      setAgentSelectionError(t('workflowUi.assignmentFailed'));
    } finally {
      setSavingAgentSelectionId('');
    }
  }

  async function saveWorkflowDefinition(): Promise<void> {
    if (!selectedWorkflow || !selectedWorkflowEditDraft) return;
    const name = selectedWorkflowEditDraft.name.trim();
    if (!name) return;
    setWorkflowUpdateError('');
    setWorkflowUpdateResult('');
    setUpdatingWorkflowId(selectedWorkflow.id);
    setWorkflowUndoCheckpoint(selectedWorkflow);
    try {
      const updated = await updateWorkflow(workspace.id, selectedWorkflow.id, {
        agentIds: selectedWorkflow.agentIds,
        tags: selectedWorkflow.tags,
        name,
        description: selectedWorkflowEditDraft.description.trim(),
        prompt: selectedWorkflowEditDraft.starterPrompt.trim() || `Start ${name}.`
      });
      const mapped = mapApiWorkflowToDefinition(updated, selectedWorkflow, workspace.id, workflowOptions, ownerLabelsByUserId, workflowAgents);
      setWorkflows((current) => current.map((workflow) => workflow.id === selectedWorkflow.id
        ? { ...mapped, runs: workflow.runs, lastRun: workflow.lastRun }
        : workflow));
      setWorkflowEditDrafts((current) => ({ ...current, [selectedWorkflow.id]: createWorkflowEditDraft(mapped) }));
      setWorkflowUpdateResult(t('workflowUi.updated'));
    } catch {
      setWorkflowUpdateError(t('workflowUi.updateFailed'));
    } finally {
      setUpdatingWorkflowId('');
    }
  }

  async function toggleWorkflowActive(workflow: WorkflowDefinition, active: boolean): Promise<void> {
    setWorkflowUpdateError('');
    setWorkflowUpdateResult('');
    setUpdatingWorkflowId(workflow.id);
    setWorkflowUndoCheckpoint(workflow);
    try {
      const updated = await updateWorkflow(workspace.id, workflow.id, {
        agentIds: workflow.agentIds,
        status: active ? 'active' : 'paused'
      });
      const mapped = mapApiWorkflowToDefinition(updated, workflow, workspace.id, workflowOptions, ownerLabelsByUserId, workflowAgents);
      setWorkflows((current) => current.map((item) => item.id === workflow.id
        ? { ...mapped, runs: item.runs, lastRun: item.lastRun }
        : item));
      setWorkflowUpdateResult(active ? t('workflowUi.activated') : t('workflowUi.deactivated'));
    } catch {
      setWorkflowUpdateError(t('workflowUi.availabilityFailed'));
    } finally {
      setUpdatingWorkflowId('');
    }
  }

  async function deleteSelectedWorkflow(workflow: WorkflowDefinition): Promise<void> {
    setDeleteWorkflowError('');
    setDeletingWorkflowId(workflow.id);
    try {
      await deleteWorkflow(workspace.id, workflow.id);
      const nextWorkflows = workflows.filter((item) => item.id !== workflow.id);
      setWorkflows(nextWorkflows);
      selectResultingWorkflow(nextWorkflows[0]?.id || '', { replace: true });
      setDeleteWorkflowId('');
    } catch {
      setDeleteWorkflowError(t('workflowUi.deleteFailed'));
    } finally {
      setDeletingWorkflowId('');
    }
  }

  async function undoLastWorkflowMutation(): Promise<void> {
    const previous = workflowUndoCheckpoint as WorkflowDefinition | null;
    if (!previous) return;
    setWorkflowUpdateError('');
    setUpdatingWorkflowId(previous.id);
    try {
      const updated = await updateWorkflow(workspace.id, previous.id, {
        agentIds: previous.agentIds,
        tags: previous.tags,
        name: previous.name,
        description: previous.description,
        prompt: previous.starterPrompt,
        status: previous.status
      });
      const mapped = mapApiWorkflowToDefinition(updated, previous, workspace.id, workflowOptions, ownerLabelsByUserId);
      setWorkflows((current) => current.map((workflow) => workflow.id === previous.id
        ? { ...mapped, runs: workflow.runs, lastRun: workflow.lastRun }
        : workflow));
      setWorkflowEditDrafts((current) => ({ ...current, [previous.id]: createWorkflowEditDraft(mapped) }));
      setWorkflowUndoCheckpoint(null);
      setWorkflowUpdateResult(t('workflowUi.restored'));
    } catch {
      setWorkflowUpdateError(t('workflowUi.undoFailed'));
    } finally {
      setUpdatingWorkflowId('');
    }
  }

  async function createNewWorkflow(): Promise<void> {
    if (!canManageWorkflows) {
      setCreateError(t('workflowCoordination.creation.permissionRequired'));
      return;
    }
    if (!workflowOptionsReady) {
      setCreateError(t('workflowUi.optionsBeforeCreate'));
      return;
    }
    const name = createDraft.name.trim();
    if (!name) return;
    setCreateError('');
    setCreatingWorkflow(true);
    try {
      const workflow = await createWorkflow(workspace.id, buildWorkflowCreateInput(createDraft));
      const mapped = mapApiWorkflowToDefinition(workflow, undefined, workspace.id, workflowOptions, ownerLabelsByUserId, workflowAgents);
      setWorkflows((current) => [mapped, ...current]);
      selectResultingWorkflow(mapped.id);
      setCreateDraft(createWorkflowDraft());
      setCreatePanelOpen(false);
    } catch {
      setCreateError(t('workflowUi.createFailed'));
    } finally {
      setCreatingWorkflow(false);
    }
  }

  return {
    addWorkflowTag,
    cancelEditingAgentSelection,
    cancelEditingWorkflow,
    closeCreateWorkflowPanel,
    createNewWorkflow,
    refreshApprovalRecords,
    deleteSelectedWorkflow,
    launchSelectedWorkflow,
    removeWorkflowTag,
    saveAgentSelection,
    saveWorkflowDefinition,
    undoLastWorkflowMutation,
    startEditingAgentSelection,
    startEditingWorkflow,
    stopWorkflowRun,
    toggleRunLogs,
    toggleWorkflowActive,
    updateAgentSelectionDraft,
    updateWorkflowEditDraft
  };
}
