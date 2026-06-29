import React, { useMemo, useState } from 'react';
import { Button } from '@/components/common/Button';
import { SegmentedTabs, Textarea, TextInput } from '@/components/common/ComponentVocabulary';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ICONS } from '@/constants';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ProjectMember, Workspace } from '@/types';
import {
  createDefaultWorkflowDefinitions,
  filterWorkflowDefinitions,
  getWorkflowLaunchBlocker,
  getWorkflowTabLabel,
  type WorkflowDefinition,
  type WorkflowRunMessage,
  type WorkflowTab
} from '@/pages/workflows/workflowModel';
import {
  listWorkflowOptions,
  listWorkflowRunEvents,
  listWorkflowRunApprovals,
  listWorkflowSessions,
  listWorkspaceWorkflows,
  type WorkflowApiDefinition,
  type WorkflowOptionsCatalog,
  type WorkflowRunApproval,
  type WorkflowRunEvent
} from '@/services/control-plane/workflowApi';
import {
  ScopeSwitch,
  createAgentAssignmentDraft,
  createFallbackWorkflowOptions,
  createScopeDraft,
  createWorkflowDraft,
  createWorkflowEditDraft,
  isRunActive,
  mapApiWorkflowToDefinition,
  mapWorkflowRunSummary,
  mergeWorkflowRunsWithLocalDispatches,
  normalizeWorkflowOptionsCatalog,
  tabs,
  uniqueValues,
  workflowStatusTone,
  type AgentAssignmentDraft,
  type CreateWorkflowDraft,
  type ScopeDraft,
  type WorkflowEditDraft
} from '@/pages/workflows/workflowPageHelpers';
import { useWorkspaceWorkflowActions } from '@/pages/workflows/useWorkspaceWorkflowActions';
import {
  AgentAssignmentList,
  WorkflowCreateDrawer,
  WorkflowDeleteDialog,
  WorkflowLaunchReadiness,
  WorkflowLibraryList,
  WorkflowLoadFallbackNotice,
  WorkflowRouteHeader,
  WorkflowScopeRow,
  WorkflowSection,
  WorkflowStepPath,
  WorkflowTabPanel,
  workflowTabIcons,
  type CreateWorkflowStep
} from '@/pages/WorkspaceWorkflowsPage.components';
import { WorkflowAgentsPanel, WorkflowCapabilitiesPanel, WorkflowRunsPanel } from '@/pages/WorkspaceWorkflowsPage.panels';
import { WorkflowScheduleCreateDrawer } from '@/pages/WorkflowScheduleCreateDrawer';

interface WorkspaceWorkflowsPageProps {
  workspace: Workspace;
}

type PendingWorkflowRuns = Record<string, WorkflowDefinition['runs']>; type PendingWorkflowRunsUpdate = PendingWorkflowRuns | ((current: PendingWorkflowRuns) => PendingWorkflowRuns);

