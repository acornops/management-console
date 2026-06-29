import React from 'react';
import { Button } from '@/components/common/Button';
import { Select, SelectOption } from '@/components/common/Select';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formInputClassName, formTextareaClassName } from '@/components/common/formControlStyles';
import { ICONS } from '@/constants';
import type { WorkflowOptionsCatalog } from '@/services/control-plane/workflowApi';
import type { WorkflowAgentAssignment, WorkflowDefinition, WorkflowStep, WorkflowTab } from '@/pages/workflows/workflowModel';
import {
  createWorkflowDraft,
  titleFromInputName,
  type CreateWorkflowDraft
} from '@/pages/workflows/workflowPageHelpers';

export type CreateWorkflowStep = 1 | 2 | 3;

const createWorkflowSteps: Array<{ step: CreateWorkflowStep; stepLabel: string; title: string; summary: string }> = [
  { step: 1, stepLabel: 'Step 1', title: 'Identity', summary: 'Name and prompt' },
  { step: 2, stepLabel: 'Step 2', title: 'Capabilities', summary: 'Agent scope' },
  { step: 3, stepLabel: 'Step 3', title: 'Review', summary: 'Confirm run shape' }
];

export const workflowTabIcons: Record<WorkflowTab, React.ElementType> = {
  overview: ICONS.LayoutGrid,
  agents: ICONS.Bot,
  targets: ICONS.Globe,
  capabilities: ICONS.Shield,
  runs: ICONS.Activity,
  settings: ICONS.Settings
};

const createWorkflowInputClass = formInputClassName('mt-2');
const createWorkflowTextareaClass = formTextareaClassName('mt-2 min-h-36');

