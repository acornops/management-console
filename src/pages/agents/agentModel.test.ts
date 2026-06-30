import { describe, expect, it } from 'vitest';

import {
  createDefaultAgentDefinitions,
  filterAgentDefinitions,
  getAgentAccessClass,
  getAgentActivitySummary,
  getAgentCapabilitySummary,
  getAgentDecisionSummary,
  getAgentEligibilityLabel,
  getAgentNextActionLabel,
  getAgentReadinessLabel,
  getAgentReviewSignals,
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
    expect(agents.some((agent) => agent.providerType === 'external')).toBe(true);
    expect(agents[0].capabilities.every((capability) => capability.source)).toBe(true);
    expect(agents[0].approvalPolicy.sensitiveActions).toBe('approval_required');
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
    expect(filterAgentDefinitions(agents, 'github').map((agent) => agent.id)).toEqual(['agent-release-coordinator']);
    expect(filterAgentDefinitions(agents, 'incident pdf').map((agent) => agent.id)).toEqual(['agent-incident-reporter']);
    expect(filterAgentDefinitions(agents, 'external').map((agent) => agent.id)).toEqual(['agent-release-coordinator']);
  });

  it('summarizes derived access instead of storing a separate abstract ACL', () => {
    const agent = createDefaultAgentDefinitions('workspace-1')[0] as AgentDefinition;

    expect(getAgentCapabilitySummary(agent)).toBe('1 MCP server, 4 tools, 2 skills, approval required');
  });

  it('derives catalog decision labels from actionable readiness and access risk', () => {
    const agents = createDefaultAgentDefinitions('workspace-1');

    expect(getAgentReadinessLabel(agents[0])).toBe('Action needed');
    expect(getAgentEligibilityLabel(agents[0])).toBe('Needs review');
    expect(getAgentAccessClass(agents[0])).toBe('Kubernetes read, write blocked');
    expect(getAgentReviewSignals(agents[0])).toEqual(['Broad target scope']);

    const readyAgent = {
      ...agents[0],
      targetScope: ['kubernetes:prod-cluster'],
      workflowsUsingAgent: ['Cluster triage']
    };
    expect(getAgentReadinessLabel(readyAgent)).toBe('Ready');
    expect(getAgentEligibilityLabel(readyAgent)).toBe('Ready');

    expect(getAgentReadinessLabel({ ...agents[1], status: 'disabled' })).toBe('Disabled');
    expect(getAgentEligibilityLabel({ ...agents[1], status: 'disabled' })).toBe('Disabled');
    expect(getAgentReadinessLabel({ ...agents[2], health: { status: 'unknown', summary: 'Test run required before activation' } })).toBe('Blocked');
    expect(getAgentEligibilityLabel({ ...agents[2], health: { status: 'unknown', summary: 'Test run required before activation' } })).toBe('Needs test');
  });

  it('summarizes the default agents by job, access, and current blocker', () => {
    const agents = createDefaultAgentDefinitions('workspace-1');

    expect(getAgentDecisionSummary(agents[0]).line).toBe('Cluster triage · read-only · broad scope');
    expect(getAgentDecisionSummary(agents[1]).line).toBe('Repository operation · write approval required · token review due');
    expect(getAgentDecisionSummary(agents[2]).line).toBe('Incident report PDF · selected chats only · test required');
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

  it('chooses one next action for the selected agent summary', () => {
    const agents = createDefaultAgentDefinitions('workspace-1');

    expect(getAgentNextActionLabel(agents[0])).toBe('Review access');
    expect(getAgentNextActionLabel(agents[2])).toBe('Run readiness test');
    expect(getAgentNextActionLabel({
      ...agents[0],
      targetScope: ['kubernetes:prod-cluster'],
      workflowsUsingAgent: ['Cluster triage']
    })).toBe('Open details');
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
