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
  health: {
    status: 'healthy' | 'degraded' | 'unknown';
    summary: string;
  };
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
      description: 'Reads Kubernetes inventory, events, logs, and metrics for cluster triage. Log access requires approval.',
      instructions: 'Use read-only cluster inventory, event, log, and metric tools.',
      status: 'active',
      source: 'system',
      providerType: 'internal',
      ownerUserId: defaultDevOwnerUserId,
      owner: defaultDevOwnerName,
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
      activity: {
        runCount: 18,
        lastRunAt: 'Today 09:12',
        lastStatus: 'completed'
      },
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
      description: 'Creates branches and pull requests for selected repositories. Write actions require approval before execution.',
      instructions: 'Coordinate release checks and request approval before write tools.',
      status: 'active',
      source: 'system',
      providerType: 'external',
      ownerUserId: defaultDevOwnerUserId,
      owner: defaultDevOwnerName,
      version: 2,
      mcpServers: ['github'],
      tools: ['github.repositories.read', 'github.branches.list', 'github.prs.list', 'github.branches.create', 'github.prs.create'],
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
        { source: 'mcp_tool', resourceType: 'repository', resourceScope: 'selected_repository', toolId: 'github.prs.list', operation: 'read', requiresApproval: false },
        { source: 'mcp_tool', resourceType: 'repository', resourceScope: 'selected_repository', toolId: 'github.branches.create', operation: 'write', requiresApproval: true },
        { source: 'mcp_tool', resourceType: 'repository', resourceScope: 'selected_repository', toolId: 'github.prs.create', operation: 'write', requiresApproval: true },
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

export interface AgentDecisionSummary {
  work: string;
  access: string;
  issue: string;
  line: string;
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

function firstDescriptionSentence(description: string): string {
  const [sentence] = description.trim().split(/(?<=[.!?])\s+/, 1);
  return (sentence || 'Unassigned agent').replace(/[.!?]+$/, '');
}

function getAgentDecisionAccess(agent: AgentDefinition): string {
  if (agent.contextScope.some((scope) => scope.toLowerCase().includes('selected_chat'))) return 'selected chats only';
  if (agent.approvalPolicy.writeActions === 'blocked') return 'read-only';
  if (agent.approvalPolicy.writeActions === 'approval_required') return 'write approval required';
  return 'writes allowed';
}

function summarizeHealthIssue(summary: string): string {
  const normalized = summary.trim().toLowerCase();
  if (!normalized) return 'not active';
  if (normalized.includes('token') && (normalized.includes('rotation') || normalized.includes('review') || normalized.includes('due'))) return 'token review due';
  if (normalized.includes('test')) return 'test required';
  return normalized
    .replace(/^last\s+/, '')
    .replace(/\s+before activation$/, '')
    .replace(/\s+in\s+\d+\s+(minutes?|hours?|days?|weeks?).*$/, '');
}

function getAgentDecisionIssue(agent: AgentDefinition): string {
  if (agent.status === 'disabled') return 'disabled';
  if (agent.health.status === 'unknown') return 'test required';
  if (agent.targetScope.some((scope) => scope.includes('*'))) return 'broad scope';
  if (agent.approvalPolicy.writeActions === 'allowed') return 'ungated writes';
  if (agent.status !== 'active') return 'not active';
  if (agent.health.status === 'degraded') return summarizeHealthIssue(agent.health.summary);
  if (!agent.auditHistory.some((entry) => entry.summary.includes('Test run') || entry.summary.includes('Test queued')) && !agent.health.summary.toLowerCase().includes('passed')) {
    return 'test required';
  }
  return 'ready';
}

export function getAgentDecisionSummary(agent: AgentDefinition): AgentDecisionSummary {
  const work = agent.workflowsUsingAgent[0] || firstDescriptionSentence(agent.description);
  const access = getAgentDecisionAccess(agent);
  const issue = getAgentDecisionIssue(agent);
  return {
    work,
    access,
    issue,
    line: `${work} · ${access} · ${issue}`
  };
}

export function getAgentNextActionLabel(agent: AgentDefinition): 'Run readiness test' | 'Review access' | 'Open details' {
  const issue = getAgentDecisionSummary(agent).issue;
  if (issue === 'test required' || issue === 'not active' || issue === 'disabled') return 'Run readiness test';
  if (issue === 'broad scope' || issue === 'ungated writes' || issue.includes('token')) return 'Review access';
  return 'Open details';
}

const titleCase = (value: string): string =>
  value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function getAgentReviewSignals(agent: AgentDefinition): string[] {
  const signals: string[] = [];
  if (agent.status !== 'active' && agent.status !== 'disabled') signals.push('Agent is not active');
  if (agent.health.status === 'degraded') signals.push(agent.health.summary || 'Health degraded');
  if (agent.targetScope.some((scope) => scope.includes('*'))) signals.push('Broad target scope');
  if (agent.approvalPolicy.writeActions === 'allowed') signals.push('Write tools can run without approval');
  if (!agent.auditHistory.some((entry) => entry.summary.includes('Test run') || entry.summary.includes('Test queued')) && !agent.health.summary.toLowerCase().includes('passed')) {
    signals.push('No recent readiness test');
  }
  return signals;
}

export function getAgentReadinessLabel(agent: AgentDefinition): 'Ready' | 'Action needed' | 'Blocked' | 'Disabled' {
  if (agent.status === 'disabled') return 'Disabled';
  if (agent.health.status === 'unknown') return 'Blocked';
  return getAgentReviewSignals(agent).length > 0 ? 'Action needed' : 'Ready';
}

export function getAgentEligibilityLabel(agent: AgentDefinition): 'Ready' | 'Needs test' | 'Needs review' | 'Blocked' | 'Disabled' {
  if (agent.status === 'disabled') return 'Disabled';
  if (agent.health.status === 'unknown') return 'Needs test';
  const signals = getAgentReviewSignals(agent);
  if (signals.includes('No recent readiness test')) return 'Needs test';
  if (signals.length > 0) return 'Needs review';
  return 'Ready';
}

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
