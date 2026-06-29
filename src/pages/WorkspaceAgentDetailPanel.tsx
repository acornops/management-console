import React from 'react';
import { Button } from '@/components/common/Button';
import { Select } from '@/components/common/Select';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ICONS } from '@/constants';
import { getAgentAccessClass, getAgentReadinessLabel, getAgentReviewSignals, type AgentDefinition } from '@/pages/agents/agentModel';
import type { AgentTriggerDefinitionApi, AgentVersionSnapshotApi } from '@/services/control-plane/agentApi';
import {
  CapabilityList,
  TokenGroup,
  agentFormInputClassName,
  agentFormTextareaClassName,
  eventTriggerTypeOptions,
  formatAgentDisplayValue,
  formatPolicyValue,
  type EventTriggerType
} from '@/pages/WorkspaceAgentsPage.helpers';

interface WorkspaceAgentDetailPanelProps {
  selectedAgent: AgentDefinition;
  canManageAgents: boolean;
  testingAgentId: string;
  updatingAgentId: string;
  agentVersionAction: string;
  agentActivityAction: string;
  agentTriggerAction: string;
  disableConfirmAgentId: string;
  setDisableConfirmAgentId: React.Dispatch<React.SetStateAction<string>>;
  deleteConfirmAgentId: string;
  setDeleteConfirmAgentId: React.Dispatch<React.SetStateAction<string>>;
  selectedCompiledScopePreview?: Record<string, unknown>;
  agentVersionHistories: Record<string, AgentVersionSnapshotApi[]>;
  newManualTriggerName: string;
  setNewManualTriggerName: React.Dispatch<React.SetStateAction<string>>;
  newScheduleTriggerName: string;
  setNewScheduleTriggerName: React.Dispatch<React.SetStateAction<string>>;
  newScheduleTriggerCron: string;
  setNewScheduleTriggerCron: React.Dispatch<React.SetStateAction<string>>;
  newScheduleTriggerTimezone: string;
  setNewScheduleTriggerTimezone: React.Dispatch<React.SetStateAction<string>>;
  newEventTriggerName: string;
  setNewEventTriggerName: React.Dispatch<React.SetStateAction<string>>;
  newEventTriggerType: EventTriggerType;
  setNewEventTriggerType: React.Dispatch<React.SetStateAction<EventTriggerType>>;
  newEventTriggerFilter: string;
  setNewEventTriggerFilter: React.Dispatch<React.SetStateAction<string>>;
  onTestSelectedAgent: () => void;
  onReviewSelectedAgentAccess: () => void;
  onOpenEditAgentDrawer: (agent: AgentDefinition) => void;
  onSaveSelectedAgentVersion: () => void;
  onReactivateSelectedAgent: () => void;
  onDisableSelectedAgent: () => void;
  onDeleteSelectedAgent: () => void;
  onCreateManualTrigger: () => void;
  onCreateScheduleTrigger: () => void;
  onCreateEventTrigger: () => void;
  onToggleAgentTrigger: (trigger: AgentTriggerDefinitionApi) => void;
  onDeleteAgentTrigger: (trigger: AgentTriggerDefinitionApi) => void;
  onRefreshSelectedAgentVersions: () => void;
  onRestoreSelectedAgentVersion: (version: AgentVersionSnapshotApi) => void;
  onRefreshSelectedAgentActivity: () => void;
}

