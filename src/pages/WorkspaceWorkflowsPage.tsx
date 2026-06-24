import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Square } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { PageSearchInput } from '@/components/common/PageSearchInput';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ICONS } from '@/constants';
import { headerMotion } from '@/lib/motion';
import type { Workspace } from '@/types';
import { TraceFooter } from '@/features/kubernetes-cluster-detail/components/detail/TraceFooter';
import {
  appendWorkflowSearchTag,
  createDefaultWorkflowDefinitions,
  filterWorkflowDefinitions,
  getWorkflowTabLabel,
  getWorkflowToolScopeSummary,
  type WorkflowDefinition,
  type WorkflowTab
} from '@/pages/workflows/workflowModel';
import {
  listWorkflowMcpServers,
  listWorkflowOptions,
  listWorkflowRunEvents,
  listWorkflowRunApprovals,
  listWorkflowSessions,
  listWorkspaceWorkflows,
  type WorkflowApiDefinition,
  type WorkflowMcpServer,
  type WorkflowOptionsCatalog,
  type WorkflowRunApproval,
  type WorkflowRunEvent,
  type WorkflowRunSummary
} from '@/services/control-plane/workflowApi';
import {
  ScopeSwitch,
  createFallbackWorkflowOptions,
  createMcpServerDraft,
  createScopeDraft,
  createWorkflowDraft,
  createWorkflowEditDraft,
  getToolServerHint,
  isRunActive,
  mapApiWorkflowToDefinition,
  mapWorkflowRunSummary,
  runStatusTone,
  splitLines,
  summarizeValues,
  tabs,
  uniqueValues,
  workflowRunToTrace,
  workflowStatusTone,
  type CreateWorkflowDraft,
  type McpServerDraft,
  type ScopeDraft,
  type WorkflowEditDraft
} from '@/pages/workflows/workflowPageHelpers';
import { useWorkspaceWorkflowActions } from '@/pages/workflows/useWorkspaceWorkflowActions';

interface WorkspaceWorkflowsPageProps {
  workspace: Workspace;
}

