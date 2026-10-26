import type { RunPermissionMode } from '@/services/control-plane/runPermissionTypes';
import type { FixtureResponse } from './router';
import type { FixtureState } from './store';

interface FixtureClusterPermissionPolicy {
  permissionMode?: RunPermissionMode;
  permissionModeOverride?: RunPermissionMode | null;
  permissionModeSource?: 'cluster_override' | 'deployment_default';
  writeConfirmationPolicy?: {
    effectiveRequired: boolean;
    overrideRequired: boolean | null;
    source: 'cluster_override' | 'deployment_default';
  };
}

function applyClusterPermissionFixturePatch(
  cluster: FixtureClusterPermissionPolicy,
  input: Record<string, any>
): void {
  const hasCanonicalMode = Object.prototype.hasOwnProperty.call(input, 'permissionModeOverride');
  const hasLegacyMode = Object.prototype.hasOwnProperty.call(input, 'writeConfirmationRequiredOverride');
  if (!hasCanonicalMode && !hasLegacyMode) return;

  const override: RunPermissionMode | null = hasCanonicalMode
    ? input.permissionModeOverride
    : input.writeConfirmationRequiredOverride === null
      ? null
      : input.writeConfirmationRequiredOverride
        ? 'ask_before_changes'
        : 'auto_allowed_changes';
  cluster.permissionModeOverride = override;
  cluster.permissionMode = override ?? 'ask_before_changes';
  cluster.permissionModeSource = override === null ? 'deployment_default' : 'cluster_override';
  cluster.writeConfirmationPolicy = {
    effectiveRequired: cluster.permissionMode !== 'auto_allowed_changes',
    overrideRequired: override === null ? null : override !== 'auto_allowed_changes',
    source: cluster.permissionModeSource
  };
}

export async function routeClusterFixtureRequest({ method, path, request, state }: {
  method: string; path: string; request: Request; state: FixtureState;
}): Promise<FixtureResponse | null> {
  const match = path.match(/^\/api\/v1\/workspaces\/([^/]+)\/kubernetes-clusters\/([^/]+)(?:\/(install-instructions|rotate-agent-key))?$/);
  if (!match) return null;
  const json = (body: unknown, status = 200): FixtureResponse => ({ status, body, headers: { 'content-type': 'application/json' } });
  const clusterId = decodeURIComponent(match[2]);
  const cluster = state.clusters.find((item) => item.id === clusterId && item.workspaceId === decodeURIComponent(match[1]));
  if (!cluster) return json({ error: { code: 'FIXTURE_NOT_FOUND', message: 'Kubernetes cluster was not found in the frontend fixture store.' } }, 404);
  if (match[3] === 'install-instructions' && method === 'GET') {
    return json({ clusterId, installInstructions: { command: 'fixture-mode: credential-preserving AgentK repair', warnings: ['Verify your Kubernetes context, release name, and namespace.'] } });
  }
  if (match[3] === 'rotate-agent-key' && method === 'POST') {
    return json({ clusterId, agentKey: 'ak_fixture_rotated_local_only', keyVersion: 2, installInstructions: { command: 'fixture-mode: no agent installation is required', warnings: [] } });
  }
  if (match[3]) return null;
  if (method === 'GET') return json(structuredClone(cluster));
  if (method === 'PATCH') {
    const value = await request.json().catch(() => null) as unknown;
    const input = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
    Object.assign(cluster, input);
    applyClusterPermissionFixturePatch(cluster, input);
    return json(structuredClone(cluster));
  }
  if (method === 'DELETE') {
    state.clusters = state.clusters.filter((item) => item.id !== clusterId);
    return { status: 204 };
  }
  return null;
}