export const WorkspaceAgentDetailPanel: React.FC<WorkspaceAgentDetailPanelProps> = ({
  selectedAgent,
  canManageAgents,
  testingAgentId,
  updatingAgentId,
  agentVersionAction,
  agentActivityAction,
  agentTriggerAction,
  disableConfirmAgentId,
  setDisableConfirmAgentId,
  deleteConfirmAgentId,
  setDeleteConfirmAgentId,
  selectedCompiledScopePreview,
  agentVersionHistories,
  newManualTriggerName,
  setNewManualTriggerName,
  newScheduleTriggerName,
  setNewScheduleTriggerName,
  newScheduleTriggerCron,
  setNewScheduleTriggerCron,
  newScheduleTriggerTimezone,
  setNewScheduleTriggerTimezone,
  newEventTriggerName,
  setNewEventTriggerName,
  newEventTriggerType,
  setNewEventTriggerType,
  newEventTriggerFilter,
  setNewEventTriggerFilter,
  onTestSelectedAgent,
  onReviewSelectedAgentAccess,
  onOpenEditAgentDrawer,
  onSaveSelectedAgentVersion,
  onReactivateSelectedAgent,
  onDisableSelectedAgent,
  onDeleteSelectedAgent,
  onCreateManualTrigger,
  onCreateScheduleTrigger,
  onCreateEventTrigger,
  onToggleAgentTrigger,
  onDeleteAgentTrigger,
  onRefreshSelectedAgentVersions,
  onRestoreSelectedAgentVersion,
  onRefreshSelectedAgentActivity
}) => (
  <section className="min-w-0 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm xl:sticky xl:top-6">
    <div className="border-b border-ui-border bg-status-warning-soft/35 px-4 py-4">
      <StatusBadge tone={getAgentReadinessLabel(selectedAgent) === 'Ready' ? 'success' : getAgentReadinessLabel(selectedAgent) === 'Disabled' ? 'neutral' : 'warning'}>Assignment risk</StatusBadge>
      <h2 className="mt-3 type-section-title">{selectedAgent.name}</h2>
      <p className="type-body mt-2 text-ui-text">
        {getAgentReadinessLabel(selectedAgent) === 'Ready'
          ? 'Ready for assignment. Recheck access before adding this agent to another workflow.'
          : `Review before assignment. Decide whether ${getAgentAccessClass(selectedAgent).toLowerCase()} is acceptable for the workflow envelope.`}
      </p>
    </div>

    <div className="border-b border-ui-border px-4 py-4">
      <h3 className="type-micro-label text-ui-text-muted">Why this needs review</h3>
      <div className="mt-3 grid gap-2">
        {(getAgentReviewSignals(selectedAgent).length > 0 ? getAgentReviewSignals(selectedAgent) : ['No current review signals']).map((signal) => (
          <div key={signal} className="flex items-start gap-2 text-sm font-semibold text-ui-text">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-status-warning" />
            <span>{signal}</span>
          </div>
        ))}
      </div>
    </div>

    <div className="border-b border-ui-border px-4 py-4">
      <h3 className="type-micro-label text-ui-text-muted">Capability envelope</h3>
      <dl className="mt-3 grid gap-2 text-sm">
        <div className="flex justify-between gap-3"><dt className="text-ui-text-muted">Target</dt><dd className="text-right font-semibold text-ui-text">{selectedAgent.targetScope.join(', ') || 'No target scope configured'}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-ui-text-muted">Context</dt><dd className="text-right font-semibold text-ui-text">{selectedAgent.contextScope.join(', ') || 'No context access configured'}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-ui-text-muted">Access class</dt><dd className="text-right font-semibold text-ui-text">{getAgentAccessClass(selectedAgent)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-ui-text-muted">Approval</dt><dd className="text-right font-semibold text-ui-text">{formatPolicyValue(selectedAgent.approvalPolicy.writeActions)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-ui-text-muted">Trust</dt><dd className="text-right font-semibold text-ui-text">{selectedAgent.trustPolicy.boundary}</dd></div>
      </dl>
    </div>

    <div className="border-b border-ui-border px-4 py-4">
      <h3 className="type-micro-label text-ui-text-muted">Dependency impact</h3>
      <dl className="mt-3 grid gap-2 text-sm">
        <div className="flex justify-between gap-3"><dt className="text-ui-text-muted">Workflows</dt><dd className="text-right font-semibold text-ui-text">{selectedAgent.workflowsUsingAgent.length > 0 ? selectedAgent.workflowsUsingAgent.join(', ') : 'No assigned workflows'}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-ui-text-muted">Triggers</dt><dd className="text-right font-semibold text-ui-text">{selectedAgent.triggers.length} {selectedAgent.triggers.length === 1 ? 'trigger' : 'triggers'} configured</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-ui-text-muted">Version</dt><dd className="text-right font-semibold text-ui-text">v{selectedAgent.version}</dd></div>
      </dl>
    </div>

    <div className="grid gap-2 border-b border-ui-border bg-ui-bg px-4 py-4">
      <Button type="button" variant="primary" size="md" className="w-full justify-center" onClick={onTestSelectedAgent} disabled={!canManageAgents || testingAgentId === selectedAgent.id}>
        <ICONS.Activity className="h-4 w-4" />
        {testingAgentId === selectedAgent.id ? 'Queuing readiness...' : 'Run readiness test'}
      </Button>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Button type="button" variant="secondary" size="sm" className="justify-center" onClick={onReviewSelectedAgentAccess}>Review access</Button>
        <details className="relative">
          <summary className="flex h-9 cursor-pointer list-none items-center justify-center rounded-md border border-ui-border bg-ui-surface px-3 text-sm font-semibold text-ui-text shadow-sm transition-colors hover:bg-ui-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25">More actions</summary>
          <div className="mt-2 grid gap-2 rounded-md border border-ui-border bg-ui-surface p-2">
            <Button type="button" variant="secondary" size="sm" onClick={onSaveSelectedAgentVersion} disabled={!canManageAgents || agentVersionAction === selectedAgent.id}>
              <ICONS.CheckCircle2 className="h-4 w-4" />
              {agentVersionAction === selectedAgent.id ? 'Saving version...' : 'Save version'}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => onOpenEditAgentDrawer(selectedAgent)} disabled={!canManageAgents || updatingAgentId === selectedAgent.id}>
              <ICONS.Pencil className="h-4 w-4" />
              Edit agent
            </Button>
            {selectedAgent.status === 'disabled' ? (
              <Button type="button" variant="secondary" size="sm" onClick={onReactivateSelectedAgent} disabled={!canManageAgents || updatingAgentId === selectedAgent.id}>
                <ICONS.CheckCircle2 className="h-4 w-4" />
                Reactivate agent
              </Button>
            ) : (
              <Button type="button" variant="secondary" size="sm" onClick={() => setDisableConfirmAgentId(selectedAgent.id)} disabled={!canManageAgents || updatingAgentId === selectedAgent.id}>
                <ICONS.Lock className="h-4 w-4" />
                Disable agent
              </Button>
            )}
            {selectedAgent.source === 'user' && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => setDeleteConfirmAgentId(selectedAgent.id)}
                disabled={!canManageAgents || updatingAgentId === selectedAgent.id || selectedAgent.workflowsUsingAgent.length > 0}
                title={selectedAgent.workflowsUsingAgent.length > 0 ? 'Remove this agent from workflows before deleting it.' : 'Delete this custom agent'}
              >
                <ICONS.Trash2 className="h-4 w-4" />
                Delete agent
              </Button>
            )}
          </div>
        </details>
      </div>
    </div>

    {disableConfirmAgentId === selectedAgent.id && (
      <section className="border-b border-status-warning/30 bg-status-warning-soft px-5 py-4 text-status-warning-text">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h3 className="type-panel-title">Confirm disable</h3>
            <p className="type-caption mt-2">This agent is assigned to {selectedAgent.workflowsUsingAgent.length} workflows. Those workflows may fail or need reassignment while it is disabled.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="tertiary" size="sm" onClick={() => setDisableConfirmAgentId('')}>Cancel</Button>
            <Button type="button" variant="secondary" size="sm" onClick={onDisableSelectedAgent} disabled={updatingAgentId === selectedAgent.id}>
              Confirm disable
            </Button>
          </div>
        </div>
      </section>
    )}

    {deleteConfirmAgentId === selectedAgent.id && (
      <section className="border-b border-status-danger/30 bg-status-danger-soft px-5 py-4 text-status-danger-text">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h3 className="type-panel-title">Confirm delete</h3>
            <p className="type-caption mt-2">This deletes the custom agent definition and its agent history. Workflow assignments are not changed.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="tertiary" size="sm" onClick={() => setDeleteConfirmAgentId('')}>Cancel</Button>
            <Button type="button" variant="danger" size="sm" onClick={onDeleteSelectedAgent} disabled={updatingAgentId === selectedAgent.id}>
              Delete agent
            </Button>
          </div>
        </div>
      </section>
    )}

    <details className="border-b border-ui-border bg-ui-surface">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-ui-text hover:bg-ui-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25">Open full profile</summary>
      <div className="grid gap-5 bg-ui-bg/45 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.85fr)]">
      <section id="agent-access-policy" className="min-w-0 scroll-mt-6 rounded-md border border-ui-border bg-ui-surface px-4 py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="type-panel-title">Access and policy</h3>
            <p className="type-caption mt-2 text-ui-text-muted">{selectedAgent.capabilities.length} capabilities, {selectedAgent.workflowsUsingAgent.length} workflow assignments</p>
          </div>
          <span className="type-caption font-semibold text-ui-text-muted">{selectedAgent.capabilities.length} capabilities</span>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <CapabilityList title="MCP servers" values={selectedAgent.mcpServers} />
          <CapabilityList title="Tools" values={selectedAgent.tools} />
          <CapabilityList title="Skills" values={selectedAgent.skills} />
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <TokenGroup title="Target" values={selectedAgent.targetScope} />
          <TokenGroup title="Context" values={selectedAgent.contextScope} />
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div>
            <div className="type-micro-label">Policy</div>
            <dl className="mt-2 grid gap-1 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-ui-text-muted">Sensitive</dt><dd className="font-semibold text-ui-text">{formatPolicyValue(selectedAgent.approvalPolicy.sensitiveActions)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ui-text-muted">Write</dt><dd className="font-semibold text-ui-text">{formatPolicyValue(selectedAgent.approvalPolicy.writeActions)}</dd></div>
            </dl>
          </div>
          <div>
            <div className="type-micro-label">Trust</div>
            <p className="type-caption mt-2 text-ui-text-muted">{selectedAgent.trustPolicy.boundary}</p>
            <p className="type-caption mt-1 text-ui-text-muted">{selectedAgent.trustPolicy.dataEgress}</p>
          </div>
        </div>
        <details className="mt-5 rounded-md border border-ui-border bg-ui-bg px-3 py-2">
          <summary className="cursor-pointer text-sm font-semibold text-ui-text">Show capability entries</summary>
          <div className="mt-3 overflow-hidden rounded-md border border-ui-border">
            {selectedAgent.capabilities.map((capability, index) => (
              <div key={`${capability.source}-${capability.toolId || index}`} className="grid gap-2 border-b border-ui-border bg-ui-surface p-3 text-xs font-semibold text-ui-text-muted last:border-b-0 sm:grid-cols-[7rem_1fr_5rem_7rem]">
                <span>{capability.source}</span>
                <span className="type-code truncate">{capability.toolId || capability.resourceScope}</span>
                <span>{capability.operation}</span>
                <span>{capability.requiresApproval ? 'Requires approval' : 'Approval not required'}</span>
              </div>
            ))}
          </div>
        </details>
      </section>

      <aside className="min-w-0 space-y-4">
        <section className="rounded-md border border-ui-border bg-ui-surface px-4 py-4">
          <div className="flex flex-col gap-1">
            <h3 className="type-panel-title">Profile tools</h3>
            <p className="type-caption text-ui-text-muted">Use these after assignment risk is understood.</p>
          </div>
          <div className="mt-4 type-micro-label">Workflow use</div>
          <div className="mt-3 grid gap-4">
            <div>
              <div className="type-micro-label">Used by</div>
              <div className="mt-2 grid gap-2">
                {selectedAgent.workflowsUsingAgent.length > 0
                  ? selectedAgent.workflowsUsingAgent.map((workflow) => (
                    <div key={workflow} className="flex items-center justify-between rounded-md border border-ui-border bg-ui-bg px-3 py-2">
                      <span className="text-sm font-semibold text-ui-text">{workflow}</span>
                      <StatusBadge tone="success">Active</StatusBadge>
                    </div>
                  ))
                  : <span className="type-caption text-ui-text-muted">No workflows currently assign this agent.</span>}
              </div>
            </div>
            <div className="border-t border-ui-border pt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="type-micro-label">Triggers</div>
                <div className="flex min-w-0 flex-col gap-2 sm:w-64">
                  <label className="block">
                    <span className="type-micro-label text-ui-text-muted">Manual trigger label</span>
                    <input value={newManualTriggerName} onChange={(event) => setNewManualTriggerName(event.target.value)} placeholder="Manual run" className={agentFormInputClassName} />
                  </label>
                  <Button type="button" variant="tertiary" size="sm" onClick={onCreateManualTrigger} disabled={!canManageAgents || agentTriggerAction === `${selectedAgent.id}:create`}>Add manual trigger</Button>
                </div>
              </div>
              <div className="mt-3 rounded-md border border-ui-border bg-ui-bg px-3 py-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block">
                    <span className="type-micro-label text-ui-text-muted">Scheduled trigger label</span>
                    <input value={newScheduleTriggerName} onChange={(event) => setNewScheduleTriggerName(event.target.value)} placeholder="Nightly check" className={agentFormInputClassName} />
                  </label>
                  <label className="block">
                    <span className="type-micro-label text-ui-text-muted">Cron schedule</span>
                    <input value={newScheduleTriggerCron} onChange={(event) => setNewScheduleTriggerCron(event.target.value)} placeholder="0 9 * * 1-5" className={agentFormInputClassName} />
                  </label>
                  <label className="block">
                    <span className="type-micro-label text-ui-text-muted">Timezone</span>
                    <input value={newScheduleTriggerTimezone} onChange={(event) => setNewScheduleTriggerTimezone(event.target.value)} placeholder="UTC" className={agentFormInputClassName} />
                  </label>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button type="button" variant="tertiary" size="sm" onClick={onCreateScheduleTrigger} disabled={!canManageAgents || !newScheduleTriggerCron.trim() || agentTriggerAction === `${selectedAgent.id}:schedule`}>Add scheduled trigger</Button>
                </div>
              </div>
              <div className="mt-3 rounded-md border border-ui-border bg-ui-bg px-3 py-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="type-micro-label text-ui-text-muted">Event trigger label</span>
                    <input value={newEventTriggerName} onChange={(event) => setNewEventTriggerName(event.target.value)} placeholder="Deployment webhook" className={agentFormInputClassName} />
                  </label>
                  <label className="block">
                    <span className="type-micro-label text-ui-text-muted">Event type</span>
                    <Select<EventTriggerType>
                      value={newEventTriggerType}
                      options={eventTriggerTypeOptions}
                      onChange={setNewEventTriggerType}
                      className="mt-2"
                      ariaLabel="Event type"
                    />
                  </label>
                </div>
                <label className="mt-3 block">
                  <span className="type-micro-label text-ui-text-muted">Event filter JSON</span>
                  <textarea value={newEventTriggerFilter} onChange={(event) => setNewEventTriggerFilter(event.target.value)} placeholder='{"eventType":"deployment.completed"}' className={agentFormTextareaClassName} />
                </label>
                <div className="mt-3 flex justify-end">
                  <Button type="button" variant="tertiary" size="sm" onClick={onCreateEventTrigger} disabled={!canManageAgents || agentTriggerAction === `${selectedAgent.id}:event`}>Add event trigger</Button>
                </div>
              </div>
              <div className="mt-2 grid gap-2">
                {selectedAgent.triggers.length > 0
                  ? selectedAgent.triggers.map((trigger) => (
                    <div key={trigger.id} className="grid gap-3 rounded-md border border-ui-border bg-ui-bg px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <span className="text-sm font-semibold text-ui-text">{trigger.name || trigger.type.replaceAll('_', ' ')}</span>
                      <span className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <StatusBadge tone={trigger.enabled ? 'success' : 'neutral'}>{formatAgentDisplayValue(trigger.enabled ? 'enabled' : 'disabled')}</StatusBadge>
                        <Button type="button" variant="tertiary" size="sm" onClick={() => onToggleAgentTrigger(trigger)} disabled={!canManageAgents || agentTriggerAction === `${selectedAgent.id}:${trigger.id}`}>
                          {trigger.enabled ? 'Disable' : 'Enable'}
                        </Button>
                        <Button type="button" variant="tertiary" size="sm" onClick={() => onDeleteAgentTrigger(trigger)} disabled={!canManageAgents || agentTriggerAction === `${selectedAgent.id}:${trigger.id}`}>
                          Delete
                        </Button>
                      </span>
                    </div>
                  ))
                  : <span className="type-caption text-ui-text-muted">No triggers configured for this agent.</span>}
              </div>
            </div>
          </div>
        </section>

        <section className="min-w-0 rounded-md border border-ui-border bg-ui-surface px-4 py-4">
          <div className="mb-4 rounded-md border border-ui-border bg-ui-bg px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="type-panel-title">Version history</h3>
              <Button type="button" variant="tertiary" size="sm" onClick={onRefreshSelectedAgentVersions} disabled={agentVersionAction === `${selectedAgent.id}:history`}>Refresh versions</Button>
            </div>
            <div className="mt-3 grid gap-2">
              {(agentVersionHistories[selectedAgent.id] || []).slice(0, 4).map((version) => (
                <div key={version.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-ui-border bg-ui-surface px-3 py-2">
                  <span className="text-sm font-semibold text-ui-text">v{version.version}</span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="type-caption text-ui-text-muted">{version.createdAt}</span>
                    <Button
                      type="button"
                      variant="tertiary"
                      size="sm"
                      onClick={() => onRestoreSelectedAgentVersion(version)}
                      disabled={!canManageAgents || agentVersionAction === `${selectedAgent.id}:restore:${version.id}`}
                    >
                      Restore
                    </Button>
                  </span>
                </div>
              ))}
              {(agentVersionHistories[selectedAgent.id] || []).length === 0 && (
                <span className="type-caption text-ui-text-muted">No saved version snapshots yet.</span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="type-panel-title">Recent activity</h3>
            <Button type="button" variant="tertiary" size="sm" onClick={onRefreshSelectedAgentActivity} disabled={agentActivityAction === selectedAgent.id}>Refresh activity</Button>
          </div>
          {selectedCompiledScopePreview && (
            <div className="mt-3 rounded-md border border-ui-border bg-ui-bg px-3 py-3">
              <div className="type-micro-label">Compiled scope preview</div>
              <p className="type-caption mt-1 text-ui-text-muted">Server-compiled access from the latest readiness test.</p>
              <pre className="type-code mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-ui-surface px-3 py-2 text-xs text-ui-text-muted custom-scrollbar">
                {JSON.stringify(selectedCompiledScopePreview, null, 2)}
              </pre>
            </div>
          )}
          <div className="mt-3 grid gap-2">
            {selectedAgent.auditHistory.slice(0, 3).map((entry) => (
              <div key={entry.id} className="rounded-md border border-ui-border bg-ui-bg px-3 py-2">
                <div className="text-sm font-semibold text-ui-text">{entry.summary}</div>
                <div className="type-caption mt-1 text-ui-text-muted">{entry.occurredAt}</div>
              </div>
            ))}
          </div>
        </section>
      </aside>
      </div>
    </details>
  </section>
);
