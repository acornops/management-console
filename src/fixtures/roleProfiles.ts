import type { FixtureState } from './store';

export type FixtureRole = 'owner' | 'admin' | 'viewer';

export function applyFixtureRole(state: FixtureState, role: FixtureRole) {
  const workspace = state.workspaces[0] as Record<string, any>;
  const readable = new Set(['read_workspace_data', 'read_members', 'read_audit_log', 'read_target_logs']);
  const permissions = Object.fromEntries(Object.keys(workspace.permissions || {}).map((permission) => [
    permission,
    role === 'owner' || (role === 'admin' && permission !== 'delete_workspace') || (role === 'viewer' && readable.has(permission))
  ]));
  workspace.currentUserRole = role;
  workspace.currentUserRoleTemplate = {
    key: role,
    displayName: role[0].toUpperCase() + role.slice(1),
    description: role === 'viewer' ? 'Read-only workspace access' : 'Workspace management access',
    kind: 'system',
    capabilities: Object.entries(permissions).filter(([, enabled]) => enabled).map(([permission]) => permission),
    protected: true,
    sortOrder: role === 'owner' ? 10 : role === 'admin' ? 20 : 30
  };
  workspace.permissions = permissions;
  return permissions;
}
