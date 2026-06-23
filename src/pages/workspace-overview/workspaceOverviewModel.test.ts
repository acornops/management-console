import { describe, expect, it } from 'vitest';

import { HealthStatus, type KubernetesCluster } from '@/types';
import type { ControlPlaneInvestigationItem, ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';

import {
  buildWorkspaceOverviewCards,
  getSeverityRank,
  sortWorkspaceOverviewIssues,
  type WorkspaceOverviewIssue
} from './workspaceOverviewModel';

const t = (key: string) => key;

const cluster = (overrides: Partial<KubernetesCluster> = {}): KubernetesCluster =>
  ({
    id: 'cluster-1',
    name: 'cluster-1',
    cluster: 'cluster-1',
    namespace: '',
    workspaceId: 'workspace-a',
    agentConnectionState: 'connected',
    owners: [],
    gitlabPipelines: [],
    status: HealthStatus.GREEN,
    podStats: { running: 0, failed: 0, pending: 0 },
    metrics: { cpu: '--', memory: '--' },
    lastUpdate: new Date(0).toISOString(),
    mcpTools: [],
    chatSessions: [],
    workloads: [],
    nodes: [],
    namespaces: [],
    services: [],
    ingresses: [],
    pvcs: [],
    alerts: [],
    ...overrides
  }) as KubernetesCluster;

const vm = (overrides: Partial<ControlPlaneVirtualMachine> = {}): ControlPlaneVirtualMachine => ({
  id: 'vm-1',
  workspaceId: 'workspace-a',
  name: 'vm-1',
  status: 'online',
  osFamily: 'linux',
  serviceManager: 'systemd',
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  ...overrides
});

describe('workspace overview model', () => {
  it('orders severities from critical to info', () => {
    expect(getSeverityRank('critical')).toBeLessThan(getSeverityRank('warning'));
    expect(getSeverityRank('warning')).toBeLessThan(getSeverityRank('info'));
  });

  it('sorts issues by severity, then recency, then stable title fallback', () => {
    const issues: WorkspaceOverviewIssue[] = [
      { id: '3', targetId: 'cluster-1', targetType: 'kubernetes', severity: 'warning', title: 'Zulu', timestamp: 10, detail: '' },
      { id: '2', targetId: 'cluster-1', targetType: 'kubernetes', severity: 'critical', title: 'Alpha', timestamp: 1, detail: '' },
      { id: '1', targetId: 'cluster-1', targetType: 'kubernetes', severity: 'critical', title: 'Bravo', timestamp: 5, detail: '' }
    ];

    expect(sortWorkspaceOverviewIssues(issues).map((issue) => issue.id)).toEqual(['1', '2', '3']);
  });

  it('groups connected targets and sorts attention issues across target types by urgency', () => {
    const clusterInvestigations: ControlPlaneInvestigationItem[] = [
      {
        id: 'ci-1',
        clusterId: 'cluster-2',
        clusterName: 'cluster-2',
        severity: 'warning',
        title: 'Capacity pressure',
        message: 'Node pressure reported.',
        timestamp: 10
      },
      {
        id: 'ci-2',
        clusterId: 'cluster-1',
        clusterName: 'cluster-1',
        severity: 'critical',
        title: 'API outage',
        message: 'API server unavailable.',
        timestamp: 20
      }
    ];

    const result = buildWorkspaceOverviewCards({
      kubernetesClusters: [
        cluster({ id: 'cluster-1', name: 'cluster-1' }),
        cluster({ id: 'cluster-2', name: 'cluster-2', status: HealthStatus.YELLOW }),
        cluster({ id: 'cluster-3', name: 'cluster-3' })
      ],
      clusterInvestigations,
      virtualMachines: [
        vm({ id: 'vm-1', name: 'vm-1' }),
        vm({ id: 'vm-2', name: 'vm-2', status: 'degraded' })
      ],
      vmFindingsById: {
        'vm-1': [{ id: 'vf-1', severity: 'warning', title: 'Disk almost full', message: '85% used', source: 'disk', updatedAt: new Date(30).toISOString() }],
        'vm-2': []
      },
      t
    });

    expect(result.attentionItems.map((item) => `${item.targetName}:${item.issue.id}`)).toEqual([
      'cluster-1:ci-2',
      'vm-1:vf-1',
      'cluster-2:ci-1'
    ]);
    expect(result.connectedClusterCards.map((card) => card.name)).toEqual(['cluster-1', 'cluster-2', 'cluster-3']);
    expect(result.connectedVirtualMachineCards.map((card) => card.name)).toEqual(['vm-1', 'vm-2']);
    expect(result.criticalIssueCount).toBe(1);
    expect(result.warningIssueCount).toBe(2);
  });
});
