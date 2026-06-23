import { canReadWorkspaceAuditLog, canReadWorkspaceData } from '@/app/workspacePermissions';
import { Workspace } from '@/types';
import { AppPaths, AppRoute } from '@/utils/routes';

export function workspaceLandingPath(workspace: Workspace): string {
  if (canReadWorkspaceData(workspace)) return AppPaths.workspaceOverview(workspace.id);
  if (canReadWorkspaceAuditLog(workspace)) return AppPaths.workspaceAuditLog(workspace.id);
  return AppPaths.workspaceMembers(workspace.id);
}

export function isWorkspaceDataRoute(route: AppRoute): boolean {
  return (
    route.kind === 'workspaceOverview' ||
    route.kind === 'workspaceRunbooks' ||
    route.kind === 'workspaceKubernetesClusters' ||
    route.kind === 'workspaceVirtualMachines' ||
    route.kind === 'workspaceVirtualMachineDetail' ||
    route.kind === 'workspaceKubernetesClusterDiagnostics' ||
    route.kind === 'workspaceAiSettings' ||
    route.kind === 'workspaceSettings'
  );
}
