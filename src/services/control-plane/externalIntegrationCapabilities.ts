import type {
  ControlPlaneExternalIntegrationGrantableWorkspace,
  ControlPlaneWorkspaceCapability
} from './externalIntegrationTypes';

const externalIntegrationCapabilityLabels: Record<string, string> = {
  read_workspace_data: 'Read workspace data',
  create_sessions: 'Create sessions',
  create_read_only_runs: 'Create read-only runs',
  create_read_write_runs: 'Create read-write runs'
};

const dependentCapabilityOrder: ControlPlaneWorkspaceCapability[] = [
  'read_workspace_data',
  'create_sessions',
  'create_read_only_runs',
  'create_read_write_runs'
];

export function formatExternalIntegrationCapability(capability: ControlPlaneWorkspaceCapability): string {
  return externalIntegrationCapabilityLabels[capability]
    || capability
      .split('_')
      .filter(Boolean)
      .join(' ')
      .replace(/^./, (character) => character.toUpperCase());
}

export function normalizeExternalIntegrationCapabilities(
  capabilities: ControlPlaneWorkspaceCapability[]
): ControlPlaneWorkspaceCapability[] {
  const uniqueCapabilities = [...new Set(capabilities)];
  const next = new Set(uniqueCapabilities);
  if (next.has('create_read_only_runs') || next.has('create_read_write_runs')) next.add('create_sessions');
  if (next.has('create_sessions')) next.add('read_workspace_data');
  if (!next.has('read_workspace_data')) {
    next.delete('create_sessions');
    next.delete('create_read_only_runs');
    next.delete('create_read_write_runs');
  }
  if (!next.has('create_sessions')) {
    next.delete('create_read_only_runs');
    next.delete('create_read_write_runs');
  }
  const normalized = dependentCapabilityOrder.filter((capability) => next.has(capability));
  for (const capability of uniqueCapabilities) {
    if (next.has(capability) && !normalized.includes(capability)) normalized.push(capability);
  }
  return normalized;
}

export type ExternalIntegrationGrantDraft = Record<string, ControlPlaneWorkspaceCapability[]>;

export function createExternalIntegrationGrantDraft(
  workspaces: ControlPlaneExternalIntegrationGrantableWorkspace[]
): ExternalIntegrationGrantDraft {
  return Object.fromEntries(workspaces.map((workspace) => [
    workspace.workspaceId,
    normalizeExternalIntegrationCapabilities(workspace.grantedCapabilities)
  ]));
}

export function setExternalIntegrationWorkspaceEnabled(
  draft: ExternalIntegrationGrantDraft,
  workspace: ControlPlaneExternalIntegrationGrantableWorkspace,
  enabled: boolean
): ExternalIntegrationGrantDraft {
  return {
    ...draft,
    [workspace.workspaceId]: enabled && workspace.grantableCapabilities.includes('read_workspace_data')
      ? ['read_workspace_data']
      : []
  };
}

export function toggleExternalIntegrationCapability(
  draft: ExternalIntegrationGrantDraft,
  workspace: ControlPlaneExternalIntegrationGrantableWorkspace,
  capability: ControlPlaneWorkspaceCapability,
  enabled: boolean
): ExternalIntegrationGrantDraft {
  const selected = new Set(draft[workspace.workspaceId] || []);
  if (enabled) selected.add(capability);
  else selected.delete(capability);
  const grantable = new Set(workspace.grantableCapabilities);
  return {
    ...draft,
    [workspace.workspaceId]: normalizeExternalIntegrationCapabilities([...selected].filter((item) => grantable.has(item)))
  };
}

export function externalIntegrationWorkspaceGrants(draft: ExternalIntegrationGrantDraft): Array<{
  workspaceId: string;
  capabilities: ControlPlaneWorkspaceCapability[];
}> {
  return Object.entries(draft)
    .filter(([, capabilities]) => capabilities.length > 0)
    .map(([workspaceId, capabilities]) => ({ workspaceId, capabilities }));
}
