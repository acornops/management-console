import React, { useMemo, useState } from 'react';
import { Button, CloseButton, InlineAlert } from '@acornops/ui';
import { PageShell } from '@acornops/ui';
import { MasterDetailLayout, MasterDetailPaneBody, MasterDetailPaneHeader } from '@acornops/ui';
import { StatusBadge } from '@acornops/ui';
import { ICONS } from '@/constants';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import type { ProjectMember, Workspace } from '@/types';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import { mapApiAgent } from '@/pages/WorkspaceAgentsPage.helpers';
import { findWorkflowByRouteSelection, filterWorkflowDefinitions, getWorkflowDeleteBlocker, getWorkflowLaunchBlocker, getWorkflowPrimaryAction, getWorkflowRouteQuery, getWorkflowRouteSelection, type WorkflowDefinition, type WorkflowView } from '@/pages/workflows/workflowModel';
import { listWorkflowOptions, listWorkflowRunEvents, listWorkflowRunApprovals, listWorkflowSessions, listWorkspaceWorkflows, type WorkflowOptionsCatalog, type WorkflowRunApproval, type WorkflowRunEvent } from '@/services/control-plane/workflowApi';
import { listWorkspaceAgents } from '@/services/control-plane/agentApi';
import { createAgentSelectionDraft, createFallbackWorkflowOptions, createWorkflowDraft, createWorkflowEditDraft, isRunActive, mapApiWorkflowToDefinition, mapWorkflowRunSummary, mergeWorkflowRunsWithLocalDispatches, normalizeWorkflowOptionsCatalog, uniqueValues, workflowStatusTone, workflowViews, type AgentSelectionDraft, type CreateWorkflowDraft, type WorkflowEditDraft } from '@/pages/workflows/workflowPageHelpers';
import { useWorkspaceWorkflowActions } from '@/pages/workflows/useWorkspaceWorkflowActions';
import { WorkflowDeleteDialog, WorkflowDiscovery, WorkflowLaunchActions, WorkflowLibraryList } from '@/pages/WorkspaceWorkflowsPage.components';
import { WorkflowLoadErrorNotice, WorkflowModeLabel } from '@/pages/WorkflowStatusUi';
import { WorkflowCreateDrawer, type CreateWorkflowStep } from '@/pages/WorkspaceWorkflowsPage.createDrawer';
import { WorkflowAgentAssignmentSection, WorkflowCapabilitiesPanel, WorkflowRunsPanel } from '@/pages/WorkspaceWorkflowsPage.panels';
import { WorkflowOverviewPanel } from '@/pages/WorkspaceWorkflowOverviewPanel';
import { WorkflowSettingsPanel } from '@/pages/WorkflowSettingsPanel';
import { updateUrlSearch, useUrlSearchState } from '@/hooks/useUrlSearchState';
import { useWorkspaceWorkflowsUrlState } from '@/pages/workflows/useWorkspaceWorkflowsUrlState';
import { useWorkflowCapabilityPreview } from '@/pages/workflows/useWorkflowCapabilityPreview';
import { isServerWorkflowRunId, serverWorkflowRunIds } from '@/pages/workflows/workflowRunIdentity';
import { useWorkflowExecutionDeepLink } from '@/pages/workflows/useWorkflowExecutionDeepLink';
import type { McpReadinessRecovery } from '@/services/control-plane/mcpReadinessRecovery';
import { WorkflowRunDrawer } from '@/pages/WorkflowRunDrawer';
import { WorkspaceWorkflowsChrome } from '@/pages/WorkspaceWorkflowsChrome';
import { WorkflowDetailTabs } from '@/pages/workflows/WorkflowDetailTabs';
import { WorkflowHelpDrawer } from '@/pages/WorkflowHelpDrawer';
import { useWorkflowLaunchShortcut, useWorkflowSearchShortcut } from '@/pages/workflows/useWorkflowKeyboardShortcuts';
import { WorkflowTriggerPanel } from '@/pages/WorkflowTriggerPanel';
import { hasSessionDataCacheValue, useSessionCachedState } from '@/hooks/sessionDataCache';
export const WorkspaceWorkflowsPage: React.FC<{
  workspace: Workspace;
  navigate: (path: string) => void;
}> = ({ workspace, navigate }) => {
  const initialWorkflowQuery = useMemo(() => getWorkflowRouteQuery(window.location.search), []);
  const initialWorkflowSelection = useMemo(() => getWorkflowRouteSelection(window.location.search), []);
  const workflowUrlSearch = useUrlSearchState();
  const managementPanel = workflowUrlSearch.get('panel');
  const workflowCachePrefix = `workspace:${workspace.id}:workflow-page:`;
  const workflowsCacheKey = `${workflowCachePrefix}workflows`;
  const workflowAgentsCacheKey = `${workflowCachePrefix}agents`;
  const workflowOptionsCacheKey = `${workflowCachePrefix}options`;
  const workflowOwnersCacheKey = `${workflowCachePrefix}owners`;
  const [workflows, setWorkflows] = useSessionCachedState<WorkflowDefinition[]>(workflowsCacheKey, []);
  const [workflowAgents, setWorkflowAgents] = useSessionCachedState<AgentDefinition[]>(workflowAgentsCacheKey, []);
  const [workflowOptions, setWorkflowOptions] = useSessionCachedState<WorkflowOptionsCatalog>(workflowOptionsCacheKey, () => createFallbackWorkflowOptions([]));
  const [workflowOwnerMembers, setWorkflowOwnerMembers] = useSessionCachedState<ProjectMember[]>(workflowOwnersCacheKey, workspace.members || []);
  const [workflowOwnerCatalogWorkspaceId, setWorkflowOwnerCatalogWorkspaceId] = useState(() => hasSessionDataCacheValue(workflowOwnersCacheKey) ? workspace.id : '');
  const [workflowAgentCatalogWorkspaceId, setWorkflowAgentCatalogWorkspaceId] = useState(() => hasSessionDataCacheValue(workflowAgentsCacheKey) ? workspace.id : '');
  const [workflowOptionsCatalogWorkspaceId, setWorkflowOptionsCatalogWorkspaceId] = useState(() => hasSessionDataCacheValue(workflowOptionsCacheKey) ? workspace.id : '');
  const workflowOwnerLabelsByUserId = useMemo(() => new Map(workflowOwnerMembers.filter((member) => member.userId).map((member) => [member.userId as string, member.name || member.email])), [workflowOwnerMembers]);
  const effectiveWorkflowOptions = useMemo<WorkflowOptionsCatalog>(() => {
    const agentOptions = workflowAgents.map((agent) => ({
      value: agent.id,
      label: agent.name,
      description: agent.description,
      disabled: agent.status !== 'active' || agent.reviewState !== 'reviewed',
      disabledReason: agent.status !== 'active' ? 'Agent is not active.' : agent.reviewState !== 'reviewed' ? 'Agent has not been reviewed.' : undefined,
      provenance: { source: 'agent' as const, agentId: agent.id }
    }));
    return { ...workflowOptions, agents: agentOptions.length > 0 ? agentOptions : workflowOptions.agents };
  }, [workflowAgents, workflowOptions]);
  const [query, setQuery] = useState(initialWorkflowQuery);
  const workflowSearchTags = useMemo(() => uniqueValues(workflows.flatMap((workflow) => workflow.tags)), [workflows]);
  const filteredWorkflows = useMemo(() => filterWorkflowDefinitions(workflows, query), [query, workflows]);
  const visibleWorkflows = filteredWorkflows;
  useWorkflowSearchShortcut();
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(initialWorkflowSelection);
  const initialView = new URLSearchParams(window.location.search).get('tab') as WorkflowView | null;
  const [activeView, setActiveView] = useState<WorkflowView>(initialView && workflowViews.includes(initialView) ? initialView : 'overview');
  const [workflowLoadError, setWorkflowLoadError] = useState('');
  const [workflowCatalogReady, setWorkflowCatalogReady] = useState(() => hasSessionDataCacheValue(workflowsCacheKey));
  const [workflowCatalogReloadKey, setWorkflowCatalogReloadKey] = useState(0);
  const [workflowOptionsError, setWorkflowOptionsError] = useState('');
  const [workflowOptionsReloadKey, setWorkflowOptionsReloadKey] = useState(0);
  const [launchDrawerWorkflowId, setLaunchDrawerWorkflowId] = useState('');
  const [launchingWorkflowId, setLaunchingWorkflowId] = useState('');
  const [launchAcknowledgedId, setLaunchAcknowledgedId] = useState('');
  const [launchError, setLaunchError] = useState('');
  const [launchRecovery, setLaunchRecovery] = useState<McpReadinessRecovery | null>(null);
  const [pendingWorkflowRuns, setPendingWorkflowRunsState] = useState<Record<string, WorkflowDefinition['runs']>>({});
  const pendingWorkflowRunsRef = React.useRef(pendingWorkflowRuns);
  const workflowRowRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const [approvalRecords, setApprovalRecords] = useSessionCachedState<Record<string, WorkflowRunApproval[]>>(`${workflowCachePrefix}run-approvals`, {});
  const [approvalAction, setApprovalAction] = useState('');
  const [approvalError, setApprovalError] = useState('');
  const [runEventsByRunId, setRunEventsByRunId] = useSessionCachedState<Record<string, WorkflowRunEvent[]>>(`${workflowCachePrefix}run-events`, {});
  const [expandedRunLogId, setExpandedRunLogId] = useState('');
  const [runLogError, setRunLogError] = useState('');
  const [cancelRunAction, setCancelRunAction] = useState('');
  const [cancelRunError, setCancelRunError] = useState('');
  const [agentSelectionDrafts, setAgentSelectionDrafts] = useState<Record<string, AgentSelectionDraft>>({});
  const [editingAgentSelectionId, setEditingAgentSelectionId] = useState('');
  const [agentSelectionError, setAgentSelectionError] = useState('');
  const [savingAgentSelectionId, setSavingAgentSelectionId] = useState('');
  const [newWorkflowTag, setNewWorkflowTag] = useState('');
  const [createPanelOpen, setCreatePanelOpen] = useState(new URLSearchParams(window.location.search).get('panel') === 'create');
  const [createWorkflowStep, setCreateWorkflowStep] = useState<CreateWorkflowStep>(1);
  const [createDraft, setCreateDraft] = useState<CreateWorkflowDraft>(() => createWorkflowDraft());
  const [createError, setCreateError] = useState('');
  const [creatingWorkflow, setCreatingWorkflow] = useState(false);
  const [workflowEditDrafts, setWorkflowEditDrafts] = useState<Record<string, WorkflowEditDraft>>({});
  const [workflowUpdateError, setWorkflowUpdateError] = useState('');
  const [workflowUpdateResult, setWorkflowUpdateResult] = useState('');
  const [workflowUndoCheckpoint, setWorkflowUndoCheckpoint] = useState<WorkflowDefinition | null>(null);
  const [updatingWorkflowId, setUpdatingWorkflowId] = useState('');
  const [deleteWorkflowId, setDeleteWorkflowId] = useState('');
  const [deleteWorkflowConfirmation, setDeleteWorkflowConfirmation] = useState('');
  const [deletingWorkflowId, setDeletingWorkflowId] = useState('');
  const [deleteWorkflowError, setDeleteWorkflowError] = useState('');
  const canManageWorkflows = Boolean(workspace.permissions?.manage_workflows);
  const workflowOptionsReady = workflowOptionsCatalogWorkspaceId === workspace.id && !workflowOptionsError;
  function setPendingWorkflowRuns(update: Record<string, WorkflowDefinition['runs']> | ((current: Record<string, WorkflowDefinition['runs']>) => Record<string, WorkflowDefinition['runs']>)): void {
    const next = typeof update === 'function' ? update(pendingWorkflowRunsRef.current) : update;
    pendingWorkflowRunsRef.current = next;
    setPendingWorkflowRunsState(next);
  }
  const { clearWorkflowSelection, hasExplicitWorkflowSelection, selectWorkflow, selectWorkflowView } = useWorkspaceWorkflowsUrlState({
    workflows, routeHydrated: workflowCatalogReady && !workflowLoadError, selectedWorkflowId, activeView, createPanelOpen, setSelectedWorkflowId,
    setActiveView, setQuery, setCreatePanelOpen
  });
  const selectedWorkflow = (hasExplicitWorkflowSelection ? workflows : visibleWorkflows).find((workflow) => workflow.id === selectedWorkflowId) || visibleWorkflows[0] || (!query.trim() ? workflows[0] : undefined);
  React.useEffect(() => {
    let mounted = true;
    setWorkflowOwnerMembers((current) => current.length > 0 ? current : workspace.members || []);
    if (workspace.permissions?.read_members !== true) {
      setWorkflowOwnerCatalogWorkspaceId(workspace.id);
      return () => { mounted = false; };
    }
    controlPlaneApi.listWorkspaceMembers(workspace.id, { limit: 50 })
      .then((page) => {
        if (!mounted) return;
        setWorkflowOwnerMembers(page.items);
        setWorkflowOwnerCatalogWorkspaceId(workspace.id);
      })
      .catch(() => {
        if (mounted) setWorkflowOwnerCatalogWorkspaceId(workspace.id);
      });
    return () => { mounted = false; };
  }, [workspace.id, workspace.members, workspace.permissions?.read_members]);
  React.useEffect(() => {
    if (workflowOwnerCatalogWorkspaceId !== workspace.id) return;
    let mounted = true;
    listWorkspaceAgents(workspace.id, { includeInactive: true })
      .then((items) => {
        if (!mounted) return;
        setWorkflowAgents(items.map((item) => mapApiAgent(item, workspace.name, workflowOwnerLabelsByUserId)));
        setWorkflowAgentCatalogWorkspaceId(workspace.id);
      })
      .catch(() => {
        if (mounted) setWorkflowAgentCatalogWorkspaceId(workspace.id);
      });
    return () => { mounted = false; };
  }, [workspace.id, workspace.name, workflowOwnerCatalogWorkspaceId, workflowOwnerLabelsByUserId]);
  React.useEffect(() => {
    if (
      workflowOwnerCatalogWorkspaceId !== workspace.id
      || workflowAgentCatalogWorkspaceId !== workspace.id
      || workflowOptionsCatalogWorkspaceId !== workspace.id
    ) return;
    let mounted = true;
    setWorkflowLoadError('');
    listWorkspaceWorkflows(workspace.id)
      .then((items) => {
        if (!mounted) return;
        const mapped = items.map((item) => {
          const workflow = mapApiWorkflowToDefinition(
            item,
            undefined,
            workspace.id,
            effectiveWorkflowOptions,
            workflowOwnerLabelsByUserId,
            workflowAgents
          );
          const pendingRuns = pendingWorkflowRunsRef.current[workflow.id] || [];
          const runs = mergeWorkflowRunsWithLocalDispatches(workflow.runs, pendingRuns);
          return pendingRuns.length > 0
            ? { ...workflow, runs, lastRun: runs[0]?.startedAt || workflow.lastRun }
            : workflow;
        });
        setWorkflows(mapped);
        setSelectedWorkflowId((current) => findWorkflowByRouteSelection(mapped, initialWorkflowSelection)?.id || (mapped.some((workflow) => workflow.id === current) ? current : mapped[0]?.id || ''));
        setWorkflowCatalogReady(true);
      })
      .catch((error) => {
        if (!mounted) return;
        setWorkflowLoadError(formatControlPlaneError(error, 'Unable to load workflow catalog'));
        setWorkflowCatalogReady(true);
      });
    return () => { mounted = false; };
  }, [initialWorkflowSelection, workspace.id, workflowAgentCatalogWorkspaceId, workflowCatalogReloadKey, workflowOptionsCatalogWorkspaceId, workflowOwnerCatalogWorkspaceId]);
  React.useEffect(() => {
    let mounted = true;
    setWorkflowOptionsError('');
    listWorkflowOptions(workspace.id)
      .then((catalog) => {
        if (!mounted) return;
        setWorkflowOptions(normalizeWorkflowOptionsCatalog(catalog, createFallbackWorkflowOptions([])));
        setWorkflowOptionsCatalogWorkspaceId(workspace.id);
      })
      .catch((error) => {
        if (!mounted) return;
        setWorkflowOptions(createFallbackWorkflowOptions([]));
        setWorkflowOptionsError(formatControlPlaneError(error, 'Unable to load workflow options'));
        setWorkflowOptionsCatalogWorkspaceId(workspace.id);
      });
    return () => { mounted = false; };
  }, [workspace.id, workflowOptionsReloadKey]);
  React.useEffect(() => {
    if (!selectedWorkflow) return;
    setLaunchAcknowledgedId('');
    setAgentSelectionDrafts((current) => ({
      ...current,
      [selectedWorkflow.id]: current[selectedWorkflow.id] || createAgentSelectionDraft(selectedWorkflow)
    }));
    setAgentSelectionError('');
    setEditingAgentSelectionId('');
  }, [selectedWorkflow?.id, effectiveWorkflowOptions]);
  const selectedWorkflowHasActiveRuns = Boolean(selectedWorkflow?.runs.some((run) => isRunActive(run.status)));
  useWorkflowExecutionDeepLink(activeView, selectedWorkflow, setExpandedRunLogId);
  React.useEffect(() => {
    if (!workflowCatalogReady || !selectedWorkflow) return;
    let mounted = true;
    const workflowId = selectedWorkflow.id;
    const refreshWorkflowRuns = async () => {
      try {
        const sessions = await listWorkflowSessions(workspace.id, selectedWorkflow.id);
        if (!mounted) return;
        const serverRuns = sessions.flatMap((session) => session.runs || []).map(mapWorkflowRunSummary);
        const pendingRuns = pendingWorkflowRunsRef.current[workflowId] || [];
        const runs = mergeWorkflowRunsWithLocalDispatches(serverRuns, pendingRuns);
        if (pendingRuns.length > 0) {
          const serverRunKeys = new Set(serverRuns.flatMap((run) => [run.id, run.runId].filter((value): value is string => Boolean(value))));
          setPendingWorkflowRuns((current) => {
            const remainingRuns = (current[workflowId] || []).filter((run) => (
              [run.id, run.runId].filter(Boolean).every((key) => !serverRunKeys.has(key))
            ));
            if (remainingRuns.length === (current[workflowId] || []).length) return current;
            const next = { ...current };
            if (remainingRuns.length > 0) next[workflowId] = remainingRuns;
            else delete next[workflowId];
            return next;
          });
        }
        setWorkflows((current) => current.map((workflow) => workflow.id === workflowId
          ? { ...workflow, runs, lastRun: runs[0]?.startedAt || 'No runs yet' }
          : workflow));
      } catch {
        // Preserve the last known run state while a transient refresh fails.
      }
    };
    void refreshWorkflowRuns();
    const refreshTimer = selectedWorkflowHasActiveRuns
      ? window.setInterval(() => void refreshWorkflowRuns(), 2500)
      : undefined;
    return () => {
      mounted = false;
      if (refreshTimer !== undefined) window.clearInterval(refreshTimer);
    };
  }, [selectedWorkflow?.id, selectedWorkflowHasActiveRuns, workspace.id, workflowCatalogReady]);
  const selectedRunIds = useMemo(() => serverWorkflowRunIds(selectedWorkflow?.runs || []), [selectedWorkflow?.runs]);
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
    if (!isServerWorkflowRunId(expandedRunLogId) || !selectedWorkflow) return;
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
  const selectedAgentSelectionDraft = selectedWorkflow
    ? agentSelectionDrafts[selectedWorkflow.id] || createAgentSelectionDraft(selectedWorkflow)
    : undefined;
  const isEditingAgentSelection = Boolean(selectedWorkflow && editingAgentSelectionId === selectedWorkflow.id);
  const activeAgentOptions = effectiveWorkflowOptions.agents.filter((agent) => !agent.disabled || selectedAgentSelectionDraft?.agentIds.includes(agent.value));
  const baseLaunchBlocker = selectedWorkflow ? getWorkflowLaunchBlocker(selectedWorkflow, selectedWorkflow.starterPrompt, workspace.permissions) : 'Select a workflow before launching.';
  const capabilityPreviewEnabled = Boolean(selectedWorkflow && launchDrawerWorkflowId === selectedWorkflow.id);
  const capabilityPreviewState = useWorkflowCapabilityPreview({ workspaceId: workspace.id, workflow: selectedWorkflow, enabled: capabilityPreviewEnabled });
  const launchBlocker = !workflowOptionsReady
    ? 'Workflow options must load before launching a workflow.'
    : baseLaunchBlocker || (capabilityPreviewEnabled ? capabilityPreviewState.blocker : null);
  useWorkflowLaunchShortcut({
    blocked: Boolean(launchBlocker),
    workflowId: selectedWorkflow?.id,
    onOpen: () => {
      if (!selectedWorkflow) return;
      setLaunchError('');
      setLaunchRecovery(null);
      setLaunchDrawerWorkflowId(selectedWorkflow.id);
    }
  });
  const workflowPrimaryAction = selectedWorkflow ? getWorkflowPrimaryAction(selectedWorkflow) : 'launch';
  const workflowDeleteBlocker = getWorkflowDeleteBlocker(selectedWorkflow, canManageWorkflows);
  const selectedWorkflowEditDraft = selectedWorkflow
    ? workflowEditDrafts[selectedWorkflow.id] || createWorkflowEditDraft(selectedWorkflow)
    : undefined;
  const workflowToDelete = deleteWorkflowId
    ? workflows.find((workflow) => workflow.id === deleteWorkflowId)
    : undefined;
  const closeDeleteWorkflowDialog = () => {
    if (deletingWorkflowId) return;
    setDeleteWorkflowId('');
    setDeleteWorkflowConfirmation('');
  };
  const workflowActions = useWorkspaceWorkflowActions({
    workspace, workflows, setWorkflows,
    selectedWorkflow, selectedWorkflowEditDraft,
    setLaunchDrawerWorkflowId,
    setLaunchError, setLaunchRecovery, setLaunchingWorkflowId, setActiveView: (view: WorkflowView) => selectWorkflowView(view, selectedWorkflow?.id), setApprovalRecords, setApprovalError,
    setPendingWorkflowRuns,
    setApprovalAction, expandedRunLogId, setExpandedRunLogId, runEventsByRunId, setRunEventsByRunId,
    setRunLogError, setCancelRunError, setCancelRunAction,
     setNewWorkflowTag, newWorkflowTag, setWorkflowEditDrafts, setWorkflowUpdateError, setWorkflowUpdateResult, setDeleteWorkflowError,
     workflowUndoCheckpoint, setWorkflowUndoCheckpoint,
     setDeleteWorkflowId, setUpdatingWorkflowId, selectResultingWorkflow: selectWorkflow, setDeletingWorkflowId,
      createDraft, setCreateDraft, setCreatePanelOpen, setCreateError, setCreatingWorkflow,
      canManageWorkflows, workflowOptionsReady, launchBlocker, workflowOptions: effectiveWorkflowOptions, agentSelectionDrafts, setAgentSelectionDrafts,
     setEditingAgentSelectionId, setAgentSelectionError, setSavingAgentSelectionId,
     ownerLabelsByUserId: workflowOwnerLabelsByUserId, workflowAgents
  });
  return (
    <PageShell
      className="min-[1440px]:overflow-y-hidden"
      contentClassName="min-[1440px]:flex min-[1440px]:h-full min-[1440px]:min-h-0 min-[1440px]:flex-col"
    >
      <WorkspaceWorkflowsChrome
        canManageWorkflows={canManageWorkflows}
        hiddenOnCompact={hasExplicitWorkflowSelection}
        navigate={navigate}
        onCreate={() => { updateUrlSearch({ panel: 'create' }); setCreateWorkflowStep(1); }}
        onOpenHelp={() => updateUrlSearch({ panel: 'help', topic: 'overview' })}
        workflowOptionsReady={workflowOptionsReady}
        workspace={workspace}
      />
      <div
        id="workflow-section-all-panel"
        role="tabpanel"
        aria-labelledby="workflow-section-all-tab"
        className="min-[1440px]:flex min-[1440px]:min-h-0 min-[1440px]:flex-1 min-[1440px]:flex-col"
      >
      {workflowLoadError && <WorkflowLoadErrorNotice onRetry={() => setWorkflowCatalogReloadKey((value) => value + 1)} />}
      {workflowOptionsError && <InlineAlert tone="danger" className="mb-4 type-body" title="Workflow options could not be loaded." action={<Button type="button" variant="secondary" size="sm" onClick={() => setWorkflowOptionsReloadKey((value) => value + 1)}>Retry</Button>}>
        {workflowOptionsError}
      </InlineAlert>}
      {createPanelOpen && <WorkflowCreateDrawer
          createWorkflowStep={createWorkflowStep} setCreateWorkflowStep={setCreateWorkflowStep}
          createDraft={createDraft} setCreateDraft={setCreateDraft}
          createError={createError} creatingWorkflow={creatingWorkflow}
          canManageWorkflows={canManageWorkflows} workflowOptions={effectiveWorkflowOptions}
          workflowOptionsReady={workflowOptionsReady}
          workspaceId={workspace.id}
          onClose={workflowActions.closeCreateWorkflowPanel} onCreate={() => void workflowActions.createNewWorkflow()}
        />}
        <div className={`mb-4 min-[1440px]:hidden ${hasExplicitWorkflowSelection ? 'hidden' : ''}`}>
          <WorkflowDiscovery
            idPrefix="workflow-library-mobile"
            ready={workflowCatalogReady} query={query} totalCount={workflows.length} visibleCount={visibleWorkflows.length} workflowSearchTags={workflowSearchTags}
            withSpacing={false}
            onQueryChange={(next) => { setQuery(next); updateUrlSearch({ q: next || null }, { replace: true }); }}
          />
        </div>
        <MasterDetailLayout
        boundedOnDesktop
        desktopBreakpoint="wide"
        listWidth="wide"
        showDetailOnCompact={hasExplicitWorkflowSelection}
        compactBackLabel="Back to workflows"
        onCompactBack={() => { const workflowId = selectedWorkflow?.id; clearWorkflowSelection(); if (workflowId) window.requestAnimationFrame(() => workflowRowRefs.current.get(workflowId)?.focus()); }}
        list={<WorkflowLibraryList
          discovery={<WorkflowDiscovery
            embedded
            idPrefix="workflow-library-desktop"
            ready={workflowCatalogReady} query={query} totalCount={workflows.length} visibleCount={visibleWorkflows.length} workflowSearchTags={workflowSearchTags}
            withSpacing={false}
            onQueryChange={(next) => { setQuery(next); updateUrlSearch({ q: next || null }, { replace: true }); }}
          />}
          workflows={workflows} visibleWorkflows={visibleWorkflows} selectedWorkflow={selectedWorkflow} selectedWorkflowIsExplicit={hasExplicitWorkflowSelection} ready={workflowCatalogReady} loadError={workflowLoadError} onSelectWorkflow={selectWorkflow} registerWorkflowRow={(workflowId, node) => { if (node) workflowRowRefs.current.set(workflowId, node); else workflowRowRefs.current.delete(workflowId); }}
        />}
        detail={selectedWorkflow ? (
          <section className="min-w-0 overflow-hidden min-[1440px]:flex min-[1440px]:h-full min-[1440px]:min-h-0 min-[1440px]:flex-col">
            <MasterDetailPaneHeader
              badges={selectedWorkflow.status !== 'active' ? (
                <StatusBadge tone={workflowStatusTone(selectedWorkflow.status)}>{selectedWorkflow.status}</StatusBadge>
              ) : null}
              title={selectedWorkflow.name}
              titleMeta={<WorkflowModeLabel mode={selectedWorkflow.policy.mode} />}
              description={selectedWorkflow.description}
              actions={<WorkflowLaunchActions
                  activating={updatingWorkflowId === selectedWorkflow.id}
                  canManageWorkflows={canManageWorkflows}
                  launchBlocker={launchBlocker}
                  launching={launchingWorkflowId === selectedWorkflow.id}
                  onActivate={() => void workflowActions.toggleWorkflowActive(selectedWorkflow, true)}
                  onEdit={() => {
                    selectWorkflowView('settings', selectedWorkflow.id);
                    workflowActions.startEditingWorkflow(selectedWorkflow);
                  }}
                  onLaunch={() => {
                    setLaunchError('');
                    setLaunchRecovery(null);
                    setLaunchDrawerWorkflowId(selectedWorkflow.id);
                  }}
                  onReviewReadiness={() => {
                    if (capabilityPreviewState.blocker) {
                      selectWorkflowView('capabilities', selectedWorkflow.id);
                      return;
                    }
                    setLaunchError('');
                    setLaunchRecovery(null);
                    setLaunchDrawerWorkflowId(selectedWorkflow.id);
                  }}
                  primaryAction={workflowPrimaryAction}
                />}
            />
            {workflowUndoCheckpoint?.id === selectedWorkflow.id && workflowUpdateResult && (
              <InlineAlert
                tone="success"
                className="items-center rounded-none border-x-0 border-status-success/20 bg-status-success-soft/40 px-6"
                action={(
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={() => void workflowActions.undoLastWorkflowMutation()}>Undo</Button>
                    <CloseButton
                      label="Dismiss workflow update notification"
                      onClick={() => {
                        setWorkflowUpdateResult('');
                        setWorkflowUndoCheckpoint(null);
                      }}
                    />
                  </div>
                )}
              >
                {workflowUpdateResult}
              </InlineAlert>
            )}

            <div className="bg-ui-surface px-3">
              {activeView === 'settings' ? (
                <div className="flex min-h-11 items-center justify-between gap-3 border-b border-ui-border">
                  <Button variant="tertiary" size="sm" onClick={() => selectWorkflowView('overview', selectedWorkflow.id)}>
                    <ICONS.ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    Back to workflow
                  </Button>
                  <span id="workflow-detail-section-settings-tab" className="type-micro-label pr-2 text-ui-text-muted">Workflow settings</span>
                </div>
              ) : (
                <WorkflowDetailTabs activeView={activeView} workflowName={selectedWorkflow.name} onChange={(view) => selectWorkflowView(view, selectedWorkflow.id)} />
              )}
            </div>

            <MasterDetailPaneBody
              id={`workflow-detail-section-${activeView}-panel`}
              role="tabpanel"
              aria-labelledby={`workflow-detail-section-${activeView}-tab`}
              className="min-[1440px]:min-h-0 min-[1440px]:flex-1 min-[1440px]:overflow-y-auto min-[1440px]:overscroll-contain min-[1440px]:custom-scrollbar min-[1440px]:stable-scrollbar-gutter"
            >
              {activeView === 'overview' && (
                <WorkflowOverviewPanel
                  showHeader={false}
                  workflow={selectedWorkflow}
                  agentAssignment={(
                    <WorkflowAgentAssignmentSection
                      workflow={selectedWorkflow}
                      agents={workflowAgents}
                      selectedAgentSelectionDraft={selectedAgentSelectionDraft}
                      activeAgentOptions={activeAgentOptions}
                      isEditingAgentSelection={isEditingAgentSelection}
                      canManageWorkflows={canManageWorkflows}
                      savingAgentSelectionId={savingAgentSelectionId}
                      agentSelectionError={agentSelectionError}
                      onReviewCapabilities={() => selectWorkflowView('capabilities', selectedWorkflow.id)}
                      workflowActions={workflowActions}
                    />
                  )}
                />
              )}

              {activeView === 'capabilities' && (
                <WorkflowCapabilitiesPanel
                  showHeader={false}
                  workflow={selectedWorkflow}
                  agents={workflowAgents}
                  catalogFailures={['error', 'unavailable'].includes(workflowOptions.sourceAvailability.agents?.status) ? [workflowOptions.sourceAvailability.agents?.message || 'agents'] : []}
                  onRetryCatalog={() => setWorkflowOptionsReloadKey((value) => value + 1)}
                />
              )}

              {(activeView === 'schedules' || activeView === 'webhooks') && (
                <WorkflowTriggerPanel
                  activeView={activeView}
                  workflow={selectedWorkflow}
                  workspace={workspace}
                />
              )}

              {activeView === 'runs' && (
                <WorkflowRunsPanel
                  showHeader={false}
                  workflow={selectedWorkflow}
                  approvalError={approvalError} runLogError={runLogError} cancelRunError={cancelRunError}
                  approvalRecords={approvalRecords} expandedRunLogId={expandedRunLogId} runEventsByRunId={runEventsByRunId}
                  cancelRunAction={cancelRunAction} workflowActions={workflowActions} approvalAction={approvalAction}
                  setExpandedRunLogId={setExpandedRunLogId}
                />
              )}

              {activeView === 'settings' && (
                <WorkflowSettingsPanel
                  workflow={selectedWorkflow}
                  canManage={canManageWorkflows}
                  editDraft={selectedWorkflowEditDraft}
                  updating={updatingWorkflowId === selectedWorkflow.id}
                  updateError={workflowUpdateError}
                  deleteError={deleteWorkflowError}
                  tagDraft={newWorkflowTag}
                  workflowDeleteBlocker={workflowDeleteBlocker}
                  onCancelEditing={() => workflowActions.cancelEditingWorkflow(selectedWorkflow)}
                  onUpdateDraft={(update) => workflowActions.updateWorkflowEditDraft(selectedWorkflow.id, update)}
                  onSave={() => void workflowActions.saveWorkflowDefinition()}
                  onToggleActive={(active) => void workflowActions.toggleWorkflowActive(selectedWorkflow, active)}
                  onTagDraftChange={setNewWorkflowTag}
                  onAddTag={() => void workflowActions.addWorkflowTag(selectedWorkflow.id)}
                  onRemoveTag={(tag) => void workflowActions.removeWorkflowTag(selectedWorkflow.id, tag)}
                  onRequestDelete={() => {
                    setDeleteWorkflowId(selectedWorkflow.id);
                    setDeleteWorkflowConfirmation('');
                  }}
                />
              )}
            </MasterDetailPaneBody>
          </section>
        ) : null}
        />
      </div>
      <WorkflowDeleteDialog
        workflowToDelete={workflowToDelete}
        deleteWorkflowConfirmation={deleteWorkflowConfirmation}
        deleteWorkflowError={deleteWorkflowError}
        deletingWorkflowId={deletingWorkflowId}
        onClose={closeDeleteWorkflowDialog}
        onDelete={(workflow) => void workflowActions.deleteSelectedWorkflow(workflow)}
        setDeleteWorkflowConfirmation={setDeleteWorkflowConfirmation}
      />
      <WorkflowRunDrawer
        workflow={workflows.find((workflow) => workflow.id === launchDrawerWorkflowId)}
        preview={capabilityPreviewState.preview}
        previewing={capabilityPreviewState.loading} previewError={capabilityPreviewState.error} blocker={launchBlocker}
        launchError={launchError} launchRecovery={launchRecovery}
        launching={launchingWorkflowId === selectedWorkflow?.id} acknowledged={launchAcknowledgedId === selectedWorkflow?.id}
        onAcknowledgementChange={(checked) => setLaunchAcknowledgedId(checked && selectedWorkflow ? selectedWorkflow.id : '')}
        onRetryPreview={capabilityPreviewState.retry}
        onClose={() => {
          if (!selectedWorkflow) return;
          setLaunchDrawerWorkflowId('');
          setLaunchError('');
          setLaunchRecovery(null);
          setLaunchAcknowledgedId('');
        }}
        onLaunch={() => void workflowActions.launchSelectedWorkflow()}
      />
      <WorkflowHelpDrawer
        open={managementPanel === 'help'}
        initialTopic={workflowUrlSearch.get('topic') || undefined}
        onClose={() => updateUrlSearch({ panel: null, topic: null })}
      />
    </PageShell>
  );
};
