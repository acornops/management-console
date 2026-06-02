import { HealthStatus, KubernetesCluster } from '@/types';

export type AgentConnectionState = 'connected' | 'disconnected' | 'not_installed';
export type TelemetryFreshness = 'current' | 'stale' | 'offline' | 'unavailable';

export function getAgentConnectionState(cluster: KubernetesCluster): AgentConnectionState {
  if (cluster.agentConnectionState) {
    return cluster.agentConnectionState;
  }
  const hasObservedClusterData =
    cluster.workloads.length > 0 ||
    cluster.nodes.length > 0 ||
    (cluster.namespaces || []).length > 0 ||
    cluster.services.length > 0 ||
    Number(cluster.resourceSummary?.resourceCount || 0) > 0;
  return hasObservedClusterData ? 'connected' : 'not_installed';
}

export function getTelemetryFreshness(cluster: KubernetesCluster, now = Date.now()): TelemetryFreshness {
  const connectionState = getAgentConnectionState(cluster);
  if (connectionState === 'not_installed') return 'unavailable';
  if (connectionState === 'disconnected') return 'offline';

  const parsedTime = Date.parse(cluster.lastUpdate);
  if (Number.isNaN(parsedTime)) return 'unavailable';

  const deltaMs = Math.max(now - parsedTime, 0);
  if (deltaMs < 2 * 60 * 1000) return 'current';
  if (deltaMs < 10 * 60 * 1000) return 'stale';
  return 'offline';
}

export function formatLastUpdated(lastUpdate: string): string {
  const parsedTime = Date.parse(lastUpdate);
  if (Number.isNaN(parsedTime)) {
    return 'unknown';
  }
  const deltaMs = Math.max(Date.now() - parsedTime, 0);
  const seconds = Math.floor(deltaMs / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function getTelemetryFreshnessLabel(freshness: TelemetryFreshness): string {
  if (freshness === 'current') return 'Telemetry current';
  if (freshness === 'stale') return 'Telemetry stale';
  if (freshness === 'offline') return 'Telemetry offline';
  return 'Telemetry unavailable';
}

export function getEffectiveHealthStatus(cluster: KubernetesCluster): HealthStatus {
  if (Number(cluster.resourceSummary?.criticalFindingCount || 0) > 0) return HealthStatus.RED;
  if (Number(cluster.resourceSummary?.findingCount || 0) > 0 && cluster.status === HealthStatus.GREEN) return HealthStatus.YELLOW;
  const hasCriticalEvent = cluster.alerts.some((alert) => alert.severity === 'critical');
  if (hasCriticalEvent) return HealthStatus.RED;
  const hasWarningEvent = cluster.alerts.some((alert) => alert.severity === 'warning');
  if (hasWarningEvent && cluster.status === HealthStatus.GREEN) return HealthStatus.YELLOW;
  return cluster.status;
}

export function getHealthStatusLabel(status: HealthStatus): string {
  if (status === HealthStatus.GREEN) return 'Healthy';
  if (status === HealthStatus.YELLOW) return 'Warning';
  return 'Critical';
}
