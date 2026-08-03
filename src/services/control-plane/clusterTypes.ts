import type { RunPermissionMode } from './runPermissionTypes';

export interface ControlPlaneClusterSummary {
  resourceCount: number;
  findingCount: number;
  criticalFindingCount: number;
  namespaceCount: number;
  nodeCount: number;
  readyNodeCount?: number;
  podStats?: {
    running: number;
    failed: number;
    pending: number;
  };
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
  permissionMode?: RunPermissionMode;
  permissionModeOverride?: RunPermissionMode | null;
  permissionModeSource?: 'cluster_override' | 'deployment_default';
  writeConfirmationPolicy?: {
    effectiveRequired: boolean;
    overrideRequired: boolean | null;
    source: 'cluster_override' | 'deployment_default';
  };
  summary?: ControlPlaneClusterSummary;
}
