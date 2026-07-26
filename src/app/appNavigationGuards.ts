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
    route.kind === 'workspaceTriggers' ||
    route.kind === 'workspaceRuns' ||
    route.kind === 'workspaceCatalog' ||
    route.kind === 'workspaceApprovals' ||
    route.kind === 'workspaceWebhooks' ||
    route.kind === 'workspaceAiSettings'
  );
}

export function routeTargetsMissingWorkspace(
  route: AppRoute,
  workspaceContext: Workspace | undefined,
  workspaceCount: number
): boolean {
  if (workspaceCount !== 0 || workspaceContext) return false;
  return (
    isWorkspaceDataRoute(route)
    || route.kind === 'workspaceAgents'
    || route.kind === 'workspaceWorkflows'
    || route.kind === 'workspaceRuns'
    || route.kind === 'workspaceMembers'
    || route.kind === 'workspaceSettings'
    || route.kind === 'workspaceAuditLog'
  );
}
