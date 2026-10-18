import type { FixtureState } from './store';
import type { ControlPlaneResourcePageItem } from '@/services/controlPlaneApi';

// Mirror control-plane snapshot-derived-data status rules at this fixture boundary.
const criticalPodReasons = new Set([
  'crashloopbackoff', 'imagepullbackoff', 'errimagepull', 'oomkilled', 'createcontainerconfigerror'
]);
const text = (value: unknown, fallback = '') => typeof value === 'string' && value.trim() ? value : fallback;
const records = (value: unknown): Array<Record<string, any>> => Array.isArray(value)
  ? value.filter((item) => item && typeof item === 'object')
  : [];

function fixtureResourceStatus(kind: string, item: Record<string, any>): string {
  if (kind === 'Node') {
    const ready = records(item.status?.conditions).find((condition) => condition.type === 'Ready');
    return String(ready?.status || '').toLowerCase() === 'true' ? 'Ready' : 'NotReady';
  }
  if (kind === 'Pod') {
    const reason = records(item.containerStatuses)
      .map((status) => text(status.state?.waiting?.reason) || text(status.state?.terminated?.reason))
      .find((value) => criticalPodReasons.has(value.toLowerCase()));
    return reason || text(item.phase, 'Unknown');
  }
  if (kind === 'Namespace' || kind === 'PersistentVolumeClaim') return text(item.status, 'Unknown');
  const replicas = Number(item.replicas ?? 0);
  const readyReplicas = Number(item.readyReplicas ?? 0);
  if (replicas > 0 && readyReplicas >= replicas) return 'Running';
  if (replicas > 0 && readyReplicas === 0) return 'Failed';
  return text(item.status, 'Unknown');
}

export function isFixtureResourceAttentionStatus(status: string | undefined): boolean {
  const normalized = String(status || '').toLowerCase();
  return criticalPodReasons.has(normalized) || /failed|crash|notready|pending|error|unknown/i.test(normalized);
}

/** Make normalized resource reads and counts describe the same seeded snapshot. */
export function completeFixtureResourceInventory(state: FixtureState): void {
  const cluster = state.clusters[0];
  const families = [
    ['pods', 'workloads', 'Pod'], ['deployments', 'workloads', 'Deployment'],
    ['services', 'network', 'Service'], ['ingresses', 'network', 'Ingress'],
    ['pvcs', 'storage', 'PersistentVolumeClaim'], ['nodes', 'cluster', 'Node'],
    ['namespaces', 'cluster', 'Namespace']
  ] as const;
  for (const [collection, family, kind] of families) {
    for (const item of cluster.latestSnapshot.data.resources[collection]) {
      const status = fixtureResourceStatus(kind, item);
      const existing = state.resources.find((row) => row.kind === kind && row.name === item.name && row.namespace === item.namespace);
      // Normalize wire status without replacing the richer seeded Pod payloads.
      if (existing) {
        existing.status = status;
        continue;
      }
      state.resources.push({
        id: `${kind}/${item.name}`, family, kind, name: item.name,
        namespace: item.namespace, status, clusterId: cluster.id,
        clusterName: cluster.name, item
      } as ControlPlaneResourcePageItem);
    }
  }
  cluster.summary.resourceCount = state.resources.length;
  cluster.summary.resourceFamilyCounts = { workloads: 0, network: 0, storage: 0, cluster: 0 };
  cluster.summary.resourceKindCounts = {};
  for (const row of state.resources) {
    cluster.summary.resourceFamilyCounts[row.family] += 1;
    cluster.summary.resourceKindCounts[row.kind] = (cluster.summary.resourceKindCounts[row.kind] || 0) + 1;
  }
}
