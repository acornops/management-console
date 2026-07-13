import React from 'react';
import { Button } from '@/components/common/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ICONS } from '@/constants';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import type { AgentVersionSnapshotApi } from '@/services/control-plane/agentApi';
import { CapabilityList, formatAgentDisplayValue, formatAgentTimestamp, formatPolicyValue, statusTone } from '@/pages/WorkspaceAgentsPage.helpers';
import { AppPaths } from '@/utils/routes';

export type AgentProfileTab = 'overview' | 'capabilities' | 'activity' | 'versions';

export const agentProfileTabs: AgentProfileTab[] = ['overview', 'capabilities', 'activity', 'versions'];

interface WorkspaceAgentDetailPanelProps {
  selectedAgent: AgentDefinition;
  activeTab: AgentProfileTab;
  onTabChange: (tab: AgentProfileTab) => void;
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

const tabLabels: Record<AgentProfileTab, string> = {
  overview: 'Overview', capabilities: 'Capabilities', activity: 'Activity', versions: 'Versions'
};

const workflowHref = (agent: AgentDefinition, workflow: string) => `${AppPaths.workspaceWorkflows(agent.workspaceId)}?${new URLSearchParams({ q: workflow }).toString()}`;

const Fact: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="min-w-0 py-3">
    <dt className="type-micro-label text-ui-text-muted">{label}</dt>
    <dd className="mt-1 min-w-0 break-words text-sm font-semibold text-ui-text">{value}</dd>
  </div>
);

