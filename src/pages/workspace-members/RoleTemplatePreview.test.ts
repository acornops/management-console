import { describe, expect, it } from 'vitest';
import { WorkspaceRoleTemplate } from '@/types';
import { getRoleCapabilityGroups, getRoleKindLabels } from './RoleTemplatePreview';

const baseRole: WorkspaceRoleTemplate = {
  key: 'operator',
  displayName: 'Operator',
  description: 'Runs troubleshooting workflows.',
  kind: 'system',
  capabilities: ['read_workspace_data', 'manage_members', 'create_sessions'],
  protected: false,
  sortOrder: 30
};

describe('RoleTemplatePreview helpers', () => {
  it('uses control-plane capability groups as the display source of truth', () => {
    expect(getRoleCapabilityGroups({
      ...baseRole,
      capabilityGroups: [
        { key: 'operations', capabilities: ['create_sessions'], sortOrder: 20 },
        { key: 'workspace', capabilities: ['read_workspace_data'], sortOrder: 0 },
        { key: 'members', capabilities: ['manage_members'], sortOrder: 10 },
        { key: 'settings', capabilities: [], sortOrder: 5 }
      ]
    })).toEqual([
      { key: 'workspace', capabilities: ['read_workspace_data'], sortOrder: 0 },
      { key: 'members', capabilities: ['manage_members'], sortOrder: 10 },
      { key: 'operations', capabilities: ['create_sessions'], sortOrder: 20 }
    ]);
  });

  it('falls back to one uncategorized permissions group for older role payloads', () => {
    expect(getRoleCapabilityGroups(baseRole)).toEqual([
      {
        key: 'permissions',
        capabilities: ['read_workspace_data', 'manage_members', 'create_sessions'],
        sortOrder: 0
      }
    ]);
  });

  it('builds protected and custom badge labels without treating system roles as custom', () => {
    expect(getRoleKindLabels({ ...baseRole, protected: true, kind: 'system' })).toEqual(['protectedRole', 'systemRole']);
    expect(getRoleKindLabels({ ...baseRole, protected: false, kind: 'custom' })).toEqual(['customRole']);
  });
});
