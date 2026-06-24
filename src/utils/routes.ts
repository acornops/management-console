export type ClusterSubview = 'overview' | 'resources' | 'mcpServers' | 'health' | 'chat' | 'settings';
export type VmSubview = 'overview' | 'resources' | 'services' | 'processes' | 'network' | 'logs' | 'mcpServers' | 'chat' | 'settings';

export type AppRoute =
  | { kind: 'home' }
  | { kind: 'workspaces' }
  | { kind: 'kubernetesClusters' }
  | { kind: 'settings' }
  | { kind: 'workspaceOverview'; workspaceId: string }
  | { kind: 'workspaceWorkflows'; workspaceId: string }
  | { kind: 'workspaceMembers'; workspaceId: string }
  | { kind: 'workspaceAiSettings'; workspaceId: string }
  | { kind: 'workspaceSettings'; workspaceId: string }
  | { kind: 'workspaceAuditLog'; workspaceId: string }
  | { kind: 'workspaceKubernetesClusters'; workspaceId: string }
  | { kind: 'workspaceVirtualMachines'; workspaceId: string }
  | { kind: 'workspaceVirtualMachineDetail'; workspaceId: string; vmId: string; tab?: VmSubview }
  | { kind: 'workspaceInvitation'; token: string }
  | { kind: 'kubernetesClusterDiagnostics'; clusterId: string; tab?: ClusterSubview }
  | { kind: 'workspaceKubernetesClusterDiagnostics'; workspaceId: string; clusterId: string; tab?: ClusterSubview }
  | { kind: 'notFound'; path: string };

