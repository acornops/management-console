import { Workspace } from '@/types';

export function canReadWorkspaceData(workspace: Workspace | undefined): boolean {
  if (!workspace) return false;
  if (typeof workspace.permissions?.read_workspace_data === 'boolean') {
    return workspace.permissions.read_workspace_data;
  }
  if (workspace.currentUserRoleTemplate) {
    return workspace.currentUserRoleTemplate.capabilities.includes('read_workspace_data');
  }
  return false;
}

export function canReadWorkspaceAuditLog(workspace: Workspace | undefined): boolean {
  if (!workspace) return false;
  if (typeof workspace.permissions?.read_audit_log === 'boolean') {
    return workspace.permissions.read_audit_log;
  }
  if (workspace.currentUserRoleTemplate) {
    return workspace.currentUserRoleTemplate.capabilities.includes('read_audit_log');
  }
  return false;
}

export function canReadWorkspaceMembers(workspace: Workspace | undefined): boolean {
  if (!workspace) return false;
  if (typeof workspace.permissions?.read_members === 'boolean') {
    return workspace.permissions.read_members;
  }
  if (workspace.currentUserRoleTemplate) {
    return workspace.currentUserRoleTemplate.capabilities.includes('read_members');
  }
  return false;
}

export function canManageWorkspaceMembers(workspace: Workspace | undefined): boolean {
  if (!workspace) return false;
  if (typeof workspace.permissions?.manage_members === 'boolean') {
    return workspace.permissions.manage_members;
  }
  if (workspace.currentUserRoleTemplate) {
    return workspace.currentUserRoleTemplate.capabilities.includes('manage_members');
  }
  return false;
}
