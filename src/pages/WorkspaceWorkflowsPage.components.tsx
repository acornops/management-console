import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import { CloseButton, TextInput } from '@/components/common/ComponentVocabulary';
import { CollectionState } from '@/components/common/CollectionState';
import { Dialog } from '@/components/common/Dialog';
import { DiscoveryFilterBar } from '@/components/common/DiscoveryFilterBar';
import { MasterDetailEmptyState, MasterDetailListHeader, MasterDetailLoading, MasterDetailRow, masterDetailDiscoverySpacingClass } from '@/components/common/MasterDetailLayout';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ICONS } from '@/constants';
import { McpCredentialDialog } from '@/features/catalog/McpCredentialDialog';
import { useMcpConnections } from '@/features/catalog/useMcpConnections';
import { appendWorkflowSearchTag, isSystemProvidedWorkflow, type WorkflowAgentReference, type WorkflowDefinition, type WorkflowPrimaryAction, type WorkflowTab } from '@/pages/workflows/workflowModel';
import {
  titleFromInputName,
  workflowStatusTone
} from '@/pages/workflows/workflowPageHelpers';
import { formatUserDateTime } from '@/utils/dateTime';
import type { WorkflowCapabilitiesPreview, WorkflowCapabilityToolPreview, WorkflowMcpRequirementPreview } from '@/services/control-plane/workflowApi';

function workflowProvenanceLabel(workflow: WorkflowDefinition): string {
  const version = workflow.version ? `v${workflow.version}` : '';
  return isSystemProvidedWorkflow(workflow)
    ? ['Built-in', version].filter(Boolean).join(' · ')
    : `${workflow.owner}${version ? ` · ${version}` : ''}`;
}

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

export const WorkflowLoadErrorNotice: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="mb-4 flex flex-col gap-3 rounded-md border border-status-warning/30 bg-status-warning-soft px-3 py-2 text-xs font-semibold text-status-warning-text sm:flex-row sm:items-center sm:justify-between">
    <span className="min-w-0 break-words [overflow-wrap:anywhere]">Workflows could not be loaded from the control plane.</span>
    <Button type="button" variant="secondary" size="sm" onClick={onRetry} className="self-start border-status-warning/30 bg-ui-surface text-status-warning-text hover:bg-ui-bg sm:self-auto">Retry</Button>
  </div>
);

function workflowModeLabel(mode: string): string {
  if (mode === 'read_write') return 'read-write run';
  if (mode === 'write_only') return 'write-only run';
  return 'read-only run';
}

function workflowModeTone(mode: string): 'success' | 'warning' | 'danger' {
  if (mode === 'read_write') return 'warning';
  if (mode === 'write_only') return 'danger';
  return 'success';
}

export const WorkflowModeBadge: React.FC<{ mode: string }> = ({ mode }) => (
  <StatusBadge tone={workflowModeTone(mode)}>{workflowModeLabel(mode)}</StatusBadge>
);

export const WorkflowTagsEditor: React.FC<{
  tags: string[];
  tagDraft: string;
  readOnly: boolean;
  pending: boolean;
  onTagDraftChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (tag: string) => void;
}> = ({ tags, tagDraft, readOnly, pending, onTagDraftChange, onAdd, onRemove }) => (
  <>
    <div className="mt-3 flex flex-wrap gap-2">{tags.map((tag) => (
      <span key={tag} className="inline-flex min-h-11 items-center gap-1 rounded-md border border-ui-border bg-ui-bg pl-2.5 pr-1 text-xs font-bold text-ui-text-muted sm:min-h-8">
        <span>{tag}</span>
        {!readOnly && <button type="button" aria-label={`Remove workflow tag ${tag}`} onClick={() => onRemove(tag)} disabled={pending} className="control-target rounded p-2 text-ui-text-muted transition-colors hover:bg-status-danger-soft hover:text-status-danger-text focus:outline-none focus-visible:ring-2 focus-visible:ring-status-danger/25 disabled:cursor-not-allowed disabled:opacity-50 sm:p-1">
          <ICONS.X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>}
      </span>
    ))}</div>
    {!readOnly && <div className="mt-3 flex gap-2"><TextInput value={tagDraft} onChange={(event) => onTagDraftChange(event.target.value)} placeholder="Add tag" disabled={pending} className="min-h-10 flex-1" /><Button variant="secondary" size="sm" onClick={onAdd} disabled={pending || !tagDraft.trim()}>{pending ? 'Saving...' : 'Add tag'}</Button></div>}
  </>
);

