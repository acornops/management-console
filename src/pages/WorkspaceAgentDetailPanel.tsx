import React from 'react';
import { Button } from '@/components/common/Button';
import { Textarea, TextInput } from '@/components/common/ComponentVocabulary';
import { Select } from '@/components/common/Select';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ICONS } from '@/constants';
import { getAgentAccessClass, getAgentDecisionSummary, getAgentNextActionLabel, getAgentReadinessLabel, getAgentReviewSignals, type AgentDefinition } from '@/pages/agents/agentModel';
import type { AgentTriggerDefinitionApi, AgentVersionSnapshotApi } from '@/services/control-plane/agentApi';
import {
  CapabilityList,
  TokenGroup,
  eventTriggerTypeOptions,
  formatAgentTimestamp,
  formatAgentDisplayValue,
  formatPolicyValue,
  type EventTriggerType
} from '@/pages/WorkspaceAgentsPage.helpers';

interface WorkspaceAgentDetailPanelProps {
  selectedAgent: AgentDefinition;
  chrome?: 'rail' | 'drawer';
  titleId?: string;
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
  chrome = 'rail',
  titleId,
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
}) => {
  const readiness = getAgentReadinessLabel(selectedAgent);
  const decisionSummary = getAgentDecisionSummary(selectedAgent);
  const nextActionLabel = getAgentNextActionLabel(selectedAgent);
  const actionSignals = getAgentReviewSignals(selectedAgent);

  return (
  <section className={chrome === 'drawer' ? 'min-w-0 bg-ui-surface' : 'min-w-0 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm xl:sticky xl:top-6'}>
    <div className={`border-b border-ui-border bg-status-warning-soft/35 px-5 py-4 ${chrome === 'drawer' ? 'pr-16' : ''}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={readiness === 'Ready' ? 'success' : readiness === 'Disabled' ? 'neutral' : 'warning'}>{readiness}</StatusBadge>
            <span className="type-caption font-semibold text-ui-text-muted">v{selectedAgent.version}</span>
          </div>
          <h2 id={titleId} className="mt-2 type-section-title">{selectedAgent.name}</h2>
          <p className="type-caption mt-1 max-w-3xl text-ui-text-muted">{selectedAgent.description}</p>
          <p className="type-caption mt-2 max-w-3xl break-words font-semibold text-ui-text [overflow-wrap:anywhere]">{decisionSummary.line}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
          <Button type="button" variant="primary" size="sm" onClick={() => onOpenEditAgentDrawer(selectedAgent)} disabled={!canManageAgents || updatingAgentId === selectedAgent.id}>
            <ICONS.Pencil className="h-4 w-4" />
            Edit agent
          </Button>
          <Button type="button" variant="tertiary" size="sm" onClick={onReviewSelectedAgentAccess}>Access</Button>
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
        </div>
      </div>
    </div>

    <div className="grid border-b border-ui-border lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
      <section className="border-b border-ui-border px-5 py-4 lg:border-b-0 lg:border-r">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="type-micro-label text-ui-text-muted">Can this agent run safely?</h3>
            <p className="mt-2 text-sm font-semibold text-ui-text">{nextActionLabel}</p>
            <p className="type-caption mt-1 break-words text-ui-text-muted [overflow-wrap:anywhere]">{decisionSummary.line}</p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={onTestSelectedAgent} disabled={!canManageAgents || testingAgentId === selectedAgent.id}>
            <ICONS.Activity className="h-4 w-4" />
            {testingAgentId === selectedAgent.id ? 'Queuing...' : 'Run readiness'}
          </Button>
        </div>
        <div className="mt-4">
          <div className="type-micro-label text-ui-text-muted">Before assignment</div>
          <div className="mt-2 grid gap-2">
            {(actionSignals.length > 0 ? actionSignals : ['No blockers before assignment']).map((signal) => (
              <div key={signal} className="rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-sm">
                <span className="font-semibold text-ui-text">{signal}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-4">
        <h3 className="type-micro-label text-ui-text-muted">Assignment impact</h3>
        <dl className="mt-3 grid gap-2 text-sm">
          <div className="flex min-w-0 justify-between gap-3"><dt className="text-ui-text-muted">Workflow</dt><dd className="min-w-0 break-words text-right font-semibold text-ui-text [overflow-wrap:anywhere]">{selectedAgent.workflowsUsingAgent.length > 0 ? selectedAgent.workflowsUsingAgent.join(', ') : 'No assigned workflows'}</dd></div>
          <div className="flex min-w-0 justify-between gap-3"><dt className="text-ui-text-muted">Triggers</dt><dd className="font-semibold text-ui-text">{selectedAgent.triggers.length} configured</dd></div>
          <div className="flex min-w-0 justify-between gap-3"><dt className="text-ui-text-muted">Version</dt><dd className="font-semibold text-ui-text">v{selectedAgent.version}</dd></div>
          <div className="flex min-w-0 justify-between gap-3"><dt className="text-ui-text-muted">Trust</dt><dd className="min-w-0 break-words text-right font-semibold text-ui-text [overflow-wrap:anywhere]">{selectedAgent.trustPolicy.boundary}</dd></div>
        </dl>
      </section>
    </div>

    <section id="agent-access-policy" tabIndex={-1} className="scroll-mt-6 border-b border-ui-border px-5 py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25">
      <h3 className="type-micro-label text-ui-text-muted">Access evidence</h3>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div className="grid gap-1"><dt className="text-ui-text-muted">Targets</dt><dd className="break-words font-semibold text-ui-text [overflow-wrap:anywhere]">{selectedAgent.targetScope.join(', ') || 'No target scope configured'}</dd></div>
        <div className="grid gap-1"><dt className="text-ui-text-muted">Data</dt><dd className="break-words font-semibold text-ui-text [overflow-wrap:anywhere]">{selectedAgent.contextScope.join(', ') || 'No data sources selected'}</dd></div>
        <div className="grid gap-1"><dt className="text-ui-text-muted">Access class</dt><dd className="break-words font-semibold text-ui-text [overflow-wrap:anywhere]">{getAgentAccessClass(selectedAgent)}</dd></div>
        <div className="grid gap-1"><dt className="text-ui-text-muted">Approval</dt><dd className="font-semibold text-ui-text">{formatPolicyValue(selectedAgent.approvalPolicy.writeActions)}</dd></div>
      </dl>
    </section>

    {selectedAgent.source === 'user' && (
      <section className="border-b border-ui-border px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h3 className="type-panel-title">Lifecycle</h3>
            <p className="type-caption mt-1 text-ui-text-muted">
              Delete is available only after this custom agent is removed from workflows.
            </p>
          </div>
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
        </div>
      </section>
    )}

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
      <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-ui-text hover:bg-ui-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25">Manage agent</summary>
      <div className="grid gap-6 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
      <section className="min-w-0">
        <h3 className="type-panel-title">Access and capabilities</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <CapabilityList title="MCP servers" values={selectedAgent.mcpServers} />
          <CapabilityList title="Tools" values={selectedAgent.tools} />
          <CapabilityList title="Skills" values={selectedAgent.skills} />
        </div>
        <div className="mt-5 grid gap-4 border-t border-ui-border pt-5 lg:grid-cols-2">
          <TokenGroup title="Target" values={selectedAgent.targetScope} />
          <TokenGroup title="Context" values={selectedAgent.contextScope} />
        </div>
        <div className="mt-5 grid gap-4 border-t border-ui-border pt-5 lg:grid-cols-2">
          <div className="min-w-0">
            <div className="type-micro-label">Policy</div>
            <dl className="mt-2 grid gap-1 text-sm">
              <div className="flex min-w-0 justify-between gap-3"><dt className="text-ui-text-muted">Sensitive</dt><dd className="min-w-0 break-words text-right font-semibold text-ui-text">{formatPolicyValue(selectedAgent.approvalPolicy.sensitiveActions)}</dd></div>
              <div className="flex min-w-0 justify-between gap-3"><dt className="text-ui-text-muted">Write</dt><dd className="min-w-0 break-words text-right font-semibold text-ui-text">{formatPolicyValue(selectedAgent.approvalPolicy.writeActions)}</dd></div>
            </dl>
          </div>
          <div className="min-w-0">
            <div className="type-micro-label">Trust</div>
            <p className="type-caption mt-2 break-words text-ui-text-muted [overflow-wrap:anywhere]">{selectedAgent.trustPolicy.boundary}</p>
            <p className="type-caption mt-1 break-words text-ui-text-muted [overflow-wrap:anywhere]">{selectedAgent.trustPolicy.dataEgress}</p>
          </div>
        </div>
        <details className="mt-5 border-t border-ui-border pt-5">
          <summary className="cursor-pointer text-sm font-semibold text-ui-text hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25">Capability rules</summary>
          <div className="mt-3 divide-y divide-ui-border overflow-hidden rounded-md border border-ui-border">
            {selectedAgent.capabilities.map((capability, index) => (
              <div key={`${capability.source}-${capability.toolId || index}`} className="grid min-w-0 gap-2 bg-ui-surface p-3 text-xs font-semibold text-ui-text-muted sm:grid-cols-[7rem_minmax(0,1fr)_5rem_7rem]">
                <span className="min-w-0 break-words">{capability.source}</span>
                <span className="type-code min-w-0 break-words [overflow-wrap:anywhere]">{capability.toolId || capability.resourceScope}</span>
                <span className="min-w-0 break-words">{capability.operation}</span>
                <span className="min-w-0 break-words">{capability.requiresApproval ? 'Requires approval' : 'Approval not required'}</span>
              </div>
            ))}
          </div>
        </details>
      </section>

      <aside className="min-w-0 space-y-6 border-t border-ui-border pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
        <section className="min-w-0">
          <div>
            <h3 className="type-panel-title">Workflow controls</h3>
          </div>
          <div className="mt-4 type-micro-label">Workflow assignments</div>
          <div className="mt-3 grid gap-4">
            <div>
              <div className="grid gap-2">
                {selectedAgent.workflowsUsingAgent.length > 0
                  ? selectedAgent.workflowsUsingAgent.map((workflow) => (
                    <div key={workflow} className="flex min-w-0 items-center justify-between gap-3 rounded-md bg-ui-bg px-3 py-2">
                      <span className="min-w-0 break-words text-sm font-semibold text-ui-text [overflow-wrap:anywhere]">{workflow}</span>
                      <StatusBadge tone="success">Active</StatusBadge>
                    </div>
                  ))
                  : <span className="type-caption text-ui-text-muted">No workflows use this agent yet.</span>}
              </div>
            </div>
            <div className="border-t border-ui-border pt-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="type-micro-label">Triggers</div>
                <div className="flex min-w-0 flex-col gap-2 sm:w-64">
                  <label className="block">
                    <span className="type-micro-label text-ui-text-muted">Manual trigger label</span>
                    <TextInput value={newManualTriggerName} onChange={(event) => setNewManualTriggerName(event.target.value)} placeholder="Manual run" className="mt-2" />
                  </label>
                  <Button type="button" variant="tertiary" size="sm" onClick={onCreateManualTrigger} disabled={!canManageAgents || agentTriggerAction === `${selectedAgent.id}:create`}>Add manual trigger</Button>
                </div>
              </div>
              <div className="mt-4 border-t border-ui-border pt-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block">
                    <span className="type-micro-label text-ui-text-muted">Scheduled trigger label</span>
                    <TextInput value={newScheduleTriggerName} onChange={(event) => setNewScheduleTriggerName(event.target.value)} placeholder="Nightly check" className="mt-2" />
                  </label>
                  <label className="block">
                    <span className="type-micro-label text-ui-text-muted">Cron schedule</span>
                    <TextInput value={newScheduleTriggerCron} onChange={(event) => setNewScheduleTriggerCron(event.target.value)} placeholder="0 9 * * 1-5" className="mt-2" />
                  </label>
                  <label className="block">
                    <span className="type-micro-label text-ui-text-muted">Timezone</span>
                    <TextInput value={newScheduleTriggerTimezone} onChange={(event) => setNewScheduleTriggerTimezone(event.target.value)} placeholder="UTC" className="mt-2" />
                  </label>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button type="button" variant="tertiary" size="sm" onClick={onCreateScheduleTrigger} disabled={!canManageAgents || !newScheduleTriggerCron.trim() || agentTriggerAction === `${selectedAgent.id}:schedule`}>Add scheduled trigger</Button>
                </div>
              </div>
              <div className="mt-4 border-t border-ui-border pt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="type-micro-label text-ui-text-muted">Event trigger label</span>
                    <TextInput value={newEventTriggerName} onChange={(event) => setNewEventTriggerName(event.target.value)} placeholder="Deployment webhook" className="mt-2" />
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
                  <Textarea value={newEventTriggerFilter} onChange={(event) => setNewEventTriggerFilter(event.target.value)} placeholder='{"eventType":"deployment.completed"}' className="mt-2" />
                </label>
                <div className="mt-3 flex justify-end">
                  <Button type="button" variant="tertiary" size="sm" onClick={onCreateEventTrigger} disabled={!canManageAgents || agentTriggerAction === `${selectedAgent.id}:event`}>Add event trigger</Button>
                </div>
              </div>
              <div className="mt-4 grid gap-2 border-t border-ui-border pt-4">
                {selectedAgent.triggers.length > 0
                  ? selectedAgent.triggers.map((trigger) => (
                    <div key={trigger.id} className="grid min-w-0 gap-3 rounded-md bg-ui-bg px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <span className="min-w-0 break-words text-sm font-semibold text-ui-text [overflow-wrap:anywhere]">{trigger.name || trigger.type.replaceAll('_', ' ')}</span>
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
                  : <span className="type-caption text-ui-text-muted">No triggers run this agent yet.</span>}
              </div>
            </div>
          </div>
        </section>

        <section className="min-w-0 border-t border-ui-border pt-5">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="type-panel-title">Version history</h3>
                <p className="type-caption mt-1 text-ui-text-muted">Snapshot creates a rollback point for this definition.</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={onSaveSelectedAgentVersion} disabled={!canManageAgents || agentVersionAction === selectedAgent.id}>
                  {agentVersionAction === selectedAgent.id ? 'Saving...' : 'Save snapshot'}
                </Button>
                <Button type="button" variant="tertiary" size="sm" onClick={onRefreshSelectedAgentVersions} disabled={agentVersionAction === `${selectedAgent.id}:history`}>Refresh</Button>
              </div>
            </div>
            <div className="mt-3 grid gap-2">
              {(agentVersionHistories[selectedAgent.id] || []).slice(0, 4).map((version) => (
                <div key={version.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-md bg-ui-bg px-3 py-2">
                  <span className="min-w-0 break-words text-sm font-semibold text-ui-text">v{version.version}</span>
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="type-caption min-w-0 break-words text-ui-text-muted [overflow-wrap:anywhere]">{formatAgentTimestamp(version.createdAt)}</span>
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
        </section>

        <section className="min-w-0 border-t border-ui-border pt-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="type-panel-title">Recent activity</h3>
            <Button type="button" variant="tertiary" size="sm" onClick={onRefreshSelectedAgentActivity} disabled={agentActivityAction === selectedAgent.id}>Refresh activity</Button>
          </div>
          {selectedCompiledScopePreview && (
            <div className="mt-4 border-t border-ui-border pt-4">
              <div className="type-micro-label">Readiness scope preview</div>
              <p className="type-caption mt-1 text-ui-text-muted">Access returned by the last readiness test.</p>
              <pre className="type-code mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-ui-bg px-3 py-2 text-xs text-ui-text-muted [overflow-wrap:anywhere] custom-scrollbar">
                {JSON.stringify(selectedCompiledScopePreview, null, 2)}
              </pre>
            </div>
          )}
          <div className="mt-3 grid gap-2">
            {selectedAgent.auditHistory.slice(0, 3).map((entry) => (
              <div key={entry.id} className="min-w-0 rounded-md bg-ui-bg px-3 py-2">
                <div className="min-w-0 break-words text-sm font-semibold text-ui-text [overflow-wrap:anywhere]">{entry.summary}</div>
                <div className="type-caption mt-1 min-w-0 break-words text-ui-text-muted [overflow-wrap:anywhere]">{formatAgentTimestamp(entry.occurredAt)}</div>
              </div>
            ))}
          </div>
        </section>
      </aside>
      </div>
    </details>
  </section>
  );
};
