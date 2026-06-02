import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Workload } from '@/types';
import {
  buildWorkloadCategoryCounts,
  buildNamespaceItems,
  buildResourceInventorySummary,
  getDefaultExplorerSelection,
  getResourceExplorerFilterState,
  getResourceExplorerResultSummaryParts,
  IngressExplorerItem,
  isHealthyStatus,
  isUnhealthyPod,
  NamespaceResourceItem,
  NodeExplorerItem,
  PVCExplorerItem,
  ResourceStatusPill,
  ResourceMetaPair,
  ServiceExplorerItem,
  WorkloadExplorerItem
} from './workloadExplorerParts';

const basePod: Workload = {
  id: 'pod-1',
  name: 'demo-pod',
  type: 'Pod',
  namespace: 'default',
  status: 'Running',
  age: '1m'
};

describe('workloadExplorerParts health helpers', () => {
  it('does not classify explicit unhealthy status as healthy', () => {
    expect(isHealthyStatus('unhealthy')).toBe(false);
    expect(isHealthyStatus('Unhealthy')).toBe(false);
  });

  it('identifies unhealthy pods only', () => {
    expect(isUnhealthyPod({ ...basePod, status: 'CrashLoopBackOff' })).toBe(true);
    expect(isUnhealthyPod({ ...basePod, status: 'Running' })).toBe(false);
    expect(isUnhealthyPod({ ...basePod, type: 'Deployment', status: 'CrashLoopBackOff' })).toBe(false);
  });

  it('treats bound storage and active namespaces as healthy states', () => {
    expect(isHealthyStatus('Bound')).toBe(true);
    expect(isHealthyStatus('Active')).toBe(true);
  });
});

describe('ResourceStatusPill', () => {
  it('keeps long operational statuses available without relying on visible truncation', () => {
    const html = renderToStaticMarkup(
      React.createElement(ResourceStatusPill, { status: 'CrashLoopBackOff', healthy: false })
    );

    expect(html).toContain('title="CrashLoopBackOff"');
    expect(html).toContain('aria-label="Status: CrashLoopBackOff"');
    expect(html).not.toContain('truncate');
    expect(html).toContain('[overflow-wrap:anywhere]');
    expect(html).not.toContain('whitespace-nowrap');
  });
});

describe('ResourceMetaPair', () => {
  it('keeps resource metadata values in their exact reported casing', () => {
    const html = renderToStaticMarkup(
      React.createElement(ResourceMetaPair, {
        label: 'Cluster',
        value: 'prod-us-east-platform-payments-primary-blue',
        tone: 'metric'
      })
    );

    expect(html).toContain('prod-us-east-platform-payments-primary-blue');
    expect(html).toContain('normal-case');
    expect(html).toContain('tracking-normal');
  });
});

