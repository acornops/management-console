import React from 'react';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { CloseButton, Textarea, TextInput } from '@/components/common/ComponentVocabulary';
import { Dialog } from '@/components/common/Dialog';
import { ModalStepIndicator } from '@/components/common/ModalStepIndicator';
import { PageSearchInput } from '@/components/common/PageSearchInput';
import { RightSidePanel } from '@/components/common/RightSidePanel';
import { Select, SelectOption } from '@/components/common/Select';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ICONS } from '@/constants';
import type { WorkflowOptionsCatalog } from '@/services/control-plane/workflowApi';
import { appendWorkflowSearchTag, type WorkflowAgentAssignment, type WorkflowDefinition, type WorkflowStep, type WorkflowTab } from '@/pages/workflows/workflowModel';
import {
  createWorkflowDraft,
  titleFromInputName,
  workflowStatusTone,
  type CreateWorkflowDraft
} from '@/pages/workflows/workflowPageHelpers';
import { formatUserDateTime } from '@/utils/dateTime';

export type CreateWorkflowStep = 1 | 2 | 3;

const createWorkflowSteps: Array<{ id: `${CreateWorkflowStep}`; label: string }> = [
  { id: '1', label: 'Identity' },
  { id: '2', label: 'Capabilities' },
  { id: '3', label: 'Review' }
];
function formatWorkflowTimestamp(value: string, fallback: string): string {
  return formatUserDateTime(value, { fallback });
}

export const workflowTabIcons: Record<WorkflowTab, React.ElementType> = {
  overview: ICONS.LayoutGrid,
  agents: ICONS.Bot,
  targets: ICONS.Globe,
  capabilities: ICONS.Shield,
  runs: ICONS.Activity,
  settings: ICONS.Settings
};

export const WorkflowRouteHeader: React.FC<{
  canManageWorkflowScope: boolean;
  onCreateClick: () => void;
}> = ({ canManageWorkflowScope, onCreateClick }) => (
  <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    <div>
      <h1 className="type-route-title">Workflows</h1>
      <p className="type-body mt-3 max-w-2xl text-ui-text-muted">Create, launch, and audit governed workspace automations.</p>
    </div>
    <Button type="button" variant="secondary" size="md" className="whitespace-nowrap self-start lg:self-auto" onClick={onCreateClick} disabled={!canManageWorkflowScope}>
      <ICONS.Plus className="h-4 w-4" aria-hidden="true" />
      Create workflow
    </Button>
  </header>
);

export const WorkflowLoadFallbackNotice: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="mb-4 flex flex-col gap-3 rounded-md border border-status-warning/30 bg-status-warning-soft px-3 py-2 text-xs font-semibold text-status-warning-text sm:flex-row sm:items-center sm:justify-between">
    <span className="min-w-0 break-words [overflow-wrap:anywhere]">Using the local workflow catalog because control-plane workflows could not be loaded.</span>
    <Button type="button" variant="secondary" size="sm" onClick={onRetry} className="self-start border-status-warning/30 bg-ui-surface text-status-warning-text hover:bg-ui-bg sm:self-auto">Retry</Button>
  </div>
);

