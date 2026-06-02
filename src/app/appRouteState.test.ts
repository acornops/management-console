import { describe, expect, it } from 'vitest';

import { getClusterBackToWorkspacePath, getWorkspaceRouteId } from '@/app/appRouteState';

describe('app route state', () => {
  it('returns cluster users to the workspace cluster inventory', () => {
    expect(getClusterBackToWorkspacePath('workspace-a')).toBe('/workspaces/workspace-a/kubernetes-clusters');
  });

  it('falls back to the workspace list without a workspace context', () => {
    expect(getClusterBackToWorkspacePath(null)).toBe('/workspaces');
  });

  it('treats the virtual machines placeholder as workspace-scoped navigation state', () => {
    expect(getWorkspaceRouteId({ kind: 'workspaceVirtualMachines', workspaceId: 'workspace-a' })).toBe('workspace-a');
  });
});