export const WorkflowLaunchActions: React.FC<{
  activating: boolean;
  canManageWorkflowScope: boolean;
  customizing: boolean;
  isWriteCapable: boolean;
  launchAcknowledged: boolean;
  launchBlocker: string | null;
  launchFields?: React.ReactNode;
  launching: boolean;
  needsLaunchAcknowledgement: boolean;
  onAcknowledgementChange: (checked: boolean) => void;
  onActivate: () => void;
  onCustomize: () => void;
  onLaunch: () => void;
  onSchedule: () => void;
  onSetup: () => void;
  primaryAction: WorkflowPrimaryAction;
  showCustomize: boolean;
  tags: string[];
}> = ({ activating, canManageWorkflowScope, customizing, isWriteCapable, launchAcknowledged, launchBlocker, launchFields, launching, needsLaunchAcknowledgement, onAcknowledgementChange, onActivate, onCustomize, onLaunch, onSchedule, onSetup, primaryAction, showCustomize, tags }) => {
  const { t } = useTranslation();
  const visibleLaunchBlocker = primaryAction === 'launch' ? launchBlocker : null;

  return <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
    <div className="min-w-0">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Selected workflow tags">
          {tags.map((tag) => (
            <span key={tag} className="inline-flex min-h-7 items-center rounded-md border border-ui-border bg-ui-surface px-2.5 text-xs font-bold text-ui-text-muted">{tag}</span>
          ))}
        </div>
      )}
      {launchFields && <div className={`${tags.length > 0 ? 'mt-3' : ''}`}>{launchFields}</div>}
      {isWriteCapable && primaryAction === 'launch' && !visibleLaunchBlocker && (
        <label id="workflow-launch-acknowledgement" className={`${tags.length > 0 ? 'mt-2' : ''} flex min-h-11 cursor-pointer items-center gap-2 text-ui-text-muted transition-colors hover:text-ui-text focus-within:text-ui-text`}>
          <Checkbox checked={launchAcknowledged} onChange={(event) => onAcknowledgementChange(event.target.checked)} className="shrink-0" />
          <span className="type-caption font-semibold">I understand this workflow can modify live systems.</span>
        </label>
      )}
      {visibleLaunchBlocker && <span id="workflow-launch-blocker" className={`${tags.length > 0 ? 'mt-2' : ''} block text-xs font-semibold text-ui-text-muted`}>Resolve this before launch: {visibleLaunchBlocker}</span>}
    </div>
    <div className="grid gap-1 sm:justify-items-end">
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
        {showCustomize && <Button className="w-full whitespace-nowrap sm:w-auto" variant="tertiary" size="md" onClick={onCustomize} disabled={!canManageWorkflowScope || customizing} title={!canManageWorkflowScope ? t('agentsWorkflows.workflowActions.customizePermission') : undefined}>
          <ICONS.Pencil className="h-4 w-4" aria-hidden="true" />
          {customizing ? t('agentsWorkflows.workflowActions.customizing') : t('agentsWorkflows.workflowActions.customize')}
        </Button>}
        {primaryAction === 'launch' && <Button className="w-full whitespace-nowrap sm:w-auto" variant="secondary" size="md" onClick={onSchedule} disabled={!canManageWorkflowScope} aria-describedby={!canManageWorkflowScope ? 'workflow-schedule-blocker' : undefined}>
          <ICONS.Clock className="h-4 w-4" aria-hidden="true" />
          Schedule workflow
        </Button>}
        {primaryAction === 'setup' && <Button className="w-full whitespace-nowrap sm:w-auto" variant="primary" size="md" onClick={onSetup}>
          <ICONS.Settings className="h-4 w-4" aria-hidden="true" />
          {t('agentsWorkflows.workflowActions.completeSetup')}
        </Button>}
        {primaryAction === 'activate' && <Button className="w-full whitespace-nowrap sm:w-auto" variant="activation" size="md" onClick={onActivate} disabled={!canManageWorkflowScope || activating} aria-describedby={!canManageWorkflowScope ? 'workflow-activate-blocker' : undefined}>
          <ICONS.Zap className="h-4 w-4" aria-hidden="true" />
          {activating ? t('agentsWorkflows.workflowActions.activating') : t('agentsWorkflows.workflowActions.activate')}
        </Button>}
        {primaryAction === 'launch' && <Button className="w-full whitespace-nowrap sm:w-auto" variant="activation" size="md" onClick={onLaunch} disabled={launching || Boolean(visibleLaunchBlocker) || needsLaunchAcknowledgement} title={visibleLaunchBlocker || undefined} aria-describedby={visibleLaunchBlocker ? 'workflow-launch-blocker' : needsLaunchAcknowledgement ? 'workflow-launch-acknowledgement' : undefined}>
          <ICONS.Send className="h-4 w-4" aria-hidden="true" />
          {launching ? 'Starting...' : 'Launch workflow'}
        </Button>}
      </div>
      {primaryAction === 'launch' && !canManageWorkflowScope && <p id="workflow-schedule-blocker" className="text-xs font-semibold text-ui-text-muted sm:text-right">You need manage_workflows to schedule workflows.</p>}
      {primaryAction === 'activate' && !canManageWorkflowScope && <p id="workflow-activate-blocker" className="text-xs font-semibold text-ui-text-muted sm:text-right">{t('agentsWorkflows.workflowActions.activatePermission')}</p>}
    </div>
  </div>;
};