export const WorkspaceWorkflowsPage: React.FC<WorkspaceWorkflowsPageProps> = ({ workspace }) => {
  const fallbackWorkflows = useMemo(() => createDefaultWorkflowDefinitions(workspace.id), [workspace.id]);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>(fallbackWorkflows);
  const [workflowOptions, setWorkflowOptions] = useState<WorkflowOptionsCatalog>(() => createFallbackWorkflowOptions(fallbackWorkflows));
  const [workflowMcpServers, setWorkflowMcpServers] = useState<WorkflowMcpServer[]>([]);
  const [query, setQuery] = useState('');
  const workflowSearchTags = useMemo(() => uniqueValues(workflows.flatMap((workflow) => workflow.tags)), [workflows]);
  const filteredWorkflows = useMemo(() => filterWorkflowDefinitions(workflows, query), [query, workflows]);
  const visibleWorkflows = filteredWorkflows;
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(workflows[0]?.id || '');
  const selectedWorkflow = visibleWorkflows.find((workflow) => workflow.id === selectedWorkflowId) || visibleWorkflows[0] || filteredWorkflows[0] || workflows[0];
  const [activeTab, setActiveTab] = useState<WorkflowTab>('chat');
  const [isEditingScopeTab, setIsEditingScopeTab] = useState<'' | 'mcp' | 'skills'>('');
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
  const [scopeSaveError, setScopeSaveError] = useState<{ tab: 'mcp' | 'skills'; message: string } | null>(null);
  const [scopeSaveResult, setScopeSaveResult] = useState<{ tab: 'mcp' | 'skills'; message: string } | null>(null);
  const [savingScope, setSavingScope] = useState('');
  const [newWorkflowTag, setNewWorkflowTag] = useState('');
  const [createPanelOpen, setCreatePanelOpen] = useState(false);
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
  const [mcpServerDraft, setMcpServerDraft] = useState<McpServerDraft>(() => createMcpServerDraft());
  const [creatingMcpServer, setCreatingMcpServer] = useState(false);
  const [mcpServerError, setMcpServerError] = useState('');
  const canManageWorkflowScope = Boolean(workspace.permissions?.manage_mcp);
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
        if (mounted) setWorkflowOptions(catalog);
      })
      .catch(() => undefined);
    listWorkflowMcpServers(workspace.id)
      .then((servers) => {
        if (mounted) setWorkflowMcpServers(servers);
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
  const isEditingMcpScope = isEditingScopeTab === 'mcp';
  const isEditingSkillScope = isEditingScopeTab === 'skills';
  const workflowMcpServerIds = uniqueValues([
    ...workflowOptions.mcpServers.map((option) => option.value),
    ...workflowMcpServers.map((server) => server.id),
    ...(selectedWorkflow?.enabledMcpServers || []),
    ...splitLines(selectedScopeDraft?.enabledMcpServers || '')
  ]);
  const selectedMcpServerIds = splitLines(selectedScopeDraft?.enabledMcpServers || '');
  const mcpServerRows = workflowMcpServerIds.map((serverId) => {
    const server = workflowMcpServers.find((item) => item.id === serverId);
    const selected = selectedMcpServerIds.includes(serverId);
    const toolCount = workflowOptions.mcpTools.filter((tool) => getToolServerHint(tool.value) === serverId).length;
    return { serverId, server, selected, toolCount };
  });
  const isEditingWorkflow = Boolean(selectedWorkflow && editingWorkflowId === selectedWorkflow.id);
  const selectedWorkflowEditDraft = selectedWorkflow
    ? workflowEditDrafts[selectedWorkflow.id] || createWorkflowEditDraft(selectedWorkflow)
    : undefined;
  const workflowActions = useWorkspaceWorkflowActions({
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
  });

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar sm:px-6 lg:px-10 lg:py-8">
      <motion.header {...headerMotion} className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="type-route-title">Workflows</h1>
          <p className="type-body mt-3 max-w-3xl text-ui-text-muted">Workspace-scoped automations with dedicated runs, MCP access, and saved prompts.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <PageSearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search workflows, tags, skills, MCP scope"
            aria-label="Search workflows"
            className="lg:w-80"
          />
          <Button type="button" variant="secondary" size="md" onClick={() => setCreatePanelOpen((open) => !open)}>
            <ICONS.Plus className="h-4 w-4" />
            Add workflow
          </Button>
        </div>
      </motion.header>

      {workflowSearchTags.length > 0 && query.trim() && (
        <div className="mb-4 flex flex-wrap gap-2">
          {workflowSearchTags.slice(0, 8).map((tag) => (
            <button key={tag} type="button" onClick={() => setQuery((current) => appendWorkflowSearchTag(current, tag))} className="rounded-md border border-ui-border bg-ui-surface px-2.5 py-1.5 text-xs font-bold text-ui-text-muted hover:text-ui-text">
              {tag}
            </button>
          ))}
        </div>
      )}

      {workflowLoadError && (
        <div className="mb-4 rounded-md border border-status-warning/30 bg-status-warning-soft px-3 py-2 text-xs font-semibold text-status-warning-text">
          Using the local workflow catalog because control-plane workflows could not be loaded.
        </div>
      )}

      {createPanelOpen && (
        <section className="mb-6 rounded-lg border border-ui-border bg-ui-surface p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="type-section-title">New workflow</h2>
              <p className="type-caption mt-2 text-ui-text-muted">Create a workspace automation, then refine its MCP and skill scope.</p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={workflowActions.closeCreateWorkflowPanel}>
              <ICONS.X className="h-4 w-4" />
              Close
            </Button>
          </div>
          {createError && <div className="mt-4 rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">{createError}</div>}
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="type-micro-label">Name</span>
              <input value={createDraft.name} onChange={(event) => setCreateDraft((draft) => ({ ...draft, name: event.target.value }))} className="mt-2 min-h-10 w-full rounded-md border border-ui-border bg-ui-bg px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent" />
            </label>
            <label className="block">
              <span className="type-micro-label">Description</span>
              <input value={createDraft.description} onChange={(event) => setCreateDraft((draft) => ({ ...draft, description: event.target.value }))} className="mt-2 min-h-10 w-full rounded-md border border-ui-border bg-ui-bg px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent" />
            </label>
            <label className="block lg:col-span-2">
              <span className="type-micro-label">Starting prompt</span>
              <textarea value={createDraft.starterPrompt} onChange={(event) => setCreateDraft((draft) => ({ ...draft, starterPrompt: event.target.value }))} className="mt-2 min-h-28 w-full resize-y rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-sm font-medium leading-6 text-ui-text outline-none focus:border-accent" />
            </label>
            <label className="block">
              <span className="type-micro-label">MCP servers</span>
              <textarea value={createDraft.enabledMcpServers} onChange={(event) => setCreateDraft((draft) => ({ ...draft, enabledMcpServers: event.target.value }))} className="mt-2 min-h-20 w-full resize-y rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-sm font-medium text-ui-text outline-none focus:border-accent" />
            </label>
            <label className="block">
              <span className="type-micro-label">Skills and tools</span>
              <textarea value={[createDraft.enabledSkills, createDraft.allowedTools].filter(Boolean).join('\n')} onChange={(event) => setCreateDraft((draft) => ({ ...draft, enabledSkills: event.target.value, allowedTools: event.target.value }))} className="mt-2 min-h-20 w-full resize-y rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-sm font-medium text-ui-text outline-none focus:border-accent" />
            </label>
          </div>
          <div className="mt-5 flex justify-end">
            <Button type="button" variant="accent" size="md" onClick={() => void workflowActions.createNewWorkflow()} disabled={creatingWorkflow || !createDraft.name.trim()}>
              <ICONS.Plus className="h-4 w-4" />
              {creatingWorkflow ? 'Creating...' : 'Create workflow'}
            </Button>
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
        <section aria-label="Workflow library" className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="type-micro-label">{query.trim() ? 'Matching workflows' : 'Workflow library'}</div>
            <div className="type-caption font-semibold text-ui-text-muted">{visibleWorkflows.length}</div>
          </div>
          {visibleWorkflows.map((workflow) => (
            <button key={workflow.id} type="button" onClick={() => { setSelectedWorkflowId(workflow.id); setActiveTab('chat'); }} className={`w-full rounded-lg border p-3.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${workflow.id === selectedWorkflow?.id ? 'border-accent/45 bg-accent-soft/55' : 'border-ui-border bg-ui-surface hover:bg-ui-bg'}`}>
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="type-row-title block text-ui-text">{workflow.name}</span>
                  <span className="type-caption mt-1 block leading-5 text-ui-text-muted">{workflow.description}</span>
                </span>
                <StatusBadge tone={workflowStatusTone(workflow.status)}>{workflow.status}</StatusBadge>
              </span>
              <span className="type-caption mt-3 block truncate text-ui-text-muted">{getWorkflowToolScopeSummary(workflow)}</span>
            </button>
          ))}
          {visibleWorkflows.length === 0 && <div className="rounded-lg border border-ui-border bg-ui-surface p-6 text-sm font-semibold text-ui-text-muted">No workflows match this search.</div>}
        </section>

        {selectedWorkflow && (
          <section className="overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
            <div className="border-b border-ui-border bg-ui-bg px-5 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <StatusBadge tone={workflowStatusTone(selectedWorkflow.status)}>{selectedWorkflow.status}</StatusBadge>
                  <h2 className="mt-3 text-2xl font-semibold tracking-normal text-ui-text">{selectedWorkflow.name}</h2>
                  <p className="type-body mt-2 max-w-3xl text-ui-text-muted">{selectedWorkflow.description}</p>
                </div>
                <div className="grid gap-2 text-sm font-semibold text-ui-text-muted">
                  <span>Last run: {selectedWorkflow.lastRun}</span>
                  <span>MCP: {summarizeValues(selectedWorkflow.enabledMcpServers)}</span>
                  <span>Skills: {summarizeValues(selectedWorkflow.enabledSkills)}</span>
                </div>
              </div>
            </div>

            <div className="border-b border-ui-border bg-ui-surface px-4 pt-3">
              <div role="tablist" aria-label="Workflow detail sections" className="flex gap-1 overflow-x-auto">
                {tabs.map((tab) => (
                  <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`min-h-10 border-b-2 px-3 text-xs font-bold transition-colors ${activeTab === tab ? 'border-accent text-ui-text' : 'border-transparent text-ui-text-muted hover:text-ui-text'}`}>
                    {getWorkflowTabLabel(tab)}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-ui-bg/45 p-5 sm:p-6">
              {activeTab === 'chat' && (
                <div className="space-y-4">
                  <label className="block">
                    <span className="type-micro-label">Run prompt message</span>
                    <textarea value={workflowMessage} onChange={(event) => setWorkflowMessage(event.target.value)} className="mt-2 min-h-32 w-full resize-y rounded-md border border-ui-border bg-ui-surface px-3 py-2 text-sm font-medium leading-6 text-ui-text outline-none focus:border-accent" />
                  </label>
                  {selectedCompiledScope && <div className="rounded-md border border-accent/25 bg-accent-soft p-3 text-xs font-semibold text-accent-strong">{selectedAccessTools.length} tools compiled for this run.</div>}
                  {launchError && <div className="rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">{launchError}</div>}
                  {launchResult?.workflowId === selectedWorkflow.id && <div className="rounded-md border border-status-success/30 bg-status-success-soft p-3 text-xs font-semibold text-status-success-text">Run {launchResult.workflowRunId || launchResult.runId} dispatched.</div>}
                  <Button variant="accent" size="md" onClick={() => void workflowActions.launchSelectedWorkflow()} disabled={launchingWorkflowId === selectedWorkflow.id || !workflowMessage.trim()}>
                    <ICONS.Send className="h-4 w-4" />
                    {launchingWorkflowId === selectedWorkflow.id ? 'Starting...' : 'Launch workflow'}
                  </Button>
                </div>
              )}

              {activeTab === 'runs' && (
                <div className="space-y-3">
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
                </div>
              )}

              {activeTab === 'mcp' && selectedScopeDraft && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="type-row-title">Workflow MCP scope</h3>
                      <p className="type-caption mt-1 text-ui-text-muted">Choose servers and tool access for future sessions.</p>
                    </div>
                    <div className="flex gap-2">
                      {isEditingMcpScope ? (
                        <>
                          <Button type="button" variant="tertiary" size="sm" onClick={workflowActions.cancelEditingScopeTab}>Cancel</Button>
                          <Button type="button" variant="primary" size="sm" onClick={() => void workflowActions.saveWorkflowScope('mcp')} disabled={!canManageWorkflowScope || !selectedScopeDirty || savingScope === selectedWorkflow.id}>Save MCP changes</Button>
                        </>
                      ) : <Button type="button" variant="secondary" size="sm" onClick={() => workflowActions.startEditingScopeTab('mcp')} disabled={!canManageWorkflowScope}>Edit MCP scope</Button>}
                    </div>
                  </div>
                  {scopeSaveError?.tab === 'mcp' && <div className="rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">{scopeSaveError.message}</div>}
                  {scopeSaveResult?.tab === 'mcp' && <div className="rounded-md border border-status-success/30 bg-status-success-soft p-3 text-xs font-semibold text-status-success-text">{scopeSaveResult.message}</div>}
                  <div className="grid gap-3">
                    {mcpServerRows.map(({ serverId, server, selected, toolCount }) => (
                      <div key={serverId} className="flex items-center justify-between gap-4 rounded-lg border border-ui-border bg-ui-surface p-4">
                        <div className="min-w-0">
                          <div className="type-row-title truncate">{server?.name || serverId}</div>
                          <div className="type-caption mt-1 text-ui-text-muted">{toolCount} tools · {server?.status || 'Available'}</div>
                        </div>
                        <ScopeSwitch checked={selected} disabled={!canManageWorkflowScope || !isEditingMcpScope} label={`Toggle ${serverId}`} onChange={(enabled) => workflowActions.setWorkflowScopeValue(selectedWorkflow.id, 'enabledMcpServers', serverId, enabled)} />
                      </div>
                    ))}
                  </div>
                  {canManageWorkflowScope && isEditingMcpScope && (
                    <div className="rounded-lg border border-ui-border bg-ui-bg p-4">
                      <div className="grid gap-3 lg:grid-cols-[minmax(8rem,1fr)_8rem_minmax(10rem,1.2fr)_auto]">
                        <input aria-label="MCP server name" value={mcpServerDraft.name} onChange={(event) => setMcpServerDraft((draft) => ({ ...draft, name: event.target.value }))} placeholder="Name" className="min-h-10 rounded-md border border-ui-border bg-ui-surface px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent" />
                        <select aria-label="MCP server type" value={mcpServerDraft.type} onChange={(event) => setMcpServerDraft((draft) => ({ ...draft, type: event.target.value }))} className="min-h-10 rounded-md border border-ui-border bg-ui-surface px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent"><option value="http">HTTP</option><option value="stdio">stdio</option></select>
                        <input aria-label="MCP server URL or command" value={mcpServerDraft.type === 'http' ? mcpServerDraft.baseUrl : mcpServerDraft.command} onChange={(event) => setMcpServerDraft((draft) => draft.type === 'http' ? { ...draft, baseUrl: event.target.value } : { ...draft, command: event.target.value })} placeholder="URL or command" className="min-h-10 rounded-md border border-ui-border bg-ui-surface px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent" />
                        <Button type="button" variant="secondary" size="sm" onClick={() => void workflowActions.addWorkflowMcpServer()} disabled={creatingMcpServer || !mcpServerDraft.name.trim()}>Add server</Button>
                      </div>
                      {mcpServerError && <div className="mt-3 rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">{mcpServerError}</div>}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'skills' && selectedScopeDraft && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><h3 className="type-row-title">Workflow skills</h3><p className="type-caption mt-1 text-ui-text-muted">Skills passed to every workflow run.</p></div>
                    {isEditingSkillScope ? (
                      <div className="flex gap-2"><Button variant="tertiary" size="sm" onClick={workflowActions.cancelEditingScopeTab}>Cancel</Button><Button variant="primary" size="sm" onClick={() => void workflowActions.saveWorkflowScope('skills')} disabled={!canManageWorkflowScope || !selectedScopeDirty || savingScope === selectedWorkflow.id}>Save skills</Button></div>
                    ) : <Button variant="secondary" size="sm" onClick={() => workflowActions.startEditingScopeTab('skills')} disabled={!canManageWorkflowScope}>Edit skills</Button>}
                  </div>
                  {scopeSaveError?.tab === 'skills' && <div className="rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">{scopeSaveError.message}</div>}
                  {scopeSaveResult?.tab === 'skills' && <div className="rounded-md border border-status-success/30 bg-status-success-soft p-3 text-xs font-semibold text-status-success-text">{scopeSaveResult.message}</div>}
                  <div className="flex flex-wrap gap-2">
                    {uniqueValues([...workflowOptions.skills.map((option) => option.value), ...selectedWorkflow.enabledSkills, ...splitLines(selectedScopeDraft.enabledSkills)]).map((skill) => {
                      const selected = splitLines(selectedScopeDraft.enabledSkills).includes(skill);
                      return <button key={skill} type="button" disabled={!canManageWorkflowScope || !isEditingSkillScope} onClick={() => workflowActions.setWorkflowScopeValue(selectedWorkflow.id, 'enabledSkills', skill, !selected)} className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${selected ? 'border-accent/30 bg-accent-soft text-accent-strong' : 'border-ui-border bg-ui-bg text-ui-text-muted hover:text-ui-text'}`}>{skill}</button>;
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-6">
                  {(workflowUpdateError || workflowUpdateResult || deleteWorkflowError) && <div className={`rounded-md border px-3 py-2 text-xs font-semibold ${workflowUpdateError || deleteWorkflowError ? 'border-status-danger/30 bg-status-danger-soft text-status-danger-text' : 'border-status-success/30 bg-status-success-soft text-status-success-text'}`}>{workflowUpdateError || deleteWorkflowError || workflowUpdateResult}</div>}
                  <div className="flex items-center justify-between gap-4 rounded-lg border border-ui-border bg-ui-bg px-4 py-3">
                    <div><h4 className="type-row-title">{selectedWorkflow.status === 'active' ? 'Active' : 'Inactive'}</h4><p className="type-caption mt-1 text-ui-text-muted">Toggle availability for new runs.</p></div>
                    <ScopeSwitch checked={selectedWorkflow.status === 'active'} disabled={!canManageWorkflowScope || updatingWorkflowId === selectedWorkflow.id} label="Toggle workflow active state" onChange={(active) => void workflowActions.toggleWorkflowActive(selectedWorkflow, active)} />
                  </div>
                  <div className="grid gap-3">
                    {isEditingWorkflow && selectedWorkflowEditDraft ? (
                      <>
                        <input value={selectedWorkflowEditDraft.name} onChange={(event) => workflowActions.updateWorkflowEditDraft(selectedWorkflow.id, { name: event.target.value })} className="min-h-10 rounded-md border border-ui-border bg-ui-bg px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent" />
                        <input value={selectedWorkflowEditDraft.description} onChange={(event) => workflowActions.updateWorkflowEditDraft(selectedWorkflow.id, { description: event.target.value })} className="min-h-10 rounded-md border border-ui-border bg-ui-bg px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent" />
                        <textarea value={selectedWorkflowEditDraft.starterPrompt} onChange={(event) => workflowActions.updateWorkflowEditDraft(selectedWorkflow.id, { starterPrompt: event.target.value })} className="min-h-28 rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-sm font-medium text-ui-text outline-none focus:border-accent" />
                        <div className="flex gap-2"><Button variant="tertiary" size="sm" onClick={() => workflowActions.cancelEditingWorkflow(selectedWorkflow)}>Cancel</Button><Button variant="primary" size="sm" onClick={() => void workflowActions.saveWorkflowDefinition()} disabled={!canManageWorkflowScope || updatingWorkflowId === selectedWorkflow.id || !selectedWorkflowEditDraft.name.trim()}>Save workflow</Button></div>
                      </>
                    ) : (
                      <div className="rounded-lg border border-ui-border bg-ui-bg p-4"><p className="text-sm font-semibold text-ui-text">{selectedWorkflow.starterPrompt}</p><Button className="mt-4" variant="secondary" size="sm" onClick={() => workflowActions.startEditingWorkflow(selectedWorkflow)} disabled={!canManageWorkflowScope}>Edit workflow</Button></div>
                    )}
                  </div>
                  <div className="border-t border-ui-border pt-5">
                    <h3 className="type-row-title">Workflow tags</h3>
                    <div className="mt-3 flex flex-wrap gap-2">{selectedWorkflow.tags.map((tag) => <button key={tag} type="button" aria-label={`Remove workflow tag ${tag}`} onClick={() => workflowActions.removeWorkflowTag(selectedWorkflow.id, tag)} className="rounded-md border border-ui-border bg-ui-bg px-2.5 py-1.5 text-xs font-bold text-ui-text-muted">{tag}</button>)}</div>
                    <div className="mt-3 flex gap-2"><input value={newWorkflowTag} onChange={(event) => setNewWorkflowTag(event.target.value)} placeholder="Add tag" className="min-h-10 flex-1 rounded-md border border-ui-border bg-ui-bg px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent" /><Button variant="secondary" size="sm" onClick={() => workflowActions.addWorkflowTag(selectedWorkflow.id)} disabled={!newWorkflowTag.trim()}>Add tag</Button></div>
                  </div>
                  <div className="border-t border-ui-border pt-5">
                    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="type-row-title text-status-danger-text">Delete workflow</h3><p className="type-caption mt-1 text-ui-text-muted">Only user-authored workflows can be deleted.</p></div>{deleteWorkflowId === selectedWorkflow.id ? <div className="flex gap-2"><Button variant="tertiary" size="sm" onClick={() => setDeleteWorkflowId('')}>Cancel</Button><Button variant="danger" size="sm" onClick={() => void workflowActions.deleteSelectedWorkflow(selectedWorkflow)} disabled={deletingWorkflowId === selectedWorkflow.id}>Delete</Button></div> : <Button variant="secondary" size="sm" onClick={() => setDeleteWorkflowId(selectedWorkflow.id)} disabled={!canManageWorkflowScope || selectedWorkflow.source !== 'user'}>Delete workflow</Button>}</div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );

};
