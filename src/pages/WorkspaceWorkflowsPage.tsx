import React, { useMemo, useState } from 'react';
import { Button, DrawerFrame, InlineAlert, SegmentedTabs } from '@acornops/ui';
import { PageHeader, PageShell } from '@acornops/ui';
import { MasterDetailLayout, MasterDetailPaneBody, MasterDetailPaneHeader } from '@acornops/ui';
import { StatusBadge } from '@acornops/ui';
import { ICONS } from '@/constants';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ProjectMember, Workspace } from '@/types';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import { mapApiAgent } from '@/pages/WorkspaceAgentsPage.helpers';
import { findWorkflowByRouteSelection, filterWorkflowDefinitions, getWorkflowDeleteBlocker, getWorkflowLaunchBlocker, getWorkflowPrimaryAction, getWorkflowRouteQuery, getWorkflowRouteSelection, type WorkflowDefinition, type WorkflowRunMessage, type WorkflowView } from '@/pages/workflows/workflowModel';
import { listWorkflowOptions, listWorkflowRunEvents, listWorkflowRunApprovals, listWorkflowSessions, listWorkspaceWorkflows, type WorkflowOptionsCatalog, type WorkflowRunApproval, type WorkflowRunEvent } from '@/services/control-plane/workflowApi';
import { listWorkspaceAgents } from '@/services/control-plane/agentApi';
import { createAgentSelectionDraft, createFallbackWorkflowOptions, createWorkflowDraft, createWorkflowEditDraft, isRunActive, mapApiWorkflowToDefinition, mapWorkflowRunSummary, mergeWorkflowRunsWithLocalDispatches, normalizeWorkflowOptionsCatalog, uniqueValues, workflowStatusTone, workflowViews, type AgentSelectionDraft, type CreateWorkflowDraft, type WorkflowEditDraft } from '@/pages/workflows/workflowPageHelpers';
import { useWorkspaceWorkflowActions } from '@/pages/workflows/useWorkspaceWorkflowActions';
import { WorkflowDeleteDialog, WorkflowDiscovery, WorkflowLaunchActions, WorkflowLibraryList, WorkflowLoadErrorNotice, WorkflowModeBadge } from '@/pages/WorkspaceWorkflowsPage.components';
import { WorkflowCreateDrawer, type CreateWorkflowStep } from '@/pages/WorkspaceWorkflowsPage.createDrawer';
import { WorkflowAgentsPanel, WorkflowCapabilitiesPanel, WorkflowRunsPanel } from '@/pages/WorkspaceWorkflowsPage.panels';
import { WorkflowOverviewPanel } from '@/pages/WorkspaceWorkflowOverviewPanel';
import { WorkflowSettingsPanel } from '@/pages/WorkflowSettingsPanel';
import { updateUrlSearch, useUrlSearchState } from '@/hooks/useUrlSearchState';
import { useWorkspaceWorkflowsUrlState } from '@/pages/workflows/useWorkspaceWorkflowsUrlState';
import { useWorkflowCapabilityPreview } from '@/pages/workflows/useWorkflowCapabilityPreview';
import { indexPersistedWorkflowRunResponses, mergePersistedWorkflowRunResponses } from '@/pages/workflows/workflowRunSync';
import { isServerWorkflowRunId, serverWorkflowRunIds } from '@/pages/workflows/workflowRunIdentity';
import { useWorkflowExecutionDeepLink } from '@/pages/workflows/useWorkflowExecutionDeepLink';
import type { McpReadinessRecovery } from '@/services/control-plane/mcpReadinessRecovery';
import { WorkflowRecommendationActions } from '@/pages/WorkflowRecommendationActions';
import { WorkflowRunDrawer } from '@/pages/WorkflowRunDrawer';
import { WorkflowSections } from '@/pages/workflows/WorkflowSections';

