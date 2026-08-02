import { describe, expect, it } from 'vitest';

import type { AgentDefinition } from '@/pages/agents/agentModel';
import type { WorkflowDefinition } from '@/pages/workflows/workflowModel';
import { getWorkflowAgentCapabilityReview, getWorkflowCapabilityOverviewSummary } from '@/pages/workflows/workflowAgentCapabilities';

const agent: AgentDefinition = {
  id: 'agent-cluster-triage',
  workspaceId: 'workspace-1',
  name: 'Kubernetes Diagnostics',
  avatarEmoji: '🔎',
  description: '',
  instructions: '',
  status: 'active',
  reviewState: 'reviewed',
  providerType: 'internal',
  createdBy: 'user-1',
  owner: 'Operator',
  mcpServers: ['targets'],
  tools: ['get_resource', 'get_resource_logs', 'list_resources'],
  nativeToolConfigs: {},
  skills: ['acornops-observability', 'acornops-infrastructure-boundary-design'],
  semanticCapabilityIds: ['infrastructure.diagnostics.read'],
  permissionMode: 'read_only',
  trustPolicy: {
    boundary: 'Workspace',
    dataEgress: 'Blocked'
  },
  capabilities: [{
    source: 'builtin_tool',
    resourceType: 'kubernetes',
    resourceScope: 'infrastructure_inventory',
    toolId: 'list_resources',
    operation: 'read',
    requiresApproval: false
  }],
  readiness: { status: 'ready', reasons: [] }
};

const workflow: WorkflowDefinition = {
  id: 'cluster-triage',
  workspaceId: 'workspace-1',
  name: 'Cluster triage',
  description: '',
  status: 'active',
  owner: 'Operator',
  tags: [],
  lastRun: 'No runs yet',
  agentIds: [agent.id],
  executionMode: 'direct',
  semanticCapabilityIds: ['infrastructure.diagnostics.read'],
  capabilityRestrictionMode: 'restrict',
  agents: [{
    agentId: agent.id,
    name: agent.name,
    role: 'Direct',
    required: true
  }],
  policy: {
    mode: 'read_only',
    approvals: []
  },
  starterPrompt: 'Inspect the cluster.',
  runs: []
};

describe('workflowAgentCapabilities', () => {
  it('derives concrete access from the selected Agent rather than the workflow allowlist', () => {
    const review = getWorkflowAgentCapabilityReview(workflow, [agent]);

    expect(review).toHaveLength(1);
    expect(review[0].agentId).toBe('agent-cluster-triage');
    expect(review[0].avatarEmoji).toBe('🔎');
    expect(review[0].mcpServers).toEqual(['Targets']);
    expect(review[0].skills).toEqual(['AcornOps Observability', 'AcornOps Infrastructure Boundary Design']);
    expect(review[0].tools).toEqual([
      { id: 'get_resource', label: 'get_resource', access: 'unknown', requiresApproval: false },
      { id: 'get_resource_logs', label: 'get_resource_logs', access: 'unknown', requiresApproval: false },
      { id: 'list_resources', label: 'list_resources', access: 'read', requiresApproval: false }
    ]);
    expect(review[0].tools.map((tool) => tool.id)).not.toContain('infrastructure.diagnostics.read');
    expect(review[0].writeAccess).toBe('Writes disabled');
    expect(review[0]).not.toHaveProperty('semanticCapabilityIds');
    expect(review[0]).not.toHaveProperty('capabilityRules');
    expect(review[0]).not.toHaveProperty('role');
    expect(review[0]).not.toHaveProperty('required');
  });

  it('reviews every coordinated Agent as a peer so their ceilings can be combined', () => {
    const repositoryAgent: AgentDefinition = {
      ...agent,
      id: 'agent-repository',
      name: 'Workflow Analyst',
      mcpServers: ['repository-mcp'],
      tools: ['repository.read'],
      skills: ['repository-inspection'],
      semanticCapabilityIds: ['scm.repository.read'],
      capabilities: []
    };
    const coordinated: WorkflowDefinition = {
      ...workflow,
      agentIds: [agent.id, repositoryAgent.id],
      executionMode: 'coordinated',
      agents: [agent, repositoryAgent].map((selected) => ({
        agentId: selected.id,
        name: selected.name,
        role: 'AcornOps-coordinated',
        required: true
      }))
    };

    const review = getWorkflowAgentCapabilityReview(coordinated, [repositoryAgent, agent]);

    expect(review.map((item) => item.agentId)).toEqual([agent.id, repositoryAgent.id]);
    expect(new Set(review.flatMap((item) => item.tools.map((tool) => tool.id)))).toEqual(new Set([
      'get_resource', 'get_resource_logs', 'list_resources', 'repository.read'
    ]));
  });

  it('reports the runtime-effective Agent permission mode instead of synthetic approval fields', () => {
    const askBeforeChanges = getWorkflowAgentCapabilityReview(workflow, [{
      ...agent,
      permissionMode: 'ask_before_changes'
    }]);
    const automaticRoutineChanges = getWorkflowAgentCapabilityReview(workflow, [{
      ...agent,
      permissionMode: 'auto_allowed_changes'
    }]);

    expect(askBeforeChanges[0].writeAccess).toBe('Approval required for writes');
    expect(automaticRoutineChanges[0].writeAccess).toBe('Routine writes automatic; high-risk changes require approval');
  });

  it('labels write tools with their runtime approval behavior', () => {
    const [review] = getWorkflowAgentCapabilityReview(workflow, [{
      ...agent,
      tools: ['patch_resource'],
      permissionMode: 'ask_before_changes',
      capabilities: [{
        source: 'builtin_tool',
        resourceType: 'kubernetes',
        resourceScope: 'infrastructure_inventory',
        toolId: 'patch_resource',
        operation: 'write',
        requiresApproval: true
      }]
    }]);

    expect(review.tools).toEqual([{
      id: 'patch_resource',
      label: 'patch_resource',
      access: 'write',
      requiresApproval: true
    }]);
  });

  it('summarizes the loaded Agent catalog without a capability preview request', () => {
    const summary = getWorkflowCapabilityOverviewSummary(workflow, [agent]);

    expect(summary).toEqual({
      agentCount: 1,
      missingAgentCount: 0,
      tools: { read: 1, write: 0, unknown: 2 },
      mcpServers: ['Targets'],
      skills: ['AcornOps Observability', 'AcornOps Infrastructure Boundary Design']
    });
  });

  it('reports incomplete Agent catalog coverage instead of inventing capability data', () => {
    const summary = getWorkflowCapabilityOverviewSummary({
      ...workflow,
      agentIds: [agent.id, 'agent-missing'],
      agents: [
        ...workflow.agents,
        { agentId: 'agent-missing', name: 'Unavailable Agent', role: 'Peer', required: true }
      ]
    }, [agent]);

    expect(summary.agentCount).toBe(2);
    expect(summary.missingAgentCount).toBe(1);
    expect(summary.tools).toEqual({ read: 1, write: 0, unknown: 2 });
  });
});
