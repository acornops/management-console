import type { KubernetesCluster } from '@/types';

export interface TargetMcpServer {
  id: string;
  workspaceId: string;
  targetId: string;
  serverName: string;
  serverUrl: string;
  enabled: boolean;
  authType: 'none' | 'bearer_token' | 'custom_header';
  authScope?: 'none' | 'personal';
  authHeaderName?: string;
  authHeaderPrefix?: string;
  publicHeaders?: Record<string, string>;
  connectionStatus: 'unknown' | 'ok' | 'error';
  lastDiscoveryAt?: string | null;
  lastDiscoveryError?: string | null;
  revision?: number;
  provenance?: { sourceId: string; artifactName: string; version: string; digest: string; importedAt?: string };
  tools: KubernetesCluster['mcpTools'];
}

export interface TargetMcpServerTestConnectionResult {
  serverId: string;
  serverName: string;
  serverUrl: string;
  connectionStatus: 'ok' | 'error';
  lastDiscoveryAt: string;
  discoveredToolCount: number;
  discoveredTools: string[];
  error?: string | null;
}
