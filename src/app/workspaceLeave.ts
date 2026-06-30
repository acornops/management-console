import type { ProjectMember, Workspace } from '@/types';

export function isKnownOnlyWorkspaceOwner(
  currentUserRole: ProjectMember['role'] | undefined,
  memberCount: number | undefined
): boolean {
  return currentUserRole === 'owner' && memberCount === 1;
}

export function shouldPreflightWorkspaceOwnerLeave(currentUserRole: ProjectMember['role'] | undefined): boolean {
  return currentUserRole === 'owner';
}

export function hasAnotherWorkspaceOwner(owners: ProjectMember[]): boolean {
  return owners.length > 1;
}

export function workspacesAfterLeave(workspaces: Workspace[], workspaceId: string): Workspace[] {
  return workspaces.filter((workspace) => workspace.id !== workspaceId);
}
