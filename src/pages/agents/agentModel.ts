import type { AgentActivityRecordApi, AgentCapability, AgentProviderType, AgentStatus, AgentTargetScopeApi, AgentTriggerDefinitionApi } from '@/services/control-plane/agentApi';
import { formatUserDateTime } from '@/utils/dateTime';

export interface AgentDefinition {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  instructions: string;
  status: AgentStatus;
  source?: 'system' | 'user';
  providerType: AgentProviderType;
  ownerUserId?: string;
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
  activity: {
    runCount: number;
    lastRunAt?: string;
    lastStatus?: AgentActivityRecordApi['status'];
  };
  auditHistory: Array<{ id: string; summary: string; occurredAt: string }>;
}

const defaultWorkspaceId = 'current-workspace';
const defaultDevOwnerUserId = 'user-1';
const defaultDevOwnerName = 'Dev User';

export function createDefaultAgentDefinitions(workspaceId = defaultWorkspaceId): AgentDefinition[] {
  return [
    {
      id: 'agent-cluster-triage',
      workspaceId,
      name: 'Kubernetes Diagnostics',
      description: 'Reads Kubernetes inventory, resource details, and logs for cluster triage through the built-in AgentK tools.',
      instructions: 'Use only the read-only get_resource, get_resource_logs, and list_resources tools.',
      status: 'active',
      source: 'system',
      providerType: 'internal',
      ownerUserId: defaultDevOwnerUserId,
      owner: defaultDevOwnerName,
      version: 2,
      mcpServers: ['acornops-target-agent'],
      tools: ['get_resource', 'get_resource_logs', 'list_resources'],
      skills: ['acornops-observability', 'acornops-target-boundary-design'],
      targetScope: ['kubernetes:*'],
      contextScope: ['workspace_metadata', 'target_inventory'],
      approvalPolicy: {
        sensitiveActions: 'allowed',
        writeActions: 'blocked'
      },
      trustPolicy: {
        boundary: 'Internal AcornOps runtime',
        dataEgress: 'Workspace only'
      },
      capabilities: [
        { source: 'mcp_tool', resourceType: 'kubernetes', resourceScope: 'resource', toolId: 'get_resource', operation: 'read', requiresApproval: false },
        { source: 'mcp_tool', resourceType: 'kubernetes', resourceScope: 'logs', toolId: 'get_resource_logs', operation: 'read', requiresApproval: false },
        { source: 'mcp_tool', resourceType: 'kubernetes', resourceScope: 'target_inventory', toolId: 'list_resources', operation: 'read', requiresApproval: false },
        { source: 'skill', resourceType: 'skill', resourceScope: 'diagnostics', operation: 'read', requiresApproval: false }
      ],
      workflowsUsingAgent: ['Cluster triage'],
      triggers: [{ id: 'manual-cluster-triage', type: 'manual', enabled: true, name: 'Manual run' }],
      activity: {
        runCount: 18,
        lastRunAt: 'Today 09:12',
        lastStatus: 'completed'
      },
      auditHistory: [
        { id: 'audit-agent-k8s-1', summary: 'Built-in Kubernetes tool scope synchronized', occurredAt: 'Today 09:12' },
        { id: 'audit-agent-k8s-2', summary: 'Read-only diagnostics policy confirmed', occurredAt: 'Jun 24 14:20' }
      ]
    },
    {
      id: 'agent-release-coordinator',
      workspaceId,
      name: 'Repository Operator',
      description: 'Coordinates repository operations after an administrator assigns workspace MCP capabilities.',
      instructions: 'Use only assigned MCP tools and request approval before write operations.',
      status: 'active',
      source: 'system',
      providerType: 'internal',
      ownerUserId: defaultDevOwnerUserId,
      owner: defaultDevOwnerName,
      version: 2,
      mcpServers: [],
      tools: [],
      skills: ['acornops-cross-repo-change', 'acornops-open-pr'],
      targetScope: ['workspace'],
      contextScope: ['workspace_metadata'],
      approvalPolicy: {
        sensitiveActions: 'approval_required',
        writeActions: 'approval_required'
      },
      trustPolicy: {
        boundary: 'Workspace MCP grants only',
        dataEgress: 'Only through assigned MCP servers'
      },
      capabilities: [
        { source: 'skill', resourceType: 'skill', resourceScope: 'pull_request', operation: 'write', requiresApproval: true }
      ],
      workflowsUsingAgent: ['Repository operation'],
      triggers: [{ id: 'manual-release-coordinator', type: 'manual', enabled: true, name: 'Manual run' }],
      activity: {
        runCount: 7,
        lastRunAt: 'Yesterday 15:30',
        lastStatus: 'failed'
      },
      auditHistory: [
        { id: 'audit-agent-repo-1', summary: 'External capability manifest reviewed', occurredAt: 'Yesterday 15:30' }
      ]
    },
    {
      id: 'agent-incident-reporter',
      workspaceId,
      name: 'Incident Reporter',
      description: 'Reads selected incident chats and generates timeline PDF reports. It cannot access unselected chats.',
      instructions: 'Use selected chat context only after approval and write the requested report artifact.',
      status: 'active',
      source: 'system',
      providerType: 'internal',
      ownerUserId: defaultDevOwnerUserId,
      owner: defaultDevOwnerName,
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
      activity: {
        runCount: 0
      },
      auditHistory: [
        { id: 'audit-agent-report-1', summary: 'Draft agent created from incident reporting template', occurredAt: 'Jun 20 10:05' }
      ]
    }
  ];
}

