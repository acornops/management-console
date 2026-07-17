import { describe, expect, it } from 'vitest';
import {
  createExternalIntegrationGrantDraft,
  externalIntegrationWorkspaceGrants,
  formatExternalIntegrationCapability,
  normalizeExternalIntegrationCapabilities,
  toggleExternalIntegrationCapability
} from './externalIntegrationCapabilities';
import type { ControlPlaneExternalIntegrationGrantableWorkspace } from './externalIntegrationTypes';

const workspaces: ControlPlaneExternalIntegrationGrantableWorkspace[] = [
  {
    workspaceId: 'workspace-1',
    workspaceName: 'Development',
    role: 'owner',
    grantedCapabilities: ['read_workspace_data'],
    grantableCapabilities: ['read_workspace_data', 'create_sessions', 'create_read_write_runs', 'restart_services']
  },
  {
    workspaceId: 'workspace-2',
    workspaceName: 'Production',
    role: 'operator',
    grantedCapabilities: ['read_workspace_data', 'create_sessions', 'create_read_only_runs'],
    grantableCapabilities: ['read_workspace_data', 'create_sessions', 'create_read_only_runs']
  }
];

describe('external integration capabilities', () => {
  it('labels the opt-in read-write run capability', () => {
    expect(formatExternalIntegrationCapability('create_read_write_runs')).toBe('Create read-write runs');
  });

  it('formats a new server-provided capability instead of rendering a blank label', () => {
    expect(formatExternalIntegrationCapability('restart_services')).toBe('Restart services');
    expect(normalizeExternalIntegrationCapabilities(['restart_services'])).toEqual(['restart_services']);
  });

  it('adds the dependencies required by a read-write run grant', () => {
    expect(normalizeExternalIntegrationCapabilities(['create_read_write_runs'])).toEqual([
      'read_workspace_data',
      'create_sessions',
      'create_read_write_runs'
    ]);
  });

  it('preserves independent read-only and read-write run grants in display order', () => {
    expect(normalizeExternalIntegrationCapabilities([
      'create_read_write_runs',
      'create_read_only_runs'
    ])).toEqual([
      'read_workspace_data',
      'create_sessions',
      'create_read_only_runs',
      'create_read_write_runs'
    ]);
  });

  it('keeps grant selection isolated across multiple workspaces', () => {
    const initialDraft = createExternalIntegrationGrantDraft(workspaces);
    const updatedDraft = toggleExternalIntegrationCapability(
      initialDraft,
      workspaces[0],
      'create_read_write_runs',
      true
    );

    expect(updatedDraft['workspace-1']).toEqual([
      'read_workspace_data',
      'create_sessions',
      'create_read_write_runs'
    ]);
    expect(updatedDraft['workspace-2']).toEqual([
      'read_workspace_data',
      'create_sessions',
      'create_read_only_runs'
    ]);
    expect(externalIntegrationWorkspaceGrants(updatedDraft)).toEqual([
      { workspaceId: 'workspace-1', capabilities: ['read_workspace_data', 'create_sessions', 'create_read_write_runs'] },
      { workspaceId: 'workspace-2', capabilities: ['read_workspace_data', 'create_sessions', 'create_read_only_runs'] }
    ]);
  });
});
