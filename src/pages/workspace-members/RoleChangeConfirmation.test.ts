import { describe, expect, it } from 'vitest';
import { WorkspaceRoleTemplate } from '@/types';
import { getRoleCapabilityDiff } from './RoleChangeConfirmation';

const viewerRole: WorkspaceRoleTemplate = {
  key: 'viewer',
  displayName: 'Viewer',
  description: 'Reads workspace state.',
  kind: 'system',
  capabilities: ['read_workspace_data', 'read_members'],
  protected: false,
  sortOrder: 40
};

const adminRole: WorkspaceRoleTemplate = {
  key: 'admin',
  displayName: 'Admin',
  description: 'Manages the workspace.',
  kind: 'system',
  capabilities: ['read_workspace_data', 'read_members', 'manage_members', 'manage_targets'],
  protected: false,
  sortOrder: 20
};

describe('RoleChangeConfirmation helpers', () => {
  it('summarizes gained and lost capabilities for a pending role change', () => {
    expect(getRoleCapabilityDiff(viewerRole, adminRole)).toEqual({
      gained: ['manage_members', 'manage_targets'],
      lost: []
    });
    expect(getRoleCapabilityDiff(adminRole, viewerRole)).toEqual({
      gained: [],
      lost: ['manage_members', 'manage_targets']
    });
  });

  it('returns empty diff when either side is unavailable', () => {
    expect(getRoleCapabilityDiff(undefined, adminRole)).toEqual({ gained: [], lost: [] });
    expect(getRoleCapabilityDiff(viewerRole, undefined)).toEqual({ gained: [], lost: [] });
  });
});