const workflowViewIcons: Record<WorkflowView, React.ElementType> = {
  overview: ICONS.LayoutGrid,
  agents: ICONS.Bot,
  capabilities: ICONS.Shield,
  runs: ICONS.Activity,
  settings: ICONS.Settings
};

const workflowViewLabels: Record<WorkflowView, string> = {
  overview: 'Overview',
  agents: 'Agents',
  capabilities: 'Capabilities',
  runs: 'Runs',
  settings: 'Settings'
};
const WorkspaceSchedulesPage = React.lazy(() => import('@/pages/WorkspaceSchedulesPage').then((module) => ({ default: module.WorkspaceSchedulesPage })));
const WorkspaceIncomingWebhooksPage = React.lazy(() => import('@/pages/WorkspaceIncomingWebhooksPage').then((module) => ({ default: module.WorkspaceIncomingWebhooksPage })));
export const WorkspaceWorkflowsPage: React.FC<{
  workspace: Workspace;
  navigate: (path: string) => void;
}> = ({ workspace, navigate }) => {
  const initialWorkflowQuery = useMemo(() => getWorkflowRouteQuery(window.location.search), []);
  const initialWorkflowSelection = useMemo(() => getWorkflowRouteSelection(window.location.search), []);
  const workflowUrlSearch = useUrlSearchState();
  const managementPanel = workflowUrlSearch.get('panel');
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [workflowAgents, setWorkflowAgents] = useState<AgentDefinition[]>([]);
  const [workflowOptions, setWorkflowOptions] = useState<WorkflowOptionsCatalog>(() => createFallbackWorkflowOptions([]));
  const [workflowOwnerMembers, setWorkflowOwnerMembers] = useState<ProjectMember[]>(workspace.members || []);
  const [workflowOwnerCatalogWorkspaceId, setWorkflowOwnerCatalogWorkspaceId] = useState('');
  const [workflowAgentCatalogWorkspaceId, setWorkflowAgentCatalogWorkspaceId] = useState('');
  const [workflowOptionsCatalogWorkspaceId, setWorkflowOptionsCatalogWorkspaceId] = useState('');
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
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(initialWorkflowSelection);
  const initialView = new URLSearchParams(window.location.search).get('tab') as WorkflowView | null;
  const [activeView, setActiveView] = useState<WorkflowView>(initialView && workflowViews.includes(initialView) ? initialView : 'overview');
  const [workflowLoadError, setWorkflowLoadError] = useState('');
  const [workflowCatalogReady, setWorkflowCatalogReady] = useState(false);
  const [workflowCatalogReloadKey, setWorkflowCatalogReloadKey] = useState(0);
  const [workflowOptionsError, setWorkflowOptionsError] = useState('');
  const [workflowOptionsReloadKey, setWorkflowOptionsReloadKey] = useState(0);
  const [workflowSessionIds, setWorkflowSessionIds] = useState<Record<string, string>>({});
  const [launchDrawerWorkflowId, setLaunchDrawerWorkflowId] = useState('');
  const [launchingWorkflowId, setLaunchingWorkflowId] = useState('');
  const [launchAcknowledgedId, setLaunchAcknowledgedId] = useState('');
  const [launchError, setLaunchError] = useState('');
  const [launchRecovery, setLaunchRecovery] = useState<McpReadinessRecovery | null>(null);
  const [pendingWorkflowRuns, setPendingWorkflowRunsState] = useState<Record<string, WorkflowDefinition['runs']>>({});
  const pendingWorkflowRunsRef = React.useRef(pendingWorkflowRuns);
  const workflowRowRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const [approvalRecords, setApprovalRecords] = useState<Record<string, WorkflowRunApproval[]>>({});
  const [approvalAction, setApprovalAction] = useState('');
  const [approvalError, setApprovalError] = useState('');
  const [runEventsByRunId, setRunEventsByRunId] = useState<Record<string, WorkflowRunEvent[]>>({});
  const [expandedRunLogId, setExpandedRunLogId] = useState('');
  const [runLogError, setRunLogError] = useState('');
  const [cancelRunAction, setCancelRunAction] = useState('');
  const [cancelRunError, setCancelRunError] = useState('');
  const [workflowRunMessages, setWorkflowRunMessages] = useState<Record<string, WorkflowRunMessage[]>>({});
  const [workflowRunMessageDrafts, setWorkflowRunMessageDrafts] = useState<Record<string, string>>({});
  const [workflowRunMessageSendingId, setWorkflowRunMessageSendingId] = useState('');
  const [workflowRunMessageErrorByRunId, setWorkflowRunMessageErrorByRunId] = useState<Record<string, string>>({});
  const [workflowRunMessageRecoveryByRunId, setWorkflowRunMessageRecoveryByRunId] = useState<Record<string, McpReadinessRecovery>>({});
  const [agentSelectionDrafts, setAgentSelectionDrafts] = useState<Record<string, AgentSelectionDraft>>({});
  const [editingAgentSelectionId, setEditingAgentSelectionId] = useState('');
  const [agentSelectionError, setAgentSelectionError] = useState('');
  const [agentSelectionResult, setAgentSelectionResult] = useState('');
  const [savingAgentSelectionId, setSavingAgentSelectionId] = useState('');
  const [newWorkflowTag, setNewWorkflowTag] = useState('');
  const [createPanelOpen, setCreatePanelOpen] = useState(new URLSearchParams(window.location.search).get('panel') === 'create');
  const initialPanel = new URLSearchParams(window.location.search).get('panel');
  const [recommendationsOpen, setRecommendationsOpen] = useState(
    initialPanel === 'recommendations' || initialPanel === 'templates'
  );
  const [createWorkflowStep, setCreateWorkflowStep] = useState<CreateWorkflowStep>(1);
  const [createDraft, setCreateDraft] = useState<CreateWorkflowDraft>(() => createWorkflowDraft());
  const [createError, setCreateError] = useState('');
  const [creatingWorkflow, setCreatingWorkflow] = useState(false);
  const [workflowEditDrafts, setWorkflowEditDrafts] = useState<Record<string, WorkflowEditDraft>>({});
  const [workflowUpdateError, setWorkflowUpdateError] = useState('');
  const [workflowUpdateResult, setWorkflowUpdateResult] = useState('');
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
    setWorkflowOwnerCatalogWorkspaceId('');
    setWorkflowOwnerMembers(workspace.members || []);
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
    setWorkflowAgentCatalogWorkspaceId('');
    setWorkflowAgents([]);
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
    setWorkflowCatalogReady(false);
    listWorkspaceWorkflows(workspace.id)
      .then((items) => {
        if (!mounted) return;
        const mapped = items.map((item) => {
          const workflow = mapApiWorkflowToDefinition(
            item,
            undefined,
            workspace.id,
            effectiveWorkflowOptions,
            workflowOwnerLabelsByUserId
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
        setWorkflowLoadError(error instanceof Error ? error.message : 'Unable to load workflow catalog');
        setWorkflowCatalogReady(true);
      });
    return () => { mounted = false; };
  }, [initialWorkflowSelection, workspace.id, workflowAgentCatalogWorkspaceId, workflowCatalogReloadKey, workflowOptionsCatalogWorkspaceId, workflowOwnerCatalogWorkspaceId]);
  React.useEffect(() => {
    let mounted = true;
    setWorkflowOptionsCatalogWorkspaceId('');
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
        setWorkflowOptionsError(error instanceof Error ? error.message : 'Unable to load workflow options');
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
    setAgentSelectionResult('');
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
        setWorkflowSessionIds((current) => ({
          ...current,
          ...Object.fromEntries(sessions.flatMap((session) => (
            (session.runs || []).map((run) => [run.id, session.id])
          )))
        }));
        const serverRuns = sessions.flatMap((session) => session.runs || []).map(mapWorkflowRunSummary);
        const pendingRuns = pendingWorkflowRunsRef.current[workflowId] || [];
        const runs = mergeWorkflowRunsWithLocalDispatches(serverRuns, pendingRuns);
        setWorkflowRunMessages((current) => mergePersistedWorkflowRunResponses(
          current,
          indexPersistedWorkflowRunResponses(sessions)
        ));
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
  const capabilityPreviewState = useWorkflowCapabilityPreview({ workspaceId: workspace.id, workflow: selectedWorkflow });
  const launchBlocker = !workflowOptionsReady
    ? 'Workflow options must load before launching a workflow.'
    : baseLaunchBlocker || capabilityPreviewState.blocker;
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
    selectedWorkflow, selectedWorkflowEditDraft, workflowSessionIds, setWorkflowSessionIds,
    setLaunchDrawerWorkflowId,
    setLaunchError, setLaunchRecovery, setLaunchingWorkflowId, setActiveView: (view: WorkflowView) => selectWorkflowView(view, selectedWorkflow?.id), setApprovalRecords, setApprovalError,
    setPendingWorkflowRuns,
    setApprovalAction, expandedRunLogId, setExpandedRunLogId, runEventsByRunId, setRunEventsByRunId,
    setRunLogError, setCancelRunError, setCancelRunAction,
    workflowRunMessageDrafts, setWorkflowRunMessageDrafts, setWorkflowRunMessages,
    setWorkflowRunMessageSendingId, setWorkflowRunMessageErrorByRunId, setWorkflowRunMessageRecoveryByRunId,
     setNewWorkflowTag, newWorkflowTag, setWorkflowEditDrafts, setWorkflowUpdateError, setWorkflowUpdateResult, setDeleteWorkflowError,
     setDeleteWorkflowId, setUpdatingWorkflowId, selectResultingWorkflow: selectWorkflow, setDeletingWorkflowId,
      createDraft, setCreateDraft, setCreatePanelOpen, setCreateError, setCreatingWorkflow,
      canManageWorkflows, workflowOptionsReady, launchBlocker, workflowOptions: effectiveWorkflowOptions, agentSelectionDrafts, setAgentSelectionDrafts,
     setEditingAgentSelectionId, setAgentSelectionError, setAgentSelectionResult, setSavingAgentSelectionId,
     ownerLabelsByUserId: workflowOwnerLabelsByUserId
  });
  return (
    <PageShell
      className="lg:overflow-y-hidden"
      contentClassName="lg:flex lg:h-full lg:min-h-0 lg:flex-col"
    >
      <PageHeader
        title="Workflows"
        description="Create, launch, and audit governed workspace automations with visible Agent capabilities and write policy."
        actions={<div className="flex flex-col items-start gap-2 lg:items-end">
          <div className="flex flex-wrap gap-2">
            <WorkflowRecommendationActions workspace={workspace} open={recommendationsOpen} focusWorkflowId={selectedWorkflow?.id} onOpenChange={setRecommendationsOpen} onChanged={(workflowId) => { setWorkflowCatalogReloadKey((value) => value + 1); capabilityPreviewState.retry(); if (workflowId) selectWorkflow(workflowId); }} />
            <Button type="button" variant="primary" size="md" className="whitespace-nowrap self-start lg:self-auto" onClick={() => { updateUrlSearch({ panel: 'create' }); setCreateWorkflowStep(1); }} disabled={!canManageWorkflows || !workflowOptionsReady} title={!canManageWorkflows ? 'You need manage_workflows to create workflows.' : !workflowOptionsReady ? 'Workflow options must load before creating a workflow.' : undefined}>
              <ICONS.Plus className="h-4 w-4" aria-hidden="true" /> Create workflow
            </Button>
          </div>
          {!canManageWorkflows && <span className="type-caption max-w-64 type-emphasis text-ui-text-muted lg:text-right">Ask a workspace manager for manage_workflows to create or edit workflow definitions.</span>}
        </div>}
      />
      <WorkflowSections activeSection="all" navigate={navigate} workspaceId={workspace.id} />
      <div
        id="workflow-section-all-panel"
        role="tabpanel"
        aria-labelledby="workflow-section-all-tab"
        className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
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
          onClose={workflowActions.closeCreateWorkflowPanel} onCreate={() => void workflowActions.createNewWorkflow()}
        />}
        <div className={`mb-4 ${hasExplicitWorkflowSelection ? 'hidden lg:block' : ''}`}>
          <WorkflowDiscovery
            ready={workflowCatalogReady} query={query} totalCount={workflows.length} visibleCount={visibleWorkflows.length} workflowSearchTags={workflowSearchTags}
            withSpacing={false}
            onQueryChange={(next) => { setQuery(next); updateUrlSearch({ q: next || null }, { replace: true }); }}
          />
        </div>
        <MasterDetailLayout
        boundedOnDesktop
        showDetailOnCompact={hasExplicitWorkflowSelection}
        compactBackLabel="Back to workflows"
        onCompactBack={() => { const workflowId = selectedWorkflow?.id; clearWorkflowSelection(); if (workflowId) window.requestAnimationFrame(() => workflowRowRefs.current.get(workflowId)?.focus()); }}
        list={<WorkflowLibraryList workflows={workflows} visibleWorkflows={visibleWorkflows} selectedWorkflow={selectedWorkflow} ready={workflowCatalogReady} loadError={workflowLoadError} onSelectWorkflow={selectWorkflow} registerWorkflowRow={(workflowId, node) => { if (node) workflowRowRefs.current.set(workflowId, node); else workflowRowRefs.current.delete(workflowId); }} />}
        detail={selectedWorkflow ? (
          <section className="min-w-0 overflow-hidden lg:flex lg:h-full lg:min-h-0 lg:flex-col">
            <MasterDetailPaneHeader
              badges={<><StatusBadge tone={workflowStatusTone(selectedWorkflow.status)}>{selectedWorkflow.status}</StatusBadge><WorkflowModeBadge mode={selectedWorkflow.policy.mode} /><span className="type-caption type-emphasis text-ui-text-muted">{selectedWorkflow.owner}</span></>}
              title={selectedWorkflow.name}
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
                  onSchedule={() => updateUrlSearch({ workflow: selectedWorkflow.id, panel: 'schedules', tab: null })}
                  onWebhooks={() => updateUrlSearch({ workflow: selectedWorkflow.id, panel: 'webhooks', tab: null })}
                  primaryAction={workflowPrimaryAction}
                />}
            />

            <div className="bg-ui-surface px-3">
              <SegmentedTabs<WorkflowView>
                activeValue={activeView}
                allPanelsMounted={false}
                ariaLabel="Workflow detail sections"
                className="gap-0"
                idBase="workflow-detail-section"
                items={workflowViews.map((view) => {
                  const Icon = workflowViewIcons[view];
                  return {
                    value: view,
                    label: workflowViewLabels[view],
                    icon: <Icon className="h-4 w-4" aria-hidden="true" />
                  };
                })}
                onValueChange={(view) => selectWorkflowView(view, selectedWorkflow.id)}
              />
            </div>

            <MasterDetailPaneBody
              id={`workflow-detail-section-${activeView}-panel`}
              role="tabpanel"
              aria-labelledby={`workflow-detail-section-${activeView}-tab`}
              className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:custom-scrollbar lg:stable-scrollbar-gutter"
            >
              {activeView === 'overview' && (
                <WorkflowOverviewPanel
                  workflow={selectedWorkflow} workspaceId={workspace.id} canManageWorkflow={canManageWorkflows}
                  preview={capabilityPreviewState.preview} previewLoading={capabilityPreviewState.loading} previewError={capabilityPreviewState.error}
                  onRetryPreview={capabilityPreviewState.retry} onReviewAgents={() => {
                    if (canManageWorkflows) workflowActions.startEditingAgentSelection(selectedWorkflow);
                    selectWorkflowView('agents', selectedWorkflow.id);
                  }}
                  onReviewCapabilities={() => selectWorkflowView('capabilities', selectedWorkflow.id)}
                />
              )}

              {activeView === 'agents' && (
                <WorkflowAgentsPanel
                  workflow={selectedWorkflow}
                  selectedAgentSelectionDraft={selectedAgentSelectionDraft}
                  activeAgentOptions={activeAgentOptions}
                  isEditingAgentSelection={isEditingAgentSelection}
                  canManageWorkflows={canManageWorkflows}
                  savingAgentSelectionId={savingAgentSelectionId}
                  agentSelectionError={agentSelectionError}
                  agentSelectionResult={agentSelectionResult}
                  workflowActions={workflowActions}
                />
              )}

              {activeView === 'capabilities' && (
                <WorkflowCapabilitiesPanel
                  workflow={selectedWorkflow}
                  agents={workflowAgents}
                  catalogFailures={(['mcpTools', 'agents'] as const).flatMap((source) => ['error', 'unavailable'].includes(workflowOptions.sourceAvailability[source]?.status) ? [workflowOptions.sourceAvailability[source]?.message || source] : [])}
                  onRetryCatalog={() => setWorkflowOptionsReloadKey((value) => value + 1)}
                />
              )}

              {activeView === 'runs' && (
                <WorkflowRunsPanel
                  workflow={selectedWorkflow}
                  approvalError={approvalError} runLogError={runLogError} cancelRunError={cancelRunError}
                  approvalRecords={approvalRecords} expandedRunLogId={expandedRunLogId} runEventsByRunId={runEventsByRunId}
                  cancelRunAction={cancelRunAction} workflowActions={workflowActions} approvalAction={approvalAction}
                  workflowSessionIds={workflowSessionIds}
                  runMessagesByRunId={workflowRunMessages}
                  runMessageDrafts={workflowRunMessageDrafts}
                  runMessageSendingId={workflowRunMessageSendingId}
                  runMessageErrorByRunId={workflowRunMessageErrorByRunId}
                  runMessageRecoveryByRunId={workflowRunMessageRecoveryByRunId}
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
                  updateResult={workflowUpdateResult}
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
      {selectedWorkflow && (
        <>
          <DrawerFrame
            open={managementPanel === 'schedules' || managementPanel === 'schedule'}
            width="xl"
            title="Schedules"
            titleId="workflow-schedules-drawer-title"
            description={`Manage recurring runs for ${selectedWorkflow.name}.`}
            bodyClassName="p-0"
            onClose={() => updateUrlSearch({ panel: null })}
          >
            <React.Suspense fallback={null}>
              <WorkspaceSchedulesPage
                embedded
                constrainedWorkflowId={selectedWorkflow.id}
                create={managementPanel === 'schedule'}
                createWorkflowId={managementPanel === 'schedule' ? selectedWorkflow.id : undefined}
                workspace={workspace}
              />
            </React.Suspense>
          </DrawerFrame>

          <DrawerFrame
            open={managementPanel === 'webhooks'}
            width="xl"
            title="Webhooks"
            titleId="workflow-webhooks-drawer-title"
            description={`Manage incoming webhook triggers for ${selectedWorkflow.name}.`}
            bodyClassName="p-0"
            onClose={() => updateUrlSearch({ panel: null })}
          >
            <React.Suspense fallback={null}>
              <WorkspaceIncomingWebhooksPage
                embedded
                constrainedWorkflowId={selectedWorkflow.id}
                workspace={workspace}
              />
            </React.Suspense>
          </DrawerFrame>
        </>
      )}
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
    </PageShell>
  );
};
