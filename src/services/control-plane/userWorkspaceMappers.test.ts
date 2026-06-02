import { describe, expect, it } from 'vitest';

import { userFromControlPlane } from './userMappers';
import { mapWorkspace, mapWorkspaceMember } from './workspaceMappers';

describe('user and workspace mappers', () => {
  it('uses the display name when present and falls back to the email for users', () => {
    expect(
      userFromControlPlane({
        id: 'user-1',
        email: 'ops@example.com',
        displayName: 'Ops User'
      })
    ).toEqual({
      id: 'user-1',
      email: 'ops@example.com',
      name: 'Ops User',
      groups: [],
      quota: undefined
    });

    expect(
      userFromControlPlane({
        id: 'user-2',
        email: 'fallback@example.com',
        displayName: ''
      })
    ).toEqual({
      id: 'user-2',
      email: 'fallback@example.com',
      name: 'fallback@example.com',
      groups: [],
      quota: undefined
    });
  });

  it('maps user quota for settings visibility', () => {
    expect(
      userFromControlPlane({
        id: 'user-1',
        email: 'ops@example.com',
        displayName: 'Ops User',
        quota: {
          workspaceMemberships: { used: 12, limit: 50 }
        }
      })
    ).toMatchObject({
      quota: {
        workspaceMemberships: { used: 12, limit: 50 }
      }
    });
  });

  it('maps workspace members and source labels', () => {
    expect(
      mapWorkspaceMember({
        workspaceId: 'workspace-1',
        userId: 'user-1',
        email: 'oidc@example.com',
        displayName: '',
        role: 'owner',
        source: 'oidc'
      })
    ).toEqual({
      userId: 'user-1',
      email: 'oidc@example.com',
      name: 'oidc@example.com',
      role: 'owner',
      source: 'OIDC'
    });

    expect(
      mapWorkspaceMember({
        workspaceId: 'workspace-1',
        userId: 'user-2',
        email: 'internal@example.com',
        displayName: 'Internal User',
        role: 'viewer',
        source: 'internal'
      })
    ).toEqual({
      userId: 'user-2',
      email: 'internal@example.com',
      name: 'Internal User',
      role: 'viewer',
      source: 'Internal'
    });
  });

  it('defaults missing workspace metadata from members and fallback role', () => {
    const members = [
      {
        userId: 'user-1',
        email: 'owner@example.com',
        name: 'Owner',
        role: 'owner' as const,
        source: 'OIDC' as const
      }
    ];

    expect(
      mapWorkspace({
        id: 'workspace-1',
        name: 'Platform',
        createdBy: 'user-1'
      }, members)
    ).toEqual({
      id: 'workspace-1',
      name: 'Platform',
      description: '',
      members,
      currentUserRole: 'viewer',
      permissions: undefined,
      clusterCount: 0,
      memberCount: 1,
      plan: undefined,
      quota: undefined,
      clusterIds: []
    });
  });

  it('maps workspace plan and quota for workspace settings visibility', () => {
    expect(
      mapWorkspace({
        id: 'workspace-1',
        name: 'Platform',
        createdBy: 'user-1',
        plan: { key: 'default', name: 'Default' },
        quota: {
          members: { used: 12, limit: 50 },
          kubernetesClusters: { used: 4, limit: 30 },
          virtualMachines: { used: 5, limit: 30 }
        }
      })
    ).toMatchObject({
      plan: { key: 'default', name: 'Default' },
      quota: {
        members: { used: 12, limit: 50 },
        kubernetesClusters: { used: 4, limit: 30 },
        virtualMachines: { used: 5, limit: 30 }
      }
    });
  });
});
