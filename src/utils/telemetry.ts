import { HealthStatus, KubernetesCluster } from '@/types';
import { formatRelativeTime } from '@/utils/dateTime';
import { hasNeverConnectedObservation, observedAgentConnectionState, type AgentConnectionState } from './agentConnection';

export type { AgentConnectionState } from './agentConnection';
export type TelemetryFreshness = 'current' | 'stale' | 'offline' | 'unavailable';

export function getTelemetryTimestampFreshness(timestamp: string | number, now = Date.now()): TelemetryFreshness {
  const parsedTime = typeof timestamp === 'number' ? timestamp : Date.parse(timestamp);
  if (!Number.isFinite(parsedTime)) return 'unavailable';

  const deltaMs = Math.max(now - parsedTime, 0);
  if (deltaMs < 2 * 60 * 1000) return 'current';
  if (deltaMs < 10 * 60 * 1000) return 'stale';
  return 'offline';
}

export function getAgentConnectionState(cluster: KubernetesCluster, now = Date.now()): AgentConnectionState {
  if (cluster.connection) {
    if (cluster.agentConnectionState === 'not_installed' && hasNeverConnectedObservation(cluster.connection)) return 'not_installed';
    return observedAgentConnectionState(cluster.connection, now);
  }
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
  const connectionState = getAgentConnectionState(cluster, now);
  if (connectionState === 'not_installed' || connectionState === 'unknown') return 'unavailable';
  if (connectionState === 'disconnected') return 'offline';

  return getTelemetryTimestampFreshness(cluster.lastUpdate, now);
}

export function formatLastUpdated(lastUpdate: string, now = Date.now()): string {
  return formatRelativeTime(lastUpdate, { fallback: 'Unknown', now });
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