export const WorkflowLibraryList: React.FC<{
  query: string; setQuery: React.Dispatch<React.SetStateAction<string>>;
  workflowSearchTags: string[]; workflows: WorkflowDefinition[]; visibleWorkflows: WorkflowDefinition[];
  selectedWorkflow?: WorkflowDefinition;
  setSelectedWorkflowId: React.Dispatch<React.SetStateAction<string>>; setActiveTab: React.Dispatch<React.SetStateAction<WorkflowTab>>;
}> = ({ query, setQuery, workflowSearchTags, workflows, visibleWorkflows, selectedWorkflow, setSelectedWorkflowId, setActiveTab }) => (
  <section aria-label="Workflow library" className="min-w-0 space-y-3 lg:sticky lg:top-6" style={{ maxWidth: 'calc(100vw - 2rem)' }}>
    <div className="space-y-2">
      <div className="flex flex-col gap-1 px-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <h2 className="type-row-title text-ui-text">Workflow library</h2>
        <div className="type-caption font-semibold text-ui-text-muted">{visibleWorkflows.length} of {workflows.length} workflows</div>
      </div>
      <PageSearchInput
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search workflows, agents, tools, tags"
        aria-label="Search workflow library"
        className="w-full lg:w-full"
      />
    </div>
    {selectedWorkflow && (
      <div className="rounded-md border border-ui-border bg-ui-surface px-3 py-2 text-xs font-semibold text-ui-text-muted lg:hidden">
        <span className="block text-ui-text">Selected workflow: {selectedWorkflow.name}</span>
      </div>
    )}
    {workflowSearchTags.length > 0 && query.trim() && (
      <div className="flex flex-wrap gap-2 px-1">
        {workflowSearchTags.slice(0, 8).map((tag) => (
          <button key={tag} type="button" onClick={() => setQuery((current) => appendWorkflowSearchTag(current, tag))} className="min-h-11 rounded-md border border-ui-border bg-ui-surface px-2.5 py-1.5 text-xs font-bold text-ui-text-muted hover:text-ui-text sm:min-h-8">
            {tag}
          </button>
        ))}
      </div>
    )}
    <div className="grid gap-3">
      {visibleWorkflows.map((workflow) => (
        <button key={workflow.id} type="button" onClick={() => { setSelectedWorkflowId(workflow.id); setActiveTab('overview'); }} className={`w-full rounded-lg border px-3 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${workflow.id === selectedWorkflow?.id ? 'border-accent/40 bg-accent-soft/45 ring-1 ring-accent/10' : 'border-ui-border bg-ui-surface hover:bg-ui-bg'}`}>
        <span className="grid gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <span className="min-w-0">
            <span className="type-row-title block break-words text-ui-text [overflow-wrap:anywhere]">{workflow.name}</span>
            <span className="type-caption mt-1 block whitespace-normal leading-5 text-ui-text-muted">{workflow.description}</span>
          </span>
          <span className="shrink-0 self-start">
            <StatusBadge tone={workflowStatusTone(workflow.status)}>{workflow.status}</StatusBadge>
          </span>
        </span>
        <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-ui-border/70 pt-2.5 text-xs font-semibold text-ui-text-muted">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <ICONS.Bot className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{workflow.primaryAgent.name}</span>
          </span>
          <span className="text-ui-text-muted">{workflow.supportingAgents.length} agents</span>
          <span className="text-ui-text-muted">{workflow.allowedTools.length} tools</span>
        </span>
        </button>
      ))}
    </div>
    {visibleWorkflows.length === 0 && <div className="rounded-lg border border-ui-border bg-ui-surface p-6 text-sm font-semibold text-ui-text-muted">No workflows match this search.</div>}
  </section>
);

