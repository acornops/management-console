import React from 'react';
import { Button } from '@/components/common/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ICONS } from '@/constants';
import { getAgentDecisionSummary, getAgentReadinessLabel, type AgentDefinition } from '@/pages/agents/agentModel';
import type { AgentVersionSnapshotApi } from '@/services/control-plane/agentApi';
import {
  CapabilityList,
  formatAgentTimestamp,
  formatPolicyValue
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
  disableConfirmAgentId: string;
  setDisableConfirmAgentId: React.Dispatch<React.SetStateAction<string>>;
  deleteConfirmAgentId: string;
  setDeleteConfirmAgentId: React.Dispatch<React.SetStateAction<string>>;
  agentVersionHistories: Record<string, AgentVersionSnapshotApi[]>;
  onTestSelectedAgent: () => void;
  onOpenEditAgentDrawer: (agent: AgentDefinition) => void;
  onSaveSelectedAgentVersion: () => void;
  onReactivateSelectedAgent: () => void;
  onDisableSelectedAgent: () => void;
  onDeleteSelectedAgent: () => void;
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
  disableConfirmAgentId,
  setDisableConfirmAgentId,
  deleteConfirmAgentId,
  setDeleteConfirmAgentId,
  agentVersionHistories,
  onTestSelectedAgent,
  onOpenEditAgentDrawer,
  onSaveSelectedAgentVersion,
  onReactivateSelectedAgent,
  onDisableSelectedAgent,
  onDeleteSelectedAgent,
  onRefreshSelectedAgentVersions,
  onRestoreSelectedAgentVersion,
  onRefreshSelectedAgentActivity
}) => {
  const readiness = getAgentReadinessLabel(selectedAgent);
  const decisionSummary = getAgentDecisionSummary(selectedAgent);

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
          <Button type="button" variant="secondary" size="sm" onClick={onTestSelectedAgent} disabled={!canManageAgents || testingAgentId === selectedAgent.id}>
            <ICONS.Activity className="h-4 w-4" />
            {testingAgentId === selectedAgent.id ? 'Queuing...' : 'Run readiness'}
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={() => onOpenEditAgentDrawer(selectedAgent)} disabled={!canManageAgents || updatingAgentId === selectedAgent.id}>
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
        </div>
      </div>
    </div>

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
            <p className="type-caption mt-2">This deletes the custom agent definition and its agent history.</p>
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

    <details className="border-b border-ui-border bg-ui-surface" open>
      <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-ui-text hover:bg-ui-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25">Configuration</summary>
      <div className="grid gap-6 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
      <section className="min-w-0">
        <h3 className="type-panel-title">Capabilities</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <CapabilityList title="MCP servers" values={selectedAgent.mcpServers} />
          <CapabilityList title="Tools" values={selectedAgent.tools} />
          <CapabilityList title="Skills" values={selectedAgent.skills} />
        </div>
        <div className="mt-5 border-t border-ui-border pt-5">
          <div className="min-w-0">
            <div className="type-micro-label">Policy</div>
            <dl className="mt-2 grid gap-1 text-sm">
              <div className="flex min-w-0 justify-between gap-3"><dt className="text-ui-text-muted">Sensitive</dt><dd className="min-w-0 break-words text-right font-semibold text-ui-text">{formatPolicyValue(selectedAgent.approvalPolicy.sensitiveActions)}</dd></div>
              <div className="flex min-w-0 justify-between gap-3"><dt className="text-ui-text-muted">Write</dt><dd className="min-w-0 break-words text-right font-semibold text-ui-text">{formatPolicyValue(selectedAgent.approvalPolicy.writeActions)}</dd></div>
            </dl>
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