describe('resource explorer selection helpers', () => {
  it('defaults to unhealthy pod triage when unhealthy pods exist', () => {
    expect(getDefaultExplorerSelection(2)).toEqual({
      activeResourceFamily: 'workloads',
      activeCategory: 'All',
      showUnhealthyPodsOnly: true
    });
  });

  it('defaults to all workloads when there are no unhealthy pods', () => {
    expect(getDefaultExplorerSelection(0)).toEqual({
      activeResourceFamily: 'workloads',
      activeCategory: 'All',
      showUnhealthyPodsOnly: false
    });
  });

  it('describes a namespaced category view for the result summary', () => {
    expect(getResourceExplorerResultSummaryParts({
      activeResourceFamily: 'network',
      activeCategory: 'Service',
      selectedNamespace: 'payments',
      showNamespaceFilter: true,
      showUnhealthyPodsOnly: false,
      visibleCount: 3
    })).toEqual({
      summaryKey: 'resources.summary.namespaced',
      familyLabelKey: 'resources.families.network',
      categoryLabelKey: 'resources.categories.Service',
      namespace: 'payments',
      visibleCount: 3
    });
  });

  it('describes promoted unhealthy pod triage for the result summary', () => {
    expect(getResourceExplorerResultSummaryParts({
      activeResourceFamily: 'workloads',
      activeCategory: 'Pod',
      selectedNamespace: 'All',
      showNamespaceFilter: true,
      showUnhealthyPodsOnly: true,
      visibleCount: 2
    })).toEqual({
      summaryKey: 'resources.summary.namespaced',
      familyLabelKey: 'resources.families.workloads',
      categoryLabelKey: 'resources.summary.unhealthyPodsCategory',
      namespace: 'All',
      visibleCount: 2
    });
  });

  it('describes cluster-scoped resource views without namespace context', () => {
    expect(getResourceExplorerResultSummaryParts({
      activeResourceFamily: 'cluster',
      activeCategory: 'Node',
      selectedNamespace: 'payments',
      showNamespaceFilter: false,
      showUnhealthyPodsOnly: false,
      visibleCount: 5
    })).toEqual({
      summaryKey: 'resources.summary.clusterScoped',
      familyLabelKey: 'resources.families.cluster',
      categoryLabelKey: 'resources.categories.Node',
      visibleCount: 5
    });
  });

  it('counts only secondary filters so the family tab remains the primary mode', () => {
    expect(getResourceExplorerFilterState({
      activeResourceFamily: 'network',
      activeCategory: 'Deployment',
      activeNetworkCategory: 'Ingress',
      activeStorageCategory: 'All',
      activeClusterCategory: 'All',
      selectedNamespace: 'payments',
      showNamespaceFilter: true,
      showUnhealthyPodsOnly: false
    })).toEqual({
      activeFilters: [
        {
          id: 'namespace',
          labelKey: 'resources.filters.namespaceChip',
          value: 'payments'
        },
        {
          id: 'category',
          labelKey: 'resources.filters.categoryChip',
          valueLabelKey: 'resources.categories.Ingress'
        }
      ],
      activeFilterCount: 2,
      canResetFilters: true
    });
  });

  it('treats unhealthy pod triage as one resettable filter', () => {
    expect(getResourceExplorerFilterState({
      activeResourceFamily: 'workloads',
      activeCategory: 'All',
      activeNetworkCategory: 'All',
      activeStorageCategory: 'All',
      activeClusterCategory: 'All',
      selectedNamespace: 'All',
      showNamespaceFilter: true,
      showUnhealthyPodsOnly: true
    })).toEqual({
      activeFilters: [
        {
          id: 'unhealthyPods',
          labelKey: 'resources.filters.unhealthyPodsChip'
        }
      ],
      activeFilterCount: 1,
      canResetFilters: false
    });
  });

  it('builds one namespace chip for a namespace-only filter', () => {
    expect(getResourceExplorerFilterState({
      activeResourceFamily: 'workloads',
      activeCategory: 'All',
      activeNetworkCategory: 'All',
      activeStorageCategory: 'All',
      activeClusterCategory: 'All',
      selectedNamespace: 'payments',
      showNamespaceFilter: true,
      showUnhealthyPodsOnly: false
    })).toEqual({
      activeFilters: [
        {
          id: 'namespace',
          labelKey: 'resources.filters.namespaceChip',
          value: 'payments'
        }
      ],
      activeFilterCount: 1,
      canResetFilters: false
    });
  });

  it('builds one category chip for the current resource family', () => {
    expect(getResourceExplorerFilterState({
      activeResourceFamily: 'storage',
      activeCategory: 'Deployment',
      activeNetworkCategory: 'Ingress',
      activeStorageCategory: 'PersistentVolumeClaim',
      activeClusterCategory: 'Node',
      selectedNamespace: 'All',
      showNamespaceFilter: true,
      showUnhealthyPodsOnly: false
    })).toEqual({
      activeFilters: [
        {
          id: 'category',
          labelKey: 'resources.filters.categoryChip',
          valueLabelKey: 'resources.categories.PersistentVolumeClaim'
        }
      ],
      activeFilterCount: 1,
      canResetFilters: false
    });
  });

  it('marks reset eligible only when multiple secondary filters are active', () => {
    expect(getResourceExplorerFilterState({
      activeResourceFamily: 'workloads',
      activeCategory: 'DaemonSet',
      activeNetworkCategory: 'All',
      activeStorageCategory: 'All',
      activeClusterCategory: 'All',
      selectedNamespace: 'platform',
      showNamespaceFilter: true,
      showUnhealthyPodsOnly: false
    })).toMatchObject({
      activeFilterCount: 2,
      canResetFilters: true
    });
  });

  it('counts workload categories inside the current namespace scope', () => {
    expect(buildWorkloadCategoryCounts({
      workloads: [
        { ...basePod, id: 'pod-1', namespace: 'payments', status: 'CrashLoopBackOff' },
        { ...basePod, id: 'pod-2', namespace: 'payments', status: 'Running' },
        { ...basePod, id: 'deploy-1', type: 'Deployment', namespace: 'payments', status: 'Healthy' },
        { ...basePod, id: 'job-1', type: 'Job', namespace: 'platform', status: 'Completed' }
      ],
      selectedNamespace: 'payments'
    })).toEqual({
      All: 3,
      Deployment: 1,
      StatefulSet: 0,
      DaemonSet: 0,
      CronJob: 0,
      Job: 0,
      Pod: 2
    });
  });
});

