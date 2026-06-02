import { describe, expect, it } from 'vitest';

import { getWorkspacePermissionValue } from '@/app/appWorkspacePermissions';
import { Workspace } from '@/types';

function workspace(input: Partial<Workspace>): Workspace {
  return {
    id: 'workspace-a',
    name: 'Workspace A',
    description: '',
    members: [],
    clusterIds: [],
    ...input
  };
}

describe('app workspace permission lookup', () => {
  it('trusts explicit server permissions', () => {
    const workspaces = new Map([
      ['workspace-a', workspace({
        currentUserRole: 'viewer',
        permissions: { manage_members: true } as Workspace['permissions']
      })]
    ]);

    expect(getWorkspacePermissionValue(workspaces, 'user@example.com', 'workspace-a', 'manage_members')).toBe(true);
  });

  it('uses role template capabilities when explicit permissions are absent', () => {
    const workspaces = new Map([
      ['workspace-a', workspace({
        currentUserRole: 'support_lead',
        currentUserRoleTemplate: {
          key: 'support_lead',
          displayName: 'Support Lead',
          description: '',
          kind: 'custom',
          capabilities: ['read_members', 'manage_members'],
          protected: false,
          sortOrder: 250
        }
      })]
    ]);

    expect(getWorkspacePermissionValue(workspaces, 'user@example.com', 'workspace-a', 'manage_members')).toBe(true);
    expect(getWorkspacePermissionValue(workspaces, 'user@example.com', 'workspace-a', 'delete_workspace')).toBe(false);
  });

  it('fails closed when permission metadata is missing', () => {
    const workspaces = new Map([
      ['workspace-a', workspace({ currentUserRole: 'owner' })]
    ]);

    expect(getWorkspacePermissionValue(workspaces, 'owner@example.com', 'workspace-a', 'manage_members')).toBe(false);
    expect(getWorkspacePermissionValue(workspaces, 'owner@example.com', 'workspace-a', 'delete_workspace')).toBe(false);
  });
});
