import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, IconTile, InlineAlert } from '@acornops/ui';
import { CloseButton } from '@acornops/ui';
import { CollectionState } from '@acornops/ui';
import { DialogFrame } from '@acornops/ui';
import { DiscoveryFilterBar } from '@acornops/ui';
import { MasterDetailEmptyState, MasterDetailListHeader, MasterDetailLoading, MasterDetailRow, masterDetailDiscoverySpacingClass } from '@acornops/ui';
import { StatusBadge } from '@acornops/ui';
import { TextInput } from '@acornops/ui';
import { ICONS } from '@/constants';
import { McpCredentialDialog } from '@/features/catalog/McpCredentialDialog';
import { McpOAuthDialog } from '@/features/catalog/McpOAuthDialog';
import { useMcpConnections } from '@/features/catalog/useMcpConnections';
import { appendWorkflowSearchTag, type WorkflowAgentReference, type WorkflowDefinition } from '@/pages/workflows/workflowModel';
import { titleFromInputName, workflowStatusTone } from '@/pages/workflows/workflowPageHelpers';
import { formatUserDateTime } from '@/utils/dateTime';
import type { WorkflowCapabilitiesPreview, WorkflowCapabilityToolPreview, WorkflowMcpRequirementPreview } from '@/services/control-plane/workflowApi';

export { WorkflowLaunchActions } from '@/pages/workflows/WorkflowLaunchActions';
function workflowProvenanceLabel(workflow: WorkflowDefinition): string {
  return workflow.owner;
}
function formatWorkflowTimestamp(value: string, fallback: string): string {
  return formatUserDateTime(value, { fallback });
}
export const WorkflowLoadErrorNotice: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="mb-4 flex flex-col gap-3 rounded-md border border-status-warning/30 bg-status-warning-soft px-3 py-2 type-caption type-emphasis text-status-warning-text sm:flex-row sm:items-center sm:justify-between">
    <span className="min-w-0 break-words [overflow-wrap:anywhere]">Workflows could not be loaded from the control plane.</span>
    <Button type="button" variant="secondary" size="sm" onClick={onRetry} className="self-start border-status-warning/30 bg-ui-surface text-status-warning-text hover:bg-ui-bg sm:self-auto">
      Retry
    </Button>
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
export const WorkflowModeBadge: React.FC<{ mode: string }> = ({ mode }) => <StatusBadge tone={workflowModeTone(mode)}>{workflowModeLabel(mode)}</StatusBadge>;
export const WorkflowSearchTagSuggestions: React.FC<{
  query: string;
  workflowSearchTags: string[];
  onQueryChange: (query: string) => void;
}> = ({ query, workflowSearchTags, onQueryChange }) =>
  workflowSearchTags.length > 0 && query.trim() ? (
    <div className="flex flex-wrap gap-2 px-1" aria-label="Workflow tag suggestions">
      {workflowSearchTags.slice(0, 8).map((tag) => (
        <Button key={tag} type="button" variant="secondary" size="sm" onClick={() => onQueryChange(appendWorkflowSearchTag(query, tag))} className="px-2.5 py-1.5 sm:min-h-8">
          {tag}
        </Button>
      ))}
    </div>
  ) : null;

export const WorkflowDiscovery: React.FC<{
  ready: boolean;
  query: string;
  totalCount: number;
  visibleCount: number;
  workflowSearchTags: string[];
  withSpacing?: boolean;
  onQueryChange: (query: string) => void;
}> = ({ ready, query, totalCount, visibleCount, workflowSearchTags, withSpacing = true, onQueryChange }) => {
  return !ready || totalCount > 0 || Boolean(query.trim()) ? (
    <div className={`${withSpacing ? masterDetailDiscoverySpacingClass : ''} space-y-3`}>
      <DiscoveryFilterBar searchWidth="fluid" idPrefix="workflow-library" query={query} queryLabel="Search workflow library" queryPlaceholder="Search workflows, agents, tools, tags" queryClearLabel="Clear search" resultSummary={ready ? (query.trim() ? `${visibleCount} of ${totalCount} workflows` : `${totalCount} ${totalCount === 1 ? 'workflow' : 'workflows'}`) : 'Loading workflows'} filters={[]} clearAllLabel="Clear all" onQueryChange={onQueryChange} onClearAll={() => onQueryChange('')} />
      <WorkflowSearchTagSuggestions query={query} workflowSearchTags={workflowSearchTags} onQueryChange={onQueryChange} />
    </div>
  ) : null;
};

