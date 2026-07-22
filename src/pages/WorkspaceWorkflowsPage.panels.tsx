import React from 'react';
import type { McpReadinessRecovery } from '@/services/control-plane/mcpReadinessRecovery';
import { isServerWorkflowRunId } from '@/pages/workflows/workflowRunIdentity';
import { Loader2, SendHorizontal, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { Select } from '@/components/common/Select';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ICONS } from '@/constants';
import { TraceFooter } from '@/features/targets/chat/components/TraceFooter';
import {
  AgentAssignmentList,
  CapabilityReviewRow,
  WorkflowSection,
  WorkflowTabPanel
} from '@/pages/WorkspaceWorkflowsPage.components';
import type { WorkflowDefinition, WorkflowRunMessage } from '@/pages/workflows/workflowModel';
import { getWorkflowAgentCapabilityReview, type WorkflowAgentCapabilityReview } from '@/pages/workflows/workflowAgentCapabilities';
import { WorkflowRunResponse } from '@/pages/workflows/WorkflowRunResponse';
import {
  getRunDiscussionState,
  isRunActive,
  runStatusTone,
  workflowRunToTrace,
  type AgentSelectionDraft
} from '@/pages/workflows/workflowPageHelpers';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import type { useWorkspaceWorkflowActions } from '@/pages/workflows/useWorkspaceWorkflowActions';
import { getWorkflowExecution, type WorkflowCoordinationChild, type WorkflowRunApproval, type WorkflowRunEvent, type WorkflowOptionsCatalog } from '@/services/control-plane/workflowApi';
import { formatUserDateTime } from '@/utils/dateTime';

type WorkflowActions = ReturnType<typeof useWorkspaceWorkflowActions>;
type WorkflowAgentOption = WorkflowOptionsCatalog['agents'][number];

function formatWorkflowTimestamp(value: string): string {
  return formatUserDateTime(value, { fallback: value });
}

function WorkflowRunInstructionForm({
  canMessageRun,
  effectiveRunId,
  runMessageDraft,
  runMessageSending,
  workflowActions,
  workflowSessionId
}: {
  canMessageRun: boolean;
  effectiveRunId: string;
  runMessageDraft: string;
  runMessageSending: boolean;
  workflowActions: Pick<WorkflowActions, 'updateWorkflowRunMessageDraft' | 'sendWorkflowRunMessage'>;
  workflowSessionId: string;
}) {
  const instructionTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useLayoutEffect(() => {
    const textarea = instructionTextareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;
  }, [runMessageDraft]);

  const canSendInstruction = canMessageRun && !runMessageSending && Boolean(runMessageDraft.trim());
  const sendInstruction = () => {
    if (!canSendInstruction) return;
    void workflowActions.sendWorkflowRunMessage(effectiveRunId, workflowSessionId);
  };

  return (
    <form
      className="mt-3 rounded-lg border border-ui-border bg-ui-bg px-3 py-2 transition-colors duration-200 focus-within:border-accent/45 focus-within:ring-2 focus-within:ring-accent/15"
      onSubmit={(event) => {
        event.preventDefault();
        sendInstruction();
      }}
    >
      <textarea
        ref={instructionTextareaRef}
        aria-label="Send instruction"
        placeholder="Send instruction"
        rows={1}
        value={runMessageDraft}
        onChange={(event) => workflowActions.updateWorkflowRunMessageDraft(effectiveRunId, event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendInstruction();
          }
        }}
        className="max-h-36 min-h-10 w-full resize-none overflow-y-auto border-0 bg-transparent px-0 py-2 text-sm font-medium leading-6 text-ui-text outline-none placeholder:text-ui-text-muted/60 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canMessageRun || runMessageSending}
      />
      <div className="flex items-center justify-end border-t border-ui-border/70 pt-2">
        <Button type="submit" variant="secondary" size="icon" disabled={!canSendInstruction} aria-label="Send instruction">
          {runMessageSending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <SendHorizontal className="h-4 w-4" aria-hidden="true" />}
        </Button>
      </div>
    </form>
  );
}

