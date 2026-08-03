import { describe, expect, it } from 'vitest';

import {
  getActiveAgentSubview,
  getActiveClusterSubview,
  getActiveResourceNav,
  getClusterBackToWorkspacePath,
  getWorkspaceRouteId
} from '@/app/appRouteState';

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

  it('maps Agent detail routes into contextual navigation state', () => {
    const chatRoute = {
      kind: 'workspaceAgentDetail',
      workspaceId: 'workspace-a',
      agentId: 'agent-a',
      tab: 'chat'
    } as const;
    const toolsRoute = { ...chatRoute, tab: 'tools' } as const;

    expect(getActiveAgentSubview(chatRoute)).toBe('chat');
    expect(getActiveResourceNav(chatRoute)).toBe('agentChat');
    expect(getActiveAgentSubview(toolsRoute)).toBe('tools');
    expect(getActiveResourceNav(toolsRoute)).toBe('agentTools');
  });

  it('preserves the health alias so the route can expose its own evidence state', () => {
    expect(getActiveClusterSubview({
      kind: 'kubernetesClusterDiagnostics',
      clusterId: 'cluster-a',
      tab: 'health'
    })).toBe('health');
  });
});
