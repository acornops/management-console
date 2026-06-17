import { describe, expect, it } from 'vitest';

import { AppPaths, parseAppRoute } from '@/utils/routes';

describe('routes', () => {
  it('round-trips workspace cluster diagnostics routes with encoded params', () => {
    const path = AppPaths.workspaceKubernetesClusterDiagnostics('workspace/a', 'cluster one', 'chat');

    expect(path).toBe('/workspaces/workspace%2Fa/kubernetes-clusters/cluster%20one/chat');
    expect(parseAppRoute(path)).toEqual({
      kind: 'workspaceKubernetesClusterDiagnostics',
      workspaceId: 'workspace/a',
      clusterId: 'cluster one',
      tab: 'chat'
    });
  });

  it('parses cluster-scoped MCP server routes', () => {
    expect(AppPaths.workspaceKubernetesClusterDiagnostics('team-alpha', 'cluster-one', 'mcpServers')).toBe(
      '/workspaces/team-alpha/kubernetes-clusters/cluster-one/mcp-servers'
    );
    expect(parseAppRoute('/workspaces/team-alpha/kubernetes-clusters/cluster-one/mcp-servers')).toEqual({
      kind: 'workspaceKubernetesClusterDiagnostics',
      workspaceId: 'team-alpha',
      clusterId: 'cluster-one',
      tab: 'mcpServers'
    });
    expect(parseAppRoute('/workspaces/team-alpha/kubernetes-clusters/cluster-one/resources')).toEqual({
      kind: 'workspaceKubernetesClusterDiagnostics',
      workspaceId: 'team-alpha',
      clusterId: 'cluster-one',
      tab: 'resources'
    });
    expect(AppPaths.workspaceKubernetesClusterDiagnostics('team-alpha', 'cluster-one', 'settings')).toBe(
      '/workspaces/team-alpha/kubernetes-clusters/cluster-one/settings'
    );
    expect(parseAppRoute('/workspaces/team-alpha/kubernetes-clusters/cluster-one/settings')).toEqual({
      kind: 'workspaceKubernetesClusterDiagnostics',
      workspaceId: 'team-alpha',
      clusterId: 'cluster-one',
      tab: 'settings'
    });
    expect(parseAppRoute('/kubernetes-clusters/cluster-one/chat')).toEqual({
      kind: 'kubernetesClusterDiagnostics',
      clusterId: 'cluster-one',
      tab: 'chat'
    });
    expect(AppPaths.kubernetesClusterDiagnostics('cluster-one', 'settings')).toBe('/kubernetes-clusters/cluster-one/settings');
    expect(parseAppRoute('/kubernetes-clusters/cluster-one/settings')).toEqual({
      kind: 'kubernetesClusterDiagnostics',
      clusterId: 'cluster-one',
      tab: 'settings'
    });
  });

  it('parses top-level routes and cluster diagnostics without a tab', () => {
    expect(parseAppRoute('/')).toEqual({ kind: 'home' });
    expect(parseAppRoute('/workspaces')).toEqual({ kind: 'workspaces' });
    expect(parseAppRoute('/kubernetes-clusters')).toEqual({ kind: 'kubernetesClusters' });
    expect(parseAppRoute(AppPaths.settings())).toEqual({ kind: 'settings' });
    expect(parseAppRoute('/kubernetes-clusters/prod-cluster')).toEqual({
      kind: 'kubernetesClusterDiagnostics',
      clusterId: 'prod-cluster',
      tab: undefined
    });
  });

  it('parses workspace cluster listing routes', () => {
    expect(parseAppRoute(AppPaths.workspaceKubernetesClusters('team-alpha'))).toEqual({
      kind: 'workspaceKubernetesClusters',
      workspaceId: 'team-alpha'
    });
    expect(AppPaths.workspaceVirtualMachines('team-alpha')).toBe('/workspaces/team-alpha/virtual-machines');
    expect(parseAppRoute(AppPaths.workspaceVirtualMachines('team-alpha'))).toEqual({
      kind: 'workspaceVirtualMachines',
      workspaceId: 'team-alpha'
    });
  });

  it('parses workspace invitation routes', () => {
    const path = AppPaths.workspaceInvitation('wi_token/with space');

    expect(path).toBe('/invites/wi_token%2Fwith%20space');
    expect(parseAppRoute(path)).toEqual({
      kind: 'workspaceInvitation',
      token: 'wi_token/with space'
    });
  });

  it('parses Mattermost link routes with query state', () => {
    expect(AppPaths.mattermostLink('mmlink_token/with space')).toBe(
      '/integrations/mattermost/link?token=mmlink_token%2Fwith%20space'
    );
    expect(parseAppRoute('/integrations/mattermost/link?token=mmlink_token')).toEqual({
      kind: 'mattermostLink',
      token: 'mmlink_token',
      status: undefined
    });
    expect(parseAppRoute('/integrations/mattermost/link?status=linked')).toEqual({
      kind: 'mattermostLink',
      token: undefined,
      status: 'linked'
    });
    expect(AppPaths.mattermostLinkStatus('expired')).toBe('/integrations/mattermost/link?status=expired');
  });

  it('parses active workspace resource section routes', () => {
    expect(parseAppRoute(AppPaths.workspaceOverview('team-alpha'))).toEqual({
      kind: 'workspaceOverview',
      workspaceId: 'team-alpha'
    });
    expect(parseAppRoute(AppPaths.workspaceInvestigations('team-alpha'))).toEqual({
      kind: 'workspaceInvestigations',
      workspaceId: 'team-alpha'
    });
    expect(parseAppRoute(AppPaths.workspaceRunbooks('team-alpha'))).toEqual({
      kind: 'workspaceRunbooks',
      workspaceId: 'team-alpha'
    });
    expect(parseAppRoute(AppPaths.workspaceMembers('team-alpha'))).toEqual({
      kind: 'workspaceMembers',
      workspaceId: 'team-alpha'
    });
    expect(parseAppRoute(AppPaths.workspaceAiSettings('team-alpha'))).toEqual({
      kind: 'workspaceAiSettings',
      workspaceId: 'team-alpha'
    });
    expect(parseAppRoute(AppPaths.workspaceSettings('team-alpha'))).toEqual({
      kind: 'workspaceSettings',
      workspaceId: 'team-alpha'
    });
    expect(parseAppRoute(AppPaths.workspaceAuditLog('team-alpha'))).toEqual({
      kind: 'workspaceAuditLog',
      workspaceId: 'team-alpha'
    });
  });

  it('returns notFound for unsupported subviews and unknown paths', () => {
    expect(parseAppRoute('/workspaces/team-alpha/services')).toEqual({
      kind: 'notFound',
      path: '/workspaces/team-alpha/services'
    });
    expect(parseAppRoute('/kubernetes-clusters/prod-cluster/workloads')).toEqual({
      kind: 'notFound',
      path: '/kubernetes-clusters/prod-cluster/workloads'
    });
    expect(parseAppRoute('/kubernetes-clusters/prod-cluster/nodes')).toEqual({
      kind: 'notFound',
      path: '/kubernetes-clusters/prod-cluster/nodes'
    });
    expect(parseAppRoute('/kubernetes-clusters/prod-cluster/metrics')).toEqual({
      kind: 'notFound',
      path: '/kubernetes-clusters/prod-cluster/metrics'
    });
    expect(parseAppRoute('/workspaces/team-alpha/kubernetes-clusters/cluster-one/services')).toEqual({
      kind: 'notFound',
      path: '/workspaces/team-alpha/kubernetes-clusters/cluster-one/services'
    });
    expect(parseAppRoute('/does/not/exist')).toEqual({
      kind: 'notFound',
      path: '/does/not/exist'
    });
  });

  it('returns malformed URI parameters as-is instead of throwing', () => {
    expect(parseAppRoute('/kubernetes-clusters/%E0%A4%A')).toEqual({
      kind: 'kubernetesClusterDiagnostics',
      clusterId: '%E0%A4%A',
      tab: undefined
    });
  });
});
