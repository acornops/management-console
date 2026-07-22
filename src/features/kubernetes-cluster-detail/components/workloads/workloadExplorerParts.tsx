import React from 'react';
import { Activity, Box, Layers, Repeat, Zap } from 'lucide-react';
import { ControlPlanePodLogs, ControlPlanePodLogsOptions } from '@/services/controlPlaneApi';
import { Ingress, Namespace, Node as K8sNode, PVC, Service, Workload } from '@/types';

export interface WorkloadExplorerItem extends Workload {
  clusterName: string;
  clusterId?: string;
  workspaceId?: string;
}

export interface ServiceExplorerItem extends Service {
  clusterName: string;
}

export interface IngressExplorerItem extends Ingress {
  clusterName: string;
}

export interface PVCExplorerItem extends PVC {
  clusterName: string;
}

export interface NodeExplorerItem extends K8sNode {
  clusterName: string;
}

export interface NamespaceExplorerItem extends Namespace {
  clusterName: string;
  workloadCount: number;
  serviceCount: number;
  ingressCount: number;
  pvcCount: number;
}

export interface NamespaceResourceItem extends Namespace {
  clusterName: string;
}

export interface WorkloadsExplorerProps {
  title?: string;
  description: string;
  workloads: WorkloadExplorerItem[];
  services?: ServiceExplorerItem[];
  ingresses?: IngressExplorerItem[];
  pvcs?: PVCExplorerItem[];
  nodes?: NodeExplorerItem[];
  namespaces?: NamespaceResourceItem[];
  canReadPodLogs?: boolean;
  isLoadingInitial?: boolean;
  isLoadingMore?: boolean;
  hasMoreResources?: boolean;
  resourceListError?: string | null;
  resourceFamilyCounts?: Record<ResourceFamily, number>;
  resourceKindCounts?: Record<string, number>;
  onResourceQueryChange?: (query: {
    family: ResourceFamily;
    kind?: string;
    namespace?: string;
    health?: string;
    q?: string;
  }) => void;
  onLoadMoreResources?: () => void;
  loadMoreSentinelRef?: React.RefCallback<HTMLDivElement>;
  onLoadPodLogs?: (workload: WorkloadExplorerItem, options: ControlPlanePodLogsOptions) => Promise<ControlPlanePodLogs>;
  onAnalyzePod?: (workload: WorkloadExplorerItem) => void;
}

export type ResourceFamily = 'workloads' | 'network' | 'storage' | 'cluster';
export type NetworkResourceCategory = 'All' | 'Service' | 'Ingress';
export type StorageResourceCategory = 'All' | 'PersistentVolumeClaim';
export type ClusterResourceCategory = 'All' | 'Node' | 'Namespace';
export type WorkloadDetailTab = 'details' | 'logs';

export interface ResourceExplorerSelection {
  activeResourceFamily: ResourceFamily;
  activeCategory: 'All' | Workload['type'];
  showUnhealthyPodsOnly: boolean;
}

export type WorkloadCategoryCounts = Record<'All' | Workload['type'], number>;

export const workloadCategories: ReadonlyArray<'All' | Workload['type']> = [
  'All',
  'Deployment',
  'StatefulSet',
  'DaemonSet',
  'CronJob',
  'Job',
  'Pod'
];

export const networkResourceCategories: ReadonlyArray<NetworkResourceCategory> = ['All', 'Service', 'Ingress'];
export const storageResourceCategories: ReadonlyArray<StorageResourceCategory> = ['All', 'PersistentVolumeClaim'];
export const clusterResourceCategories: ReadonlyArray<ClusterResourceCategory> = ['All', 'Node', 'Namespace'];

export function getDefaultExplorerSelection(unhealthyPodCount: number): ResourceExplorerSelection {
  if (unhealthyPodCount > 0) {
    return {
      activeResourceFamily: 'workloads',
      activeCategory: 'All',
      showUnhealthyPodsOnly: true
    };
  }

  return {
    activeResourceFamily: 'workloads',
    activeCategory: 'All',
    showUnhealthyPodsOnly: false
  };
}

export function buildWorkloadCategoryCounts({
  workloads,
  selectedNamespace
}: {
  workloads: Workload[];
  selectedNamespace: string;
}): WorkloadCategoryCounts {
  const counts = Object.fromEntries(
    workloadCategories.map((category) => [category, 0])
  ) as WorkloadCategoryCounts;
  const scopedWorkloads = workloads.filter(
    (workload) => selectedNamespace === 'All' || workload.namespace === selectedNamespace
  );

  counts.All = scopedWorkloads.length;
  scopedWorkloads.forEach((workload) => {
    counts[workload.type] += 1;
  });

  return counts;
}

function countByNamespace(items: Array<{ namespace: string }>): Map<string, number> {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    counts.set(item.namespace, (counts.get(item.namespace) || 0) + 1);
  });
  return counts;
}

