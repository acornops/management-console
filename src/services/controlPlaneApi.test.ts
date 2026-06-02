import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requestJson = vi.fn();
const delay = vi.fn();
const getControlPlaneBaseUrl = vi.fn(() => 'https://control-plane.example.com');
const readRunEventStream = vi.fn();
const mapControlPlaneClusterToKubernetesCluster = vi.fn();
const mapClusterToolsCatalog = vi.fn((value) => ({ mapped: value }));
const mapMcpServer = vi.fn((value) => ({ mappedServer: value.id }));
const mapMcpServerTestConnectionResult = vi.fn((value) => ({ mappedConnection: value.server_id }));
const userFromControlPlane = vi.fn((user) => ({ email: user.email, name: user.displayName || user.email, groups: [] }));
const mapWorkspace = vi.fn((workspace) => ({ id: workspace.id, name: workspace.name, members: [], currentUserRole: 'viewer', description: '', clusterCount: 0, memberCount: 0, clusterIds: [] }));
const mapWorkspaceMember = vi.fn((member) => ({ email: member.email, name: member.displayName || member.email, role: member.role, source: member.source === 'oidc' ? 'OIDC' : 'Internal', userId: member.userId }));

vi.mock('./control-plane/http', () => ({
  requestJson,
  delay,
  getControlPlaneBaseUrl,
  readRunEventStream
}));

vi.mock('./control-plane/clusterMappers', () => ({
  mapControlPlaneClusterToKubernetesCluster
}));

vi.mock('./control-plane/toolMappers', () => ({
  mapClusterToolsCatalog,
  mapClusterToolsFromCatalog: vi.fn((catalog) => catalog),
  mapMcpServer,
  mapMcpServerTestConnectionResult
}));

vi.mock('./control-plane/userMappers', () => ({
  userFromControlPlane
}));

vi.mock('./control-plane/workspaceMappers', () => ({
  mapWorkspace,
  mapWorkspaceMember
}));

