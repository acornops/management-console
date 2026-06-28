import React, { useMemo, useState } from 'react';
import { Loader2, Square } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { PageSearchInput } from '@/components/common/PageSearchInput';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ICONS } from '@/constants';
import type { Workspace } from '@/types';
import { TraceFooter } from '@/features/kubernetes-cluster-detail/components/detail/TraceFooter';
import {
  appendWorkflowSearchTag,
  createDefaultWorkflowDefinitions,
  filterWorkflowDefinitions,
  getWorkflowLaunchBlocker,
  getWorkflowTabLabel,
  getWorkflowToolScopeSummary,
  type WorkflowDefinition,
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
  type WorkflowRunEvent,
  type WorkflowRunSummary
} from '@/services/control-plane/workflowApi';
import {
  ScopeSwitch,
  createFallbackWorkflowOptions,
  createScopeDraft,
  createWorkflowDraft,
  createWorkflowEditDraft,
  isRunActive,
  mapApiWorkflowToDefinition,
  mapWorkflowRunSummary,
  normalizeWorkflowOptionsCatalog,
  runStatusTone,
  tabs,
  uniqueValues,
  workflowRunToTrace,
  workflowStatusTone,
  type CreateWorkflowDraft,
  type ScopeDraft,
  type WorkflowEditDraft
} from '@/pages/workflows/workflowPageHelpers';
import { useWorkspaceWorkflowActions } from '@/pages/workflows/useWorkspaceWorkflowActions';
import {
  AgentAssignmentList,
  CapabilityReviewRow,
  WorkflowCreateDrawer,
  WorkflowScopeRow,
  WorkflowSection,
  WorkflowTabPanel,
  workflowTabIcons,
  type CreateWorkflowStep
} from '@/pages/WorkspaceWorkflowsPage.components';

interface WorkspaceWorkflowsPageProps {
  workspace: Workspace;
}

