export interface ControlPlaneClusterSummary {
  resourceCount: number;
  findingCount: number;
  criticalFindingCount: number;
  namespaceCount: number;
  nodeCount: number;
  resourceFamilyCounts?: {
    workloads: number;
    network: number;
    storage: number;
    cluster: number;
  };
  resourceKindCounts?: Record<string, number>;
}

export interface ControlPlaneCluster {
  id: string;
  workspaceId: string;
  name: string;
  status: 'online' | 'offline' | 'degraded' | 'unknown';
  agentAccessMode?: 'read_only' | 'read_write' | 'unknown';
  namespaceInclude?: string[];
  namespaceExclude?: string[];
  writeConfirmationPolicy?: {
    effectiveRequired: boolean;
    overrideRequired: boolean | null;
    source: 'cluster_override' | 'deployment_default';
  };
  summary?: ControlPlaneClusterSummary;
}
