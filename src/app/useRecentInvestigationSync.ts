import React from 'react';
import { writeRecentInvestigation } from '@/pages/workspace-overview/recentInvestigation';
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
    if (!currentUserId) return;

    if (route.kind === 'workspaceKubernetesClusterDiagnostics' && route.tab === 'chat') {
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

    if (route.kind === 'workspaceVirtualMachineDetail' && route.tab === 'chat') {
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
  }, [currentUserId, kubernetesClusterById, route, virtualMachinesInWorkspaceContext]);
}
