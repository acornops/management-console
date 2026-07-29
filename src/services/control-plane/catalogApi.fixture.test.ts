import { describe, expect, it, vi } from 'vitest';

import { activateFrontendFixtureRuntime } from '@/config/appDataMode';
import { catalogApi } from './catalogApi';

describe('external MCP OAuth in frontend fixture mode', () => {
  it('reports OAuth as unavailable without making a network request', async () => {
    activateFrontendFixtureRuntime();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(catalogApi.prepareAgentMcpOAuth(
      'workspace-1',
      'agent-1',
      'server-1',
      '/workspaces/workspace-1/agents'
    )).rejects.toThrow('External MCP OAuth is unavailable in frontend fixture mode.');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
