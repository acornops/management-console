import { describe, expect, it } from 'vitest';

import { AppPaths, parseAppRoute, validateAssistantReturnTo, withAssistantSession } from '@/utils/routes';

describe('routes', () => {
  it('round-trips same-workspace assistant return paths through AI Settings', () => {
    const returnTo = withAssistantSession(
      AppPaths.workspaceVirtualMachineDetail('team alpha', 'vm/one', 'chat'),
      'session/one'
    );
    const settingsPath = AppPaths.workspaceAiSettings('team alpha', returnTo);

    expect(settingsPath).toBe('/workspaces/team%20alpha/ai-settings?returnTo=%2Fworkspaces%2Fteam%2520alpha%2Fvirtual-machines%2Fvm%252Fone%2Fchat%3Fsession%3Dsession%252Fone');
    expect(parseAppRoute(settingsPath)).toEqual({
      kind: 'workspaceAiSettings',
      workspaceId: 'team alpha',
      returnTo
    });
  });

  it('rejects unsafe, malformed, cross-workspace, and self-referential AI Settings returns', () => {
    const invalidReturns = [
      'https://example.com/workspaces/team-alpha/kubernetes-clusters/cluster-one/chat',
      '//example.com/workspaces/team-alpha/kubernetes-clusters/cluster-one/chat',
      '/workspaces/team-alpha/kubernetes-clusters/%E0%A4%A/chat',
      '/workspaces/team-bravo/kubernetes-clusters/cluster-one/chat',
      '/workspaces/team-alpha/ai-settings',
      '/workspaces/team-alpha/kubernetes-clusters/cluster-one/overview'
    ];

    invalidReturns.forEach((returnTo) => {
      expect(validateAssistantReturnTo(returnTo, 'team-alpha')).toBeUndefined();
      expect(AppPaths.workspaceAiSettings('team-alpha', returnTo)).toBe('/workspaces/team-alpha/ai-settings');
    });
    expect(parseAppRoute('/workspaces/team-alpha/ai-settings?returnTo=%2F%2Fexample.com')).toEqual({
      kind: 'workspaceAiSettings',
      workspaceId: 'team-alpha'
    });
  });

  it('does not expose the removed MCP OAuth callback route', () => {
    expect(parseAppRoute('/oauth/mcp/callback?code=code&state=state')).toEqual({
      kind: 'notFound',
      path: '/oauth/mcp/callback'
    });
  });

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
    expect(AppPaths.workspaceKubernetesClusterDiagnostics('team-alpha', 'cluster-one', 'skills')).toBe(
      '/workspaces/team-alpha/kubernetes-clusters/cluster-one/skills'
    );
    expect(AppPaths.workspaceKubernetesClusterDiagnostics('team-alpha', 'cluster-one', 'tools')).toBe(
      '/workspaces/team-alpha/kubernetes-clusters/cluster-one/tools'
    );
    expect(parseAppRoute('/workspaces/team-alpha/kubernetes-clusters/cluster-one/tools')).toEqual({
      kind: 'workspaceKubernetesClusterDiagnostics',
      workspaceId: 'team-alpha',
      clusterId: 'cluster-one',
      tab: 'tools'
    });
    expect(parseAppRoute('/workspaces/team-alpha/kubernetes-clusters/cluster-one/skills')).toEqual({
      kind: 'workspaceKubernetesClusterDiagnostics',
      workspaceId: 'team-alpha',
      clusterId: 'cluster-one',
      tab: 'skills'
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
    expect(AppPaths.kubernetesClusterDiagnostics('cluster-one', 'skills')).toBe('/kubernetes-clusters/cluster-one/skills');
    expect(AppPaths.kubernetesClusterDiagnostics('cluster-one', 'tools')).toBe('/kubernetes-clusters/cluster-one/tools');
    expect(parseAppRoute('/kubernetes-clusters/cluster-one/tools')).toEqual({
      kind: 'kubernetesClusterDiagnostics',
      clusterId: 'cluster-one',
      tab: 'tools'
    });
    expect(parseAppRoute('/kubernetes-clusters/cluster-one/skills')).toEqual({
      kind: 'kubernetesClusterDiagnostics',
      clusterId: 'cluster-one',
      tab: 'skills'
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
    expect(AppPaths.accountSettings()).toBe('/account');
    expect(parseAppRoute(AppPaths.accountSettings())).toEqual({ kind: 'accountSettings' });
    expect(parseAppRoute('/settings')).toEqual({ kind: 'notFound', path: '/settings' });
    expect(AppPaths).not.toHaveProperty('settings');
    expect(parseAppRoute(AppPaths.help())).toEqual({ kind: 'help' });
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
    expect(AppPaths.workspaceVirtualMachineDetail('team-alpha', 'vm-one', 'mcpServers')).toBe(
      '/workspaces/team-alpha/virtual-machines/vm-one/mcp-servers'
    );
    expect(AppPaths.workspaceVirtualMachineDetail('team-alpha', 'vm-one', 'skills')).toBe(
      '/workspaces/team-alpha/virtual-machines/vm-one/skills'
    );
    expect(AppPaths.workspaceVirtualMachineDetail('team-alpha', 'vm-one', 'tools')).toBe(
      '/workspaces/team-alpha/virtual-machines/vm-one/tools'
    );
    expect(parseAppRoute('/workspaces/team-alpha/virtual-machines/vm-one/tools')).toEqual({
      kind: 'workspaceVirtualMachineDetail',
      workspaceId: 'team-alpha',
      vmId: 'vm-one',
      tab: 'tools'
    });
    expect(parseAppRoute('/workspaces/team-alpha/virtual-machines/vm-one/skills')).toEqual({
      kind: 'workspaceVirtualMachineDetail',
      workspaceId: 'team-alpha',
      vmId: 'vm-one',
      tab: 'skills'
    });
  });

  it('round-trips Kubernetes cluster catalog state in listing routes', () => {
    const workspacePath = AppPaths.workspaceKubernetesClusters('team alpha', {
      q: 'dev cluster',
      status: 'healthy'
    });

    expect(workspacePath).toBe(
      '/workspaces/team%20alpha/kubernetes-clusters?q=dev+cluster&status=healthy'
    );
    expect(parseAppRoute(workspacePath)).toEqual({
      kind: 'workspaceKubernetesClusters',
      workspaceId: 'team alpha',
      q: 'dev cluster',
      status: 'healthy'
    });

    expect(AppPaths.kubernetesClusters({
      q: 'prod',
      status: 'attention'
    })).toBe('/kubernetes-clusters?q=prod&status=attention');
    expect(parseAppRoute('/kubernetes-clusters?q=prod&status=attention&cluster=cluster-two')).toEqual({
      kind: 'kubernetesClusters',
      q: 'prod',
      status: 'attention'
    });

    expect(parseAppRoute('/kubernetes-clusters?status=connected')).toMatchObject({ status: 'healthy' });
    expect(parseAppRoute('/kubernetes-clusters?status=disconnected')).toMatchObject({ status: 'attention' });
  });

  it('round-trips catalog return state in Kubernetes cluster detail routes', () => {
    const path = AppPaths.workspaceKubernetesClusterDiagnostics('team-alpha', 'cluster-one', 'overview', {
      q: 'dev',
      status: 'not_installed'
    });

    expect(path).toBe('/workspaces/team-alpha/kubernetes-clusters/cluster-one/overview?catalogQ=dev&catalogStatus=not_installed');
    expect(parseAppRoute(path)).toEqual({
      kind: 'workspaceKubernetesClusterDiagnostics',
      workspaceId: 'team-alpha',
      clusterId: 'cluster-one',
      tab: 'overview',
      catalogState: {
        q: 'dev',
        status: 'not_installed'
      }
    });

    expect(AppPaths.kubernetesClusterDiagnostics('cluster-one', 'chat', {
      q: 'prod',
      status: 'healthy'
    })).toBe('/kubernetes-clusters/cluster-one/chat?catalogQ=prod&catalogStatus=healthy');
  });

  it('round-trips virtual machine catalog and return state', () => {
    const listPath = AppPaths.workspaceVirtualMachines('team alpha', {
      q: 'bastion prod',
      status: 'attention'
    });
    expect(listPath).toBe('/workspaces/team%20alpha/virtual-machines?q=bastion+prod&status=attention');
    expect(parseAppRoute(listPath)).toEqual({
      kind: 'workspaceVirtualMachines',
      workspaceId: 'team alpha',
      q: 'bastion prod',
      status: 'attention'
    });

    const detailPath = AppPaths.workspaceVirtualMachineDetail('team-alpha', 'vm-one', 'overview', {
      q: 'bastion',
      status: 'not_installed'
    });
    expect(detailPath).toBe('/workspaces/team-alpha/virtual-machines/vm-one/overview?catalogQ=bastion&catalogStatus=not_installed');
    expect(parseAppRoute(detailPath)).toEqual({
      kind: 'workspaceVirtualMachineDetail',
      workspaceId: 'team-alpha',
      vmId: 'vm-one',
      tab: 'overview',
      catalogState: { q: 'bastion', status: 'not_installed' }
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

  it('parses external integration link routes with query state', () => {
    expect(AppPaths.externalIntegrationLink('intlink_token/with space')).toBe(
      '/integrations/external/link?token=intlink_token%2Fwith%20space'
    );
    expect(parseAppRoute('/integrations/external/link?token=intlink_token')).toEqual({
      kind: 'externalIntegrationLink',
      token: 'intlink_token',
      status: undefined
    });
    expect(parseAppRoute('/integrations/external/link?status=linked')).toEqual({
      kind: 'externalIntegrationLink',
      token: undefined,
      status: 'linked'
    });
    expect(parseAppRoute('/integrations/external/link?status=cancelled')).toEqual({
      kind: 'externalIntegrationLink',
      token: undefined,
      status: 'cancelled'
    });
    expect(AppPaths.externalIntegrationLinkStatus('expired')).toBe('/integrations/external/link?status=expired');
    expect(AppPaths.externalIntegrationLinkStatus('cancelled')).toBe('/integrations/external/link?status=cancelled');
  });

  it('parses active workspace resource section routes', () => {
    expect(parseAppRoute(AppPaths.workspaceOverview('team-alpha'))).toEqual({
      kind: 'workspaceOverview',
      workspaceId: 'team-alpha'
    });
    expect(parseAppRoute('/workspaces/team-alpha/overview?from=sidebar')).toEqual({
      kind: 'workspaceOverview',
      workspaceId: 'team-alpha'
    });
    expect(parseAppRoute(AppPaths.workspaceWorkflows('team-alpha'))).toEqual({
      kind: 'workspaceWorkflows',
      workspaceId: 'team-alpha'
    });
    expect(AppPaths.workspaceSchedules('team-alpha')).toBe('/workspaces/team-alpha/schedules');
    expect(parseAppRoute(AppPaths.workspaceSchedules('team-alpha'))).toEqual({
      kind: 'workspaceSchedules',
      workspaceId: 'team-alpha'
    });
    expect(AppPaths.workspaceScheduleCreate('team-alpha', 'workflow/a')).toBe(
      '/workspaces/team-alpha/schedules?create=schedule&workflowId=workflow%2Fa'
    );
    expect(parseAppRoute(AppPaths.workspaceScheduleCreate('team-alpha', 'workflow/a'))).toEqual({
      kind: 'workspaceSchedules',
      workspaceId: 'team-alpha',
      createWorkflowId: 'workflow/a'
    });
    expect(AppPaths.workspaceApprovals('team-alpha')).toBe('/workspaces/team-alpha/approvals');
    expect(parseAppRoute(AppPaths.workspaceApprovals('team-alpha'))).toEqual({
      kind: 'workspaceApprovals',
      workspaceId: 'team-alpha'
    });
    expect(AppPaths.workspaceApprovals('team-alpha', { runId: 'run/a', approvalId: 'approval/b' })).toBe(
      '/workspaces/team-alpha/approvals?runId=run%2Fa&approvalId=approval%2Fb'
    );
    expect(parseAppRoute(AppPaths.workspaceApprovals('team-alpha', { runId: 'run/a', approvalId: 'approval/b' }))).toEqual({
      kind: 'workspaceApprovals',
      workspaceId: 'team-alpha',
      runId: 'run/a',
      approvalId: 'approval/b'
    });
    expect(AppPaths.workspaceAgents('team-alpha')).toBe('/workspaces/team-alpha/agents');
    expect(parseAppRoute(AppPaths.workspaceAgents('team-alpha'))).toEqual({
      kind: 'workspaceAgents',
      workspaceId: 'team-alpha'
    });
    expect(AppPaths.workspaceAgentMcp('team alpha', 'agent/a', 'connect_by_url')).toBe('/workspaces/team%20alpha/agents?agent=agent%2Fa&panel=profile&agentTab=capabilities&capabilityTab=mcp&mcpAction=connect_by_url');
    expect(AppPaths.workspaceTargetMcp('team alpha', 'cluster/a', 'kubernetes')).toBe('/workspaces/team%20alpha/kubernetes-clusters/cluster%2Fa/mcp-servers');
    expect(AppPaths.workspaceTargetMcp('team alpha', 'vm/a', 'virtual_machine', 'connect_by_url')).toBe('/workspaces/team%20alpha/virtual-machines/vm%2Fa/mcp-servers?mcpAction=connect_by_url');
    const catalogPath = AppPaths.workspaceCatalog('team alpha', {
      q: 'github tools',
      source: 'source/a',
      compatibility: 'compatible',
      artifact: 'artifact/a',
      destination: 'target:cluster/a'
    });
    expect(catalogPath).toBe('/workspaces/team%20alpha/catalog?q=github+tools&source=source%2Fa&compatibility=compatible&artifact=artifact%2Fa&destination=target%3Acluster%2Fa');
    expect(parseAppRoute(catalogPath)).toEqual({
      kind: 'workspaceCatalog',
      workspaceId: 'team alpha',
      q: 'github tools',
      source: 'source/a',
      compatibility: 'compatible',
      artifact: 'artifact/a',
      destination: 'target:cluster/a'
    });
    expect(parseAppRoute('/workspaces/team-alpha/catalog?compatibility=unknown&destination=manager:manager-a')).toEqual({
      kind: 'workspaceCatalog',
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
    expect(parseAppRoute(AppPaths.workspaceWebhooks('team-alpha'))).toEqual({
      kind: 'workspaceWebhooks',
      workspaceId: 'team-alpha'
    });
    expect(parseAppRoute(AppPaths.workspaceSettings('team-alpha'))).toEqual({
      kind: 'workspaceSettings',
      workspaceId: 'team-alpha'
    });
    expect(AppPaths.workspaceMcpRegistries('team-alpha')).toBe('/workspaces/team-alpha/settings?section=mcp-registries');
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
    expect(parseAppRoute('/workspaces/team-alpha/investigations')).toEqual({
      kind: 'notFound',
      path: '/workspaces/team-alpha/investigations'
    });
    expect(parseAppRoute('/workspaces/team-alpha/runbooks')).toEqual({
      kind: 'notFound',
      path: '/workspaces/team-alpha/runbooks'
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
