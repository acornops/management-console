import { getOptimisticWorkflowRunStatus, isSystemProvidedWorkflow, type WorkflowDefinition, type WorkflowRunMessage } from '@/pages/workflows/workflowModel';
import {
  cancelWorkflowRun,
  createWorkflow,
  createWorkflowSession,
  decideWorkflowRunApproval,
  deleteWorkflow,
  duplicateWorkflow,
  listWorkflowRunEvents,
  postWorkflowSessionMessage,
  updateWorkflow,
  type WorkflowRunEvent
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
import { createWorkflowScopeActions } from './workflowScopeActions';
import { getWorkflowLaunchInputState } from '../WorkspaceWorkflowsPage.launchFields';
import { resolveMcpReadinessRecovery } from '@/services/control-plane/mcpReadinessRecovery';

type WorkflowActionsContext = Record<string, any>;

export function useWorkspaceWorkflowActions(ctx: WorkflowActionsContext) {
  const {
    workspace, workflows, setWorkflows,
    selectedWorkflow, selectedWorkflowEditDraft, workflowMessage, workflowRunInputs, workflowAgents, workflowSessionIds, setWorkflowSessionIds,
    setCompiledScopes, setLaunchError, setLaunchRecovery, setLaunchingWorkflowId, setLaunchResult, setActiveTab, setApprovalRecords, setApprovalError,
    setPendingWorkflowRuns, setApprovalAction, expandedRunLogId, setExpandedRunLogId, runEventsByRunId, setRunEventsByRunId,
    setRunLogError, setRunLogLoadingId, setCancelRunError, setCancelRunAction,
    workflowRunMessageDrafts, setWorkflowRunMessageDrafts, setWorkflowRunMessages,
    setWorkflowRunMessageSendingId, setWorkflowRunMessageErrorByRunId, setWorkflowRunMessageRecoveryByRunId,
    setNewWorkflowTag,
    newWorkflowTag, setWorkflowEditDrafts, setWorkflowUpdateError, setWorkflowUpdateResult, setDeleteWorkflowError,
    setDeleteWorkflowId, setEditingWorkflowId, setUpdatingWorkflowId, setDuplicatingWorkflowId, selectResultingWorkflow, selectWorkflowTab, setDeletingWorkflowId,
    createDraft, setCreateDraft, setCreatePanelOpen, setCreateError, setCreatingWorkflow,
    canManageWorkflowScope, workflowOptionsReady, launchBlocker, workflowOptions, agentSelectionDrafts, setAgentSelectionDrafts,
    setEditingAgentSelectionId, setAgentSelectionError, setAgentSelectionResult, setSavingAgentSelectionId,
    ownerLabelsByUserId: providedOwnerLabelsByUserId
  } = ctx;
  const ownerLabelEntries: Array<[string, string]> = (workspace.members || [])
    .filter((member: { userId?: string }) => member.userId)
    .map((member: { userId: string; name?: string; email?: string }) => [member.userId, member.name || member.email || member.userId]);
  const ownerLabelsByUserId = providedOwnerLabelsByUserId instanceof Map
    ? providedOwnerLabelsByUserId
    : new Map<string, string>(ownerLabelEntries);
  const scopeActions = createWorkflowScopeActions({ ...ctx, ownerLabelsByUserId });

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
      runId: optimisticRunId,
      status: getOptimisticWorkflowRunStatus(selectedWorkflow),
      actor: 'You',
      duration: 'Starting',
      approvals: selectedWorkflow.policy.approvals.length,
      output: 'Starting workflow run.',
      startedAt: 'Just now'
    };
    setActiveTab('runs');
    setPendingWorkflowRuns((current: Record<string, WorkflowDefinition['runs']>) => ({
      ...current,
      [selectedWorkflow.id]: [
        optimisticRun,
        ...(current[selectedWorkflow.id] || []).filter((run) => run.id !== optimisticRun.id && run.runId !== optimisticRun.runId)
      ]
    }));
    setWorkflows((current) => current.map((workflow) => workflow.id === selectedWorkflow.id
      ? {
          ...workflow,
          lastRun: 'Just now',
          runs: [
            optimisticRun,
            ...workflow.runs
          ]
        }
      : workflow));
    setLaunchingWorkflowId(selectedWorkflow.id);
    try {
      const controlMessage = workflowMessage || selectedWorkflow.starterPrompt;
      const promptReferences = getWorkflowLaunchInputState(selectedWorkflow, workflowOptions, controlMessage, workflowAgents, workflowRunInputs);
      let effectiveSessionId = workflowSessionIds[selectedWorkflow.id];
      if (!effectiveSessionId) {
        const sessionResponse = await createWorkflowSession(workspace.id, selectedWorkflow.id, {
          approvedContextGrants: selectedWorkflow.contextGrants
        });
        effectiveSessionId = sessionResponse.session.id;
        setWorkflowSessionIds((current) => ({ ...current, [selectedWorkflow.id]: effectiveSessionId }));
      }
      const result = await postWorkflowSessionMessage(workspace.id, effectiveSessionId, {
        content: controlMessage,
        inputs: promptReferences.inputs,
        ...(promptReferences.targetId ? {
          targetId: promptReferences.targetId,
          targetType: promptReferences.targetType
        } : {})
      });
      const runId = result.run_id || optimisticRunId;
      const workflowRunId = result.workflow_run_id || runId;
      const authoritativeScope = result.compiledAccessScope;
      const authoritativeTools = Array.isArray(authoritativeScope?.tools)
        ? authoritativeScope.tools.filter((tool): tool is string => typeof tool === 'string')
        : [];
      setCompiledScopes((current) => ({ ...current, [selectedWorkflow.id]: authoritativeScope }));
      const confirmedRun: WorkflowDefinition['runs'][number] = {
        ...optimisticRun,
        id: workflowRunId || runId,
        runId,
        status: getOptimisticWorkflowRunStatus(selectedWorkflow),
        duration: 'Queued',
        output: 'Workflow run dispatched to execution engine.'
      };
      setLaunchResult({ workflowId: selectedWorkflow.id, runId, workflowRunId, toolCount: authoritativeTools.length });
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
            lastRun: 'Just now',
            runs: workflow.runs.map((run) => run.id === optimisticRunId || run.runId === optimisticRunId ? confirmedRun : run)
          }
        : workflow));
      const confirmedMessageRunId = confirmedRun.runId || confirmedRun.id;
      setWorkflowRunMessages((current: Record<string, WorkflowRunMessage[]>) => {
        const localMessages = current[optimisticRunId] || [];
        if (localMessages.length === 0) return current;
        const next = {
          ...current,
          [confirmedMessageRunId]: [
            ...(current[confirmedMessageRunId] || []),
            ...localMessages.map((message) => ({ ...message, runId: confirmedMessageRunId }))
          ]
        };
        delete next[optimisticRunId];
        return next;
      });
      setWorkflowRunMessageDrafts((current: Record<string, string>) => {
        if (!current[optimisticRunId]) return current;
        const next = { ...current, [confirmedMessageRunId]: current[confirmedMessageRunId] || current[optimisticRunId] };
        delete next[optimisticRunId];
        return next;
      });
      setWorkflowRunMessageErrorByRunId((current: Record<string, string>) => {
        if (!current[optimisticRunId]) return current;
        const next = { ...current, [confirmedMessageRunId]: current[confirmedMessageRunId] || current[optimisticRunId] };
        delete next[optimisticRunId];
        return next;
      });
    } catch (error) {
      const recoveryAgentId = selectedWorkflow.agentIds[0];
      const recovery = recoveryAgentId
        ? resolveMcpReadinessRecovery(error, { workspaceId: workspace.id, scopeType: 'agent', agentId: recoveryAgentId })
        : null;
      const message = recovery?.message || (error instanceof Error ? error.message : 'Unable to launch workflow');
      setLaunchRecovery(recovery);
      const failedRun: WorkflowDefinition['runs'][number] = {
        ...optimisticRun,
        status: 'failed',
        duration: 'Failed',
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

  function updateWorkflowRunMessageDraft(runId: string, value: string): void {
    setWorkflowRunMessageErrorByRunId((current: Record<string, string>) => {
      if (!current[runId]) return current;
      const next = { ...current };
      delete next[runId];
      return next;
    });
    setWorkflowRunMessageRecoveryByRunId((current: Record<string, unknown>) => {
      if (!current[runId]) return current;
      const next = { ...current };
      delete next[runId];
      return next;
    });
    setWorkflowRunMessageDrafts((current: Record<string, string>) => ({ ...current, [runId]: value }));
  }

  async function sendWorkflowRunMessage(runId: string, sessionId: string): Promise<void> {
    const content = (workflowRunMessageDrafts[runId] || '').trim();
    if (!content) return;
    if (!sessionId) {
      setWorkflowRunMessageErrorByRunId((current: Record<string, string>) => ({ ...current, [runId]: 'Workflow session is not ready yet.' }));
      return;
    }
    const messageId = `workflow-run-message-${Date.now()}`;
    const optimisticMessage: WorkflowRunMessage = {
      id: messageId,
      runId,
      role: 'operator',
      author: 'You',
      content,
      createdAt: 'Just now',
      status: 'sending'
    };
    setWorkflowRunMessageErrorByRunId((current: Record<string, string>) => {
      if (!current[runId]) return current;
      const next = { ...current };
      delete next[runId];
      return next;
    });
    setWorkflowRunMessageDrafts((current: Record<string, string>) => ({ ...current, [runId]: '' }));
    setWorkflowRunMessages((current: Record<string, WorkflowRunMessage[]>) => ({
      ...current,
      [runId]: [
        ...(current[runId] || []),
        optimisticMessage
      ]
    }));
    setWorkflowRunMessageSendingId(runId);
    try {
      const promptReferences = getWorkflowLaunchInputState(selectedWorkflow, workflowOptions, content, workflowAgents, workflowRunInputs);
      await postWorkflowSessionMessage(workspace.id, sessionId, {
        content,
        inputs: selectedWorkflow ? promptReferences.inputs : {},
        ...(promptReferences.targetId ? {
          targetId: promptReferences.targetId,
          targetType: promptReferences.targetType
        } : {})
      });
      setWorkflowRunMessages((current: Record<string, WorkflowRunMessage[]>) => ({
        ...current,
        [runId]: (current[runId] || []).map((message) => message.id === messageId
          ? { ...message, status: 'sent' }
          : message)
      }));
    } catch (error) {
      const recoveryAgentId = selectedWorkflow?.agentIds[0];
      const recovery = recoveryAgentId
        ? resolveMcpReadinessRecovery(error, { workspaceId: workspace.id, scopeType: 'agent', agentId: recoveryAgentId })
        : null;
      const message = recovery?.message || (error instanceof Error ? error.message : 'Unable to send workflow message');
      setWorkflowRunMessageErrorByRunId((current: Record<string, string>) => ({ ...current, [runId]: message }));
      if (recovery) {
        setWorkflowRunMessageRecoveryByRunId((current: Record<string, unknown>) => ({ ...current, [runId]: recovery }));
      }
      setWorkflowRunMessages((current: Record<string, WorkflowRunMessage[]>) => ({
        ...current,
        [runId]: (current[runId] || []).map((item) => item.id === messageId
          ? { ...item, status: 'failed' }
          : item)
      }));
    } finally {
      setWorkflowRunMessageSendingId('');
    }
  }

  async function decideApproval(runId: string, approvalId: string, decision: 'approved' | 'rejected'): Promise<void> {
    setApprovalError('');
    setApprovalAction(`${runId}:${approvalId}:${decision}`);
    try {
      const approval = await decideWorkflowRunApproval(runId, approvalId, decision);
      setApprovalRecords((current) => ({
        ...current,
        [runId]: (current[runId] || []).map((item) => item.id === approval.id ? approval : item)
      }));
    } catch (error) {
      setApprovalError(error instanceof Error ? error.message : 'Unable to decide workflow approval');
    } finally {
      setApprovalAction('');
    }
  }

  async function toggleRunLogs(runId: string): Promise<void> {
    if (expandedRunLogId === runId) {
      setExpandedRunLogId('');
      return;
    }
    setExpandedRunLogId(runId);
    setRunLogError('');
    if (runEventsByRunId[runId]) return;
    setRunLogLoadingId(runId);
    try {
      const events = await listWorkflowRunEvents(runId);
      setRunEventsByRunId((current) => ({ ...current, [runId]: events }));
    } catch (error) {
      setRunLogError(error instanceof Error ? error.message : 'Unable to load workflow run logs');
    } finally {
      setRunLogLoadingId('');
    }
  }

  async function stopWorkflowRun(runId: string): Promise<void> {
    setCancelRunError('');
    setCancelRunAction(runId);
    try {
      await cancelWorkflowRun(runId);
      setWorkflows((current) => current.map((workflow) => ({
        ...workflow,
        runs: workflow.runs.map((run) => run.runId === runId || run.id === runId
          ? { ...run, status: 'cancelling', output: 'Cancellation requested.' }
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
    } catch (error) {
      setCancelRunError(error instanceof Error ? error.message : 'Unable to stop workflow run');
    } finally {
      setCancelRunAction('');
    }
  }

  async function persistWorkflowTags(workflow: WorkflowDefinition, tags: string[]): Promise<boolean> {
    setWorkflowUpdateError('');
    setWorkflowUpdateResult('');
    setUpdatingWorkflowId(workflow.id);
    try {
      const updated = await updateWorkflow(workspace.id, workflow.id, {
        agentIds: workflow.agentIds,
        tags
      });
      const mapped = mapApiWorkflowToDefinition(updated, workflow, workspace.id, workflowOptions, ownerLabelsByUserId);
      setWorkflows((current) => current.map((item) => item.id === workflow.id
        ? { ...mapped, runs: item.runs, lastRun: item.lastRun }
        : item));
      setWorkflowEditDrafts((current) => ({ ...current, [workflow.id]: createWorkflowEditDraft(mapped) }));
      setWorkflowUpdateResult('Workflow tags updated.');
      return true;
    } catch (error) {
      setWorkflowUpdateError(error instanceof Error ? error.message : 'Unable to update workflow tags');
      return false;
    } finally {
      setUpdatingWorkflowId('');
    }
  }

  async function addWorkflowTag(workflowId: string): Promise<void> {
    const workflow = workflows.find((item: WorkflowDefinition) => item.id === workflowId);
    if (!workflow || isSystemProvidedWorkflow(workflow)) return;
    const tag = newWorkflowTag.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!tag) return;
    if (await persistWorkflowTags(workflow, uniqueValues([...workflow.tags, tag]))) {
      setNewWorkflowTag('');
    }
  }

  async function removeWorkflowTag(workflowId: string, tag: string): Promise<void> {
    const workflow = workflows.find((item: WorkflowDefinition) => item.id === workflowId);
    if (!workflow || isSystemProvidedWorkflow(workflow)) return;
    await persistWorkflowTags(workflow, workflow.tags.filter((value) => value !== tag));
  }

  function startEditingWorkflow(workflow: WorkflowDefinition): void {
    if (isSystemProvidedWorkflow(workflow)) return;
    setWorkflowEditDrafts((current) => ({ ...current, [workflow.id]: createWorkflowEditDraft(workflow) }));
    setWorkflowUpdateError('');
    setWorkflowUpdateResult('');
    setDeleteWorkflowError('');
    setDeleteWorkflowId('');
    setEditingWorkflowId(workflow.id);
  }

  function cancelEditingWorkflow(workflow: WorkflowDefinition): void {
    setWorkflowEditDrafts((current) => ({ ...current, [workflow.id]: createWorkflowEditDraft(workflow) }));
    setWorkflowUpdateError('');
    setEditingWorkflowId('');
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
    if (isSystemProvidedWorkflow(workflow)) return;
    setAgentSelectionDrafts((current) => ({ ...current, [workflow.id]: current[workflow.id] || createAgentSelectionDraft(workflow) }));
    setAgentSelectionError('');
    setAgentSelectionResult('');
    setEditingAgentSelectionId(workflow.id);
  }

  function cancelEditingAgentSelection(workflow: WorkflowDefinition): void {
    setAgentSelectionDrafts((current) => ({ ...current, [workflow.id]: createAgentSelectionDraft(workflow) }));
    setAgentSelectionError('');
    setEditingAgentSelectionId('');
  }

  function updateAgentSelectionDraft(workflowId: string, update: Partial<ReturnType<typeof createAgentSelectionDraft>>): void {
    setAgentSelectionResult('');
    setAgentSelectionDrafts((current) => {
      const workflow = workflows.find((item) => item.id === workflowId);
      const currentDraft = current[workflowId] || (workflow ? createAgentSelectionDraft(workflow) : undefined);
      if (!currentDraft) return current;
      return { ...current, [workflowId]: { ...currentDraft, ...update } };
    });
  }

  async function saveAgentSelection(): Promise<void> {
    if (!selectedWorkflow || isSystemProvidedWorkflow(selectedWorkflow)) return;
    const draft = agentSelectionDrafts[selectedWorkflow.id] || createAgentSelectionDraft(selectedWorkflow);
    const selectedAgentIds = agentIdsFromDraft(draft);
    setAgentSelectionError('');
    setAgentSelectionResult('');
    setSavingAgentSelectionId(selectedWorkflow.id);
    try {
      const updated = await updateWorkflow(workspace.id, selectedWorkflow.id, {
        agentIds: selectedAgentIds
      });
      const mapped = mapApiWorkflowToDefinition(updated, selectedWorkflow, workspace.id, workflowOptions, ownerLabelsByUserId);
      setWorkflows((current) => current.map((workflow) => workflow.id === selectedWorkflow.id
        ? { ...mapped, runs: workflow.runs, lastRun: workflow.lastRun }
        : workflow));
      setCompiledScopes((current) => {
        const next = { ...current };
        delete next[selectedWorkflow.id];
        return next;
      });
      setAgentSelectionDrafts((current) => ({ ...current, [selectedWorkflow.id]: createAgentSelectionDraft(mapped) }));
      setAgentSelectionResult('Selected Agents saved. Future workflow sessions will use the updated execution mode.');
      setEditingAgentSelectionId('');
    } catch (error) {
      setAgentSelectionError(error instanceof Error ? error.message : 'Unable to save workflow agents');
    } finally {
      setSavingAgentSelectionId('');
    }
  }

  async function saveWorkflowDefinition(): Promise<void> {
    if (!selectedWorkflow || isSystemProvidedWorkflow(selectedWorkflow) || !selectedWorkflowEditDraft) return;
    const name = selectedWorkflowEditDraft.name.trim();
    if (!name) return;
    setWorkflowUpdateError('');
    setWorkflowUpdateResult('');
    setUpdatingWorkflowId(selectedWorkflow.id);
    try {
      const updated = await updateWorkflow(workspace.id, selectedWorkflow.id, {
        agentIds: selectedWorkflow.agentIds,
        tags: selectedWorkflow.tags,
        name,
        description: selectedWorkflowEditDraft.description.trim(),
        prompt: selectedWorkflowEditDraft.starterPrompt.trim() || `Start ${name}.`,
        targetConstraints: selectedWorkflowEditDraft.targetTypes.length || selectedWorkflowEditDraft.targetIds.length
          ? { targetTypes: selectedWorkflowEditDraft.targetTypes, targetIds: selectedWorkflowEditDraft.targetIds }
          : null
      });
      const mapped = mapApiWorkflowToDefinition(updated, selectedWorkflow, workspace.id, workflowOptions, ownerLabelsByUserId);
      setWorkflows((current) => current.map((workflow) => workflow.id === selectedWorkflow.id
        ? { ...mapped, runs: workflow.runs, lastRun: workflow.lastRun }
        : workflow));
      setWorkflowEditDrafts((current) => ({ ...current, [selectedWorkflow.id]: createWorkflowEditDraft(mapped) }));
      setWorkflowUpdateResult('Workflow updated.');
      setEditingWorkflowId('');
    } catch (error) {
      setWorkflowUpdateError(error instanceof Error ? error.message : 'Unable to update workflow');
    } finally {
      setUpdatingWorkflowId('');
    }
  }

  async function toggleWorkflowActive(workflow: WorkflowDefinition, active: boolean): Promise<void> {
    setWorkflowUpdateError('');
    setWorkflowUpdateResult('');
    setUpdatingWorkflowId(workflow.id);
    try {
      const updated = await updateWorkflow(workspace.id, workflow.id, {
        agentIds: workflow.agentIds,
        status: active ? 'active' : 'paused'
      });
      const mapped = mapApiWorkflowToDefinition(updated, workflow, workspace.id, workflowOptions, ownerLabelsByUserId);
      setWorkflows((current) => current.map((item) => item.id === workflow.id
        ? { ...mapped, runs: item.runs, lastRun: item.lastRun }
        : item));
      setWorkflowUpdateResult(active ? 'Workflow activated.' : 'Workflow deactivated.');
    } catch (error) {
      setWorkflowUpdateError(error instanceof Error ? error.message : 'Unable to update workflow status');
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
      setEditingWorkflowId('');
    } catch (error) {
      setDeleteWorkflowError(error instanceof Error ? error.message : 'Unable to delete workflow');
    } finally {
      setDeletingWorkflowId('');
    }
  }

  async function duplicateSystemWorkflow(): Promise<void> {
    if (!selectedWorkflow || !isSystemProvidedWorkflow(selectedWorkflow) || !canManageWorkflowScope) return;
    setDuplicatingWorkflowId(selectedWorkflow.id);
    setWorkflowUpdateError('');
    setWorkflowUpdateResult('');
    try {
      const created = await duplicateWorkflow(workspace.id, selectedWorkflow.id);
      const mapped = mapApiWorkflowToDefinition(created, undefined, workspace.id, workflowOptions, ownerLabelsByUserId);
      setWorkflows((current) => [mapped, ...current.filter((workflow: WorkflowDefinition) => workflow.id !== mapped.id)]);
      setWorkflowEditDrafts((current) => ({ ...current, [mapped.id]: createWorkflowEditDraft(mapped) }));
      setEditingWorkflowId(mapped.id);
      selectWorkflowTab('settings', mapped.id);
      setWorkflowUpdateResult(`Created an editable custom draft from ${selectedWorkflow.name}.`);
    } catch (error) {
      setWorkflowUpdateError(error instanceof Error ? error.message : 'Unable to duplicate this system-provided workflow.');
    } finally {
      setDuplicatingWorkflowId('');
    }
  }

  async function createNewWorkflow(): Promise<void> {
    if (!canManageWorkflowScope) {
      setCreateError('You need manage_workflows to create workflows.');
      return;
    }
    if (!workflowOptionsReady) {
      setCreateError('Workflow options must load before you can create a workflow. Retry loading the catalog.');
      return;
    }
    const name = createDraft.name.trim();
    if (!name) return;
    setCreateError('');
    setCreatingWorkflow(true);
    try {
      const workflow = await createWorkflow(workspace.id, buildWorkflowCreateInput(createDraft));
      const mapped = mapApiWorkflowToDefinition(workflow, undefined, workspace.id, workflowOptions, ownerLabelsByUserId);
      setWorkflows((current) => [mapped, ...current]);
      selectResultingWorkflow(mapped.id);
      setCreateDraft(createWorkflowDraft());
      setCreatePanelOpen(false);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Unable to create workflow');
    } finally {
      setCreatingWorkflow(false);
    }
  }

  return {
    ...scopeActions,
    addWorkflowTag,
    cancelEditingAgentSelection,
    cancelEditingWorkflow,
    closeCreateWorkflowPanel,
    createNewWorkflow,
    decideApproval,
    deleteSelectedWorkflow,
    duplicateSystemWorkflow,
    launchSelectedWorkflow,
    removeWorkflowTag,
    saveAgentSelection,
    saveWorkflowDefinition,
    startEditingAgentSelection,
    startEditingWorkflow,
    sendWorkflowRunMessage,
    stopWorkflowRun,
    toggleRunLogs,
    toggleWorkflowActive,
    updateAgentSelectionDraft,
    updateWorkflowRunMessageDraft,
    updateWorkflowEditDraft
  };
}
