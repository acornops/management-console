import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requestJson = vi.fn();
const requestArtifact = vi.fn();
const delay = vi.fn();
const getControlPlaneBaseUrl = vi.fn(() => 'https://control-plane.example.com');
const readJsonEventStream = vi.fn();
const readRunEventStream = vi.fn();
const requestEventStream = vi.fn();
const mapControlPlaneClusterToKubernetesCluster = vi.fn();
const mapClusterToolsCatalog = vi.fn((value) => ({ mapped: value }));
const mapMcpServer = vi.fn((value) => ({ mappedServer: value.id }));
const mapMcpServerTestConnectionResult = vi.fn((value) => ({ mappedConnection: value.server_id }));
const userFromControlPlane = vi.fn((user) => ({ email: user.email, name: user.displayName || user.email, groups: [] }));
const mapWorkspace = vi.fn((workspace) => ({ id: workspace.id, name: workspace.name, members: [], currentUserRole: 'viewer', description: '', clusterCount: 0, memberCount: 0, clusterIds: [] }));
const mapWorkspaceMember = vi.fn((member) => ({ email: member.email, name: member.displayName || member.email, role: member.role, source: member.source === 'oidc' ? 'OIDC' : 'Internal', userId: member.userId }));

vi.mock('./control-plane/http', () => ({
  requestJson,
  requestArtifact,
  delay,
  getControlPlaneBaseUrl,
  readJsonEventStream,
  readRunEventStream,
  requestEventStream
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

  it('builds filtered workspace issue queries', async () => {
    requestJson.mockResolvedValue({
      items: [
        {
          id: 'issue-1',
          targetId: 'cluster-1',
          targetType: 'kubernetes',
          status: 'active',
          severity: 'critical',
          title: 'Pod unhealthy'
        }
      ],
      nextCursor: 'cursor-2'
    });
    const { controlPlaneApi } = await import('./controlPlaneApi');

    await expect(
      controlPlaneApi.listWorkspaceIssues('workspace 1', {
        limit: 10,
        cursor: 'cursor-1',
        q: 'api',
        status: 'active',
        severity: 'critical',
        targetType: 'kubernetes',
        targetId: 'cluster-1',
        namespace: 'default'
      })
    ).resolves.toEqual({
      items: [
        {
          id: 'issue-1',
          targetId: 'cluster-1',
          targetType: 'kubernetes',
          status: 'active',
          severity: 'critical',
          title: 'Pod unhealthy'
        }
      ],
      nextCursor: 'cursor-2'
    });
    expect(requestJson).toHaveBeenCalledWith(
      '/api/v1/workspaces/workspace%201/issues?limit=10&cursor=cursor-1&q=api&status=active&severity=critical&targetType=kubernetes&targetId=cluster-1&namespace=default'
    );
  });

  it('builds filtered target issue queries', async () => {
    requestJson.mockResolvedValue({ items: [], nextCursor: undefined });
    const { controlPlaneApi } = await import('./controlPlaneApi');

    await expect(
      controlPlaneApi.listTargetIssues('workspace 1', 'target/1', {
        limit: 25,
        q: 'crash',
        status: 'recovering',
        severity: 'warning',
        namespace: 'default'
      })
    ).resolves.toEqual({ items: [], nextCursor: undefined });
    expect(requestJson).toHaveBeenCalledWith(
      '/api/v1/workspaces/workspace%201/targets/target%2F1/issues?limit=25&q=crash&status=recovering&severity=warning&namespace=default'
    );
  });

  it('builds target issue summary queries', async () => {
    requestJson.mockResolvedValue({
      total: 3,
      active: 2,
      recovering: 1,
      critical: 1,
      warning: 2,
      info: 0
    });
    const { controlPlaneApi } = await import('./controlPlaneApi');

    await expect(controlPlaneApi.getTargetIssueSummary('workspace 1', 'target/1')).resolves.toEqual({
      total: 3,
      active: 2,
      recovering: 1,
      critical: 1,
      warning: 2,
      info: 0
    });
    expect(requestJson).toHaveBeenCalledWith('/api/v1/workspaces/workspace%201/targets/target%2F1/issues/summary');
  });

  it('builds issue detail and observation queries', async () => {
    requestJson
      .mockResolvedValueOnce({ id: 'issue/1', title: 'Pod unhealthy' })
      .mockResolvedValueOnce({ items: [{ id: 'observation-1' }], nextCursor: 'cursor-2' });
    const { controlPlaneApi } = await import('./controlPlaneApi');

    await expect(controlPlaneApi.getWorkspaceIssue('workspace 1', 'issue/1')).resolves.toEqual({
      id: 'issue/1',
      title: 'Pod unhealthy'
    });
    await expect(
      controlPlaneApi.listIssueObservations('workspace 1', 'issue/1', { limit: 10, cursor: 'cursor-1' })
    ).resolves.toEqual({ items: [{ id: 'observation-1' }], nextCursor: 'cursor-2' });

    expect(requestJson).toHaveBeenNthCalledWith(1, '/api/v1/workspaces/workspace%201/issues/issue%2F1');
    expect(requestJson).toHaveBeenNthCalledWith(
      2,
      '/api/v1/workspaces/workspace%201/issues/issue%2F1/observations?limit=10&cursor=cursor-1'
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

  it('sends the selected agent access mode when registering a cluster', async () => {
    requestJson.mockResolvedValue({
      cluster: { id: 'cluster-1', workspaceId: 'workspace-1', name: 'payments-prod', status: 'unknown' },
      agentKey: 'agent-key',
      installInstructions: {
        command: 'helm upgrade --install acornops-agent chart --set rbac.write.enabled=true',
        warnings: []
      }
    });
    mapControlPlaneClusterToKubernetesCluster.mockReturnValue({ id: 'cluster-1', name: 'payments-prod' });
    const { controlPlaneApi } = await import('./controlPlaneApi');

    await expect(
      controlPlaneApi.registerCluster('workspace-1', {
        name: 'payments-prod',
        agentAccessMode: 'read_write',
        namespaceInclude: ['payments'],
        namespaceExclude: ['sandbox']
      })
    ).resolves.toMatchObject({
      cluster: { id: 'cluster-1' },
      installCommand: 'helm upgrade --install acornops-agent chart --set rbac.write.enabled=true'
    });

    expect(requestJson).toHaveBeenCalledWith('/api/v1/workspaces/workspace-1/kubernetes-clusters', {
      method: 'POST',
      body: JSON.stringify({
        name: 'payments-prod',
        agentAccessMode: 'read_write',
        namespaceInclude: ['payments'],
        namespaceExclude: ['sandbox']
      })
    });
  });

  it('sends the selected agent access mode when rotating a cluster agent key', async () => {
    requestJson.mockResolvedValue({
      clusterId: 'cluster-1',
      agentKey: 'agent-key',
      keyVersion: 2,
      installInstructions: {
        command: 'helm upgrade --install acornops-agent chart --set rbac.write.enabled=true',
        warnings: []
      }
    });
    const { controlPlaneApi } = await import('./controlPlaneApi');

    await expect(
      controlPlaneApi.rotateClusterAgentKey('workspace-1', 'cluster-1', { agentAccessMode: 'read_write' })
    ).resolves.toMatchObject({
      clusterId: 'cluster-1',
      keyVersion: 2,
      installCommand: 'helm upgrade --install acornops-agent chart --set rbac.write.enabled=true'
    });

    expect(requestJson).toHaveBeenCalledWith('/api/v1/workspaces/workspace-1/kubernetes-clusters/cluster-1/rotate-agent-key', {
      method: 'POST',
      body: JSON.stringify({ agentAccessMode: 'read_write' })
    });
  });

  it('requests target assistant capabilities preview for the selected run mode', async () => {
    requestJson.mockResolvedValue({
      workspaceId: 'workspace 1',
      targetId: 'target/1',
      targetType: 'virtual_machine',
      toolAccessMode: 'read_write',
      confirmationRequiredForWrite: true,
      writeUnavailableReason: null,
      toolSummary: {
        totalAllowed: 1,
        nativeAllowed: 0,
        readAllowed: 0,
        writeAllowed: 1
      },
      skillSummary: { totalAvailable: 0 },
      tools: [],
      skills: []
    });
    const { controlPlaneApi } = await import('./controlPlaneApi');

    await controlPlaneApi.getTargetAssistantCapabilitiesPreview('workspace 1', 'target/1', 'read_write');

    expect(requestJson).toHaveBeenCalledWith(
      '/api/v1/workspaces/workspace%201/targets/target%2F1/assistant/capabilities-preview?toolAccessMode=read_write'
    );
  });

  it('builds batch metrics history queries and normalizes nullable points by cluster', async () => {
    requestJson.mockResolvedValue({
      items: [
        {
          clusterId: 'cluster/1',
          points: [
            { timestamp: '2026-05-25T00:00:00.000Z', cpuCores: 1.5, memoryBytes: 1024 },
            { timestamp: '2026-05-25T00:01:00.000Z', cpuCores: 'n/a', memoryBytes: undefined },
            { timestamp: '2026-05-25T00:02:00.000Z', cpuCores: -1, memoryBytes: Number.POSITIVE_INFINITY }
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
        { timestamp: '2026-05-25T00:01:00.000Z', cpuCores: null, memoryBytes: null },
        { timestamp: '2026-05-25T00:02:00.000Z', cpuCores: null, memoryBytes: null }
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

  it('builds VM metrics history queries', async () => {
    requestJson.mockResolvedValue({ workspaceId: 'workspace 1', targetId: 'vm/1', windowMs: 1, points: [] });
    const { controlPlaneApi } = await import('./controlPlaneApi');

    await expect(controlPlaneApi.getVirtualMachineMetricsHistory('workspace 1', 'vm/1')).resolves.toMatchObject({ targetId: 'vm/1' });
    expect(requestJson).toHaveBeenCalledWith(
      '/api/v1/workspaces/workspace%201/virtual-machines/vm%2F1/metrics/history?window=6h&limit=48'
    );
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
        name: 'production-east'
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
      controlPlaneApi.updateClusterName('workspace-1', 'cluster-1', 'production-east')
    ).resolves.toEqual({ name: 'production-east' });
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
    requestEventStream
      .mockRejectedValueOnce(new Error('UNAUTHORIZED'))
      .mockRejectedValueOnce(new Error('Control plane request failed (500): boom'))
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);
    const { controlPlaneApi } = await import('./controlPlaneApi');

    await expect(controlPlaneApi.streamRunEvents('run-1')).rejects.toThrow('UNAUTHORIZED');
    await expect(controlPlaneApi.streamRunEvents('run-1')).rejects.toThrow('Control plane request failed (500): boom');
    const onEvent = vi.fn();
    await expect(controlPlaneApi.streamRunEvents('run 1', { onEvent })).resolves.toBeUndefined();
    const signal = new AbortController().signal;
    await expect(controlPlaneApi.streamRunEvents('run-1', { signal })).resolves.toBeUndefined();
    expect(requestEventStream).toHaveBeenNthCalledWith(
      3,
      '/api/v1/runs/run%201/stream',
      { onEvent }
    );
    expect(requestEventStream).toHaveBeenNthCalledWith(4, '/api/v1/runs/run-1/stream', { signal });
  });

  it('streams target chat activity events with replay cursors and treats aborts as non-failures', async () => {
    const onEvent = vi.fn();
    requestEventStream
      .mockRejectedValueOnce(new Error('UNAUTHORIZED'))
      .mockRejectedValueOnce(new Error('Control plane request failed (500): boom'))
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);
    const { controlPlaneApi } = await import('./controlPlaneApi');

    await expect(controlPlaneApi.streamTargetChatActivity('workspace-1', 'target-1')).rejects.toThrow('UNAUTHORIZED');
    await expect(controlPlaneApi.streamTargetChatActivity('workspace-1', 'target-1')).rejects.toThrow(
      'Control plane request failed (500): boom'
    );
    await expect(
      controlPlaneApi.streamTargetChatActivity('workspace 1', 'target 1', { after: '42', onEvent })
    ).resolves.toBeUndefined();
    await expect(
      controlPlaneApi.streamTargetChatActivity('workspace-1', 'target-1', { signal: new AbortController().signal })
    ).resolves.toBeUndefined();
    expect(requestEventStream).toHaveBeenNthCalledWith(
      3,
      '/api/v1/workspaces/workspace%201/targets/target%201/chat-activity/stream?after=42',
      { after: '42', onEvent }
    );
  });
});
