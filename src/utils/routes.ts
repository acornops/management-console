export type ClusterSubview = 'overview' | 'resources' | 'mcpServers' | 'skills' | 'tools' | 'health' | 'chat' | 'settings';
export type VmSubview = 'overview' | 'resources' | 'services' | 'processes' | 'network' | 'logs' | 'mcpServers' | 'skills' | 'tools' | 'chat' | 'settings';
export type ClusterCatalogStatusFilter = 'all' | 'attention' | 'healthy' | 'not_installed';
export type VmCatalogStatusFilter = ClusterCatalogStatusFilter;

export interface ClusterCatalogRouteState {
  q?: string;
  status?: ClusterCatalogStatusFilter;
}

export interface ClusterCatalogReturnState {
  q?: string;
  status?: ClusterCatalogStatusFilter;
}

export type VmCatalogRouteState = ClusterCatalogRouteState;
export type VmCatalogReturnState = ClusterCatalogReturnState;

export type AppRoute =
  | { kind: 'home' }
  | { kind: 'workspaces' }
  | ({ kind: 'kubernetesClusters' } & ClusterCatalogRouteState)
  | { kind: 'accountSettings' }
  | { kind: 'settings' }
  | { kind: 'help' }
  | { kind: 'externalIntegrationLink'; token?: string; status?: 'linked' | 'expired' | 'cancelled' }
  | { kind: 'workspaceOverview'; workspaceId: string }
  | { kind: 'workspaceAgents'; workspaceId: string }
  | { kind: 'workspaceWorkflows'; workspaceId: string }
  | { kind: 'workspaceSchedules'; workspaceId: string; createWorkflowId?: string }
  | { kind: 'workspaceApprovals'; workspaceId: string; runId?: string; approvalId?: string }
  | { kind: 'workspaceMembers'; workspaceId: string }
  | { kind: 'workspaceAiSettings'; workspaceId: string }
  | { kind: 'workspaceSettings'; workspaceId: string }
  | { kind: 'workspaceWebhooks'; workspaceId: string }
  | { kind: 'workspaceAuditLog'; workspaceId: string }
  | ({ kind: 'workspaceKubernetesClusters'; workspaceId: string } & ClusterCatalogRouteState)
  | ({ kind: 'workspaceVirtualMachines'; workspaceId: string } & VmCatalogRouteState)
  | { kind: 'workspaceVirtualMachineDetail'; workspaceId: string; vmId: string; tab?: VmSubview; catalogState?: VmCatalogReturnState }
  | { kind: 'workspaceInvitation'; token: string }
  | { kind: 'kubernetesClusterDiagnostics'; clusterId: string; tab?: ClusterSubview; catalogState?: ClusterCatalogReturnState }
  | { kind: 'workspaceKubernetesClusterDiagnostics'; workspaceId: string; clusterId: string; tab?: ClusterSubview; catalogState?: ClusterCatalogReturnState }
  | { kind: 'notFound'; path: string };

function parseClusterSubview(value?: string): ClusterSubview | undefined {
  if (!value) return undefined;
  if (value === 'mcp-servers') return 'mcpServers';
  if (value === 'skills') return 'skills';
  if (value === 'tools') return 'tools';
  if (
    value === 'overview' ||
    value === 'resources' ||
    value === 'health' ||
    value === 'chat' ||
    value === 'settings'
  ) {
    return value;
  }
  return undefined;
}

function clusterSubviewPathSegment(tab: ClusterSubview): string {
  if (tab === 'mcpServers') return 'mcp-servers';
  return tab;
}

function parseVmSubview(value?: string): VmSubview | undefined {
  if (!value) return undefined;
  if (value === 'mcp-servers') return 'mcpServers';
  if (value === 'skills') return 'skills';
  if (value === 'tools') return 'tools';
  if (
    value === 'overview' ||
    value === 'resources' ||
    value === 'services' ||
    value === 'processes' ||
    value === 'network' ||
    value === 'logs' ||
    value === 'chat' ||
    value === 'settings'
  ) {
    return value;
  }
  return undefined;
}

function vmSubviewPathSegment(tab: VmSubview): string {
  if (tab === 'mcpServers') return 'mcp-servers';
  return tab;
}

