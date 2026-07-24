import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { PageHeader, PageShell } from '@/components/common/PageComposition';
import { SegmentedTabs, TextInput } from '@/components/common/ComponentVocabulary';
import { MasterDetailLayout, MasterDetailPaneBody, MasterDetailPaneHeader } from '@/components/common/MasterDetailLayout';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ICONS } from '@/constants';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ProjectMember, Workspace } from '@/types';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import { mapApiAgent } from '@/pages/WorkspaceAgentsPage.helpers';
import { findWorkflowByRouteTarget, filterWorkflowDefinitions, getWorkflowDeleteBlocker, getWorkflowLaunchBlocker, getWorkflowPrimaryAction, getWorkflowRouteQuery, getWorkflowRouteSelectionTarget, getWorkflowTabLabel, isSystemProvidedWorkflow, type WorkflowDefinition, type WorkflowRunMessage, type WorkflowTab } from '@/pages/workflows/workflowModel';
import { listWorkflowOptions, listWorkflowRunEvents, listWorkflowRunApprovals, listWorkflowSessions, listWorkspaceWorkflows, type WorkflowApiDefinition, type WorkflowOptionsCatalog, type WorkflowRunApproval, type WorkflowRunEvent } from '@/services/control-plane/workflowApi';
import { listWorkspaceAgents } from '@/services/control-plane/agentApi';
import { ScopeSwitch, createAgentSelectionDraft, createFallbackWorkflowOptions, createScopeDraft, createWorkflowDraft, createWorkflowEditDraft, isRunActive, mapApiWorkflowToDefinition, mapWorkflowRunSummary, mergeWorkflowRunsWithLocalDispatches, normalizeWorkflowOptionsCatalog, tabs, uniqueValues, workflowStatusTone, type AgentSelectionDraft, type CreateWorkflowDraft, type ScopeDraft, type WorkflowEditDraft } from '@/pages/workflows/workflowPageHelpers';
import { useWorkspaceWorkflowActions } from '@/pages/workflows/useWorkspaceWorkflowActions';
import { AgentAssignmentList, WorkflowCapabilityLedger, WorkflowDeleteDialog, WorkflowDiscovery, WorkflowLaunchActions, WorkflowLibraryList, WorkflowLoadErrorNotice, WorkflowModeBadge, WorkflowSection, WorkflowTabPanel, WorkflowTagsEditor, workflowTabIcons } from '@/pages/WorkspaceWorkflowsPage.components';
import { WorkflowCreateDrawer, type CreateWorkflowStep } from '@/pages/WorkspaceWorkflowsPage.createDrawer';
import { WorkflowPromptEditor } from '@/pages/WorkspaceWorkflowsPage.launchFields';
import { WorkflowAgentsPanel, WorkflowCapabilitiesPanel, WorkflowRunsPanel } from '@/pages/WorkspaceWorkflowsPage.panels';
import { updateUrlSearch } from '@/hooks/useUrlSearchState';
import { useWorkspaceWorkflowsUrlState } from '@/pages/workflows/useWorkspaceWorkflowsUrlState';
import { useWorkflowCapabilityPreview } from '@/pages/workflows/useWorkflowCapabilityPreview';
import { indexPersistedWorkflowRunResponses, mergePersistedWorkflowRunResponses } from '@/pages/workflows/workflowRunSync';
import { isServerWorkflowRunId, serverWorkflowRunIds } from '@/pages/workflows/workflowRunIdentity';
import type { McpReadinessRecovery } from '@/services/control-plane/mcpReadinessRecovery';
import { WorkflowTemplateActions } from '@/pages/WorkflowTemplateActions';
const WorkflowScheduleCreateDrawer = React.lazy(() => import('@/pages/WorkflowScheduleCreateDrawer').then((module) => ({ default: module.WorkflowScheduleCreateDrawer })));
export const WorkspaceWorkflowsPage: React.FC<{ workspace: Workspace; navigate: (path: string) => void }> = ({ workspace, navigate }) => {
  const { t } = useTranslation();
  const initialWorkflowQuery = useMemo(() => getWorkflowRouteQuery(window.location.search), []);
  const initialWorkflowTarget = useMemo(() => getWorkflowRouteSelectionTarget(window.location.search), []);
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
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(initialWorkflowTarget);
  const initialTab = new URLSearchParams(window.location.search).get('tab') as WorkflowTab | null;
  const [activeTab, setActiveTab] = useState<WorkflowTab>(initialTab && tabs.includes(initialTab) ? initialTab : 'overview');
  const [isEditingScopeTab, setIsEditingScopeTab] = useState<'' | 'capabilities'>('');
  const [workflowLoadError, setWorkflowLoadError] = useState('');
  const [workflowCatalogReady, setWorkflowCatalogReady] = useState(false);
  const [workflowCatalogReloadKey, setWorkflowCatalogReloadKey] = useState(0);
  const [workflowOptionsError, setWorkflowOptionsError] = useState('');
  const [workflowOptionsReloadKey, setWorkflowOptionsReloadKey] = useState(0);
  const [workflowMessage, setWorkflowMessage] = useState('');
  const [workflowRunInputs, setWorkflowRunInputs] = useState<Record<string, Record<string, unknown>>>({});
  const [workflowSessionIds, setWorkflowSessionIds] = useState<Record<string, string>>({});
  const [launchingWorkflowId, setLaunchingWorkflowId] = useState('');
  const [launchAcknowledgedId, setLaunchAcknowledgedId] = useState('');
  const [launchError, setLaunchError] = useState('');
  const [launchRecovery, setLaunchRecovery] = useState<McpReadinessRecovery | null>(null);
  const [launchResult, setLaunchResult] = useState<{ workflowId: string; runId: string; toolCount: number } | null>(null);
  const [pendingWorkflowRuns, setPendingWorkflowRunsState] = useState<Record<string, WorkflowDefinition['runs']>>({});
  const pendingWorkflowRunsRef = React.useRef(pendingWorkflowRuns);
  const workflowRowRefs = React.useRef(new Map<string, HTMLButtonElement>());
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
  const [workflowRunMessageRecoveryByRunId, setWorkflowRunMessageRecoveryByRunId] = useState<Record<string, McpReadinessRecovery>>({});
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
  const [templateSetupOpen, setTemplateSetupOpen] = useState(new URLSearchParams(window.location.search).get('panel') === 'templates');
  const [createWorkflowStep, setCreateWorkflowStep] = useState<CreateWorkflowStep>(1);
  const [createDraft, setCreateDraft] = useState<CreateWorkflowDraft>(() => createWorkflowDraft());
  const [createError, setCreateError] = useState('');
  const [creatingWorkflow, setCreatingWorkflow] = useState(false);
  const [editingWorkflowId, setEditingWorkflowId] = useState('');
  const [workflowEditDrafts, setWorkflowEditDrafts] = useState<Record<string, WorkflowEditDraft>>({});
  const [workflowUpdateError, setWorkflowUpdateError] = useState('');
  const [workflowUpdateResult, setWorkflowUpdateResult] = useState('');
  const [updatingWorkflowId, setUpdatingWorkflowId] = useState('');
  const [duplicatingWorkflowId, setDuplicatingWorkflowId] = useState('');
  const [deleteWorkflowId, setDeleteWorkflowId] = useState('');
  const [deleteWorkflowConfirmation, setDeleteWorkflowConfirmation] = useState('');
  const [deletingWorkflowId, setDeletingWorkflowId] = useState('');
  const [deleteWorkflowError, setDeleteWorkflowError] = useState('');
  const [scheduleWorkflowId, setScheduleWorkflowId] = useState(new URLSearchParams(window.location.search).get('panel') === 'schedule' ? initialWorkflowTarget : '');
  const canManageWorkflowScope = Boolean(workspace.permissions?.manage_workflows);
  const workflowOptionsReady = workflowOptionsCatalogWorkspaceId === workspace.id && !workflowOptionsError;
  function setPendingWorkflowRuns(update: Record<string, WorkflowDefinition['runs']> | ((current: Record<string, WorkflowDefinition['runs']>) => Record<string, WorkflowDefinition['runs']>)): void {
    const next = typeof update === 'function' ? update(pendingWorkflowRunsRef.current) : update;
    pendingWorkflowRunsRef.current = next;
    setPendingWorkflowRunsState(next);
  }
  const { clearWorkflowSelection, hasExplicitWorkflowSelection, selectWorkflow, selectWorkflowTab } = useWorkspaceWorkflowsUrlState({
    workflows, routeHydrated: workflowCatalogReady && !workflowLoadError, selectedWorkflowId, activeTab, createPanelOpen, setSelectedWorkflowId,
    setActiveTab, setQuery, setCreatePanelOpen, setScheduleWorkflowId
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
        setSelectedWorkflowId((current) => findWorkflowByRouteTarget(mapped, initialWorkflowTarget)?.id || (mapped.some((workflow) => workflow.id === current) ? current : mapped[0]?.id || ''));
        setWorkflowCatalogReady(true);
      })
      .catch((error) => {
        if (!mounted) return;
        setWorkflowLoadError(error instanceof Error ? error.message : 'Unable to load workflow catalog');
        setWorkflowCatalogReady(true);
      });
    return () => { mounted = false; };
  }, [initialWorkflowTarget, workspace.id, workflowAgentCatalogWorkspaceId, workflowCatalogReloadKey, workflowOptionsCatalogWorkspaceId, workflowOwnerCatalogWorkspaceId]);
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
  }, [selectedWorkflow?.id, effectiveWorkflowOptions]);
  const selectedWorkflowHasActiveRuns = Boolean(selectedWorkflow?.runs.some((run) => isRunActive(run.status)));
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
  const baseLaunchBlocker = selectedWorkflow ? getWorkflowLaunchBlocker(selectedWorkflow, workflowMessage, workspace.permissions) : 'Select a workflow before launching.';
  const selectedWorkflowRunInputs = selectedWorkflow ? workflowRunInputs[selectedWorkflow.id] || {} : {};
  const capabilityPreviewState = useWorkflowCapabilityPreview({ workspaceId: workspace.id, workflow: selectedWorkflow, options: effectiveWorkflowOptions, message: workflowMessage, agents: workflowAgents, runInputs: selectedWorkflowRunInputs });
  const launchWorkflowOptions = capabilityPreviewState.launchOptions;
  const launchInputState = capabilityPreviewState.launchInput;
  const launchBlocker = !workflowOptionsReady
    ? 'Workflow options must load before launching a workflow.'
    : baseLaunchBlocker || launchInputState.blocker || capabilityPreviewState.blocker;
  const isEditingWorkflow = Boolean(selectedWorkflow && editingWorkflowId === selectedWorkflow.id);
  const systemProvidedSelected = Boolean(selectedWorkflow && isSystemProvidedWorkflow(selectedWorkflow));
  const workflowPrimaryAction = selectedWorkflow ? getWorkflowPrimaryAction(selectedWorkflow) : 'launch'; const isWriteCapableSelected = Boolean(selectedWorkflow) && selectedWorkflow!.policy.mode !== 'read_only';
  const needsLaunchAcknowledgement = isWriteCapableSelected && launchAcknowledgedId !== selectedWorkflow?.id;
  const workflowDeleteBlocker = getWorkflowDeleteBlocker(selectedWorkflow, canManageWorkflowScope);
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
    selectedWorkflow, selectedWorkflowEditDraft, workflowMessage, workflowRunInputs: selectedWorkflowRunInputs, workflowAgents, workflowSessionIds, setWorkflowSessionIds,
    setLaunchError, setLaunchRecovery, setLaunchingWorkflowId, setLaunchResult, setActiveTab: (tab: WorkflowTab) => selectWorkflowTab(tab, selectedWorkflow?.id), setApprovalRecords, setApprovalError,
    setPendingWorkflowRuns,
    setApprovalAction, expandedRunLogId, setExpandedRunLogId, runEventsByRunId, setRunEventsByRunId,
    setRunLogError, setRunLogLoadingId, setCancelRunError, setCancelRunAction, setScopeSaveResult,
    workflowRunMessageDrafts, setWorkflowRunMessageDrafts, setWorkflowRunMessages,
    setWorkflowRunMessageSendingId, setWorkflowRunMessageErrorByRunId, setWorkflowRunMessageRecoveryByRunId,
     setScopeDrafts, setScopeSaveError, setIsEditingScopeTab, scopeDrafts, setSavingScope, setNewWorkflowTag,
     newWorkflowTag, setWorkflowEditDrafts, setWorkflowUpdateError, setWorkflowUpdateResult, setDeleteWorkflowError,
     setDeleteWorkflowId, setEditingWorkflowId, setUpdatingWorkflowId, setDuplicatingWorkflowId, selectResultingWorkflow: selectWorkflow, selectWorkflowTab, setDeletingWorkflowId,
      createDraft, setCreateDraft, setCreatePanelOpen, setCreateError, setCreatingWorkflow,
      canManageWorkflowScope, workflowOptionsReady, launchBlocker, capabilityPreview: capabilityPreviewState.preview, workflowOptions: effectiveWorkflowOptions, agentSelectionDrafts, setAgentSelectionDrafts,
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
      <PageHeader
        title="Workflows"
        description="Create, launch, and audit governed workspace automations with visible agent access and approval gates."
        actions={<div className="flex flex-col items-start gap-2 lg:items-end">
          <div className="flex flex-wrap gap-2">
            <WorkflowTemplateActions workspace={workspace} open={templateSetupOpen} focusWorkflowId={selectedWorkflow?.id} onOpenChange={setTemplateSetupOpen} onChanged={(workflowId) => { setWorkflowCatalogReloadKey((value) => value + 1); capabilityPreviewState.retry(); if (workflowId) selectWorkflow(workflowId); }} />
            <Button type="button" variant="primary" size="md" className="whitespace-nowrap self-start lg:self-auto" onClick={() => { updateUrlSearch({ panel: 'create' }); setCreateWorkflowStep(1); }} disabled={!canManageWorkflowScope || !workflowOptionsReady} title={!canManageWorkflowScope ? 'You need manage_workflows to create workflows.' : !workflowOptionsReady ? 'Workflow options must load before creating a workflow.' : undefined}>
              <ICONS.Plus className="h-4 w-4" aria-hidden="true" /> Create workflow
            </Button>
          </div>
          {!canManageWorkflowScope && <span className="type-caption max-w-64 font-semibold text-ui-text-muted lg:text-right">Ask a workspace manager for manage_workflows to create or edit workflow definitions.</span>}
        </div>}
      />

      {workflowLoadError && <WorkflowLoadErrorNotice onRetry={() => setWorkflowCatalogReloadKey((value) => value + 1)} />}
      {workflowOptionsError && <div role="alert" className="mb-4 flex flex-col gap-3 rounded-md border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-sm text-status-danger-text sm:flex-row sm:items-center sm:justify-between">
        <div><strong>Workflow options could not be loaded.</strong> {workflowOptionsError}</div><Button type="button" variant="secondary" size="sm" onClick={() => setWorkflowOptionsReloadKey((value) => value + 1)}>Retry</Button>
      </div>}
      {createPanelOpen && <WorkflowCreateDrawer
          createWorkflowStep={createWorkflowStep} setCreateWorkflowStep={setCreateWorkflowStep}
          createDraft={createDraft} setCreateDraft={setCreateDraft}
          createError={createError} creatingWorkflow={creatingWorkflow}
          canManageWorkflowScope={canManageWorkflowScope} workflowOptions={effectiveWorkflowOptions}
          workspaceId={workspace.id}
          workflowOptionsReady={workflowOptionsReady}
          onClose={workflowActions.closeCreateWorkflowPanel} onCreate={() => void workflowActions.createNewWorkflow()}
        />}
      <WorkflowDiscovery
          ready={workflowCatalogReady} query={query} totalCount={workflows.length} visibleCount={visibleWorkflows.length} workflowSearchTags={workflowSearchTags}
          onQueryChange={(next) => { setQuery(next); updateUrlSearch({ q: next || null }, { replace: true }); }}
        />

        <MasterDetailLayout
        showDetailOnCompact={hasExplicitWorkflowSelection}
        compactBackLabel="Back to workflows"
        onCompactBack={() => { const workflowId = selectedWorkflow?.id; clearWorkflowSelection(); if (workflowId) window.requestAnimationFrame(() => workflowRowRefs.current.get(workflowId)?.focus()); }}
        list={<WorkflowLibraryList workflows={workflows} visibleWorkflows={visibleWorkflows} selectedWorkflow={selectedWorkflow} ready={workflowCatalogReady} loadError={workflowLoadError} onSelectWorkflow={selectWorkflow} registerWorkflowRow={(workflowId, node) => { if (node) workflowRowRefs.current.set(workflowId, node); else workflowRowRefs.current.delete(workflowId); }} />}
        detail={selectedWorkflow ? (
          <section className="min-w-0 overflow-hidden">
            <MasterDetailPaneHeader
              badges={<><StatusBadge tone={workflowStatusTone(selectedWorkflow.status)}>{selectedWorkflow.status}</StatusBadge><WorkflowModeBadge mode={selectedWorkflow.policy.mode} /><span className="type-caption font-semibold text-ui-text-muted">{systemProvidedSelected ? 'Built-in' : selectedWorkflow.owner}</span></>}
              title={selectedWorkflow.name}
              description={selectedWorkflow.description}
              actions={<WorkflowLaunchActions
                  activating={updatingWorkflowId === selectedWorkflow.id}
                  canManageWorkflowScope={canManageWorkflowScope}
                  customizing={duplicatingWorkflowId === selectedWorkflow.id}
                  isWriteCapable={isWriteCapableSelected}
                  launchAcknowledged={launchAcknowledgedId === selectedWorkflow.id}
                  launchBlocker={launchBlocker}
                  launching={launchingWorkflowId === selectedWorkflow.id}
                  needsLaunchAcknowledgement={needsLaunchAcknowledgement}
                  onAcknowledgementChange={(checked) => setLaunchAcknowledgedId(checked ? selectedWorkflow.id : '')}
                  onActivate={() => void workflowActions.toggleWorkflowActive(selectedWorkflow, true)}
                  onCustomize={() => void workflowActions.duplicateSystemWorkflow()}
                  onLaunch={() => void workflowActions.launchSelectedWorkflow()}
                  onSchedule={() => updateUrlSearch({ workflow: selectedWorkflow.id, panel: 'schedule' })}
                  onSetup={() => {
                    if (systemProvidedSelected) {
                      updateUrlSearch({ workflow: selectedWorkflow.id, panel: 'templates' });
                      setTemplateSetupOpen(true);
                    } else {
                      selectWorkflowTab('capabilities', selectedWorkflow.id);
                    }
                  }}
                  primaryAction={workflowPrimaryAction}
                  showCustomize={systemProvidedSelected}
                  tags={selectedWorkflow.tags}
                />}
            />

            <div className="bg-ui-surface px-3">
              <SegmentedTabs<WorkflowTab>
                activeValue={activeTab}
                allPanelsMounted={false}
                ariaLabel="Workflow section tabs"
                className="gap-0"
                idBase="workflow-section"
                items={workflowTabItems}
                onValueChange={(tab) => selectWorkflowTab(tab, selectedWorkflow.id)}
              />
            </div>

            <MasterDetailPaneBody>
              {activeTab === 'overview' && (
                <WorkflowTabPanel tab="overview" title="Overview" description="Review assigned agents and the operator message used for the next run.">
                  <WorkflowSection
                    title={t('workflowCoordination.agentsTitle')}
                    description={t('workflowCoordination.agentsDescription')}
                    action={(
                      <Button type="button" variant="secondary" size="sm" onClick={() => selectWorkflowTab('agents', selectedWorkflow.id)}>
                        <ICONS.Bot className="h-4 w-4" aria-hidden="true" />
                        Review agents
                      </Button>
                    )}
                  >
                    <AgentAssignmentList
                      className="mt-4"
                      agents={selectedWorkflow.agents}
                      labelForAgent={() => selectedWorkflow.executionMode === 'direct' ? t('workflowCoordination.directLabel') : t('workflowCoordination.coordinatedLabel')}
                    />
                  </WorkflowSection>
                  <WorkflowSection
                    title="Prompt"
                    description="Describe the outcome you want when this workflow starts. Include requested changes, review instructions, questions, and other operator intent here."
                  >
                    <WorkflowPromptEditor
                      workflow={selectedWorkflow}
                      catalog={launchWorkflowOptions}
                      agents={workflowAgents}
                      message={workflowMessage}
                      onChange={setWorkflowMessage}
                    />
                    <p className="type-caption mt-2 text-ui-text-muted">Changing this prompt affects only the next launch, not the saved workflow default.</p>
                    <WorkflowCapabilityLedger
                      workspaceId={workspace.id}
                      preview={capabilityPreviewState.preview}
                      loading={capabilityPreviewState.loading}
                      error={capabilityPreviewState.error}
                      onRetry={capabilityPreviewState.retry}
                    />
                  </WorkflowSection>
                  {launchError && <div role="alert" aria-live="assertive" className="rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">{launchError}{launchRecovery && <a className="ml-2 underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-control-boundary" href={launchRecovery.href}>{launchRecovery.label}</a>}</div>}
                  {launchResult?.workflowId === selectedWorkflow.id && <div role="status" aria-live="polite" aria-atomic="true" className="rounded-md border border-status-success/30 bg-status-success-soft p-3 text-xs font-semibold text-status-success-text">Run dispatched with {launchResult.toolCount} tools. Run ID: {launchResult.runId}.</div>}
                </WorkflowTabPanel>
              )}

              {activeTab === 'agents' && (
                <WorkflowAgentsPanel
                  workflow={selectedWorkflow}
                  selectedAgentSelectionDraft={selectedAgentSelectionDraft}
                  activeAgentOptions={activeAgentOptions}
                  isEditingAgentSelection={isEditingAgentSelection}
                  canManageWorkflowScope={canManageWorkflowScope}
                  systemProvided={systemProvidedSelected}
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
                  runMessageRecoveryByRunId={workflowRunMessageRecoveryByRunId}
                  setExpandedRunLogId={setExpandedRunLogId}
                />
              )}

              {activeTab === 'capabilities' && (
                <WorkflowCapabilitiesPanel
                  workflow={selectedWorkflow}
                  agents={workflowAgents}
                  catalogFailures={(['mcpTools', 'agents'] as const).flatMap((source) => ['error', 'unavailable'].includes(workflowOptions.sourceAvailability[source]?.status) ? [workflowOptions.sourceAvailability[source]?.message || source] : [])}
                  onRetryCatalog={() => setWorkflowOptionsReloadKey((value) => value + 1)}
                />
              )}

              {activeTab === 'settings' && (
                <WorkflowTabPanel
                  tab="settings"
                  title="Settings"
                  description={systemProvidedSelected ? 'Manage workspace availability or customize an editable copy. AcornOps maintains the built-in definition.' : 'Edit saved defaults, pause new runs, manage tags, or delete this custom workflow with confirmation.'}
                >
                  {(workflowUpdateError || workflowUpdateResult || deleteWorkflowError) && <div role={workflowUpdateError || deleteWorkflowError ? 'alert' : 'status'} aria-live={workflowUpdateError || deleteWorkflowError ? 'assertive' : 'polite'} aria-atomic="true" className={`rounded-md border px-3 py-2 text-xs font-semibold ${workflowUpdateError || deleteWorkflowError ? 'border-status-danger/30 bg-status-danger-soft text-status-danger-text' : 'border-status-success/30 bg-status-success-soft text-status-success-text'}`}>{workflowUpdateError || deleteWorkflowError || workflowUpdateResult}</div>}
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
                    title="Workflow defaults"
                    action={!systemProvidedSelected && !isEditingWorkflow && (
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
                          <div className="block">
                            <span className="type-micro-label text-ui-text-muted">Message</span>
                            <WorkflowPromptEditor
                              workflow={selectedWorkflow}
                              message={selectedWorkflowEditDraft.starterPrompt}
                              onChange={(starterPrompt) => workflowActions.updateWorkflowEditDraft(selectedWorkflow.id, { starterPrompt })}
                              mode="authoring"
                            />
                            <span className="type-caption mt-2 block text-ui-text-muted">{t('workflowPrompt.authoringGuidance')}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="secondary" size="sm" onClick={() => workflowActions.cancelEditingWorkflow(selectedWorkflow)}>Cancel</Button>
                            <Button variant="primary" size="sm" onClick={() => void workflowActions.saveWorkflowDefinition()} disabled={!canManageWorkflowScope || updatingWorkflowId === selectedWorkflow.id || !selectedWorkflowEditDraft.name.trim()}>Save workflow</Button>
                          </div>
                        </>
                      ) : (
                        <div className="rounded-md border border-ui-border bg-ui-bg px-4 py-3">
                          <div className="type-micro-label text-ui-text-muted">Message</div>
                          <p className="mt-2 text-sm font-semibold leading-6 text-ui-text">{selectedWorkflow.starterPrompt}</p>
                          <p className="type-caption mt-2 text-ui-text-muted">Used to start new workflow sessions.</p>
                        </div>
                      )}
                    </div>
                  </WorkflowSection>
                  <WorkflowSection title="Workflow tags">
                    <WorkflowTagsEditor tags={selectedWorkflow.tags} tagDraft={newWorkflowTag} readOnly={systemProvidedSelected} pending={updatingWorkflowId === selectedWorkflow.id} onTagDraftChange={setNewWorkflowTag} onAdd={() => void workflowActions.addWorkflowTag(selectedWorkflow.id)} onRemove={(tag) => void workflowActions.removeWorkflowTag(selectedWorkflow.id, tag)} />
                  </WorkflowSection>
                  <details aria-label="Delete workflow" className="group min-w-0 border-t border-status-danger/25 pt-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-md text-status-danger-text focus:outline-none focus-visible:ring-2 focus-visible:ring-status-danger/25 [&::-webkit-details-marker]:hidden">
                      <span className="type-row-title">Danger zone</span>
                      <ICONS.ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <div className="mt-3 flex flex-col gap-3 rounded-lg bg-status-danger-soft px-4 py-3 text-status-danger-text sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <h4 className="type-row-title">Delete workflow</h4>
                        <p className="type-caption mt-1 max-w-2xl">{systemProvidedSelected ? 'Permanently removes this starter workflow. It will not be restored automatically.' : 'Permanently removes this user-authored workflow definition. Past runs remain in audit history.'}</p>
                        {workflowDeleteBlocker && <p id="workflow-delete-blocker" className="type-caption mt-2 max-w-2xl font-semibold">{workflowDeleteBlocker}</p>}
                      </div>
                      <Button variant="danger" size="sm" onClick={() => { setDeleteWorkflowId(selectedWorkflow.id); setDeleteWorkflowConfirmation(''); }} disabled={Boolean(workflowDeleteBlocker)} title={workflowDeleteBlocker || undefined} aria-describedby={workflowDeleteBlocker ? 'workflow-delete-blocker' : undefined}>Delete workflow</Button>
                    </div>
                  </details>
                </WorkflowTabPanel>
              )}
            </MasterDetailPaneBody>
          </section>
        ) : null}
        />
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