export function getAgentCapabilitySummary(agent: AgentDefinition): string {
  const approvalCopy = agent.capabilities.some((capability) => capability.requiresApproval)
    ? 'approval required'
    : 'no approvals';
  return `${agent.mcpServers.length} MCP server${agent.mcpServers.length === 1 ? '' : 's'}, ${agent.tools.length} tools, ${agent.skills.length} skills, ${approvalCopy}`;
}

export interface AgentActivitySummary {
  lastRun: string;
  status: string;
  line: string;
}

function formatActivityTimestamp(value: string): string {
  return formatUserDateTime(value, { fallback: value });
}

export function getAgentActivitySummary(agent: AgentDefinition): AgentActivitySummary {
  if (!agent.activity.lastRunAt) {
    return {
      lastRun: 'No runs yet',
      status: 'not run',
      line: 'No runs yet'
    };
  }
  const status = agent.activity.lastStatus || 'unknown';
  const lastRun = formatActivityTimestamp(agent.activity.lastRunAt);
  return {
    lastRun,
    status,
    line: `Last run: ${lastRun} · ${status}`
  };
}

const titleCase = (value: string): string =>
  value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function getAgentAccessClass(agent: AgentDefinition): string {
  const scopedResourceTypes = agent.targetScope.flatMap((scope) => {
    const [resourceType] = scope.split(':', 1);
    return resourceType && resourceType !== 'workspace' && resourceType !== 'scope' ? [resourceType] : [];
  });
  const resourceTypes = scopedResourceTypes.length > 0
    ? Array.from(new Set(scopedResourceTypes))
    : Array.from(new Set(agent.capabilities.map((capability) => capability.resourceType).filter(Boolean)));
  const resourceLabel = resourceTypes.length === 1 ? titleCase(resourceTypes[0]) : resourceTypes.length > 1 ? 'Mixed resources' : 'Workspace';
  if (agent.approvalPolicy.writeActions === 'blocked') return `${resourceLabel} read, write blocked`;
  if (agent.approvalPolicy.writeActions === 'approval_required') return `${resourceLabel} read, write gated`;
  return `${resourceLabel} read/write`;
}

export function targetScopeFromTokens(tokens: string[]): AgentTargetScopeApi {
  const normalized = tokens.map((token) => token.trim()).filter(Boolean);
  const explicitScope = normalized.find((token) => token.startsWith('scope:'))?.slice('scope:'.length);
  const targetTypes = normalized.flatMap((token) => {
    if (token.startsWith('target-type:')) return [token.slice('target-type:'.length)];
    if (token.endsWith(':*')) return [token.slice(0, -2)];
    return [];
  });
  const targetIds = normalized.flatMap((token) => {
    if (token.startsWith('target:')) return [token.slice('target:'.length)];
    const [kind, id] = token.split(':', 2);
    if (kind && id && id !== '*' && kind !== 'scope' && kind !== 'target-type' && kind !== 'workspace') return [id];
    return [];
  });
  const uniqueTargetTypes = Array.from(new Set(targetTypes));
  const uniqueTargetIds = Array.from(new Set(targetIds));
  if ((explicitScope === 'workspace' || normalized.includes('workspace:current') || normalized.includes('workspace')) && uniqueTargetTypes.length === 0 && uniqueTargetIds.length === 0) {
    return { type: 'workspace' };
  }
  return {
    type: 'selected_target',
    ...(uniqueTargetTypes.length > 0 ? { targetTypes: uniqueTargetTypes } : {}),
    ...(uniqueTargetIds.length > 0 ? { targetIds: uniqueTargetIds } : {})
  };
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
