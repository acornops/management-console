import { describe, expect, it } from 'vitest';

import { canManageWorkspaceMembers, canReadWorkspaceAuditLog, canReadWorkspaceData } from '@/app/workspacePermissions';
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

describe('workspace permissions', () => {
  it('trusts server permissions when present', () => {
    const auditorWithServerPermissions = workspace({
      currentUserRole: 'auditor',
      permissions: {
        read_workspace_data: true,
        read_members: true,
        read_audit_log: false,
        delete_workspace: false,
        manage_members: false,
        manage_targets: false,
        manage_mcp: false,
        manage_tools: false,
        manage_ai_settings: false,
        manage_agent_keys: false,
        manage_webhooks: false,
        create_sessions: false,
        create_read_only_runs: false,
        create_read_write_runs: false,
        read_target_logs: false,
        cancel_runs: false,
        delete_sessions: false
      }
    });

    expect(canReadWorkspaceData(auditorWithServerPermissions)).toBe(true);
    expect(canReadWorkspaceAuditLog(auditorWithServerPermissions)).toBe(false);
  });

  it('fails closed when server permission metadata is missing', () => {
    const ownerWorkspace = workspace({ currentUserRole: 'owner' });

    expect(canReadWorkspaceData(ownerWorkspace)).toBe(false);
    expect(canReadWorkspaceAuditLog(ownerWorkspace)).toBe(false);
    expect(canManageWorkspaceMembers(ownerWorkspace)).toBe(false);
  });

  it('uses role template capabilities when server permissions are absent', () => {
    const customWorkspace = workspace({
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
    });

    expect(canReadWorkspaceData(customWorkspace)).toBe(false);
    expect(canReadWorkspaceAuditLog(customWorkspace)).toBe(false);
    expect(canManageWorkspaceMembers(customWorkspace)).toBe(true);
  });
});
