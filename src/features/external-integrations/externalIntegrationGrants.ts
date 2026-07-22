import type { ControlPlaneWorkspaceCapability } from '@/services/controlPlaneApi';

const externalIntegrationCapabilities: ControlPlaneWorkspaceCapability[] = [
  'read_workspace_data',
  'create_sessions',
  'create_read_only_runs'
];

export function normalizeExternalIntegrationCapabilities(
  capabilities: ControlPlaneWorkspaceCapability[],
  allowedCapabilities: ControlPlaneWorkspaceCapability[] = externalIntegrationCapabilities
): ControlPlaneWorkspaceCapability[] {
  const allowed = new Set(allowedCapabilities);
  const next = new Set(capabilities.filter((capability) => allowed.has(capability)));

  if (next.has('create_read_only_runs')) {
    if (allowed.has('create_sessions') && allowed.has('read_workspace_data')) {
      next.add('create_sessions');
      next.add('read_workspace_data');
    } else {
      next.delete('create_read_only_runs');
    }
  }
  if (next.has('create_sessions')) {
    if (allowed.has('read_workspace_data')) next.add('read_workspace_data');
    else next.delete('create_sessions');
  }
  if (!next.has('read_workspace_data')) {
    next.delete('create_sessions');
    next.delete('create_read_only_runs');
  }
  if (!next.has('create_sessions')) next.delete('create_read_only_runs');

  return externalIntegrationCapabilities.filter((capability) => next.has(capability));
}

export function buildExternalIntegrationWorkspaceGrants(
  draft: Record<string, ControlPlaneWorkspaceCapability[]>
): Array<{ workspaceId: string; capabilities: ControlPlaneWorkspaceCapability[] }> {
  return Object.entries(draft)
    .filter(([, capabilities]) => capabilities.length > 0)
    .map(([workspaceId, capabilities]) => ({ workspaceId, capabilities }));
}
