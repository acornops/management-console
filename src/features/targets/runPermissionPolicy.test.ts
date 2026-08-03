import { describe, expect, it } from 'vitest';

import {
  clusterPermissionModeAllowsWrites,
  clusterPermissionModeRequiresApproval,
  resolveClusterPermissionMode
} from '@/services/control-plane/runPermissionPolicy';

describe('cluster run permission policy', () => {
  it('uses the canonical permission mode when present', () => {
    expect(resolveClusterPermissionMode({ permissionMode: 'read_only' })).toBe('read_only');
    expect(clusterPermissionModeAllowsWrites({ permissionMode: 'read_only' })).toBe(false);
    expect(clusterPermissionModeRequiresApproval({ permissionMode: 'read_only' })).toBe(false);
    expect(clusterPermissionModeRequiresApproval({ permissionMode: 'ask_before_changes' })).toBe(true);
  });

  it('maps legacy confirmation policy during a rolling deployment', () => {
    expect(resolveClusterPermissionMode({
      writeConfirmationPolicy: {
        effectiveRequired: true,
        overrideRequired: null,
        source: 'deployment_default'
      }
    })).toBe('ask_before_changes');
    expect(resolveClusterPermissionMode({
      writeConfirmationPolicy: {
        effectiveRequired: false,
        overrideRequired: false,
        source: 'cluster_override'
      }
    })).toBe('auto_allowed_changes');
  });

  it('defaults old or incomplete responses to ask before changes', () => {
    expect(resolveClusterPermissionMode({})).toBe('ask_before_changes');
  });
});
