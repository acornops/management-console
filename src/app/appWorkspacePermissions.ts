import { Workspace } from '@/types';
import { hasWorkspacePermission } from '@/app/workspacePermissions';

export function getCurrentUserRoleForWorkspaceValue(
  workspaceById: Map<string, Workspace>,
  userEmail: string | undefined,
  workspaceId: string
): Workspace['members'][number]['role'] {
  const workspace = workspaceById.get(workspaceId);
  return workspace?.currentUserRole || workspace?.members.find((member) => member.email === userEmail)?.role || 'viewer';
}

export function getWorkspacePermissionValue(
  workspaceById: Map<string, Workspace>,
  userEmail: string | undefined,
  workspaceId: string,
  permission: keyof NonNullable<Workspace['permissions']>
): boolean {
  return hasWorkspacePermission(workspaceById.get(workspaceId), permission);
}
