import { canReadWorkspaceAuditLog, canReadWorkspaceData, canReadWorkspaceMembers } from '@/app/workspacePermissions';
import { Workspace } from '@/types';
import { AppPaths, AppRoute } from '@/utils/routes';

interface LegacySettingsRedirectInput {
  selectedWorkspaceId: string | null;
  workspaceById: Map<string, Workspace>;
  workspaces: Workspace[];
}

export function workspaceLandingPath(workspace: Workspace): string {
  if (canReadWorkspaceData(workspace)) return AppPaths.workspaceOverview(workspace.id);
  if (canReadWorkspaceAuditLog(workspace)) return AppPaths.workspaceAuditLog(workspace.id);
  if (canReadWorkspaceMembers(workspace)) return AppPaths.workspaceMembers(workspace.id);
  return AppPaths.workspaceSettings(workspace.id);
}

export function legacySettingsRedirectPath({
  selectedWorkspaceId,
  workspaceById,
  workspaces
}: LegacySettingsRedirectInput): string {
  const targetWorkspaceId =
    (selectedWorkspaceId && workspaceById.has(selectedWorkspaceId))
      ? selectedWorkspaceId
      : workspaces[0]?.id;
  if (!targetWorkspaceId) return AppPaths.workspaces();

  const targetWorkspace = workspaceById.get(targetWorkspaceId);
  if (!targetWorkspace) return AppPaths.workspaces();

  return AppPaths.workspaceSettings(targetWorkspace.id);
}

export function isWorkspaceDataRoute(route: AppRoute): boolean {
  return (
    route.kind === 'workspaceOverview' ||
    route.kind === 'workspaceKubernetesClusters' ||
    route.kind === 'workspaceVirtualMachines' ||
    route.kind === 'workspaceVirtualMachineDetail' ||
    route.kind === 'workspaceKubernetesClusterDiagnostics' ||
    route.kind === 'workspaceSchedules' ||
    route.kind === 'workspaceApprovals' ||
    route.kind === 'workspaceAiSettings'
  );
}
