import {
  ClusterMetricHistoryPoint,
  ClusterToolCatalog,
  KubernetesCluster
} from '@/types';
import { mapControlPlaneClusterToKubernetesCluster } from './clusterMappers';
import { formatNamespaceScope, normalizeNamespaceList, toArray } from './formatters';
import { getControlPlaneBaseUrl, requestJson } from './http';
import { pageQuery } from './query';
import { mapClusterToolsCatalog, mapMcpServer, mapMcpServerTestConnectionResult } from './toolMappers';
import type {
  ControlPlaneCluster,
  ControlPlaneClusterDetail,
  ControlPlaneClusterMetricsHistoryResponse,
  ControlPlaneClusterToolCatalog,
  ControlPlaneClusterToolCatalogItem,
  ControlPlaneTargetAssistantCapabilitiesPreview,
  ControlPlaneTargetInsightsCatalog,
  ControlPlaneTargetInsightsEntry,
  ControlPlaneWorkspaceAuditEvent,
  ControlPlaneTargetSkillDetail,
  ControlPlaneTargetSkillsCatalog,
  ControlPlaneTargetToolsCatalog,
  ControlPlaneMcpServer,
  ControlPlaneMcpServerTestConnectionResponse,
  ControlPlanePodLogs,
  ControlPlanePodLogsOptions,
  CreateTargetSkillInput,
  ControlPlaneResourcePageItem,
  ControlPlaneSession,
  ControlPlaneSessionListPage,
  ControlPlaneWorkspaceClusterMetricsHistoryResponse,
  CreateTargetMcpServerInput,
  TargetInsightsEntryInput,
  ImportTargetSkillInput,
  ReimportTargetSkillInput,
  PagedResult,
  RegisterClusterResponse,
  RotateAgentKeyResponse,
  AgentAccessMode,
  TargetMcpServer,
  UpdateTargetSkillInput,
  TargetMcpServerTestConnectionResult,
  UpdateTargetMcpServerInput,
  UpdateTargetToolInput
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
    input: { name: string; namespaceInclude?: string[]; namespaceExclude?: string[]; agentAccessMode?: AgentAccessMode }
  ): Promise<{ cluster: KubernetesCluster; agentKey: string; installCommand: string; installWarnings: string[] }> {
    const result = await requestJson<RegisterClusterResponse>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/kubernetes-clusters`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          agentAccessMode: input.agentAccessMode || 'read_only',
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
    clusterId: string,
    options: { agentAccessMode?: AgentAccessMode } = {}
  ): Promise<{ clusterId: string; agentKey: string; keyVersion: number; installCommand: string; installWarnings: string[] }> {
    const result = await requestJson<RotateAgentKeyResponse>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/kubernetes-clusters/${encodeURIComponent(clusterId)}/rotate-agent-key`,
      { method: 'POST', body: JSON.stringify({ agentAccessMode: options.agentAccessMode || 'read_only' }) }
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

  async getTargetMcpCatalog(workspaceId: string, targetId: string): Promise<ClusterToolCatalog> {
    const catalog = await requestJson<ControlPlaneClusterToolCatalog>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/mcp/catalog?limit=50`
    );
    return mapClusterToolsCatalog(catalog);
  },

  async listTargetTools(workspaceId: string, targetId: string): Promise<ControlPlaneTargetToolsCatalog> {
    return requestJson<ControlPlaneTargetToolsCatalog>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/tools`
    );
  },

  async getTargetAssistantCapabilitiesPreview(
    workspaceId: string,
    targetId: string,
    toolAccessMode: 'read_only' | 'read_write'
  ): Promise<ControlPlaneTargetAssistantCapabilitiesPreview> {
    return requestJson<ControlPlaneTargetAssistantCapabilitiesPreview>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/assistant/capabilities-preview?toolAccessMode=${encodeURIComponent(toolAccessMode)}`
    );
  },

  async updateTargetTool(
    workspaceId: string,
    targetId: string,
    toolId: string,
    input: UpdateTargetToolInput
  ): Promise<ControlPlaneTargetToolsCatalog['items'][number]> {
    return requestJson<ControlPlaneTargetToolsCatalog['items'][number]>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/tools/${encodeURIComponent(toolId)}`,
      { method: 'PATCH', body: JSON.stringify(input) }
    );
  },

  async listTargetInsightsEntries(
    workspaceId: string,
    targetId: string,
    options?: { status?: string; q?: string; limit?: number }
  ): Promise<ControlPlaneTargetInsightsCatalog> {
    const query = pageQuery({
      limit: options?.limit,
      filters: {
        status: options?.status,
        q: options?.q
      }
    });
    return requestJson<ControlPlaneTargetInsightsCatalog>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/target-insights${query}`
    );
  },

  async createTargetInsightsEntry(
    workspaceId: string,
    targetId: string,
    input: TargetInsightsEntryInput
  ): Promise<ControlPlaneTargetInsightsEntry> {
    return requestJson<ControlPlaneTargetInsightsEntry>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/target-insights/entries`,
      { method: 'POST', body: JSON.stringify(input) }
    );
  },

  async updateTargetInsightsEntry(
    workspaceId: string,
    targetId: string,
    entryId: string,
    input: Partial<TargetInsightsEntryInput>
  ): Promise<ControlPlaneTargetInsightsEntry> {
    return requestJson<ControlPlaneTargetInsightsEntry>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/target-insights/entries/${encodeURIComponent(entryId)}`,
      { method: 'PATCH', body: JSON.stringify(input) }
    );
  },

  async promoteTargetInsightsEntry(
    workspaceId: string,
    targetId: string,
    entryId: string
  ): Promise<ControlPlaneTargetInsightsEntry> {
    return requestJson<ControlPlaneTargetInsightsEntry>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/target-insights/entries/${encodeURIComponent(entryId)}/promote`,
      { method: 'POST' }
    );
  },

  async archiveTargetInsightsEntry(
    workspaceId: string,
    targetId: string,
    entryId: string
  ): Promise<ControlPlaneTargetInsightsEntry> {
    return requestJson<ControlPlaneTargetInsightsEntry>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/target-insights/entries/${encodeURIComponent(entryId)}/archive`,
      { method: 'POST' }
    );
  },

  async resetTargetInsights(workspaceId: string, targetId: string): Promise<{ status: string; deletedEntries: number; deletedCheckpoints: number }> {
    return requestJson<{ status: string; deletedEntries: number; deletedCheckpoints: number }>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/target-insights/reset`,
      { method: 'POST' }
    );
  },

  async listTargetInsightsActivity(workspaceId: string, targetId: string): Promise<{ items: ControlPlaneWorkspaceAuditEvent[] }> {
    return requestJson<{ items: ControlPlaneWorkspaceAuditEvent[] }>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/target-insights/activity`
    );
  },

  async exportTargetInsights(workspaceId: string, targetId: string): Promise<string> {
    const response = await fetch(`${getControlPlaneBaseUrl()}/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/target-insights/export`, {
      method: 'GET',
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Export failed (${response.status})`);
    }
    return response.text();
  },

  async updateTargetMcpServerTool(
    workspaceId: string,
    targetId: string,
    serverId: string,
    toolName: string,
    input: { enabled: boolean; capability?: 'read' | 'write' }
  ): Promise<ControlPlaneClusterToolCatalogItem> {
    return requestJson<ControlPlaneClusterToolCatalogItem>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/mcp/servers/${encodeURIComponent(serverId)}/tools/${encodeURIComponent(toolName)}`,
      { method: 'PATCH', body: JSON.stringify(input) }
    );
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
  },

  async listTargetSkills(
    workspaceId: string,
    targetId: string,
    options?: { limit?: number; cursor?: string; q?: string }
  ): Promise<ControlPlaneTargetSkillsCatalog> {
    return requestJson<ControlPlaneTargetSkillsCatalog>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/skills${pageQuery({
        limit: options?.limit,
        cursor: options?.cursor,
        q: options?.q
      })}`
    );
  },

  async getTargetSkill(workspaceId: string, targetId: string, skillId: string): Promise<ControlPlaneTargetSkillDetail> {
    return requestJson<ControlPlaneTargetSkillDetail>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/skills/${encodeURIComponent(skillId)}`
    );
  },

  async createTargetSkill(workspaceId: string, targetId: string, input: CreateTargetSkillInput): Promise<ControlPlaneTargetSkillDetail> {
    return requestJson<ControlPlaneTargetSkillDetail>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/skills`,
      { method: 'POST', body: JSON.stringify(input) }
    );
  },

  async importTargetSkill(workspaceId: string, targetId: string, input: ImportTargetSkillInput): Promise<ControlPlaneTargetSkillDetail> {
    return requestJson<ControlPlaneTargetSkillDetail>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/skills/import`,
      { method: 'POST', body: JSON.stringify(input) }
    );
  },

  async updateTargetSkill(
    workspaceId: string,
    targetId: string,
    skillId: string,
    input: UpdateTargetSkillInput
  ): Promise<ControlPlaneTargetSkillDetail> {
    return requestJson<ControlPlaneTargetSkillDetail>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/skills/${encodeURIComponent(skillId)}`,
      { method: 'PATCH', body: JSON.stringify(input) }
    );
  },

  async deleteTargetSkill(workspaceId: string, targetId: string, skillId: string): Promise<void> {
    await requestJson<void>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/skills/${encodeURIComponent(skillId)}`,
      { method: 'DELETE' }
    );
  },

  async reimportTargetSkill(
    workspaceId: string,
    targetId: string,
    skillId: string,
    input: ReimportTargetSkillInput
  ): Promise<ControlPlaneTargetSkillDetail> {
    return requestJson<ControlPlaneTargetSkillDetail>(
      `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/targets/${encodeURIComponent(targetId)}/skills/${encodeURIComponent(skillId)}/reimport`,
      { method: 'POST', body: JSON.stringify(input) }
    );
  }
};
