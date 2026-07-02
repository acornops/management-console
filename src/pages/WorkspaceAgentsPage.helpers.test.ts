import { describe, expect, it } from 'vitest';

import { createDefaultAgentDefinitions } from '@/pages/agents/agentModel';
import { filterVisibleAgents, mapApiAgent, withAgentAuditHistoryEntry } from '@/pages/WorkspaceAgentsPage.helpers';

describe('WorkspaceAgentsPage helpers', () => {
  it('resolves API agent owner IDs through loaded workspace members', () => {
    const [fallbackAgent] = createDefaultAgentDefinitions('workspace-1');
    const mapped = mapApiAgent({
      id: 'agent-cluster-triage',
      workspaceId: 'workspace-1',
      name: 'Kubernetes Diagnostics',
      ownerUserId: 'user-1'
    }, fallbackAgent, 'Development Workspace', new Map([['user-1', 'Dev User']]));

    expect(mapped.ownerUserId).toBe('user-1');
    expect(mapped.owner).toBe('Dev User');
  });

  it('uses the development owner label for mocked specialist agent ownership', () => {
    const [fallbackAgent] = createDefaultAgentDefinitions('workspace-1');
    const mapped = mapApiAgent({
      id: 'agent-cluster-triage',
      workspaceId: 'workspace-1',
      name: 'Kubernetes Diagnostics',
      ownerUserId: 'user-1'
    }, fallbackAgent, 'Development Workspace');

    expect(mapped.ownerUserId).toBe('user-1');
    expect(mapped.owner).toBe('Dev User');
  });

  it('prepends local agent update history for the detail panel', () => {
    const [fallbackAgent] = createDefaultAgentDefinitions('workspace-1');
    const updated = withAgentAuditHistoryEntry(fallbackAgent, 'Agent definition updated', '2026-07-01T00:00:00.000Z');

    expect(updated.auditHistory[0]).toEqual({
      id: 'agent-audit-2026-07-01T00:00:00.000Z-agent-definition-updated',
      summary: 'Agent definition updated',
      occurredAt: '2026-07-01T00:00:00.000Z'
    });
    expect(updated.auditHistory.slice(1)).toEqual(fallbackAgent.auditHistory);
  });

  it('keeps catalog focus filters to assignment readiness states', () => {
    const agents = createDefaultAgentDefinitions('workspace-1');
    const readyAgent = {
      ...agents[0],
      targetScope: ['kubernetes:prod-cluster'],
      workflowsUsingAgent: ['Cluster triage']
    };
    const reviewAgent = {
      ...agents[1],
      targetScope: ['repository:*'],
      health: { status: 'healthy' as const, summary: 'Last test passed 1 minute ago' },
      auditHistory: [
        { id: 'agent-release-test', summary: 'Test run completed', occurredAt: '2026-07-01T00:00:00.000Z' }
      ]
    };
    const candidates = [readyAgent, reviewAgent, agents[2]];

    expect(filterVisibleAgents(candidates, '', { focus: 'all' }).map((agent) => agent.id)).toEqual([
      'agent-cluster-triage',
      'agent-release-coordinator',
      'agent-incident-reporter'
    ]);
    expect(filterVisibleAgents(candidates, '', { focus: 'needs_review' }).map((agent) => agent.id)).toEqual(['agent-release-coordinator']);
    expect(filterVisibleAgents(candidates, '', { focus: 'needs_test' }).map((agent) => agent.id)).toEqual(['agent-incident-reporter']);
    expect(filterVisibleAgents(candidates, '', { focus: 'ready' }).map((agent) => agent.id)).toEqual(['agent-cluster-triage']);
  });

  it('excludes the system workflow orchestrator from workspace agent catalog results', () => {
    const [workspaceAgent] = createDefaultAgentDefinitions('workspace-1');
    const systemOrchestrator = {
      ...workspaceAgent,
      id: 'agent-workflow-orchestrator',
      name: 'System Orchestrator',
      owner: 'AcornOps',
      ownerUserId: 'system'
    };

    expect(filterVisibleAgents([systemOrchestrator, workspaceAgent], '', { focus: 'all' }).map((agent) => agent.id)).toEqual([
      'agent-cluster-triage'
    ]);
  });
});
