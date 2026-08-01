import React from 'react';
import {
  clearRecentInvestigationForWorkspace,
  writeRecentInvestigation
} from '@/pages/workspace-overview/recentInvestigation';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import type { KubernetesCluster } from '@/types';
import { AppPaths, type AppRoute } from '@/utils/routes';

export function useRecentInvestigationSync(args: {
  currentUserId: string | null;
  route: AppRoute;
  kubernetesClusterById: Map<string, KubernetesCluster>;
  virtualMachinesInWorkspaceContext: ControlPlaneVirtualMachine[];
}) {
  const { currentUserId, route, kubernetesClusterById, virtualMachinesInWorkspaceContext } = args;

  React.useEffect(() => {
    syncRecentInvestigation({
      currentUserId,
      route,
      kubernetesClusterById,
      virtualMachinesInWorkspaceContext
    });
  }, [currentUserId, kubernetesClusterById, route, virtualMachinesInWorkspaceContext]);
}

export function syncRecentInvestigation(args: {
  currentUserId: string | null;
  route: AppRoute;
  kubernetesClusterById: Map<string, KubernetesCluster>;
  virtualMachinesInWorkspaceContext: ControlPlaneVirtualMachine[];
}): void {
  const { currentUserId, route, kubernetesClusterById, virtualMachinesInWorkspaceContext } = args;
  if (!currentUserId) return;

  if (route.kind === 'workspaceKubernetesClusterDiagnostics') {
    if (route.tab !== 'chat') {
      clearRecentInvestigationForWorkspace(currentUserId, route.workspaceId);
      return;
    }

    const cluster = kubernetesClusterById.get(route.clusterId);
    if (!cluster) return;
    writeRecentInvestigation({
      userId: currentUserId,
      workspaceId: route.workspaceId,
      path: AppPaths.workspaceKubernetesClusterDiagnostics(route.workspaceId, route.clusterId, 'chat'),
      targetName: cluster.name,
      targetType: 'kubernetes'
    });
    return;
  }

  if (route.kind === 'workspaceVirtualMachineDetail') {
    if (route.tab !== 'chat') {
      clearRecentInvestigationForWorkspace(currentUserId, route.workspaceId);
      return;
    }

    const virtualMachine = virtualMachinesInWorkspaceContext.find((item) => item.id === route.vmId);
    if (!virtualMachine) return;
    writeRecentInvestigation({
      userId: currentUserId,
      workspaceId: route.workspaceId,
      path: AppPaths.workspaceVirtualMachineDetail(route.workspaceId, route.vmId, 'chat'),
      targetName: virtualMachine.name,
      targetType: 'virtual_machine'
    });
  }
}
