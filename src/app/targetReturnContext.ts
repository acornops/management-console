import { AppPaths, type AppRoute } from '@/utils/routes';

export interface TargetReturnContext {
  targetId: string;
  targetType: 'kubernetes' | 'virtual_machine';
  workspaceId: string;
  path: string;
}

export function getTargetReturnContext(
  previousRoute: AppRoute | null,
  nextRoute: AppRoute
): TargetReturnContext | null {
  if (nextRoute.kind === 'workspaceKubernetesClusterDiagnostics') {
    if (previousRoute?.kind === 'workspaceOverview' && previousRoute.workspaceId === nextRoute.workspaceId) {
      return {
        targetId: nextRoute.clusterId,
        targetType: 'kubernetes',
        workspaceId: nextRoute.workspaceId,
        path: AppPaths.workspaceOverview(nextRoute.workspaceId)
      };
    }
    if (previousRoute?.kind === 'workspaceKubernetesClusters' && previousRoute.workspaceId === nextRoute.workspaceId) {
      return {
        targetId: nextRoute.clusterId,
        targetType: 'kubernetes',
        workspaceId: nextRoute.workspaceId,
        path: AppPaths.workspaceKubernetesClusters(nextRoute.workspaceId, {
          q: previousRoute.q,
          status: previousRoute.status
        })
      };
    }
  }

  if (nextRoute.kind === 'workspaceVirtualMachineDetail') {
    if (previousRoute?.kind === 'workspaceOverview' && previousRoute.workspaceId === nextRoute.workspaceId) {
      return {
        targetId: nextRoute.vmId,
        targetType: 'virtual_machine',
        workspaceId: nextRoute.workspaceId,
        path: AppPaths.workspaceOverview(nextRoute.workspaceId)
      };
    }
    if (previousRoute?.kind === 'workspaceVirtualMachines' && previousRoute.workspaceId === nextRoute.workspaceId) {
      return {
        targetId: nextRoute.vmId,
        targetType: 'virtual_machine',
        workspaceId: nextRoute.workspaceId,
        path: AppPaths.workspaceVirtualMachines(nextRoute.workspaceId, {
          q: previousRoute.q,
          status: previousRoute.status
        })
      };
    }
  }

  return null;
}
