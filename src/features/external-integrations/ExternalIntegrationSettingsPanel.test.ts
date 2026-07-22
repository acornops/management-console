import { describe, expect, it } from 'vitest';

import {
  buildExternalIntegrationWorkspaceGrants,
  createExternalIntegrationGrantDraft,
  formatExternalIntegrationCapability,
  normalizeExternalIntegrationCapabilities,
  toggleExternalIntegrationCapability
} from './externalIntegrationGrants';
import type { ControlPlaneExternalIntegrationGrantableWorkspace } from '@/services/controlPlaneApi';

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

describe('external integration workspace grants', () => {
  it('adds required read and session capabilities for read-only runs', () => {
    expect(normalizeExternalIntegrationCapabilities(['create_read_only_runs'])).toEqual([
      'read_workspace_data',
      'create_sessions',
      'create_read_only_runs'
    ]);
  });

  it('fails closed when a prerequisite is not grantable', () => {
    expect(normalizeExternalIntegrationCapabilities(
      ['create_read_only_runs'],
      ['read_workspace_data', 'create_read_only_runs']
    )).toEqual([]);
  });

  it('adds required read and session capabilities for read-write runs', () => {
    expect(normalizeExternalIntegrationCapabilities(['create_read_write_runs'])).toEqual([
      'read_workspace_data',
      'create_sessions',
      'create_read_write_runs'
    ]);
  });

  it('keeps server-provided capabilities visible and selectable', () => {
    expect(formatExternalIntegrationCapability('restart_services')).toBe('Restart services');
    expect(normalizeExternalIntegrationCapabilities(
      ['restart_services'],
      ['restart_services']
    )).toEqual(['restart_services']);
  });

  it('keeps grant selection isolated across workspaces', () => {
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
  });

  it('omits disabled workspaces from the replacement payload', () => {
    expect(buildExternalIntegrationWorkspaceGrants({
      'workspace-1': ['read_workspace_data'],
      'workspace-2': []
    })).toEqual([
      { workspaceId: 'workspace-1', capabilities: ['read_workspace_data'] }
    ]);
  });
});
