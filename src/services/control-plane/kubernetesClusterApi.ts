import {
  ClusterMetricHistoryPoint,
  ClusterToolCatalog,
  KubernetesCluster
} from '@/types';
import { mapControlPlaneClusterToKubernetesCluster } from './clusterMappers';
import { formatNamespaceScope, normalizeNamespaceList, toArray } from './formatters';
import { requestJson } from './http';
import { pageQuery } from './query';
import { mapClusterToolsCatalog, mapMcpServer, mapMcpServerTestConnectionResult } from './toolMappers';
import { updateTargetToolRequest } from './toolRequests';
import type {
  ControlPlaneCluster,
  ControlPlaneClusterDetail,
  ControlPlaneClusterMetricsHistoryResponse,
  ControlPlaneClusterToolCatalog,
  ControlPlaneClusterToolCatalogItem,
  ControlPlaneFindingPageItem,
  ControlPlaneMcpServer,
  ControlPlaneMcpServerTestConnectionResponse,
  ControlPlanePodLogs,
  ControlPlanePodLogsOptions,
  ControlPlaneResourcePageItem,
  ControlPlaneSession,
  ControlPlaneSessionListPage,
  ControlPlaneWorkspaceClusterMetricsHistoryResponse,
  CreateTargetMcpServerInput,
  PagedResult,
  RegisterClusterResponse,
  RotateAgentKeyResponse,
  TargetMcpServer,
  TargetMcpServerTestConnectionResult,
  UpdateTargetMcpServerInput
} from './types';

