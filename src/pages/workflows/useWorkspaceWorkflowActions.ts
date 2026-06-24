import { getOptimisticWorkflowRunStatus, type WorkflowDefinition } from '@/pages/workflows/workflowModel';
import {
  cancelWorkflowRun,
  createWorkflow,
  createWorkflowMcpServer,
  createWorkflowSession,
  decideWorkflowRunApproval,
  deleteWorkflow,
  listWorkflowRunEvents,
  postWorkflowSessionMessage,
  updateWorkflow,
  updateWorkflowScope,
  type WorkflowMcpServer,
  type WorkflowRunEvent
} from '@/services/control-plane/workflowApi';
import {
  createMcpServerDraft,
  createScopeDraft,
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
    workspace, workflows, setWorkflows, setWorkflowOptions, workflowMcpServers, setWorkflowMcpServers,
    selectedWorkflow, selectedWorkflowEditDraft, workflowMessage, workflowSessionIds, setWorkflowSessionIds,
    setCompiledScopes, setLaunchError, setLaunchingWorkflowId, setLaunchResult, setActiveTab, setApprovalRecords, setApprovalError,
    setApprovalAction, expandedRunLogId, setExpandedRunLogId, runEventsByRunId, setRunEventsByRunId,
    setRunLogError, setRunLogLoadingId, setCancelRunError, setCancelRunAction, setScopeSaveResult,
    setScopeDrafts, setScopeSaveError, setIsEditingScopeTab, scopeDrafts, setSavingScope, setNewWorkflowTag,
    newWorkflowTag, setWorkflowEditDrafts, setWorkflowUpdateError, setWorkflowUpdateResult, setDeleteWorkflowError,
    setDeleteWorkflowId, setEditingWorkflowId, setUpdatingWorkflowId, setSelectedWorkflowId, setDeletingWorkflowId,
    createDraft, setCreateDraft, setCreatePanelOpen, setCreateError, setCreatingWorkflow,
    mcpServerDraft, setMcpServerDraft, setMcpServerError, setCreatingMcpServer
  } = ctx;

  function closeCreateWorkflowPanel(): void {
    setCreatePanelOpen(false);
    setCreateError('');
  }

  async function launchSelectedWorkflow(): Promise<void> {
    if (!selectedWorkflow) return;
    setLaunchError('');
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
      const runId = typeof result.run_id === 'string' ? result.run_id : '';
      const workflowRunId = typeof result.workflow_run_id === 'string' ? result.workflow_run_id : '';
      setLaunchResult({ workflowId: selectedWorkflow.id, runId, workflowRunId });
      setWorkflows((current) => current.map((workflow) => workflow.id === selectedWorkflow.id
        ? {
            ...workflow,
            lastRun: 'Just now',
            runs: [
              {
                id: workflowRunId || runId || 'workflow-run',
                runId,
                status: getOptimisticWorkflowRunStatus(workflow),
                actor: 'You',
                duration: 'Queued',
                approvals: workflow.policy.approvals.length,
                output: 'Workflow run dispatched to execution engine.',
                startedAt: 'Just now'
              },
              ...workflow.runs
            ]
          }
        : workflow));
      setActiveTab('chat');
    } catch (error) {
      setLaunchError(error instanceof Error ? error.message : 'Unable to launch workflow');
    } finally {
      setLaunchingWorkflowId('');
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

  function startEditingScopeTab(tab: 'mcp' | 'skills'): void {
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

  async function saveWorkflowScope(tab: 'mcp' | 'skills'): Promise<void> {
    if (!selectedWorkflow) return;
    const draft = scopeDrafts[selectedWorkflow.id] || createScopeDraft(selectedWorkflow);
    setScopeSaveError(null);
    setScopeSaveResult(null);
    setSavingScope(selectedWorkflow.id);
    try {
      const updated = await updateWorkflowScope(workspace.id, selectedWorkflow.id, {
        enabledMcpServers: splitLines(draft.enabledMcpServers),
        enabledSkills: splitLines(draft.enabledSkills),
        policy: {
          mode: draft.policyMode,
          approvalRequirements: splitLines(draft.approvalRequirements)
        },
        steps: selectedWorkflow.steps.map((step) => {
          const stepDraft = draft.steps[step.id];
          return {
            id: step.id,
            allowedTools: splitLines(stepDraft?.allowedTools || ''),
            contextGrants: splitLines(stepDraft?.contextGrants || ''),
            approvalRequired: Boolean(stepDraft?.approvalRequired)
          };
        })
      });
      const mapped = mapApiWorkflowToDefinition(updated, selectedWorkflow, workspace.id);
      setWorkflows((current) => current.map((workflow) => workflow.id === selectedWorkflow.id
        ? { ...mapped, runs: workflow.runs, lastRun: workflow.lastRun }
        : workflow));
      setCompiledScopes((current) => {
        const next = { ...current };
        delete next[selectedWorkflow.id];
        return next;
      });
      setScopeDrafts((current) => ({ ...current, [selectedWorkflow.id]: createScopeDraft(mapped) }));
      setScopeSaveResult({ tab, message: tab === 'mcp'
        ? 'Workflow MCP scope saved. Future sessions will use the updated scope.'
        : 'Workflow skills saved. Future sessions will use the updated scope.'
      });
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
      const mapped = mapApiWorkflowToDefinition(updated, selectedWorkflow, workspace.id);
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
      const mapped = mapApiWorkflowToDefinition(updated, workflow, workspace.id);
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
    const name = createDraft.name.trim();
    if (!name) return;
    setCreateError('');
    setCreatingWorkflow(true);
    const enabledMcpServers = splitLines(createDraft.enabledMcpServers);
    const enabledSkills = splitLines(createDraft.enabledSkills);
    const allowedTools = splitLines(createDraft.allowedTools);
    try {
      const workflow = await createWorkflow(workspace.id, {
        name,
        description: createDraft.description.trim(),
        tags: [],
        starterPrompt: createDraft.starterPrompt.trim() || `Start ${name}.`,
        inputs: [],
        enabledMcpServers,
        enabledSkills,
        requiredPermissions: ['read_workspace_data', 'create_read_only_runs'],
        policy: {
          mode: 'read_only',
          maxRuntimeSeconds: 900,
          retentionDays: 90,
          approvalRequirements: []
        },
        steps: [{
          id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workflow'}-step`,
          title: 'Run workflow prompt',
          requiredInputs: [],
          enabledSkills,
          allowedMcpServers: enabledMcpServers,
          allowedTools,
          contextGrants: ['workspace_metadata'],
          approvalRequired: false
        }]
      });
      const mapped = mapApiWorkflowToDefinition(workflow, undefined, workspace.id);
      setWorkflows((current) => [mapped, ...current]);
      setSelectedWorkflowId(mapped.id);
      setActiveTab('chat');
      setCreateDraft(createWorkflowDraft());
      setCreatePanelOpen(false);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Unable to create workflow');
    } finally {
      setCreatingWorkflow(false);
    }
  }

  async function addWorkflowMcpServer(): Promise<void> {
    const name = mcpServerDraft.name.trim();
    if (!name) return;
    setMcpServerError('');
    setCreatingMcpServer(true);
    try {
      const server = await createWorkflowMcpServer(workspace.id, {
        name,
        type: mcpServerDraft.type,
        baseUrl: mcpServerDraft.baseUrl.trim() || undefined,
        command: mcpServerDraft.command.trim() || undefined,
        tools: splitLines(mcpServerDraft.tools)
      });
      setWorkflowMcpServers((current) => uniqueValues([...current.map((item) => item.id), server.id])
        .map((id) => id === server.id ? server : current.find((item) => item.id === id))
        .filter((item): item is WorkflowMcpServer => Boolean(item)));
      setWorkflowOptions((current) => ({
        ...current,
        mcpServers: uniqueValues([...current.mcpServers.map((option) => option.value), server.id])
          .map((value) => ({ value, label: value }))
      }));
      setMcpServerDraft(createMcpServerDraft());
    } catch (error) {
      setMcpServerError(error instanceof Error ? error.message : 'Unable to add MCP server');
    } finally {
      setCreatingMcpServer(false);
    }
  }



  return {
    addWorkflowMcpServer,
    addWorkflowTag,
    cancelEditingScopeTab,
    cancelEditingWorkflow,
    closeCreateWorkflowPanel,
    createNewWorkflow,
    decideApproval,
    deleteSelectedWorkflow,
    launchSelectedWorkflow,
    removeWorkflowTag,
    saveWorkflowDefinition,
    saveWorkflowScope,
    setStepScopeValue,
    setWorkflowScopeValue,
    startEditingScopeTab,
    startEditingWorkflow,
    stopWorkflowRun,
    toggleRunLogs,
    toggleWorkflowActive,
    updateWorkflowEditDraft
  };
}
