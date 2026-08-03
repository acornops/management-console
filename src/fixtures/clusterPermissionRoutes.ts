import type { RunPermissionMode } from '@/services/control-plane/runPermissionTypes';

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

export function applyClusterPermissionFixturePatch(
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