export const WorkspaceAgentDetailPanel: React.FC<WorkspaceAgentDetailPanelProps> = (props) => {
  const { selectedAgent } = props;
  const disabledAction = !props.canManageAgents ? 'You need manage_agents permission to change this agent.' : '';
  const versions = props.agentVersionHistories[selectedAgent.id] || [];

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-ui-surface">
      <header className={`border-b border-ui-border px-5 py-5 pr-16 ${selectedAgent.status === 'disabled' ? 'bg-status-danger-soft/35' : selectedAgent.status === 'draft' ? 'bg-status-warning-soft/30' : 'bg-ui-surface'}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={statusTone(selectedAgent.status)}>{formatAgentDisplayValue(selectedAgent.status)}</StatusBadge>
              <span className="type-caption font-semibold text-ui-text-muted">v{selectedAgent.version}</span>
            </div>
            <h2 id={props.titleId} className="mt-2 type-section-title">{selectedAgent.name}</h2>
            <p className="type-caption mt-1 max-w-3xl text-ui-text-muted">{selectedAgent.description}</p>
            {selectedAgent.status === 'disabled' && <p className="type-caption mt-2 font-semibold text-status-danger-text">This agent cannot be selected for new assignments while disabled.</p>}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 sm:pr-8">
            {selectedAgent.status === 'disabled' && <Button type="button" variant="secondary" size="sm" onClick={props.onReactivateSelectedAgent} disabled={!props.canManageAgents || props.updatingAgentId === selectedAgent.id}>Reactivate</Button>}
            <Button type="button" variant="primary" size="sm" onClick={() => props.onOpenEditAgentDrawer(selectedAgent)} disabled={!props.canManageAgents || props.updatingAgentId === selectedAgent.id}><ICONS.Pencil className="h-4 w-4" />Edit agent</Button>
          </div>
        </div>
        {disabledAction && <p className="type-caption mt-3 text-ui-text-muted">{disabledAction}</p>}
      </header>

      <div role="tablist" aria-label="Agent profile sections" className="flex min-w-0 overflow-x-auto border-b border-ui-border px-3">
        {agentProfileTabs.map((tab) => (
          <button key={tab} type="button" role="tab" aria-selected={props.activeTab === tab} onClick={() => props.onTabChange(tab)} className={`min-h-11 whitespace-nowrap border-b-2 px-3 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${props.activeTab === tab ? 'border-accent text-ui-text' : 'border-transparent text-ui-text-muted hover:text-ui-text'}`}>{tabLabels[tab]}</button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
        {props.activeTab === 'overview' && (
          <div className="space-y-7">
            <section>
              <h3 className="type-panel-title">Identity and assignment</h3>
              <dl className="mt-2 grid divide-y divide-ui-border sm:grid-cols-2 sm:gap-x-8 sm:[&>*]:border-b sm:[&>*]:border-ui-border">
                <Fact label="Owner" value={selectedAgent.owner} />
                <Fact label="Status" value={formatAgentDisplayValue(selectedAgent.status)} />
                <Fact label="Provider" value={formatAgentDisplayValue(selectedAgent.providerType)} />
                <Fact label="Last activity" value={formatAgentTimestamp(selectedAgent.activity.lastRunAt, 'No activity yet')} />
              </dl>
            </section>
            <section className="border-t border-ui-border pt-6">
              <h3 className="type-panel-title">Assigned workflows</h3>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                {selectedAgent.workflowsUsingAgent.length ? selectedAgent.workflowsUsingAgent.map((workflow) => <a key={workflow} href={workflowHref(selectedAgent, workflow)} className="text-sm font-semibold text-accent-strong underline-offset-4 hover:underline">{workflow}</a>) : <span className="type-caption text-ui-text-muted">No assigned workflows.</span>}
              </div>
            </section>
            <section className="border-t border-ui-border pt-6">
              <h3 className="type-panel-title">Scope and policy</h3>
              <dl className="mt-2 grid divide-y divide-ui-border sm:grid-cols-2 sm:gap-x-8 sm:[&>*]:border-b sm:[&>*]:border-ui-border">
                <Fact label="Target scope" value={selectedAgent.targetScope.join(', ') || 'No target scope'} />
                <Fact label="Context scope" value={selectedAgent.contextScope.join(', ') || 'No context scope'} />
                <Fact label="Write actions" value={formatPolicyValue(selectedAgent.approvalPolicy.writeActions)} />
                <Fact label="Sensitive actions" value={formatPolicyValue(selectedAgent.approvalPolicy.sensitiveActions)} />
                <Fact label="Trust boundary" value={selectedAgent.trustPolicy.boundary} />
                <Fact label="Data access" value={selectedAgent.trustPolicy.dataEgress} />
              </dl>
            </section>
          </div>
        )}

        {props.activeTab === 'capabilities' && (
          <div className="space-y-7">
            <section className="grid gap-6 sm:grid-cols-3"><CapabilityList title="MCP servers" values={selectedAgent.mcpServers} /><CapabilityList title="Tools" values={selectedAgent.tools} /><CapabilityList title="Skills" values={selectedAgent.skills} /></section>
            <section className="border-t border-ui-border pt-6">
              <h3 className="type-panel-title">Detailed rules</h3>
              <div className="mt-3 divide-y divide-ui-border border-y border-ui-border">
                {selectedAgent.capabilities.map((capability, index) => <div key={`${capability.source}-${capability.toolId || index}`} className="grid gap-2 py-3 text-sm sm:grid-cols-[8rem_minmax(0,1fr)_6rem_9rem]"><span className="font-semibold text-ui-text">{capability.source}</span><span className="type-code break-words text-ui-text-muted">{capability.toolId || capability.resourceScope}</span><span>{capability.operation}</span><span>{capability.requiresApproval ? 'Approval required' : 'No approval'}</span></div>)}
              </div>
            </section>
          </div>
        )}

        {props.activeTab === 'activity' && (
          <section>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="type-panel-title">Activity history</h3><p className="type-caption mt-1 text-ui-text-muted">Agent runs use the same durable execution and approval path as workflow steps.</p></div>
              <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" size="sm" onClick={props.onRefreshSelectedAgentActivity} disabled={props.agentActivityAction === selectedAgent.id}>{props.agentActivityAction === selectedAgent.id ? 'Refreshing...' : 'Refresh'}</Button><Button type="button" variant="secondary" size="sm" onClick={props.onTestSelectedAgent} disabled={!props.canManageAgents || props.testingAgentId === selectedAgent.id}><ICONS.Activity className="h-4 w-4" />{props.testingAgentId === selectedAgent.id ? 'Queuing...' : 'Run agent'}</Button></div>
            </div>
            <ol className="mt-4 divide-y divide-ui-border border-y border-ui-border">
              {selectedAgent.auditHistory.length ? selectedAgent.auditHistory.map((entry) => <li key={entry.id} className="grid gap-1 py-3 sm:grid-cols-[11rem_minmax(0,1fr)]"><time className="type-caption font-semibold text-ui-text-muted">{formatAgentTimestamp(entry.occurredAt)}</time><span className="text-sm font-semibold text-ui-text">{entry.summary}</span></li>) : <li className="py-5 text-sm text-ui-text-muted">No activity records yet.</li>}
            </ol>
          </section>
        )}

        {props.activeTab === 'versions' && (
          <section>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="type-panel-title">Version snapshots</h3><p className="type-caption mt-1 text-ui-text-muted">Restore replaces the current definition after confirmation.</p></div><div className="flex gap-2"><Button type="button" variant="secondary" size="sm" onClick={props.onSaveSelectedAgentVersion} disabled={!props.canManageAgents || props.agentVersionAction === selectedAgent.id}>{props.agentVersionAction === selectedAgent.id ? 'Saving...' : 'Save snapshot'}</Button><Button type="button" variant="tertiary" size="sm" onClick={props.onRefreshSelectedAgentVersions} disabled={props.agentVersionAction === `${selectedAgent.id}:history`}>Refresh</Button></div></div>
            <div className="mt-4 divide-y divide-ui-border border-y border-ui-border">{versions.length ? versions.map((version) => <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><span><strong className="text-sm text-ui-text">v{version.version}</strong><span className="type-caption ml-3 text-ui-text-muted">{formatAgentTimestamp(version.createdAt)}</span></span><Button type="button" variant="tertiary" size="sm" onClick={() => window.confirm(`Restore v${version.version}? This replaces the current agent definition.`) && props.onRestoreSelectedAgentVersion(version)} disabled={!props.canManageAgents || props.agentVersionAction === `${selectedAgent.id}:restore:${version.id}`}>Restore</Button></div>) : <p className="py-5 text-sm text-ui-text-muted">No version snapshots yet.</p>}</div>
          </section>
        )}

        <section className="mt-10 border-t border-status-danger/30 pt-6">
          <h3 className="type-panel-title text-status-danger-text">Danger zone</h3>
          <p className="type-caption mt-1 text-ui-text-muted">This agent is assigned to {selectedAgent.workflowsUsingAgent.length} {selectedAgent.workflowsUsingAgent.length === 1 ? 'workflow' : 'workflows'}.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedAgent.status !== 'disabled' && <Button type="button" variant="secondary" size="sm" onClick={() => props.setDisableConfirmAgentId(selectedAgent.id)} disabled={!props.canManageAgents || props.updatingAgentId === selectedAgent.id}>Disable agent</Button>}
            {selectedAgent.source === 'user' && <Button type="button" variant="danger" size="sm" onClick={() => props.setDeleteConfirmAgentId(selectedAgent.id)} disabled={!props.canManageAgents || props.updatingAgentId === selectedAgent.id || selectedAgent.workflowsUsingAgent.length > 0}>Delete agent</Button>}
          </div>
          {selectedAgent.source === 'user' && selectedAgent.workflowsUsingAgent.length > 0 && <p className="type-caption mt-2 text-status-danger-text">Remove this agent from its workflows before deleting it.</p>}
          {props.disableConfirmAgentId === selectedAgent.id && <div role="alertdialog" aria-label="Confirm disable agent" className="mt-4 rounded-md border border-status-warning/30 bg-status-warning-soft p-3 text-status-warning-text"><p className="text-sm font-semibold">Disabling may interrupt {selectedAgent.workflowsUsingAgent.length} assigned workflows.</p><div className="mt-3 flex gap-2"><Button variant="tertiary" size="sm" onClick={() => props.setDisableConfirmAgentId('')}>Cancel</Button><Button variant="secondary" size="sm" onClick={props.onDisableSelectedAgent}>Confirm disable</Button></div></div>}
          {props.deleteConfirmAgentId === selectedAgent.id && <div role="alertdialog" aria-label="Confirm delete agent" className="mt-4 rounded-md border border-status-danger/30 bg-status-danger-soft p-3 text-status-danger-text"><p className="text-sm font-semibold">Delete this custom agent and its history? This cannot be undone.</p><div className="mt-3 flex gap-2"><Button variant="tertiary" size="sm" onClick={() => props.setDeleteConfirmAgentId('')}>Cancel</Button><Button variant="danger" size="sm" onClick={props.onDeleteSelectedAgent}>Delete agent</Button></div></div>}
        </section>
      </div>
    </section>
  );
};
