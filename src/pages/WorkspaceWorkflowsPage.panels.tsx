import React from 'react';
import { isServerWorkflowRunId } from '@/pages/workflows/workflowRunIdentity';
import { Loader2, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, DataSurface, EmptyState, InlineAlert } from '@acornops/ui';
import { Checkbox } from '@acornops/ui';
import { StatusBadge } from '@acornops/ui';
import { ICONS } from '@/constants';
import { TraceFooter } from '@/features/conversations/presentation';
import {
  AgentAssignmentList,
  WorkflowPanel,
  WorkflowSection
} from '@/pages/WorkspaceWorkflowsPage.components';
import type { WorkflowDefinition } from '@/pages/workflows/workflowModel';
import { getWorkflowAgentCapabilityReview, getWorkflowCapabilityOverviewSummary, type WorkflowAgentCapabilityReview } from '@/pages/workflows/workflowAgentCapabilities';
import { WorkflowRunResponse } from '@/pages/workflows/WorkflowRunResponse';
import {
  isRunActive,
  runStatusTone,
  workflowRunToTrace,
  type AgentSelectionDraft
} from '@/pages/workflows/workflowPageHelpers';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import { AgentAvatar } from '@/pages/agents/AgentAvatar';
import type { useWorkspaceWorkflowActions } from '@/pages/workflows/useWorkspaceWorkflowActions';
import { getWorkflowExecution, type WorkflowCoordinationChild, type WorkflowRunApproval, type WorkflowRunEvent, type WorkflowOptionsCatalog } from '@/services/control-plane/workflowApi';
import { formatUserDateTime } from '@/utils/dateTime';
import { formatIdentifierLabel } from '@/utils/textFormatting';
type WorkflowActions = ReturnType<typeof useWorkspaceWorkflowActions>;
type WorkflowAgentOption = WorkflowOptionsCatalog['agents'][number];

function formatWorkflowTimestamp(value: string): string {
  return formatUserDateTime(value, { fallback: value });
}