export function buildNamespaceItems({
  namespaces,
  workloads,
  services,
  ingresses,
  pvcs,
  nodes
}: {
  namespaces: NamespaceResourceItem[];
  workloads: Array<{ namespace: string; clusterName?: string }>;
  services: Array<{ namespace: string; clusterName?: string }>;
  ingresses: Array<{ namespace: string; clusterName?: string }>;
  pvcs: Array<{ namespace: string; clusterName?: string }>;
  nodes: Array<{ clusterName?: string }>;
}): NamespaceExplorerItem[] {
  const workloadCounts = countByNamespace(workloads);
  const serviceCounts = countByNamespace(services);
  const ingressCounts = countByNamespace(ingresses);
  const pvcCounts = countByNamespace(pvcs);
  const fallbackClusterName =
    workloads[0]?.clusterName ||
    services[0]?.clusterName ||
    ingresses[0]?.clusterName ||
    pvcs[0]?.clusterName ||
    nodes[0]?.clusterName ||
    '';

  return namespaces.map((namespace) => ({
    ...namespace,
    clusterName: namespace.clusterName || fallbackClusterName,
    workloadCount: workloadCounts.get(namespace.name) || 0,
    serviceCount: serviceCounts.get(namespace.name) || 0,
    ingressCount: ingressCounts.get(namespace.name) || 0,
    pvcCount: pvcCounts.get(namespace.name) || 0
  }));
}

