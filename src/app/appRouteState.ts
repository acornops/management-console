import { AppPaths, AppRoute, ClusterSubview, VmSubview } from '@/utils/routes';

export type ActivePrimaryNav = 'workspaces' | 'clusters';
export type ActiveResourceNav =
  | 'overview'
  | 'workflows'
  | 'clusters'
  | 'virtualMachines'
  | 'members'
  | 'workspaceAiSettings'
  | 'workspaceSettings'
  | 'workspaceAuditLog'
  | 'settings'
  | 'clusterOverview'
  | 'clusterResources'
  | 'clusterMcpServers'
  | 'clusterSettings'
  | 'clusterChat'
  | 'vmOverview'
  | 'vmResources'
  | 'vmMcpServers'
  | 'vmSettings'
  | 'vmChat'
  | 'workspaces';

export function getWorkspaceRouteId(route: AppRoute): string | null {
  if (
    route.kind === 'workspaceOverview' ||
    route.kind === 'workspaceWorkflows' ||
    route.kind === 'workspaceKubernetesClusters' ||
    route.kind === 'workspaceVirtualMachines' ||
    route.kind === 'workspaceVirtualMachineDetail' ||
    route.kind === 'workspaceMembers' ||
    route.kind === 'workspaceAiSettings' ||
    route.kind === 'workspaceSettings' ||
    route.kind === 'workspaceAuditLog' ||
    route.kind === 'workspaceKubernetesClusterDiagnostics'
  ) {
    return route.workspaceId;
  }
  return null;
}

export function getClusterRouteId(route: AppRoute): string | undefined {
  return route.kind === 'kubernetesClusterDiagnostics' || route.kind === 'workspaceKubernetesClusterDiagnostics'
    ? route.clusterId
    : undefined;
}

export function getVirtualMachineRouteId(route: AppRoute): string | undefined {
  return route.kind === 'workspaceVirtualMachineDetail' ? route.vmId : undefined;
}

export function getActivePrimaryNav(route: AppRoute): ActivePrimaryNav {
  if (
    route.kind === 'workspaces' ||
    route.kind === 'home' ||
    route.kind === 'settings' ||
    route.kind === 'workspaceInvitation'
  ) {
    return 'workspaces';
  }
  return 'clusters';
}

export function getActiveResourceNav(route: AppRoute): ActiveResourceNav {
  if (route.kind === 'workspaceOverview') return 'overview';
  if (route.kind === 'workspaceWorkflows') return 'workflows';
  if (route.kind === 'workspaceKubernetesClusters' || route.kind === 'kubernetesClusters') return 'clusters';
  if (route.kind === 'workspaceVirtualMachines') return 'virtualMachines';
  if (route.kind === 'workspaceVirtualMachineDetail') {
    const tab = route.tab || 'overview';
    if (tab === 'resources' || tab === 'services' || tab === 'processes' || tab === 'network' || tab === 'logs') return 'vmResources';
    if (tab === 'mcpServers') return 'vmMcpServers';
    if (tab === 'settings') return 'vmSettings';
    if (tab === 'chat') return 'vmChat';
    return 'vmOverview';
  }
  if (route.kind === 'settings') return 'settings';
  if (route.kind === 'workspaceAiSettings') return 'workspaceAiSettings';
  if (route.kind === 'workspaceSettings') return 'workspaceSettings';
  if (route.kind === 'workspaceAuditLog') return 'workspaceAuditLog';
  if (route.kind === 'workspaceMembers') return 'members';
  if (route.kind === 'workspaceKubernetesClusterDiagnostics' || route.kind === 'kubernetesClusterDiagnostics') {
    const tab = route.tab || 'overview';
    if (tab === 'resources') return 'clusterResources';
    if (tab === 'mcpServers') return 'clusterMcpServers';
    if (tab === 'settings') return 'clusterSettings';
    if (tab === 'chat') return 'clusterChat';
    return 'clusterOverview';
  }
  return 'workspaces';
}

export function getActiveClusterSubview(route: AppRoute): ClusterSubview {
  if (route.kind !== 'workspaceKubernetesClusterDiagnostics' && route.kind !== 'kubernetesClusterDiagnostics') {
    return 'overview';
  }
  return route.tab === 'health' ? 'overview' : route.tab || 'overview';
}

export function getActiveVmSubview(route: AppRoute): VmSubview {
  if (route.kind !== 'workspaceVirtualMachineDetail') {
    return 'overview';
  }
  return route.tab || 'overview';
}

export function getClusterBackToWorkspacePath(workspaceId: string | null | undefined): string {
  return workspaceId ? AppPaths.workspaceKubernetesClusters(workspaceId) : AppPaths.workspaces();
}

export function getVirtualMachineBackToWorkspacePath(workspaceId: string | null | undefined): string {
  return workspaceId ? AppPaths.workspaceVirtualMachines(workspaceId) : AppPaths.workspaces();
}
