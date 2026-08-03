import { useEffect, useMemo, useState } from 'react';
import {
  getActiveAgentSubview,
  getActiveClusterSubview,
  getActiveVmSubview,
  getClusterRouteId
} from '@/app/appRouteState';
import { canReadWorkspaceData } from '@/app/workspacePermissions';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import { getAgent, type AgentDefinitionApi } from '@/services/control-plane/agentApi';
import { AgentSubview, AppRoute, ClusterSubview, VmSubview } from '@/utils/routes';
import { KubernetesCluster, User, Workspace } from '@/types';

interface SidebarRouteTargetsArgs {
  route: AppRoute;
  user: User | null;
  workspaceContext: Workspace | undefined;
  selectedWorkspace: Workspace | undefined;
  kubernetesClusterById: Map<string, KubernetesCluster>;
  kubernetesClustersInWorkspaceContext: KubernetesCluster[];
  virtualMachinesInWorkspaceContext: ControlPlaneVirtualMachine[];
  workspaceById: Map<string, Workspace>;
}

interface SidebarRouteTargets {
  activeAgentSubview: AgentSubview;
  activeClusterSubview: ClusterSubview;
  activeVmSubview: VmSubview;
  isAgentSidebar: boolean;
  isClusterSidebar: boolean;
  isVirtualMachineSidebar: boolean;
  selectedSidebarCluster: KubernetesCluster | null;
  selectedSidebarAgent: Pick<AgentDefinitionApi, 'id' | 'workspaceId' | 'name'> & Partial<Pick<AgentDefinitionApi, 'avatarEmoji'>> | null;
  selectedSidebarVm: Pick<ControlPlaneVirtualMachine, 'id' | 'workspaceId' | 'name'> | null;
}