function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function splitRoutePath(path: string): { pathname: string; params: URLSearchParams } {
  const queryIndex = path.indexOf('?');
  if (queryIndex === -1) return { pathname: path, params: new URLSearchParams() };
  return {
    pathname: path.slice(0, queryIndex) || '/',
    params: new URLSearchParams(path.slice(queryIndex + 1))
  };
}

function parseExternalIntegrationLinkStatus(value: string | null): 'linked' | 'expired' | 'cancelled' | undefined {
  if (value === 'linked' || value === 'expired' || value === 'cancelled') return value;
  return undefined;
}

function parseClusterCatalogStatus(value: string | null): ClusterCatalogStatusFilter | undefined {
  if (
    value === 'all' ||
    value === 'attention' ||
    value === 'healthy' ||
    value === 'not_installed'
  ) {
    return value;
  }
  // Preserve useful intent for links created before operational filters replaced agent-state filters.
  if (value === 'connected') return 'healthy';
  if (value === 'disconnected') return 'attention';
  return undefined;
}

function cleanQueryParam(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function parseClusterCatalogRouteState(params: URLSearchParams): ClusterCatalogRouteState {
  const q = cleanQueryParam(params.get('q'));
  const status = parseClusterCatalogStatus(params.get('status'));
  return {
    ...(q ? { q } : {}),
    ...(status ? { status } : {})
  };
}

function parseClusterCatalogReturnState(params: URLSearchParams): ClusterCatalogReturnState | undefined {
  const state = {
    q: cleanQueryParam(params.get('catalogQ')),
    status: parseClusterCatalogStatus(params.get('catalogStatus'))
  };
  return state.q || state.status ? state : undefined;
}

function appendQuery(path: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function withClusterCatalogRouteState(path: string, state?: ClusterCatalogRouteState): string {
  const params = new URLSearchParams();
  if (state?.q?.trim()) params.set('q', state.q.trim());
  if (state?.status && state.status !== 'all') params.set('status', state.status);
  return appendQuery(path, params);
}

function withClusterCatalogReturnState(path: string, state?: ClusterCatalogReturnState): string {
  const params = new URLSearchParams();
  if (state?.q?.trim()) params.set('catalogQ', state.q.trim());
  if (state?.status && state.status !== 'all') params.set('catalogStatus', state.status);
  return appendQuery(path, params);
}

/**
 * Parses a management console route path into a typed route union.
 */
export function parseAppRoute(path: string): AppRoute {
  const { pathname, params } = splitRoutePath(path);

  if (pathname === '/') return { kind: 'home' };
  if (pathname === '/workspaces') return { kind: 'workspaces' };
  if (pathname === '/kubernetes-clusters') return { kind: 'kubernetesClusters', ...parseClusterCatalogRouteState(params) };
  if (pathname === '/account') return { kind: 'accountSettings' };
  if (pathname === '/settings') return { kind: 'settings' };
  if (pathname === '/help') return { kind: 'help' };
  if (pathname === '/integrations/external/link') {
    return {
      kind: 'externalIntegrationLink',
      token: params.get('token') || undefined,
      status: parseExternalIntegrationLinkStatus(params.get('status'))
    };
  }

  const inviteMatch = pathname.match(/^\/invites\/([^/]+)$/);
  if (inviteMatch) {
    return { kind: 'workspaceInvitation', token: decodeParam(inviteMatch[1]) };
  }

  const workspaceSectionMatch = pathname.match(/^\/workspaces\/([^/]+)\/(overview|agents|workflows|schedules|approvals|members|ai-settings|settings|webhooks|audit-log)$/);
  if (workspaceSectionMatch) {
    const workspaceId = decodeParam(workspaceSectionMatch[1]);
    const section = workspaceSectionMatch[2];
    if (section === 'overview') return { kind: 'workspaceOverview', workspaceId };
    if (section === 'agents') return { kind: 'workspaceAgents', workspaceId };
    if (section === 'workflows') return { kind: 'workspaceWorkflows', workspaceId };
    if (section === 'schedules') {
      const createWorkflowId = params.get('create') === 'schedule' ? params.get('workflowId') || undefined : undefined;
      return createWorkflowId
        ? { kind: 'workspaceSchedules', workspaceId, createWorkflowId }
        : { kind: 'workspaceSchedules', workspaceId };
    }
    if (section === 'approvals') {
      const route: Extract<AppRoute, { kind: 'workspaceApprovals' }> = {
        kind: 'workspaceApprovals',
        workspaceId
      };
      const runId = params.get('runId');
      const approvalId = params.get('approvalId');
      if (runId) route.runId = runId;
      if (approvalId) route.approvalId = approvalId;
      return route;
    }
    if (section === 'ai-settings') return { kind: 'workspaceAiSettings', workspaceId };
    if (section === 'settings') return { kind: 'workspaceSettings', workspaceId };
    if (section === 'webhooks') return { kind: 'workspaceWebhooks', workspaceId };
    if (section === 'audit-log') return { kind: 'workspaceAuditLog', workspaceId };
    return { kind: 'workspaceMembers', workspaceId };
  }

  const workspaceKubernetesClustersMatch = pathname.match(/^\/workspaces\/([^/]+)\/kubernetes-clusters$/);
  if (workspaceKubernetesClustersMatch) {
    return {
      kind: 'workspaceKubernetesClusters',
      workspaceId: decodeParam(workspaceKubernetesClustersMatch[1]),
      ...parseClusterCatalogRouteState(params)
    };
  }

  const workspaceVirtualMachinesMatch = pathname.match(/^\/workspaces\/([^/]+)\/virtual-machines$/);
  if (workspaceVirtualMachinesMatch) {
    return {
      kind: 'workspaceVirtualMachines',
      workspaceId: decodeParam(workspaceVirtualMachinesMatch[1]),
      ...parseClusterCatalogRouteState(params)
    };
  }

  const workspaceVirtualMachineDetailMatch = pathname.match(
    /^\/workspaces\/([^/]+)\/virtual-machines\/([^/]+)(?:\/(overview|resources|services|processes|network|logs|mcp-servers|skills|tools|chat|settings))?$/
  );
  if (workspaceVirtualMachineDetailMatch) {
    const catalogState = parseClusterCatalogReturnState(params);
    return {
      kind: 'workspaceVirtualMachineDetail',
      workspaceId: decodeParam(workspaceVirtualMachineDetailMatch[1]),
      vmId: decodeParam(workspaceVirtualMachineDetailMatch[2]),
      tab: parseVmSubview(workspaceVirtualMachineDetailMatch[3]),
      ...(catalogState ? { catalogState } : {})
    };
  }

  const workspaceKubernetesClusterDiagnosticsMatch = pathname.match(
    /^\/workspaces\/([^/]+)\/kubernetes-clusters\/([^/]+)(?:\/(overview|resources|mcp-servers|skills|tools|health|chat|settings))?$/
  );
  if (workspaceKubernetesClusterDiagnosticsMatch) {
    const catalogState = parseClusterCatalogReturnState(params);
    return {
      kind: 'workspaceKubernetesClusterDiagnostics',
      workspaceId: decodeParam(workspaceKubernetesClusterDiagnosticsMatch[1]),
      clusterId: decodeParam(workspaceKubernetesClusterDiagnosticsMatch[2]),
      tab: parseClusterSubview(workspaceKubernetesClusterDiagnosticsMatch[3]),
      ...(catalogState ? { catalogState } : {})
    };
  }

  const kubernetesClusterDiagnosticsMatch = pathname.match(/^\/kubernetes-clusters\/([^/]+)(?:\/(overview|resources|mcp-servers|skills|tools|health|chat|settings))?$/);
  if (kubernetesClusterDiagnosticsMatch) {
    const catalogState = parseClusterCatalogReturnState(params);
    return {
      kind: 'kubernetesClusterDiagnostics',
      clusterId: decodeParam(kubernetesClusterDiagnosticsMatch[1]),
      tab: parseClusterSubview(kubernetesClusterDiagnosticsMatch[2]),
      ...(catalogState ? { catalogState } : {})
    };
  }

  return { kind: 'notFound', path: pathname };
}

export const AppPaths = {
  externalIntegrationLink: (token: string): string => `/integrations/external/link?token=${encodeURIComponent(token)}`,
  externalIntegrationLinkStatus: (status: 'linked' | 'expired' | 'cancelled'): string => `/integrations/external/link?status=${status}`,
  workspaceInvitation: (token: string): string => `/invites/${encodeURIComponent(token)}`,
  workspaceInvitationShareUrl: (token: string): string => {
    const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
    const basePath = baseUrl && baseUrl !== '/' ? baseUrl : '';
    return `${window.location.origin}${basePath}/#/invites/${encodeURIComponent(token)}`;
  },
  workspaces: (): string => '/workspaces',
  kubernetesClusters: (state?: ClusterCatalogRouteState): string => withClusterCatalogRouteState('/kubernetes-clusters', state),
  accountSettings: (): string => '/account',
  help: (): string => '/help',
  workspaceOverview: (workspaceId: string): string => `/workspaces/${encodeURIComponent(workspaceId)}/overview`,
  workspaceAgents: (workspaceId: string): string =>
    `/workspaces/${encodeURIComponent(workspaceId)}/agents`,
  workspaceWorkflows: (workspaceId: string): string =>
    `/workspaces/${encodeURIComponent(workspaceId)}/workflows`,
  workspaceSchedules: (workspaceId: string): string =>
    `/workspaces/${encodeURIComponent(workspaceId)}/schedules`,
  workspaceScheduleCreate: (workspaceId: string, workflowId: string): string =>
    `/workspaces/${encodeURIComponent(workspaceId)}/schedules?create=schedule&workflowId=${encodeURIComponent(workflowId)}`,
  workspaceApprovals: (workspaceId: string, focus?: { runId?: string; approvalId?: string }): string => {
    const params = new URLSearchParams();
    if (focus?.runId) params.set('runId', focus.runId);
    if (focus?.approvalId) params.set('approvalId', focus.approvalId);
    const query = params.toString();
    return `/workspaces/${encodeURIComponent(workspaceId)}/approvals${query ? `?${query}` : ''}`;
  },
  workspaceMembers: (workspaceId: string): string => `/workspaces/${encodeURIComponent(workspaceId)}/members`,
  workspaceAiSettings: (workspaceId: string): string => `/workspaces/${encodeURIComponent(workspaceId)}/ai-settings`,
  workspaceSettings: (workspaceId: string): string => `/workspaces/${encodeURIComponent(workspaceId)}/settings`,
  workspaceWebhooks: (workspaceId: string): string => `/workspaces/${encodeURIComponent(workspaceId)}/webhooks`,
  workspaceAuditLog: (workspaceId: string): string => `/workspaces/${encodeURIComponent(workspaceId)}/audit-log`,
  workspaceKubernetesClusters: (workspaceId: string, state?: ClusterCatalogRouteState): string =>
    withClusterCatalogRouteState(`/workspaces/${encodeURIComponent(workspaceId)}/kubernetes-clusters`, state),
  workspaceVirtualMachines: (workspaceId: string, state?: VmCatalogRouteState): string =>
    withClusterCatalogRouteState(`/workspaces/${encodeURIComponent(workspaceId)}/virtual-machines`, state),
  workspaceVirtualMachineDetail: (workspaceId: string, vmId: string, tab?: VmSubview, catalogState?: VmCatalogReturnState): string => {
    const base = `/workspaces/${encodeURIComponent(workspaceId)}/virtual-machines/${encodeURIComponent(vmId)}`;
    return withClusterCatalogReturnState(tab ? `${base}/${vmSubviewPathSegment(tab)}` : base, catalogState);
  },
  kubernetesClusterDiagnostics: (clusterId: string, tab?: ClusterSubview, catalogState?: ClusterCatalogReturnState): string => {
    const base = `/kubernetes-clusters/${encodeURIComponent(clusterId)}`;
    return withClusterCatalogReturnState(tab ? `${base}/${clusterSubviewPathSegment(tab)}` : base, catalogState);
  },
  workspaceKubernetesClusterDiagnostics: (workspaceId: string, clusterId: string, tab?: ClusterSubview, catalogState?: ClusterCatalogReturnState): string => {
    const base = `/workspaces/${encodeURIComponent(workspaceId)}/kubernetes-clusters/${encodeURIComponent(clusterId)}`;
    return withClusterCatalogReturnState(tab ? `${base}/${clusterSubviewPathSegment(tab)}` : base, catalogState);
  }
};