export const WorkflowSearchTagSuggestions: React.FC<{
  query: string;
  workflowSearchTags: string[];
  onQueryChange: (query: string) => void;
}> = ({ query, workflowSearchTags, onQueryChange }) => (
  workflowSearchTags.length > 0 && query.trim() ? (
    <div className="flex flex-wrap gap-2 px-1" aria-label="Workflow tag suggestions">
      {workflowSearchTags.slice(0, 8).map((tag) => (
        <button key={tag} type="button" onClick={() => onQueryChange(appendWorkflowSearchTag(query, tag))} className="min-h-11 rounded-md border border-ui-border bg-ui-surface px-2.5 py-1.5 text-xs font-bold text-ui-text-muted hover:text-ui-text sm:min-h-8">
          {tag}
        </button>
      ))}
    </div>
  ) : null
);

export const WorkflowDiscovery: React.FC<{
  ready: boolean;
  query: string;
  totalCount: number;
  visibleCount: number;
  workflowSearchTags: string[];
  onQueryChange: (query: string) => void;
}> = ({ ready, query, totalCount, visibleCount, workflowSearchTags, onQueryChange }) => {
  return (!ready || totalCount > 0 || Boolean(query.trim())) ? (
    <div className={`${masterDetailDiscoverySpacingClass} space-y-3`}>
      <DiscoveryFilterBar
        idPrefix="workflow-library"
        query={query}
        queryLabel="Search workflow library"
        queryPlaceholder="Search workflows, agents, tools, tags"
        queryClearLabel="Clear search"
        resultSummary={ready ? (query.trim() ? `${visibleCount} of ${totalCount} workflows` : `${totalCount} ${totalCount === 1 ? 'workflow' : 'workflows'}`) : 'Loading workflows'}
        filters={[]}
        clearAllLabel="Clear all"
        onQueryChange={onQueryChange}
        onClearAll={() => onQueryChange('')}
      />
      <WorkflowSearchTagSuggestions query={query} workflowSearchTags={workflowSearchTags} onQueryChange={onQueryChange} />
    </div>
  ) : null
};

