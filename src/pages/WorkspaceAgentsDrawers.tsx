import React from 'react';
import { Button } from '@/components/common/Button';
import { Select, SelectOption } from '@/components/common/Select';
import { ICONS } from '@/constants';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import {
  AgentCapabilityOptionButtons,
  agentFormInputClassName,
  agentFormTextareaClassName,
  appendUniqueToken,
  createAgentEditDraft,
  providerTypeOptions,
  statusOptions,
  type AgentCapabilityOptions,
  type AgentDraft,
  type AgentEditDraft
} from '@/pages/WorkspaceAgentsPage.helpers';

interface CreateAgentDrawerProps {
  createDraft: AgentDraft;
  setCreateDraft: React.Dispatch<React.SetStateAction<AgentDraft>>;
  draftMcpServers: string;
  setDraftMcpServers: React.Dispatch<React.SetStateAction<string>>;
  draftTools: string;
  setDraftTools: React.Dispatch<React.SetStateAction<string>>;
  draftSkills: string;
  setDraftSkills: React.Dispatch<React.SetStateAction<string>>;
  agentCapabilityOptions: AgentCapabilityOptions;
  creatingAgent: boolean;
  onClose: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onReset: () => void;
  onSave: () => void;
}

export const CreateAgentDrawer: React.FC<CreateAgentDrawerProps> = ({
  createDraft,
  setCreateDraft,
  draftMcpServers,
  setDraftMcpServers,
  draftTools,
  setDraftTools,
  draftSkills,
  setDraftSkills,
  agentCapabilityOptions,
  creatingAgent,
  onClose,
  onKeyDown,
  onReset,
  onSave
}) => (
  <div className="fixed inset-0 z-50 flex justify-end" onKeyDown={onKeyDown}>
    <button type="button" aria-label="Close create agent drawer" className="absolute inset-0 bg-ui-text/20" onClick={onClose} />
    <aside role="dialog" aria-modal="true" aria-labelledby="create-agent-title" aria-describedby="create-agent-description" className="relative flex h-full w-full max-w-xl flex-col border-l border-ui-border bg-ui-surface shadow-2xl">
      <div className="border-b border-ui-border bg-ui-bg px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="type-micro-label text-ui-text-muted">Required fields</p>
            <h2 id="create-agent-title" className="mt-1 type-section-title">Create agent</h2>
            <p id="create-agent-description" className="type-caption mt-2 text-ui-text-muted">Name the agent and its assignment purpose. It saves with restricted trust and approval required for write tools.</p>
          </div>
          <Button type="button" variant="tertiary" size="sm" onClick={onClose}>
            <ICONS.X className="h-4 w-4" />
            Close
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
        <div className="space-y-5">
          <label className="block">
            <span className="type-micro-label">Name</span>
            <input value={createDraft.name} onChange={(event) => setCreateDraft((draft) => ({ ...draft, name: event.target.value }))} className={agentFormInputClassName} />
          </label>
          <label className="block">
            <span className="type-micro-label">Provider</span>
            <Select<AgentDraft['providerType']>
              value={createDraft.providerType}
              options={providerTypeOptions}
              onChange={(providerType) => setCreateDraft((draft) => ({ ...draft, providerType }))}
              className="mt-2"
              ariaLabel="Provider"
            />
          </label>
          <label className="block">
            <span className="type-micro-label">Assignment purpose</span>
            <input value={createDraft.description} onChange={(event) => setCreateDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder="Triage Kubernetes incidents and summarize safe next steps" className={agentFormInputClassName} />
          </label>

          <details className="rounded-md border border-ui-border bg-ui-bg px-3 py-2">
            <summary className="cursor-pointer text-sm font-semibold text-ui-text">Capability sources</summary>
            <div className="mt-4 space-y-4">
              <section className="rounded-md border border-ui-border bg-ui-surface px-3 py-3">
                <h3 className="type-micro-label">Capability catalog</h3>
                <p className="type-caption mt-1 text-ui-text-muted">Choose server-owned options to avoid typos. You can also paste approved IDs.</p>
              </section>
              <label className="block">
                <span className="type-micro-label">MCP servers</span>
                <textarea value={draftMcpServers} onChange={(event) => setDraftMcpServers(event.target.value)} placeholder="One MCP server ID per line" className={agentFormTextareaClassName} />
              </label>
              <AgentCapabilityOptionButtons
                options={agentCapabilityOptions.mcpServers}
                onSelect={(value) => setDraftMcpServers((current) => appendUniqueToken(current, value))}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block">
                    <span className="type-micro-label">Tools</span>
                    <textarea value={draftTools} onChange={(event) => setDraftTools(event.target.value)} placeholder="One tool ID per line" className={agentFormTextareaClassName} />
                  </label>
                  <AgentCapabilityOptionButtons
                    options={agentCapabilityOptions.mcpTools}
                    onSelect={(value) => setDraftTools((current) => appendUniqueToken(current, value))}
                  />
                </div>
                <div>
                  <label className="block">
                    <span className="type-micro-label">Skills</span>
                    <textarea value={draftSkills} onChange={(event) => setDraftSkills(event.target.value)} placeholder="One skill ID per line" className={agentFormTextareaClassName} />
                  </label>
                  <AgentCapabilityOptionButtons
                    options={agentCapabilityOptions.skills}
                    onSelect={(value) => setDraftSkills((current) => appendUniqueToken(current, value))}
                  />
                </div>
              </div>
              <label className="block">
                <span className="type-micro-label">Operating instructions</span>
                <textarea value={createDraft.instructions} onChange={(event) => setCreateDraft((draft) => ({ ...draft, instructions: event.target.value }))} placeholder="Optional. If empty, the assignment purpose becomes the instructions." className={agentFormTextareaClassName} />
              </label>
            </div>
          </details>

          <section className="rounded-md border border-ui-border bg-ui-bg px-3 py-3">
            <h3 className="type-micro-label">Save defaults</h3>
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-ui-text-muted">Trust</dt><dd className="font-semibold text-ui-text">Restricted trust</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ui-text-muted">Policy</dt><dd className="font-semibold text-ui-text">Write tools require approval</dd></div>
            </dl>
          </section>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-ui-border bg-ui-bg px-5 py-4">
        <Button type="button" variant="tertiary" size="sm" onClick={onReset}>Reset</Button>
        <Button type="button" variant="primary" size="sm" onClick={onSave} disabled={creatingAgent || !createDraft.name.trim() || !createDraft.description.trim()}>
          <ICONS.Plus className="h-4 w-4" />
          {creatingAgent ? 'Saving...' : 'Save agent'}
        </Button>
      </div>
    </aside>
  </div>
);

interface EditAgentDrawerProps {
  editingAgent: AgentDefinition;
  editDraft: AgentEditDraft;
  setEditDraft: React.Dispatch<React.SetStateAction<AgentEditDraft | null>>;
  ownerSelectOptions: Array<SelectOption<string>>;
  agentCapabilityOptions: AgentCapabilityOptions;
  editChangeSummary: string[];
  updatingAgentId: string;
  onClose: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onSave: () => void;
}

export const EditAgentDrawer: React.FC<EditAgentDrawerProps> = ({
  editingAgent,
  editDraft,
  setEditDraft,
  ownerSelectOptions,
  agentCapabilityOptions,
  editChangeSummary,
  updatingAgentId,
  onClose,
  onKeyDown,
  onSave
}) => (
  <div className="fixed inset-0 z-50 flex justify-end" onKeyDown={onKeyDown}>
    <button type="button" aria-label="Close edit agent drawer" className="absolute inset-0 bg-ui-text/20" onClick={onClose} />
    <aside role="dialog" aria-modal="true" aria-labelledby="edit-agent-title" aria-describedby="edit-agent-description" className="relative flex h-full w-full max-w-xl flex-col border-l border-ui-border bg-ui-surface shadow-2xl">
      <div className="border-b border-ui-border bg-ui-bg px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="type-micro-label text-ui-text-muted">Requires manage_agents</p>
            <h2 id="edit-agent-title" className="mt-1 type-section-title">Edit agent</h2>
            <p id="edit-agent-description" className="type-caption mt-2 text-ui-text-muted">Changes apply to the shared agent definition. Review workflow impact before saving.</p>
          </div>
          <Button type="button" variant="tertiary" size="sm" onClick={onClose}>
            <ICONS.X className="h-4 w-4" />
            Close
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="type-micro-label">Name</span>
              <input value={editDraft.name} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, name: event.target.value }))} className={agentFormInputClassName} />
            </label>
            <label className="block">
              <span className="type-micro-label">Status</span>
              <Select<AgentEditDraft['status']>
                value={editDraft.status}
                options={statusOptions}
                onChange={(status) => setEditDraft((draft) => draft && ({ ...draft, status }))}
                className="mt-2"
                ariaLabel="Status"
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="type-micro-label">Provider</span>
              <Select<AgentEditDraft['providerType']>
                value={editDraft.providerType}
                options={providerTypeOptions}
                onChange={(providerType) => setEditDraft((draft) => draft && ({ ...draft, providerType }))}
                className="mt-2"
                ariaLabel="Provider"
              />
            </label>
            <label className="block">
              <span className="type-micro-label">Assignment purpose</span>
              <input value={editDraft.description} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, description: event.target.value }))} className={agentFormInputClassName} />
            </label>
          </div>
          <section className="rounded-md border border-ui-border bg-ui-bg px-3 py-3">
            <label className="block">
              <span className="type-micro-label">Agent owner</span>
              <Select<string>
                value={editDraft.ownerUserId}
                options={ownerSelectOptions}
                onChange={(ownerUserId) => setEditDraft((draft) => draft && ({ ...draft, ownerUserId }))}
                className="mt-2"
                ariaLabel="Agent owner"
              />
            </label>
            <p className="type-caption mt-2 text-ui-text-muted">
              {ownerSelectOptions.length > 1 ? 'Only loaded workspace members are available for owner transfer.' : `Current owner: ${editingAgent.owner}`}
            </p>
          </section>
          <label className="block">
            <span className="type-micro-label">Operating instructions</span>
            <textarea value={editDraft.instructions} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, instructions: event.target.value }))} className={agentFormTextareaClassName} />
          </label>

          <details open className="rounded-md border border-ui-border bg-ui-bg px-3 py-2">
            <summary className="cursor-pointer text-sm font-semibold text-ui-text">Access and capabilities</summary>
            <div className="mt-4 space-y-4">
              <section className="rounded-md border border-ui-border bg-ui-surface px-3 py-3">
                <h3 className="type-micro-label">Capability catalog</h3>
                <p className="type-caption mt-1 text-ui-text-muted">Use catalog options to avoid typos. Save still goes through the agent route for authorization.</p>
              </section>
              <label className="block">
                <span className="type-micro-label">MCP servers</span>
                <textarea value={editDraft.mcpServers} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, mcpServers: event.target.value }))} placeholder="One MCP server ID per line" className={agentFormTextareaClassName} />
              </label>
              <AgentCapabilityOptionButtons
                options={agentCapabilityOptions.mcpServers}
                onSelect={(value) => setEditDraft((draft) => draft && ({ ...draft, mcpServers: appendUniqueToken(draft.mcpServers, value) }))}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block">
                    <span className="type-micro-label">Tools</span>
                    <textarea value={editDraft.tools} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, tools: event.target.value }))} placeholder="One tool ID per line" className={agentFormTextareaClassName} />
                  </label>
                  <AgentCapabilityOptionButtons
                    options={agentCapabilityOptions.mcpTools}
                    onSelect={(value) => setEditDraft((draft) => draft && ({ ...draft, tools: appendUniqueToken(draft.tools, value) }))}
                  />
                </div>
                <div>
                  <label className="block">
                    <span className="type-micro-label">Skills</span>
                    <textarea value={editDraft.skills} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, skills: event.target.value }))} placeholder="One skill ID per line" className={agentFormTextareaClassName} />
                  </label>
                  <AgentCapabilityOptionButtons
                    options={agentCapabilityOptions.skills}
                    onSelect={(value) => setEditDraft((draft) => draft && ({ ...draft, skills: appendUniqueToken(draft.skills, value) }))}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="type-micro-label">Target scope</span>
                  <textarea value={editDraft.targetScope} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, targetScope: event.target.value }))} placeholder="One scope per line" className={agentFormTextareaClassName} />
                </label>
                <label className="block">
                  <span className="type-micro-label">Context access</span>
                  <textarea value={editDraft.contextScope} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, contextScope: event.target.value }))} placeholder="One context grant per line" className={agentFormTextareaClassName} />
                </label>
              </div>
            </div>
          </details>

          <section className="rounded-md border border-ui-border bg-ui-bg px-3 py-3">
            <h3 className="type-micro-label">Policy</h3>
            <div className="mt-3 grid gap-3">
              <label className="flex items-start gap-3 text-sm font-semibold text-ui-text">
                <input type="checkbox" checked={editDraft.writeToolsRequireApproval} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, writeToolsRequireApproval: event.target.checked }))} className="mt-1 h-4 w-4 rounded border-ui-border text-accent" />
                <span>Require approval for write tools</span>
              </label>
              <label className="flex items-start gap-3 text-sm font-semibold text-ui-text">
                <input type="checkbox" checked={editDraft.allowExternalData} onChange={(event) => setEditDraft((draft) => draft && ({ ...draft, allowExternalData: event.target.checked }))} className="mt-1 h-4 w-4 rounded border-ui-border text-accent" />
                <span>Allow external data access</span>
              </label>
            </div>
          </section>

          <section className="rounded-md border border-status-warning/30 bg-status-warning-soft px-3 py-3 text-status-warning-text">
            <h3 className="type-micro-label">Changes before save</h3>
            <ul className="mt-3 grid gap-2 text-sm font-semibold">
              {editChangeSummary.map((change) => <li key={change}>{change}</li>)}
            </ul>
          </section>

          <section className="rounded-md border border-ui-border bg-ui-bg px-3 py-3">
            <h3 className="type-micro-label">Affected workflows</h3>
            <div className="mt-3 grid gap-2">
              {editingAgent.workflowsUsingAgent.length > 0
                ? editingAgent.workflowsUsingAgent.map((workflow) => (
                  <span key={workflow} className="rounded-md border border-ui-border bg-ui-surface px-3 py-2 text-sm font-semibold text-ui-text">{workflow}</span>
                ))
                : <span className="type-caption text-ui-text-muted">No workflows currently assign this agent.</span>}
            </div>
          </section>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-ui-border bg-ui-bg px-5 py-4">
        <Button type="button" variant="tertiary" size="sm" onClick={() => setEditDraft(createAgentEditDraft(editingAgent))}>Reset</Button>
        <Button type="button" variant="primary" size="sm" onClick={onSave} disabled={updatingAgentId === editingAgent.id || !editDraft.name.trim() || !editDraft.description.trim()}>
          <ICONS.CheckCircle2 className="h-4 w-4" />
          {updatingAgentId === editingAgent.id ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </aside>
  </div>
);
