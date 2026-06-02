import { Workspace } from '@/types';

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
  const workspace = workspaceById.get(workspaceId);
  const serverPermission = workspace?.permissions?.[permission];
  if (typeof serverPermission === 'boolean') return serverPermission;
  if (workspace?.currentUserRoleTemplate) {
    return workspace.currentUserRoleTemplate.capabilities.includes(permission);
  }
  return false;
}
