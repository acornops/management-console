import React, { useMemo, useState } from 'react';
import { Button } from '@/components/common/Button';
import { PageSearchInput } from '@/components/common/PageSearchInput';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ICONS } from '@/constants';
import {
  createDefaultAgentDefinitions,
  filterAgentDefinitions,
  getAgentCapabilitySummary,
  type AgentDefinition
} from '@/pages/agents/agentModel';
import { createAgent as createWorkspaceAgent, listWorkspaceAgents, testAgent as testWorkspaceAgent, type AgentDefinitionApi } from '@/services/control-plane/agentApi';
import type { Workspace } from '@/types';

interface WorkspaceAgentsPageProps {
  workspace: Workspace;
}

type AgentDraft = {
  name: string;
  description: string;
  instructions: string;
  providerType: AgentDefinition['providerType'];
};

type CreateAgentStep = 1 | 2 | 3;
type LocalNotice = { tone: 'success' | 'danger'; message: string };

const createAgentSteps: Array<{ step: CreateAgentStep; label: string; title: string; summary: string }> = [
  { step: 1, label: 'Step 1', title: 'Identity', summary: 'Name and purpose' },
  { step: 2, label: 'Step 2', title: 'Capabilities', summary: 'Tools and skills' },
  { step: 3, label: 'Step 3', title: 'Review', summary: 'Confirm scope' }
];

const statusTone = (status: AgentDefinition['status']): 'success' | 'warning' | 'neutral' => {
  if (status === 'active') return 'success';
  if (status === 'draft' || status === 'paused') return 'warning';
  return 'neutral';
};

const healthTone = (status: AgentDefinition['health']['status']): 'success' | 'warning' | 'neutral' => {
  if (status === 'healthy') return 'success';
  if (status === 'degraded') return 'warning';
  return 'neutral';
};

const splitInput = (value: string): string[] =>
  value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);

const targetScopeTokens = (scope: AgentDefinitionApi['targetScope']): string[] => {
  if (Array.isArray(scope)) return scope;
  if (!scope || typeof scope !== 'object') return ['workspace:current'];
  return [
    scope.type ? `scope:${scope.type}` : '',
    ...(scope.targetTypes || []).map((targetType) => `target-type:${targetType}`),
    ...(scope.targetIds || []).map((targetId) => `target:${targetId}`)
  ].filter(Boolean);
};

const approvalPolicyFor = (policy: AgentDefinitionApi['approvalPolicy']): AgentDefinition['approvalPolicy'] => {
  const mode = typeof policy?.mode === 'string' ? policy.mode : undefined;
  return {
    sensitiveActions: mode === 'none' ? 'allowed' : 'approval_required',
    writeActions: policy?.writeToolsRequireApproval === false ? 'allowed' : 'approval_required'
  };
};

const trustPolicyFor = (policy: AgentDefinitionApi['trustPolicy'], providerType: AgentDefinition['providerType']): AgentDefinition['trustPolicy'] => ({
  boundary: typeof policy?.level === 'string' ? `${policy.level} trust boundary` : providerType === 'external' ? 'External provider requires approval' : 'Internal AcornOps runtime',
  dataEgress: policy?.allowExternalData === true ? 'External data allowed by policy' : 'Workspace approved context only'
});

const mapApiAgent = (item: AgentDefinitionApi, fallback: AgentDefinition, workspaceName: string): AgentDefinition => {
  const providerType = item.providerType || (item.source === 'system' ? 'internal' : fallback.providerType);
  const contextScope = item.contextGrants || item.contextScope || fallback.contextScope;
  return {
    ...fallback,
    id: item.id,
    workspaceId: item.workspaceId,
    name: item.name,
    description: item.description || fallback.description,
    instructions: item.instructions || fallback.instructions,
    status: item.status || fallback.status,
    providerType,
    owner: item.ownerUserId || fallback.owner || workspaceName,
    version: item.version || fallback.version,
    mcpServers: item.mcpServers || [],
    tools: item.tools || [],
    skills: item.skills || [],
    targetScope: targetScopeTokens(item.targetScope),
    contextScope,
    approvalPolicy: approvalPolicyFor(item.approvalPolicy),
    trustPolicy: trustPolicyFor(item.trustPolicy, providerType),
    capabilities: item.capabilities || fallback.capabilities,
    workflowsUsingAgent: item.workflowsUsingAgent || fallback.workflowsUsingAgent,
    triggers: item.triggers || fallback.triggers,
    auditHistory: fallback.auditHistory,
    health: {
      status: item.activity?.lastStatus === 'failed' ? 'degraded' : item.status === 'active' ? 'healthy' : fallback.health.status,
      summary: item.activity?.lastRunAt ? `Last run ${item.activity.lastRunAt}` : fallback.health.summary
    }
  };
};