export const WorkflowLibraryList: React.FC<{
  workflows: WorkflowDefinition[];
  visibleWorkflows: WorkflowDefinition[];
  selectedWorkflow?: WorkflowDefinition;
  ready: boolean;
  loadError: string;
  onSelectWorkflow: (workflowId: string) => void;
  registerWorkflowRow: (workflowId: string, node: HTMLButtonElement | null) => void;
}> = ({ workflows, visibleWorkflows, selectedWorkflow, ready, loadError, onSelectWorkflow, registerWorkflowRow }) => {
  return (
    <section aria-label="Workflow library" className="min-w-0 w-full max-w-full">
      <MasterDetailListHeader>Workflow library</MasterDetailListHeader>
      {!ready && <MasterDetailLoading>Loading workflows…</MasterDetailLoading>}
      {ready && visibleWorkflows.length > 0 && (
        <ul className="divide-y divide-ui-border">
          {visibleWorkflows.map((workflow) => (
            <li key={workflow.id}>
              <MasterDetailRow
                buttonRef={(node) => registerWorkflowRow(workflow.id, node)}
                title={workflow.name}
                description={workflow.description}
                status={(
                  <span className="flex items-center gap-2">
                    <StatusBadge tone={workflowStatusTone(workflow.status)}>{workflow.status}</StatusBadge>
                    <ICONS.ChevronRight className="h-4 w-4 text-ui-text-muted" aria-hidden="true" />
                  </span>
                )}
                metadata={
                  <>
                    <span>{workflowProvenanceLabel(workflow)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{pluralize(workflow.agents.length, 'agent')}</span>
                  </>
                }
                selected={workflow.id === selectedWorkflow?.id}
                ariaLabel={`Select workflow ${workflow.name}${workflow.id === selectedWorkflow?.id ? ', selected' : ''}`}
                onClick={() => onSelectWorkflow(workflow.id)}
              />
            </li>
          ))}
        </ul>
      )}
      {ready && visibleWorkflows.length === 0 && !loadError && <MasterDetailEmptyState title={workflows.length === 0 ? 'No workflows configured.' : 'No workflows match this search.'} description={workflows.length === 0 ? 'Add a recommended workflow to start quickly, or create one with your own Agents, access, and governed run policy.' : 'Clear the search to return to the full workflow library.'} />}
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
}> = ({ deleteTargetWorkflow, deleteWorkflowConfirmation, deleteWorkflowError, deletingWorkflowId, onClose, onDelete, setDeleteWorkflowConfirmation }) => {
  if (!deleteTargetWorkflow) return null;

  return (
    <DialogFrame unframed titleId="delete-workflow-title" closeDisabled={deletingWorkflowId === deleteTargetWorkflow.id} className="w-full max-w-lg overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl" onClose={onClose}>
      <div className="flex items-center justify-between border-b border-ui-border bg-ui-bg px-5 py-4">
        <div className="flex items-center gap-3">
          <IconTile size="sm" tone="danger">
            <ICONS.Trash2 className="h-4 w-4" aria-hidden="true" />
          </IconTile>
          <div>
            <h3 id="delete-workflow-title" className="type-row-title text-ui-text">
              Delete workflow
            </h3>
            <p className="type-caption mt-0.5 type-emphasis text-ui-text-muted">This action cannot be undone.</p>
          </div>
        </div>
        <CloseButton onClick={onClose} disabled={deletingWorkflowId === deleteTargetWorkflow.id} label="Close delete workflow dialog" />
      </div>
      <div className="space-y-4 px-5 py-5">
        <div className="rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 type-ui leading-6 text-status-danger-text">Deleting {deleteTargetWorkflow.name} removes the workflow definition for future runs. Existing run records and audit events are retained.</div>
        <div>
          <label htmlFor="delete-workflow-confirmation-input" className="type-label mb-1.5 block px-1">
            Type the workflow name to confirm deletion.
          </label>
          <TextInput id="delete-workflow-confirmation-input" value={deleteWorkflowConfirmation} onChange={(event) => setDeleteWorkflowConfirmation(event.target.value)} disabled={deletingWorkflowId === deleteTargetWorkflow.id} autoComplete="off" spellCheck={false} className="focus:border-status-danger/45 focus:ring-status-danger/20" />
        </div>
        {deleteWorkflowError && (
          <InlineAlert tone="danger" aria-live="assertive" className="px-3 py-2">
            {deleteWorkflowError}
          </InlineAlert>
        )}
      </div>
      <div className="flex justify-end gap-3 border-t border-ui-border bg-ui-bg px-5 py-4">
        <Button variant="secondary" size="sm" onClick={onClose} disabled={deletingWorkflowId === deleteTargetWorkflow.id}>
          Cancel
        </Button>
        <Button variant="danger" size="sm" onClick={() => onDelete(deleteTargetWorkflow)} disabled={deletingWorkflowId === deleteTargetWorkflow.id || deleteWorkflowConfirmation !== deleteTargetWorkflow.name}>
          {deletingWorkflowId === deleteTargetWorkflow.id ? 'Deleting...' : 'Delete workflow'}
        </Button>
      </div>
    </DialogFrame>
  );
};

function pluralize(count: number, singular: string): string {
  const plural = singular.endsWith('y') ? `${singular.slice(0, -1)}ies` : `${singular}s`;
  return `${count} ${count === 1 ? singular : plural}`;
}

export const WorkflowPanel: React.FC<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
  notice?: React.ReactNode;
  showHeader?: boolean;
  children: React.ReactNode;
}> = ({ title, description, actions, notice, showHeader = true, children }) => (
  <section className="space-y-5 px-1 py-1">
    {showHeader && (
      <div className="flex flex-col gap-4 border-b border-ui-border pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="type-panel-title">{title}</h3>
          {description && <p className="type-caption mt-1 w-full max-w-none text-ui-text-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    )}
    {!showHeader && actions && <div className="flex justify-end">{actions}</div>}
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
    return <div className={`${className} py-3 type-ui text-ui-text-muted`}>No workflow agents selected.</div>;
  }
  return (
    <div className={`${className} divide-y divide-ui-border`}>
      {rows.map(({ agent, label }) => (
        <AgentAssignmentRow key={`${agent.agentId}:${label}`} agent={agent} label={label} />
      ))}
    </div>
  );
};
const AgentAssignmentRow: React.FC<{
  agent: WorkflowAgentReference;
  label: string;
}> = ({ agent, label }) => {
  const showRole = agent.role.trim().toLowerCase() !== label.trim().toLowerCase();
  return <div className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[2.25rem_1fr_auto] sm:items-center">
    <IconTile size="sm">
      <ICONS.Bot className="h-4 w-4" aria-hidden="true" />
    </IconTile>
    <div className="min-w-0">
      <div className="break-words type-body type-emphasis text-ui-text [overflow-wrap:anywhere]">{agent.name}</div>
      {showRole && <div className="type-caption mt-1 break-words text-ui-text-muted [overflow-wrap:anywhere]">{agent.role}</div>}
    </div>
    <div className="flex items-start justify-start sm:justify-end">
      <span className="rounded-md border border-ui-border bg-ui-surface px-2.5 py-1 type-caption type-emphasis text-ui-text-muted">{label}</span>
    </div>
  </div>;
};

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
  <div className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5">
    <dt>
      <span className="type-row-title block">{label}</span>
      <span className="type-caption mt-1 block max-w-56 text-ui-text-muted">{description}</span>
    </dt>
    <dd className="min-w-0">
      {values.length > 0 ? (
        <ul className="grid gap-1.5">
          {values.map((value) => (
            <li key={value} className={technical ? 'break-words font-mono type-body leading-6 text-ui-text [overflow-wrap:anywhere]' : 'break-words type-ui leading-6 text-ui-text [overflow-wrap:anywhere]'}>
              {technical ? value : formatWorkflowScopeValue(value)}
            </li>
          ))}
        </ul>
      ) : (
        <span className="type-ui text-ui-text-muted">{emptyLabel}</span>
      )}
    </dd>
  </div>
);

function previewStatusTone(status: WorkflowCapabilitiesPreview['status']): 'success' | 'warning' | 'danger' {
  if (status === 'ready') return 'success';
  if (status === 'blocked') return 'danger';
  return 'warning';
}

function workflowWriteAccess(preview: WorkflowCapabilitiesPreview): {
  label: string;
  tone: 'neutral' | 'warning';
} {
  if (preview.mode === 'read_only') return { label: 'Disabled', tone: 'neutral' };
  if (preview.tools.write.length === 0) return { label: 'No write tools', tone: 'neutral' };
  if (preview.approvalRequirements.length > 0) return { label: 'Approval required', tone: 'warning' };
  return { label: 'Allowed automatically', tone: 'warning' };
}

const WorkflowPreviewToolRows: React.FC<{
  label: string;
  tools: WorkflowCapabilityToolPreview[];
}> = ({ label, tools }) =>
  tools.length > 0 ? (
    <div className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5">
      <dt className="type-row-title">{label}</dt>
      <dd>
        <ul className="divide-y divide-ui-border">
          {tools.map((tool) => (
            <li key={`${tool.source}:${tool.id}`} className="flex flex-col gap-2 py-2 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <span className="min-w-0">
                <span className="block break-words font-mono type-body text-ui-text [overflow-wrap:anywhere]">{tool.label}</span>
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
  ) : null;

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
      || requirement.action === 'authorize_mcp_server'
      || requirement.action === 'select_authorization_server'
      || requirement.action === 'reauthorize_mcp_server'
    );
}

export function workflowMcpCredentialMode(requirement: WorkflowMcpRequirementPreview): 'connect' | 'replace' {
  return requirement.connectionState === 'connection_error' ? 'replace' : 'connect';
}

export function workflowCapabilityBlockerMessage(fallback: string): string {
  return fallback;
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
            const owner = requirement.owningAgent;
            return (
              <li key={`${owner.id}:${requirement.serverId}`} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="type-emphasis text-ui-text">{requirement.serverName}</span>
                  <span className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={mcpConnectionTone(requirement.connectionState)}>{mcpConnectionLabel(requirement.connectionState, t)}</StatusBadge>
                    {canConnectCredential && (
                      <Button type="button" variant="secondary" size="sm" onClick={() => onConnectCredential(requirement)}>
                        {t(requirement.authType === 'oauth'
                          ? requirement.action === 'reauthorize_mcp_server'
                            ? 'mcpServers.oauthReauthorizationRequired'
                            : 'mcpServers.oauthAuthorizationRequired'
                          : requirement.connectionState === 'connection_error'
                            ? 'mcpServers.replaceCredential'
                            : 'mcpServers.connectCredential')}
                      </Button>
                    )}
                  </span>
                </div>
                <p className="type-caption mt-1 text-ui-text-muted">
                  {t(auth.scope === 'individual' ? 'mcpServers.individualCredential' : 'mcpServers.workspaceManagedCredential')} · {auth.credentialLabel} · {t('mcpServers.ownedByAgent', { name: owner.name })}
                </p>
                {auth.requiredInformation.length > 0 && (
                  <div className="mt-3">
                    <div className="type-micro-label text-ui-text-muted">{t('mcpServers.requiredInformation')}</div>
                    <ul className="mt-1.5 grid gap-1.5">
                      {auth.requiredInformation.map((item) => (
                        <li key={item.name} className="type-body text-ui-text">
                          <span className="type-emphasis">{item.name}</span>
                          <span className="text-ui-text-muted">: {item.description}</span>
                        </li>
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
  const installation = React.useMemo(
    () => ({
      id: requirement.serverId,
      credentialMode: requirement.authRequirement.scope,
      authType: requirement.authType
    }),
    [requirement.authRequirement.scope, requirement.authType, requirement.serverId]
  );
  const installations = React.useMemo(() => [installation], [installation]);
  const titleId = React.useId();
  const {
    connections,
    loadingByServerId,
    connect,
    prepareOAuth,
    startOAuth,
    retryAfterSecondsFor
  } = useMcpConnections({
    workspaceId,
    destination: { kind: 'agent', id: requirement.owningAgent.id },
    installations
  });
  const connection = connections[requirement.serverId];
  if (loadingByServerId[requirement.serverId] || !connection) {
    return (
      <DialogFrame unframed titleId={titleId} onClose={onClose} className="w-full max-w-md rounded-lg border border-ui-border bg-ui-surface p-6 shadow-2xl">
        <h2 id={titleId} className="type-section-title">
          {t('mcpServers.loadingCredentialStatus')}
        </h2>
      </DialogFrame>
    );
  }
  if (!connection.canManage) {
    return (
      <DialogFrame unframed titleId={titleId} onClose={onClose} className="w-full max-w-md rounded-lg border border-ui-border bg-ui-surface p-6 shadow-2xl">
        <h2 id={titleId} className="type-section-title">
          {t('mcpServers.workspaceCredentialRequired')}
        </h2>
        <p className="type-caption mt-2 text-ui-text-muted">{t('mcpServers.askWorkspaceAdmin')}</p>
        <div className="mt-5 flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </DialogFrame>
    );
  }
  if (requirement.authType === 'oauth') {
    const returnUrl = new URL(window.location.href);
    returnUrl.searchParams.delete('mcpOAuthResult');
    return <McpOAuthDialog
      serverName={requirement.serverName}
      returnPath={`${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`}
      mode={connection.status === 'reauthorization_required' ? 'reauthorize' : 'authorize'}
      retryAfterSeconds={retryAfterSecondsFor(requirement.serverId)}
      onClose={onClose}
      onPrepare={(returnPath) => prepareOAuth(installation, returnPath)}
      onStart={(preparationHandle, issuer) => startOAuth(installation, preparationHandle, issuer)}
    />;
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
  return (
    <>
      <section aria-label="Run capabilities" className="mt-4 border-y border-ui-border py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h4 className="type-row-title">Run capabilities</h4>
            <p className="type-caption mt-1 text-ui-text-muted">Tools and integrations available to this run. Launch revalidates the scope.</p>
          </div>
          {preview && <StatusBadge tone={previewStatusTone(preview.status)}>{preview.status}</StatusBadge>}
        </div>
        <CollectionState
          phase={loading ? 'loading' : error ? 'error' : 'ready'}
          itemCount={preview ? 1 : 0}
          loading={
            <div role="status" aria-live="polite" className="type-caption mt-4 text-ui-text-muted">
              Resolving effective tools…
            </div>
          }
          error={
            <InlineAlert tone="danger" className="mt-4 rounded-none border-x-0 px-3 type-body" action={<Button type="button" variant="secondary" size="sm" onClick={onRetry}>Retry preview</Button>}>
              {error}
            </InlineAlert>
          }
          empty={null}
        >
          {preview && !loading && !error && (
            <dl className="mt-4 divide-y divide-ui-border">
              <div className="grid gap-2 py-3 first:pt-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5">
                <dt className="type-row-title">Write access</dt>
                <dd><StatusBadge tone={workflowWriteAccess(preview).tone}>{workflowWriteAccess(preview).label}</StatusBadge></dd>
              </div>
              <WorkflowPreviewAuthRow requirements={preview.mcpRequirements} onConnectCredential={setCredentialRequirement} />
              <WorkflowPreviewToolRows label="Read tools" tools={preview.tools.read} />
              <WorkflowPreviewToolRows label="Write tools" tools={preview.tools.write} />
              {preview.directMcpServers.length > 0 && <CapabilityReviewRow label="Direct MCP servers" description="Servers available in the compiled run scope." values={preview.directMcpServers.map((server) => server.name)} emptyLabel="" />}
              {preview.enabledSkills.length > 0 && <CapabilityReviewRow label="Installed skills" description="Skills enabled in the compiled run scope." values={preview.enabledSkills.map((skill) => skill.name)} emptyLabel="" />}
            </dl>
          )}
        </CollectionState>
      </section>
      {credentialRequirement && canConnectWorkflowMcpRequirement(credentialRequirement) && <WorkflowMcpCredentialDialog workspaceId={workspaceId} requirement={credentialRequirement} onClose={() => setCredentialRequirement(null)} onConnected={onRetry} />}
    </>
  );
};

export const WorkflowCapabilitySummary: React.FC<{
  workspaceId: string;
  preview: WorkflowCapabilitiesPreview | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
}> = ({ workspaceId, preview, loading, error, onRetry }) => {
  const [credentialRequirement, setCredentialRequirement] = React.useState<WorkflowMcpRequirementPreview | null>(null);
  return (
    <>
      <section aria-label="Capability summary" className="mt-4 border-y border-ui-border py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <p className="type-caption max-w-[70ch] text-ui-text-muted">Tools inherited from the assigned Agents. Launch checks these capabilities again.</p>
          {preview && <StatusBadge tone={previewStatusTone(preview.status)}>{preview.status}</StatusBadge>}
        </div>
        <CollectionState
          phase={loading ? 'loading' : error ? 'error' : 'ready'}
          itemCount={preview ? 1 : 0}
          loading={<div role="status" aria-live="polite" className="type-caption mt-4 text-ui-text-muted">Resolving capabilities…</div>}
          error={
            <InlineAlert tone="danger" className="mt-4 rounded-none border-x-0 px-3 type-body" action={<Button type="button" variant="secondary" size="sm" onClick={onRetry}>Retry</Button>}>
              {error}
            </InlineAlert>
          }
          empty={null}
        >
          {preview && !loading && !error && (
            <dl className="mt-4 divide-y divide-ui-border">
              <div className="grid gap-2 py-3 first:pt-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5">
                <dt className="type-row-title">Tools</dt>
                <dd className="flex flex-wrap gap-2">
                  <StatusBadge tone="success">{preview.counts.readTools} read</StatusBadge>
                  <StatusBadge tone={preview.counts.writeTools > 0 ? 'warning' : 'neutral'}>{preview.counts.writeTools} write</StatusBadge>
                </dd>
              </div>
              <div className="grid gap-2 py-3 first:pt-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5">
                <dt className="type-row-title">Write access</dt>
                <dd><StatusBadge tone={workflowWriteAccess(preview).tone}>{workflowWriteAccess(preview).label}</StatusBadge></dd>
              </div>
              <WorkflowPreviewAuthRow requirements={preview.mcpRequirements} onConnectCredential={setCredentialRequirement} />
            </dl>
          )}
        </CollectionState>
      </section>
      {credentialRequirement && canConnectWorkflowMcpRequirement(credentialRequirement) && <WorkflowMcpCredentialDialog workspaceId={workspaceId} requirement={credentialRequirement} onClose={() => setCredentialRequirement(null)} onConnected={onRetry} />}
    </>
  );
};
