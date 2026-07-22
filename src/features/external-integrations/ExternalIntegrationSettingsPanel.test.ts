import { describe, expect, it } from 'vitest';

import {
  buildExternalIntegrationWorkspaceGrants,
  normalizeExternalIntegrationCapabilities
} from './externalIntegrationGrants';

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

  it('omits disabled workspaces from the replacement payload', () => {
    expect(buildExternalIntegrationWorkspaceGrants({
      'workspace-1': ['read_workspace_data'],
      'workspace-2': []
    })).toEqual([
      { workspaceId: 'workspace-1', capabilities: ['read_workspace_data'] }
    ]);
  });
});
