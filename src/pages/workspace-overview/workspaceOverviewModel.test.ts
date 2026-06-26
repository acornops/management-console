import { describe, expect, it } from 'vitest';

import { HealthStatus, type KubernetesCluster } from '@/types';
import type { ControlPlaneIssueItem, ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';

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

const issue = (overrides: Partial<ControlPlaneIssueItem> = {}): ControlPlaneIssueItem => ({
  id: 'issue-1',
  workspaceId: 'workspace-a',
  targetId: 'cluster-1',
  targetType: 'kubernetes',
  targetName: 'cluster-1',
  fingerprint: 'kubernetes|cluster-1|default|pod|pod-1|app|pod-unhealthy',
  issueType: 'kubernetes_pod_unhealthy',
  status: 'active',
  severity: 'warning',
  title: 'Pod unhealthy',
  summary: 'Pod is unhealthy.',
  namespace: 'default',
  scopeKind: 'Namespace',
  scopeName: 'default',
  objectKind: 'Pod',
  objectName: 'pod-1',
  reason: 'CrashLoopBackOff',
  firstSeenAt: new Date(0).toISOString(),
  lastSeenAt: new Date(10).toISOString(),
  lastObservedSnapshotAt: new Date(10).toISOString(),
  occurrenceCount: 1,
  reopenedCount: 0,
  cleanSnapshotCount: 0,
  latestEvidence: {},
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(10).toISOString(),
  ...overrides
});

describe('workspace overview model', () => {
  it('orders severities from critical to info', () => {
    expect(getSeverityRank('critical')).toBeLessThan(getSeverityRank('warning'));
    expect(getSeverityRank('warning')).toBeLessThan(getSeverityRank('info'));
  });

  it('sorts issues by severity, then recency, then stable title fallback', () => {
    const issues: WorkspaceOverviewIssue[] = [
      { id: '3', targetId: 'cluster-1', targetType: 'kubernetes', severity: 'warning', title: 'Zulu', timestamp: 10, status: 'active', firstSeenAt: '', lastSeenAt: '', detail: '', evidence: '' },
      { id: '2', targetId: 'cluster-1', targetType: 'kubernetes', severity: 'critical', title: 'Alpha', timestamp: 1, status: 'active', firstSeenAt: '', lastSeenAt: '', detail: '', evidence: '' },
      { id: '1', targetId: 'cluster-1', targetType: 'kubernetes', severity: 'critical', title: 'Bravo', timestamp: 5, status: 'active', firstSeenAt: '', lastSeenAt: '', detail: '', evidence: '' }
    ];

    expect(sortWorkspaceOverviewIssues(issues).map((issue) => issue.id)).toEqual(['1', '2', '3']);
  });

  it('groups connected targets and sorts attention issues across target types by urgency', () => {
    const issues: ControlPlaneIssueItem[] = [
      issue({
        id: 'ci-1',
        targetId: 'cluster-2',
        targetName: 'cluster-2',
        severity: 'warning',
        title: 'Capacity pressure',
        summary: 'Node pressure reported.',
        reason: 'MemoryPressure',
        lastSeenAt: new Date(10).toISOString()
      }),
      issue({
        id: 'ci-2',
        targetId: 'cluster-1',
        targetName: 'cluster-1',
        severity: 'critical',
        title: 'API outage',
        summary: 'API server unavailable.',
        reason: '',
        lastSeenAt: new Date(20).toISOString()
      }),
      issue({
        id: 'vf-1',
        targetId: 'vm-1',
        targetType: 'virtual_machine',
        targetName: 'vm-1',
        issueType: 'vm_host_finding',
        severity: 'warning',
        title: 'Disk almost full',
        summary: '85% used',
        reason: '',
        lastSeenAt: new Date(30).toISOString()
      })
    ];

    const result = buildWorkspaceOverviewCards({
      kubernetesClusters: [
        cluster({ id: 'cluster-1', name: 'cluster-1' }),
        cluster({ id: 'cluster-2', name: 'cluster-2', status: HealthStatus.YELLOW }),
        cluster({ id: 'cluster-3', name: 'cluster-3' })
      ],
      issues,
      virtualMachines: [
        vm({ id: 'vm-1', name: 'vm-1' }),
        vm({ id: 'vm-2', name: 'vm-2', status: 'degraded' })
      ],
      t
    });

    expect(result.attentionItems.map((item) => `${item.targetName}:${item.issue.id}`)).toEqual([
      'cluster-1:ci-2',
      'vm-1:vf-1',
      'cluster-2:ci-1'
    ]);
    expect(result.connectedClusterCards.map((card) => card.name)).toEqual(['cluster-1', 'cluster-2', 'cluster-3']);
    expect(result.connectedVirtualMachineCards.map((card) => card.name)).toEqual(['vm-1', 'vm-2']);
    expect(result.attentionItems[0].issue.evidence).toBe('API server unavailable.');
    expect(result.attentionItems[1].issue.evidence).toBe('85% used');
    expect(result.criticalIssueCount).toBe(1);
    expect(result.warningIssueCount).toBe(2);
  });
});
