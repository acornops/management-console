import { FIXTURE_IDS, getFixtureState } from './store';

type FixtureState = ReturnType<typeof getFixtureState>;
const NOW = '2026-07-15T08:30:00.000Z';

export function targetSummary(target: Record<string, any>): Record<string, unknown> {
  const isVm = target.osFamily === 'linux';
  return {
    id: target.id,
    workspaceId: target.workspaceId,
    targetType: isVm ? 'virtual_machine' : 'kubernetes',
    name: target.name,
    status: target.status,
    metadata: isVm
      ? { hostname: target.hostname, osFamily: target.osFamily, serviceManager: target.serviceManager }
      : { clusterId: target.id, namespaceInclude: target.namespaceInclude, namespaceExclude: target.namespaceExclude },
    createdAt: target.createdAt || '2026-07-15T07:45:00.000Z',
    updatedAt: target.updatedAt || NOW
  };
}

export function workflowOptions(state: FixtureState) {
  return {
    clusters: state.clusters.map((cluster) => ({ value: cluster.id, label: cluster.name, description: 'Connected Kubernetes cluster', provenance: { source: 'target', targetId: cluster.id, targetName: cluster.name } })),
    mcpServers: [{ value: 'fixture-mcp', label: 'AcornOps Kubernetes Tools', description: 'Target-native Kubernetes tools', provenance: { source: 'target', targetId: FIXTURE_IDS.cluster, targetName: 'Singapore Production', serverId: 'fixture-mcp' } }],
    mcpTools: state.targetTools.map((tool) => ({ value: `fixture-mcp:${tool.name}`, label: tool.name, description: tool.description, provenance: { source: 'target', targetId: FIXTURE_IDS.cluster, serverId: 'fixture-mcp', toolName: tool.name } })),
    skills: state.targetSkills.map((skill) => ({ value: skill.id, label: skill.name, description: skill.description, provenance: { source: 'target', targetId: FIXTURE_IDS.cluster } })),
    agents: state.agents.map((agent) => ({ value: agent.id, label: agent.name, description: agent.description, provenance: { source: 'agent', agentId: agent.id } })),
    chatSessions: state.sessions.map((session) => ({ value: session.id, label: session.title, provenance: { source: 'target', targetId: session.targetId } })),
    outputFormats: [{ value: 'markdown', label: 'Markdown' }, { value: 'json', label: 'JSON' }],
    approvalPolicies: [{ value: 'ask_before_changes', label: 'Ask before changes' }],
    runtimeLimits: [{ value: '600', label: '10 minutes' }],
    retentionPolicies: [{ value: '30', label: '30 days' }],
    sourceAvailability: {
      clusters: { status: 'available' }, mcpServers: { status: 'available' }, mcpTools: { status: 'available' },
      skills: { status: 'available' }, agents: { status: 'available' }, chatSessions: { status: 'available' }
    }
  };
}

export function targetToolCatalog(state: FixtureState, targetId: string) {
  const targetType = targetId === FIXTURE_IDS.virtualMachine ? 'virtual_machine' : 'kubernetes';
  return {
    workspaceId: FIXTURE_IDS.workspace,
    targetId,
    targetType,
    permissions: { canEdit: true, editableRoles: ['owner', 'admin'] },
    items: [
      {
        id: 'web_search',
        label: 'Web Search',
        description: 'Allow assistant runs for this target to search the web through the selected LLM provider.',
        enabled: true,
        origin: 'target_setting',
        capability: 'read',
        runtimeKind: 'provider_native',
        visibility: { appearsInAssistantToolList: true, appearsInRunEnabledTools: true, appearsInToolCalls: false },
        permissions: { canEdit: true },
        config: { domainFilters: { allowedDomains: [], blockedDomains: [] } }
      },
      {
        id: 'target_insights',
        label: 'Insights',
        description: 'Retrieve and improve target-specific troubleshooting insights for future assistant runs.',
        enabled: true,
        origin: 'target_setting',
        capability: 'read',
        runtimeKind: 'function',
        visibility: { appearsInAssistantToolList: true, appearsInRunEnabledTools: true, appearsInToolCalls: false },
        readiness: { learningAvailable: true, learningPausedReason: null },
        permissions: { canEdit: true },
        config: {
          learning: {
            idleCheckpointDelayMinutes: 30,
            minimumObservationsBeforeGeneralization: 3,
            checkpointModel: { mode: 'workspace_default' }
          },
          retrieval: { maxSnippetsPerRetrieval: 4, maxSnippetSizeBytes: 1536 }
        }
      },
      {
        id: 'reports.pdf.generate',
        label: 'Generate PDF report',
        description: 'Persist a bounded, provenance-linked PDF report artifact for the current workflow run.',
        enabled: true,
        origin: 'platform_native',
        capability: 'read',
        runtimeKind: 'function',
        visibility: { appearsInAssistantToolList: true, appearsInRunEnabledTools: true, appearsInToolCalls: true },
        permissions: { canEdit: false },
        config: { authorizationClass: 'internal_artifact' }
      }
    ]
  };
}
