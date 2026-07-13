import { describe, expect, it } from 'vitest';

import {
  createDefaultAgentDefinitions,
  filterAgentDefinitions,
  getAgentAccessClass,
  getAgentActivitySummary,
  getAgentCapabilitySummary,
  targetScopeFromTokens,
  type AgentDefinition
} from '@/pages/agents/agentModel';
import { formatUserDateTime } from '@/utils/dateTime';

describe('agentModel', () => {
  it('ships durable fallback agents with structured capability provenance', () => {
    const agents = createDefaultAgentDefinitions('workspace-1');

    expect(agents.map((agent) => agent.id)).toEqual([
      'agent-cluster-triage',
      'agent-release-coordinator',
      'agent-incident-reporter'
    ]);
    expect(agents.every((agent) => agent.workspaceId === 'workspace-1')).toBe(true);
    expect(agents.every((agent) => agent.providerType !== 'external')).toBe(true);
    expect(agents.find((agent) => agent.id === 'agent-release-coordinator')?.mcpServers).toEqual([]);
    expect(agents[0].capabilities.every((capability) => capability.source)).toBe(true);
    expect(agents[0].approvalPolicy.sensitiveActions).toBe('allowed');
  });

  it('assigns editable fallback agents to the dev user owner', () => {
    const agents = createDefaultAgentDefinitions('workspace-1');

    expect(agents.every((agent) => agent.ownerUserId === 'user-1')).toBe(true);
    expect(agents.every((agent) => agent.owner === 'Dev User')).toBe(true);
    expect(agents.map((agent) => agent.owner)).not.toContain('System');
  });

  it('filters agents by capability source, scope, workflow usage, and provider', () => {
    const agents = createDefaultAgentDefinitions('workspace-1');

    expect(filterAgentDefinitions(agents, 'kubernetes').map((agent) => agent.id)).toEqual(['agent-cluster-triage']);
    expect(filterAgentDefinitions(agents, 'workspace mcp').map((agent) => agent.id)).toEqual(['agent-release-coordinator']);
    expect(filterAgentDefinitions(agents, 'incident pdf').map((agent) => agent.id)).toEqual(['agent-incident-reporter']);
    expect(filterAgentDefinitions(agents, 'internal').map((agent) => agent.id)).toEqual(agents.map((agent) => agent.id));
  });

  it('summarizes derived access instead of storing a separate abstract ACL', () => {
    const agent = createDefaultAgentDefinitions('workspace-1')[0] as AgentDefinition;

    expect(getAgentCapabilitySummary(agent)).toBe('1 MCP server, 3 tools, 2 skills, no approvals');
  });

  it('derives access descriptions without inventing readiness state', () => {
    const agents = createDefaultAgentDefinitions('workspace-1');
    expect(getAgentAccessClass(agents[0])).toBe('Kubernetes read, write blocked');
  });

  it('summarizes recent run evidence without expanding capability details', () => {
    const agents = createDefaultAgentDefinitions('workspace-1');

    expect(getAgentActivitySummary(agents[0]).line).toBe('Last run: Today 09:12 · completed');
    expect(getAgentActivitySummary(agents[1]).line).toBe('Last run: Yesterday 15:30 · failed');
    expect(getAgentActivitySummary(agents[2]).line).toBe('No runs yet');
    expect(getAgentActivitySummary({
      ...agents[1],
      activity: { runCount: 8, lastRunAt: '2026-06-29T13:35:01.238Z', lastStatus: 'queued' }
    }).line).toBe(`Last run: ${formatUserDateTime('2026-06-29T13:35:01.238Z')} · queued`);
  });

  it('serializes editable target scope tokens into the control-plane target scope object', () => {
    expect(targetScopeFromTokens(['scope:selected_target', 'target-type:kubernetes', 'target:cluster-1'])).toEqual({
      type: 'selected_target',
      targetTypes: ['kubernetes'],
      targetIds: ['cluster-1']
    });
    expect(targetScopeFromTokens(['kubernetes:*', 'vm:prod-1'])).toEqual({
      type: 'selected_target',
      targetTypes: ['kubernetes'],
      targetIds: ['prod-1']
    });
    expect(targetScopeFromTokens(['workspace:current'])).toEqual({ type: 'workspace' });
  });
});
