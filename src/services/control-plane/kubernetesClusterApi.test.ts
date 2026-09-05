import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestJson, mapClusterToolsCatalog } = vi.hoisted(() => ({
  requestJson: vi.fn(),
  mapClusterToolsCatalog: vi.fn((value: unknown) => value)
}));

vi.mock('./http', () => ({
  getControlPlaneBaseUrl: vi.fn(() => ''),
  requestJson
}));

vi.mock('./toolMappers', () => ({
  mapClusterToolsCatalog,
  mapMcpServer: vi.fn((value) => value),
  mapMcpServerTestConnectionResult: vi.fn((value) => value)
}));

import { kubernetesClusterApi } from './kubernetesClusterApi';

describe('target MCP server catalog pagination', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads every server page before mapping the catalog', async () => {
    requestJson
      .mockResolvedValueOnce({
        workspaceId: 'workspace-1', targetId: 'target-1',
        permissions: { canEdit: true, editableRoles: [] },
        servers: [{ id: 'server-1' }], nextCursor: 'cursor-2'
      })
      .mockResolvedValueOnce({
        workspaceId: 'workspace-1', targetId: 'target-1',
        permissions: { canEdit: true, editableRoles: [] },
        servers: [{ id: 'server-2' }]
      });

    await kubernetesClusterApi.getTargetMcpCatalog('workspace-1', 'target-1');

    expect(requestJson).toHaveBeenNthCalledWith(
      1,
      '/api/v1/workspaces/workspace-1/targets/target-1/mcp/catalog?limit=100'
    );
    expect(requestJson).toHaveBeenNthCalledWith(
      2,
      '/api/v1/workspaces/workspace-1/targets/target-1/mcp/catalog?limit=100&cursor=cursor-2'
    );
    expect(mapClusterToolsCatalog).toHaveBeenCalledWith(expect.objectContaining({
      servers: [{ id: 'server-1' }, { id: 'server-2' }],
      nextCursor: undefined
    }));
  });

  it('sends the capability required to approve a discovered target tool', async () => {
    requestJson.mockResolvedValueOnce({ name: 'records.list' });

    await kubernetesClusterApi.updateTargetMcpServerTool(
      'workspace-1', 'target-1', 'server-1', 'records.list',
      { enabled: true, capability: 'read' }
    );

    expect(requestJson).toHaveBeenCalledWith(
      '/api/v1/workspaces/workspace-1/targets/target-1/mcp/servers/server-1/tools/records.list',
      { method: 'PATCH', body: JSON.stringify({ enabled: true, capability: 'read' }) }
    );
  });
});
