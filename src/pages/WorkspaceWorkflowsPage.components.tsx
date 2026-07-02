import React from 'react';
import { Button } from '@/components/common/Button';
import { CloseButton, TextInput } from '@/components/common/ComponentVocabulary';
import { Dialog } from '@/components/common/Dialog';
import { PageSearchInput } from '@/components/common/PageSearchInput';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ICONS } from '@/constants';
import { appendWorkflowSearchTag, type WorkflowAgentReference, type WorkflowDefinition, type WorkflowTab } from '@/pages/workflows/workflowModel';
import {
  titleFromInputName,
  workflowStatusTone
} from '@/pages/workflows/workflowPageHelpers';
import { formatUserDateTime } from '@/utils/dateTime';

function formatWorkflowTimestamp(value: string, fallback: string): string {
  return formatUserDateTime(value, { fallback });
}

export const workflowTabIcons: Record<WorkflowTab, React.ElementType> = {
  overview: ICONS.LayoutGrid,
  agents: ICONS.Bot,
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
      <p className="type-body mt-3 max-w-2xl text-ui-text-muted">Create, launch, and audit governed workspace automations with visible agent access and approval gates.</p>
    </div>
    <div className="flex flex-col items-start gap-2 lg:items-end">
      <Button type="button" variant="secondary" size="md" className="whitespace-nowrap self-start lg:self-auto" onClick={onCreateClick} disabled={!canManageWorkflowScope} title={!canManageWorkflowScope ? 'You need manage_workflows to create workflows.' : undefined}>
        <ICONS.Plus className="h-4 w-4" aria-hidden="true" />
        Create workflow
      </Button>
      {!canManageWorkflowScope && <span className="type-caption max-w-64 font-semibold text-ui-text-muted lg:text-right">Ask a workspace manager for manage_workflows to create or edit workflow definitions.</span>}
    </div>
  </header>
);

export const WorkflowLoadFallbackNotice: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="mb-4 flex flex-col gap-3 rounded-md border border-status-warning/30 bg-status-warning-soft px-3 py-2 text-xs font-semibold text-status-warning-text sm:flex-row sm:items-center sm:justify-between">
    <span className="min-w-0 break-words [overflow-wrap:anywhere]">Using the local workflow catalog because control-plane workflows could not be loaded.</span>
    <Button type="button" variant="secondary" size="sm" onClick={onRetry} className="self-start border-status-warning/30 bg-ui-surface text-status-warning-text hover:bg-ui-bg sm:self-auto">Retry</Button>
  </div>
);

function workflowModeLabel(mode: string): string {
  if (mode === 'read_write') return 'read-write';
  if (mode === 'write_only') return 'write-only';
  return 'read-only';
}

function workflowModeTone(mode: string): 'success' | 'warning' | 'danger' {
  if (mode === 'read_write') return 'warning';
  if (mode === 'write_only') return 'danger';
  return 'success';
}

export const WorkflowModeBadge: React.FC<{ mode: string }> = ({ mode }) => (
  <StatusBadge tone={workflowModeTone(mode)}>{workflowModeLabel(mode)}</StatusBadge>
);

