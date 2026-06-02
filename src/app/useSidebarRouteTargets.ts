import { useEffect, useMemo, useState } from 'react';
import {
  getActiveClusterSubview,
  getActiveVmSubview,
  getClusterRouteId
} from '@/app/appRouteState';
import { canReadWorkspaceData } from '@/app/workspacePermissions';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import { AppRoute, ClusterSubview, VmSubview } from '@/utils/routes';
import { KubernetesCluster, User, Workspace } from '@/types';

interface SidebarRouteTargetsArgs {
  route: AppRoute;
  user: User | null;
  workspaceContext: Workspace | undefined;
  selectedWorkspace: Workspace | undefined;
  kubernetesClusterById: Map<string, KubernetesCluster>;
  kubernetesClustersInWorkspaceContext: KubernetesCluster[];
  workspaceById: Map<string, Workspace>;
}

interface SidebarRouteTargets {
  activeClusterSubview: ClusterSubview;
  activeVmSubview: VmSubview;
  isClusterSidebar: boolean;
  isVirtualMachineSidebar: boolean;
  selectedSidebarCluster: KubernetesCluster | null;
  selectedSidebarVm: Pick<ControlPlaneVirtualMachine, 'id' | 'workspaceId' | 'name'> | null;
  selectedSidebarVmFindingCount: number;
}

export function useSidebarRouteTargets({
  route,
  user,
  workspaceContext,
  selectedWorkspace,
  kubernetesClusterById,
  kubernetesClustersInWorkspaceContext,
  workspaceById
}: SidebarRouteTargetsArgs): SidebarRouteTargets {
  const clusterContextId = getClusterRouteId(route);
  const routeVmWorkspaceId = route.kind === 'workspaceVirtualMachineDetail' ? route.workspaceId : null;
  const routeVmId = route.kind === 'workspaceVirtualMachineDetail' ? route.vmId : null;
  const [selectedSidebarVm, setSelectedSidebarVm] = useState<ControlPlaneVirtualMachine | null>(null);
  const [selectedSidebarVmFindingCount, setSelectedSidebarVmFindingCount] = useState(0);
  const selectedSidebarVmId = selectedSidebarVm?.id || null;
  const selectedSidebarVmWorkspaceId = selectedSidebarVm?.workspaceId || null;
  const selectedSidebarCluster = useMemo(
    () =>
      clusterContextId
        ? kubernetesClusterById.get(clusterContextId) || null
        : kubernetesClustersInWorkspaceContext[0] || null,
    [clusterContextId, kubernetesClusterById, kubernetesClustersInWorkspaceContext]
  );
  const selectedSidebarVmForRoute = useMemo(
    () => {
      if (!routeVmWorkspaceId || !routeVmId) return null;
      if (selectedSidebarVmId === routeVmId && selectedSidebarVmWorkspaceId === routeVmWorkspaceId) {
        return selectedSidebarVm;
      }
      return {
        id: routeVmId,
        workspaceId: routeVmWorkspaceId,
        name: routeVmId
      };
    },
    [routeVmWorkspaceId, routeVmId, selectedSidebarVm, selectedSidebarVmId, selectedSidebarVmWorkspaceId]
  );

  useEffect(() => {
    if (!routeVmWorkspaceId || !routeVmId) {
      if (selectedSidebarVm) {
        setSelectedSidebarVm(null);
      }
      setSelectedSidebarVmFindingCount(0);
      return;
    }
    if (!user) {
      return;
    }
    if (selectedSidebarVmId === routeVmId && selectedSidebarVmWorkspaceId === routeVmWorkspaceId) {
      return;
    }
    const routeWorkspace = workspaceById.get(routeVmWorkspaceId);
    if (!routeWorkspace || !canReadWorkspaceData(routeWorkspace)) {
      return;
    }
    let cancelled = false;
    void Promise.all([
      controlPlaneApi.getVirtualMachine(routeVmWorkspaceId, routeVmId),
      controlPlaneApi.listVirtualMachineFindings(routeVmWorkspaceId, routeVmId).catch(() => ({ items: [] }))
    ])
      .then(([vm, findings]) => {
        if (!cancelled) {
          setSelectedSidebarVm(vm);
          setSelectedSidebarVmFindingCount(findings.items?.length || 0);
        }
      })
      .catch((error) => {
        console.error('Failed hydrating virtual machine route target', error);
      });
    return () => {
      cancelled = true;
    };
  }, [
    routeVmWorkspaceId,
    routeVmId,
    selectedSidebarVmId,
    selectedSidebarVmWorkspaceId,
    user,
    workspaceById
  ]);

  const clusterSidebarWorkspace = workspaceContext || selectedWorkspace;
  const vmSidebarWorkspace = workspaceContext || selectedWorkspace;
  return {
    activeClusterSubview: getActiveClusterSubview(route),
    activeVmSubview: getActiveVmSubview(route),
    isClusterSidebar: (
      route.kind === 'workspaceKubernetesClusterDiagnostics' ||
      route.kind === 'kubernetesClusterDiagnostics'
    ) && canReadWorkspaceData(clusterSidebarWorkspace),
    isVirtualMachineSidebar: route.kind === 'workspaceVirtualMachineDetail' && canReadWorkspaceData(vmSidebarWorkspace),
    selectedSidebarCluster,
    selectedSidebarVm: selectedSidebarVmForRoute,
    selectedSidebarVmFindingCount
  };
}
