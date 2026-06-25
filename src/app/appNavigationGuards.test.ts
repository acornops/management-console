import { describe, expect, it } from 'vitest';

import { isWorkspaceDataRoute, workspaceLandingPath } from '@/app/appNavigationGuards';
import type { Workspace } from '@/types';

function makeWorkspace(permissions: Workspace['permissions']): Workspace {
  return {
    id: 'workspace-1',
    name: 'Workspace one',
    description: '',
    members: [],
    permissions,
    clusterIds: []
  };
}

describe('app navigation guards', () => {
  it('treats AI settings as a workspace data route', () => {
    expect(isWorkspaceDataRoute({ kind: 'workspaceAiSettings', workspaceId: 'workspace-1' })).toBe(true);
  });

  it('does not land users without workspace data access on AI settings', () => {
    expect(workspaceLandingPath(makeWorkspace({
      read_workspace_data: false,
      read_members: true,
      read_audit_log: false,
      delete_workspace: false,
      manage_members: false,
      manage_targets: false,
      manage_mcp: false,
      manage_tools: false,
      manage_skills: false,
      manage_ai_settings: false,
      manage_agent_keys: false,
      manage_webhooks: false,
      create_sessions: false,
      create_read_only_runs: false,
      create_read_write_runs: false,
      read_target_logs: false,
      cancel_runs: false,
      delete_sessions: false
    }))).toBe('/workspaces/workspace-1/members');
  });
});
