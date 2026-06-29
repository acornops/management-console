import { getOptimisticWorkflowRunStatus, type WorkflowDefinition, type WorkflowRunMessage } from '@/pages/workflows/workflowModel';
import {
  cancelWorkflowRun,
  createWorkflow,
  createWorkflowSession,
  decideWorkflowRunApproval,
  deleteWorkflow,
  listWorkflowRunEvents,
  postWorkflowSessionMessage,
  updateWorkflow,
  updateWorkflowScope,
  type WorkflowRunEvent
} from '@/services/control-plane/workflowApi';
import {
  assignedAgentIdsFromDraft,
  createAgentAssignmentDraft,
  createScopeDraft,
  buildWorkflowCreateInput,
  createWorkflowDraft,
  createWorkflowEditDraft,
  mapApiWorkflowToDefinition,
  setLineValue,
  splitLines,
  uniqueValues,
  type ScopeDraft,
  type WorkflowEditDraft
} from './workflowPageHelpers';

type WorkflowActionsContext = Record<string, any>;

export function useWorkspaceWorkflowActions(ctx: WorkflowActionsContext) {
  const {
    workspace, workflows, setWorkflows,
    selectedWorkflow, selectedWorkflowEditDraft, workflowMessage, workflowSessionIds, setWorkflowSessionIds,
    setCompiledScopes, setLaunchError, setLaunchingWorkflowId, setLaunchResult, setActiveTab, setApprovalRecords, setApprovalError,
    setPendingWorkflowRuns, setApprovalAction, expandedRunLogId, setExpandedRunLogId, runEventsByRunId, setRunEventsByRunId,
    setRunLogError, setRunLogLoadingId, setCancelRunError, setCancelRunAction, setScopeSaveResult,
    workflowRunMessageDrafts, setWorkflowRunMessageDrafts, setWorkflowRunMessages,
    setWorkflowRunMessageSendingId, setWorkflowRunMessageErrorByRunId,
    setScopeDrafts, setScopeSaveError, setIsEditingScopeTab, scopeDrafts, setSavingScope, setNewWorkflowTag,
    newWorkflowTag, setWorkflowEditDrafts, setWorkflowUpdateError, setWorkflowUpdateResult, setDeleteWorkflowError,
    setDeleteWorkflowId, setEditingWorkflowId, setUpdatingWorkflowId, setSelectedWorkflowId, setDeletingWorkflowId,
    createDraft, setCreateDraft, setCreatePanelOpen, setCreateError, setCreatingWorkflow,
    canManageWorkflowScope, launchBlocker, workflowOptions, agentAssignmentDrafts, setAgentAssignmentDrafts,
    setEditingAgentAssignmentsId, setAgentAssignmentError, setAgentAssignmentResult, setSavingAgentAssignmentsId,
    ownerLabelsByUserId: providedOwnerLabelsByUserId
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
      let effectiveSessionId = workflowSessionIds[selectedWorkflow.id];
      if (!effectiveSessionId) {
        const sessionResponse = await createWorkflowSession(workspace.id, selectedWorkflow.id, {
          approvedContextGrants: selectedWorkflow.contextGrants
        });
        effectiveSessionId = sessionResponse.session.id;
        setWorkflowSessionIds((current) => ({ ...current, [selectedWorkflow.id]: effectiveSessionId }));
        setCompiledScopes((current) => ({ ...current, [selectedWorkflow.id]: sessionResponse.compiledAccessScope }));
      }
      const result = await postWorkflowSessionMessage(workspace.id, effectiveSessionId, {
        content: workflowMessage || selectedWorkflow.starterPrompt
      });
      const runId = typeof result.run_id === 'string'
        ? result.run_id
        : typeof result.runId === 'string'
          ? result.runId
          : optimisticRunId;
      const workflowRunId = typeof result.workflow_run_id === 'string'
        ? result.workflow_run_id
        : typeof result.workflowRunId === 'string'
          ? result.workflowRunId
          : runId;
      const confirmedRun: WorkflowDefinition['runs'][number] = {
        ...optimisticRun,
        id: workflowRunId || runId,
        runId,
        status: getOptimisticWorkflowRunStatus(selectedWorkflow),
        duration: 'Queued',
        output: 'Workflow run dispatched to execution engine.'
      };
      setLaunchResult({ workflowId: selectedWorkflow.id, runId, workflowRunId });
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
      const message = error instanceof Error ? error.message : 'Unable to launch workflow';
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
      await postWorkflowSessionMessage(workspace.id, sessionId, {
        content
      });
      setWorkflowRunMessages((current: Record<string, WorkflowRunMessage[]>) => ({
        ...current,
        [runId]: (current[runId] || []).map((message) => message.id === messageId
          ? { ...message, status: 'sent' }
          : message)
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send workflow message';
      setWorkflowRunMessageErrorByRunId((current: Record<string, string>) => ({ ...current, [runId]: message }));
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

  function updateScopeDraft(workflowId: string, update: (draft: ScopeDraft) => ScopeDraft): void {
    setScopeSaveResult(null);
    setScopeDrafts((current) => {
      const workflow = workflows.find((item) => item.id === workflowId);
      const currentDraft = current[workflowId] || (workflow ? createScopeDraft(workflow) : undefined);
      if (!currentDraft) return current;
      return { ...current, [workflowId]: update(currentDraft) };
    });
  }

  function startEditingScopeTab(tab: 'capabilities'): void {
    setScopeSaveError(null);
    setScopeSaveResult(null);
    setIsEditingScopeTab(tab);
  }

  function cancelEditingScopeTab(): void {
    if (selectedWorkflow) {
      setScopeDrafts((current) => ({
        ...current,
        [selectedWorkflow.id]: createScopeDraft(selectedWorkflow)
      }));
    }
    setScopeSaveError(null);
    setIsEditingScopeTab('');
  }

  async function saveWorkflowScope(tab: 'capabilities'): Promise<void> {
    if (!selectedWorkflow) return;
    const draft = scopeDrafts[selectedWorkflow.id] || createScopeDraft(selectedWorkflow);
    setScopeSaveError(null);
    setScopeSaveResult(null);
    setSavingScope(selectedWorkflow.id);
    try {
      const updated = await updateWorkflowScope(workspace.id, selectedWorkflow.id, {
        enabledMcpServers: selectedWorkflow.enabledMcpServers,
        enabledSkills: selectedWorkflow.enabledSkills,
        policy: {
          mode: draft.policyMode,
          approvalRequirements: splitLines(draft.approvalRequirements)
        },
        steps: selectedWorkflow.steps.map((step) => {
          const stepDraft = draft.steps[step.id];
          return {
            id: step.id,
            assignedAgentIds: step.assignedAgentIds || [],
            allowedTools: splitLines(stepDraft?.allowedTools || ''),
            contextGrants: splitLines(stepDraft?.contextGrants || ''),
            approvalRequired: Boolean(stepDraft?.approvalRequired)
          };
        })
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
      setScopeDrafts((current) => ({ ...current, [selectedWorkflow.id]: createScopeDraft(mapped) }));
      setScopeSaveResult({ tab, message: 'Workflow capability gate saved. Future sessions will use the narrowed access.' });
      setIsEditingScopeTab('');
    } catch (error) {
      setScopeSaveError({ tab, message: error instanceof Error ? error.message : 'Unable to save workflow scope' });
    } finally {
      setSavingScope('');
    }
  }

  function setStepScopeValue(
    workflowId: string,
    stepId: string,
    key: 'allowedTools' | 'contextGrants',
    value: string,
    enabled: boolean
  ): void {
    updateScopeDraft(workflowId, (draft) => ({
      ...draft,
      steps: {
        ...draft.steps,
        [stepId]: {
          ...draft.steps[stepId],
          [key]: setLineValue(draft.steps[stepId]?.[key] || '', value, enabled)
        }
      }
    }));
  }

  function addWorkflowTag(workflowId: string): void {
    const tag = newWorkflowTag.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!tag) return;
    setWorkflows((current) => current.map((workflow) => workflow.id === workflowId
      ? { ...workflow, tags: uniqueValues([...workflow.tags, tag]) }
      : workflow));
    setNewWorkflowTag('');
  }

  function removeWorkflowTag(workflowId: string, tag: string): void {
    setWorkflows((current) => current.map((workflow) => workflow.id === workflowId
      ? { ...workflow, tags: workflow.tags.filter((value) => value !== tag) }
      : workflow));
  }

  function setWorkflowScopeValue(
    workflowId: string,
    key: 'enabledMcpServers' | 'enabledSkills',
    value: string,
    enabled: boolean
  ): void {
    updateScopeDraft(workflowId, (draft) => ({
      ...draft,
      [key]: setLineValue(draft[key], value, enabled)
    }));
  }

  function startEditingWorkflow(workflow: WorkflowDefinition): void {
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

  function startEditingAgentAssignments(workflow: WorkflowDefinition): void {
    setAgentAssignmentDrafts((current) => ({ ...current, [workflow.id]: current[workflow.id] || createAgentAssignmentDraft(workflow) }));
    setAgentAssignmentError('');
    setAgentAssignmentResult('');
    setEditingAgentAssignmentsId(workflow.id);
  }

  function cancelEditingAgentAssignments(workflow: WorkflowDefinition): void {
    setAgentAssignmentDrafts((current) => ({ ...current, [workflow.id]: createAgentAssignmentDraft(workflow) }));
    setAgentAssignmentError('');
    setEditingAgentAssignmentsId('');
  }

  function updateAgentAssignmentDraft(workflowId: string, update: Partial<ReturnType<typeof createAgentAssignmentDraft>>): void {
    setAgentAssignmentResult('');
    setAgentAssignmentDrafts((current) => {
      const workflow = workflows.find((item) => item.id === workflowId);
      const currentDraft = current[workflowId] || (workflow ? createAgentAssignmentDraft(workflow) : undefined);
      if (!currentDraft) return current;
      return { ...current, [workflowId]: { ...currentDraft, ...update } };
    });
  }

  async function saveAgentAssignments(): Promise<void> {
    if (!selectedWorkflow) return;
    const draft = agentAssignmentDrafts[selectedWorkflow.id] || createAgentAssignmentDraft(selectedWorkflow);
    const selectedAgentIds = assignedAgentIdsFromDraft(draft);
    if (!draft.primaryAgentId.trim()) {
      setAgentAssignmentError('Choose a primary agent before saving.');
      return;
    }
    setAgentAssignmentError('');
    setAgentAssignmentResult('');
    setSavingAgentAssignmentsId(selectedWorkflow.id);
    try {
      const updated = await updateWorkflow(workspace.id, selectedWorkflow.id, {
        steps: selectedWorkflow.steps.map((step) => ({
          id: step.id,
          assignedAgentIds: selectedAgentIds
        }))
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
      setAgentAssignmentDrafts((current) => ({ ...current, [selectedWorkflow.id]: createAgentAssignmentDraft(mapped) }));
      setAgentAssignmentResult('Agent assignment saved. Future workflow sessions will use the updated agents.');
      setEditingAgentAssignmentsId('');
    } catch (error) {
      setAgentAssignmentError(error instanceof Error ? error.message : 'Unable to save agent assignment');
    } finally {
      setSavingAgentAssignmentsId('');
    }
  }

  async function saveWorkflowDefinition(): Promise<void> {
    if (!selectedWorkflow || !selectedWorkflowEditDraft) return;
    const name = selectedWorkflowEditDraft.name.trim();
    if (!name) return;
    setWorkflowUpdateError('');
    setWorkflowUpdateResult('');
    setUpdatingWorkflowId(selectedWorkflow.id);
    try {
      const updated = await updateWorkflow(workspace.id, selectedWorkflow.id, {
        name,
        description: selectedWorkflowEditDraft.description.trim(),
        starterPrompt: selectedWorkflowEditDraft.starterPrompt.trim() || `Start ${name}.`
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
      setSelectedWorkflowId(nextWorkflows[0]?.id || '');
      setDeleteWorkflowId('');
      setEditingWorkflowId('');
    } catch (error) {
      setDeleteWorkflowError(error instanceof Error ? error.message : 'Unable to delete workflow');
    } finally {
      setDeletingWorkflowId('');
    }
  }

  async function createNewWorkflow(): Promise<void> {
    if (!canManageWorkflowScope) {
      setCreateError('You need manage_workflows to create workflows.');
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
      setSelectedWorkflowId(mapped.id);
      setActiveTab('overview');
      setCreateDraft(createWorkflowDraft());
      setCreatePanelOpen(false);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Unable to create workflow');
    } finally {
      setCreatingWorkflow(false);
    }
  }

  return {
    addWorkflowTag,
    cancelEditingAgentAssignments,
    cancelEditingScopeTab,
    cancelEditingWorkflow,
    closeCreateWorkflowPanel,
    createNewWorkflow,
    decideApproval,
    deleteSelectedWorkflow,
    launchSelectedWorkflow,
    removeWorkflowTag,
    saveAgentAssignments,
    saveWorkflowDefinition,
    saveWorkflowScope,
    setStepScopeValue,
    setWorkflowScopeValue,
    startEditingScopeTab,
    startEditingAgentAssignments,
    startEditingWorkflow,
    sendWorkflowRunMessage,
    stopWorkflowRun,
    toggleRunLogs,
    toggleWorkflowActive,
    updateAgentAssignmentDraft,
    updateWorkflowRunMessageDraft,
    updateWorkflowEditDraft
  };
}