export function classNames(...values: Array<string | false | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export const resourceRowGridClass =
  'group grid w-full min-w-0 max-w-full grid-cols-1 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-ui-bg/70 sm:px-5 sm:py-4 xl:grid-cols-[minmax(24rem,1.8fr)_minmax(14rem,0.7fr)_minmax(15rem,max-content)] xl:gap-5';

export const resourceRowHeaderClass =
  'hidden w-full min-w-0 max-w-full bg-ui-bg/60 px-4 py-3 sm:px-5 xl:grid xl:grid-cols-[minmax(24rem,1.8fr)_minmax(14rem,0.7fr)_minmax(15rem,max-content)] xl:gap-5';

export const resourceRowActionClass =
  'flex min-w-0 flex-wrap items-center justify-start gap-3 xl:flex-nowrap xl:justify-end xl:justify-self-end';

export const resourceMetricGridClass =
  'grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(4.5rem,max-content)] gap-x-4 gap-y-2 sm:gap-x-5 xl:grid-cols-[minmax(0,1fr)_minmax(3.75rem,max-content)]';

export function getIcon(type: Workload['type']): React.ReactNode {
  if (type === 'Deployment') return <Repeat className="h-6 w-6" />;
  if (type === 'StatefulSet') return <Layers className="h-6 w-6" />;
  if (type === 'DaemonSet') return <Box className="h-6 w-6" />;
  if (type === 'CronJob') return <Activity className="h-6 w-6" />;
  return <Zap className="h-6 w-6" />;
}

export function isHealthyStatus(status: string): boolean {
  const normalized = status.toLowerCase();
  const compactStatus = normalized.replace(/[\s_-]+/g, '');
  if (
    compactStatus.includes('unhealthy') ||
    compactStatus.includes('notready') ||
    compactStatus.includes('pending') ||
    compactStatus.includes('failed') ||
    compactStatus.includes('error') ||
    compactStatus.includes('crashloop')
  ) return false;
  return (
    normalized.includes('healthy') ||
    normalized.includes('running') ||
    normalized.includes('ready') ||
    normalized.includes('active') ||
    normalized.includes('bound') ||
    normalized.includes('scheduled') ||
    normalized.includes('suspended') ||
    normalized.includes('succeeded') ||
    normalized.includes('completed')
  );
}

export function isUnhealthyPod(workload: Workload): boolean {
  return workload.type === 'Pod' && !isHealthyStatus(workload.status);
}

export function hasReportedValue(value: string | number | undefined | null): boolean {
  if (value === null || value === undefined) return false;
  return String(value).trim() !== '' && String(value).trim() !== '-';
}

export function sortAttentionFirst<T>(items: T[], hasAttention: (item: T) => boolean): T[] {
  return items
    .map((item, index) => ({ item, index, hasAttention: hasAttention(item) }))
    .sort((first, second) => Number(second.hasAttention) - Number(first.hasAttention) || first.index - second.index)
    .map(({ item }) => item);
}

export function formatOptionalNumber(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '-';
}

export function isScalableWorkload(type: Workload['type']): boolean {
  return type === 'Deployment' || type === 'StatefulSet' || type === 'DaemonSet';
}

export function getContainerStatusLabel(status: NonNullable<Workload['containerStatuses']>[number]): string {
  const state = status.state || 'unknown';
  if (status.reason) return `${state}: ${status.reason}`;
  return state;
}

export function getWorkloadMetrics(workload: WorkloadExplorerItem): Array<{ label: string; value: string }> {
  if (workload.type === 'Pod') {
    return [
      ...(hasReportedValue(workload.node) ? [{ label: 'Node', value: String(workload.node) }] : []),
      { label: 'Restarts', value: String(workload.restarts ?? 0) }
    ];
  }

  if (workload.type === 'CronJob') {
    return [
      ...(hasReportedValue(workload.schedule) ? [{ label: 'Schedule', value: String(workload.schedule) }] : []),
      ...(hasReportedValue(workload.lastRun) ? [{ label: 'Last Run', value: String(workload.lastRun) }] : [])
    ];
  }

  if (workload.type === 'Job') {
    return [
      ...(hasReportedValue(workload.completions) ? [{ label: 'Completions', value: String(workload.completions) }] : []),
      ...(hasReportedValue(workload.duration) ? [{ label: 'Duration', value: String(workload.duration) }] : [])
    ];
  }

  return [
    ...(hasReportedValue(workload.replicas) ? [{ label: 'Replicas', value: String(workload.replicas) }] : [])
  ];
}

export function getServiceMetrics(service: ServiceExplorerItem): Array<{ label: string; value: string }> {
  return [
    { label: 'Type', value: service.type },
    { label: 'Cluster IP', value: service.clusterIP },
    { label: 'Ports', value: service.ports },
    { label: 'Age', value: service.age }
  ].filter((metric) => hasReportedValue(metric.value));
}

export function getIngressMetrics(ingress: IngressExplorerItem): Array<{ label: string; value: string }> {
  return [
    { label: 'Hosts', value: ingress.hosts.length > 0 ? ingress.hosts.join(', ') : '-' },
    { label: 'Address', value: ingress.address },
    { label: 'Age', value: ingress.age }
  ].filter((metric) => hasReportedValue(metric.value));
}

export function getPVCMetrics(pvc: PVCExplorerItem): Array<{ label: string; value: string }> {
  return [
    { label: 'Capacity', value: pvc.capacity },
    { label: 'Class', value: pvc.storageClass },
    { label: 'Modes', value: pvc.accessModes.length > 0 ? pvc.accessModes.join(', ') : '-' },
    { label: 'Age', value: pvc.age }
  ].filter((metric) => hasReportedValue(metric.value));
}

export function getNodeMetrics(node: NodeExplorerItem): Array<{ label: string; value: string }> {
  return [
    { label: 'Role', value: node.role },
    { label: 'Version', value: node.version },
    { label: 'CPU', value: node.cpu },
    { label: 'Memory', value: node.memory }
  ].filter((metric) => hasReportedValue(metric.value));
}

export function getNamespaceMetrics(namespace: NamespaceExplorerItem): Array<{ label: string; value: string }> {
  return [
    { label: 'Workloads', value: String(namespace.workloadCount) },
    { label: 'Services', value: String(namespace.serviceCount) },
    { label: 'Ingresses', value: String(namespace.ingressCount) },
    { label: 'PVCs', value: String(namespace.pvcCount) },
    { label: 'Age', value: namespace.age }
  ];
}

export const ResourceMetaPair: React.FC<{
  label: string;
  value: string;
  tone?: 'neutral' | 'accent' | 'metric';
}> = ({ label, value, tone = 'neutral' }) => (
  <span
    className="type-micro-label inline-flex min-w-0 max-w-full flex-wrap items-center gap-1.5"
    title={`${label}: ${value}`}
  >
    <span className="shrink-0 text-ui-text-muted">{label}</span>
    <span
      className={classNames(
        'min-w-0 max-w-full break-words rounded-full border px-2 py-0.5 normal-case tracking-normal [overflow-wrap:anywhere]',
        tone === 'accent'
          ? 'border-accent/20 bg-accent-soft text-accent-strong'
          : tone === 'metric'
            ? 'border-metric-blue/20 bg-metric-blue/10 text-metric-blue'
            : 'border-ui-border bg-ui-bg text-ui-text'
      )}
    >
      {value}
    </span>
  </span>
);

export const ResourceStatusPill: React.FC<{ status: string; healthy: boolean }> = ({ status, healthy }) => (
  <span
    title={status}
    aria-label={`Status: ${status}`}
    className={classNames(
      'inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold leading-4',
      healthy
        ? 'border-status-success/20 bg-status-success-soft text-status-success-text'
        : 'border-status-warning/20 bg-status-warning-soft text-status-warning-text'
    )}
  >
    <span
      aria-hidden="true"
      className={classNames('h-2 w-2 shrink-0 rounded-full', healthy ? 'bg-status-success' : 'bg-status-warning')}
    />
    <span className="min-w-0 break-words text-left [overflow-wrap:anywhere]">{status}</span>
  </span>
);