export function useSidebarRouteTargets({
  route,
  user,
  workspaceContext,
  selectedWorkspace,
  kubernetesClusterById,
  kubernetesClustersInWorkspaceContext,
  virtualMachinesInWorkspaceContext,
  workspaceById
}: SidebarRouteTargetsArgs): SidebarRouteTargets {
  const routeAgentWorkspaceId = route.kind === 'workspaceAgentDetail' ? route.workspaceId : null;
  const routeAgentId = route.kind === 'workspaceAgentDetail' ? route.agentId : null;
  const clusterContextId = getClusterRouteId(route);
  const routeVmWorkspaceId = route.kind === 'workspaceVirtualMachineDetail' ? route.workspaceId : null;
  const routeVmId = route.kind === 'workspaceVirtualMachineDetail' ? route.vmId : null;
  const [selectedSidebarVm, setSelectedSidebarVm] = useState<ControlPlaneVirtualMachine | null>(null);
  const [selectedSidebarAgent, setSelectedSidebarAgent] = useState<AgentDefinitionApi | null>(null);
  const selectedSidebarVmId = selectedSidebarVm?.id || null;
  const selectedSidebarVmWorkspaceId = selectedSidebarVm?.workspaceId || null;
  const selectedSidebarAgentId = selectedSidebarAgent?.id || null;
  const selectedSidebarAgentWorkspaceId = selectedSidebarAgent?.workspaceId || null;
  const selectedSidebarCluster = useMemo(
    () =>
      clusterContextId
        ? kubernetesClusterById.get(clusterContextId) || null
        : kubernetesClustersInWorkspaceContext[0] || null,
    [clusterContextId, kubernetesClusterById, kubernetesClustersInWorkspaceContext]
  );
  const cachedSidebarVm = useMemo(
    () => {
      if (!routeVmWorkspaceId || !routeVmId) return null;
      return virtualMachinesInWorkspaceContext.find((vm) => vm.id === routeVmId && vm.workspaceId === routeVmWorkspaceId) || null;
    },
    [routeVmWorkspaceId, routeVmId, virtualMachinesInWorkspaceContext]
  );
  const selectedSidebarVmForRoute = useMemo(
    () => {
      if (!routeVmWorkspaceId || !routeVmId) return null;
      if (cachedSidebarVm) return cachedSidebarVm;
      if (selectedSidebarVmId === routeVmId && selectedSidebarVmWorkspaceId === routeVmWorkspaceId) {
        return selectedSidebarVm;
      }
      return {
        id: routeVmId,
        workspaceId: routeVmWorkspaceId,
        name: routeVmId
      };
    },
    [cachedSidebarVm, routeVmWorkspaceId, routeVmId, selectedSidebarVm, selectedSidebarVmId, selectedSidebarVmWorkspaceId]
  );

  const selectedSidebarAgentForRoute = useMemo(() => {
    if (!routeAgentWorkspaceId || !routeAgentId) return null;
    if (
      selectedSidebarAgentId === routeAgentId
      && selectedSidebarAgentWorkspaceId === routeAgentWorkspaceId
    ) {
      return selectedSidebarAgent;
    }
    return {
      id: routeAgentId,
      workspaceId: routeAgentWorkspaceId,
      name: routeAgentId
    };
  }, [
    routeAgentId,
    routeAgentWorkspaceId,
    selectedSidebarAgent,
    selectedSidebarAgentId,
    selectedSidebarAgentWorkspaceId
  ]);

  useEffect(() => {
    if (!routeAgentWorkspaceId || !routeAgentId) {
      if (selectedSidebarAgent) setSelectedSidebarAgent(null);
      return;
    }
    if (!user) return;
    if (
      selectedSidebarAgentId === routeAgentId
      && selectedSidebarAgentWorkspaceId === routeAgentWorkspaceId
    ) {
      return;
    }
    const routeWorkspace = workspaceById.get(routeAgentWorkspaceId);
    if (!routeWorkspace || !canReadWorkspaceData(routeWorkspace)) return;
    let cancelled = false;
    void getAgent(routeAgentWorkspaceId, routeAgentId)
      .then((agent) => {
        if (!cancelled) setSelectedSidebarAgent(agent);
      })
      .catch((error) => {
        console.error('Failed hydrating Agent route resource', error);
      });
    return () => {
      cancelled = true;
    };
  }, [
    routeAgentId,
    routeAgentWorkspaceId,
    selectedSidebarAgent,
    selectedSidebarAgentId,
    selectedSidebarAgentWorkspaceId,
    user,
    workspaceById
  ]);

  useEffect(() => {
    if (!routeVmWorkspaceId || !routeVmId) {
      if (selectedSidebarVm) {
        setSelectedSidebarVm(null);
      }
      return;
    }
    if (!user) {
      return;
    }
    if (cachedSidebarVm && (selectedSidebarVmId !== routeVmId || selectedSidebarVmWorkspaceId !== routeVmWorkspaceId)) {
      setSelectedSidebarVm(cachedSidebarVm);
    }
    if (selectedSidebarVmId === routeVmId && selectedSidebarVmWorkspaceId === routeVmWorkspaceId) {
      return;
    }
    const routeWorkspace = workspaceById.get(routeVmWorkspaceId);
    if (!routeWorkspace || !canReadWorkspaceData(routeWorkspace)) {
      return;
    }
    let cancelled = false;
    void (cachedSidebarVm ? Promise.resolve(cachedSidebarVm) : controlPlaneApi.getVirtualMachine(routeVmWorkspaceId, routeVmId))
      .then((vm) => {
        if (!cancelled) {
          setSelectedSidebarVm(vm);
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
    cachedSidebarVm,
    selectedSidebarVmId,
    selectedSidebarVmWorkspaceId,
    user,
    workspaceById
  ]);

  const clusterSidebarWorkspace = workspaceContext || selectedWorkspace;
  const vmSidebarWorkspace = workspaceContext || selectedWorkspace;
  const agentSidebarWorkspace = workspaceContext || selectedWorkspace;
  return {
    activeAgentSubview: getActiveAgentSubview(route),
    activeClusterSubview: getActiveClusterSubview(route),
    activeVmSubview: getActiveVmSubview(route),
    isAgentSidebar: route.kind === 'workspaceAgentDetail' && canReadWorkspaceData(agentSidebarWorkspace),
    isClusterSidebar: (
      route.kind === 'workspaceKubernetesClusterDiagnostics' ||
      route.kind === 'kubernetesClusterDiagnostics'
    ) && canReadWorkspaceData(clusterSidebarWorkspace),
    isVirtualMachineSidebar: route.kind === 'workspaceVirtualMachineDetail' && canReadWorkspaceData(vmSidebarWorkspace),
    selectedSidebarAgent: selectedSidebarAgentForRoute,
    selectedSidebarCluster,
    selectedSidebarVm: selectedSidebarVmForRoute
  };
}
