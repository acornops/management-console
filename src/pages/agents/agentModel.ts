import type { AgentCapability, AgentProviderType, AgentStatus, AgentTriggerDefinitionApi } from '@/services/control-plane/agentApi';

export interface AgentDefinition {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  instructions: string;
  status: AgentStatus;
  providerType: AgentProviderType;
  owner: string;
  version: number;
  mcpServers: string[];
  tools: string[];
  skills: string[];
  targetScope: string[];
  contextScope: string[];
  approvalPolicy: {
    sensitiveActions: 'approval_required' | 'allowed' | 'blocked';
    writeActions: 'approval_required' | 'allowed' | 'blocked';
  };
  trustPolicy: {
    boundary: string;
    dataEgress: string;
  };
  capabilities: AgentCapability[];
  workflowsUsingAgent: string[];
  triggers: AgentTriggerDefinitionApi[];
  auditHistory: Array<{ id: string; summary: string; occurredAt: string }>;
  health: {
    status: 'healthy' | 'degraded' | 'unknown';
    summary: string;
  };
}

const defaultWorkspaceId = 'current-workspace';

export function createDefaultAgentDefinitions(workspaceId = defaultWorkspaceId): AgentDefinition[] {
  return [
    {
      id: 'agent-cluster-triage',
      workspaceId,
      name: 'Kubernetes Diagnostics',
      description: 'Read cluster inventory, events, logs, and metrics for incident triage.',
      instructions: 'Use read-only cluster inventory, event, log, and metric tools.',
      status: 'active',
      providerType: 'internal',
      owner: 'Platform Engineering',
      version: 3,
      mcpServers: ['acornops-cluster-agent'],
      tools: ['inventory.resources.list', 'events.search', 'logs.summarize', 'metrics.query'],
      skills: ['acornops-observability', 'acornops-target-boundary-design'],
      targetScope: ['kubernetes:*'],
      contextScope: ['workspace_metadata', 'target_inventory'],
      approvalPolicy: {
        sensitiveActions: 'approval_required',
        writeActions: 'blocked'
      },
      trustPolicy: {
        boundary: 'Internal AcornOps runtime',
        dataEgress: 'Workspace only'
      },
      capabilities: [
        { source: 'mcp_tool', resourceType: 'kubernetes', resourceScope: 'target_inventory', toolId: 'inventory.resources.list', operation: 'read', requiresApproval: false },
        { source: 'mcp_tool', resourceType: 'kubernetes', resourceScope: 'events', toolId: 'events.search', operation: 'read', requiresApproval: false },
        { source: 'mcp_tool', resourceType: 'kubernetes', resourceScope: 'logs', toolId: 'logs.summarize', operation: 'read', requiresApproval: true },
        { source: 'mcp_tool', resourceType: 'kubernetes', resourceScope: 'metrics', toolId: 'metrics.query', operation: 'read', requiresApproval: false },
        { source: 'skill', resourceType: 'skill', resourceScope: 'diagnostics', operation: 'read', requiresApproval: false }
      ],
      workflowsUsingAgent: ['Cluster triage'],
      triggers: [{ id: 'manual-cluster-triage', type: 'manual', enabled: true, name: 'Manual run' }],
      auditHistory: [
        { id: 'audit-agent-k8s-1', summary: 'Logs access changed to require approval', occurredAt: 'Today 09:12' },
        { id: 'audit-agent-k8s-2', summary: 'Metrics query tool enabled', occurredAt: 'Jun 24 14:20' }
      ],
      health: {
        status: 'healthy',
        summary: 'Last test passed 8 minutes ago'
      }
    },
    {
      id: 'agent-release-coordinator',
      workspaceId,
      name: 'Repository Operator',
      description: 'Prepare repository changes and pull requests through approved GitHub tools.',
      instructions: 'Coordinate release checks and request approval before write tools.',
      status: 'active',
      providerType: 'external',
      owner: 'Developer Experience',
      version: 2,
      mcpServers: ['github'],
      tools: ['github.repositories.read', 'github.branches.list', 'github.branches.create', 'github.prs.create'],
      skills: ['acornops-cross-repo-change', 'acornops-open-pr'],
      targetScope: ['repository:selected'],
      contextScope: ['workspace_metadata'],
      approvalPolicy: {
        sensitiveActions: 'approval_required',
        writeActions: 'approval_required'
      },
      trustPolicy: {
        boundary: 'External provider identity verified',
        dataEgress: 'Repository metadata and approved diffs only'
      },
      capabilities: [
        { source: 'mcp_tool', resourceType: 'repository', resourceScope: 'selected_repository', toolId: 'github.repositories.read', operation: 'read', requiresApproval: false },
        { source: 'mcp_tool', resourceType: 'repository', resourceScope: 'selected_repository', toolId: 'github.branches.create', operation: 'write', requiresApproval: true },
        { source: 'mcp_tool', resourceType: 'repository', resourceScope: 'selected_repository', toolId: 'github.prs.create', operation: 'write', requiresApproval: true },
        { source: 'skill', resourceType: 'skill', resourceScope: 'pull_request', operation: 'write', requiresApproval: true }
      ],
      workflowsUsingAgent: ['Repository operation'],
      triggers: [{ id: 'manual-release-coordinator', type: 'manual', enabled: true, name: 'Manual run' }],
      auditHistory: [
        { id: 'audit-agent-repo-1', summary: 'External capability manifest reviewed', occurredAt: 'Yesterday 15:30' }
      ],
      health: {
        status: 'degraded',
        summary: 'GitHub token rotation due in 2 days'
      }
    },
    {
      id: 'agent-incident-reporter',
      workspaceId,
      name: 'Incident Reporter',
      description: 'Read selected incident chats and generate timeline reports or PDF artifacts.',
      instructions: 'Use selected chat context only after approval and write the requested report artifact.',
      status: 'active',
      providerType: 'internal',
      owner: 'SRE',
      version: 1,
      mcpServers: ['workspace-chat', 'artifact-writer'],
      tools: ['chat.sessions.read_selected', 'reports.pdf.generate'],
      skills: ['acornops-observability'],
      targetScope: ['workspace:current'],
      contextScope: ['selected_chat_sessions'],
      approvalPolicy: {
        sensitiveActions: 'approval_required',
        writeActions: 'approval_required'
      },
      trustPolicy: {
        boundary: 'Internal AcornOps runtime',
        dataEgress: 'Approved report artifact only'
      },
      capabilities: [
        { source: 'context', resourceType: 'chat_session', resourceScope: 'selected_chat_sessions', toolId: 'chat.sessions.read_selected', operation: 'read', requiresApproval: true },
        { source: 'builtin_tool', resourceType: 'artifact', resourceScope: 'report', toolId: 'reports.pdf.generate', operation: 'write', requiresApproval: true }
      ],
      workflowsUsingAgent: ['Incident report PDF'],
      triggers: [{ id: 'manual-incident-reporter', type: 'manual', enabled: true, name: 'Manual run' }],
      auditHistory: [
        { id: 'audit-agent-report-1', summary: 'Draft agent created from incident reporting template', occurredAt: 'Jun 20 10:05' }
      ],
      health: {
        status: 'unknown',
        summary: 'Test run required before activation'
      }
    }
  ];
}

export function getAgentCapabilitySummary(agent: AgentDefinition): string {
  const approvalCopy = agent.capabilities.some((capability) => capability.requiresApproval)
    ? 'approval required'
    : 'no approvals';
  return `${agent.mcpServers.length} MCP server${agent.mcpServers.length === 1 ? '' : 's'}, ${agent.tools.length} tools, ${agent.skills.length} skills, ${approvalCopy}`;
}

export function filterAgentDefinitions(agents: AgentDefinition[], query: string): AgentDefinition[] {
  const tokens = query.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return agents;

  return agents.filter((agent) => {
    const searchable = [
      agent.name,
      agent.description,
      agent.status,
      agent.providerType,
      agent.owner,
      agent.mcpServers.join(' '),
      agent.tools.join(' '),
      agent.skills.join(' '),
      agent.targetScope.join(' '),
      agent.contextScope.join(' '),
      agent.workflowsUsingAgent.join(' '),
      agent.trustPolicy.boundary,
      agent.trustPolicy.dataEgress
    ].join(' ').toLowerCase();

    return tokens.every((token) => searchable.includes(token));
  });
}