const canManageWorkspaceAgents = (workspace: Workspace): boolean => {
  const permissions = workspace.permissions as Workspace['permissions'] & {
    manage_agents?: boolean;
    manage_external_agents?: boolean;
  };
  return Boolean(permissions?.manage_agents || permissions?.manage_external_agents || permissions?.manage_mcp);
};

export const WorkspaceAgentsPage: React.FC<WorkspaceAgentsPageProps> = ({ workspace }) => {
  const fallbackAgents = useMemo(() => createDefaultAgentDefinitions(workspace.id), [workspace.id]);
  const [agents, setAgents] = useState<AgentDefinition[]>(fallbackAgents);
  const [selectedAgentId, setSelectedAgentId] = useState(fallbackAgents[0]?.id || '');
  const [query, setQuery] = useState('');
  const [agentLoadError, setAgentLoadError] = useState('');
  const [createPanelOpen, setCreatePanelOpen] = useState(false);
  const [createAgentStep, setCreateAgentStep] = useState<CreateAgentStep>(1);
  const [createDraft, setCreateDraft] = useState<AgentDraft>({
    name: '',
    description: '',
    instructions: '',
    providerType: 'internal'
  });
  const [draftMcpServers, setDraftMcpServers] = useState('');
  const [draftTools, setDraftTools] = useState('');
  const [draftSkills, setDraftSkills] = useState('');
  const [localNotice, setLocalNotice] = useState<LocalNotice | null>(null);
  const [testingAgentId, setTestingAgentId] = useState('');
  const [creatingAgent, setCreatingAgent] = useState(false);
  const canManageAgents = canManageWorkspaceAgents(workspace);

  React.useEffect(() => {
    let mounted = true;
    setAgents(fallbackAgents);
    setSelectedAgentId((current) => current || fallbackAgents[0]?.id || '');
    setAgentLoadError('');

    listWorkspaceAgents(workspace.id)
      .then((items) => {
        if (!mounted || items.length === 0) return;
        const mapped = items.map((item, index) => mapApiAgent(item, fallbackAgents[index % fallbackAgents.length], workspace.name));
        setAgents(mapped);
        setSelectedAgentId((current) => mapped.some((agent) => agent.id === current) ? current : mapped[0].id);
      })
      .catch((error) => {
        if (!mounted) return;
        setAgentLoadError(error instanceof Error ? error.message : 'Unable to load workspace agents');
      });

    return () => {
      mounted = false;
    };
  }, [fallbackAgents, workspace.id]);

  const visibleAgents = useMemo(() => filterAgentDefinitions(agents, query), [agents, query]);
  const selectedAgent = visibleAgents.find((agent) => agent.id === selectedAgentId) || visibleAgents[0] || agents[0];

  const testSelectedAgent = async () => {
    if (!selectedAgent) return;
    setTestingAgentId(selectedAgent.id);
    setLocalNotice(null);
    try {
      const result = await testWorkspaceAgent(workspace.id, selectedAgent.id, {
        approvedContextGrants: selectedAgent.contextScope,
        inputContext: { source: 'management_console' }
      });
      setLocalNotice({ tone: 'success', message: `${selectedAgent.name} test queued as ${result.activity.id}.` });
      setAgents((current) => current.map((agent) => agent.id === selectedAgent.id
        ? {
            ...agent,
            auditHistory: [
              { id: result.activity.id, summary: `Test run ${result.activity.status}`, occurredAt: result.activity.createdAt },
              ...agent.auditHistory
            ],
            health: { status: 'healthy', summary: `Test queued ${result.activity.createdAt}` }
          }
        : agent));
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Unable to test agent' });
    } finally {
      setTestingAgentId('');
    }
  };

  const resetCreateAgentDraft = () => {
    setCreateDraft({ name: '', description: '', instructions: '', providerType: 'internal' });
    setDraftMcpServers('');
    setDraftTools('');
    setDraftSkills('');
    setCreateAgentStep(1);
  };

  const closeCreateAgentDrawer = () => {
    setCreatePanelOpen(false);
    setCreateAgentStep(1);
  };

  const handleCreateAgentDrawerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') closeCreateAgentDrawer();
  };

  const openCreateAgentDrawer = () => {
    setCreatePanelOpen(true);
    setCreateAgentStep(1);
  };

  const createControlPlaneAgent = async () => {
    if (!createDraft.name.trim()) return;
    setCreatingAgent(true);
    setLocalNotice(null);
    try {
      const created = await createWorkspaceAgent(workspace.id, {
        name: createDraft.name.trim(),
        description: createDraft.description.trim() || 'Durable workspace agent configured from the console.',
        instructions: createDraft.instructions.trim() || createDraft.description.trim() || `Operate as ${createDraft.name.trim()}.`,
        providerType: createDraft.providerType,
        mcpServers: splitInput(draftMcpServers),
        tools: splitInput(draftTools),
        skills: splitInput(draftSkills),
        contextGrants: ['workspace_metadata'],
        approvalPolicy: { mode: 'before_write', writeToolsRequireApproval: true },
        trustPolicy: { level: 'restricted', allowExternalData: false }
      });
      const mapped = mapApiAgent(created, fallbackAgents[0], workspace.name);
      setAgents((current) => [mapped, ...current.filter((agent) => agent.id !== mapped.id)]);
      setSelectedAgentId(mapped.id);
      setLocalNotice({ tone: 'success', message: 'Agent saved to control plane.' });
      setCreatePanelOpen(false);
      resetCreateAgentDraft();
    } catch (error) {
      setLocalNotice({ tone: 'danger', message: error instanceof Error ? error.message : 'Unable to create agent' });
    } finally {
      setCreatingAgent(false);
    }
  };

  return (
    <div className="min-h-0 w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="type-route-title">Agents</h1>
          <p className="type-body mt-3 max-w-4xl break-words text-ui-text-muted">
            Durable agents own MCP servers, tools, skills, scopes, approvals, and trust policy. Workflows assign them and narrow runtime access.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <PageSearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search agents, tools, skills, scopes"
            aria-label="Search agents"
            className="lg:w-80"
          />
          <Button type="button" variant="secondary" size="md" className="whitespace-nowrap" onClick={openCreateAgentDrawer} disabled={!canManageAgents}>
            <ICONS.Plus className="h-4 w-4" />
            Create agent
          </Button>
        </div>
      </header>

      {agentLoadError && (
        <div className="mb-4 whitespace-normal break-words rounded-md border border-status-warning/30 bg-status-warning-soft px-3 py-2 text-xs font-semibold text-status-warning-text [overflow-wrap:anywhere]">
          Control-plane Agent API did not return data. The fallback catalog remains available for configuration planning.
        </div>
      )}

      {!canManageAgents && (
        <div className="mb-4 rounded-md border border-ui-border bg-ui-surface px-3 py-2 text-xs font-semibold text-ui-text-muted">
          You need manage_agents to create or edit agents.
        </div>
      )}

      {localNotice && (
        <div className={`mb-4 rounded-md border px-3 py-2 text-xs font-semibold ${localNotice.tone === 'danger' ? 'border-status-danger/30 bg-status-danger-soft text-status-danger-text' : 'border-status-success/30 bg-status-success-soft text-status-success-text'}`}>
          {localNotice.message}
        </div>
      )}

      {createPanelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" onKeyDown={handleCreateAgentDrawerKeyDown}>
          <button type="button" aria-label="Close create agent drawer" className="absolute inset-0 bg-ui-text/20" onClick={closeCreateAgentDrawer} />
          <aside role="dialog" aria-modal="true" aria-labelledby="create-agent-title" aria-describedby="create-agent-description" className="relative flex h-full w-full max-w-2xl flex-col border-l border-ui-border bg-ui-surface shadow-2xl">
            <div className="border-b border-ui-border bg-ui-bg px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="type-micro-label text-ui-text-muted">Guided setup</p>
                  <h2 id="create-agent-title" className="mt-1 type-section-title">Create agent</h2>
                  <p id="create-agent-description" className="type-caption mt-2 text-ui-text-muted">Build the minimum durable agent definition, then refine policy after it exists.</p>
                </div>
                <Button type="button" variant="tertiary" size="sm" onClick={closeCreateAgentDrawer}>
                  <ICONS.X className="h-4 w-4" />
                  Close
                </Button>
              </div>
              <ol aria-label="Create agent steps" className="mt-5 grid gap-2 sm:grid-cols-3">
                {createAgentSteps.map((item) => (
                  <li key={item.step}>
                    <button
                      type="button"
                      onClick={() => setCreateAgentStep(item.step)}
                      className={`w-full rounded-md border px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${createAgentStep === item.step ? 'border-accent/45 bg-accent-soft/55 text-ui-text' : 'border-ui-border bg-ui-surface text-ui-text-muted hover:bg-ui-bg'}`}
                    >
                      <span className="type-micro-label block">{item.label}</span>
                      <span className="mt-1 block text-sm font-semibold">{item.title}</span>
                      <span className="type-caption mt-0.5 block">{item.summary}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
              {createAgentStep === 1 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="type-panel-title">Identity</h3>
                    <p className="type-caption mt-1 text-ui-text-muted">Name the agent by its operating role. Keep the purpose narrow enough that workflows can assign it confidently.</p>
                  </div>
                  <label className="block">
                    <span className="type-micro-label">Name</span>
                    <input value={createDraft.name} onChange={(event) => setCreateDraft((draft) => ({ ...draft, name: event.target.value }))} className="mt-2 min-h-10 w-full rounded-md border border-ui-border bg-ui-bg px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent" />
                  </label>
                  <label className="block">
                    <span className="type-micro-label">Provider</span>
                    <select value={createDraft.providerType} onChange={(event) => setCreateDraft((draft) => ({ ...draft, providerType: event.target.value as AgentDraft['providerType'] }))} className="mt-2 min-h-10 w-full rounded-md border border-ui-border bg-ui-bg px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent">
                      <option value="internal">Internal</option>
                      <option value="external">External</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="type-micro-label">Purpose</span>
                    <input value={createDraft.description} onChange={(event) => setCreateDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder="Example: Triage Kubernetes incidents and summarize safe next steps" className="mt-2 min-h-10 w-full rounded-md border border-ui-border bg-ui-bg px-3 text-sm font-semibold text-ui-text outline-none focus:border-accent" />
                  </label>
                </div>
              )}

              {createAgentStep === 2 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="type-panel-title">Capabilities</h3>
                    <p className="type-caption mt-1 text-ui-text-muted">Add only the tool surface this agent should own. Workflow steps can narrow this later.</p>
                  </div>
                  <label className="block">
                    <span className="type-micro-label">MCP servers</span>
                    <textarea value={draftMcpServers} onChange={(event) => setDraftMcpServers(event.target.value)} placeholder="One server id per line" className="mt-2 min-h-24 w-full resize-y rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-sm font-medium text-ui-text outline-none focus:border-accent" />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="type-micro-label">Tools</span>
                      <textarea value={draftTools} onChange={(event) => setDraftTools(event.target.value)} placeholder="One tool id per line" className="mt-2 min-h-28 w-full resize-y rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-sm font-medium text-ui-text outline-none focus:border-accent" />
                    </label>
                    <label className="block">
                      <span className="type-micro-label">Skills</span>
                      <textarea value={draftSkills} onChange={(event) => setDraftSkills(event.target.value)} placeholder="One skill id per line" className="mt-2 min-h-28 w-full resize-y rounded-md border border-ui-border bg-ui-bg px-3 py-2 text-sm font-medium text-ui-text outline-none focus:border-accent" />
                    </label>
                  </div>
                  <details className="rounded-md border border-ui-border bg-ui-bg px-3 py-2">
                    <summary className="cursor-pointer text-sm font-semibold text-ui-text">Advanced instructions</summary>
                    <label className="mt-3 block">
                      <span className="type-micro-label">Operating instructions</span>
                      <textarea value={createDraft.instructions} onChange={(event) => setCreateDraft((draft) => ({ ...draft, instructions: event.target.value }))} placeholder="Optional. Defaults to the purpose if left blank." className="mt-2 min-h-28 w-full resize-y rounded-md border border-ui-border bg-ui-surface px-3 py-2 text-sm font-medium text-ui-text outline-none focus:border-accent" />
                    </label>
                  </details>
                </div>
              )}

              {createAgentStep === 3 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="type-panel-title">Review</h3>
                    <p className="type-caption mt-1 text-ui-text-muted">This creates a restricted workspace agent. Write-capable tools require approval by default.</p>
                  </div>
                  <dl className="divide-y divide-ui-border rounded-md border border-ui-border bg-ui-bg">
                    <AgentReviewRow label="Name" value={createDraft.name || 'Unnamed agent'} />
                    <AgentReviewRow label="Provider" value={createDraft.providerType} />
                    <AgentReviewRow label="Purpose" value={createDraft.description || 'Durable workspace agent configured from the console.'} />
                    <AgentReviewRow label="MCP servers" value={splitInput(draftMcpServers).join(', ') || 'None'} />
                    <AgentReviewRow label="Tools" value={splitInput(draftTools).join(', ') || 'None'} />
                    <AgentReviewRow label="Skills" value={splitInput(draftSkills).join(', ') || 'None'} />
                    <AgentReviewRow label="Approval policy" value="Approval before write tools" />
                  </dl>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-ui-border bg-ui-bg px-5 py-4">
              <Button type="button" variant="tertiary" size="sm" onClick={resetCreateAgentDraft}>Reset</Button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setCreateAgentStep((step) => (step === 3 ? 2 : 1))} disabled={createAgentStep === 1}>Back</Button>
                {createAgentStep < 3 ? (
                  <Button type="button" variant="primary" size="sm" onClick={() => setCreateAgentStep((step) => (step === 1 ? 2 : 3))} disabled={createAgentStep === 1 && !createDraft.name.trim()}>Next</Button>
                ) : (
                  <Button type="button" variant="primary" size="sm" onClick={() => void createControlPlaneAgent()} disabled={creatingAgent || !createDraft.name.trim()}>
                    <ICONS.Plus className="h-4 w-4" />
                    {creatingAgent ? 'Saving...' : 'Save agent'}
                  </Button>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
        <section aria-label="Agent library" className="min-w-0 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="type-micro-label">{query.trim() ? 'Matching agents' : 'Agent library'}</div>
            <div className="type-caption font-semibold text-ui-text-muted">{visibleAgents.length} of {agents.length} agents</div>
          </div>
          {visibleAgents.map((agent) => (
            <button key={agent.id} type="button" onClick={() => setSelectedAgentId(agent.id)} className={`w-full rounded-lg border p-3.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${agent.id === selectedAgent?.id ? 'border-accent/45 bg-accent-soft/55' : 'border-ui-border bg-ui-surface hover:bg-ui-bg'}`}>
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="type-row-title block text-ui-text">{agent.name}</span>
                  <span className="type-caption mt-1 block leading-5 text-ui-text-muted">{agent.description}</span>
                </span>
                <StatusBadge tone={statusTone(agent.status)}>{agent.status}</StatusBadge>
              </span>
              <span className="type-caption mt-3 block truncate text-ui-text-muted">{getAgentCapabilitySummary(agent)}</span>
            </button>
          ))}
          {visibleAgents.length === 0 && <div className="rounded-lg border border-ui-border bg-ui-surface p-6 text-sm font-semibold text-ui-text-muted">No agents match this search.</div>}
        </section>

        {selectedAgent && (
          <section className="min-w-0 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
            <div className="border-b border-ui-border bg-ui-bg px-5 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent-soft text-accent-strong">
                    <ICONS.Bot className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge tone={statusTone(selectedAgent.status)}>{selectedAgent.status}</StatusBadge>
                      <StatusBadge tone="neutral">{selectedAgent.providerType}</StatusBadge>
                      <StatusBadge tone={healthTone(selectedAgent.health.status)}>{selectedAgent.health.status}</StatusBadge>
                    </div>
                    <h2 className="mt-3 type-section-title">{selectedAgent.name}</h2>
                    <p className="type-body mt-2 max-w-3xl text-ui-text-muted">{selectedAgent.description}</p>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-3 lg:items-end">
                  <Button type="button" variant="secondary" size="md" onClick={() => void testSelectedAgent()} disabled={testingAgentId === selectedAgent.id}>
                    <ICONS.Activity className="h-4 w-4" />
                    {testingAgentId === selectedAgent.id ? 'Testing...' : 'Test agent'}
                  </Button>
                  <div className="grid gap-1 text-sm font-semibold text-ui-text-muted lg:text-right">
                    <span>Owner: {selectedAgent.owner}</span>
                    <span>Version: v{selectedAgent.version}</span>
                    <span>{selectedAgent.health.summary}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 bg-ui-bg/45 p-4 sm:p-5 2xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
              <div className="space-y-5">
                <section className="min-w-0 rounded-md border border-ui-border bg-ui-surface px-4 py-4">
                  <h3 className="type-panel-title">Capability summary</h3>
                  <p className="type-caption mt-2 text-ui-text-muted">{getAgentCapabilitySummary(selectedAgent)} derived from configured MCP servers, tools, skills, scopes, approvals, and trust policy.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <CapabilityList title="MCP servers" values={selectedAgent.mcpServers} />
                    <CapabilityList title="Tools" values={selectedAgent.tools} />
                    <CapabilityList title="Skills" values={selectedAgent.skills} />
                  </div>
                </section>

                <section className="min-w-0 rounded-md border border-ui-border bg-ui-surface px-4 py-4">
                  <h3 className="type-panel-title">Capability entries</h3>
                  <div className="mt-3 overflow-hidden rounded-md border border-ui-border">
                    {selectedAgent.capabilities.map((capability, index) => (
                      <div key={`${capability.source}-${capability.toolId || index}`} className="grid gap-2 border-b border-ui-border bg-ui-bg p-3 text-xs font-semibold text-ui-text-muted last:border-b-0 sm:grid-cols-[7rem_1fr_5rem_7rem]">
                        <span>{capability.source}</span>
                        <span className="type-code truncate">{capability.toolId || capability.resourceScope}</span>
                        <span>{capability.operation}</span>
                        <span>{capability.requiresApproval ? 'Requires approval' : 'No approval'}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="min-w-0 rounded-md border border-ui-border bg-ui-surface px-4 py-4">
                  <h3 className="type-panel-title">Workflows using this agent</h3>
                  <div className="mt-3 grid gap-2">
                    {selectedAgent.workflowsUsingAgent.length > 0
                      ? selectedAgent.workflowsUsingAgent.map((workflow) => (
                        <div key={workflow} className="flex items-center justify-between rounded-md border border-ui-border bg-ui-bg px-3 py-2">
                          <span className="text-sm font-semibold text-ui-text">{workflow}</span>
                          <StatusBadge tone="success">Active</StatusBadge>
                        </div>
                      ))
                      : <span className="type-caption text-ui-text-muted">No workflows assign this agent yet.</span>}
                  </div>
                </section>
              </div>

              <aside className="space-y-5">
                <section className="min-w-0 rounded-md border border-ui-border bg-ui-surface px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="type-panel-title">Health and tests</h3>
                      <p className="type-caption mt-2 text-ui-text-muted">{selectedAgent.health.summary}</p>
                    </div>
                    <StatusBadge tone={healthTone(selectedAgent.health.status)}>{selectedAgent.health.status}</StatusBadge>
                  </div>
                  <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={() => void testSelectedAgent()} disabled={testingAgentId === selectedAgent.id}>
                    <ICONS.Activity className="h-4 w-4" />
                    {testingAgentId === selectedAgent.id ? 'Testing...' : 'Run test'}
                  </Button>
                </section>

                <section className="min-w-0 rounded-md border border-ui-border bg-ui-surface px-4 py-4">
                  <h3 className="type-panel-title">Target scope</h3>
                  <TokenList values={selectedAgent.targetScope} />
                  <h3 className="type-panel-title mt-5">Workspace context scope</h3>
                  <TokenList values={selectedAgent.contextScope} />
                </section>

                <section className="min-w-0 rounded-md border border-ui-border bg-ui-surface px-4 py-4">
                  <h3 className="type-panel-title">Approval defaults</h3>
                  <dl className="mt-3 grid gap-2 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-ui-text-muted">Sensitive actions</dt><dd className="font-semibold text-ui-text">{selectedAgent.approvalPolicy.sensitiveActions.replaceAll('_', ' ')}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-ui-text-muted">Write actions</dt><dd className="font-semibold text-ui-text">{selectedAgent.approvalPolicy.writeActions.replaceAll('_', ' ')}</dd></div>
                  </dl>
                </section>

                <section className="min-w-0 rounded-md border border-ui-border bg-ui-surface px-4 py-4">
                  <h3 className="type-panel-title">Trust policy</h3>
                  <p className="type-caption mt-2 text-ui-text-muted">{selectedAgent.trustPolicy.boundary}</p>
                  <p className="type-caption mt-2 text-ui-text-muted">{selectedAgent.trustPolicy.dataEgress}</p>
                </section>

                <section className="min-w-0 rounded-md border border-ui-border bg-ui-surface px-4 py-4">
                  <h3 className="type-panel-title">Triggers</h3>
                  <div className="mt-3 grid gap-2">
                    {selectedAgent.triggers.length > 0
                      ? selectedAgent.triggers.map((trigger) => (
                        <div key={trigger.id} className="flex items-center justify-between gap-3 rounded-md border border-ui-border bg-ui-bg px-3 py-2">
                          <span className="text-sm font-semibold text-ui-text">{trigger.name || trigger.type.replaceAll('_', ' ')}</span>
                          <StatusBadge tone={trigger.enabled ? 'success' : 'neutral'}>{trigger.enabled ? 'enabled' : 'disabled'}</StatusBadge>
                        </div>
                      ))
                      : <span className="type-caption text-ui-text-muted">No triggers configured.</span>}
                  </div>
                </section>

                <section className="min-w-0 rounded-md border border-ui-border bg-ui-surface px-4 py-4">
                  <h3 className="type-panel-title">Activity</h3>
                  <div className="mt-3 grid gap-2">
                    {selectedAgent.auditHistory.slice(0, 4).map((entry) => (
                      <div key={entry.id} className="rounded-md border border-ui-border bg-ui-bg px-3 py-2">
                        <div className="text-sm font-semibold text-ui-text">{entry.summary}</div>
                        <div className="type-caption mt-1 text-ui-text-muted">{entry.occurredAt}</div>
                      </div>
                    ))}
                  </div>
                </section>
              </aside>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

const AgentReviewRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="grid gap-1 px-3 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
    <dt className="type-micro-label text-ui-text-muted">{label}</dt>
    <dd className="min-w-0 break-words text-sm font-semibold text-ui-text [overflow-wrap:anywhere]">{value}</dd>
  </div>
);

const CapabilityList: React.FC<{ title: string; values: string[] }> = ({ title, values }) => (
  <div>
    <div className="type-micro-label">{title}</div>
    <div className="mt-2 grid gap-1">
      {values.length > 0
        ? values.map((value) => <span key={value} className="type-code truncate rounded-md bg-ui-bg px-2 py-1 text-xs text-ui-text-muted">{value}</span>)
        : <span className="type-caption text-ui-text-muted">None configured</span>}
    </div>
  </div>
);

const TokenList: React.FC<{ values: string[] }> = ({ values }) => (
  <div className="mt-3 flex flex-wrap gap-2">
    {values.length > 0
      ? values.map((value) => <span key={value} className="rounded-md border border-ui-border bg-ui-bg px-2.5 py-1.5 text-xs font-bold text-ui-text-muted">{value}</span>)
      : <span className="type-caption text-ui-text-muted">No scope configured.</span>}
  </div>
);
