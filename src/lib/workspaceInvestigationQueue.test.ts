import { describe, expect, it } from 'vitest';

import { HealthStatus, KubernetesCluster, Alert } from '@/types';
import { buildInvestigationQueue, getTopInvestigationQueueItem } from './workspaceInvestigationQueue';

function alert(overrides: Partial<Alert>): Alert {
  return {
    id: 'alert-1',
    severity: 'warning',
    title: 'Pod restart loop',
    message: 'A workload is restarting repeatedly.',
    timestamp: 1000,
    ...overrides
  };
}

function app(id: string, name: string, alerts: Alert[]): KubernetesCluster {
  return {
    id,
    name,
    cluster: name,
    namespace: 'default',
    workspaceId: 'workspace-1',
    agentConnectionState: 'connected',
    owners: [],
    gitlabPipelines: [],
    status: HealthStatus.GREEN,
    podStats: { running: 0, failed: 0, pending: 0 },
    metrics: { cpu: '0m', memory: '0Mi' },
    lastUpdate: '2026-05-17T00:00:00.000Z',
    mcpTools: [],
    chatSessions: [],
    workloads: [],
    nodes: [],
    namespaces: [],
    services: [],
    ingresses: [],
    pvcs: [],
    alerts
  };
}

describe('workspace investigation queue', () => {
  it('sorts findings by severity and newest timestamp within each severity', () => {
    const criticalOld = alert({ id: 'critical-old', severity: 'critical', timestamp: 2000 });
    const criticalNew = alert({ id: 'critical-new', severity: 'critical', timestamp: 5000 });
    const warningNew = alert({ id: 'warning-new', severity: 'warning', timestamp: 9000 });
    const infoNew = alert({ id: 'info-new', severity: 'info', timestamp: 10000 });

    const queue = buildInvestigationQueue([
      app('cluster-a', 'Cluster A', [warningNew, criticalOld]),
      app('cluster-b', 'Cluster B', [infoNew, criticalNew])
    ]);

    expect(queue.map((item) => item.alert.id)).toEqual([
      'critical-new',
      'critical-old',
      'warning-new',
      'info-new'
    ]);
    expect(queue[0]).toMatchObject({
      id: 'cluster-b-critical-new',
      clusterId: 'cluster-b',
      clusterName: 'Cluster B',
      severity: 'critical',
      title: 'Pod restart loop',
      summary: 'A workload is restarting repeatedly.',
      timestamp: 5000
    });
    expect(queue[0]?.cluster.name).toBe('Cluster B');
  });

  it('returns the first ranked queue item as the top investigation', () => {
    const queue = buildInvestigationQueue([
      app('cluster-a', 'Cluster A', [
        alert({ id: 'warning-new', severity: 'warning', timestamp: 9000 }),
        alert({ id: 'critical-old', severity: 'critical', timestamp: 2000 })
      ])
    ]);

    expect(getTopInvestigationQueueItem(queue)?.alert.id).toBe('critical-old');
    expect(getTopInvestigationQueueItem([])).toBeUndefined();
  });

  it('collapses snapshot unhealthy pod and probe warning events for the same pod into one item', () => {
    const snapshotFinding = alert({
      id: 'snapshot-pod-default-api-7d9',
      severity: 'critical',
      title: 'Pod api-7d9 is unhealthy',
      message: 'Latest snapshot reports pod api-7d9 in namespace default as CrashLoopBackOff.',
      timestamp: 2000,
      namespace: 'default',
      source: 'snapshot',
      objectKind: 'Pod',
      objectName: 'api-7d9',
      reason: 'CrashLoopBackOff'
    });
    const readinessEvent = alert({
      id: 'default-api-7d9-0',
      title: 'Unhealthy',
      message: 'Readiness probe failed: HTTP probe failed with statuscode: 500',
      timestamp: 5000,
      namespace: 'default',
      source: 'event',
      objectKind: 'Pod',
      objectName: 'api-7d9',
      reason: 'Unhealthy'
    });
    const livenessEvent = alert({
      id: 'default-api-7d9-1',
      title: 'Unhealthy',
      message: 'Liveness probe failed: connection refused',
      timestamp: 7000,
      namespace: 'default',
      source: 'event',
      objectKind: 'Pod',
      objectName: 'api-7d9',
      reason: 'Unhealthy'
    });

    const queue = buildInvestigationQueue([
      app('cluster-a', 'Cluster A', [snapshotFinding, readinessEvent, livenessEvent])
    ]);

    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      alert: expect.objectContaining({ id: 'snapshot-pod-default-api-7d9' }),
      severity: 'critical',
      timestamp: 7000,
      namespace: 'default'
    });
    expect(queue[0]?.relatedAlerts.map((relatedAlert) => relatedAlert.id)).toEqual([
      'snapshot-pod-default-api-7d9',
      'default-api-7d9-1',
      'default-api-7d9-0'
    ]);
  });

  it('collapses readiness and liveness probe failures for the same pod', () => {
    const queue = buildInvestigationQueue([
      app('cluster-a', 'Cluster A', [
        alert({
          id: 'readiness',
          title: 'Unhealthy',
          message: 'Readiness probe failed: timeout',
          timestamp: 1000,
          namespace: 'default',
          source: 'event',
          objectKind: 'Pod',
          objectName: 'api-7d9',
          reason: 'Unhealthy'
        }),
        alert({
          id: 'liveness',
          title: 'Unhealthy',
          message: 'Liveness probe failed: connection refused',
          timestamp: 2000,
          namespace: 'default',
          source: 'event',
          objectKind: 'Pod',
          objectName: 'api-7d9',
          reason: 'Unhealthy'
        })
      ])
    ]);

    expect(queue).toHaveLength(1);
    expect(queue[0]?.relatedAlerts.map((relatedAlert) => relatedAlert.id)).toEqual(['liveness', 'readiness']);
  });

  it('keeps similar pod health messages separate for different pods and namespaces', () => {
    const queue = buildInvestigationQueue([
      app('cluster-a', 'Cluster A', [
        alert({
          id: 'api-default',
          title: 'Unhealthy',
          message: 'Readiness probe failed: timeout',
          timestamp: 1000,
          namespace: 'default',
          source: 'event',
          objectKind: 'Pod',
          objectName: 'api-7d9',
          reason: 'Unhealthy'
        }),
        alert({
          id: 'worker-default',
          title: 'Unhealthy',
          message: 'Readiness probe failed: timeout',
          timestamp: 2000,
          namespace: 'default',
          source: 'event',
          objectKind: 'Pod',
          objectName: 'worker-55c',
          reason: 'Unhealthy'
        }),
        alert({
          id: 'api-payments',
          title: 'Unhealthy',
          message: 'Readiness probe failed: timeout',
          timestamp: 3000,
          namespace: 'payments',
          source: 'event',
          objectKind: 'Pod',
          objectName: 'api-7d9',
          reason: 'Unhealthy'
        })
      ])
    ]);

    expect(queue.map((item) => item.alert.id)).toEqual(['api-payments', 'worker-default', 'api-default']);
  });

  it('orders grouped incidents by highest severity and newest grouped timestamp', () => {
    const queue = buildInvestigationQueue([
      app('cluster-a', 'Cluster A', [
        alert({
          id: 'warning-newer',
          severity: 'warning',
          timestamp: 9000,
          namespace: 'default',
          source: 'event',
          objectKind: 'Pod',
          objectName: 'api-7d9',
          reason: 'Unhealthy',
          message: 'Readiness probe failed: timeout'
        }),
        alert({
          id: 'critical-older',
          severity: 'critical',
          timestamp: 1000,
          namespace: 'default',
          source: 'snapshot',
          objectKind: 'Pod',
          objectName: 'api-7d9',
          reason: 'CrashLoopBackOff'
        }),
        alert({
          id: 'critical-newest-other-pod',
          severity: 'critical',
          timestamp: 5000,
          namespace: 'default',
          source: 'snapshot',
          objectKind: 'Pod',
          objectName: 'worker-55c',
          reason: 'CrashLoopBackOff'
        })
      ])
    ]);

    expect(queue.map((item) => [item.alert.id, item.severity, item.timestamp])).toEqual([
      ['critical-older', 'critical', 9000],
      ['critical-newest-other-pod', 'critical', 5000]
    ]);
  });
});