function pluralize(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

export const WorkflowCreateDrawer: React.FC<{
  createWorkflowStep: CreateWorkflowStep;
  setCreateWorkflowStep: React.Dispatch<React.SetStateAction<CreateWorkflowStep>>;
  createDraft: CreateWorkflowDraft;
  setCreateDraft: React.Dispatch<React.SetStateAction<CreateWorkflowDraft>>;
  createError: string;
  creatingWorkflow: boolean;
  canManageWorkflowScope: boolean;
  workflowOptions: WorkflowOptionsCatalog;
  onClose: () => void;
  onCreate: () => void;
}> = ({
  createWorkflowStep,
  setCreateWorkflowStep,
  createDraft,
  setCreateDraft,
  createError,
  creatingWorkflow,
  canManageWorkflowScope,
  workflowOptions,
  onClose,
  onCreate
}) => {
  const close = () => {
    onClose();
    setCreateWorkflowStep(1);
  };

  const handleWorkflowCreateDrawerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') close();
  };

  const primaryAgentOptions: Array<SelectOption<string>> = [
    { value: '', label: 'Choose an agent after creation' },
    ...workflowOptions.agents.map((agent) => ({ value: agent.value, label: agent.label }))
  ];
  const createChecklist = [
    createDraft.name.trim() ? 'Ready: workflow name' : 'Missing: workflow name',
    createDraft.primaryAgentId ? 'Ready: primary agent selected' : 'Optional: primary agent can be assigned after save',
    createDraft.starterPrompt.trim() ? 'Ready: starter prompt customized' : 'Default: starter prompt will use the workflow name'
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onKeyDown={handleWorkflowCreateDrawerKeyDown}>
      <button type="button" aria-label="Close create workflow drawer" className="absolute inset-0 bg-ui-text/20" onClick={close} />
      <aside role="dialog" aria-modal="true" aria-labelledby="create-workflow-title" aria-describedby="create-workflow-description" className="relative flex h-full w-full max-w-2xl flex-col border-l border-ui-border bg-ui-surface shadow-2xl">
        <div className="border-b border-ui-border bg-ui-bg px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="type-micro-label text-ui-text-muted">Guided setup</p>
              <h2 id="create-workflow-title" className="mt-1 type-section-title">Create workflow</h2>
              <p id="create-workflow-description" className="type-caption mt-2 text-ui-text-muted">Start with the operating path. Capability details can stay empty and be refined after save.</p>
            </div>
            <Button type="button" variant="tertiary" size="sm" onClick={close}>
              <ICONS.X className="h-4 w-4" />
              Close
            </Button>
          </div>
          <ol aria-label="Create workflow steps" className="mt-5 grid gap-2 sm:grid-cols-3">
            {createWorkflowSteps.map((item) => (
              <li key={item.step}>
                <button
                  type="button"
                  onClick={() => setCreateWorkflowStep(item.step)}
                  className={`w-full rounded-md border px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${createWorkflowStep === item.step ? 'border-accent/45 bg-accent-soft/55 text-ui-text' : 'border-ui-border bg-ui-surface text-ui-text-muted hover:bg-ui-bg'}`}
                >
                  <span className="type-micro-label block">{item.stepLabel}</span>
                  <span className="mt-1 block text-sm font-semibold">{item.title}</span>
                  <span className="type-caption mt-0.5 block">{item.summary}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
          {!canManageWorkflowScope && <div className="mb-4 rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-xs font-semibold text-ui-text-muted">You need manage_workflows to create workflows.</div>}
          {createError && <div className="mb-4 rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">{createError}</div>}

          <section className="mb-5 rounded-md border border-ui-border bg-ui-bg px-3 py-3">
            <h3 className="type-micro-label text-ui-text">Pre-save checklist</h3>
            <ul className="mt-3 grid gap-2">
              {createChecklist.map((item) => (
                <li key={item} className="text-xs font-semibold text-ui-text-muted">{item}</li>
              ))}
            </ul>
          </section>

          {createWorkflowStep === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="type-panel-title">Identity</h3>
                <p className="type-caption mt-1 text-ui-text-muted">Describe the workflow as an operator would recognize it in the library.</p>
              </div>
              <label className="block">
                <span className="type-micro-label">Name</span>
                <input value={createDraft.name} onChange={(event) => setCreateDraft((draft) => ({ ...draft, name: event.target.value }))} className={createWorkflowInputClass} />
              </label>
              <label className="block">
                <span className="type-micro-label">Description</span>
                <input value={createDraft.description} onChange={(event) => setCreateDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder="Example: Prepare an incident report from selected sessions" className={createWorkflowInputClass} />
              </label>
              <label className="block">
                <span className="type-micro-label">Starting prompt</span>
                <textarea value={createDraft.starterPrompt} onChange={(event) => setCreateDraft((draft) => ({ ...draft, starterPrompt: event.target.value }))} placeholder="Default message copied into each new run" className={createWorkflowTextareaClass} />
              </label>
            </div>
          )}

          {createWorkflowStep === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="type-panel-title">Capabilities</h3>
                <p className="type-caption mt-1 text-ui-text-muted">Choose the reusable agent that owns the base instructions and access, then narrow the workflow scope only when needed.</p>
              </div>
              <label className="block rounded-md border border-ui-border bg-ui-bg p-3">
                <span className="type-micro-label">Primary agent</span>
                <Select<string>
                  value={createDraft.primaryAgentId}
                  options={primaryAgentOptions}
                  onChange={(primaryAgentId) => setCreateDraft((draft) => ({ ...draft, primaryAgentId }))}
                  className="mt-2"
                  ariaLabel="Primary agent"
                />
                <span className="type-caption mt-2 block text-ui-text-muted">Custom agents created from the Agents page appear here once the control plane returns them in workflow options.</span>
              </label>
              <details className="rounded-md border border-ui-border bg-ui-bg px-3 py-2">
                <summary className="cursor-pointer text-sm font-semibold text-ui-text hover:text-accent-strong">Advanced scope</summary>
                <div className="mt-4 grid gap-4">
                  <label className="block">
                    <span className="type-micro-label">MCP servers</span>
                    <textarea value={createDraft.enabledMcpServers} onChange={(event) => setCreateDraft((draft) => ({ ...draft, enabledMcpServers: event.target.value }))} placeholder="One server id per line" className={createWorkflowTextareaClass} />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="type-micro-label">Skills</span>
                      <textarea value={createDraft.enabledSkills} onChange={(event) => setCreateDraft((draft) => ({ ...draft, enabledSkills: event.target.value }))} placeholder="One skill id per line" className={createWorkflowTextareaClass} />
                    </label>
                    <label className="block">
                      <span className="type-micro-label">Tools</span>
                      <textarea value={createDraft.allowedTools} onChange={(event) => setCreateDraft((draft) => ({ ...draft, allowedTools: event.target.value }))} placeholder="One tool id per line" className={createWorkflowTextareaClass} />
                    </label>
                  </div>
                </div>
              </details>
            </div>
          )}

          {createWorkflowStep === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="type-panel-title">Review</h3>
                <p className="type-caption mt-1 text-ui-text-muted">This creates a draft read-only workflow with one starter step. Agent assignment and gates can be refined next.</p>
              </div>
              <dl className="divide-y divide-ui-border rounded-md border border-ui-border bg-ui-bg">
                <WorkflowCreateReviewRow label="Name" value={createDraft.name || 'Unnamed workflow'} />
                <WorkflowCreateReviewRow label="Description" value={createDraft.description || 'Workspace automation configured from the console.'} />
                <WorkflowCreateReviewRow label="Primary agent" value={workflowOptions.agents.find((agent) => agent.value === createDraft.primaryAgentId)?.label || createDraft.primaryAgentId || 'Choose after creation'} />
                <WorkflowCreateReviewRow label="Mode" value="Read only" />
                <WorkflowCreateReviewRow label="MCP servers" value={createDraft.enabledMcpServers.trim() || 'None'} />
                <WorkflowCreateReviewRow label="Skills" value={createDraft.enabledSkills.trim() || 'None'} />
                <WorkflowCreateReviewRow label="Tools" value={createDraft.allowedTools.trim() || 'None'} />
              </dl>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-ui-border bg-ui-bg px-5 py-4">
          <Button type="button" variant="tertiary" size="sm" onClick={() => { setCreateDraft(createWorkflowDraft()); setCreateWorkflowStep(1); }}>Reset</Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setCreateWorkflowStep((step) => (step === 3 ? 2 : 1))} disabled={createWorkflowStep === 1}>Back</Button>
            {createWorkflowStep < 3 ? (
              <Button type="button" variant="primary" size="sm" onClick={() => setCreateWorkflowStep((step) => (step === 1 ? 2 : 3))} disabled={!canManageWorkflowScope || (createWorkflowStep === 1 && !createDraft.name.trim())}>Next</Button>
            ) : (
              <Button type="button" variant="primary" size="sm" onClick={onCreate} disabled={!canManageWorkflowScope || creatingWorkflow || !createDraft.name.trim()}>
                <ICONS.Plus className="h-4 w-4" />
                {creatingWorkflow ? 'Creating...' : 'Create workflow'}
              </Button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};

export const WorkflowLaunchReadiness: React.FC<{
  workflow: WorkflowDefinition;
  launchBlocker: string | null;
  selectedAccessTools: string[];
  compiled: boolean;
  onReviewCapabilities: () => void;
}> = ({ workflow, launchBlocker, selectedAccessTools, compiled, onReviewCapabilities }) => {
  const approvalCount = workflow.policy.approvals.length;
  const stepApprovalCount = workflow.steps.filter((step) => step.approvalRequired).length;
  const totalApprovalSignals = approvalCount + stepApprovalCount;
  const isReady = !launchBlocker;
  const accessSummary = `${pluralize(selectedAccessTools.length, 'tool')} ${compiled ? 'compiled for this run' : 'available from the workflow gate'}`;
  const approvalSummary = totalApprovalSignals > 0
    ? `${pluralize(totalApprovalSignals, 'approval gate')} before sensitive steps continue`
    : 'No approval gates configured';

  return (
    <section aria-label="Workflow launch readiness" className="border-b border-ui-border bg-ui-surface px-5 py-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={isReady ? 'success' : 'warning'}>{isReady ? 'Ready to launch' : 'Needs attention before launch'}</StatusBadge>
            <span className="type-caption font-semibold text-ui-text-muted">{workflow.policy.mode.replace('_', ' ')}</span>
          </div>
          <h3 className="mt-3 type-panel-title">Launch decision</h3>
          <p aria-live="polite" aria-atomic="true" className="type-caption mt-1 max-w-3xl text-ui-text-muted">
            {isReady
              ? 'This workflow can start with the current owner, message, permissions, and runtime access.'
              : `Resolve this before launch: ${launchBlocker}`}
          </p>
        </div>
        <dl className="grid min-w-0 gap-3 sm:grid-cols-2">
          <WorkflowReadinessFact label="Owner" value={workflow.primaryAgent.name} />
          <WorkflowReadinessFact label="Runtime access" value={accessSummary} />
          <WorkflowReadinessFact label="Approvals" value={approvalSummary} />
          <WorkflowReadinessFact label="Last run" value={workflow.lastRun || 'No runs yet'} />
        </dl>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-ui-border bg-ui-bg px-3 py-2">
        <span className="type-caption text-ui-text-muted">
          Review the capability gate when the tool count, target scope, or approval model changes.
        </span>
        <Button type="button" variant="tertiary" size="sm" onClick={onReviewCapabilities}>Review capability gate</Button>
      </div>
    </section>
  );
};

const WorkflowReadinessFact: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="type-micro-label text-ui-text-muted">{label}</dt>
    <dd className="mt-1 min-w-0 break-words text-sm font-semibold text-ui-text [overflow-wrap:anywhere]">{value}</dd>
  </div>
);

export const WorkflowTabPanel: React.FC<{
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ eyebrow, title, description, actions, children }) => (
  <section className="space-y-5 px-1 py-1">
    <div className="flex flex-col gap-4 border-b border-ui-border pb-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <p className="type-micro-label text-ui-text-muted">{eyebrow}</p>
        <h3 className="mt-1 type-panel-title">{title}</h3>
        <p className="type-caption mt-1 max-w-3xl text-ui-text-muted">{description}</p>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
    <div className="space-y-5">{children}</div>
  </section>
);

const WorkflowCreateReviewRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="grid gap-1 px-3 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
    <dt className="type-micro-label text-ui-text-muted">{label}</dt>
    <dd className="min-w-0 whitespace-pre-wrap break-words text-sm font-semibold text-ui-text [overflow-wrap:anywhere]">{value}</dd>
  </div>
);

export const WorkflowSection: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}> = ({ title, description, action, children }) => (
  <section className="min-w-0 border-t border-ui-border pt-5 first:border-t-0 first:pt-0">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h4 className="type-row-title">{title}</h4>
        {description && <p className="type-caption mt-1 max-w-2xl text-ui-text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
    {children}
  </section>
);

export const AgentAssignmentList: React.FC<{
  className?: string;
  primaryAgent?: WorkflowAgentAssignment;
  supportingAgents: WorkflowAgentAssignment[];
  supportingLabel?: string | ((agent: WorkflowAgentAssignment) => string);
}> = ({ className = '', primaryAgent, supportingAgents, supportingLabel = 'Supporting agent' }) => {
  const rows = [
    ...(primaryAgent ? [{ agent: primaryAgent, label: 'Primary agent' }] : []),
    ...supportingAgents.map((agent) => ({
      agent,
      label: typeof supportingLabel === 'function' ? supportingLabel(agent) : supportingLabel
    }))
  ];

  if (rows.length === 0) {
    return <div className={`${className} py-3 text-sm font-medium text-ui-text-muted`}>No supporting agents assigned.</div>;
  }

  return (
    <div className={`${className} divide-y divide-ui-border`}>
      {rows.map(({ agent, label }) => <AgentAssignmentRow key={`${agent.agentId}:${label}`} agent={agent} label={label} />)}
    </div>
  );
};

export const WorkflowStepPath: React.FC<{
  steps: WorkflowStep[];
  primaryAgent: WorkflowAgentAssignment;
  supportingAgents: WorkflowAgentAssignment[];
}> = ({ steps, primaryAgent, supportingAgents }) => {
  const agentsById = new Map([
    [primaryAgent.agentId, primaryAgent],
    ...supportingAgents.map((agent) => [agent.agentId, agent] as const)
  ]);

  if (steps.length === 0) {
    return <div className="mt-4 py-3 text-sm font-medium text-ui-text-muted">No workflow steps configured.</div>;
  }

  return (
    <ol className="mt-4 divide-y divide-ui-border">
      {steps.map((step, index) => {
        const assignedAgents = step.assignedAgentIds?.map((agentId) => agentsById.get(agentId)).filter((agent): agent is WorkflowAgentAssignment => Boolean(agent)) || [primaryAgent];
        return (
          <li key={step.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[2.5rem_minmax(0,1fr)]">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-ui-border bg-ui-bg text-xs font-bold text-ui-text-muted">
              {index + 1}
            </div>
            <div className="min-w-0">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h4 className="type-row-title">{step.title}</h4>
                  <p className="type-caption mt-1 max-w-3xl text-ui-text-muted">{step.prompt}</p>
                </div>
                <span className="shrink-0 rounded-md border border-ui-border bg-ui-bg px-2.5 py-1 text-xs font-bold text-ui-text-muted">
                  {step.approvalRequired ? 'Approval gate' : 'No approval gate'}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {assignedAgents.map((agent) => (
                  <span key={agent.agentId} className="inline-flex min-h-7 items-center gap-1.5 rounded-md bg-accent-soft px-2.5 text-xs font-bold text-accent-strong">
                    <ICONS.Bot className="h-3.5 w-3.5" />
                    {agent.name}
                  </span>
                ))}
                <span className="inline-flex min-h-7 items-center rounded-md bg-ui-surface-strong px-2.5 text-xs font-bold text-ui-text-muted">
                  {step.allowedTools.length} tools
                </span>
                <span className="inline-flex min-h-7 items-center rounded-md bg-ui-surface-strong px-2.5 text-xs font-bold text-ui-text-muted">
                  {step.contextGrants.length} context grants
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

const AgentAssignmentRow: React.FC<{ agent: WorkflowAgentAssignment; label: string }> = ({ agent, label }) => (
  <div className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[2.25rem_1fr_auto] sm:items-center">
    <div className="flex h-9 w-9 items-center justify-center rounded-md border border-accent/20 bg-accent-soft text-accent-strong">
      <ICONS.Bot className="h-4 w-4" />
    </div>
    <div className="min-w-0">
      <div className="text-sm font-semibold text-ui-text">{agent.name}</div>
      <div className="type-caption mt-1 truncate text-ui-text-muted">{agent.role}</div>
    </div>
    <div className="flex items-start justify-start sm:justify-end">
      <span className="rounded-md border border-ui-border bg-ui-surface px-2.5 py-1 text-xs font-bold text-ui-text-muted">{label}</span>
    </div>
  </div>
);

export const WorkflowScopeRow: React.FC<{ label: string; values: string[]; emptyLabel: string }> = ({ label, values, emptyLabel }) => (
  <div className="grid gap-2 py-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6">
    <dt className="type-micro-label pt-0.5 text-ui-text-muted">{label}</dt>
    <dd className="min-w-0">
      {values.length > 0 ? (
        <ul className="flex flex-wrap gap-x-3 gap-y-2">
          {values.map((value) => (
            <li key={value} className="inline-flex min-h-7 items-center rounded-sm bg-ui-surface-strong px-2.5 text-sm font-semibold text-ui-text">
              {formatWorkflowScopeValue(value)}
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-sm font-medium text-ui-text-muted">{emptyLabel}</span>
      )}
    </dd>
  </div>
);

function formatWorkflowScopeValue(value: string): string {
  return titleFromInputName(value).replace(/\bMcp\b/g, 'MCP');
}

export const CapabilityReviewRow: React.FC<{
  label: string;
  description: string;
  values: string[];
  emptyLabel: string;
  technical?: boolean;
}> = ({ label, description, values, emptyLabel, technical = false }) => (
  <div className="grid gap-3 py-4 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-8">
    <dt>
      <span className="block text-sm font-semibold text-ui-text">{label}</span>
      <span className="type-caption mt-1 block max-w-56 text-ui-text-muted">{description}</span>
    </dt>
    <dd className="min-w-0">
      {values.length > 0 ? (
        <ul className="grid gap-1.5">
          {values.map((value) => (
            <li key={value} className={technical ? 'font-mono text-sm text-ui-text' : 'text-sm font-semibold text-ui-text'}>
              {technical ? value : formatWorkflowScopeValue(value)}
            </li>
          ))}
        </ul>
      ) : (
        <span className="text-sm font-medium text-ui-text-muted">{emptyLabel}</span>
      )}
    </dd>
  </div>
);
