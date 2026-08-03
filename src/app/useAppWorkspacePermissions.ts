import { useCallback } from 'react';
import { getCurrentUserRoleForWorkspaceValue, getWorkspacePermissionValue } from '@/app/appWorkspacePermissions';
import type { Workspace } from '@/types';

export function useAppWorkspacePermissions(workspaceById: Map<string, Workspace>, userEmail?: string) {
  const getCurrentUserRoleForWorkspace = useCallback(
    (workspaceId: string): Workspace['members'][number]['role'] => getCurrentUserRoleForWorkspaceValue(workspaceById, userEmail, workspaceId),
    [userEmail, workspaceById]
  );
  const getWorkspacePermission = useCallback(
    (workspaceId: string, permission: keyof NonNullable<Workspace['permissions']>): boolean => getWorkspacePermissionValue(workspaceById, userEmail, workspaceId, permission),
    [userEmail, workspaceById]
  );
  return { getCurrentUserRoleForWorkspace, getWorkspacePermission };
}
