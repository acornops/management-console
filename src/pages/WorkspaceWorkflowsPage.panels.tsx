import React from 'react';
import { Loader2, SendHorizontal, Square } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { Select } from '@/components/common/Select';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ICONS } from '@/constants';
import { TraceFooter } from '@/features/kubernetes-cluster-detail/components/detail/TraceFooter';
import {
  AgentAssignmentList,
  CapabilityReviewRow,
  WorkflowSection,
  WorkflowTabPanel
} from '@/pages/WorkspaceWorkflowsPage.components';
import type { WorkflowDefinition, WorkflowRunMessage } from '@/pages/workflows/workflowModel';
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
      className="mt-3 rounded-lg border border-ui-border bg-ui-surface px-3 py-2 shadow-[inset_0_1px_0_rgb(var(--surface-rgb)/0.9),0_1px_2px_rgb(var(--text-rgb)/0.05)] transition-[border-color,box-shadow] duration-200 focus-within:border-accent/45 focus-within:ring-2 focus-within:ring-accent/15"
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
    actions={!isEditingAgentSelection && (
      <Button type="button" variant="secondary" size="sm" onClick={() => workflowActions.startEditingAgentSelection(workflow)} disabled={!canManageWorkflowScope}>
        <ICONS.Bot className="h-4 w-4" aria-hidden="true" />
        Edit agents
      </Button>
    )}
  >
    {agentSelectionError && <div role="alert" aria-live="assertive" className="rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">{agentSelectionError}</div>}
    {agentSelectionResult && <div role="status" aria-live="polite" aria-atomic="true" className="rounded-md border border-status-success/30 bg-status-success-soft p-3 text-xs font-semibold text-status-success-text">{agentSelectionResult}</div>}
    <WorkflowSection title="Coordinator: System Orchestrator">
      <AgentAssignmentList className="mt-3" agents={[workflow.orchestrator]} labelForAgent={() => 'Read-only'} />
    </WorkflowSection>
    {isEditingAgentSelection && selectedAgentSelectionDraft ? (
      <WorkflowSection title="Selected agents">
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
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="flex justify-end gap-2 border-t border-ui-border pt-4">
            <Button type="button" variant="tertiary" size="sm" onClick={() => workflowActions.cancelEditingAgentSelection(workflow)} disabled={savingAgentSelectionId === workflow.id}>Cancel</Button>
            <Button type="button" variant="primary" size="sm" onClick={() => void workflowActions.saveAgentSelection()} disabled={!canManageWorkflowScope || savingAgentSelectionId === workflow.id}>
              {savingAgentSelectionId === workflow.id ? 'Saving...' : 'Save agents'}
            </Button>
          </div>
        </div>
      </WorkflowSection>
    ) : (
      <WorkflowSection title="Selected agents">
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
}) => (
  <WorkflowTabPanel tab="runs" title="Runs">
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
              <Button type="button" size="icon" variant="secondary" onClick={() => void workflowActions.stopWorkflowRun(effectiveRunId)} aria-label="Stop workflow run" disabled={cancelRunAction === effectiveRunId}>
                {cancelRunAction === effectiveRunId ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />}
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
                    <div key={message.id} className="rounded-md border border-ui-border bg-ui-bg px-3 py-2">
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
                <div className="mt-3 rounded-md border border-ui-border bg-ui-bg px-3 py-3 text-sm font-semibold text-ui-text-muted">Instructions can be sent once the run session is ready.</div>
              )}
              {discussionState === 'terminal' && run.status === 'failed' && (
                <div className="mt-3 rounded-md border border-ui-border bg-ui-bg px-3 py-3 text-sm font-semibold text-ui-text-muted">This run cannot accept more instructions. Start a follow-up run or retry from the workflow action.</div>
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
    }) : <div className="rounded-lg border border-ui-border bg-ui-surface p-6 text-sm font-semibold text-ui-text-muted">This workflow has no prior runs.</div>}
  </WorkflowTabPanel>
);

const AgentCapabilityGroup: React.FC<{
  label: string;
  values: string[];
  emptyLabel: string;
  technical?: boolean;
}> = ({ label, values, emptyLabel, technical = false }) => (
  <div className="min-w-0">
    <dt className="type-micro-label text-ui-text-muted">{label}</dt>
    <dd className="mt-1 min-w-0">
      {values.length > 0 ? (
        <ul className="grid gap-1.5">
          {values.map((value) => (
            <li key={value} className={technical ? 'break-words font-mono text-sm leading-6 text-ui-text [overflow-wrap:anywhere]' : 'break-words text-sm font-medium leading-6 text-ui-text [overflow-wrap:anywhere]'}>
              {value}
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-sm font-medium text-ui-text-muted">{emptyLabel}</span>
      )}
    </dd>
  </div>
);

const AgentCapabilityReviewList: React.FC<{
  agentReviews: WorkflowAgentCapabilityReview[];
}> = ({ agentReviews }) => {
  if (agentReviews.length === 0) {
    return <div className="mt-2 border-y border-ui-border py-4 text-sm font-medium text-ui-text-muted">No assigned agents to review.</div>;
  }
  return (
    <div className="mt-2 divide-y divide-ui-border border-y border-ui-border">
      {agentReviews.map((agent) => (
        <section key={agent.agentId} className="grid gap-4 py-4 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8">
          <div className="min-w-0">
            <h4 className="type-row-title break-words [overflow-wrap:anywhere]">{agent.name}</h4>
            <p className="type-caption mt-1 text-ui-text-muted">{agent.required ? 'Required agent' : 'Optional agent'}</p>
            <p className="type-caption mt-1 break-words text-ui-text-muted [overflow-wrap:anywhere]">{agent.role}</p>
          </div>
          {agent.missingAgentData ? (
            <div className="text-sm font-medium text-ui-text-muted">Agent capability data is not available in the current catalog.</div>
          ) : (
            <dl className="grid min-w-0 gap-4 md:grid-cols-2">
              <AgentCapabilityGroup label="MCP servers" values={agent.mcpServers} emptyLabel="No MCP servers." technical />
              <AgentCapabilityGroup label="Skills" values={agent.skills} emptyLabel="No skills." />
              <AgentCapabilityGroup label="Allowed tools" values={agent.tools} emptyLabel="No tools." technical />
              <AgentCapabilityGroup label="Approvals" values={agent.approvalPolicy} emptyLabel="No approval policy." />
              <div className="md:col-span-2">
                <AgentCapabilityGroup label="Capability rules" values={agent.capabilityRules} emptyLabel="No capability rules." technical />
              </div>
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
}> = ({ workflow, agents, scopeDraft: _scopeDraft, scopeSaveError, scopeSaveResult }) => {
  const agentReviews = getWorkflowAgentCapabilityReview(workflow, agents);

  return (
    <WorkflowTabPanel
      tab="capabilities"
      title="Capability review"
    >
      {scopeSaveError?.tab === 'capabilities' && <div role="alert" aria-live="assertive" className="mt-4 rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">{scopeSaveError.message}</div>}
      {scopeSaveResult?.tab === 'capabilities' && <div role="status" aria-live="polite" aria-atomic="true" className="mt-4 rounded-md border border-status-success/30 bg-status-success-soft p-3 text-xs font-semibold text-status-success-text">{scopeSaveResult.message}</div>}

      <WorkflowSection title="Inherited access">
        <AgentCapabilityReviewList agentReviews={agentReviews} />
      </WorkflowSection>

      <WorkflowSection title="Workflow restrictions">
        <dl className="mt-2 divide-y divide-ui-border">
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
      </WorkflowSection>
    </WorkflowTabPanel>
  );
};