function parseClusterSubview(value?: string): ClusterSubview | undefined {
  if (!value) return undefined;
  if (value === 'mcp-servers') return 'mcpServers';
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

/**
 * Parses a management console route path into a typed route union.
 */
export function parseAppRoute(path: string): AppRoute {
  if (path === '/') return { kind: 'home' };
  if (path === '/workspaces') return { kind: 'workspaces' };
  if (path === '/kubernetes-clusters') return { kind: 'kubernetesClusters' };
  if (path === '/settings') return { kind: 'settings' };

  const inviteMatch = path.match(/^\/invites\/([^/]+)$/);
  if (inviteMatch) {
    return { kind: 'workspaceInvitation', token: decodeParam(inviteMatch[1]) };
  }

  const workspaceSectionMatch = path.match(/^\/workspaces\/([^/]+)\/(overview|workflows|members|ai-settings|settings|audit-log)$/);
  if (workspaceSectionMatch) {
    const workspaceId = decodeParam(workspaceSectionMatch[1]);
    const section = workspaceSectionMatch[2];
    if (section === 'overview') return { kind: 'workspaceOverview', workspaceId };
    if (section === 'workflows') return { kind: 'workspaceWorkflows', workspaceId };
    if (section === 'ai-settings') return { kind: 'workspaceAiSettings', workspaceId };
    if (section === 'settings') return { kind: 'workspaceSettings', workspaceId };
    if (section === 'audit-log') return { kind: 'workspaceAuditLog', workspaceId };
    return { kind: 'workspaceMembers', workspaceId };
  }

  const workspaceKubernetesClustersMatch = path.match(/^\/workspaces\/([^/]+)\/kubernetes-clusters$/);
  if (workspaceKubernetesClustersMatch) {
    return {
      kind: 'workspaceKubernetesClusters',
      workspaceId: decodeParam(workspaceKubernetesClustersMatch[1])
    };
  }

  const workspaceVirtualMachinesMatch = path.match(/^\/workspaces\/([^/]+)\/virtual-machines$/);
  if (workspaceVirtualMachinesMatch) {
    return {
      kind: 'workspaceVirtualMachines',
      workspaceId: decodeParam(workspaceVirtualMachinesMatch[1])
    };
  }

  const workspaceVirtualMachineDetailMatch = path.match(
    /^\/workspaces\/([^/]+)\/virtual-machines\/([^/]+)(?:\/(overview|resources|services|processes|network|logs|mcp-servers|chat|settings))?$/
  );
  if (workspaceVirtualMachineDetailMatch) {
    return {
      kind: 'workspaceVirtualMachineDetail',
      workspaceId: decodeParam(workspaceVirtualMachineDetailMatch[1]),
      vmId: decodeParam(workspaceVirtualMachineDetailMatch[2]),
      tab: parseVmSubview(workspaceVirtualMachineDetailMatch[3])
    };
  }

  const workspaceKubernetesClusterDiagnosticsMatch = path.match(
    /^\/workspaces\/([^/]+)\/kubernetes-clusters\/([^/]+)(?:\/(overview|resources|mcp-servers|health|chat|settings))?$/
  );
  if (workspaceKubernetesClusterDiagnosticsMatch) {
    return {
      kind: 'workspaceKubernetesClusterDiagnostics',
      workspaceId: decodeParam(workspaceKubernetesClusterDiagnosticsMatch[1]),
      clusterId: decodeParam(workspaceKubernetesClusterDiagnosticsMatch[2]),
      tab: parseClusterSubview(workspaceKubernetesClusterDiagnosticsMatch[3])
    };
  }

  const kubernetesClusterDiagnosticsMatch = path.match(/^\/kubernetes-clusters\/([^/]+)(?:\/(overview|resources|mcp-servers|health|chat|settings))?$/);
  if (kubernetesClusterDiagnosticsMatch) {
    return {
      kind: 'kubernetesClusterDiagnostics',
      clusterId: decodeParam(kubernetesClusterDiagnosticsMatch[1]),
      tab: parseClusterSubview(kubernetesClusterDiagnosticsMatch[2])
    };
  }

  return { kind: 'notFound', path };
}

export const AppPaths = {
  workspaceInvitation: (token: string): string => `/invites/${encodeURIComponent(token)}`,
  workspaceInvitationShareUrl: (token: string): string => {
    const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
    const basePath = baseUrl && baseUrl !== '/' ? baseUrl : '';
    return `${window.location.origin}${basePath}/#/invites/${encodeURIComponent(token)}`;
  },
  workspaces: (): string => '/workspaces',
  kubernetesClusters: (): string => '/kubernetes-clusters',
  settings: (): string => '/settings',
  workspaceOverview: (workspaceId: string): string => `/workspaces/${encodeURIComponent(workspaceId)}/overview`,
  workspaceWorkflows: (workspaceId: string): string =>
    `/workspaces/${encodeURIComponent(workspaceId)}/workflows`,
  workspaceMembers: (workspaceId: string): string => `/workspaces/${encodeURIComponent(workspaceId)}/members`,
  workspaceAiSettings: (workspaceId: string): string => `/workspaces/${encodeURIComponent(workspaceId)}/ai-settings`,
  workspaceSettings: (workspaceId: string): string => `/workspaces/${encodeURIComponent(workspaceId)}/settings`,
  workspaceAuditLog: (workspaceId: string): string => `/workspaces/${encodeURIComponent(workspaceId)}/audit-log`,
  workspaceKubernetesClusters: (workspaceId: string): string => `/workspaces/${encodeURIComponent(workspaceId)}/kubernetes-clusters`,
  workspaceVirtualMachines: (workspaceId: string): string =>
    `/workspaces/${encodeURIComponent(workspaceId)}/virtual-machines`,
  workspaceVirtualMachineDetail: (workspaceId: string, vmId: string, tab?: VmSubview): string => {
    const base = `/workspaces/${encodeURIComponent(workspaceId)}/virtual-machines/${encodeURIComponent(vmId)}`;
    return tab ? `${base}/${vmSubviewPathSegment(tab)}` : base;
  },
  kubernetesClusterDiagnostics: (clusterId: string, tab?: ClusterSubview): string => {
    const base = `/kubernetes-clusters/${encodeURIComponent(clusterId)}`;
    return tab ? `${base}/${clusterSubviewPathSegment(tab)}` : base;
  },
  workspaceKubernetesClusterDiagnostics: (workspaceId: string, clusterId: string, tab?: ClusterSubview): string => {
    const base = `/workspaces/${encodeURIComponent(workspaceId)}/kubernetes-clusters/${encodeURIComponent(clusterId)}`;
    return tab ? `${base}/${clusterSubviewPathSegment(tab)}` : base;
  }
};
