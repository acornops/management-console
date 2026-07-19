import React from 'react';
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
import { WorkflowScopeMultiSelect, type WorkflowScopeOptions } from '@/pages/WorkspaceWorkflowsPage.scope';
import {
  getWorkflowAgentCapabilityReview,
  type WorkflowAgentCapabilityReview
} from '@/pages/workflows/workflowAgentCapabilities';
import {
  getRunDiscussionState,
  isRunActive,
  runStatusTone,
  workflowRunToTrace,
  type AgentSelectionDraft,
  type ScopeDraft
} from '@/pages/workflows/workflowPageHelpers';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import type { useWorkspaceWorkflowActions } from '@/pages/workflows/useWorkspaceWorkflowActions';
import type { WorkflowRunApproval, WorkflowRunEvent, WorkflowOptionsCatalog } from '@/services/control-plane/workflowApi';
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
  savingAgentSelectionId,
  agentSelectionError,
  agentSelectionResult,
  workflowActions
}) => (
  <WorkflowTabPanel
    tab="agents"
    title="Agents"
    description="Select the agents that contribute capabilities to this workflow. Gates can only narrow what selected agents already provide."
    actions={!isEditingAgentSelection && (
      <Button type="button" variant="secondary" size="sm" onClick={() => workflowActions.startEditingAgentSelection(workflow)} disabled={!canManageWorkflowScope} title={!canManageWorkflowScope ? 'You need manage_workflows to edit workflow agents.' : undefined}>
        <ICONS.Bot className="h-4 w-4" aria-hidden="true" />
        Edit agents
      </Button>
    )}
  >
    {agentSelectionError && <div role="alert" aria-live="assertive" className="rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">{agentSelectionError}</div>}
    {agentSelectionResult && <div role="status" aria-live="polite" aria-atomic="true" className="rounded-md border border-status-success/30 bg-status-success-soft p-3 text-xs font-semibold text-status-success-text">{agentSelectionResult}</div>}
    {!canManageWorkflowScope && <div className="rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-xs font-semibold text-ui-text-muted">You can inspect assignments. Ask a workspace manager for manage_workflows to change selected agents.</div>}
    <WorkflowSection title="Coordinator: System Orchestrator" description="The coordinator plans the workflow envelope (the run's overall plan and boundaries) and delegates to selected agents. It does not add extra tool access by itself.">
      <AgentAssignmentList className="mt-3" agents={[workflow.orchestrator]} labelForAgent={() => 'Read-only'} />
    </WorkflowSection>
    {isEditingAgentSelection && selectedAgentSelectionDraft ? (
      <WorkflowSection title="Selected agents" description="Pick only the agents needed for this workflow. Adding an agent expands the capabilities available for later restriction.">
        <div className="mt-4 grid gap-4">
          <fieldset>
            <legend className="sr-only">Workflow agents</legend>
            <div className="flex items-center justify-between gap-3 border-b border-ui-border pb-2">
              <span className="type-micro-label text-ui-text-muted">Workflow agents</span>
              <span className="type-caption font-semibold text-ui-text-muted">
                {selectedAgentSelectionDraft.agentIds.length} selected
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
            <Button type="button" variant="primary" size="sm" onClick={() => void workflowActions.saveAgentSelection()} disabled={!canManageWorkflowScope || savingAgentSelectionId === workflow.id}>
              {savingAgentSelectionId === workflow.id ? 'Saving...' : 'Save agents'}
            </Button>
          </div>
        </div>
      </WorkflowSection>
    ) : (
      <WorkflowSection title="Selected agents" description="These agents define the workflow's available access before workflow-level restrictions are applied.">
        <AgentAssignmentList className="mt-3" agents={workflow.agents} labelForAgent={(agent) => agent.required ? 'Selected' : 'Optional'} />
      </WorkflowSection>
    )}
  </WorkflowTabPanel>
);

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
  setExpandedRunLogId
}) => {
  const [stopArmedRunId, setStopArmedRunId] = React.useState('');
  return (
  <WorkflowTabPanel tab="runs" title="Runs" description="Inspect dispatched runs, approval pauses, trace events, and active run instructions.">
    {[approvalError, runLogError, cancelRunError].filter(Boolean).map((message) => <div key={message} role="alert" aria-live="assertive" className="rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">{message}</div>)}
    {workflow.runs.length > 0 ? workflow.runs.map((run) => {
      const effectiveRunId = run.runId || run.id;
      const approvals = run.runId ? approvalRecords[run.runId] || [] : [];
      const traceExpanded = expandedRunLogId === effectiveRunId;
      const runTrace = workflowRunToTrace(run, runEventsByRunId[effectiveRunId] || []);
      const runMessages = runMessagesByRunId[effectiveRunId] || [];
      const runMessageDraft = runMessageDrafts[effectiveRunId] || '';
      const runMessageSending = runMessageSendingId === effectiveRunId;
      const runMessageError = runMessageErrorByRunId[effectiveRunId] || '';
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
            {isRunActive(run.status) && (
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
          <p className="type-caption mt-3 text-ui-text">{run.output}</p>
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
          <div className="mt-3 border-t border-ui-border pt-2">
            <TraceFooter runId={effectiveRunId} trace={runTrace} isExpanded={traceExpanded} setExpanded={(runId, expanded) => expanded ? void workflowActions.toggleRunLogs(runId) : setExpandedRunLogId('')} compactStatusOnly className="max-w-none" />
          </div>
          {traceExpanded && (
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
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-ui-text [overflow-wrap:anywhere]">{message.content}</p>
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
              {runMessageError && <div role="alert" aria-live="assertive" className="mt-2 rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">{runMessageError}</div>}
            </section>
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
  accessBadge?: string;
  variant?: 'approval' | 'text';
}> = ({ label, values, emptyLabel, technical = false, accessBadge, variant = 'text' }) => (
  <div className="grid min-w-0 gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5">
    <dt className="type-micro-label pt-1 text-ui-text-muted">{label}</dt>
    <dd className="min-w-0">
      {values.length > 0 && variant === 'approval' ? (
        <ApprovalPolicyBadges values={values} />
      ) : values.length > 0 ? (
        <ul className="grid min-w-0 gap-2">
          {values.map((value) => (
            <li key={value} className="flex min-w-0 flex-wrap items-center gap-2">
              {accessBadge && <StatusBadge tone="success">{accessBadge}</StatusBadge>}
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

function approvalTone(value: string): 'success' | 'warning' | 'neutral' {
  if (value.includes('approval required')) return 'warning';
  if (value.includes('allowed')) return 'success';
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
            <p className="type-caption mt-1 text-ui-text-muted">{agent.required ? 'Required agent' : 'Optional agent'}</p>
            <p className="type-caption mt-1 break-words text-ui-text-muted [overflow-wrap:anywhere]">{agent.role}</p>
          </div>
          {agent.missingAgentData ? (
            <div className="text-sm font-medium text-ui-text-muted">Agent capability data is not available in the current catalog.</div>
          ) : (
            <dl className="min-w-0 divide-y divide-ui-border">
              <AgentCapabilityGroup label="MCP servers" values={agent.mcpServers} emptyLabel="No MCP servers." technical accessBadge="read" />
              <AgentCapabilityGroup label="Skills" values={agent.skills} emptyLabel="No skills." accessBadge="read" />
              <AgentCapabilityGroup label="Allowed tools" values={agent.tools} emptyLabel="No tools." technical accessBadge="read" />
              <AgentCapabilityGroup label="Approvals" values={agent.approvalPolicy} emptyLabel="No approval policy." variant="approval" />
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
  scopeDraft: ScopeDraft;
  scopeSaveError: { tab: 'capabilities'; message: string } | null;
  scopeSaveResult: { tab: 'capabilities'; message: string } | null;
  canManageWorkflowScope: boolean;
  editing: boolean;
  saving: boolean;
  scopeOptions: WorkflowScopeOptions;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSave: () => void;
  onSetWorkflowScopeValue: (key: 'enabledMcpServers' | 'enabledSkills', value: string, enabled: boolean) => void;
  onSetStepToolValue: (stepId: string, value: string, enabled: boolean) => void;
  catalogFailures: string[];
  onRetryCatalog: () => void;
  onOpenMcpSettings: () => void;
}> = ({ workflow, agents, scopeDraft, scopeSaveError, scopeSaveResult, canManageWorkflowScope, editing, saving, scopeOptions, onStartEditing, onCancelEditing, onSave, onSetWorkflowScopeValue, onSetStepToolValue, catalogFailures, onRetryCatalog, onOpenMcpSettings }) => {
  const { t } = useTranslation();
  const agentReviews = getWorkflowAgentCapabilityReview(workflow, agents);

  return (
    <WorkflowTabPanel
      tab="capabilities"
      title="Capability review"
      description="Read the effective access path before launch: selected agents provide access, gates remove capabilities, and approvals pause sensitive steps."
      actions={!editing ? (
        <Button type="button" variant="secondary" size="sm" onClick={onStartEditing} disabled={!canManageWorkflowScope} title={!canManageWorkflowScope ? 'You need manage_workflows to edit workflow capabilities.' : undefined}>
          <ICONS.Pencil className="h-4 w-4" aria-hidden="true" />
          Edit capabilities
        </Button>
      ) : undefined}
    >
      {scopeSaveError?.tab === 'capabilities' && <div role="alert" aria-live="assertive" className="mt-4 rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">{scopeSaveError.message}</div>}
      {scopeSaveResult?.tab === 'capabilities' && <div role="status" aria-live="polite" aria-atomic="true" className="mt-4 rounded-md border border-status-success/30 bg-status-success-soft p-3 text-xs font-semibold text-status-success-text">{scopeSaveResult.message}</div>}
      {catalogFailures.length > 0 && (
        <div role="alert" className="flex flex-col gap-3 rounded-md border border-status-warning/30 bg-status-warning-soft p-3 text-sm text-status-warning-text sm:flex-row sm:items-center sm:justify-between">
          <span>{t('workflowCatalog.inlineFailure')} {catalogFailures.join(' ')}</span>
          <span className="flex flex-wrap gap-2"><Button type="button" variant="secondary" size="sm" onClick={onRetryCatalog}>{t('common.retry')}</Button><Button type="button" variant="secondary" size="sm" onClick={onOpenMcpSettings}>{t('workflowCatalog.openMcpSettings')}</Button></span>
        </div>
      )}

      {editing && (
        <section className="rounded-lg border border-ui-border bg-ui-surface p-4 sm:p-5" aria-label="Edit workflow capabilities">
          <div className="grid gap-5 lg:grid-cols-2">
            <WorkflowScopeMultiSelect
              label="Built-in MCP server"
              value={scopeDraft.enabledMcpServers}
              options={scopeOptions.mcpServers}
              searchPlaceholder="Search built-in server"
              emptyMessage="No built-in MCP server is available."
              selectedEmptyLabel="No server selected"
              onToggle={(option, checked) => onSetWorkflowScopeValue('enabledMcpServers', option.value, checked)}
            />
            <WorkflowScopeMultiSelect
              label="Skills"
              value={scopeDraft.enabledSkills}
              options={scopeOptions.skills}
              searchPlaceholder="Search skills"
              emptyMessage="No skills are available from the selected agents."
              selectedEmptyLabel="No skills selected"
              onToggle={(option, checked) => onSetWorkflowScopeValue('enabledSkills', option.value, checked)}
            />
          </div>
          <p className="type-caption mt-3 text-ui-text-muted">The AcornOps Target Tools connection is system-owned. This gate controls access; it cannot replace the server URL or credentials.</p>
          <div className="mt-5 grid gap-5">
            {workflow.steps.map((step) => (
              <WorkflowScopeMultiSelect
                key={step.id}
                label={`${step.title} tools`}
                value={scopeDraft.steps[step.id]?.allowedTools || ''}
                options={scopeOptions.mcpTools}
                searchPlaceholder="Search built-in tools"
                emptyMessage="No built-in tools are available from the selected agents."
                selectedEmptyLabel="No tools selected"
                onToggle={(option, checked) => onSetStepToolValue(step.id, option.value, checked)}
              />
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-2 border-t border-ui-border pt-4">
            <Button type="button" variant="secondary" size="sm" onClick={onCancelEditing} disabled={saving}>Cancel</Button>
            <Button type="button" variant="primary" size="sm" onClick={onSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save capability gate'}
            </Button>
          </div>
        </section>
      )}

      {!editing && <AgentCapabilityReviewList agentReviews={agentReviews} />}

      {!editing && <section className="border-t border-ui-border pt-5">
        <dl className="min-w-0 divide-y divide-ui-border">
          <CapabilityReviewRow
            label="Blocked capabilities"
            description="Capabilities removed by the workflow gate."
            values={workflow.disabledCapabilities}
            emptyLabel="No capabilities blocked by this workflow."
          />
          <CapabilityReviewRow
            label="Approvals"
            description="Operator decisions required before write-sensitive steps continue."
            values={workflow.policy.approvals}
            emptyLabel="No approval constraints configured."
          />
        </dl>
      </section>}
    </WorkflowTabPanel>
  );
};