export const WorkflowLibraryList: React.FC<{
  workflows: WorkflowDefinition[]; visibleWorkflows: WorkflowDefinition[];
  selectedWorkflow?: WorkflowDefinition;
  ready: boolean; loadError: string;
  onSelectWorkflow: (workflowId: string) => void;
  registerWorkflowRow: (workflowId: string, node: HTMLButtonElement | null) => void;
}> = ({ workflows, visibleWorkflows, selectedWorkflow, ready, loadError, onSelectWorkflow, registerWorkflowRow }) => {
  return (
  <section aria-label="Workflow library" className="min-w-0 w-full max-w-full">
    <MasterDetailListHeader>Workflow library</MasterDetailListHeader>
    {!ready && <MasterDetailLoading>Loading workflows…</MasterDetailLoading>}
    {ready && visibleWorkflows.length > 0 && <ul className="divide-y divide-ui-border">
      {visibleWorkflows.map((workflow) => (
        <li key={workflow.id}>
          <MasterDetailRow
            buttonRef={(node) => registerWorkflowRow(workflow.id, node)}
            title={workflow.name}
            description={workflow.description}
            status={<StatusBadge tone={workflowStatusTone(workflow.status)}>{workflow.status}</StatusBadge>}
            metadata={<><span>{workflowProvenanceLabel(workflow)}</span><span aria-hidden="true">·</span><span>{pluralize(workflow.agents.length, 'agent')}</span></>}
            selected={workflow.id === selectedWorkflow?.id}
            ariaLabel={`Select workflow ${workflow.name}${workflow.id === selectedWorkflow?.id ? ', selected' : ''}`}
            onClick={() => onSelectWorkflow(workflow.id)}
          />
        </li>
      ))}
    </ul>}
    {ready && visibleWorkflows.length === 0 && !loadError && (
      <MasterDetailEmptyState
        title={workflows.length === 0 ? 'No workflows configured.' : 'No workflows match this search.'}
        description={workflows.length === 0 ? 'Install a reviewed template to start quickly, or create a workflow with your own Agents, access, and governed run policy.' : 'Clear the search to return to the full workflow library.'}
      />
    )}
  </section>
  );
};

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
          {isSystemProvidedWorkflow(deleteTargetWorkflow) && ' This starter will not be restored automatically.'}
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
  const plural = singular.endsWith('y') ? `${singular.slice(0, -1)}ies` : `${singular}s`;
  return `${count} ${count === 1 ? singular : plural}`;
}

