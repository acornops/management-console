import { Workspace } from '@/types';

export type WorkspacePermission = keyof NonNullable<Workspace['permissions']>;

export function hasWorkspacePermission(
  workspace: Workspace | undefined,
  permission: WorkspacePermission
): boolean {
  if (!workspace) return false;
  const serverPermission = workspace.permissions?.[permission];
  if (typeof serverPermission === 'boolean') return serverPermission;
  return workspace.currentUserRoleTemplate?.capabilities.includes(permission) ?? false;
}

export function canReadWorkspaceData(workspace: Workspace | undefined): boolean {
  return hasWorkspacePermission(workspace, 'read_workspace_data');
}

export function canReadWorkspaceAuditLog(workspace: Workspace | undefined): boolean {
  return hasWorkspacePermission(workspace, 'read_audit_log');
}

export function canReadWorkspaceMembers(workspace: Workspace | undefined): boolean {
  return hasWorkspacePermission(workspace, 'read_members');
}

export function canManageWorkspaceMembers(workspace: Workspace | undefined): boolean {
  return hasWorkspacePermission(workspace, 'manage_members');
}
