import { describe, expect, it } from 'vitest';

import type { AgentDefinition } from '@/pages/agents/agentModel';
import type { WorkflowDefinition } from '@/pages/workflows/workflowModel';
import { getWorkflowAgentCapabilityReview } from '@/pages/workflows/workflowAgentCapabilities';

const agent: AgentDefinition = {
  id: 'agent-cluster-triage',
  workspaceId: 'workspace-1',
  name: 'Kubernetes Diagnostics',
  description: '',
  instructions: '',
  status: 'active',
  origin: { type: 'manual' },
  kind: 'specialist',
  reviewState: 'reviewed',
  providerType: 'internal',
  createdBy: 'user-1',
  owner: 'Operator',
  version: 1,
  mcpServers: ['acornops-target-agent'],
  tools: ['get_resource', 'get_resource_logs', 'list_resources'],
  skills: ['acornops-observability', 'acornops-target-boundary-design'],
  semanticCapabilityIds: ['target.diagnostics.read'],
  targetScope: ['workspace'],
  contextScope: ['workspace_metadata'],
  permissionMode: 'read_only',
  trustPolicy: {
    boundary: 'Workspace',
    dataEgress: 'Blocked'
  },
  capabilities: [{
    source: 'builtin_tool',
    resourceType: 'kubernetes',
    resourceScope: 'target_inventory',
    toolId: 'list_resources',
    operation: 'read',
    requiresApproval: false
  }],
  workflowsUsingAgent: [],
  triggers: [],
  activity: { runCount: 0 },
  auditHistory: []
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
  semanticCapabilityIds: ['target.diagnostics.read'],
  capabilityRestrictionMode: 'restrict',
  agents: [{
    agentId: agent.id,
    name: agent.name,
    role: 'Direct',
    required: true
  }],
  requiredPermissions: ['read_workspace_data', 'create_read_only_runs'],
  contextGrants: ['workspace_metadata'],
  inputs: [],
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
    expect(review[0].mcpServers).toEqual(['acornops-target-agent']);
    expect(review[0].semanticCapabilityIds).toEqual(['target.diagnostics.read']);
    expect(review[0].skills).toEqual(['acornops-observability', 'acornops-target-boundary-design']);
    expect(review[0].tools).toEqual(['get_resource', 'get_resource_logs', 'list_resources']);
    expect(review[0].tools).not.toContain('target.diagnostics.read');
    expect(review[0].actionPolicy).toEqual([
      'Permission mode: Read only',
      'Approval gate: Writes are disabled'
    ]);
    expect(review[0].capabilityRules).toContain('read kubernetes target_inventory via list_resources');
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
    expect(review.every((item) => item.role === 'AcornOps-coordinated' && item.required)).toBe(true);
    expect(new Set(review.flatMap((item) => item.tools))).toEqual(new Set([
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

    expect(askBeforeChanges[0].actionPolicy).toEqual([
      'Permission mode: Ask before changes',
      'Approval gate: Before every write-capable tool'
    ]);
    expect(automaticRoutineChanges[0].actionPolicy).toEqual([
      'Permission mode: Automatic routine changes',
      'Approval gate: Before high-risk or destructive writes'
    ]);
  });
});