describe('controlPlaneApi', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getControlPlaneBaseUrl.mockReturnValue('https://control-plane.example.com');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds filtered member queries and maps results', async () => {
    requestJson.mockResolvedValue({
      items: [
        {
          workspaceId: 'workspace-1',
          userId: 'user-1',
          email: 'ops@example.com',
          displayName: 'Ops',
          role: 'owner',
          source: 'oidc'
        }
      ],
      nextCursor: 'cursor-2'
    });
    const { controlPlaneApi } = await import('./controlPlaneApi');

    await expect(
      controlPlaneApi.listWorkspaceMembers('workspace 1', {
        limit: 10,
        cursor: 'cursor-1',
        q: 'ops',
        role: 'owner',
        source: 'OIDC'
      })
    ).resolves.toEqual({
      items: [
        {
          email: 'ops@example.com',
          name: 'Ops',
          role: 'owner',
          source: 'OIDC',
          userId: 'user-1'
        }
      ],
      nextCursor: 'cursor-2'
    });
    expect(requestJson).toHaveBeenCalledWith(
      '/api/v1/workspaces/workspace%201/members?limit=10&cursor=cursor-1&q=ops&role=owner&source=oidc'
    );
  });

  it('lists workspace cluster summaries without metric-history fan-out', async () => {
    requestJson.mockResolvedValue({
      items: [{ id: 'cluster-1' }, { id: 'cluster-2' }],
      nextCursor: 'cursor-2'
    });
    mapControlPlaneClusterToKubernetesCluster
      .mockReturnValueOnce({ id: 'cluster-1', agentConnectionState: 'connected' })
      .mockReturnValueOnce({ id: 'cluster-2', agentConnectionState: 'disconnected' });
    const { controlPlaneApi } = await import('./controlPlaneApi');
    const historySpy = vi.spyOn(controlPlaneApi, 'getClusterMetricsHistory');

    await expect(
      controlPlaneApi.listClustersForWorkspace('workspace-1', { limit: 5, q: 'demo', status: 'online' })
    ).resolves.toEqual({
      items: [
        {
          id: 'cluster-1',
          agentConnectionState: 'connected'
        },
        {
          id: 'cluster-2',
          agentConnectionState: 'disconnected'
        }
      ],
      nextCursor: 'cursor-2'
    });
    expect(requestJson).toHaveBeenCalledWith('/api/v1/workspaces/workspace-1/kubernetes-clusters?limit=5&q=demo&status=online');
    expect(historySpy).not.toHaveBeenCalled();
  });

  it('builds batch metrics history queries and normalizes nullable points by cluster', async () => {
    requestJson.mockResolvedValue({
      items: [
        {
          clusterId: 'cluster/1',
          points: [
            { timestamp: '2026-05-25T00:00:00.000Z', cpuCores: 1.5, memoryBytes: 1024 },
            { timestamp: '2026-05-25T00:01:00.000Z', cpuCores: 'n/a', memoryBytes: undefined }
          ]
        },
        {
          clusterId: 'cluster-2',
          points: []
        }
      ]
    });
    const { controlPlaneApi } = await import('./controlPlaneApi');

    await expect(
      controlPlaneApi.getWorkspaceClusterMetricsHistory('workspace 1', ['cluster/1', 'cluster-2', 'cluster/1'], {
        window: '6h',
        limit: 24
      })
    ).resolves.toEqual({
      'cluster/1': [
        { timestamp: '2026-05-25T00:00:00.000Z', cpuCores: 1.5, memoryBytes: 1024 },
        { timestamp: '2026-05-25T00:01:00.000Z', cpuCores: null, memoryBytes: null }
      ],
      'cluster-2': []
    });
    expect(requestJson).toHaveBeenCalledWith(
      '/api/v1/workspaces/workspace%201/kubernetes-clusters/metrics/history?clusterIds=cluster%2F1%2Ccluster-2&window=6h&limit=24'
    );
  });

  it('does not call the control plane for empty batch metrics history requests', async () => {
    const { controlPlaneApi } = await import('./controlPlaneApi');

    await expect(controlPlaneApi.getWorkspaceClusterMetricsHistory('workspace-1', [])).resolves.toEqual({});
    expect(requestJson).not.toHaveBeenCalled();
  });

  it('builds metrics and pod log queries and normalizes nullable history points', async () => {
    requestJson
      .mockResolvedValueOnce({
        points: [
          { timestamp: '2026-05-25T00:00:00.000Z', cpuCores: 1.5, memoryBytes: 1024 },
          { timestamp: '2026-05-25T00:01:00.000Z', cpuCores: 'n/a', memoryBytes: undefined }
        ]
      })
      .mockResolvedValueOnce({ lines: ['log line'] });
    const { controlPlaneApi } = await import('./controlPlaneApi');

    await expect(
      controlPlaneApi.getClusterMetricsHistory('workspace 1', 'cluster/1', { window: '6h', limit: 24 })
    ).resolves.toEqual([
      { timestamp: '2026-05-25T00:00:00.000Z', cpuCores: 1.5, memoryBytes: 1024 },
      { timestamp: '2026-05-25T00:01:00.000Z', cpuCores: null, memoryBytes: null }
    ]);
    await expect(
      controlPlaneApi.getPodLogs('workspace 1', 'cluster/1', 'default', 'api pod', {
        container: 'app',
        previous: true,
        tailLines: 100,
        sinceSeconds: 60,
        limitBytes: 2048
      })
    ).resolves.toEqual({ lines: ['log line'] });
    expect(requestJson).toHaveBeenNthCalledWith(
      1,
      '/api/v1/workspaces/workspace%201/kubernetes-clusters/cluster%2F1/metrics/history?window=6h&limit=24'
    );
    expect(requestJson).toHaveBeenNthCalledWith(
      2,
      '/api/v1/workspaces/workspace%201/kubernetes-clusters/cluster%2F1/pods/default/api%20pod/logs?container=app&previous=true&tailLines=100&sinceSeconds=60&limitBytes=2048'
    );
  });

  it('maps namespace scope updates and write confirmation responses', async () => {
    requestJson
      .mockResolvedValueOnce({
        namespaceInclude: [' payments ', '', 'search'],
        namespaceExclude: [' kube-system ']
      })
      .mockResolvedValueOnce({
        writeConfirmationPolicy: {
          effectiveRequired: true,
          overrideRequired: false,
          source: 'cluster_override'
        }
      });
    const { controlPlaneApi } = await import('./controlPlaneApi');

    await expect(
      controlPlaneApi.updateClusterNamespaceScope('workspace-1', 'cluster-1', {
        namespaceInclude: ['payments'],
        namespaceExclude: ['kube-system']
      })
    ).resolves.toEqual({
      namespace: 'payments, search',
      namespaceScope: {
        include: ['payments', 'search'],
        exclude: ['kube-system']
      }
    });
    await expect(
      controlPlaneApi.updateClusterWriteConfirmationPolicy('workspace-1', 'cluster-1', false)
    ).resolves.toEqual({
      effectiveRequired: true,
      overrideRequired: false,
      source: 'cluster_override'
    });
  });

  it('polls runs until they reach a terminal state', async () => {
    const { controlPlaneApi } = await import('./controlPlaneApi');
    const getRunSpy = vi
      .spyOn(controlPlaneApi, 'getRun')
      .mockResolvedValueOnce({ status: 'running' } as never)
      .mockResolvedValueOnce({ status: 'completed', id: 'run-1' } as never);

    await expect(controlPlaneApi.waitForRunTerminalState('run-1', { timeoutMs: 1000, pollIntervalMs: 10 })).resolves.toEqual({
      status: 'completed',
      id: 'run-1'
    });
    expect(getRunSpy).toHaveBeenCalledTimes(2);
    expect(delay).toHaveBeenCalledWith(10);
  });

  it('throws when a run does not reach a terminal state before timeout', async () => {
    const { controlPlaneApi } = await import('./controlPlaneApi');
    vi.spyOn(controlPlaneApi, 'getRun').mockResolvedValue({ status: 'running' } as never);
    const dateNowSpy = vi
      .spyOn(Date, 'now')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(5)
      .mockReturnValueOnce(11);

    await expect(
      controlPlaneApi.waitForRunTerminalState('run-2', { timeoutMs: 10, pollIntervalMs: 1 })
    ).rejects.toThrow('Run run-2 did not complete within 10ms');
    dateNowSpy.mockRestore();
  });

  it('streams run events and treats aborts as non-failures', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response('boom', {
          status: 500
        })
      )
      .mockResolvedValueOnce(new Response('data: {"status":"completed"}\n\n', { status: 200 }))
      .mockRejectedValueOnce(new DOMException('aborted', 'AbortError'));
    vi.stubGlobal('fetch', fetchMock);
    readRunEventStream.mockResolvedValue(undefined);
    const { controlPlaneApi } = await import('./controlPlaneApi');

    await expect(controlPlaneApi.streamRunEvents('run-1')).rejects.toThrow('UNAUTHORIZED');
    await expect(controlPlaneApi.streamRunEvents('run-1')).rejects.toThrow('Run stream request failed (500): boom');
    await expect(controlPlaneApi.streamRunEvents('run 1', { onEvent: vi.fn() })).resolves.toBeUndefined();
    await expect(controlPlaneApi.streamRunEvents('run-1', { signal: new AbortController().signal })).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://control-plane.example.com/api/v1/runs/run%201/stream',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
        headers: { accept: 'text/event-stream' }
      })
    );
    expect(readRunEventStream).toHaveBeenCalledTimes(1);
  });
});
