import { KubernetesCluster, Workspace } from '@/types';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';

export const buildKubernetesClustersByWorkspaceId = (kubernetesClusters: KubernetesCluster[]): Map<string, KubernetesCluster[]> => {
  const groupedKubernetesClusters = new Map<string, KubernetesCluster[]>();
  kubernetesClusters.forEach((cluster) => {
    const workspaceKubernetesClusters = groupedKubernetesClusters.get(cluster.workspaceId);
    if (workspaceKubernetesClusters) {
      workspaceKubernetesClusters.push(cluster);
      return;
    }
    groupedKubernetesClusters.set(cluster.workspaceId, [cluster]);
  });
  return groupedKubernetesClusters;
};

export const buildVirtualMachinesByWorkspaceId = (virtualMachines: ControlPlaneVirtualMachine[]): Map<string, ControlPlaneVirtualMachine[]> => {
  const groupedVirtualMachines = new Map<string, ControlPlaneVirtualMachine[]>();
  virtualMachines.forEach((virtualMachine) => {
    const workspaceVirtualMachines = groupedVirtualMachines.get(virtualMachine.workspaceId);
    if (workspaceVirtualMachines) {
      workspaceVirtualMachines.push(virtualMachine);
      return;
    }
    groupedVirtualMachines.set(virtualMachine.workspaceId, [virtualMachine]);
  });
  return groupedVirtualMachines;
};

export const getWorkspaceClusterCounts = (
  workspaces: Workspace[],
  kubernetesClustersByWorkspaceId: Map<string, KubernetesCluster[]>
): Map<string, number> => {
  const counts = new Map<string, number>();
  workspaces.forEach((workspace) => {
    const canReadWorkspaceData = workspace.permissions?.read_workspace_data
      ?? workspace.currentUserRoleTemplate?.capabilities.includes('read_workspace_data')
      ?? false;
    if (!canReadWorkspaceData) {
      counts.set(workspace.id, workspace.clusterCount ?? 0);
      return;
    }
    counts.set(workspace.id, workspace.clusterCount ?? kubernetesClustersByWorkspaceId.get(workspace.id)?.length ?? 0);
  });
  kubernetesClustersByWorkspaceId.forEach((workspaceKubernetesClusters, workspaceId) => {
    if (!counts.has(workspaceId)) {
      counts.set(workspaceId, workspaceKubernetesClusters.length);
    }
  });
  return counts;
};

export const getWorkspaceInitials = (workspaceName?: string): string =>
  (workspaceName || 'WS')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