describe('buildResourceInventorySummary', () => {
  it('summarizes workload triage visibility and unhealthy pod attention', () => {
    expect(buildResourceInventorySummary({
      resources: [
        { kind: 'Pod', status: 'CrashLoopBackOff', healthy: false, namespace: 'default' },
        { kind: 'Pod', status: 'Running', healthy: true, namespace: 'default' },
        { kind: 'Deployment', status: 'Healthy', healthy: true, namespace: 'payments' }
      ],
      selectedNamespace: 'All',
      showNamespaceFilter: true
    })).toEqual({
      visibleCount: 3,
      healthyCount: 2,
      attentionCount: 1,
      kindCounts: [
        { kind: 'Pod', count: 2 },
        { kind: 'Deployment', count: 1 }
      ],
      namespaceScopeKey: 'resources.inventory.allNamespaces'
    });
  });

  it('summarizes workload browse mode across visible resource kinds', () => {
    expect(buildResourceInventorySummary({
      resources: [
        { kind: 'Deployment', status: 'Healthy', namespace: 'default' },
        { kind: 'StatefulSet', status: 'Ready', namespace: 'default' },
        { kind: 'Pod', status: 'Running', namespace: 'default' }
      ],
      selectedNamespace: 'default',
      showNamespaceFilter: true
    })).toEqual({
      visibleCount: 3,
      healthyCount: 3,
      attentionCount: 0,
      kindCounts: [
        { kind: 'Deployment', count: 1 },
        { kind: 'Pod', count: 1 },
        { kind: 'StatefulSet', count: 1 }
      ],
      namespaceScopeKey: 'resources.inventory.namespace',
      namespace: 'default'
    });
  });

  it('summarizes mixed network resources by routed and pending state', () => {
    expect(buildResourceInventorySummary({
      resources: [
        { kind: 'Service', status: 'Active', healthy: true, namespace: 'default' },
        { kind: 'Ingress', status: 'Routed', healthy: true, namespace: 'default' },
        { kind: 'Ingress', status: 'Pending', healthy: false, namespace: 'payments' }
      ],
      selectedNamespace: 'default',
      showNamespaceFilter: true
    })).toEqual({
      visibleCount: 3,
      healthyCount: 2,
      attentionCount: 1,
      kindCounts: [
        { kind: 'Ingress', count: 2 },
        { kind: 'Service', count: 1 }
      ],
      namespaceScopeKey: 'resources.inventory.namespace',
      namespace: 'default'
    });
  });

  it('summarizes storage PVC bound and pending status mix', () => {
    expect(buildResourceInventorySummary({
      resources: [
        { kind: 'PersistentVolumeClaim', status: 'Bound' },
        { kind: 'PersistentVolumeClaim', status: 'Pending' }
      ],
      selectedNamespace: 'All',
      showNamespaceFilter: true
    })).toEqual({
      visibleCount: 2,
      healthyCount: 1,
      attentionCount: 1,
      kindCounts: [{ kind: 'PersistentVolumeClaim', count: 2 }],
      namespaceScopeKey: 'resources.inventory.allNamespaces'
    });
  });

  it('summarizes cluster Node and Namespace resources as cluster scoped', () => {
    expect(buildResourceInventorySummary({
      resources: [
        { kind: 'Node', status: 'Ready' },
        { kind: 'Node', status: 'NotReady' },
        { kind: 'Namespace', status: 'Active' }
      ],
      selectedNamespace: 'default',
      showNamespaceFilter: false
    })).toEqual({
      visibleCount: 3,
      healthyCount: 2,
      attentionCount: 1,
      kindCounts: [
        { kind: 'Node', count: 2 },
        { kind: 'Namespace', count: 1 }
      ],
      namespaceScopeKey: 'resources.inventory.clusterScoped'
    });
  });
});

