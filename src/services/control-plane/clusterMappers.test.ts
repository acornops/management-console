import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HealthStatus } from '@/types';
import {
  mapClusterResourcePageItems,
  mapClusterStatus,
  mapControlPlaneClusterToKubernetesCluster,
  mapCronJobs,
  mapIngresses,
  mapJobs,
  mapNamespaces,
  mapNodes,
  mapPVCs,
  mapPodWorkloads,
  mapScalableWorkloads,
  mapServices
} from './clusterMappers';
import { ControlPlaneClusterDetail } from './types';

describe('mapControlPlaneClusterToKubernetesCluster', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-25T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('derives persistent cluster findings from unhealthy pod snapshot state', () => {
    const cluster: ControlPlaneClusterDetail = {
      id: 'cluster-1',
      workspaceId: 'workspace-1',
      name: 'demo-cluster',
      status: 'online',
      latestSnapshot: {
        clusterId: 'cluster-1',
        workspaceId: 'workspace-1',
        timestamp: '2026-05-10T12:00:00.000Z',
        data: {
          resources: {
            namespaces: [
              {
                name: 'default',
                uid: 'namespace-1',
                status: 'Active',
                creationTimestamp: '2026-05-10T11:00:00.000Z',
                labels: { team: 'platform' }
              }
            ],
            pods: [
              {
                name: 'demo-unhealthy-pod',
                namespace: 'default',
                phase: 'Running',
                containerStatuses: [
                  {
                    name: 'app',
                    ready: false,
                    restartCount: 4,
                    state: {
                      waiting: {
                        reason: 'CrashLoopBackOff'
                      }
                    }
                  }
                ]
              }
            ]
          },
          events: []
        }
      }
    };

    const mappedCluster = mapControlPlaneClusterToKubernetesCluster(cluster);

    expect(mappedCluster.status).toBe(HealthStatus.RED);
    expect(mappedCluster.podStats.failed).toBe(1);
    expect(mappedCluster.namespaces).toEqual([
      expect.objectContaining({
        id: 'namespace-1',
        name: 'default',
        status: 'Active',
        labels: { team: 'platform' }
      })
    ]);
    expect(mappedCluster.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'snapshot-pod-default-demo-unhealthy-pod',
          severity: 'critical',
          namespace: 'default',
          source: 'snapshot',
          objectKind: 'Pod',
          objectName: 'demo-unhealthy-pod',
          reason: 'CrashLoopBackOff'
        })
      ])
    );
  });

  it('preserves involved object metadata on event alerts', () => {
    const cluster: ControlPlaneClusterDetail = {
      id: 'cluster-1',
      workspaceId: 'workspace-1',
      name: 'demo-cluster',
      status: 'online',
      latestSnapshot: {
        clusterId: 'cluster-1',
        workspaceId: 'workspace-1',
        timestamp: '2026-05-10T12:00:00.000Z',
        data: {
          resources: {},
          events: [
            {
              type: 'Warning',
              reason: 'Unhealthy',
              message: 'Readiness probe failed: HTTP probe failed with statuscode: 500',
              lastTimestamp: '2026-05-10T12:01:00.000Z',
              involvedObject: {
                kind: 'Pod',
                namespace: 'default',
                name: 'demo-unhealthy-pod'
              }
            }
          ]
        }
      }
    };

    const mappedCluster = mapControlPlaneClusterToKubernetesCluster(cluster);

    expect(mappedCluster.alerts).toEqual([
      expect.objectContaining({
        id: 'default-demo-unhealthy-pod-0',
        severity: 'critical',
        namespace: 'default',
        source: 'event',
        objectKind: 'Pod',
        objectName: 'demo-unhealthy-pod',
        reason: 'Unhealthy',
        timestamp: Date.parse('2026-05-10T12:01:00.000Z')
      })
    ]);
  });

  it('preserves server-owned resource summary breakdowns', () => {
    const cluster: ControlPlaneClusterDetail = {
      id: 'cluster-1',
      workspaceId: 'workspace-1',
      name: 'demo-cluster',
      status: 'online',
      summary: {
        resourceCount: 8,
        findingCount: 2,
        criticalFindingCount: 1,
        namespaceCount: 1,
        nodeCount: 2,
        resourceFamilyCounts: {
          workloads: 4,
          network: 1,
          storage: 1,
          cluster: 2
        },
        resourceKindCounts: {
          Deployment: 1,
          Pod: 3,
          Service: 1,
          PersistentVolumeClaim: 1,
          Node: 1,
          Namespace: 1
        }
      }
    };

    const mappedCluster = mapControlPlaneClusterToKubernetesCluster(cluster);

    expect(mappedCluster.resourceSummary).toEqual(cluster.summary);
  });

  it('maps assorted snapshot resource types and statuses', () => {
    expect(mapClusterStatus('online')).toBe(HealthStatus.GREEN);
    expect(mapClusterStatus('degraded')).toBe(HealthStatus.RED);
    expect(mapClusterStatus('offline')).toBe(HealthStatus.YELLOW);

    expect(
      mapNodes(
        [
          {
            name: 'control-plane-1',
            uid: 'node-1',
            labels: {
              'node-role.kubernetes.io/control-plane': ''
            },
            kubeletVersion: 'v1.31.0',
            osImage: 'Ubuntu',
            containerRuntimeVersion: 'containerd://1.7',
            architecture: 'arm64',
            operatingSystem: 'linux',
            capacity: { cpu: '4' },
            allocatable: { cpu: '3900m' },
            status: {
              conditions: [{ type: 'Ready', status: 'True', reason: 'KubeletReady', message: 'ready' }]
            }
          }
        ],
        [{ name: 'control-plane-1', usage: { cpu: '1500m', memory: '1Gi' } }, { name: 'worker-2', usage: { cpu: '500m', memory: '512Mi' } }]
      )
    ).toEqual([
      expect.objectContaining({
        name: 'control-plane-1',
        role: 'control-plane',
        status: 'Ready',
        cpu: '1.50 Core',
        memory: '1.00 GiB'
      }),
      expect.objectContaining({
        name: 'worker-2',
        role: 'worker',
        status: 'Unknown',
        cpu: '0.500 Core',
        memory: '512.0 MiB'
      })
    ]);

    expect(
      mapNamespaces([{ name: 'payments', uid: 'ns-1', creationTimestamp: '2026-05-24T00:00:00.000Z', status: 'Active' }])
    ).toEqual([
      expect.objectContaining({
        id: 'ns-1',
        name: 'payments',
        age: '24h'
      })
    ]);

    expect(
      mapServices([
        {
          name: 'api',
          namespace: 'payments',
          type: 'NodePort',
          clusterIP: '10.0.0.1',
          ports: [{ port: 80, protocol: 'TCP', targetPort: 8080, nodePort: 30080 }],
          externalIPs: ['1.2.3.4']
        }
      ])
    ).toEqual([
      expect.objectContaining({
        type: 'NodePort',
        ports: '80:8080/TCP -> 30080'
      })
    ]);

    expect(
      mapIngresses([
        {
          name: 'api',
          namespace: 'payments',
          hosts: ['api.example.com'],
          address: '1.2.3.4',
          rules: [{ host: 'api.example.com', paths: [{ path: '/', serviceName: 'api', servicePort: 80 }] }],
          tls: [{ hosts: ['api.example.com'], secretName: 'api-tls' }]
        }
      ])
    ).toEqual([
      expect.objectContaining({
        hosts: ['api.example.com'],
        address: '1.2.3.4',
        tls: [{ hosts: ['api.example.com'], secretName: 'api-tls' }]
      })
    ]);

    expect(
      mapPVCs([
        {
          name: 'data',
          namespace: 'payments',
          status: 'Bound',
          capacity: '10Gi',
          accessModes: ['ReadWriteOnce'],
          storageClass: 'fast'
        }
      ])
    ).toEqual([
      expect.objectContaining({
        name: 'data',
        status: 'Bound',
        capacity: '10Gi',
        accessModes: ['ReadWriteOnce']
      })
    ]);
  });

  it('maps workload resources and resource page items', () => {
    expect(
      mapScalableWorkloads(
        [
          { name: 'api', namespace: 'payments', replicas: 3, readyReplicas: 3, availableReplicas: 3 },
          { name: 'worker', namespace: 'payments', replicas: 2, readyReplicas: 0, availableReplicas: 0 },
          { name: 'cache', namespace: 'payments', replicas: 0, readyReplicas: 0, availableReplicas: 0 }
        ],
        'Deployment'
      )
    ).toEqual([
      expect.objectContaining({ name: 'api', status: 'Running', replicas: '3/3' }),
      expect.objectContaining({ name: 'worker', status: 'Failed', replicas: '0/2' }),
      expect.objectContaining({ name: 'cache', status: 'Pending', replicas: '0/0' })
    ]);

    expect(
      mapCronJobs([
        {
          name: 'cleanup',
          namespace: 'payments',
          schedule: '*/5 * * * *',
          suspend: false,
          active: 1,
          lastScheduleTime: '2026-05-24T23:55:00.000Z'
        },
        {
          name: 'nightly',
          namespace: 'payments',
          suspend: true
        }
      ])
    ).toEqual([
      expect.objectContaining({ name: 'cleanup', status: 'Active', schedule: '*/5 * * * *' }),
      expect.objectContaining({ name: 'nightly', status: 'Suspended', lastRun: '-' })
    ]);

    expect(
      mapJobs([
        {
          name: 'success-job',
          namespace: 'payments',
          completions: 1,
          succeeded: 1,
          startTime: '2026-05-24T23:59:00.000Z',
          completionTime: '2026-05-25T00:00:00.000Z'
        },
        {
          name: 'failed-job',
          namespace: 'payments',
          failed: 1
        }
      ])
    ).toEqual([
      expect.objectContaining({ name: 'success-job', status: 'Succeeded', duration: '1m' }),
      expect.objectContaining({ name: 'failed-job', status: 'Failed', duration: '-' })
    ]);

    expect(
      mapPodWorkloads([
        {
          name: 'api',
          namespace: 'payments',
          phase: 'Running',
          nodeName: 'node-1',
          restartCount: 2,
          containerStatuses: [
            {
              name: 'api',
              ready: false,
              restartCount: 2,
              state: {
                waiting: {
                  reason: 'CrashLoopBackOff'
                }
              }
            },
            {
              name: 'sidecar',
              ready: true,
              state: {}
            }
          ]
        }
      ])
    ).toEqual([
      expect.objectContaining({
        name: 'api',
        status: 'CrashLoopBackOff',
        containers: ['api', 'sidecar'],
        containerStatuses: [
          expect.objectContaining({ name: 'api', state: 'waiting', reason: 'CrashLoopBackOff' }),
          expect.objectContaining({ name: 'sidecar', state: 'running' })
        ]
      })
    ]);

    expect(
      mapClusterResourcePageItems([
        { id: '1', family: 'workloads', kind: 'Deployment', name: 'api', clusterId: 'cluster-1', clusterName: 'demo', item: { name: 'api', namespace: 'payments', replicas: 1, readyReplicas: 1 } },
        { id: '2', family: 'network', kind: 'Service', name: 'api', clusterId: 'cluster-1', clusterName: 'demo', item: { name: 'api', namespace: 'payments', clusterIP: '10.0.0.1' } },
        { id: '3', family: 'cluster', kind: 'Node', name: 'node-1', clusterId: 'cluster-1', clusterName: 'demo', item: { name: 'node-1' } },
        { id: '4', family: 'cluster', kind: 'Namespace', name: 'payments', clusterId: 'cluster-1', clusterName: 'demo', item: { name: 'payments' } }
      ])
    ).toEqual({
      workloads: [expect.objectContaining({ name: 'api', type: 'Deployment' })],
      services: [expect.objectContaining({ name: 'api' })],
      ingresses: [],
      pvcs: [],
      nodes: [expect.objectContaining({ name: 'node-1' })],
      namespaces: [expect.objectContaining({ name: 'payments' })]
    });
  });

  it('derives agent connection state and computed health from snapshot context', () => {
    const clusterWithPendingWorkload = mapControlPlaneClusterToKubernetesCluster({
      id: 'cluster-1',
      workspaceId: 'workspace-1',
      name: 'demo',
      status: 'offline',
      namespaceInclude: [' payments '],
      namespaceExclude: [' kube-system '],
      latestSnapshot: {
        clusterId: 'cluster-1',
        workspaceId: 'workspace-1',
        timestamp: '2026-05-25T00:00:00.000Z',
        data: {
          resources: {
            pods: [{ name: 'api', namespace: 'payments', phase: 'Pending' }]
          },
          events: []
        }
      }
    });
    const clusterWithoutSnapshot = mapControlPlaneClusterToKubernetesCluster({
      id: 'cluster-2',
      workspaceId: 'workspace-1',
      name: 'fresh-cluster',
      status: 'offline'
    });

    expect(clusterWithPendingWorkload.agentConnectionState).toBe('disconnected');
    expect(clusterWithPendingWorkload.status).toBe(HealthStatus.YELLOW);
    expect(clusterWithPendingWorkload.namespace).toBe('payments');
    expect(clusterWithPendingWorkload.namespaceScope).toEqual({
      include: ['payments'],
      exclude: ['kube-system']
    });

    expect(clusterWithoutSnapshot.agentConnectionState).toBe('not_installed');
    expect(clusterWithoutSnapshot.lastUpdate).toBe('2026-05-25T00:00:00.000Z');
  });
});
