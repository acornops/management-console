import type { ControlPlaneWorkspaceCapability } from '@/services/controlPlaneApi';

const externalIntegrationCapabilities: ControlPlaneWorkspaceCapability[] = [
  'read_workspace_data',
  'create_sessions',
  'create_read_only_runs',
  'create_read_write_runs'
];

export function normalizeExternalIntegrationCapabilities(
  capabilities: ControlPlaneWorkspaceCapability[],
  allowedCapabilities: ControlPlaneWorkspaceCapability[] = externalIntegrationCapabilities
): ControlPlaneWorkspaceCapability[] {
  const allowed = new Set(allowedCapabilities);
  const uniqueCapabilities = [...new Set(capabilities)];
  const next = new Set(uniqueCapabilities.filter((capability) => allowed.has(capability)));

  if (next.has('create_read_only_runs') || next.has('create_read_write_runs')) {
    if (allowed.has('create_sessions') && allowed.has('read_workspace_data')) {
      next.add('create_sessions');
      next.add('read_workspace_data');
    } else {
      next.delete('create_read_only_runs');
      next.delete('create_read_write_runs');
    }
  }
  if (next.has('create_sessions')) {
    if (allowed.has('read_workspace_data')) next.add('read_workspace_data');
    else next.delete('create_sessions');
  }
  if (!next.has('read_workspace_data')) {
    next.delete('create_sessions');
    next.delete('create_read_only_runs');
    next.delete('create_read_write_runs');
  }
  if (!next.has('create_sessions')) {
    next.delete('create_read_only_runs');
    next.delete('create_read_write_runs');
  }

  const normalized = externalIntegrationCapabilities.filter((capability) => next.has(capability));
  for (const capability of uniqueCapabilities) {
    if (next.has(capability) && !normalized.includes(capability)) normalized.push(capability);
  }
  return normalized;
}

export type ExternalIntegrationGrantDraft = Record<string, ControlPlaneWorkspaceCapability[]>;

export function createExternalIntegrationGrantDraft(
  workspaces: Array<{
    workspaceId: string;
    grantedCapabilities: ControlPlaneWorkspaceCapability[];
    grantableCapabilities: ControlPlaneWorkspaceCapability[];
  }>
): ExternalIntegrationGrantDraft {
  return Object.fromEntries(workspaces.map((workspace) => [
    workspace.workspaceId,
    normalizeExternalIntegrationCapabilities(workspace.grantedCapabilities, workspace.grantableCapabilities)
  ]));
}

export function setExternalIntegrationWorkspaceEnabled(
  draft: ExternalIntegrationGrantDraft,
  workspace: { workspaceId: string; grantableCapabilities: ControlPlaneWorkspaceCapability[] },
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
  workspace: { workspaceId: string; grantableCapabilities: ControlPlaneWorkspaceCapability[] },
  capability: ControlPlaneWorkspaceCapability,
  enabled: boolean
): ExternalIntegrationGrantDraft {
  const selected = new Set(draft[workspace.workspaceId] || []);
  if (enabled) selected.add(capability);
  else selected.delete(capability);
  return {
    ...draft,
    [workspace.workspaceId]: normalizeExternalIntegrationCapabilities(
      [...selected],
      workspace.grantableCapabilities
    )
  };
}

export function formatExternalIntegrationCapability(capability: ControlPlaneWorkspaceCapability): string {
  return capability
    .split('_')
    .filter(Boolean)
    .join(' ')
    .replace(/^./, (character) => character.toUpperCase());
}

export function buildExternalIntegrationWorkspaceGrants(
  draft: Record<string, ControlPlaneWorkspaceCapability[]>
): Array<{ workspaceId: string; capabilities: ControlPlaneWorkspaceCapability[] }> {
  return Object.entries(draft)
    .filter(([, capabilities]) => capabilities.length > 0)
    .map(([workspaceId, capabilities]) => ({ workspaceId, capabilities }));
}
