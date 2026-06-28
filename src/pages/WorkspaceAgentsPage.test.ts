import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createDefaultAgentDefinitions,
  filterAgentDefinitions,
  getAgentCapabilitySummary,
  type AgentDefinition
} from './agents/agentModel';

const root = resolve(__dirname, '../..');
const agentsPage = readFileSync(resolve(root, 'src/pages/WorkspaceAgentsPage.tsx'), 'utf8');

describe('WorkspaceAgentsPage model', () => {
  it('ships durable fallback agents with structured capability provenance', () => {
    const agents = createDefaultAgentDefinitions('workspace-1');

    expect(agents.map((agent) => agent.id)).toEqual([
      'agent-cluster-triage',
      'agent-release-coordinator',
      'agent-incident-reporter'
    ]);
    expect(agents.every((agent) => agent.workspaceId === 'workspace-1')).toBe(true);
    expect(agents.some((agent) => agent.providerType === 'external')).toBe(true);
    expect(agents[0].capabilities.every((capability) => capability.source)).toBe(true);
    expect(agents[0].approvalPolicy.sensitiveActions).toBe('approval_required');
  });

  it('filters agents by capability source, scope, workflow usage, and provider', () => {
    const agents = createDefaultAgentDefinitions('workspace-1');

    expect(filterAgentDefinitions(agents, 'kubernetes').map((agent) => agent.id)).toEqual(['agent-cluster-triage']);
    expect(filterAgentDefinitions(agents, 'github').map((agent) => agent.id)).toEqual(['agent-release-coordinator']);
    expect(filterAgentDefinitions(agents, 'incident pdf').map((agent) => agent.id)).toEqual(['agent-incident-reporter']);
    expect(filterAgentDefinitions(agents, 'external').map((agent) => agent.id)).toEqual(['agent-release-coordinator']);
  });

  it('summarizes derived access instead of storing a separate abstract ACL', () => {
    const agent = createDefaultAgentDefinitions('workspace-1')[0] as AgentDefinition;

    expect(getAgentCapabilitySummary(agent)).toBe('1 MCP server, 4 tools, 2 skills, approval required');
  });
});

describe('WorkspaceAgentsPage surface', () => {
  it('renders the durable agent library and inspectable configuration panels', () => {
    expect(agentsPage).toContain('Agent library');
    expect(agentsPage).toContain('Capability summary');
    expect(agentsPage).toContain('MCP servers');
    expect(agentsPage).toContain('Tools');
    expect(agentsPage).toContain('Skills');
    expect(agentsPage).toContain('Target scope');
    expect(agentsPage).toContain('Workspace context scope');
    expect(agentsPage).toContain('Approval defaults');
    expect(agentsPage).toContain('Trust policy');
    expect(agentsPage).toContain('Workflows using this agent');
    expect(agentsPage).toContain('Health and tests');
    expect(agentsPage).toContain('Test agent');
    expect(agentsPage).toContain('Triggers');
    expect(agentsPage).toContain('Activity');
    expect(agentsPage).not.toContain('Using fallback agent catalog until control-plane Agent routes are available.');
  });

  it('uses a guided drawer for agent creation and keeps it permission-aware', () => {
    expect(agentsPage).toContain('Create agent');
    expect(agentsPage).toContain('createAgentStep');
    expect(agentsPage).toContain('Create agent steps');
    expect(agentsPage).toContain('Step 1');
    expect(agentsPage).toContain('Identity');
    expect(agentsPage).toContain('Step 2');
    expect(agentsPage).toContain('Capabilities');
    expect(agentsPage).toContain('Step 3');
    expect(agentsPage).toContain('Review');
    expect(agentsPage).toContain('Advanced instructions');
    expect(agentsPage).toContain('canManageAgents');
    expect(agentsPage).toContain('createWorkspaceAgent');
    expect(agentsPage).toContain('testWorkspaceAgent');
    expect(agentsPage).toContain('You need manage_agents to create or edit agents.');
    expect(agentsPage).toContain('role="dialog"');
    expect(agentsPage).toContain('aria-describedby="create-agent-description"');
    expect(agentsPage).toContain('onKeyDown={handleCreateAgentDrawerKeyDown}');
    expect(agentsPage).toContain('Close create agent drawer');
    expect(agentsPage).not.toContain('<Dialog');
    expect(agentsPage).not.toContain('mb-6 rounded-lg border border-ui-border bg-ui-surface p-5 shadow-sm');
  });

  it('uses severity-specific notices for agent mutations and tests', () => {
    expect(agentsPage).toContain("type LocalNotice = { tone: 'success' | 'danger'; message: string }");
    expect(agentsPage).toContain("setLocalNotice({ tone: 'success'");
    expect(agentsPage).toContain("setLocalNotice({ tone: 'danger'");
    expect(agentsPage).toContain("localNotice.tone === 'danger'");
    expect(agentsPage).toContain('border-status-danger/30 bg-status-danger-soft text-status-danger-text');
    expect(agentsPage).toContain('border-status-success/30 bg-status-success-soft text-status-success-text');
    expect(agentsPage).not.toContain('setLocalNotice(error instanceof Error ? error.message');
  });

  it('uses the same uncluttered library and detail chrome as workflows', () => {
    expect(agentsPage).toContain('placeholder="Search agents, tools, skills, scopes"');
    expect(agentsPage).toContain('{visibleAgents.length} of {agents.length} agents');
    expect(agentsPage).toContain('className="min-w-0 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm"');
    expect(agentsPage).toContain('className="grid gap-5 bg-ui-bg/45 p-4 sm:p-5');
    expect(agentsPage).not.toContain('<section className="rounded-lg border border-ui-border bg-ui-surface p-4">');
  });

  it('uses the shared warning treatment for fallback catalog errors', () => {
    expect(agentsPage).toContain('Control-plane Agent API did not return data.');
    expect(agentsPage).toContain('border-status-warning/30 bg-status-warning-soft px-3 py-2 text-xs font-semibold text-status-warning-text');
    expect(agentsPage).not.toContain('agentLoadError && (\n        <div className="mb-4 whitespace-normal break-words rounded-md border border-ui-border bg-ui-surface');
  });

  it('keeps typography and action colors aligned with the workflow surface', () => {
    expect(agentsPage).toContain('<h2 className="mt-3 type-section-title">{selectedAgent.name}</h2>');
    expect(agentsPage).not.toContain('text-2xl font-semibold tracking-normal');
    expect(agentsPage).not.toContain('variant="accent"');
  });

  it('keeps the route wrapper inside the app shell on mobile', () => {
    expect(agentsPage).toContain('className="min-h-0 w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar sm:px-6 lg:px-10 lg:py-8"');
    expect(agentsPage).not.toContain('w-[100vw] max-w-[100vw]');
  });
});