describe('buildNamespaceItems', () => {
  it('counts related resources per namespace without changing namespace shape', () => {
    const namespaces: NamespaceResourceItem[] = [
      { id: 'ns-default', name: 'default', status: 'Active', age: '4d', clusterName: '' },
      { id: 'ns-payments', name: 'payments', status: 'Active', age: '2d', clusterName: 'reported-cluster' }
    ];
    const workloads: WorkloadExplorerItem[] = [
      { ...basePod, id: 'pod-default-1', namespace: 'default', clusterName: 'fallback-cluster' },
      { ...basePod, id: 'pod-default-2', namespace: 'default', clusterName: 'fallback-cluster' },
      { ...basePod, id: 'pod-payments', namespace: 'payments', clusterName: 'fallback-cluster' }
    ];
    const services: ServiceExplorerItem[] = [
      { id: 'svc-default', name: 'web', namespace: 'default', type: 'ClusterIP', clusterIP: '10.0.0.1', ports: '80/TCP', age: '1d', clusterName: 'fallback-cluster' },
      { id: 'svc-other', name: 'api', namespace: 'other', type: 'ClusterIP', clusterIP: '10.0.0.2', ports: '80/TCP', age: '1d', clusterName: 'fallback-cluster' }
    ];
    const ingresses: IngressExplorerItem[] = [
      { id: 'ing-payments', name: 'payments', namespace: 'payments', hosts: ['pay.example.com'], address: '1.2.3.4', age: '1d', clusterName: 'fallback-cluster' }
    ];
    const pvcs: PVCExplorerItem[] = [
      { id: 'pvc-default', name: 'data', namespace: 'default', status: 'Bound', capacity: '10Gi', storageClass: 'standard', accessModes: ['ReadWriteOnce'], age: '1d', clusterName: 'fallback-cluster' }
    ];
    const nodes: NodeExplorerItem[] = [
      { name: 'node-1', status: 'Ready', role: 'worker', version: 'v1.29', cpu: '4', memory: '16Gi', clusterName: 'node-cluster' }
    ];

    expect(buildNamespaceItems({ namespaces, workloads, services, ingresses, pvcs, nodes })).toEqual([
      {
        ...namespaces[0],
        clusterName: 'fallback-cluster',
        workloadCount: 2,
        serviceCount: 1,
        ingressCount: 0,
        pvcCount: 1
      },
      {
        ...namespaces[1],
        clusterName: 'reported-cluster',
        workloadCount: 1,
        serviceCount: 0,
        ingressCount: 1,
        pvcCount: 0
      }
    ]);
  });
});