export const WorkflowLibraryList: React.FC<{
  className?: string;
  query: string; setQuery: React.Dispatch<React.SetStateAction<string>>;
  workflowSearchTags: string[]; workflows: WorkflowDefinition[]; visibleWorkflows: WorkflowDefinition[];
  selectedWorkflow?: WorkflowDefinition;
  setSelectedWorkflowId: React.Dispatch<React.SetStateAction<string>>; setActiveTab: React.Dispatch<React.SetStateAction<WorkflowTab>>;
}> = ({ className = '', query, setQuery, workflowSearchTags, workflows, visibleWorkflows, selectedWorkflow, setSelectedWorkflowId, setActiveTab }) => (
  <section aria-label="Workflow library" className={`min-w-0 w-full max-w-full space-y-3 lg:sticky lg:top-6 ${className}`.trim()}>
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
        <button key={workflow.id} type="button" aria-current={workflow.id === selectedWorkflow?.id ? 'true' : undefined} aria-pressed={workflow.id === selectedWorkflow?.id} aria-label={`Select workflow ${workflow.name}${workflow.id === selectedWorkflow?.id ? ', selected' : ''}`} onClick={() => { setSelectedWorkflowId(workflow.id); setActiveTab('overview'); }} className={`w-full rounded-lg border px-3 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${workflow.id === selectedWorkflow?.id ? 'border-accent/40 bg-accent-soft/45 ring-1 ring-accent/10' : 'border-ui-border bg-ui-surface hover:bg-ui-bg'}`}>
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
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{workflow.agents[0]?.name || workflow.orchestrator.name}</span>
          </span>
          <span aria-hidden="true" className="text-ui-text-muted">·</span>
          <span className="text-ui-text-muted">{pluralize(workflow.agents.length, 'agent')}</span>
          <span aria-hidden="true" className="text-ui-text-muted">·</span>
          <span className="text-ui-text-muted">{pluralize(workflow.allowedTools.length, 'tool')}</span>
        </span>
        </button>
      ))}
    </div>
    {visibleWorkflows.length === 0 && (
      <div className="rounded-lg border border-ui-border bg-ui-surface p-6">
        <div className="text-sm font-semibold text-ui-text">No workflows match this search.</div>
        <p className="type-caption mt-1 text-ui-text-muted">Clear the search to return to the full workflow library.</p>
        {query.trim() && (
          <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={() => setQuery('')}>
            Clear search
          </Button>
        )}
      </div>
    )}
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
            <p className="type-caption mt-0.5 font-semibold text-ui-text-muted">This action cannot be undone.</p>
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
          <div role="alert" aria-live="assertive" className="type-caption rounded-lg border border-status-danger/25 bg-status-danger-soft px-3 py-2 text-status-danger-text">
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

export const WorkflowTabPanel: React.FC<{
  tab: WorkflowTab;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ tab, title, description, actions, children }) => (
  <section id={`workflow-section-${tab}-panel`} role="tabpanel" aria-labelledby={`workflow-section-${tab}-tab`} tabIndex={0} className="space-y-5 px-1 py-1">
    <div className="flex flex-col gap-4 border-b border-ui-border pb-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1">
        <h3 className="type-panel-title">{title}</h3>
        {description && <p className="type-caption mt-1 w-full max-w-none text-ui-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
    <div className="space-y-5">{children}</div>
  </section>
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
  agents: WorkflowAgentReference[];
  labelForAgent?: string | ((agent: WorkflowAgentReference) => string);
}> = ({ className = '', agents, labelForAgent = 'Selected' }) => {
  const rows = agents.map((agent) => ({
    agent,
    label: typeof labelForAgent === 'function' ? labelForAgent(agent) : labelForAgent
  }));
  if (rows.length === 0) {
    return <div className={`${className} py-3 text-sm font-medium text-ui-text-muted`}>No workflow agents selected.</div>;
  }
  return (
    <div className={`${className} divide-y divide-ui-border`}>
      {rows.map(({ agent, label }) => <AgentAssignmentRow key={`${agent.agentId}:${label}`} agent={agent} label={label} />)}
    </div>
  );
};
const AgentAssignmentRow: React.FC<{ agent: WorkflowAgentReference; label: string }> = ({ agent, label }) => (
  <div className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[2.25rem_1fr_auto] sm:items-center">
    <div className="flex h-9 w-9 items-center justify-center rounded-md border border-ui-border bg-ui-bg text-ui-text-muted">
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
  <div className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
    <dt>
      <span className="type-row-title block">{label}</span>
      <span className="type-caption mt-1 block max-w-56 text-ui-text-muted">{description}</span>
    </dt>
    <dd className="min-w-0">
      {values.length > 0 ? (
        <ul className="grid gap-1.5">
          {values.map((value) => (
            <li key={value} className={technical ? 'break-words font-mono text-sm leading-6 text-ui-text [overflow-wrap:anywhere]' : 'break-words text-sm font-medium leading-6 text-ui-text [overflow-wrap:anywhere]'}>
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