export const WorkflowAgentsPanel: React.FC<{
  workflow: WorkflowDefinition;
  selectedAgentSelectionDraft?: AgentSelectionDraft;
  activeAgentOptions: WorkflowAgentOption[];
  isEditingAgentSelection: boolean;
  canManageWorkflowScope: boolean;
  systemProvided: boolean;
  savingAgentSelectionId: string;
  agentSelectionError: string;
  agentSelectionResult: string;
  workflowActions: Pick<WorkflowActions, 'startEditingAgentSelection' | 'updateAgentSelectionDraft' | 'cancelEditingAgentSelection' | 'saveAgentSelection'>;
}> = ({
  workflow,
  selectedAgentSelectionDraft,
  activeAgentOptions,
  isEditingAgentSelection,
  canManageWorkflowScope,
  systemProvided,
  savingAgentSelectionId,
  agentSelectionError,
  agentSelectionResult,
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

  React.useEffect(() => {
    if (!isEditingAgentSelection || !selectedAgentSelectionDraft) return;
    const availableIds = new Set(activeAgentOptions.filter((agent) => !agent.disabled).map((agent) => agent.value));
    const availableSelection = selectedAgentSelectionDraft.agentIds.filter((agentId) => availableIds.has(agentId));
    if (availableSelection.length !== selectedAgentSelectionDraft.agentIds.length) {
      workflowActions.updateAgentSelectionDraft(workflow.id, { agentIds: availableSelection });
    }
  }, [activeAgentOptions, isEditingAgentSelection, selectedAgentSelectionDraft, workflow.id, workflowActions]);

  return (
  <WorkflowTabPanel
    tab="agents"
    title={t('workflowCoordination.agentsTitle')}
    description={t('workflowCoordination.agentsDescription')}
    actions={!isEditingAgentSelection && (
      <Button type="button" variant="secondary" size="sm" onClick={() => workflowActions.startEditingAgentSelection(workflow)} disabled={!canManageWorkflowScope || systemProvided} title={systemProvided ? 'Duplicate this system-provided workflow to edit its agents.' : !canManageWorkflowScope ? 'You need manage_workflows to edit workflow agents.' : undefined}>
        <ICONS.Bot className="h-4 w-4" aria-hidden="true" />
        Edit agents
      </Button>
    )}
  >
    {agentSelectionError && <div role="alert" aria-live="assertive" className="rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">{agentSelectionError}</div>}
    {agentSelectionResult && <div role="status" aria-live="polite" aria-atomic="true" className="rounded-md border border-status-success/30 bg-status-success-soft p-3 text-xs font-semibold text-status-success-text">{agentSelectionResult}</div>}
    {!systemProvided && !canManageWorkflowScope && <div className="rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-xs font-semibold text-ui-text-muted">You can inspect assignments. Ask a workspace manager for manage_workflows to change selected agents.</div>}
    {selectionFeedback && <div role="status" aria-live="polite" aria-atomic="true" className="rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-sm font-semibold text-ui-text">{selectionFeedback}</div>}
    {isEditingAgentSelection && selectedAgentSelectionDraft ? (
      <WorkflowSection title={t('workflowCoordination.agentsTitle')} description={t('workflowCoordination.agentsDescription')}>
        <div className="mt-4 grid gap-4">
          <fieldset>
            <legend className="sr-only">Workflow agents</legend>
            <div className="flex flex-col gap-1 border-b border-ui-border pb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <span className="type-micro-label text-ui-text-muted">{t('workflowCoordination.selectedAgents')}</span>
              <span className="type-caption font-semibold text-ui-text-muted">
                {t('workflowCoordination.selectedCount', { count: selectedAgentSelectionDraft.agentIds.length })}
              </span>
            </div>
            <div className="divide-y divide-ui-border border-b border-ui-border">
              {activeAgentOptions.map((agent) => {
                const checked = selectedAgentSelectionDraft.agentIds.includes(agent.value);
                return (
                  <label
                    key={agent.value}
                    className={`grid min-h-12 cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-3 py-3 text-sm transition-colors ${agent.disabled ? 'cursor-not-allowed opacity-55' : 'hover:bg-ui-bg/60'}`}
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
                      <span className="block min-w-0 break-words font-semibold [overflow-wrap:anywhere]">{agent.label}</span>
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
            <Button type="button" variant="primary" size="sm" onClick={() => void workflowActions.saveAgentSelection()} disabled={!canManageWorkflowScope || savingAgentSelectionId === workflow.id || selectedAgentSelectionDraft.agentIds.length === 0}>
              {savingAgentSelectionId === workflow.id ? 'Saving...' : 'Save agents'}
            </Button>
          </div>
        </div>
      </WorkflowSection>
    ) : (
      <WorkflowSection title={t('workflowCoordination.selectedAgents')} description={t('workflowCoordination.peerDescription')}>
        {workflow.agents.length > 0 ? <AgentAssignmentList className="mt-3" agents={workflow.agents} labelForAgent={() => workflow.executionMode === 'direct' ? t('workflowCoordination.directLabel') : t('workflowCoordination.coordinatedLabel')} /> : <p className="type-caption mt-3 text-ui-text-muted">{t('workflowCoordination.noAgents')}</p>}
      </WorkflowSection>
    )}
  </WorkflowTabPanel>
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
  workflowActions: Pick<WorkflowActions, 'stopWorkflowRun' | 'decideApproval' | 'toggleRunLogs' | 'updateWorkflowRunMessageDraft' | 'sendWorkflowRunMessage'>;
  approvalAction: string;
  workflowSessionId: string;
  runMessagesByRunId: Record<string, WorkflowRunMessage[]>;
  runMessageDrafts: Record<string, string>;
  runMessageSendingId: string;
  runMessageErrorByRunId: Record<string, string>;
  runMessageRecoveryByRunId: Record<string, McpReadinessRecovery>;
  setExpandedRunLogId: React.Dispatch<React.SetStateAction<string>>;
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
  workflowSessionId,
  runMessagesByRunId,
  runMessageDrafts,
  runMessageSendingId,
  runMessageErrorByRunId,
  runMessageRecoveryByRunId,
  setExpandedRunLogId
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
        const response = await getWorkflowExecution(run.id);
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
      } catch (error) {
        if (!cancelled) setCoordinationErrorByExecutionId((current) => ({
          ...current,
          [run.id]: error instanceof Error ? error.message : t('workflowCoordination.traceUnavailable')
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
  <WorkflowTabPanel tab="runs" title="Runs" description="Inspect dispatched runs, approval pauses, trace events, and active run instructions.">
    {[approvalError, runLogError, cancelRunError].filter(Boolean).map((message) => <div key={message} role="alert" aria-live="assertive" className="rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">{message}</div>)}
    {workflow.runs.length > 0 ? workflow.runs.map((run) => {
      const effectiveRunId = run.runId || run.id;
      const isServerBackedRun = isServerWorkflowRunId(run.runId);
      const approvals = run.runId ? approvalRecords[run.runId] || [] : [];
      const traceExpanded = expandedRunLogId === effectiveRunId;
      const runTrace = workflowRunToTrace(run, runEventsByRunId[effectiveRunId] || []);
      const runMessages = runMessagesByRunId[effectiveRunId] || [];
      const runMessageDraft = runMessageDrafts[effectiveRunId] || '';
      const runMessageSending = runMessageSendingId === effectiveRunId;
      const runMessageError = runMessageErrorByRunId[effectiveRunId] || '';
      const runMessageRecovery = runMessageRecoveryByRunId[effectiveRunId];
      const discussionState = getRunDiscussionState(run, workflowSessionId);
      const canMessageRun = discussionState === 'active';
      return (
        <article key={run.id} className="rounded-lg border border-ui-border bg-ui-surface p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="type-row-title">{run.id}</div>
              <div className="type-caption mt-1 text-ui-text-muted">{run.actor} · {formatWorkflowTimestamp(run.startedAt)} · {run.duration}</div>
              <div className="mt-2"><StatusBadge tone={runStatusTone(run.status)}>{run.status.replace('_', ' ')}</StatusBadge></div>
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
          <WorkflowRunResponse content={run.output} className="mt-3" />
          {approvals.length > 0 && (
            <div className="mt-3 grid gap-2">
              {approvals.map((approval) => (
                <div key={approval.id} className="rounded-md bg-ui-bg p-3">
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
          {isServerBackedRun && (
            <div className="mt-3 border-t border-ui-border pt-2">
              <TraceFooter runId={effectiveRunId} trace={runTrace} isExpanded={traceExpanded} setExpanded={(runId, expanded) => expanded ? void workflowActions.toggleRunLogs(runId) : setExpandedRunLogId('')} compactStatusOnly className="max-w-none" />
            </div>
          )}
          {isServerBackedRun && traceExpanded && (
            <>
            {workflow.executionMode === 'coordinated' && (
              <section className="mt-4 border-t border-ui-border pt-4" aria-label={t('workflowCoordination.traceTitle')}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="type-row-title">{t('workflowCoordination.traceTitle')}</h4>
                  {coordinationByExecutionId[run.id] && <StatusBadge tone={runStatusTone(run.status)}>{coordinationByExecutionId[run.id].status.replaceAll('_', ' ')}</StatusBadge>}
                </div>
                {coordinationLoadingId === run.id ? (
                  <div role="status" aria-live="polite" className="type-caption mt-3 text-ui-text-muted">{t('workflowCoordination.traceLoading')}</div>
                ) : coordinationErrorByExecutionId[run.id] ? (
                  <div role="alert" className="mt-3 rounded-md border border-status-danger/30 bg-status-danger-soft px-3 py-2 text-xs font-semibold text-status-danger-text">{coordinationErrorByExecutionId[run.id]}</div>
                ) : (coordinationByExecutionId[run.id]?.children.length || 0) === 0 ? (
                  <div className="type-caption mt-3 text-ui-text-muted">{t('workflowCoordination.traceEmpty')}</div>
                ) : (
                  <div className="mt-3 divide-y divide-ui-border border-y border-ui-border">
                    {coordinationByExecutionId[run.id].children.map((child) => (
                      <div key={child.id} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                        <div className="min-w-0">
                          <div className="break-words text-sm font-semibold text-ui-text [overflow-wrap:anywhere]">{child.capabilityId}</div>
                          <dl className="type-caption mt-1 grid gap-x-3 gap-y-1 text-ui-text-muted sm:grid-cols-[4rem_minmax(0,1fr)]">
                            <dt>{t('workflowCoordination.targetLabel')}</dt><dd className="break-words [overflow-wrap:anywhere]">{child.target.targetType}: {child.target.id}</dd>
                            <dt>{t('workflowCoordination.agentLabel')}</dt><dd className="break-words [overflow-wrap:anywhere]">{child.agent.name}</dd>
                          </dl>
                          {child.failure && <div className="type-caption mt-2 break-words text-status-danger-text [overflow-wrap:anywhere]">{child.failure.code}: {child.failure.message}</div>}
                        </div>
                        <StatusBadge tone={child.status === 'completed' ? 'success' : child.status === 'failed' || child.status === 'cancelled' ? 'danger' : 'neutral'}>{child.status.replaceAll('_', ' ')}</StatusBadge>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
            <section className="mt-4 border-t border-ui-border pt-4" aria-label="Run discussion">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="type-row-title">Run discussion</h4>
                {discussionState === 'active' && <span className="type-caption font-semibold text-ui-text-muted">Instruction channel ready</span>}
                {discussionState === 'waiting_session' && <span className="type-caption font-semibold text-ui-text-muted">Session starting</span>}
              </div>
              {(runMessages.length > 0 || discussionState !== 'terminal') && (
                <div className="mt-3 grid gap-2">
                  {runMessages.length > 0 ? runMessages.map((message) => (
                    <div key={message.id} className="rounded-md bg-ui-bg px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-ui-text">{message.role === 'operator' ? 'Instructions' : message.author || 'Workflow response'}</span>
                        <span className="type-caption text-ui-text-muted">{message.author} · {formatWorkflowTimestamp(message.createdAt)} · {message.status}</span>
                      </div>
                      <WorkflowRunResponse content={message.content} className="mt-1" />
                    </div>
                  )) : (
                    <div className="rounded-md border border-dashed border-ui-border bg-ui-bg px-3 py-3 text-sm font-semibold text-ui-text-muted">No instructions or responses yet.</div>
                  )}
                </div>
              )}
              {discussionState === 'waiting_session' && (
                <div className="mt-3 rounded-md bg-ui-bg px-3 py-3 text-sm font-semibold text-ui-text-muted">Instructions can be sent once the run session is ready.</div>
              )}
              {discussionState === 'terminal' && run.status === 'failed' && (
                <div className="mt-3 rounded-md bg-ui-bg px-3 py-3 text-sm font-semibold text-ui-text-muted">This run cannot accept more instructions. Start a follow-up run or retry from the workflow action.</div>
              )}
              {discussionState === 'active' && (
                <WorkflowRunInstructionForm
                  canMessageRun={canMessageRun}
                  effectiveRunId={effectiveRunId}
                  runMessageDraft={runMessageDraft}
                  runMessageSending={runMessageSending}
                  workflowActions={workflowActions}
                  workflowSessionId={workflowSessionId}
                />
              )}
              {runMessageError && <div role="alert" aria-live="assertive" className="mt-2 rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">{runMessageError}{runMessageRecovery && <a className="ml-2 underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-control-boundary" href={runMessageRecovery.href}>{runMessageRecovery.label}</a>}</div>}
            </section>
            </>
          )}
        </article>
      );
    }) : (
      <div className="rounded-lg border border-ui-border bg-ui-surface p-6">
        <div className="text-sm font-semibold text-ui-text">No runs yet</div>
        <p className="type-caption mt-1 text-ui-text-muted">Launch this workflow from the overview after readiness checks pass.</p>
      </div>
    )}
  </WorkflowTabPanel>
  );
};

const AgentCapabilityGroup: React.FC<{
  label: string;
  values: string[];
  emptyLabel: string;
  technical?: boolean;
  variant?: 'approval' | 'text';
}> = ({ label, values, emptyLabel, technical = false, variant = 'text' }) => (
  <div className="grid min-w-0 gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5">
    <dt className="type-micro-label pt-1 text-ui-text-muted">{label}</dt>
    <dd className="min-w-0">
      {values.length > 0 && variant === 'approval' ? (
        <ApprovalPolicyBadges values={values} />
      ) : values.length > 0 ? (
        <ul className="grid min-w-0 gap-2">
          {values.map((value) => (
            <li key={value} className="flex min-w-0 flex-wrap items-center gap-2">
              <span className={technical ? 'min-w-0 break-words font-mono text-sm leading-6 text-ui-text [overflow-wrap:anywhere]' : 'min-w-0 break-words text-sm font-medium leading-6 text-ui-text [overflow-wrap:anywhere]'}>
                {value}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-sm font-medium text-ui-text-muted">{emptyLabel}</span>
      )}
    </dd>
  </div>
);

function approvalTone(value: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (value.includes('approval required')) return 'warning';
  if (value.includes('allowed')) return 'success';
  if (value.includes('blocked')) return 'danger';
  return 'neutral';
}

function parseApprovalValue(value: string): { label: string; value: string } {
  const [label, ...rest] = value.split(': ');
  return {
    label: label.replace(' actions', ''),
    value: rest.join(': ') || value
  };
}

const ApprovalPolicyBadges: React.FC<{ values: string[] }> = ({ values }) => (
  <div className="grid min-w-0 gap-2">
    {values.map((value) => {
      const parsed = parseApprovalValue(value);
      return (
        <span key={value} className="inline-flex min-w-0 items-center gap-1.5">
          <span className="type-micro-label text-ui-text-muted">{parsed.label}</span>
          <StatusBadge tone={approvalTone(value)}>{parsed.value}</StatusBadge>
        </span>
      );
    })}
  </div>
);

const AgentCapabilityReviewList: React.FC<{
  agentReviews: WorkflowAgentCapabilityReview[];
}> = ({ agentReviews }) => {
  if (agentReviews.length === 0) {
    return <div className="mt-2 border-y border-ui-border py-4 text-sm font-medium text-ui-text-muted">No assigned agents to review.</div>;
  }
  return (
    <div className="mt-4">
      {agentReviews.map((agent) => (
        <section key={agent.agentId} className="grid gap-4 border-t border-ui-border py-5 first:border-t-0 first:pt-0 last:pb-0 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
          <div className="min-w-0">
            <h4 className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-2 text-base font-semibold leading-6 text-ui-text">
              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-ui-border bg-ui-bg text-ui-text-muted">
                <ICONS.Bot className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">{agent.name}</span>
            </h4>
            <p className="type-caption mt-1 text-ui-text-muted">Selected Agent</p>
            <p className="type-caption mt-1 break-words text-ui-text-muted [overflow-wrap:anywhere]">{agent.role}</p>
          </div>
          {agent.missingAgentData ? (
            <div className="text-sm font-medium text-ui-text-muted">Agent capability data is not available in the current catalog.</div>
          ) : (
            <dl className="min-w-0 divide-y divide-ui-border">
              <AgentCapabilityGroup label="Direct MCP servers" values={agent.mcpServers} emptyLabel="No directly attached MCP servers." technical />
              <AgentCapabilityGroup label="Installed skills" values={agent.skills} emptyLabel="No installed skills." />
              <AgentCapabilityGroup label="Directly attached tools" values={agent.tools} emptyLabel="No directly attached tools." technical />
              <AgentCapabilityGroup label="Agent action policy" values={agent.actionPolicy} emptyLabel="No Agent action policy." variant="approval" />
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
}> = ({ workflow, agents, catalogFailures, onRetryCatalog }) => {
  const { t } = useTranslation();
  const agentReviews = getWorkflowAgentCapabilityReview(workflow, agents);

  return (
    <WorkflowTabPanel
      tab="capabilities"
      title="Capability review"
      description="Review the tools and integrations available to selected Agents, plus approval gates that pause runs for a decision."
    >
      {catalogFailures.length > 0 && (
        <div role="alert" className="flex flex-col gap-3 rounded-md border border-status-warning/30 bg-status-warning-soft p-3 text-sm text-status-warning-text sm:flex-row sm:items-center sm:justify-between">
          <span>{t('workflowCatalog.inlineFailure')} {catalogFailures.join(' ')}</span>
          <Button type="button" variant="secondary" size="sm" onClick={onRetryCatalog}>{t('common.retry')}</Button>
        </div>
      )}
      <AgentCapabilityReviewList agentReviews={agentReviews} />

      <section className="border-t border-ui-border pt-5">
        <dl className="min-w-0 divide-y divide-ui-border">
          <CapabilityReviewRow
            label="Workflow approval gates"
            description="Runs pause at these gates until an operator approves or rejects them."
            values={workflow.policy.approvals}
            emptyLabel="No workflow approval gates."
          />
        </dl>
      </section>
    </WorkflowTabPanel>
  );
};
