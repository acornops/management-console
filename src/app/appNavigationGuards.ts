import { canReadWorkspaceAuditLog, canReadWorkspaceData, canReadWorkspaceMembers } from '@/app/workspacePermissions';
import { Workspace } from '@/types';
import { AppPaths, AppRoute } from '@/utils/routes';

export function workspaceLandingPath(workspace: Workspace): string {
  if (canReadWorkspaceData(workspace)) return AppPaths.workspaceOverview(workspace.id);
  if (canReadWorkspaceAuditLog(workspace)) return AppPaths.workspaceAuditLog(workspace.id);
  if (canReadWorkspaceMembers(workspace)) return AppPaths.workspaceMembers(workspace.id);
  return AppPaths.workspaceSettings(workspace.id);
}

export function isWorkspaceDataRoute(route: AppRoute): boolean {
  return (
    route.kind === 'workspaceOverview' ||
    route.kind === 'workspaceKubernetesClusters' ||
    route.kind === 'workspaceVirtualMachines' ||
    route.kind === 'workspaceVirtualMachineDetail' ||
    route.kind === 'workspaceKubernetesClusterDiagnostics' ||
    route.kind === 'workspaceSchedules' ||
    route.kind === 'workspaceCatalog' ||
    route.kind === 'workspaceApprovals' ||
    route.kind === 'workspaceAiSettings'
  );
}
