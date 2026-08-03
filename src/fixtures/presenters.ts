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
    agents: state.agents.map((agent) => ({ value: agent.id, label: agent.name, description: agent.description, provenance: { source: 'agent', agentId: agent.id } })),
    sourceAvailability: {
      agents: { status: 'available' }
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
        enabled: state.targetToolSettings.web_search ?? true,
        toggleable: true,
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
        enabled: state.targetToolSettings.target_insights ?? true,
        toggleable: true,
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
        id: 'documents.create',
        label: 'Create Document',
        description: 'Create a PDF or Markdown document.',
        enabled: state.targetToolSettings['documents.create'] ?? true,
        toggleable: true,
        origin: 'platform_native',
        capability: 'read',
        runtimeKind: 'function',
        visibility: { appearsInAssistantToolList: true, appearsInRunEnabledTools: true, appearsInToolCalls: true },
        permissions: { canEdit: true },
        config: { authorizationClass: 'internal_artifact' }
      }
    ]
  };
}