export const WorkspaceWorkflowsPage: React.FC<WorkspaceWorkflowsPageProps> = ({ workspace }) => {
  const fallbackWorkflows = useMemo(() => createDefaultWorkflowDefinitions(workspace.id), [workspace.id]);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>(fallbackWorkflows);
  const [workflowOptions, setWorkflowOptions] = useState<WorkflowOptionsCatalog>(() => createFallbackWorkflowOptions(fallbackWorkflows));
  const [workflowOwnerMembers, setWorkflowOwnerMembers] = useState<ProjectMember[]>(workspace.members || []);
  const workflowOwnerLabelsByUserId = useMemo(() => new Map(
    workflowOwnerMembers
      .filter((member) => member.userId)
      .map((member) => [member.userId as string, member.name || member.email])
  ), [workflowOwnerMembers]);
  const [query, setQuery] = useState('');
  const workflowSearchTags = useMemo(() => uniqueValues(workflows.flatMap((workflow) => workflow.tags)), [workflows]);
  const filteredWorkflows = useMemo(() => filterWorkflowDefinitions(workflows, query), [query, workflows]);
  const visibleWorkflows = filteredWorkflows;
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(workflows[0]?.id || '');
  const selectedWorkflow = visibleWorkflows.find((workflow) => workflow.id === selectedWorkflowId) || visibleWorkflows[0] || filteredWorkflows[0] || workflows[0];
  const [activeTab, setActiveTab] = useState<WorkflowTab>('overview');
  const [, setIsEditingScopeTab] = useState<'' | 'capabilities'>('');
  const [workflowLoadError, setWorkflowLoadError] = useState('');
  const [workflowCatalogReady, setWorkflowCatalogReady] = useState(false);
  const [workflowCatalogReloadKey, setWorkflowCatalogReloadKey] = useState(0);
  const [workflowMessage, setWorkflowMessage] = useState('');
  const [workflowSessionIds, setWorkflowSessionIds] = useState<Record<string, string>>({});
  const [compiledScopes, setCompiledScopes] = useState<Record<string, Record<string, unknown>>>({});
  const [launchingWorkflowId, setLaunchingWorkflowId] = useState('');
  const [launchError, setLaunchError] = useState('');
  const [launchResult, setLaunchResult] = useState<{ workflowId: string; runId: string; workflowRunId: string } | null>(null);
  const [pendingWorkflowRuns, setPendingWorkflowRunsState] = useState<Record<string, WorkflowDefinition['runs']>>({});
  const pendingWorkflowRunsRef = React.useRef(pendingWorkflowRuns);
  const [approvalRecords, setApprovalRecords] = useState<Record<string, WorkflowRunApproval[]>>({});
  const [approvalAction, setApprovalAction] = useState('');
  const [approvalError, setApprovalError] = useState('');
  const [runEventsByRunId, setRunEventsByRunId] = useState<Record<string, WorkflowRunEvent[]>>({});
  const [expandedRunLogId, setExpandedRunLogId] = useState('');
  const [runLogLoadingId, setRunLogLoadingId] = useState('');
  const [runLogError, setRunLogError] = useState('');
  const [cancelRunAction, setCancelRunAction] = useState('');
  const [cancelRunError, setCancelRunError] = useState('');
  const [workflowRunMessages, setWorkflowRunMessages] = useState<Record<string, WorkflowRunMessage[]>>({});
  const [workflowRunMessageDrafts, setWorkflowRunMessageDrafts] = useState<Record<string, string>>({});
  const [workflowRunMessageSendingId, setWorkflowRunMessageSendingId] = useState('');
  const [workflowRunMessageErrorByRunId, setWorkflowRunMessageErrorByRunId] = useState<Record<string, string>>({});
  const [scopeDrafts, setScopeDrafts] = useState<Record<string, ScopeDraft>>({});
  const [scopeSaveError, setScopeSaveError] = useState<{ tab: 'capabilities'; message: string } | null>(null);
  const [scopeSaveResult, setScopeSaveResult] = useState<{ tab: 'capabilities'; message: string } | null>(null);
  const [, setSavingScope] = useState('');
  const [agentAssignmentDrafts, setAgentAssignmentDrafts] = useState<Record<string, AgentAssignmentDraft>>({});
  const [editingAgentAssignmentsId, setEditingAgentAssignmentsId] = useState('');
  const [agentAssignmentError, setAgentAssignmentError] = useState('');
  const [agentAssignmentResult, setAgentAssignmentResult] = useState('');
  const [savingAgentAssignmentsId, setSavingAgentAssignmentsId] = useState('');
  const [newWorkflowTag, setNewWorkflowTag] = useState('');
  const [createPanelOpen, setCreatePanelOpen] = useState(false);
  const [createWorkflowStep, setCreateWorkflowStep] = useState<CreateWorkflowStep>(1);
  const [createDraft, setCreateDraft] = useState<CreateWorkflowDraft>(() => createWorkflowDraft());
  const [createError, setCreateError] = useState('');
  const [creatingWorkflow, setCreatingWorkflow] = useState(false);
  const [editingWorkflowId, setEditingWorkflowId] = useState('');
  const [workflowEditDrafts, setWorkflowEditDrafts] = useState<Record<string, WorkflowEditDraft>>({});
  const [workflowUpdateError, setWorkflowUpdateError] = useState('');
  const [workflowUpdateResult, setWorkflowUpdateResult] = useState('');
  const [updatingWorkflowId, setUpdatingWorkflowId] = useState('');
  const [deleteWorkflowId, setDeleteWorkflowId] = useState('');
  const [deleteWorkflowConfirmation, setDeleteWorkflowConfirmation] = useState('');
  const [deletingWorkflowId, setDeletingWorkflowId] = useState('');
  const [deleteWorkflowError, setDeleteWorkflowError] = useState('');
  const [scheduleWorkflowId, setScheduleWorkflowId] = useState('');
  const canManageWorkflowScope = Boolean(workspace.permissions?.manage_workflows);
  function setPendingWorkflowRuns(update: PendingWorkflowRunsUpdate): void {
    const next = typeof update === 'function' ? update(pendingWorkflowRunsRef.current) : update;
    pendingWorkflowRunsRef.current = next;
    setPendingWorkflowRunsState(next);
  }

  React.useEffect(() => {
    let mounted = true;
    setWorkflowOwnerMembers(workspace.members || []);
    if (workspace.permissions?.read_members !== true) {
      return () => { mounted = false; };
    }
    controlPlaneApi.listWorkspaceMembers(workspace.id, { limit: 50 })
      .then((page) => {
        if (mounted) setWorkflowOwnerMembers(page.items);
      })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, [workspace.id, workspace.members, workspace.permissions?.read_members]);

  React.useEffect(() => {
    let mounted = true;
    setWorkflows(fallbackWorkflows);
    setWorkflowOptions(createFallbackWorkflowOptions(fallbackWorkflows));
    setSelectedWorkflowId((current) => current || fallbackWorkflows[0]?.id || '');
    setWorkflowLoadError('');
    setWorkflowCatalogReady(false);
    listWorkspaceWorkflows(workspace.id)
      .then((items) => {
        if (!mounted) return;
        const mapped = items.map((item) => {
          const workflow = mapApiWorkflowToDefinition(
            item,
            fallbackWorkflows.find((fallbackWorkflow) => fallbackWorkflow.id === item.id),
            workspace.id,
            workflowOptions,
            workflowOwnerLabelsByUserId
          );
          const pendingRuns = pendingWorkflowRunsRef.current[workflow.id] || [];
          const runs = mergeWorkflowRunsWithLocalDispatches(workflow.runs, pendingRuns);
          return pendingRuns.length > 0
            ? { ...workflow, runs, lastRun: runs[0]?.startedAt || workflow.lastRun }
            : workflow;
        });
        if (mapped.length > 0) {
          setWorkflows(mapped);
          setSelectedWorkflowId((current) => mapped.some((workflow) => workflow.id === current) ? current : mapped[0].id);
        }
        setWorkflowCatalogReady(true);
      })
      .catch((error) => {
        if (!mounted) return;
        setWorkflowLoadError(error instanceof Error ? error.message : 'Unable to load workflow catalog');
        setWorkflowCatalogReady(true);
      });
    return () => { mounted = false; };
  }, [fallbackWorkflows, workspace.id, workflowCatalogReloadKey, workflowOwnerLabelsByUserId]);
  React.useEffect(() => {
    let mounted = true;
    listWorkflowOptions(workspace.id)
      .then((catalog) => {
        if (mounted) setWorkflowOptions(normalizeWorkflowOptionsCatalog(catalog, createFallbackWorkflowOptions(fallbackWorkflows)));
      })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, [workspace.id]);
  React.useEffect(() => {
    if (!selectedWorkflow) return;
    setWorkflowMessage(selectedWorkflow.starterPrompt);
    setScopeDrafts((current) => ({
      ...current,
      [selectedWorkflow.id]: current[selectedWorkflow.id] || createScopeDraft(selectedWorkflow)
    }));
    setScopeSaveError(null);
    setScopeSaveResult(null);
    setIsEditingScopeTab('');
    setAgentAssignmentDrafts((current) => ({
      ...current,
      [selectedWorkflow.id]: current[selectedWorkflow.id] || createAgentAssignmentDraft(selectedWorkflow)
    }));
    setAgentAssignmentError('');
    setAgentAssignmentResult('');
    setEditingAgentAssignmentsId('');
  }, [selectedWorkflow?.id, workflowOptions]);

  React.useEffect(() => {
    if (!workflowCatalogReady || !selectedWorkflow) return;
    let mounted = true;
    listWorkflowSessions(workspace.id, selectedWorkflow.id)
      .then((sessions) => {
        if (!mounted) return;
        const serverRuns = sessions.flatMap((session) => session.runs || []).map(mapWorkflowRunSummary);
        const pendingRuns = pendingWorkflowRunsRef.current[selectedWorkflow.id] || [];
        const runs = mergeWorkflowRunsWithLocalDispatches(serverRuns, pendingRuns);
        if (pendingRuns.length > 0) {
          const serverRunKeys = new Set(serverRuns.flatMap((run) => [run.id, run.runId].filter((value): value is string => Boolean(value))));
          setPendingWorkflowRuns((current) => {
            const remainingRuns = (current[selectedWorkflow.id] || []).filter((run) => (
              [run.id, run.runId].filter(Boolean).every((key) => !serverRunKeys.has(key))
            ));
            if (remainingRuns.length === (current[selectedWorkflow.id] || []).length) return current;
            const next = { ...current };
            if (remainingRuns.length > 0) next[selectedWorkflow.id] = remainingRuns;
            else delete next[selectedWorkflow.id];
            return next;
          });
        }
        setWorkflows((current) => current.map((workflow) => workflow.id === selectedWorkflow.id
          ? { ...workflow, runs, lastRun: runs[0]?.startedAt || 'No runs yet' }
          : workflow));
      })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, [selectedWorkflow?.id, workspace.id, workflowCatalogReady]);

  const selectedRunIds = useMemo(() => (
    selectedWorkflow?.runs.map((run) => run.runId).filter((runId): runId is string => Boolean(runId)) || []
  ), [selectedWorkflow?.runs]);
  const selectedRunIdsKey = selectedRunIds.join('|');

  React.useEffect(() => {
    if (selectedRunIds.length === 0) return;
    let mounted = true;
    Promise.all(selectedRunIds.map(async (runId) => {
      const approvals = await listWorkflowRunApprovals(runId).catch(() => undefined);
      return { runId, approvals };
    })).then((results) => {
      if (!mounted) return;
      setApprovalRecords((current) => {
        const next = { ...current };
        for (const result of results) {
          if (result.approvals) next[result.runId] = result.approvals;
        }
        return next;
      });
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, [selectedRunIdsKey]);

  React.useEffect(() => {
    if (!expandedRunLogId || !selectedWorkflow) return;
    const expandedRun = selectedWorkflow.runs.find((run) => run.runId === expandedRunLogId || run.id === expandedRunLogId);
    if (!expandedRun || !isRunActive(expandedRun.status)) return;
    let cancelled = false;
    const refresh = async () => {
      const events = await listWorkflowRunEvents(expandedRunLogId).catch(() => undefined);
      if (!cancelled && events) {
        setRunEventsByRunId((current) => ({ ...current, [expandedRunLogId]: events }));
      }
    };
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 2500);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [expandedRunLogId, selectedWorkflow?.runs]);

  React.useEffect(() => {
    if (!selectedWorkflow || filteredWorkflows.some((workflow) => workflow.id === selectedWorkflow.id)) return;
    setSelectedWorkflowId(filteredWorkflows[0]?.id || workflows[0]?.id || '');
  }, [filteredWorkflows, selectedWorkflow, workflows]);

  const selectedCompiledScope = selectedWorkflow ? compiledScopes[selectedWorkflow.id] : undefined;
  const selectedAccessTools = Array.isArray(selectedCompiledScope?.tools)
    ? selectedCompiledScope.tools.filter((tool): tool is string => typeof tool === 'string')
    : selectedWorkflow?.allowedTools || [];
  const selectedScopeDraft = selectedWorkflow
    ? scopeDrafts[selectedWorkflow.id] || createScopeDraft(selectedWorkflow)
    : undefined;
  const selectedAgentAssignmentDraft = selectedWorkflow
    ? agentAssignmentDrafts[selectedWorkflow.id] || createAgentAssignmentDraft(selectedWorkflow)
    : undefined;
  const isEditingAgentAssignments = Boolean(selectedWorkflow && editingAgentAssignmentsId === selectedWorkflow.id);
  const activeAgentOptions = workflowOptions.agents.filter((agent) => !agent.disabled || agent.value === selectedAgentAssignmentDraft?.primaryAgentId || selectedAgentAssignmentDraft?.supportingAgentIds.includes(agent.value));
  const supportingAgentOptions = activeAgentOptions.filter((agent) => agent.value !== selectedAgentAssignmentDraft?.primaryAgentId);
  const launchBlocker = selectedWorkflow
    ? getWorkflowLaunchBlocker(selectedWorkflow, workflowMessage, workspace.permissions)
    : 'Select a workflow before launching.';
  const isEditingWorkflow = Boolean(selectedWorkflow && editingWorkflowId === selectedWorkflow.id);
  const selectedWorkflowEditDraft = selectedWorkflow
    ? workflowEditDrafts[selectedWorkflow.id] || createWorkflowEditDraft(selectedWorkflow)
    : undefined;
  const deleteTargetWorkflow = deleteWorkflowId
    ? workflows.find((workflow) => workflow.id === deleteWorkflowId)
    : undefined;
  const closeDeleteWorkflowDialog = () => {
    if (deletingWorkflowId) return;
    setDeleteWorkflowId('');
    setDeleteWorkflowConfirmation('');
  };
  const workflowActions = useWorkspaceWorkflowActions({
    workspace, workflows, setWorkflows,
    selectedWorkflow, selectedWorkflowEditDraft, workflowMessage, workflowSessionIds, setWorkflowSessionIds,
    setCompiledScopes, setLaunchError, setLaunchingWorkflowId, setLaunchResult, setActiveTab, setApprovalRecords, setApprovalError,
    setPendingWorkflowRuns,
    setApprovalAction, expandedRunLogId, setExpandedRunLogId, runEventsByRunId, setRunEventsByRunId,
    setRunLogError, setRunLogLoadingId, setCancelRunError, setCancelRunAction, setScopeSaveResult,
    workflowRunMessageDrafts, setWorkflowRunMessageDrafts, setWorkflowRunMessages,
    setWorkflowRunMessageSendingId, setWorkflowRunMessageErrorByRunId,
     setScopeDrafts, setScopeSaveError, setIsEditingScopeTab, scopeDrafts, setSavingScope, setNewWorkflowTag,
     newWorkflowTag, setWorkflowEditDrafts, setWorkflowUpdateError, setWorkflowUpdateResult, setDeleteWorkflowError,
     setDeleteWorkflowId, setEditingWorkflowId, setUpdatingWorkflowId, setSelectedWorkflowId, setDeletingWorkflowId,
      createDraft, setCreateDraft, setCreatePanelOpen, setCreateError, setCreatingWorkflow,
      canManageWorkflowScope, launchBlocker, workflowOptions, agentAssignmentDrafts, setAgentAssignmentDrafts,
     setEditingAgentAssignmentsId, setAgentAssignmentError, setAgentAssignmentResult, setSavingAgentAssignmentsId,
     ownerLabelsByUserId: workflowOwnerLabelsByUserId
  });
  const workflowTabItems = tabs.map((tab) => {
    const TabIcon = workflowTabIcons[tab];
    return {
      value: tab,
      label: getWorkflowTabLabel(tab),
      icon: <TabIcon className="h-3.5 w-3.5" aria-hidden="true" />
    };
  });

  return (
    <div className="min-h-0 w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
      <WorkflowRouteHeader
        canManageWorkflowScope={canManageWorkflowScope}
        onCreateClick={() => { setCreatePanelOpen(true); setCreateWorkflowStep(1); }}
      />

      {workflowLoadError && <WorkflowLoadFallbackNotice onRetry={() => setWorkflowCatalogReloadKey((value) => value + 1)} />}

      {createPanelOpen && (
        <WorkflowCreateDrawer
          createWorkflowStep={createWorkflowStep}
          setCreateWorkflowStep={setCreateWorkflowStep}
          createDraft={createDraft}
          setCreateDraft={setCreateDraft}
          createError={createError}
          creatingWorkflow={creatingWorkflow}
          canManageWorkflowScope={canManageWorkflowScope}
          workflowOptions={workflowOptions}
          onClose={workflowActions.closeCreateWorkflowPanel}
          onCreate={() => void workflowActions.createNewWorkflow()}
        />
      )}

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
        <WorkflowLibraryList
          query={query}
          setQuery={setQuery}
          workflowSearchTags={workflowSearchTags}
          workflows={workflows}
          visibleWorkflows={visibleWorkflows}
          selectedWorkflow={selectedWorkflow}
          setSelectedWorkflowId={setSelectedWorkflowId}
          setActiveTab={setActiveTab}
        />

        {selectedWorkflow && (
          <section className="min-w-0 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
            <div className="border-b border-ui-border bg-ui-bg px-5 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={workflowStatusTone(selectedWorkflow.status)}>{selectedWorkflow.status}</StatusBadge>
                    <span className="type-caption font-semibold text-ui-text-muted">{selectedWorkflow.policy.mode.replace('_', ' ')}</span>
                  </div>
                  <h2 className="mt-3 type-section-title break-words [overflow-wrap:anywhere]">{selectedWorkflow.name}</h2>
                  <p className="type-body mt-2 max-w-3xl break-words text-ui-text-muted [overflow-wrap:anywhere]">{selectedWorkflow.description}</p>
                  {selectedWorkflow.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2" aria-label="Selected workflow tags">
                      {selectedWorkflow.tags.map((tag) => (
                        <span key={tag} className="inline-flex min-h-7 items-center rounded-md border border-ui-border bg-ui-surface px-2.5 text-xs font-bold text-ui-text-muted">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-start gap-2 lg:items-end">
                  <Button variant="accent" size="md" onClick={() => void workflowActions.launchSelectedWorkflow()} disabled={launchingWorkflowId === selectedWorkflow.id || Boolean(launchBlocker)} title={launchBlocker || undefined} aria-describedby={launchBlocker ? 'workflow-launch-blocker' : undefined}>
                    <ICONS.Send className="h-4 w-4" aria-hidden="true" />
                    {launchingWorkflowId === selectedWorkflow.id ? 'Starting...' : 'Launch workflow'}
                  </Button>
                  <Button variant="secondary" size="md" onClick={() => setScheduleWorkflowId(selectedWorkflow.id)} disabled={!canManageWorkflowScope}>
                    <ICONS.Clock className="h-4 w-4" aria-hidden="true" />
                    Schedule workflow
                  </Button>
                  {launchBlocker && <span id="workflow-launch-blocker" className="max-w-64 text-left text-xs font-semibold text-ui-text-muted lg:text-right">Resolve this before launch: {launchBlocker}</span>}
                </div>
              </div>
            </div>

            <WorkflowLaunchReadiness workflow={selectedWorkflow} launchBlocker={launchBlocker} selectedAccessTools={selectedAccessTools} compiled={Boolean(selectedCompiledScope)} />

            <div className="bg-ui-surface px-3">
              <SegmentedTabs<WorkflowTab>
                activeValue={activeTab}
                ariaLabel="Workflow section tabs"
                className="flex flex-wrap gap-0 overflow-visible border-b border-ui-border"
                idBase="workflow-section"
                items={workflowTabItems}
                onValueChange={setActiveTab}
              />
            </div>

            <div className="grid gap-5 bg-ui-bg/45 p-4 sm:p-5">
              {activeTab === 'overview' && (
                <WorkflowTabPanel tab="overview" title="Overview">
                  <WorkflowSection title="Workflow path">
                    <WorkflowStepPath steps={selectedWorkflow.steps} primaryAgent={selectedWorkflow.primaryAgent} supportingAgents={selectedWorkflow.supportingAgents} />
                  </WorkflowSection>
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
                    <WorkflowSection
                      title="Assigned agents"
                      action={(
                        <Button type="button" variant="secondary" size="sm" onClick={() => setActiveTab('agents')}>
                          <ICONS.Bot className="h-4 w-4" aria-hidden="true" />
                          Review agents
                        </Button>
                      )}
                    >
                      <AgentAssignmentList
                        className="mt-4"
                        primaryAgent={selectedWorkflow.primaryAgent}
                        supportingAgents={selectedWorkflow.supportingAgents}
                        supportingLabel="Supporting agent"
                      />
                    </WorkflowSection>
                    <WorkflowSection title="Capability review">
                      <dl className="mt-4 grid gap-3 text-sm">
                        <div className="flex justify-between gap-3"><dt className="text-ui-text-muted">Runtime access</dt><dd className="font-semibold text-ui-text">{selectedWorkflow.allowedTools.length} tools</dd></div>
                        <div className="flex justify-between gap-3"><dt className="text-ui-text-muted">Workflow gate</dt><dd className="font-semibold text-ui-text">{selectedWorkflow.disabledCapabilities.length} blocked</dd></div>
                        <div className="flex justify-between gap-3"><dt className="text-ui-text-muted">Approvals</dt><dd className="font-semibold text-ui-text">{selectedWorkflow.policy.approvals.length}</dd></div>
                      </dl>
                    </WorkflowSection>
                  </div>
                  <WorkflowSection title="Control message">
                    <Textarea aria-label="Control message" value={workflowMessage} onChange={(event) => setWorkflowMessage(event.target.value)} className="mt-3 min-h-32" />
                  </WorkflowSection>
                  {selectedCompiledScope && <div className="rounded-md border border-accent/25 bg-accent-soft p-3 text-xs font-semibold text-accent-strong">{selectedAccessTools.length} tools compiled for this run.</div>}
                  {launchError && <div className="rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">{launchError}</div>}
                  {launchResult?.workflowId === selectedWorkflow.id && <div className="rounded-md border border-status-success/30 bg-status-success-soft p-3 text-xs font-semibold text-status-success-text">Run {launchResult.workflowRunId || launchResult.runId} dispatched.</div>}
                </WorkflowTabPanel>
              )}

              {activeTab === 'agents' && (
                <WorkflowAgentsPanel
                  workflow={selectedWorkflow}
                  selectedAgentAssignmentDraft={selectedAgentAssignmentDraft}
                  activeAgentOptions={activeAgentOptions}
                  supportingAgentOptions={supportingAgentOptions}
                  isEditingAgentAssignments={isEditingAgentAssignments}
                  canManageWorkflowScope={canManageWorkflowScope}
                  savingAgentAssignmentsId={savingAgentAssignmentsId}
                  agentAssignmentError={agentAssignmentError}
                  agentAssignmentResult={agentAssignmentResult}
                  workflowActions={workflowActions}
                />
              )}

              {activeTab === 'targets' && (
                <WorkflowTabPanel tab="targets" title="Targets">
                  <WorkflowSection title="Target context">
                    <dl className="mt-2 divide-y divide-ui-border">
                      <WorkflowScopeRow label="Target selection" values={selectedWorkflow.targetSelection} emptyLabel="No target selector configured." />
                      <WorkflowScopeRow label="Context grants" values={selectedWorkflow.contextGrants} emptyLabel="No context grants configured." />
                    </dl>
                  </WorkflowSection>
                </WorkflowTabPanel>
              )}

              {activeTab === 'runs' && (
                <WorkflowRunsPanel
                  workflow={selectedWorkflow}
                  approvalError={approvalError} runLogError={runLogError} cancelRunError={cancelRunError}
                  approvalRecords={approvalRecords} expandedRunLogId={expandedRunLogId} runEventsByRunId={runEventsByRunId}
                  cancelRunAction={cancelRunAction} workflowActions={workflowActions} approvalAction={approvalAction}
                  workflowSessionId={workflowSessionIds[selectedWorkflow.id] || ''}
                  runMessagesByRunId={workflowRunMessages}
                  runMessageDrafts={workflowRunMessageDrafts}
                  runMessageSendingId={workflowRunMessageSendingId}
                  runMessageErrorByRunId={workflowRunMessageErrorByRunId}
                  setExpandedRunLogId={setExpandedRunLogId}
                />
              )}

              {activeTab === 'capabilities' && selectedScopeDraft && (
                <WorkflowCapabilitiesPanel
                  workflow={selectedWorkflow}
                  scopeDraft={selectedScopeDraft}
                  scopeSaveError={scopeSaveError}
                  scopeSaveResult={scopeSaveResult}
                />
              )}

              {activeTab === 'settings' && (
                <WorkflowTabPanel
                  tab="settings"
                  title="Settings"
                >
                  {(workflowUpdateError || workflowUpdateResult || deleteWorkflowError) && <div className={`rounded-md border px-3 py-2 text-xs font-semibold ${workflowUpdateError || deleteWorkflowError ? 'border-status-danger/30 bg-status-danger-soft text-status-danger-text' : 'border-status-success/30 bg-status-success-soft text-status-success-text'}`}>{workflowUpdateError || deleteWorkflowError || workflowUpdateResult}</div>}
                  <WorkflowSection title="Availability">
                    <div className="mt-3 flex items-center justify-between gap-4 rounded-md border border-ui-border bg-ui-bg px-4 py-3">
                      <div>
                        <h4 className="type-row-title">{selectedWorkflow.status === 'active' ? 'Active' : 'Inactive'}</h4>
                        <p className="type-caption mt-1 text-ui-text-muted">Toggle availability for new runs.</p>
                      </div>
                      <ScopeSwitch checked={selectedWorkflow.status === 'active'} disabled={!canManageWorkflowScope || updatingWorkflowId === selectedWorkflow.id} label="Toggle workflow active state" onChange={(active) => void workflowActions.toggleWorkflowActive(selectedWorkflow, active)} />
                    </div>
                  </WorkflowSection>
                  <WorkflowSection
                    title="Starter prompt"
                    action={!isEditingWorkflow && (
                      <Button variant="secondary" size="sm" onClick={() => workflowActions.startEditingWorkflow(selectedWorkflow)} disabled={!canManageWorkflowScope} aria-label="Edit workflow details">
                        Edit
                      </Button>
                    )}
                  >
                    <div className="mt-2 grid gap-3">
                      {isEditingWorkflow && selectedWorkflowEditDraft ? (
                        <>
                          <label className="block">
                            <span className="type-micro-label text-ui-text-muted">Workflow name</span>
                            <TextInput value={selectedWorkflowEditDraft.name} onChange={(event) => workflowActions.updateWorkflowEditDraft(selectedWorkflow.id, { name: event.target.value })} className="mt-2" />
                          </label>
                          <label className="block">
                            <span className="type-micro-label text-ui-text-muted">Description</span>
                            <TextInput value={selectedWorkflowEditDraft.description} onChange={(event) => workflowActions.updateWorkflowEditDraft(selectedWorkflow.id, { description: event.target.value })} className="mt-2" />
                          </label>
                          <label className="block">
                            <span className="type-micro-label text-ui-text-muted">Default run message</span>
                            <Textarea value={selectedWorkflowEditDraft.starterPrompt} onChange={(event) => workflowActions.updateWorkflowEditDraft(selectedWorkflow.id, { starterPrompt: event.target.value })} className="mt-2 min-h-32" />
                            <span className="type-caption mt-2 block text-ui-text-muted">The starter prompt is copied into the launch message for new workflow sessions.</span>
                          </label>
                          <div className="flex gap-2">
                            <Button variant="tertiary" size="sm" onClick={() => workflowActions.cancelEditingWorkflow(selectedWorkflow)}>Cancel</Button>
                            <Button variant="primary" size="sm" onClick={() => void workflowActions.saveWorkflowDefinition()} disabled={!canManageWorkflowScope || updatingWorkflowId === selectedWorkflow.id || !selectedWorkflowEditDraft.name.trim()}>Save workflow</Button>
                          </div>
                        </>
                      ) : (
                        <div className="rounded-md border border-ui-border bg-ui-bg px-4 py-3">
                          <div className="type-micro-label text-ui-text-muted">Default run message</div>
                          <p className="mt-2 text-sm font-semibold leading-6 text-ui-text">{selectedWorkflow.starterPrompt}</p>
                          <p className="type-caption mt-2 text-ui-text-muted">The starter prompt is copied into the launch message for new workflow sessions.</p>
                        </div>
                      )}
                    </div>
                  </WorkflowSection>
                  <WorkflowSection title="Workflow tags">
                    <div className="mt-3 flex flex-wrap gap-2">{selectedWorkflow.tags.map((tag) => (
                      <span key={tag} className="inline-flex min-h-11 items-center gap-1 rounded-md border border-ui-border bg-ui-bg pl-2.5 pr-1 text-xs font-bold text-ui-text-muted sm:min-h-8">
                        <span aria-hidden="true">{tag}</span>
                        <button type="button" aria-label={`Remove workflow tag ${tag}`} onClick={() => workflowActions.removeWorkflowTag(selectedWorkflow.id, tag)} className="rounded p-2 text-ui-text-muted transition-colors hover:bg-status-danger-soft hover:text-status-danger-text focus:outline-none focus-visible:ring-2 focus-visible:ring-status-danger/25 sm:p-1">
                          <ICONS.X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </span>
                    ))}</div>
                    <div className="mt-3 flex gap-2"><TextInput value={newWorkflowTag} onChange={(event) => setNewWorkflowTag(event.target.value)} placeholder="Add tag" className="min-h-10 flex-1" /><Button variant="secondary" size="sm" onClick={() => workflowActions.addWorkflowTag(selectedWorkflow.id)} disabled={!newWorkflowTag.trim()}>Add tag</Button></div>
                  </WorkflowSection>
                  <section aria-label="Delete workflow" className="min-w-0 border-t border-status-danger/25 pt-5">
                    <div className="flex flex-col gap-3 rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <h4 className="type-row-title">Delete workflow</h4>
                        <p className="type-caption mt-1 max-w-2xl">Permanently removes this user-authored workflow definition. Past runs remain in audit history.</p>
                      </div>
                      <Button variant="danger" size="sm" onClick={() => { setDeleteWorkflowId(selectedWorkflow.id); setDeleteWorkflowConfirmation(''); }} disabled={!canManageWorkflowScope || selectedWorkflow.source !== 'user'}>Delete workflow</Button>
                    </div>
                  </section>
                </WorkflowTabPanel>
              )}
            </div>
          </section>
        )}
      </div>
      <WorkflowDeleteDialog
        deleteTargetWorkflow={deleteTargetWorkflow}
        deleteWorkflowConfirmation={deleteWorkflowConfirmation}
        deleteWorkflowError={deleteWorkflowError}
        deletingWorkflowId={deletingWorkflowId}
        onClose={closeDeleteWorkflowDialog}
        onDelete={(workflow) => void workflowActions.deleteSelectedWorkflow(workflow)}
        setDeleteWorkflowConfirmation={setDeleteWorkflowConfirmation}
      />
      <WorkflowScheduleCreateDrawer workspaceId={workspace.id} scheduleWorkflow={workflows.find((workflow) => workflow.id === scheduleWorkflowId)} onClose={() => setScheduleWorkflowId('')} />
    </div>
  );
};