export const WorkflowDeleteDialog: React.FC<{
  deleteTargetWorkflow?: WorkflowDefinition;
  deleteWorkflowConfirmation: string;
  deleteWorkflowError: string;
  deletingWorkflowId: string;
  onClose: () => void;
  onDelete: (workflow: WorkflowDefinition) => void;
  setDeleteWorkflowConfirmation: React.Dispatch<React.SetStateAction<string>>;
}> = ({
  deleteTargetWorkflow,
  deleteWorkflowConfirmation,
  deleteWorkflowError,
  deletingWorkflowId,
  onClose,
  onDelete,
  setDeleteWorkflowConfirmation
}) => {
  if (!deleteTargetWorkflow) return null;

  return (
    <Dialog
      titleId="delete-workflow-title"
      closeDisabled={deletingWorkflowId === deleteTargetWorkflow.id}
      className="w-full max-w-lg overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
      onClose={onClose}
    >
      <div className="flex items-center justify-between border-b border-ui-border bg-ui-bg px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-status-danger-soft text-status-danger-text">
            <ICONS.Trash2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h3 id="delete-workflow-title" className="type-row-title text-ui-text">Delete workflow</h3>
            <p className="mt-0.5 text-[11px] font-semibold text-ui-text-muted">This action cannot be undone.</p>
          </div>
        </div>
        <CloseButton
          onClick={onClose}
          disabled={deletingWorkflowId === deleteTargetWorkflow.id}
          label="Close delete workflow dialog"
        />
      </div>
      <div className="space-y-4 px-5 py-5">
        <div className="rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-sm font-medium leading-6 text-status-danger-text">
          Deleting {deleteTargetWorkflow.name} removes the workflow definition for future runs. Existing run records and audit events are retained.
        </div>
        <div>
          <label htmlFor="delete-workflow-confirmation-input" className="mb-1.5 block px-1 text-xs font-bold text-ui-text-muted">
            Type the workflow name to confirm deletion.
          </label>
          <TextInput
            id="delete-workflow-confirmation-input"
            value={deleteWorkflowConfirmation}
            onChange={(event) => setDeleteWorkflowConfirmation(event.target.value)}
            disabled={deletingWorkflowId === deleteTargetWorkflow.id}
            autoComplete="off"
            spellCheck={false}
            className="focus:border-status-danger/45 focus:ring-status-danger/20"
          />
        </div>
        {deleteWorkflowError && (
          <div className="type-caption rounded-lg border border-status-danger/25 bg-status-danger-soft px-3 py-2 text-status-danger-text">
            {deleteWorkflowError}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3 border-t border-ui-border bg-ui-bg px-5 py-4">
        <Button variant="secondary" size="sm" onClick={onClose} disabled={deletingWorkflowId === deleteTargetWorkflow.id}>Cancel</Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => onDelete(deleteTargetWorkflow)}
          disabled={deletingWorkflowId === deleteTargetWorkflow.id || deleteWorkflowConfirmation !== deleteTargetWorkflow.name}
        >
          {deletingWorkflowId === deleteTargetWorkflow.id ? 'Deleting...' : 'Delete workflow'}
        </Button>
      </div>
    </Dialog>
  );
};

function pluralize(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

const RequiredFieldMarker: React.FC = () => (
  <span className="text-status-danger-text" aria-hidden="true">*</span>
);
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
  const [stepNavigationError, setStepNavigationError] = React.useState('');
  const close = () => { onClose(); setCreateWorkflowStep(1); setStepNavigationError(''); };
  const primaryAgentOptions: Array<SelectOption<string>> = [
    { value: '', label: 'Choose an agent after creation' },
    ...workflowOptions.agents.map((agent) => ({ value: agent.value, label: agent.label }))
  ];
  const supportingAgentOptions = workflowOptions.agents.filter((agent) => agent.value !== createDraft.primaryAgentId);
  const supportingAgentLabels = workflowOptions.agents
    .filter((agent) => createDraft.supportingAgentIds.includes(agent.value))
    .map((agent) => agent.label);
  const goToCreateWorkflowStep = (nextStep: CreateWorkflowStep) => {
    if (nextStep > 1 && !createDraft.name.trim()) {
      setCreateWorkflowStep(1);
      setStepNavigationError('Step 1 is not done. Enter a workflow name before continuing.');
      return;
    }
    setStepNavigationError('');
    setCreateWorkflowStep(nextStep);
  };
  return (
    <RightSidePanel
      isOpen
      onClose={close}
      titleId="create-workflow-title"
      descriptionId="create-workflow-description"
      className="max-w-2xl"
    >
        <div className="border-b border-ui-border bg-ui-bg px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="create-workflow-title" className="type-section-title">Create workflow</h2>
              <p id="create-workflow-description" className="type-caption mt-2 text-ui-text-muted">Start with the operating path. Capability details can stay empty and be refined after save.</p>
            </div>
            <CloseButton onClick={close} label="Close create workflow drawer" />
          </div>
          <div aria-label="Create workflow steps">
            <ModalStepIndicator
              steps={createWorkflowSteps}
              currentStepId={`${createWorkflowStep}`}
              onStepSelect={(stepId) => goToCreateWorkflowStep(Number(stepId) as CreateWorkflowStep)}
              className="mt-4"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
          {!canManageWorkflowScope && <div className="mb-4 rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-xs font-semibold text-ui-text-muted">You need manage_workflows to create workflows.</div>}
          {createError && <div className="mb-4 rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-xs font-semibold text-status-danger-text">{createError}</div>}
          {stepNavigationError && <div className="mb-4 rounded-md border border-status-warning/30 bg-status-warning-soft p-3 text-xs font-semibold text-status-warning-text" role="status" aria-live="polite">{stepNavigationError}</div>}

          {createWorkflowStep === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="type-panel-title">Identity</h3>
                <p className="type-caption mt-1 text-ui-text-muted">Describe the workflow as an operator would recognize it in the library.</p>
              </div>
              <label htmlFor="create-workflow-name-input" className="block">
                <span className="type-micro-label">Name <RequiredFieldMarker /></span>
                <TextInput
                  id="create-workflow-name-input"
                  value={createDraft.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    setCreateDraft((draft) => ({ ...draft, name }));
                    if (name.trim()) setStepNavigationError('');
                  }}
                  className="mt-2"
                  required
                />
              </label>
              <label htmlFor="create-workflow-description-input" className="block">
                <span className="type-micro-label">Description</span>
                <TextInput id="create-workflow-description-input" value={createDraft.description} onChange={(event) => setCreateDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder="Example: Prepare an incident report from selected sessions" className="mt-2" />
              </label>
              <label htmlFor="create-workflow-starter-prompt-input" className="block">
                <span className="type-micro-label">Starting prompt</span>
                <Textarea id="create-workflow-starter-prompt-input" value={createDraft.starterPrompt} onChange={(event) => setCreateDraft((draft) => ({ ...draft, starterPrompt: event.target.value }))} placeholder="Default message copied into each new run" className="mt-2 min-h-36" />
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
                  onChange={(primaryAgentId) => setCreateDraft((draft) => ({
                    ...draft,
                    primaryAgentId,
                    supportingAgentIds: draft.supportingAgentIds.filter((agentId) => agentId !== primaryAgentId)
                  }))}
                  className="mt-2"
                  ariaLabel="Primary agent"
                />
                <span className="type-caption mt-2 block text-ui-text-muted">Custom agents created from the Agents page appear here once the control plane returns them in workflow options.</span>
              </label>
              <fieldset className="block rounded-md border border-ui-border bg-ui-bg p-3">
                <legend className="type-micro-label px-1">Supporting agents</legend>
                <div className="mt-2 grid gap-2">
                  {supportingAgentOptions.length > 0 ? supportingAgentOptions.map((agent) => (
                    <label key={agent.value} className="flex min-h-10 items-center gap-3 rounded-md border border-ui-border bg-ui-surface px-3 py-2 text-sm font-semibold text-ui-text">
                      <Checkbox
                        checked={createDraft.supportingAgentIds.includes(agent.value)}
                        onChange={(event) => setCreateDraft((draft) => ({
                          ...draft,
                          supportingAgentIds: event.target.checked
                            ? [...draft.supportingAgentIds, agent.value]
                            : draft.supportingAgentIds.filter((agentId) => agentId !== agent.value)
                        }))}
                      />
                      <span className="min-w-0 break-words [overflow-wrap:anywhere]">{agent.label}</span>
                    </label>
                  )) : (
                    <span className="type-caption text-ui-text-muted">Choose a primary agent before adding supporting agents.</span>
                  )}
                </div>
              </fieldset>
              <details className="rounded-md border border-ui-border bg-ui-bg px-3 py-2">
                <summary className="cursor-pointer text-sm font-semibold text-ui-text hover:text-accent-strong">Advanced scope</summary>
                <div className="mt-4 grid gap-4">
                  <label className="block">
                    <span className="type-micro-label">MCP servers</span>
                    <Textarea value={createDraft.enabledMcpServers} onChange={(event) => setCreateDraft((draft) => ({ ...draft, enabledMcpServers: event.target.value }))} placeholder="One server id per line" className="mt-2 min-h-36" />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="type-micro-label">Skills</span>
                      <Textarea value={createDraft.enabledSkills} onChange={(event) => setCreateDraft((draft) => ({ ...draft, enabledSkills: event.target.value }))} placeholder="One skill id per line" className="mt-2 min-h-36" />
                    </label>
                    <label className="block">
                      <span className="type-micro-label">Tools</span>
                      <Textarea value={createDraft.allowedTools} onChange={(event) => setCreateDraft((draft) => ({ ...draft, allowedTools: event.target.value }))} placeholder="One tool id per line" className="mt-2 min-h-36" />
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
                <WorkflowCreateReviewRow label="Supporting agents" value={supportingAgentLabels.join('\n') || 'None'} />
                <WorkflowCreateReviewRow label="Mode" value="Read only" />
                <WorkflowCreateReviewRow label="MCP servers" value={createDraft.enabledMcpServers.trim() || 'None'} />
                <WorkflowCreateReviewRow label="Skills" value={createDraft.enabledSkills.trim() || 'None'} />
                <WorkflowCreateReviewRow label="Tools" value={createDraft.allowedTools.trim() || 'None'} />
              </dl>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-ui-border bg-ui-bg px-5 py-4">
          <Button type="button" variant="tertiary" size="sm" onClick={() => { setCreateDraft(createWorkflowDraft()); setCreateWorkflowStep(1); setStepNavigationError(''); }}>Reset</Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => goToCreateWorkflowStep(createWorkflowStep === 3 ? 2 : 1)} disabled={createWorkflowStep === 1}>Back</Button>
            {createWorkflowStep < 3 ? (
              <Button type="button" variant="primary" size="sm" onClick={() => goToCreateWorkflowStep(createWorkflowStep === 1 ? 2 : 3)} disabled={!canManageWorkflowScope || (createWorkflowStep === 1 && !createDraft.name.trim())}>Next</Button>
            ) : (
              <Button type="button" variant="primary" size="sm" onClick={onCreate} disabled={!canManageWorkflowScope || creatingWorkflow || !createDraft.name.trim()}>
                <ICONS.Plus className="h-4 w-4" aria-hidden="true" />
                {creatingWorkflow ? 'Creating...' : 'Create workflow'}
              </Button>
            )}
          </div>
        </div>
    </RightSidePanel>
  );
};
export const WorkflowLaunchReadiness: React.FC<{
  workflow: WorkflowDefinition;
  launchBlocker: string | null;
  selectedAccessTools: string[];
  compiled: boolean;
}> = ({ workflow, launchBlocker, selectedAccessTools, compiled }) => {
  const approvalCount = workflow.policy.approvals.length;
  const stepApprovalCount = workflow.steps.filter((step) => step.approvalRequired).length;
  const totalApprovalSignals = approvalCount + stepApprovalCount;
  const accessValue = pluralize(selectedAccessTools.length, 'tool');
  const accessSummary = `${accessValue} ${compiled ? 'compiled for this run' : 'available from the workflow gate'}`;
  const noApprovalSummary = 'No approval gates configured';
  const approvalValue = totalApprovalSignals > 0 ? pluralize(totalApprovalSignals, 'gate') : 'No gates';
  const approvalSummary = totalApprovalSignals > 0
    ? `${pluralize(totalApprovalSignals, 'approval gate')} before sensitive steps continue`
    : noApprovalSummary;
  const lastRunValue = workflow.lastRun ? formatWorkflowTimestamp(workflow.lastRun, workflow.lastRun) : 'Not run';
  const lastRunSummary = workflow.lastRun ? formatWorkflowTimestamp(workflow.lastRun, workflow.lastRun) : 'No runs yet';

  return (
    <section aria-label="Workflow launch readiness" className="border-b border-ui-border bg-ui-surface px-5 py-4">
      {launchBlocker && (
        <div className="mb-3">
          {launchBlocker && <StatusBadge tone="warning">Needs attention before launch</StatusBadge>}
          <p aria-live="polite" aria-atomic="true" className="type-caption mt-2 max-w-3xl text-ui-text-muted">Resolve this before launch: {launchBlocker}</p>
        </div>
      )}
      <dl className="grid min-w-0 gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
        <WorkflowReadinessFact icon={ICONS.User} label="Owner" value={workflow.owner} />
        <WorkflowReadinessFact icon={ICONS.Wrench} label="Runtime access" value={accessValue} detail={accessSummary} />
        <WorkflowReadinessFact icon={ICONS.Shield} label="Approvals" value={approvalValue} detail={approvalSummary} />
        <WorkflowReadinessFact icon={ICONS.Clock} label="Last run" value={lastRunValue} detail={lastRunSummary} />
      </dl>
    </section>
  );
};
const WorkflowReadinessFact: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  detail?: string;
}> = ({ icon: Icon, label, value, detail }) => (
  <div className="flex min-w-0 items-start gap-2.5" title={detail || value}>
    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-ui-border bg-ui-bg text-ui-text-muted">
      <Icon className="h-4 w-4" aria-hidden="true" />
    </div>
    <div className="min-w-0">
      <dt className="type-micro-label text-ui-text-muted">{label}</dt>
      <dd className="mt-1 min-w-0 break-words text-sm font-semibold text-ui-text [overflow-wrap:anywhere]" aria-label={detail || value}>{value}</dd>
    </div>
  </div>
);
export const WorkflowTabPanel: React.FC<{
  tab: WorkflowTab;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ tab, title, description, actions, children }) => (
  <section id={`workflow-section-${tab}-panel`} role="tabpanel" aria-labelledby={`workflow-section-${tab}-tab`} tabIndex={0} className="space-y-5 px-1 py-1">
    <div className="flex flex-col gap-4 border-b border-ui-border pb-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h3 className="type-panel-title">{title}</h3>
        {description && <p className="type-caption mt-1 max-w-3xl text-ui-text-muted">{description}</p>}
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
                  <h4 className="type-row-title break-words [overflow-wrap:anywhere]">{step.title}</h4>
                  <p className="type-caption mt-1 max-w-3xl break-words text-ui-text-muted [overflow-wrap:anywhere]">{step.prompt}</p>
                </div>
                <span className="shrink-0 rounded-md border border-ui-border bg-ui-bg px-2.5 py-1 text-xs font-bold text-ui-text-muted">
                  {step.approvalRequired ? 'Approval gate' : 'No approval gate'}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {assignedAgents.map((agent) => (
                  <span key={agent.agentId} className="inline-flex min-h-7 min-w-0 items-center gap-1.5 rounded-md bg-accent-soft px-2.5 text-xs font-bold text-accent-strong">
                    <ICONS.Bot className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 break-words [overflow-wrap:anywhere]">{agent.name}</span>
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
      <ICONS.Bot className="h-4 w-4" aria-hidden="true" />
    </div>
    <div className="min-w-0">
      <div className="break-words text-sm font-semibold text-ui-text [overflow-wrap:anywhere]">{agent.name}</div>
      <div className="type-caption mt-1 break-words text-ui-text-muted [overflow-wrap:anywhere]">{agent.role}</div>
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
            <li key={value} className="inline-flex min-h-7 min-w-0 items-center break-words rounded-sm bg-ui-surface-strong px-2.5 text-sm font-semibold text-ui-text [overflow-wrap:anywhere]">
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
            <li key={value} className={technical ? 'break-words font-mono text-sm text-ui-text [overflow-wrap:anywhere]' : 'break-words text-sm font-semibold text-ui-text [overflow-wrap:anywhere]'}>
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