export const WorkspaceWorkflowsPage: React.FC<WorkspaceWorkflowsPageProps> = ({ workspace }) => {
  const fallbackWorkflows = useMemo(() => createDefaultWorkflowDefinitions(workspace.id), [workspace.id]);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>(fallbackWorkflows);
  const [workflowOptions, setWorkflowOptions] = useState<WorkflowOptionsCatalog>(() => createFallbackWorkflowOptions(fallbackWorkflows));
  const [query, setQuery] = useState('');
  const workflowSearchTags = useMemo(() => uniqueValues(workflows.flatMap((workflow) => workflow.tags)), [workflows]);
  const filteredWorkflows = useMemo(() => filterWorkflowDefinitions(workflows, query), [query, workflows]);
  const visibleWorkflows = filteredWorkflows;
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(workflows[0]?.id || '');
  const selectedWorkflow = visibleWorkflows.find((workflow) => workflow.id === selectedWorkflowId) || visibleWorkflows[0] || filteredWorkflows[0] || workflows[0];
  const [activeTab, setActiveTab] = useState<WorkflowTab>('overview');
  const [isEditingScopeTab, setIsEditingScopeTab] = useState<'' | 'capabilities'>('');
  const [workflowLoadError, setWorkflowLoadError] = useState('');
  const [workflowMessage, setWorkflowMessage] = useState('');
  const [workflowSessionIds, setWorkflowSessionIds] = useState<Record<string, string>>({});
  const [compiledScopes, setCompiledScopes] = useState<Record<string, Record<string, unknown>>>({});
  const [launchingWorkflowId, setLaunchingWorkflowId] = useState('');
  const [launchError, setLaunchError] = useState('');
  const [launchResult, setLaunchResult] = useState<{ workflowId: string; runId: string; workflowRunId: string } | null>(null);
  const [approvalRecords, setApprovalRecords] = useState<Record<string, WorkflowRunApproval[]>>({});
  const [approvalAction, setApprovalAction] = useState('');
  const [approvalError, setApprovalError] = useState('');
  const [runEventsByRunId, setRunEventsByRunId] = useState<Record<string, WorkflowRunEvent[]>>({});
  const [expandedRunLogId, setExpandedRunLogId] = useState('');
  const [runLogLoadingId, setRunLogLoadingId] = useState('');
  const [runLogError, setRunLogError] = useState('');
  const [cancelRunAction, setCancelRunAction] = useState('');
  const [cancelRunError, setCancelRunError] = useState('');
  const [scopeDrafts, setScopeDrafts] = useState<Record<string, ScopeDraft>>({});
  const [scopeSaveError, setScopeSaveError] = useState<{ tab: 'capabilities'; message: string } | null>(null);
  const [scopeSaveResult, setScopeSaveResult] = useState<{ tab: 'capabilities'; message: string } | null>(null);
  const [savingScope, setSavingScope] = useState('');
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
  const [deletingWorkflowId, setDeletingWorkflowId] = useState('');
  const [deleteWorkflowError, setDeleteWorkflowError] = useState('');
  const canManageWorkflowScope = Boolean(workspace.permissions?.manage_workflows);
  React.useEffect(() => {
    let mounted = true;
    setWorkflows(fallbackWorkflows);
    setWorkflowOptions(createFallbackWorkflowOptions(fallbackWorkflows));
    setSelectedWorkflowId((current) => current || fallbackWorkflows[0]?.id || '');
    setWorkflowLoadError('');
    listWorkspaceWorkflows(workspace.id)
      .then((items) => {
        if (!mounted) return;
        const mapped = items.map((item) => mapApiWorkflowToDefinition(
          item,
          fallbackWorkflows.find((workflow) => workflow.id === item.id),
          workspace.id
        ));
        if (mapped.length > 0) {
          setWorkflows(mapped);
          setSelectedWorkflowId((current) => mapped.some((workflow) => workflow.id === current) ? current : mapped[0].id);
        }
      })
      .catch((error) => {
        if (!mounted) return;
        setWorkflowLoadError(error instanceof Error ? error.message : 'Unable to load workflow catalog');
      });
    return () => {
      mounted = false;
    };
  }, [fallbackWorkflows, workspace.id]);

  React.useEffect(() => {
    let mounted = true;
    listWorkflowOptions(workspace.id)
      .then((catalog) => {
        if (mounted) setWorkflowOptions(normalizeWorkflowOptionsCatalog(catalog, createFallbackWorkflowOptions(fallbackWorkflows)));
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
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
  }, [selectedWorkflow?.id, workflowOptions]);

  React.useEffect(() => {
    if (!selectedWorkflow) return;
    let mounted = true;
    listWorkflowSessions(workspace.id, selectedWorkflow.id)
      .then((sessions) => {
        if (!mounted) return;
        const runs = sessions.flatMap((session) => session.runs || []).map(mapWorkflowRunSummary);
        setWorkflows((current) => current.map((workflow) => workflow.id === selectedWorkflow.id
          ? { ...workflow, runs, lastRun: runs[0]?.startedAt || 'No runs yet' }
          : workflow));
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [selectedWorkflow?.id, workspace.id]);

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
    return () => {
      mounted = false;
    };
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
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
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
  const selectedScopeBaseline = selectedWorkflow ? createScopeDraft(selectedWorkflow) : undefined;
  const selectedScopeDirty = Boolean(
    selectedScopeDraft &&
    selectedScopeBaseline &&
    JSON.stringify(selectedScopeDraft) !== JSON.stringify(selectedScopeBaseline)
  );
  const isEditingCapabilityGate = isEditingScopeTab === 'capabilities';
  const launchBlocker = selectedWorkflow
    ? getWorkflowLaunchBlocker(selectedWorkflow, workflowMessage, workspace.permissions)
    : 'Select a workflow before launching.';
  const isEditingWorkflow = Boolean(selectedWorkflow && editingWorkflowId === selectedWorkflow.id);
  const selectedWorkflowEditDraft = selectedWorkflow
    ? workflowEditDrafts[selectedWorkflow.id] || createWorkflowEditDraft(selectedWorkflow)
    : undefined;
  const workflowActions = useWorkspaceWorkflowActions({
    workspace, workflows, setWorkflows,
    selectedWorkflow, selectedWorkflowEditDraft, workflowMessage, workflowSessionIds, setWorkflowSessionIds,
    setCompiledScopes, setLaunchError, setLaunchingWorkflowId, setLaunchResult, setActiveTab, setApprovalRecords, setApprovalError,
    setApprovalAction, expandedRunLogId, setExpandedRunLogId, runEventsByRunId, setRunEventsByRunId,
    setRunLogError, setRunLogLoadingId, setCancelRunError, setCancelRunAction, setScopeSaveResult,
    setScopeDrafts, setScopeSaveError, setIsEditingScopeTab, scopeDrafts, setSavingScope, setNewWorkflowTag,
    newWorkflowTag, setWorkflowEditDrafts, setWorkflowUpdateError, setWorkflowUpdateResult, setDeleteWorkflowError,
    setDeleteWorkflowId, setEditingWorkflowId, setUpdatingWorkflowId, setSelectedWorkflowId, setDeletingWorkflowId,
    createDraft, setCreateDraft, setCreatePanelOpen, setCreateError, setCreatingWorkflow,
    canManageWorkflowScope, launchBlocker
  });

  return (
    <div className="min-h-0 w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="type-route-title">Workflows</h1>
          <p className="type-body mt-3 max-w-3xl break-words text-ui-text-muted [overflow-wrap:anywhere]">Workspace automations run through assigned agents, narrowed capabilities, target context, and auditable run controls.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <PageSearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search workflows, agents, tools, tags"
            aria-label="Search workflows"
            className="lg:w-80"
          />
          <Button type="button" variant="secondary" size="md" className="whitespace-nowrap" onClick={() => { setCreatePanelOpen(true); setCreateWorkflowStep(1); }} disabled={!canManageWorkflowScope}>
            <ICONS.Plus className="h-4 w-4" />
            Create workflow
          </Button>
        </div>
      </header>

      {workflowLoadError && (
        <div className="mb-4 rounded-md border border-status-warning/30 bg-status-warning-soft px-3 py-2 text-xs font-semibold text-status-warning-text">
          Using the local workflow catalog because control-plane workflows could not be loaded.
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
          onClose={workflowActions.closeCreateWorkflowPanel}
          onCreate={() => void workflowActions.createNewWorkflow()}
        />
      )}

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
        <section aria-label="Workflow library" className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 sm:justify-between">
            <div className="type-micro-label text-ui-text">{query.trim() ? 'Matching workflows' : 'Workflow library'}</div>
            <div className="type-caption font-semibold text-ui-text-muted">{visibleWorkflows.length} of {workflows.length} workflows</div>
          </div>
          {workflowSearchTags.length > 0 && query.trim() && (
            <div className="flex flex-wrap gap-2 px-1">
              {workflowSearchTags.slice(0, 8).map((tag) => (
                <button key={tag} type="button" onClick={() => setQuery((current) => appendWorkflowSearchTag(current, tag))} className="rounded-md border border-ui-border bg-ui-surface px-2.5 py-1.5 text-xs font-bold text-ui-text-muted hover:text-ui-text">
                  {tag}
                </button>
              ))}
            </div>
          )}
          {visibleWorkflows.map((workflow) => (
            <button key={workflow.id} type="button" onClick={() => { setSelectedWorkflowId(workflow.id); setActiveTab('overview'); }} className={`w-full rounded-lg border p-3.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${workflow.id === selectedWorkflow?.id ? 'border-accent/45 bg-accent-soft/55' : 'border-ui-border bg-ui-surface hover:bg-ui-bg'}`}>
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="type-row-title block text-ui-text">{workflow.name}</span>
                  <span className="type-caption mt-1 block leading-5 text-ui-text-muted">{workflow.description}</span>
                </span>
                <StatusBadge tone={workflowStatusTone(workflow.status)}>{workflow.status}</StatusBadge>
              </span>
              <span className="mt-3 flex items-center gap-2 text-xs font-semibold text-ui-text-muted">
                <ICONS.Bot className="h-3.5 w-3.5" />
                <span className="truncate">{workflow.primaryAgent.name}</span>
              </span>
              <span className="type-caption mt-1 block truncate text-ui-text-muted">{workflow.supportingAgents.length} supporting agents, {workflow.allowedTools.length} allowed tools</span>
            </button>
          ))}
          {visibleWorkflows.length === 0 && <div className="rounded-lg border border-ui-border bg-ui-surface p-6 text-sm font-semibold text-ui-text-muted">No workflows match this search.</div>}
        </section>

        {selectedWorkflow && (
          <section className="min-w-0 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
            <div className="border-b border-ui-border bg-ui-bg px-5 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent-soft text-accent-strong">
                    <ICONS.GitBranch className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={workflowStatusTone(selectedWorkflow.status)}>{selectedWorkflow.status}</StatusBadge>
                      <span className="type-caption font-semibold text-ui-text-muted">{selectedWorkflow.policy.mode.replace('_', ' ')}</span>
                    </div>
                    <h2 className="mt-3 type-section-title">{selectedWorkflow.name}</h2>
                    <p className="type-body mt-2 max-w-3xl text-ui-text-muted">{selectedWorkflow.description}</p>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-3 lg:items-end">
                  <Button variant="accent" size="md" onClick={() => void workflowActions.launchSelectedWorkflow()} disabled={launchingWorkflowId === selectedWorkflow.id || Boolean(launchBlocker)} title={launchBlocker || undefined}>
                    <ICONS.Send className="h-4 w-4" />
                    {launchingWorkflowId === selectedWorkflow.id ? 'Starting...' : 'Launch workflow'}
                  </Button>
                  {launchBlocker && <span className="max-w-64 text-left text-xs font-semibold text-ui-text-muted lg:text-right">{launchBlocker}</span>}
                  <div className="grid gap-1 text-sm font-semibold text-ui-text-muted lg:text-right">
                    <span>Primary agent: {selectedWorkflow.primaryAgent.name}</span>
                    <span>Supporting agents: {selectedWorkflow.supportingAgents.length}</span>
                    <span>Last run: {selectedWorkflow.lastRun}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-ui-surface px-3">
              <div role="tablist" aria-label="Workflow section tabs" className="flex gap-2 overflow-x-auto border-b border-ui-border">
                {tabs.map((tab) => {
                  const TabIcon = workflowTabIcons[tab];
                  return (
                    <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${activeTab === tab ? 'border-accent text-accent-strong' : 'border-transparent text-ui-text-muted hover:border-ui-border hover:text-ui-text'}`}>
                      <TabIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{getWorkflowTabLabel(tab)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-5 bg-ui-bg/45 p-4 sm:p-5">
              {activeTab === 'overview' && (
                <WorkflowTabPanel
                  eyebrow="Run setup"
                  title="Overview"
                  description="Start the workflow from the selected assignment, current message, and compiled runtime access."
                >
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
                    <WorkflowSection
                      title="Assigned agents"
                      description="The primary agent owns the run. Supporting agents contribute specialist capability."
                      action={<Button type="button" variant="tertiary" size="sm" onClick={() => setActiveTab('agents')}>Review agents</Button>}
                    >
                      <AgentAssignmentList
                        className="mt-4"
                        primaryAgent={selectedWorkflow.primaryAgent}
                        supportingAgents={selectedWorkflow.supportingAgents}
                        supportingLabel="Supporting agent"
                      />
                    </WorkflowSection>
                    <WorkflowSection
                      title="Capability review"
                      description={`${getWorkflowToolScopeSummary(selectedWorkflow)}. Workflow gate narrows assigned-agent capabilities.`}
                    >
                      <dl className="mt-4 grid gap-3 text-sm">
                        <div className="flex justify-between gap-3"><dt className="text-ui-text-muted">Runtime access</dt><dd className="font-semibold text-ui-text">{selectedWorkflow.allowedTools.length} tools</dd></div>
                        <div className="flex justify-between gap-3"><dt className="text-ui-text-muted">Workflow gate</dt><dd className="font-semibold text-ui-text">{selectedWorkflow.disabledCapabilities.length} blocked</dd></div>
                        <div className="flex justify-between gap-3"><dt className="text-ui-text-muted">Approvals</dt><dd className="font-semibold text-ui-text">{selectedWorkflow.policy.approvals.length}</dd></div>
                      </dl>
                    </WorkflowSection>
                  </div>
                  <WorkflowSection title="Control message" description="Edit the operator prompt used when launching this workflow.">
                    <textarea aria-label="Control message" value={workflowMessage} onChange={(event) => setWorkflowMessage(event.target.value)} className="mt-3 min-h-32 w-full resize-y rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-sm font-medium leading-6 text-ui-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/10" />
                  </WorkflowSection>
                  {selectedCompiledScope && <div className="rounded-md border border-accent/25 bg-accent-soft p-3 text-xs font-semibold text-accent-strong">{selectedAccessTools.length} tools compiled for this run.</div>}
                  {launchError && <div className="rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">{launchError}</div>}
                  {launchResult?.workflowId === selectedWorkflow.id && <div className="rounded-md border border-status-success/30 bg-status-success-soft p-3 text-xs font-semibold text-status-success-text">Run {launchResult.workflowRunId || launchResult.runId} dispatched.</div>}
                </WorkflowTabPanel>
              )}

              {activeTab === 'agents' && (
                <WorkflowTabPanel
                  eyebrow="Assignment"
                  title="Agents"
                  description="Review who owns the run and which specialist agents can contribute context or decisions."
                >
                  <WorkflowSection title="Primary agent" description="Accountable owner for the workflow run and final output.">
                    <AgentAssignmentList className="mt-3" primaryAgent={selectedWorkflow.primaryAgent} supportingAgents={[]} />
                  </WorkflowSection>
                  <WorkflowSection title="Supporting agents" description="Specialist agents assigned to the workflow in explicit roles.">
                    <AgentAssignmentList
                      className="mt-3"
                      supportingAgents={selectedWorkflow.supportingAgents}
                      supportingLabel={(agent) => agent.required ? 'Required' : 'Optional'}
                    />
                  </WorkflowSection>
                </WorkflowTabPanel>
              )}

              {activeTab === 'targets' && (
                <WorkflowTabPanel
                  eyebrow="Runtime context"
                  title="Targets"
                  description="Compiled before run start. The workflow can read only this target scope and workspace context."
                >
                  <WorkflowSection title="Target context">
                    <dl className="mt-2 divide-y divide-ui-border">
                      <WorkflowScopeRow
                        label="Target selection"
                        values={selectedWorkflow.targetSelection}
                        emptyLabel="No target selector configured."
                      />
                      <WorkflowScopeRow
                        label="Context grants"
                        values={selectedWorkflow.contextGrants}
                        emptyLabel="No context grants configured."
                      />
                    </dl>
                  </WorkflowSection>
                </WorkflowTabPanel>
              )}

              {activeTab === 'runs' && (
                <WorkflowTabPanel
                  eyebrow="Audit trail"
                  title="Runs"
                  description="Review previous executions, approvals, live trace details, and cancellation controls."
                >
                  {[approvalError, runLogError, cancelRunError].filter(Boolean).map((message) => <div key={message} className="rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">{message}</div>)}
                  {selectedWorkflow.runs.length > 0 ? selectedWorkflow.runs.map((run) => {
                    const effectiveRunId = run.runId || run.id;
                    const approvals = run.runId ? approvalRecords[run.runId] || [] : [];
                    const traceExpanded = expandedRunLogId === effectiveRunId;
                    const runTrace = workflowRunToTrace(run, runEventsByRunId[effectiveRunId] || []);
                    return (
                      <article key={run.id} className="rounded-lg border border-ui-border bg-ui-surface p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="type-row-title">{run.id}</div>
                            <div className="type-caption mt-1 text-ui-text-muted">{run.actor} · {run.startedAt} · {run.duration}</div>
                            <div className="mt-2"><StatusBadge tone={runStatusTone(run.status)}>{run.status.replace('_', ' ')}</StatusBadge></div>
                          </div>
                          {isRunActive(run.status) && (
                            <Button type="button" size="icon" variant="secondary" onClick={() => void workflowActions.stopWorkflowRun(effectiveRunId)} aria-label="Stop workflow run" disabled={cancelRunAction === effectiveRunId}>
                              {cancelRunAction === effectiveRunId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-3.5 w-3.5 fill-current" />}
                            </Button>
                          )}
                        </div>
                        <p className="type-caption mt-3 text-ui-text">{run.output}</p>
                        {approvals.length > 0 && (
                          <div className="mt-3 grid gap-2">
                            {approvals.map((approval) => (
                              <div key={approval.id} className="rounded-md border border-ui-border bg-ui-bg p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-sm font-semibold text-ui-text">{approval.summary || approval.toolName}</span>
                                  <StatusBadge tone={approval.status === 'approved' ? 'success' : approval.status === 'pending' ? 'warning' : 'neutral'}>{approval.status}</StatusBadge>
                                </div>
                                {approval.status === 'pending' && (
                                  <div className="mt-3 flex justify-end gap-2">
                                    <Button size="sm" variant="secondary" onClick={() => void workflowActions.decideApproval(approval.runId, approval.id, 'approved')} disabled={approvalAction.startsWith(`${approval.runId}:${approval.id}`)}>Approve</Button>
                                    <Button size="sm" variant="danger" onClick={() => void workflowActions.decideApproval(approval.runId, approval.id, 'rejected')} disabled={approvalAction.startsWith(`${approval.runId}:${approval.id}`)}>Reject</Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 border-t border-ui-border pt-2">
                          <TraceFooter runId={effectiveRunId} trace={runTrace} isExpanded={traceExpanded} setExpanded={(runId, expanded) => expanded ? void workflowActions.toggleRunLogs(runId) : setExpandedRunLogId('')} compactStatusOnly />
                        </div>
                      </article>
                    );
                  }) : <div className="rounded-lg border border-ui-border bg-ui-surface p-6 text-sm font-semibold text-ui-text-muted">This workflow has no prior runs.</div>}
                </WorkflowTabPanel>
              )}

              {activeTab === 'capabilities' && selectedScopeDraft && (
                <WorkflowTabPanel
                  eyebrow="Access gate"
                  title="Capability review"
                  description="Access is inherited from assigned agents, then narrowed by this workflow before each run starts."
                  actions={
                    <div className="flex flex-wrap gap-2">
                      {isEditingCapabilityGate ? (
                        <>
                          <Button type="button" variant="tertiary" size="sm" onClick={workflowActions.cancelEditingScopeTab}>Cancel</Button>
                          <Button type="button" variant="primary" size="sm" onClick={() => void workflowActions.saveWorkflowScope('capabilities')} disabled={!canManageWorkflowScope || !selectedScopeDirty || savingScope === selectedWorkflow.id}>Save capability gate</Button>
                        </>
                      ) : <Button type="button" variant="secondary" size="sm" onClick={() => workflowActions.startEditingScopeTab('capabilities')} disabled={!canManageWorkflowScope}>Edit capability gate</Button>}
                    </div>
                  }
                >
                  {scopeSaveError?.tab === 'capabilities' && <div className="mt-4 rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">{scopeSaveError.message}</div>}
                  {scopeSaveResult?.tab === 'capabilities' && <div className="mt-4 rounded-md border border-status-success/30 bg-status-success-soft p-3 text-xs font-semibold text-status-success-text">{scopeSaveResult.message}</div>}

                  <WorkflowSection title="Inherited access">
                    <dl className="mt-2 divide-y divide-ui-border">
                      <CapabilityReviewRow
                        label="MCP servers"
                        description="Servers exposed by the assigned agents."
                        values={selectedWorkflow.enabledMcpServers}
                        emptyLabel="No MCP servers assigned."
                        technical
                      />
                      <CapabilityReviewRow
                        label="Skills"
                        description="Agent skills available to the workflow."
                        values={selectedWorkflow.enabledSkills}
                        emptyLabel="No skills assigned."
                      />
                      <CapabilityReviewRow
                        label="Allowed tools"
                        description="The callable tool surface after agent assignment."
                        values={selectedWorkflow.allowedTools}
                        emptyLabel="No tools allowed."
                        technical
                      />
                    </dl>
                  </WorkflowSection>

                  <WorkflowSection title="Workflow restrictions">
                    <dl className="mt-2 divide-y divide-ui-border">
                      <CapabilityReviewRow
                        label="Blocked capabilities"
                        description="Capabilities removed by the workflow gate."
                        values={selectedWorkflow.disabledCapabilities}
                        emptyLabel="No capabilities blocked by this workflow."
                      />
                      <CapabilityReviewRow
                        label="Approvals"
                        description="Operator decisions required before write-sensitive steps continue."
                        values={selectedWorkflow.policy.approvals}
                        emptyLabel="No approval constraints configured."
                      />
                    </dl>
                  </WorkflowSection>
                </WorkflowTabPanel>
              )}

              {activeTab === 'settings' && (
                <WorkflowTabPanel
                  eyebrow="Definition"
                  title="Settings"
                  description="Manage workflow availability, starter prompt, tags, and user-authored workflow deletion."
                >
                  {(workflowUpdateError || workflowUpdateResult || deleteWorkflowError) && <div className={`rounded-md border px-3 py-2 text-xs font-semibold ${workflowUpdateError || deleteWorkflowError ? 'border-status-danger/30 bg-status-danger-soft text-status-danger-text' : 'border-status-success/30 bg-status-success-soft text-status-success-text'}`}>{workflowUpdateError || deleteWorkflowError || workflowUpdateResult}</div>}
                  <WorkflowSection title="Availability" description="Control whether this workflow can start new runs.">
                    <div className="flex items-center justify-between gap-4 rounded-md border border-ui-border bg-ui-bg px-4 py-3">
                      <div>
                        <h4 className="type-row-title">{selectedWorkflow.status === 'active' ? 'Active' : 'Inactive'}</h4>
                        <p className="type-caption mt-1 text-ui-text-muted">Toggle availability for new runs.</p>
                      </div>
                      <ScopeSwitch checked={selectedWorkflow.status === 'active'} disabled={!canManageWorkflowScope || updatingWorkflowId === selectedWorkflow.id} label="Toggle workflow active state" onChange={(active) => void workflowActions.toggleWorkflowActive(selectedWorkflow, active)} />
                    </div>
                  </WorkflowSection>
                  <WorkflowSection title="Starter prompt" description="Edit the default prompt copied into the launch message.">
                    <div className="grid gap-3">
                      {isEditingWorkflow && selectedWorkflowEditDraft ? (
                        <>
                          <input value={selectedWorkflowEditDraft.name} onChange={(event) => workflowActions.updateWorkflowEditDraft(selectedWorkflow.id, { name: event.target.value })} className="min-h-10 rounded-md border border-ui-border bg-ui-bg px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent" />
                          <input value={selectedWorkflowEditDraft.description} onChange={(event) => workflowActions.updateWorkflowEditDraft(selectedWorkflow.id, { description: event.target.value })} className="min-h-10 rounded-md border border-ui-border bg-ui-bg px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent" />
                          <textarea value={selectedWorkflowEditDraft.starterPrompt} onChange={(event) => workflowActions.updateWorkflowEditDraft(selectedWorkflow.id, { starterPrompt: event.target.value })} className="min-h-28 rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-sm font-medium text-ui-text outline-none focus:border-accent" />
                          <div className="flex gap-2">
                            <Button variant="tertiary" size="sm" onClick={() => workflowActions.cancelEditingWorkflow(selectedWorkflow)}>Cancel</Button>
                            <Button variant="primary" size="sm" onClick={() => void workflowActions.saveWorkflowDefinition()} disabled={!canManageWorkflowScope || updatingWorkflowId === selectedWorkflow.id || !selectedWorkflowEditDraft.name.trim()}>Save workflow</Button>
                          </div>
                        </>
                      ) : (
                        <div className="rounded-md border border-ui-border bg-ui-bg p-4">
                          <p className="text-sm font-semibold leading-6 text-ui-text">{selectedWorkflow.starterPrompt}</p>
                          <Button className="mt-4" variant="secondary" size="sm" onClick={() => workflowActions.startEditingWorkflow(selectedWorkflow)} disabled={!canManageWorkflowScope}>Edit workflow</Button>
                        </div>
                      )}
                    </div>
                  </WorkflowSection>
                  <WorkflowSection title="Workflow tags">
                    <div className="mt-3 flex flex-wrap gap-2">{selectedWorkflow.tags.map((tag) => <button key={tag} type="button" aria-label={`Remove workflow tag ${tag}`} onClick={() => workflowActions.removeWorkflowTag(selectedWorkflow.id, tag)} className="rounded-md border border-ui-border bg-ui-bg px-2.5 py-1.5 text-xs font-bold text-ui-text-muted">{tag}</button>)}</div>
                    <div className="mt-3 flex gap-2"><input value={newWorkflowTag} onChange={(event) => setNewWorkflowTag(event.target.value)} placeholder="Add tag" className="min-h-10 flex-1 rounded-md border border-ui-border bg-ui-bg px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent" /><Button variant="secondary" size="sm" onClick={() => workflowActions.addWorkflowTag(selectedWorkflow.id)} disabled={!newWorkflowTag.trim()}>Add tag</Button></div>
                  </WorkflowSection>
                  <WorkflowSection title="Delete workflow">
                    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="type-row-title text-status-danger-text">Delete workflow</h3><p className="type-caption mt-1 text-ui-text-muted">Only user-authored workflows can be deleted.</p></div>{deleteWorkflowId === selectedWorkflow.id ? <div className="flex gap-2"><Button variant="tertiary" size="sm" onClick={() => setDeleteWorkflowId('')}>Cancel</Button><Button variant="danger" size="sm" onClick={() => void workflowActions.deleteSelectedWorkflow(selectedWorkflow)} disabled={deletingWorkflowId === selectedWorkflow.id}>Delete</Button></div> : <Button variant="secondary" size="sm" onClick={() => setDeleteWorkflowId(selectedWorkflow.id)} disabled={!canManageWorkflowScope || selectedWorkflow.source !== 'user'}>Delete workflow</Button>}</div>
                  </WorkflowSection>
                </WorkflowTabPanel>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );

};