export const WorkflowAgentAssignmentSection: React.FC<{
  workflow: WorkflowDefinition;
  agents: AgentDefinition[];
  selectedAgentSelectionDraft?: AgentSelectionDraft;
  activeAgentOptions: WorkflowAgentOption[];
  isEditingAgentSelection: boolean;
  canManageWorkflows: boolean;
  savingAgentSelectionId: string;
  agentSelectionError: string;
  onReviewCapabilities: () => void;
  workflowActions: Pick<WorkflowActions, 'startEditingAgentSelection' | 'updateAgentSelectionDraft' | 'cancelEditingAgentSelection' | 'saveAgentSelection'>;
}> = ({
  workflow,
  agents,
  selectedAgentSelectionDraft,
  activeAgentOptions,
  isEditingAgentSelection,
  canManageWorkflows,
  savingAgentSelectionId,
  agentSelectionError,
  onReviewCapabilities,
  workflowActions
}) => {
  const { t } = useTranslation();
  const selectedCount = selectedAgentSelectionDraft
    ? selectedAgentSelectionDraft.agentIds.length
    : workflow.agentIds.length;
  const selectionFeedback = selectedCount === 0
    ? t('workflowCoordination.selectionRequired')
    : selectedCount > 1
      ? t('workflowCoordination.coordinatedFeedback', { count: selectedCount })
      : '';
  const assignmentDescription = isEditingAgentSelection
    ? t('workflowCoordination.agentsDescription')
    : workflow.executionMode === 'direct' && workflow.agents[0]
      ? t('workflowCoordination.directAssignmentDescription', { name: workflow.agents[0].name })
      : t('workflowCoordination.coordinatedAssignmentDescription', { count: workflow.agents.length });
  const capabilitySummary = getWorkflowCapabilityOverviewSummary(workflow, agents);
  const toolCount = capabilitySummary.tools.read + capabilitySummary.tools.write + capabilitySummary.tools.unknown;
  const accessSummary = [
    t(`workflowCoordination.${workflow.policy.mode === 'read_only' ? 'readOnly' : 'readWrite'}`),
    t('agentsWorkflows.agents.capabilityCounts.tool', { count: toolCount }),
    ...(capabilitySummary.mcpServers.length > 0
      ? [t('agentsWorkflows.agents.capabilityCounts.mcpServer', { count: capabilitySummary.mcpServers.length })]
      : []),
    ...(capabilitySummary.skills.length > 0
      ? [t('agentsWorkflows.agents.capabilityCounts.skill', { count: capabilitySummary.skills.length })]
      : [])
  ].join(' · ');

  React.useEffect(() => {
    if (!isEditingAgentSelection || !selectedAgentSelectionDraft) return;
    const availableIds = new Set(activeAgentOptions.filter((agent) => !agent.disabled).map((agent) => agent.value));
    const availableSelection = selectedAgentSelectionDraft.agentIds.filter((agentId) => availableIds.has(agentId));
    if (availableSelection.length !== selectedAgentSelectionDraft.agentIds.length) {
      workflowActions.updateAgentSelectionDraft(workflow.id, { agentIds: availableSelection });
    }
  }, [activeAgentOptions, isEditingAgentSelection, selectedAgentSelectionDraft, workflow.id, workflowActions]);

  return (
    <WorkflowSection
      title={t('workflowCoordination.assignmentTitle')}
      description={assignmentDescription}
      action={!isEditingAgentSelection && (
        <Button type="button" variant="secondary" size="sm" onClick={() => workflowActions.startEditingAgentSelection(workflow)} disabled={!canManageWorkflows} title={!canManageWorkflows ? 'You need manage_workflows to edit workflow agents.' : undefined}>
          <ICONS.Bot className="h-4 w-4" aria-hidden="true" />
          Edit agents
        </Button>
      )}
    >
      <div className="mt-4 grid gap-4">
        {agentSelectionError && <InlineAlert tone="danger" aria-live="assertive" className="type-emphasis">{agentSelectionError}</InlineAlert>}
        {!canManageWorkflows && <div className="rounded-md border border-ui-border bg-ui-bg px-3 py-2 type-caption type-emphasis text-ui-text-muted">You can inspect assignments. Ask a workspace manager for manage_workflows to change selected agents.</div>}
        {isEditingAgentSelection && selectionFeedback && <div role="status" aria-live="polite" aria-atomic="true" className="rounded-md border border-ui-border bg-ui-bg px-3 py-2 type-body type-emphasis text-ui-text">{selectionFeedback}</div>}
        {isEditingAgentSelection && selectedAgentSelectionDraft ? (
          <>
          <fieldset>
            <legend className="sr-only">Workflow agents</legend>
            <div className="flex flex-col gap-1 border-b border-ui-border pb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <span className="type-micro-label text-ui-text-muted">{t('workflowCoordination.selectedAgents')}</span>
              <span className="type-caption type-emphasis text-ui-text-muted">
                {t('workflowCoordination.selectedCount', { count: selectedAgentSelectionDraft.agentIds.length })}
              </span>
            </div>
            <div className="divide-y divide-ui-border border-b border-ui-border">
              {activeAgentOptions.map((agent) => {
                const checked = selectedAgentSelectionDraft.agentIds.includes(agent.value);
                return (
                  <label
                    key={agent.value}
                    className={`grid min-h-12 cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 py-3 type-body transition-colors ${agent.disabled ? 'cursor-not-allowed opacity-55' : 'hover:bg-ui-bg/60'}`}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={agent.disabled}
                      onChange={(event) => workflowActions.updateAgentSelectionDraft(workflow.id, {
                        agentIds: event.target.checked
                          ? [...selectedAgentSelectionDraft.agentIds, agent.value]
                          : selectedAgentSelectionDraft.agentIds.filter((agentId) => agentId !== agent.value)
                      })}
                    />
                    <span className="min-w-0">
                      <span className="block min-w-0 break-words type-emphasis [overflow-wrap:anywhere]">{agent.label}</span>
                      {agent.description && <span className="type-caption mt-0.5 block break-words text-ui-text-muted [overflow-wrap:anywhere]">{agent.description}</span>}
                      {agent.disabledReason && <span className="type-caption mt-0.5 block break-words text-status-warning-text [overflow-wrap:anywhere]">{agent.disabledReason}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="flex justify-end gap-2 border-t border-ui-border pt-4">
            <Button type="button" variant="secondary" size="sm" onClick={() => workflowActions.cancelEditingAgentSelection(workflow)} disabled={savingAgentSelectionId === workflow.id}>Cancel</Button>
            <Button type="button" variant="primary" size="sm" onClick={() => void workflowActions.saveAgentSelection()} disabled={!canManageWorkflows || savingAgentSelectionId === workflow.id || selectedAgentSelectionDraft.agentIds.length === 0}>
              {savingAgentSelectionId === workflow.id ? 'Saving...' : 'Save agents'}
            </Button>
          </div>
          </>
        ) : (
          workflow.agents.length > 0
            ? <AgentAssignmentList agents={workflow.agents} labelForAgent={null} />
            : <p className="type-caption text-ui-text-muted">{t('workflowCoordination.noAgents')}</p>
        )}
        {!isEditingAgentSelection && (
          <div className="flex flex-col gap-3 border-t border-ui-border pt-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="type-ui text-ui-text-muted">{t('workflowCoordination.effectiveAccess')}</div>
              <div className="mt-1 break-words type-ui text-ui-text [overflow-wrap:anywhere]">{accessSummary}</div>
              <p className="mt-1 max-w-[70ch] type-caption text-ui-text-muted">
                {capabilitySummary.missingAgentCount > 0
                  ? t('workflowCoordination.accessSummaryIncomplete', {
                      count: capabilitySummary.missingAgentCount,
                      total: capabilitySummary.agentCount
                    })
                  : t('workflowCoordination.accessSummaryDescription')}
              </p>
            </div>
            <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={onReviewCapabilities}>
              <ICONS.Shield className="h-4 w-4" aria-hidden="true" />
              {t('workflowCoordination.viewAccess')}
            </Button>
          </div>
        )}
      </div>
    </WorkflowSection>
  );
};

export const WorkflowRunsPanel: React.FC<{
  workflow: WorkflowDefinition;
  approvalError: string;
  runLogError: string;
  cancelRunError: string;
  approvalRecords: Record<string, WorkflowRunApproval[]>;
  expandedRunLogId: string;
  runEventsByRunId: Record<string, WorkflowRunEvent[]>;
  cancelRunAction: string;
  workflowActions: Pick<WorkflowActions, 'stopWorkflowRun' | 'decideApproval' | 'toggleRunLogs'>;
  approvalAction: string;
  setExpandedRunLogId: React.Dispatch<React.SetStateAction<string>>;
  showHeader?: boolean;
}> = ({
  workflow,
  approvalError,
  runLogError,
  cancelRunError,
  approvalRecords,
  expandedRunLogId,
  runEventsByRunId,
  cancelRunAction,
  workflowActions,
  approvalAction,
  setExpandedRunLogId,
  showHeader
}) => {
  const { t } = useTranslation();
  const [stopArmedRunId, setStopArmedRunId] = React.useState('');
  const [coordinationByExecutionId, setCoordinationByExecutionId] = React.useState<Record<string, { status: string; children: WorkflowCoordinationChild[] }>>({});
  const [coordinationLoadingId, setCoordinationLoadingId] = React.useState('');
  const [coordinationErrorByExecutionId, setCoordinationErrorByExecutionId] = React.useState<Record<string, string>>({});
  const loadedCoordinationIds = React.useRef(new Set<string>());

  React.useEffect(() => {
    if (workflow.executionMode !== 'coordinated' || !isServerWorkflowRunId(expandedRunLogId)) return;
    const run = workflow.runs.find((candidate) => (candidate.runId || candidate.id) === expandedRunLogId);
    if (!run) return;
    let cancelled = false;
    const loadCoordination = async () => {
      if (!loadedCoordinationIds.current.has(run.id)) setCoordinationLoadingId(run.id);
      try {
        const response = await getWorkflowExecution(run.executionId || run.id);
        if (cancelled) return;
        setCoordinationByExecutionId((current) => ({
          ...current,
          [run.id]: {
            status: response.coordination?.status || String(response.execution.status || run.status),
            children: response.coordination?.children || []
          }
        }));
        loadedCoordinationIds.current.add(run.id);
        setCoordinationErrorByExecutionId((current) => {
          const next = { ...current };
          delete next[run.id];
          return next;
        });
      } catch {
        if (!cancelled) setCoordinationErrorByExecutionId((current) => ({
          ...current,
          [run.id]: t('workflowCoordination.traceUnavailable')
        }));
      } finally {
        if (!cancelled) setCoordinationLoadingId('');
      }
    };
    void loadCoordination();
    const refreshTimer = isRunActive(run.status)
      ? window.setInterval(() => void loadCoordination(), 2500)
      : undefined;
    return () => {
      cancelled = true;
      if (refreshTimer !== undefined) window.clearInterval(refreshTimer);
    };
  }, [expandedRunLogId, t, workflow.executionMode, workflow.runs]);

  return (
  <WorkflowPanel title="Runs" description="Inspect this workflow's run output, approval pauses, trace events, and coordination details." showHeader={showHeader}>
    {[approvalError, runLogError, cancelRunError].filter(Boolean).map((message) => <InlineAlert key={message} tone="danger" aria-live="assertive" className="type-emphasis">{message}</InlineAlert>)}
    {workflow.runs.length > 0 ? workflow.runs.map((run) => {
      const effectiveRunId = run.runId || run.id;
      const isServerBackedRun = isServerWorkflowRunId(run.runId);
      const approvals = run.runId ? approvalRecords[run.runId] || [] : [];
      const traceExpanded = expandedRunLogId === effectiveRunId;
      const runTrace = workflowRunToTrace(run, runEventsByRunId[effectiveRunId] || []);
      const runStatusLabel = t(`workflowActivity.status.${run.status === 'waiting_approval' ? 'waiting_for_approval' : run.status}`);
      return (
        <article
          key={run.id}
          id={run.executionId ? `workflow-execution-${run.executionId}` : undefined}
          tabIndex={run.executionId ? -1 : undefined}
          className="rounded-lg border border-ui-border bg-ui-surface p-4 outline-none focus-visible:ring-2 focus-visible:ring-control-boundary"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="type-row-title">{run.id}</div>
              <div className="type-caption mt-1 text-ui-text-muted">{run.actor} · {formatWorkflowTimestamp(run.startedAt)} · {run.duration}</div>
              <div className="mt-2"><StatusBadge tone={runStatusTone(run.status)}>{runStatusLabel}</StatusBadge></div>
            </div>
            {isRunActive(run.status) && isServerBackedRun && (
              stopArmedRunId === effectiveRunId ? (
                <div className="flex shrink-0 items-center gap-2">
                  <Button type="button" size="sm" variant="danger" onClick={() => { setStopArmedRunId(''); void workflowActions.stopWorkflowRun(effectiveRunId); }} disabled={cancelRunAction === effectiveRunId}>
                    {cancelRunAction === effectiveRunId ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />}
                    Confirm stop
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setStopArmedRunId('')} disabled={cancelRunAction === effectiveRunId}>Cancel</Button>
                </div>
              ) : (
                <Button type="button" size="sm" variant="secondary" onClick={() => setStopArmedRunId(effectiveRunId)} aria-label="Stop workflow run" disabled={cancelRunAction === effectiveRunId}>
                  <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  Stop
                </Button>
              )
            )}
          </div>
          <details open className="group mt-3 border-t border-ui-border pt-2">
            <summary className="control-target flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-sm type-caption type-emphasis text-ui-text outline-none focus-visible:ring-2 focus-visible:ring-control-boundary [&::-webkit-details-marker]:hidden">
              <ICONS.ChevronRight className="h-4 w-4 shrink-0 text-ui-text-muted transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
              {t('workflowActivity.runSummary')}
            </summary>
            <WorkflowRunResponse content={run.output} className="mt-2" />
          </details>
          {approvals.length > 0 && (
            <div className="mt-3 grid gap-2">
              {approvals.map((approval) => (
                <div key={approval.id} className="rounded-md bg-ui-bg p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="type-body type-emphasis text-ui-text">{approval.summary || approval.toolName}</span>
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
          {isServerBackedRun && (
            <div className="mt-3 border-t border-ui-border pt-2">
              <TraceFooter runId={effectiveRunId} trace={runTrace} isExpanded={traceExpanded} setExpanded={(runId, expanded) => expanded ? void workflowActions.toggleRunLogs(runId) : setExpandedRunLogId('')} compactStatusOnly timelineLayout="flow"
                activityLabelOverride={runStatusLabel}
                activeOverride={run.status === 'waiting_approval' || run.status === 'needs_review' ? false : undefined} className="max-w-none" />
            </div>
          )}
          {isServerBackedRun && traceExpanded && (
            <>
            {workflow.executionMode === 'coordinated' && (
              <section className="mt-4 border-t border-ui-border pt-4" aria-label={t('workflowCoordination.traceTitle')}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="type-row-title">{t('workflowCoordination.traceTitle')}</h4>
                  {coordinationByExecutionId[run.id] && <StatusBadge tone={runStatusTone(run.status)}>{formatIdentifierLabel(coordinationByExecutionId[run.id].status)}</StatusBadge>}
                </div>
                {coordinationLoadingId === run.id ? (
                  <div role="status" aria-live="polite" className="type-caption mt-3 text-ui-text-muted">{t('workflowCoordination.traceLoading')}</div>
                ) : coordinationErrorByExecutionId[run.id] ? (
                  <InlineAlert tone="danger" className="mt-3 px-3 py-2 type-emphasis">{coordinationErrorByExecutionId[run.id]}</InlineAlert>
                ) : (coordinationByExecutionId[run.id]?.children.length || 0) === 0 ? (
                  <div className="type-caption mt-3 text-ui-text-muted">{t('workflowCoordination.traceEmpty')}</div>
                ) : (
                  <div className="mt-3 divide-y divide-ui-border border-y border-ui-border">
                    {coordinationByExecutionId[run.id].children.map((child) => (
                      <div key={child.id} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                        <div className="min-w-0">
                          <div className="break-words type-body type-emphasis text-ui-text [overflow-wrap:anywhere]">{child.capabilityId}</div>
                          <dl className="type-caption mt-1 grid gap-x-3 gap-y-1 text-ui-text-muted sm:grid-cols-[4rem_minmax(0,1fr)]">
                            <dt>{t('workflowCoordination.agentLabel')}</dt><dd className="break-words [overflow-wrap:anywhere]">{child.agent.name}</dd>
                          </dl>
                          {child.failure && <div className="type-caption mt-2 break-words text-status-danger-text [overflow-wrap:anywhere]">{child.failure.code}: {child.failure.message}</div>}
                        </div>
                        <StatusBadge tone={child.status === 'completed' ? 'success' : child.status === 'failed' || child.status === 'cancelled' ? 'danger' : 'neutral'}>{formatIdentifierLabel(child.status)}</StatusBadge>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
            </>
          )}
        </article>
      );
    }) : (
      <DataSurface aria-label={t('workflowActivity.ledgerLabel')}>
        <EmptyState
          icon={<ICONS.Activity className="h-4 w-4" aria-hidden="true" />}
          title={t('workflowActivity.emptyWorkflowTitle')}
          description={t('workflowActivity.emptyWorkflowDescription')}
        />
      </DataSurface>
    )}
  </WorkflowPanel>
  );
};

const AgentCapabilityGroup: React.FC<{
  label: string;
  values: string[];
  emptyLabel: string;
}> = ({ label, values, emptyLabel }) => (
  <div className="grid min-w-0 gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5">
    <dt className="type-row-title">{label}</dt>
    <dd className="min-w-0">
      {values.length > 0 ? (
        <ul className="grid min-w-0 gap-2">
          {values.map((value) => (
            <li key={value} className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="min-w-0 break-words type-ui leading-6 text-ui-text [overflow-wrap:anywhere]">
                {value}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <span className="type-ui text-ui-text-muted">{emptyLabel}</span>
      )}
    </dd>
  </div>
);

const AgentToolCapabilityGroup: React.FC<{
  tools: WorkflowAgentCapabilityReview['tools'];
}> = ({ tools }) => {
  const accessOrder = { write: 0, read: 1, unknown: 2 } as const;
  const orderedTools = [...tools].sort((left, right) => accessOrder[left.access] - accessOrder[right.access]);

  return (
    <div className="grid min-w-0 gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5">
      <dt className="type-row-title">Tools</dt>
      <dd className="min-w-0">
        {orderedTools.length > 0 ? (
          <ul className="divide-y divide-ui-border">
            {orderedTools.map((tool) => (
              <li key={tool.id} className="flex min-w-0 flex-col gap-2 py-2 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0">
                  <span className="block break-words font-mono type-body text-ui-text [overflow-wrap:anywhere]">{tool.label}</span>
                  {tool.description && <span className="type-caption mt-0.5 block max-w-[70ch] text-ui-text-muted">{tool.description}</span>}
                </span>
                <span className="flex shrink-0 flex-wrap gap-1.5">
                  <StatusBadge tone={tool.access === 'read' ? 'success' : tool.access === 'write' ? 'warning' : 'neutral'}>
                    {tool.access === 'unknown'
                      ? 'Unclassified'
                      : tool.access === 'read'
                        ? 'Read'
                        : tool.requiresApproval
                          ? 'Write · approval'
                          : 'Write'}
                  </StatusBadge>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="type-ui text-ui-text-muted">None</span>
        )}
      </dd>
    </div>
  );
};

const AgentCapabilityReviewList: React.FC<{
  agentReviews: WorkflowAgentCapabilityReview[];
}> = ({ agentReviews }) => {
  if (agentReviews.length === 0) {
    return <div className="border-y border-ui-border py-4 type-ui text-ui-text-muted">No assigned agents to review.</div>;
  }
  return (
    <div>
      {agentReviews.map((agent) => (
        <section key={agent.agentId} className="grid gap-4 border-t border-ui-border py-5 first:border-t-0 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <h4 className="type-panel-title grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-2 text-ui-text">
              <AgentAvatar emoji={agent.avatarEmoji} size="sm" />
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">{agent.name}</span>
            </h4>
          </div>
          {agent.missingAgentData ? (
            <div className="type-ui text-ui-text-muted">Agent capability data is not available in the current catalog.</div>
          ) : (
            <dl className="min-w-0 divide-y divide-ui-border">
              <AgentCapabilityGroup label="Write policy" values={agent.writeAccess ? [agent.writeAccess] : []} emptyLabel="Unavailable" />
              <AgentCapabilityGroup label="MCP servers" values={agent.mcpServers} emptyLabel="None" />
              <AgentCapabilityGroup label="Skills" values={agent.skills} emptyLabel="None" />
              <AgentToolCapabilityGroup tools={agent.tools} />
            </dl>
          )}
        </section>
      ))}
    </div>
  );
};

export const WorkflowCapabilitiesPanel: React.FC<{
  workflow: WorkflowDefinition;
  agents: AgentDefinition[];
  catalogFailures: string[];
  onRetryCatalog: () => void;
  showHeader?: boolean;
}> = ({ workflow, agents, catalogFailures, onRetryCatalog, showHeader }) => {
  const { t } = useTranslation();
  const agentReviews = getWorkflowAgentCapabilityReview(workflow, agents);

  return (
    <WorkflowPanel
      title="Capabilities"
      description="Review each selected Agent's write policy, MCP servers, skills, and tools."
      showHeader={showHeader}
    >
      {catalogFailures.length > 0 && (
        <InlineAlert tone="warning" className="type-body" action={<Button type="button" variant="secondary" size="sm" onClick={onRetryCatalog}>{t('common.retry')}</Button>}>
          {t('workflowCatalog.inlineFailure')} {catalogFailures.join(' ')}
        </InlineAlert>
      )}
      <AgentCapabilityReviewList agentReviews={agentReviews} />
    </WorkflowPanel>
  );
};
