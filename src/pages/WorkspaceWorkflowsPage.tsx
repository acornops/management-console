import React, { useMemo, useState } from 'react';
import { Button } from '@/components/common/Button';
import { PageShell } from '@/components/common/PageComposition';
import { SegmentedTabs, Textarea, TextInput } from '@/components/common/ComponentVocabulary';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ICONS } from '@/constants';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ProjectMember, Workspace } from '@/types';
import { createDefaultAgentDefinitions, type AgentDefinition } from '@/pages/agents/agentModel';
import { mapApiAgent } from '@/pages/WorkspaceAgentsPage.helpers';
import { createDefaultWorkflowDefinitions, findWorkflowByRouteTarget, filterWorkflowDefinitions, getWorkflowLaunchBlocker, getWorkflowRouteQuery, getWorkflowRouteSelectionTarget, getWorkflowTabLabel, type WorkflowDefinition, type WorkflowRunMessage, type WorkflowTab } from '@/pages/workflows/workflowModel';
import { listWorkflowOptions, listWorkflowRunEvents, listWorkflowRunApprovals, listWorkflowSessions, listWorkspaceWorkflows, type WorkflowApiDefinition, type WorkflowOptionsCatalog, type WorkflowRunApproval, type WorkflowRunEvent } from '@/services/control-plane/workflowApi';
import { listWorkspaceAgents } from '@/services/control-plane/agentApi';
import { ScopeSwitch, agentIdsFromDraft, createAgentSelectionDraft, createFallbackWorkflowOptions, createScopeDraft, createWorkflowDraft, createWorkflowEditDraft, getWorkflowScopeOptionsForAgents, isRunActive, mapApiWorkflowToDefinition, mapWorkflowRunSummary, mergeWorkflowRunsWithLocalDispatches, normalizeWorkflowOptionsCatalog, tabs, uniqueValues, workflowStatusTone, type AgentSelectionDraft, type CreateWorkflowDraft, type ScopeDraft, type WorkflowEditDraft } from '@/pages/workflows/workflowPageHelpers';
import { useWorkspaceWorkflowActions } from '@/pages/workflows/useWorkspaceWorkflowActions';
import { AgentAssignmentList, WorkflowDeleteDialog, WorkflowLaunchActions, WorkflowLibraryList, WorkflowLoadFallbackNotice, WorkflowModeBadge, WorkflowRouteHeader, WorkflowSection, WorkflowTabPanel, workflowTabIcons } from '@/pages/WorkspaceWorkflowsPage.components';
import { WorkflowCreateDrawer, type CreateWorkflowStep } from '@/pages/WorkspaceWorkflowsPage.createDrawer';
import { getWorkflowLaunchInputState, WorkflowPromptEditor } from '@/pages/WorkspaceWorkflowsPage.launchFields';
import { WorkflowAgentsPanel, WorkflowCapabilitiesPanel, WorkflowRunsPanel } from '@/pages/WorkspaceWorkflowsPage.panels';
import { updateUrlSearch } from '@/hooks/useUrlSearchState';
import { useWorkspaceWorkflowsUrlState } from '@/pages/workflows/useWorkspaceWorkflowsUrlState';
const WorkflowScheduleCreateDrawer = React.lazy(() => import('@/pages/WorkflowScheduleCreateDrawer').then((module) => ({ default: module.WorkflowScheduleCreateDrawer })));
interface WorkspaceWorkflowsPageProps {
  workspace: Workspace;
  navigate: (path: string) => void;
}
type PendingWorkflowRuns = Record<string, WorkflowDefinition['runs']>; type PendingWorkflowRunsUpdate = PendingWorkflowRuns | ((current: PendingWorkflowRuns) => PendingWorkflowRuns);
export const WorkspaceWorkflowsPage: React.FC<WorkspaceWorkflowsPageProps> = ({ workspace, navigate }) => {
  const fallbackWorkflows = useMemo(() => createDefaultWorkflowDefinitions(workspace.id), [workspace.id]);
  const fallbackAgents = useMemo(() => createDefaultAgentDefinitions(workspace.id), [workspace.id]);
  const initialWorkflowQuery = useMemo(() => getWorkflowRouteQuery(window.location.search), []);
  const initialWorkflowTarget = useMemo(() => getWorkflowRouteSelectionTarget(window.location.search), []);
  const initialWorkflow = findWorkflowByRouteTarget(fallbackWorkflows, initialWorkflowTarget) || fallbackWorkflows[0];
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>(fallbackWorkflows);
  const [workflowAgents, setWorkflowAgents] = useState<AgentDefinition[]>(fallbackAgents);
  const [workflowOptions, setWorkflowOptions] = useState<WorkflowOptionsCatalog>(() => createFallbackWorkflowOptions(fallbackWorkflows));
  const [workflowOwnerMembers, setWorkflowOwnerMembers] = useState<ProjectMember[]>(workspace.members || []);
  const workflowOwnerLabelsByUserId = useMemo(() => new Map(
    workflowOwnerMembers
      .filter((member) => member.userId)
      .map((member) => [member.userId as string, member.name || member.email])
  ), [workflowOwnerMembers]);
  const [query, setQuery] = useState(initialWorkflowQuery);
  const workflowSearchTags = useMemo(() => uniqueValues(workflows.flatMap((workflow) => workflow.tags)), [workflows]);
  const filteredWorkflows = useMemo(() => filterWorkflowDefinitions(workflows, query), [query, workflows]);
  const visibleWorkflows = filteredWorkflows;
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(initialWorkflow?.id || '');
  const selectedWorkflow = visibleWorkflows.find((workflow) => workflow.id === selectedWorkflowId) || visibleWorkflows[0] || (!query.trim() ? workflows[0] : undefined);
  const initialTab = new URLSearchParams(window.location.search).get('tab') as WorkflowTab | null;
  const [activeTab, setActiveTab] = useState<WorkflowTab>(initialTab && tabs.includes(initialTab) ? initialTab : 'overview');
  const [isEditingScopeTab, setIsEditingScopeTab] = useState<'' | 'capabilities'>('');
  const [workflowLoadError, setWorkflowLoadError] = useState('');
  const [workflowCatalogReady, setWorkflowCatalogReady] = useState(false);
  const [workflowCatalogReloadKey, setWorkflowCatalogReloadKey] = useState(0);
  const [workflowOptionsError, setWorkflowOptionsError] = useState('');
  const [workflowOptionsReloadKey, setWorkflowOptionsReloadKey] = useState(0);
  const [workflowMessage, setWorkflowMessage] = useState('');
  const [workflowSessionIds, setWorkflowSessionIds] = useState<Record<string, string>>({});
  const [compiledScopes, setCompiledScopes] = useState<Record<string, Record<string, unknown>>>({});
  const [launchingWorkflowId, setLaunchingWorkflowId] = useState('');
  const [launchAcknowledgedId, setLaunchAcknowledgedId] = useState('');
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
  const [savingScope, setSavingScope] = useState('');
  const [agentSelectionDrafts, setAgentSelectionDrafts] = useState<Record<string, AgentSelectionDraft>>({});
  const [editingAgentSelectionId, setEditingAgentSelectionId] = useState('');
  const [agentSelectionError, setAgentSelectionError] = useState('');
  const [agentSelectionResult, setAgentSelectionResult] = useState('');
  const [savingAgentSelectionId, setSavingAgentSelectionId] = useState('');
  const [newWorkflowTag, setNewWorkflowTag] = useState('');
  const [createPanelOpen, setCreatePanelOpen] = useState(new URLSearchParams(window.location.search).get('panel') === 'create');
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
  const [scheduleWorkflowId, setScheduleWorkflowId] = useState(
    new URLSearchParams(window.location.search).get('panel') === 'schedule' ? initialWorkflow?.id || '' : ''
  );
  const canManageWorkflowScope = Boolean(workspace.permissions?.manage_workflows);
  function setPendingWorkflowRuns(update: PendingWorkflowRunsUpdate): void {
    const next = typeof update === 'function' ? update(pendingWorkflowRunsRef.current) : update;
    pendingWorkflowRunsRef.current = next;
    setPendingWorkflowRunsState(next);
  }
  const { selectWorkflow, selectWorkflowTab } = useWorkspaceWorkflowsUrlState({
    workflows, selectedWorkflowId, activeTab, createPanelOpen, setSelectedWorkflowId,
    setActiveTab, setQuery, setCreatePanelOpen, setScheduleWorkflowId
  });
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
    setWorkflowAgents(fallbackAgents);
    listWorkspaceAgents(workspace.id, { includeInactive: true })
      .then((items) => {
        if (!mounted || items.length === 0) return;
        setWorkflowAgents(items.map((item, index) => mapApiAgent(item, fallbackAgents[index % fallbackAgents.length], workspace.name)));
      })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, [fallbackAgents, workspace.id, workspace.name]);

  React.useEffect(() => {
    let mounted = true;
    setWorkflows(fallbackWorkflows);
    setWorkflowOptions(createFallbackWorkflowOptions(fallbackWorkflows));
    setSelectedWorkflowId((current) => findWorkflowByRouteTarget(fallbackWorkflows, initialWorkflowTarget)?.id || current || fallbackWorkflows[0]?.id || '');
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
          setSelectedWorkflowId((current) => findWorkflowByRouteTarget(mapped, initialWorkflowTarget)?.id || (mapped.some((workflow) => workflow.id === current) ? current : mapped[0].id));
        }
        setWorkflowCatalogReady(true);
      })
      .catch((error) => {
        if (!mounted) return;
        setWorkflowLoadError(error instanceof Error ? error.message : 'Unable to load workflow catalog');
        setWorkflowCatalogReady(true);
      });
    return () => { mounted = false; };
  }, [fallbackWorkflows, initialWorkflowTarget, workspace.id, workflowCatalogReloadKey, workflowOwnerLabelsByUserId]);
  React.useEffect(() => {
    let mounted = true;
    setWorkflowOptionsError('');
    listWorkflowOptions(workspace.id)
      .then((catalog) => {
        if (!mounted) return;
        setWorkflowOptions(normalizeWorkflowOptionsCatalog(catalog, createFallbackWorkflowOptions(fallbackWorkflows)));
      })
      .catch((error) => {
        if (!mounted) return;
        setWorkflowOptions(createFallbackWorkflowOptions(fallbackWorkflows));
        setWorkflowOptionsError(error instanceof Error ? error.message : 'Unable to load workflow options');
      });
    return () => { mounted = false; };
  }, [fallbackWorkflows, workspace.id, workflowOptionsReloadKey]);
  React.useEffect(() => {
    if (!selectedWorkflow) return;
    setWorkflowMessage(selectedWorkflow.starterPrompt);
    setLaunchAcknowledgedId('');
    setScopeDrafts((current) => ({
      ...current,
      [selectedWorkflow.id]: current[selectedWorkflow.id] || createScopeDraft(selectedWorkflow)
    }));
    setScopeSaveError(null);
    setScopeSaveResult(null);
    setIsEditingScopeTab('');
    setAgentSelectionDrafts((current) => ({
      ...current,
      [selectedWorkflow.id]: current[selectedWorkflow.id] || createAgentSelectionDraft(selectedWorkflow)
    }));
    setAgentSelectionError('');
    setAgentSelectionResult('');
    setEditingAgentSelectionId('');
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

  const selectedRunIds = useMemo(() => selectedWorkflow?.runs.map((run) => run.runId).filter((runId): runId is string => Boolean(runId)) || [], [selectedWorkflow?.runs]);
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
  const selectedAgentSelectionDraft = selectedWorkflow
    ? agentSelectionDrafts[selectedWorkflow.id] || createAgentSelectionDraft(selectedWorkflow)
    : undefined;
  const isEditingAgentSelection = Boolean(selectedWorkflow && editingAgentSelectionId === selectedWorkflow.id);
  const activeAgentOptions = workflowOptions.agents.filter((agent) => !agent.disabled || selectedAgentSelectionDraft?.agentIds.includes(agent.value));
  const createWorkflowScopeOptions = useMemo(() => (
    getWorkflowScopeOptionsForAgents(agentIdsFromDraft(createDraft), workflowAgents, workflowOptions)
  ), [createDraft.agentIds, workflowAgents, workflowOptions]);
  const selectedWorkflowScopeOptions = useMemo(() => (
    getWorkflowScopeOptionsForAgents(
      selectedWorkflow?.agents.map((agent) => agent.agentId) || [],
      workflowAgents,
      workflowOptions
    )
  ), [selectedWorkflow?.agents, workflowAgents, workflowOptions]);
  const baseLaunchBlocker = selectedWorkflow
    ? getWorkflowLaunchBlocker(selectedWorkflow, workflowMessage, workspace.permissions)
    : 'Select a workflow before launching.';
  const launchInputState = getWorkflowLaunchInputState(selectedWorkflow, workflowOptions, workflowMessage);
  const launchBlocker = baseLaunchBlocker || launchInputState.blocker;
  const isEditingWorkflow = Boolean(selectedWorkflow && editingWorkflowId === selectedWorkflow.id);
  const isWriteCapableSelected = Boolean(selectedWorkflow) && selectedWorkflow!.policy.mode !== 'read_only';
  const needsLaunchAcknowledgement = isWriteCapableSelected && launchAcknowledgedId !== selectedWorkflow?.id;
  const workflowDeleteBlocker = !selectedWorkflow
    ? ''
    : !canManageWorkflowScope
      ? 'You need manage_workflows to delete workflows.'
      : selectedWorkflow.source !== 'user'
        ? 'Built-in workflows cannot be deleted. Only user-authored workflows can be removed.'
        : '';
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
    setCompiledScopes, setLaunchError, setLaunchingWorkflowId, setLaunchResult, setActiveTab: selectWorkflowTab, setApprovalRecords, setApprovalError,
    setPendingWorkflowRuns,
    setApprovalAction, expandedRunLogId, setExpandedRunLogId, runEventsByRunId, setRunEventsByRunId,
    setRunLogError, setRunLogLoadingId, setCancelRunError, setCancelRunAction, setScopeSaveResult,
    workflowRunMessageDrafts, setWorkflowRunMessageDrafts, setWorkflowRunMessages,
    setWorkflowRunMessageSendingId, setWorkflowRunMessageErrorByRunId,
     setScopeDrafts, setScopeSaveError, setIsEditingScopeTab, scopeDrafts, setSavingScope, setNewWorkflowTag,
     newWorkflowTag, setWorkflowEditDrafts, setWorkflowUpdateError, setWorkflowUpdateResult, setDeleteWorkflowError,
     setDeleteWorkflowId, setEditingWorkflowId, setUpdatingWorkflowId, setSelectedWorkflowId, setDeletingWorkflowId,
      createDraft, setCreateDraft, setCreatePanelOpen, setCreateError, setCreatingWorkflow,
      canManageWorkflowScope, launchBlocker, workflowOptions, agentSelectionDrafts, setAgentSelectionDrafts,
     setEditingAgentSelectionId, setAgentSelectionError, setAgentSelectionResult, setSavingAgentSelectionId,
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
    <PageShell>
      <WorkflowRouteHeader
        canManageWorkflowScope={canManageWorkflowScope}
        onCreateClick={() => { updateUrlSearch({ panel: 'create' }); setCreateWorkflowStep(1); }}
      />

      {workflowLoadError && <WorkflowLoadFallbackNotice onRetry={() => setWorkflowCatalogReloadKey((value) => value + 1)} />}
      {workflowOptionsError && (
        <div role="alert" className="mb-4 flex flex-col gap-3 rounded-md border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-sm text-status-danger-text sm:flex-row sm:items-center sm:justify-between">
          <div><strong>Workflow options could not be loaded.</strong> {workflowOptionsError}</div>
          <Button type="button" variant="secondary" size="sm" onClick={() => setWorkflowOptionsReloadKey((value) => value + 1)}>Retry</Button>
        </div>
      )}
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
          createWorkflowScopeOptions={createWorkflowScopeOptions}
          onClose={workflowActions.closeCreateWorkflowPanel}
          onCreate={() => void workflowActions.createNewWorkflow()}
        />
      )}

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
        {selectedWorkflow && (
          <section className="order-1 min-w-0 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm xl:order-2">
            <div className="border-b border-ui-border bg-ui-bg">
              <div className="px-5 py-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={workflowStatusTone(selectedWorkflow.status)}>{selectedWorkflow.status}</StatusBadge>
                    <WorkflowModeBadge mode={selectedWorkflow.policy.mode} />
                  </div>
                  <h2 className="mt-3 type-section-title break-words [overflow-wrap:anywhere]">{selectedWorkflow.name}</h2>
                  <p className="type-body mt-2 max-w-3xl break-words text-ui-text-muted [overflow-wrap:anywhere]">{selectedWorkflow.description}</p>
                </div>
                <WorkflowLaunchActions
                  canManageWorkflowScope={canManageWorkflowScope}
                  isWriteCapable={isWriteCapableSelected}
                  launchAcknowledged={launchAcknowledgedId === selectedWorkflow.id}
                  launchBlocker={launchBlocker}
                  launching={launchingWorkflowId === selectedWorkflow.id}
                  needsLaunchAcknowledgement={needsLaunchAcknowledgement}
                  onAcknowledgementChange={(checked) => setLaunchAcknowledgedId(checked ? selectedWorkflow.id : '')}
                  onLaunch={() => void workflowActions.launchSelectedWorkflow()}
                  onSchedule={() => updateUrlSearch({ workflow: selectedWorkflow.id, panel: 'schedule' })}
                  tags={selectedWorkflow.tags}
                />
              </div>
            </div>

            <div className="bg-ui-surface px-3">
              <SegmentedTabs<WorkflowTab>
                activeValue={activeTab}
                ariaLabel="Workflow section tabs"
                className="flex flex-wrap gap-0 overflow-visible border-b border-ui-border"
                idBase="workflow-section"
                items={workflowTabItems}
                onValueChange={selectWorkflowTab}
              />
            </div>

            <div className="grid gap-5 bg-ui-bg/45 p-4 sm:p-5">
              {activeTab === 'overview' && (
                <WorkflowTabPanel tab="overview" title="Overview" description="Review assigned agents and the operator message used for the next run.">
                  <WorkflowSection
                    title="Assigned agents"
                    description="The coordinator plans the run. Selected agents provide the allowed skills, tools, and context."
                    action={(
                      <Button type="button" variant="secondary" size="sm" onClick={() => selectWorkflowTab('agents')}>
                        <ICONS.Bot className="h-4 w-4" aria-hidden="true" />
                        Review agents
                      </Button>
                    )}
                  >
                    <AgentAssignmentList
                      className="mt-4"
                      agents={[selectedWorkflow.orchestrator, ...selectedWorkflow.agents]}
                      labelForAgent={(agent) => agent.agentId === selectedWorkflow.orchestrator.agentId ? 'Coordinator' : 'Selected'}
                    />
                  </WorkflowSection>
                  <WorkflowSection
                    title="Control message"
                    description="This is the instruction sent when the workflow starts. Keep it specific enough for audit review and follow-up."
                  >
                    <WorkflowPromptEditor
                      workflow={selectedWorkflow}
                      catalog={workflowOptions}
                      message={workflowMessage}
                      onChange={setWorkflowMessage}
                    />
                    <p className="type-caption mt-2 text-ui-text-muted">Changing this message affects only the next launch, not the saved workflow default.</p>
                  </WorkflowSection>
                  {selectedCompiledScope && <div role="status" aria-live="polite" aria-atomic="true" title="Compiled scope: the exact tool set available after applying agent access, workflow gates, and approvals." className="rounded-md border border-accent/25 bg-accent-soft p-3 text-xs font-semibold text-accent-strong">{selectedAccessTools.length} tools compiled for this run.</div>}
                  {launchError && <div role="alert" aria-live="assertive" className="rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">{launchError}</div>}
                  {launchResult?.workflowId === selectedWorkflow.id && <div role="status" aria-live="polite" aria-atomic="true" className="rounded-md border border-status-success/30 bg-status-success-soft p-3 text-xs font-semibold text-status-success-text">Run {launchResult.workflowRunId || launchResult.runId} dispatched.</div>}
                </WorkflowTabPanel>
              )}

              {activeTab === 'agents' && (
                <WorkflowAgentsPanel
                  workflow={selectedWorkflow}
                  selectedAgentSelectionDraft={selectedAgentSelectionDraft}
                  activeAgentOptions={activeAgentOptions}
                  isEditingAgentSelection={isEditingAgentSelection}
                  canManageWorkflowScope={canManageWorkflowScope}
                  savingAgentSelectionId={savingAgentSelectionId}
                  agentSelectionError={agentSelectionError}
                  agentSelectionResult={agentSelectionResult}
                  workflowActions={workflowActions}
                />
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
                  agents={workflowAgents}
                  scopeDraft={selectedScopeDraft}
                  scopeSaveError={scopeSaveError}
                  scopeSaveResult={scopeSaveResult}
                  canManageWorkflowScope={canManageWorkflowScope}
                  editing={isEditingScopeTab === 'capabilities'}
                  saving={savingScope === selectedWorkflow.id}
                  scopeOptions={selectedWorkflowScopeOptions}
                  onStartEditing={() => workflowActions.startEditingScopeTab('capabilities')}
                  onCancelEditing={workflowActions.cancelEditingScopeTab}
                  onSave={() => void workflowActions.saveWorkflowScope('capabilities')}
                  onSetWorkflowScopeValue={(key, value, enabled) => workflowActions.setWorkflowScopeValue(selectedWorkflow.id, key, value, enabled)}
                  onSetStepToolValue={(stepId, value, enabled) => workflowActions.setStepScopeValue(selectedWorkflow.id, stepId, 'allowedTools', value, enabled)}
                  catalogFailures={(['mcpServers', 'mcpTools', 'agents'] as const).flatMap((source) => ['error', 'unavailable'].includes(workflowOptions.sourceAvailability[source]?.status) ? [workflowOptions.sourceAvailability[source]?.message || source] : [])}
                  onRetryCatalog={() => setWorkflowOptionsReloadKey((value) => value + 1)} onOpenMcpSettings={() => navigate('/settings?tab=workspace#workspace-mcp-title')}
                />
              )}

              {activeTab === 'settings' && (
                <WorkflowTabPanel
                  tab="settings"
                  title="Settings"
                  description="Edit saved defaults, pause new runs, manage tags, or delete user-authored workflow definitions with confirmation."
                >
                  {(workflowUpdateError || workflowUpdateResult || deleteWorkflowError) && <div role={workflowUpdateError || deleteWorkflowError ? 'alert' : 'status'} aria-live={workflowUpdateError || deleteWorkflowError ? 'assertive' : 'polite'} aria-atomic="true" className={`rounded-md border px-3 py-2 text-xs font-semibold ${workflowUpdateError || deleteWorkflowError ? 'border-status-danger/30 bg-status-danger-soft text-status-danger-text' : 'border-status-success/30 bg-status-success-soft text-status-success-text'}`}>{workflowUpdateError || deleteWorkflowError || workflowUpdateResult}</div>}
                  <WorkflowSection title="Availability">
                    <div className="mt-3 flex items-center justify-between gap-4 rounded-md bg-ui-bg px-4 py-3">
                      <div>
                        <h4 className="type-row-title">{selectedWorkflow.status === 'active' ? 'Active' : 'Inactive'}</h4>
                        <p className="type-caption mt-1 text-ui-text-muted">Toggle availability for new runs.</p>
                      </div>
                      <ScopeSwitch checked={selectedWorkflow.status === 'active'} disabled={!canManageWorkflowScope || updatingWorkflowId === selectedWorkflow.id} label="Toggle workflow active state" onChange={(active) => void workflowActions.toggleWorkflowActive(selectedWorkflow, active)} />
                    </div>
                  </WorkflowSection>
                  <WorkflowSection
                    title="Default run message"
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
                            <span className="type-micro-label text-ui-text-muted">Message</span>
                            <Textarea value={selectedWorkflowEditDraft.starterPrompt} onChange={(event) => workflowActions.updateWorkflowEditDraft(selectedWorkflow.id, { starterPrompt: event.target.value })} className="mt-2 min-h-32" />
                            <span className="type-caption mt-2 block text-ui-text-muted">Used to start new workflow sessions.</span>
                          </label>
                          <div className="flex gap-2">
                            <Button variant="secondary" size="sm" onClick={() => workflowActions.cancelEditingWorkflow(selectedWorkflow)}>Cancel</Button>
                            <Button variant="primary" size="sm" onClick={() => void workflowActions.saveWorkflowDefinition()} disabled={!canManageWorkflowScope || updatingWorkflowId === selectedWorkflow.id || !selectedWorkflowEditDraft.name.trim()}>Save workflow</Button>
                          </div>
                        </>
                      ) : (
                        <div className="rounded-md bg-ui-bg px-4 py-3">
                          <div className="type-micro-label text-ui-text-muted">Message</div>
                          <p className="mt-2 text-sm font-semibold leading-6 text-ui-text">{selectedWorkflow.starterPrompt}</p>
                          <p className="type-caption mt-2 text-ui-text-muted">Used to start new workflow sessions.</p>
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
                  <details aria-label="Delete workflow" className="group min-w-0 border-t border-status-danger/25 pt-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-md text-status-danger-text focus:outline-none focus-visible:ring-2 focus-visible:ring-status-danger/25 [&::-webkit-details-marker]:hidden">
                      <span className="type-row-title">Danger zone</span>
                      <ICONS.ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <div className="mt-3 flex flex-col gap-3 rounded-lg bg-status-danger-soft px-4 py-3 text-status-danger-text sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <h4 className="type-row-title">Delete workflow</h4>
                        <p className="type-caption mt-1 max-w-2xl">Permanently removes this user-authored workflow definition. Past runs remain in audit history.</p>
                        {workflowDeleteBlocker && <p id="workflow-delete-blocker" className="type-caption mt-2 max-w-2xl font-semibold">{workflowDeleteBlocker}</p>}
                      </div>
                      <Button variant="danger" size="sm" onClick={() => { setDeleteWorkflowId(selectedWorkflow.id); setDeleteWorkflowConfirmation(''); }} disabled={Boolean(workflowDeleteBlocker)} title={workflowDeleteBlocker || undefined} aria-describedby={workflowDeleteBlocker ? 'workflow-delete-blocker' : undefined}>Delete workflow</Button>
                    </div>
                  </details>
                </WorkflowTabPanel>
              )}
            </div>
          </section>
        )}
        <WorkflowLibraryList
          className="order-2 xl:order-1"
          query={query}
          setQuery={(value) => {
            const next = typeof value === 'function' ? value(query) : value;
            setQuery(next);
            updateUrlSearch({ q: next || null }, { replace: true });
          }}
          workflowSearchTags={workflowSearchTags}
          workflows={workflows}
          visibleWorkflows={visibleWorkflows}
          selectedWorkflow={selectedWorkflow}
          setSelectedWorkflowId={selectWorkflow}
          setActiveTab={selectWorkflowTab}
        />
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
      {scheduleWorkflowId && (
        <React.Suspense fallback={null}>
          <WorkflowScheduleCreateDrawer workspaceId={workspace.id} scheduleWorkflow={workflows.find((workflow) => workflow.id === scheduleWorkflowId)} onClose={() => updateUrlSearch({ panel: null })} />
        </React.Suspense>
      )}
    </PageShell>
  );
};