export const WorkflowTabPanel: React.FC<{
  tab: WorkflowTab;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  notice?: React.ReactNode;
  children: React.ReactNode;
}> = ({ tab, title, description, actions, notice, children }) => (
  <section id={`workflow-section-${tab}-panel`} role="tabpanel" aria-labelledby={`workflow-section-${tab}-tab`} tabIndex={0} className="space-y-5 px-1 py-1">
    <div className="flex flex-col gap-4 border-b border-ui-border pb-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1">
        <h3 className="type-panel-title">{title}</h3>
        {description && <p className="type-caption mt-1 w-full max-w-none text-ui-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
    <div className="space-y-5">
      {notice}
      {children}
    </div>
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

function previewStatusTone(status: WorkflowCapabilitiesPreview['status']): 'success' | 'warning' | 'danger' {
  if (status === 'ready') return 'success';
  if (status === 'blocked') return 'danger';
  return 'warning';
}

const WorkflowPreviewToolRows: React.FC<{ label: string; tools: WorkflowCapabilityToolPreview[] }> = ({ label, tools }) => (
  tools.length > 0 ? (
    <div className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5">
      <dt className="type-row-title">{label}</dt>
      <dd>
        <ul className="divide-y divide-ui-border">
          {tools.map((tool) => (
            <li key={`${tool.source}:${tool.id}`} className="flex flex-col gap-2 py-2 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <span className="min-w-0">
                <span className="block break-words font-mono text-sm text-ui-text [overflow-wrap:anywhere]">{tool.label}</span>
                {tool.description && <span className="type-caption mt-0.5 block text-ui-text-muted">{tool.description}</span>}
              </span>
              <span className="flex shrink-0 flex-wrap gap-1.5">
                <StatusBadge tone="neutral">{tool.source === 'target' ? 'Target' : tool.source === 'mcp' ? 'MCP' : 'Built-in'}</StatusBadge>
                <StatusBadge tone={tool.access === 'write' ? 'warning' : 'success'}>{tool.access}</StatusBadge>
              </span>
            </li>
          ))}
        </ul>
      </dd>
    </div>
  ) : null
);

function visibleMcpAuthRequirements(requirements: WorkflowMcpRequirementPreview[]): WorkflowMcpRequirementPreview[] {
  return requirements.filter((requirement) => Boolean(requirement.serverId));
}

function mcpConnectionTone(state: WorkflowMcpRequirementPreview['connectionState']): 'success' | 'warning' | 'neutral' {
  if (state === 'connected') return 'success';
  if (state === 'connection_error') return 'warning';
  return 'neutral';
}

function mcpConnectionLabel(state: WorkflowMcpRequirementPreview['connectionState'], t: (key: string) => string): string {
  if (state === 'connection_missing') return t('mcpServers.workflowConnectionRequired');
  if (state === 'connection_error') return t('mcpServers.workflowConnectionFailed');
  return t('mcpServers.statusConnected');
}

export function canConnectWorkflowMcpRequirement(requirement: WorkflowMcpRequirementPreview): boolean {
  return Boolean(requirement.serverId)
    && (
      (requirement.connectionState === 'connection_missing' && requirement.action === 'connect_mcp_server')
      || (requirement.connectionState === 'connection_error' && requirement.action === 'verify_mcp_server')
    );
}

export function workflowMcpCredentialMode(requirement: WorkflowMcpRequirementPreview): 'connect' | 'replace' {
  return requirement.connectionState === 'connection_error' ? 'replace' : 'connect';
}

export function workflowCapabilityBlockerMessage(
  preview: WorkflowCapabilitiesPreview,
  fallback: string
): string {
  return preview.selectedTarget?.reason
    || preview.targetCandidates.find((candidate) => candidate.status !== 'ready' && candidate.reason)?.reason
    || fallback;
}

export const WorkflowPreviewAuthRow: React.FC<{
  requirements: WorkflowMcpRequirementPreview[];
  onConnectCredential: (requirement: WorkflowMcpRequirementPreview) => void;
}> = ({ requirements, onConnectCredential }) => {
  const { t } = useTranslation();
  const visibleRequirements = visibleMcpAuthRequirements(requirements);
  if (visibleRequirements.length === 0) return null;
  return (
    <div className="grid gap-2 py-3 first:pt-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5">
      <dt className="type-row-title">{t('mcpServers.requiredAuth')}</dt>
      <dd>
        <ul className="divide-y divide-ui-border">
          {visibleRequirements.map((requirement) => {
            const auth = requirement.authRequirement;
            const canConnectCredential = canConnectWorkflowMcpRequirement(requirement);
            const owner = requirement.owningTarget || requirement.owningAgent;
            return (
              <li key={`${owner.id}:${requirement.serverId}`} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-ui-text">{requirement.serverName}</span>
                  <span className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={mcpConnectionTone(requirement.connectionState)}>{mcpConnectionLabel(requirement.connectionState, t)}</StatusBadge>
                    {canConnectCredential && <Button type="button" variant="secondary" size="sm" onClick={() => onConnectCredential(requirement)}>{t(requirement.connectionState === 'connection_error' ? 'mcpServers.replaceCredential' : 'mcpServers.connectCredential')}</Button>}
                  </span>
                </div>
                <p className="type-caption mt-1 text-ui-text-muted">{t(auth.scope === 'individual' ? 'mcpServers.individualCredential' : 'mcpServers.workspaceManagedCredential')} · {auth.credentialLabel} · {t(requirement.owningTarget ? 'mcpServers.ownedByTarget' : 'mcpServers.ownedByAgent', { name: owner.name })}</p>
                {auth.requiredInformation.length > 0 && (
                  <div className="mt-3">
                    <div className="type-micro-label text-ui-text-muted">{t('mcpServers.requiredInformation')}</div>
                    <ul className="mt-1.5 grid gap-1.5">
                      {auth.requiredInformation.map((item) => (
                        <li key={item.name} className="text-sm text-ui-text"><span className="font-semibold">{item.name}</span><span className="text-ui-text-muted">: {item.description}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </dd>
    </div>
  );
};

export const WorkflowMcpCredentialDialog: React.FC<{
  workspaceId: string;
  requirement: WorkflowMcpRequirementPreview;
  onClose: () => void;
  onConnected: () => void;
}> = ({ workspaceId, requirement, onClose, onConnected }) => {
  const { t } = useTranslation();
  const installation = React.useMemo(() => ({
    id: requirement.serverId,
    credentialMode: requirement.authRequirement.scope,
    authType: requirement.authType
  }), [requirement.authRequirement.scope, requirement.authType, requirement.serverId]);
  const installations = React.useMemo(() => [installation], [installation]);
  const titleId = React.useId();
  const {
    connections,
    loadingByServerId,
    connect,
    retryAfterSecondsFor
  } = useMcpConnections({
    workspaceId,
    destination: requirement.owningTarget
      ? { kind: 'target', id: requirement.owningTarget.id }
      : { kind: 'agent', id: requirement.owningAgent.id },
    installations
  });
  const connection = connections[requirement.serverId];
  if (loadingByServerId[requirement.serverId] || !connection) {
    return <Dialog titleId={titleId} onClose={onClose} className="w-full max-w-md rounded-lg border border-ui-border bg-ui-surface p-6 shadow-2xl"><h2 id={titleId} className="type-section-title">{t('mcpServers.loadingCredentialStatus')}</h2></Dialog>;
  }
  if (!connection.canManage) {
    return <Dialog titleId={titleId} onClose={onClose} className="w-full max-w-md rounded-lg border border-ui-border bg-ui-surface p-6 shadow-2xl"><h2 id={titleId} className="type-section-title">{t('mcpServers.workspaceCredentialRequired')}</h2><p className="type-caption mt-2 text-ui-text-muted">{t('mcpServers.askWorkspaceAdmin')}</p><div className="mt-5 flex justify-end"><Button type="button" variant="secondary" onClick={onClose}>{t('common.close')}</Button></div></Dialog>;
  }
  return <McpCredentialDialog
    serverName={requirement.serverName}
    authType={requirement.authType}
    credentialLabel={requirement.authRequirement.credentialLabel}
    credentialMode={requirement.authRequirement.scope}
    mode={workflowMcpCredentialMode(requirement)}
    retryAfterSeconds={retryAfterSecondsFor(requirement.serverId)}
    onClose={onClose}
    onSubmit={async (credential) => {
      const next = await connect(installation, credential);
      if (next?.status === 'connected') {
        onClose();
        onConnected();
      }
    }}
  />;
};

export const WorkflowCapabilityLedger: React.FC<{
  workspaceId: string;
  preview: WorkflowCapabilitiesPreview | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
}> = ({ workspaceId, preview, loading, error, onRetry }) => {
  const [credentialRequirement, setCredentialRequirement] = React.useState<WorkflowMcpRequirementPreview | null>(null);
  return <>
  <section aria-label="Effective access preview" className="mt-4 border-y border-ui-border py-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h4 className="type-row-title">Effective access preview</h4>
        <p className="type-caption mt-1 text-ui-text-muted">Checked against current target mappings and tool availability. Launch revalidates this scope.</p>
      </div>
      {preview && <StatusBadge tone={previewStatusTone(preview.status)}>{preview.status === 'needs_target' ? 'Select target' : preview.status}</StatusBadge>}
    </div>
    <CollectionState
      phase={loading ? 'loading' : error ? 'error' : 'ready'}
      itemCount={preview ? 1 : 0}
      loading={<div role="status" aria-live="polite" className="type-caption mt-4 text-ui-text-muted">Resolving effective tools…</div>}
      error={<div role="alert" className="mt-4 flex flex-col gap-3 border-y border-status-danger/25 bg-status-danger-soft px-3 py-3 text-sm text-status-danger-text sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><Button type="button" variant="secondary" size="sm" onClick={onRetry}>Retry preview</Button></div>}
      empty={null}
    >
      {preview && !loading && !error && (
      <dl className="mt-4 divide-y divide-ui-border">
        {preview.selectedTarget && (
          <div className="grid gap-2 py-3 first:pt-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5">
            <dt className="type-row-title">Target</dt>
            <dd className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-ui-text">{preview.selectedTarget.name}</span>
              <span className={preview.selectedTarget.status === 'ready' ? 'text-status-success-text' : 'text-status-warning-text'}>{preview.selectedTarget.status}{preview.selectedTarget.reason ? `: ${preview.selectedTarget.reason}` : ''}</span>
            </dd>
          </div>
        )}
        <WorkflowPreviewAuthRow requirements={preview.mcpRequirements} onConnectCredential={setCredentialRequirement} />
        <WorkflowPreviewToolRows label="Read tools" tools={preview.tools.read} />
        <WorkflowPreviewToolRows label="Write tools" tools={preview.tools.write} />
        {preview.directMcpServers.length > 0 && <CapabilityReviewRow label="Direct MCP servers" description="Servers available in the compiled run scope." values={preview.directMcpServers.map((server) => server.name)} emptyLabel="" />}
        {preview.enabledSkills.length > 0 && <CapabilityReviewRow label="Installed skills" description="Skills enabled in the compiled run scope." values={preview.enabledSkills.map((skill) => skill.name)} emptyLabel="" />}
        {preview.approvalRequirements.length > 0 && <CapabilityReviewRow label="Workflow approval gates" description="The run pauses at each gate until an operator approves or rejects it." values={preview.approvalRequirements} emptyLabel="" />}
      </dl>
      )}
    </CollectionState>
  </section>
  {credentialRequirement && canConnectWorkflowMcpRequirement(credentialRequirement) && (
    <WorkflowMcpCredentialDialog
      workspaceId={workspaceId}
      requirement={credentialRequirement}
      onClose={() => setCredentialRequirement(null)}
      onConnected={onRetry}
    />
  )}
  </>;
};
