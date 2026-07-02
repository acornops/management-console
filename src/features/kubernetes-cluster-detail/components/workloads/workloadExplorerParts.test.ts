import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Workload } from '@/types';
import {
  buildWorkloadCategoryCounts,
  buildNamespaceItems,
  getDefaultExplorerSelection,
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