async function listWorkspaceKubernetesClusters(
  workspaceId: string,
  options?: { limit?: number; cursor?: string; q?: string; status?: string }
): Promise<PagedResult<KubernetesCluster>> {
  const page = await requestJson<PagedResult<ControlPlaneCluster>>(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/kubernetes-clusters${pageQuery({
      limit: options?.limit,
      cursor: options?.cursor,
      q: options?.q,
      filters: { status: options?.status }
    })}`
  );

  return {
    items: page.items.map((cluster) => mapControlPlaneClusterToKubernetesCluster(cluster)),
    nextCursor: page.nextCursor
  };
}

function mapMetricHistoryPoint(point: ClusterMetricHistoryPoint): ClusterMetricHistoryPoint {
  return {
    timestamp: point.timestamp,
    cpuCores: typeof point.cpuCores === 'number' ? point.cpuCores : null,
    memoryBytes: typeof point.memoryBytes === 'number' ? point.memoryBytes : null
  };
}

export const kubernetesClusterApi = {
  async getClustersForWorkspace(workspaceId: string): Promise<KubernetesCluster[]> {
    const page = await listWorkspaceKubernetesClusters(workspaceId, { limit: 50 });
    return page.items;
  },

  async listClustersForWorkspace(
    workspaceId: string,
    options?: { limit?: number; cursor?: string; q?: string; status?: string }
  ): Promise<PagedResult<KubernetesCluster>> {
    return listWorkspaceKubernetesClusters(workspaceId, options);
  },

  async getCluster(workspaceId: string, clusterId: string): Promise<KubernetesCluster> {
    const cluster = await requestJson<ControlPlaneClusterDetail>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/kubernetes-clusters/${encodeURIComponent(clusterId)}`
    );
    return mapControlPlaneClusterToKubernetesCluster(cluster);
  },

  async listClusterResources(
    workspaceId: string,
    clusterId: string,
    options?: { limit?: number; cursor?: string; q?: string; family?: string; kind?: string; namespace?: string; health?: string }
  ): Promise<PagedResult<ControlPlaneResourcePageItem>> {
    return requestJson<PagedResult<ControlPlaneResourcePageItem>>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/kubernetes-clusters/${encodeURIComponent(clusterId)}/resources${pageQuery({
        limit: options?.limit,
        cursor: options?.cursor,
        q: options?.q,
        filters: {
          family: options?.family,
          kind: options?.kind,
          namespace: options?.namespace,
          health: options?.health
        }
      })}`
    );
  },

  async listClusterFindings(
    workspaceId: string,
    clusterId: string,
    options?: { limit?: number; cursor?: string; q?: string; severity?: string; namespace?: string }
  ): Promise<PagedResult<ControlPlaneFindingPageItem>> {
    return requestJson<PagedResult<ControlPlaneFindingPageItem>>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/kubernetes-clusters/${encodeURIComponent(clusterId)}/findings${pageQuery({
        limit: options?.limit,
        cursor: options?.cursor,
        q: options?.q,
        filters: {
          severity: options?.severity,
          namespace: options?.namespace
        }
      })}`
    );
  },

  async getClusterMetricsHistory(
    workspaceId: string,
    clusterId: string,
    options?: { window?: string; limit?: number }
  ): Promise<ClusterMetricHistoryPoint[]> {
    const url = new URL(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/kubernetes-clusters/${encodeURIComponent(clusterId)}/metrics/history`,
      'http://control-plane.local'
    );
    if (options?.window) url.searchParams.set('window', options.window);
    if (typeof options?.limit === 'number') url.searchParams.set('limit', String(options.limit));
    const result = await requestJson<ControlPlaneClusterMetricsHistoryResponse>(`${url.pathname}${url.search}`);
    return toArray(result.points).map(mapMetricHistoryPoint);
  },

  async getWorkspaceClusterMetricsHistory(
    workspaceId: string,
    clusterIds: string[],
    options?: { window?: string; limit?: number }
  ): Promise<Record<string, ClusterMetricHistoryPoint[]>> {
    const requestedClusterIds = Array.from(new Set(clusterIds.filter(Boolean)));
    if (requestedClusterIds.length === 0) {
      return {};
    }

    const url = new URL(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/kubernetes-clusters/metrics/history`,
      'http://control-plane.local'
    );
    url.searchParams.set('clusterIds', requestedClusterIds.join(','));
    if (options?.window) url.searchParams.set('window', options.window);
    if (typeof options?.limit === 'number') url.searchParams.set('limit', String(options.limit));
    const result = await requestJson<ControlPlaneWorkspaceClusterMetricsHistoryResponse>(`${url.pathname}${url.search}`);
    return Object.fromEntries(
      toArray(result.items).map((item) => [
        item.clusterId,
        toArray(item.points).map(mapMetricHistoryPoint)
      ])
    );
  },

  async getPodLogs(
    workspaceId: string,
    clusterId: string,
    namespace: string,
    podName: string,
    options: ControlPlanePodLogsOptions = {}
  ): Promise<ControlPlanePodLogs> {
    const url = new URL(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/kubernetes-clusters/${encodeURIComponent(clusterId)}/pods/${encodeURIComponent(namespace)}/${encodeURIComponent(podName)}/logs`,
      'http://control-plane.local'
    );
    if (options.container) url.searchParams.set('container', options.container);
    if (options.previous) url.searchParams.set('previous', 'true');
    if (typeof options.tailLines === 'number') url.searchParams.set('tailLines', String(options.tailLines));
    if (typeof options.sinceSeconds === 'number') url.searchParams.set('sinceSeconds', String(options.sinceSeconds));
    if (typeof options.limitBytes === 'number') url.searchParams.set('limitBytes', String(options.limitBytes));
    return requestJson<ControlPlanePodLogs>(`${url.pathname}${url.search}`);
  },

  async registerCluster(
    workspaceId: string,
    input: { name: string; namespaceInclude?: string[]; namespaceExclude?: string[] }
  ): Promise<{ cluster: KubernetesCluster; agentKey: string; installCommand: string; installWarnings: string[] }> {
    const result = await requestJson<RegisterClusterResponse>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/kubernetes-clusters`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          namespaceInclude: input.namespaceInclude || [],
          namespaceExclude: input.namespaceExclude || []
        })
      }
    );
    return {
      cluster: mapControlPlaneClusterToKubernetesCluster(result.cluster),
      agentKey: result.agentKey,
      installCommand: result.installInstructions?.command || '',
      installWarnings: toArray(result.installInstructions?.warnings)
    };
  },

  async deleteCluster(workspaceId: string, clusterId: string): Promise<void> {
    await requestJson<void>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/kubernetes-clusters/${encodeURIComponent(clusterId)}`,
      { method: 'DELETE' }
    );
  },

  async updateClusterNamespaceScope(
    workspaceId: string,
    clusterId: string,
    input: { namespaceInclude?: string[]; namespaceExclude?: string[] }
  ): Promise<Pick<KubernetesCluster, 'namespace' | 'namespaceScope'>> {
    const cluster = await requestJson<ControlPlaneCluster>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/kubernetes-clusters/${encodeURIComponent(clusterId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          namespaceInclude: input.namespaceInclude || [],
          namespaceExclude: input.namespaceExclude || []
        })
      }
    );
    const include = normalizeNamespaceList(cluster.namespaceInclude);
    const exclude = normalizeNamespaceList(cluster.namespaceExclude);
    return {
      namespace: formatNamespaceScope(include, exclude),
      namespaceScope: { include, exclude }
    };
  },

  async updateClusterName(
    workspaceId: string,
    clusterId: string,
    name: string
  ): Promise<Pick<KubernetesCluster, 'name'>> {
    const cluster = await requestJson<ControlPlaneCluster>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/kubernetes-clusters/${encodeURIComponent(clusterId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ name })
      }
    );
    return { name: cluster.name };
  },

  async updateClusterWriteConfirmationPolicy(
    workspaceId: string,
    clusterId: string,
    overrideRequired: boolean | null
  ): Promise<KubernetesCluster['writeConfirmationPolicy']> {
    const cluster = await requestJson<ControlPlaneCluster>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/kubernetes-clusters/${encodeURIComponent(clusterId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ writeConfirmationRequiredOverride: overrideRequired })
      }
    );
    return cluster.writeConfirmationPolicy;
  },

  async rotateClusterAgentKey(
    workspaceId: string,
    clusterId: string
  ): Promise<{ clusterId: string; agentKey: string; keyVersion: number; installCommand: string; installWarnings: string[] }> {
    const result = await requestJson<RotateAgentKeyResponse>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/kubernetes-clusters/${encodeURIComponent(clusterId)}/rotate-agent-key`,
      { method: 'POST' }
    );
    return {
      clusterId: result.clusterId,
      agentKey: result.agentKey,
      keyVersion: result.keyVersion,
      installCommand: result.installInstructions?.command || '',
      installWarnings: toArray(result.installInstructions?.warnings)
    };
  },

  async createSession(workspaceId: string, clusterId: string, title: string): Promise<ControlPlaneSession> {
    return requestJson<ControlPlaneSession>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/kubernetes-clusters/${encodeURIComponent(clusterId)}/sessions`,
      { method: 'POST', body: JSON.stringify({ title }) }
    );
  },

  async listSessions(workspaceId: string, clusterId: string, options?: { limit?: number; cursor?: string; q?: string; status?: string }): Promise<ControlPlaneSessionListPage> {
    const url = new URL(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/kubernetes-clusters/${encodeURIComponent(clusterId)}/sessions`,
      'http://control-plane.local'
    );
    if (typeof options?.limit === 'number') url.searchParams.set('limit', String(options.limit));
    if (options?.cursor) url.searchParams.set('cursor', options.cursor);
    if (options?.q) url.searchParams.set('q', options.q);
    if (options?.status) url.searchParams.set('status', options.status);
    return requestJson<ControlPlaneSessionListPage>(`${url.pathname}${url.search}`);
  },

  updateTargetTool: updateTargetToolRequest,

  async getTargetToolsCatalog(workspaceId: string, targetId: string): Promise<ClusterToolCatalog> {
    const catalog = await requestJson<ControlPlaneClusterToolCatalog>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/tools/catalog?limit=50`
    );
    return mapClusterToolsCatalog(catalog);
  },

  async listMcpServerTools(
    workspaceId: string,
    targetId: string,
    serverId: string,
    options?: { limit?: number; cursor?: string; q?: string; capability?: 'read' | 'write'; enabled?: boolean }
  ): Promise<PagedResult<ControlPlaneClusterToolCatalogItem>> {
    return requestJson<PagedResult<ControlPlaneClusterToolCatalogItem>>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/mcp/servers/${encodeURIComponent(serverId)}/tools${pageQuery({
        limit: options?.limit,
        cursor: options?.cursor,
        q: options?.q,
        filters: {
          capability: options?.capability,
          enabled: typeof options?.enabled === 'boolean' ? String(options.enabled) : undefined
        }
      })}`
    );
  },

  async listTargetMcpServers(workspaceId: string, targetId: string): Promise<TargetMcpServer[]> {
    const servers = await requestJson<ControlPlaneMcpServer[]>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/mcp/servers`
    );
    return toArray(servers).map(mapMcpServer);
  },

  async createTargetMcpServer(workspaceId: string, targetId: string, input: CreateTargetMcpServerInput): Promise<TargetMcpServer> {
    const created = await requestJson<ControlPlaneMcpServer>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/mcp/servers`,
      { method: 'POST', body: JSON.stringify(input) }
    );
    return mapMcpServer(created);
  },

  async updateTargetMcpServer(
    workspaceId: string,
    targetId: string,
    serverId: string,
    patch: UpdateTargetMcpServerInput
  ): Promise<TargetMcpServer> {
    const updated = await requestJson<ControlPlaneMcpServer>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/mcp/servers/${encodeURIComponent(serverId)}`,
      { method: 'PATCH', body: JSON.stringify(patch) }
    );
    return mapMcpServer(updated);
  },

  async deleteTargetMcpServer(workspaceId: string, targetId: string, serverId: string): Promise<void> {
    await requestJson<void>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/mcp/servers/${encodeURIComponent(serverId)}`,
      { method: 'DELETE' }
    );
  },

  async testTargetMcpServerConnection(workspaceId: string, targetId: string, serverId: string): Promise<TargetMcpServerTestConnectionResult> {
    const result = await requestJson<ControlPlaneMcpServerTestConnectionResponse>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/mcp/servers/${encodeURIComponent(serverId)}/test-connection`,
      { method: 'POST' }
    );
    return mapMcpServerTestConnectionResult(result);
  }
};
