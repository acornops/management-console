import React from 'react';
import { Braces, Database, GitBranch, Network, Server } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { InfrastructureResource, ResourceDetailsDrawer } from '@/features/kubernetes-cluster-detail/components/workloads/ResourceDetailsDrawer';
import { WorkloadDetailsDrawer } from '@/features/kubernetes-cluster-detail/components/workloads/WorkloadDetailsDrawer';
import {
  ClusterResourceCategory,
  NamespaceExplorerItem,
  NetworkResourceCategory,
  PVCExplorerItem,
  ResourceMetaPair,
  ResourceStatusPill,
  ServiceExplorerItem,
  IngressExplorerItem,
  NodeExplorerItem,
  StorageResourceCategory,
  WorkloadExplorerItem,
  classNames,
  getIcon,
  getIngressMetrics,
  getNamespaceMetrics,
  getNodeMetrics,
  getPVCMetrics,
  getServiceMetrics,
  getWorkloadMetrics,
  hasReportedValue,
  isHealthyStatus,
  sortAttentionFirst,
  resourceMetricGridClass,
  resourceRowActionClass,
  resourceRowGridClass
} from '@/features/kubernetes-cluster-detail/components/workloads/workloadExplorerParts';
import {
  InfrastructureRow,
  ResourceDetailsAction,
  ResourceList,
  ResourceMetricInline
} from '@/features/kubernetes-cluster-detail/components/workloads/resourceExplorerLayout';
import type { ControlPlanePodLogs, ControlPlanePodLogsOptions } from '@/services/controlPlaneApi';

interface WorkloadsSectionProps {
  emptyMessage?: string;
  items: WorkloadExplorerItem[];
  onSelect: (workload: WorkloadExplorerItem) => void;
  showUnhealthyOnly: boolean;
}

export const WorkloadsSection: React.FC<WorkloadsSectionProps> = ({ emptyMessage, items, onSelect, showUnhealthyOnly }) => {
  const { t } = useTranslation();

  return (
    <ResourceList
      items={items}
      emptyMessage={emptyMessage || t(showUnhealthyOnly ? 'resources.emptyUnhealthyPods' : 'workloads.emptyWorkloads')}
      renderItem={(workload) => {
        const isHealthy = isHealthyStatus(workload.status);
        const metrics = getWorkloadMetrics(workload);
        return (
          <button
            key={`${workload.clusterName}-${workload.id}`}
            type="button"
            onClick={() => onSelect(workload)}
            aria-label={`${t('workloads.details')}: ${workload.name}`}
            className={`control-target ${classNames(
              resourceRowGridClass,
              'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/30'
            )}`}
          >
            <div data-resource-row-identity="true" className="flex min-w-0 max-w-full items-center gap-4 sm:gap-5 xl:gap-6">
              <div
                className={classNames(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border',
                  workload.type === 'Deployment'
                    ? 'border-metric-blue/20 bg-metric-blue/10 text-metric-blue'
                    : 'border-accent/20 bg-accent-soft text-accent-strong'
                )}
              >
                {getIcon(workload.type)}
              </div>
              <div className="min-w-0">
                <h3 className="type-panel-title break-words [overflow-wrap:anywhere]" title={workload.name}>{workload.name}</h3>
                <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
                  <ResourceMetaPair label={t('resources.row.kind')} value={workload.type} />
                  <ResourceMetaPair label={t('resources.row.scope')} value={workload.namespace} tone="accent" />
                  <ResourceMetaPair label={t('resources.row.cluster')} value={workload.clusterName || t('common.unknown')} tone="metric" />
                </div>
              </div>
            </div>
            <div className={resourceMetricGridClass}>
              {metrics.length > 0 ? (
                metrics.map((metric) => (
                  <ResourceMetricInline key={metric.label} label={metric.label} value={metric.value} />
                ))
              ) : (
                <p className="type-label col-span-2">
                  {t('workloads.noAdditionalFields')}
                </p>
              )}
            </div>
            <div className={resourceRowActionClass}>
              <ResourceStatusPill status={workload.status} healthy={isHealthy} />
              <ResourceDetailsAction />
            </div>
          </button>
        );
      }}
    />
  );
};

interface NetworkSectionProps {
  activeCategory: NetworkResourceCategory;
  emptyMessage?: string;
  ingresses: IngressExplorerItem[];
  onSelect: (resource: InfrastructureResource) => void;
  services: ServiceExplorerItem[];
}

export const NetworkSection: React.FC<NetworkSectionProps> = ({ activeCategory, emptyMessage, ingresses, onSelect, services }) => {
  const { t } = useTranslation();
  const items = sortAttentionFirst([
    ...(activeCategory === 'All' || activeCategory === 'Service'
      ? services.map((item) => ({ kind: 'service' as const, item }))
      : []),
    ...(activeCategory === 'All' || activeCategory === 'Ingress'
      ? ingresses.map((item) => ({ kind: 'ingress' as const, item }))
      : [])
  ], (resource) => resource.kind === 'ingress' && !hasReportedValue(resource.item.address));

  return (
    <ResourceList
      items={items}
      emptyMessage={emptyMessage || t('resources.emptyNetwork')}
      renderItem={(resource) => {
        if (resource.kind === 'service') {
          const service = resource.item;
          return (
            <InfrastructureRow
              key={`${service.clusterName}-${service.id}`}
              icon={<Network className="h-6 w-6" />}
              title={service.name}
              kind={`Service/${service.type}`}
              namespace={service.namespace}
              clusterName={service.clusterName}
              status={t('workloads.active')}
              healthy
              metrics={getServiceMetrics(service)}
              onClick={() => onSelect({ kind: 'service', item: service })}
            />
          );
        }

        const ingress = resource.item;
        const routed = hasReportedValue(ingress.address);
        return (
          <InfrastructureRow
            key={`${ingress.clusterName}-${ingress.id}`}
            icon={<GitBranch className="h-6 w-6" />}
            title={ingress.name}
            kind="Ingress"
            namespace={ingress.namespace}
            clusterName={ingress.clusterName}
            status={routed ? t('workloads.routed') : t('workloads.pending')}
            healthy={routed}
            metrics={getIngressMetrics(ingress)}
            onClick={() => onSelect({ kind: 'ingress', item: ingress })}
          />
        );
      }}
    />
  );
};

interface StorageSectionProps {
  activeCategory: StorageResourceCategory;
  emptyMessage?: string;
  items: PVCExplorerItem[];
  onSelect: (resource: InfrastructureResource) => void;
}

export const StorageSection: React.FC<StorageSectionProps> = ({ activeCategory, emptyMessage, items, onSelect }) => {
  const { t } = useTranslation();
  const visibleItems = activeCategory === 'All' || activeCategory === 'PersistentVolumeClaim' ? items : [];

  return (
    <ResourceList
      items={sortAttentionFirst(visibleItems, (pvc) => !isHealthyStatus(pvc.status))}
      emptyMessage={emptyMessage || t('resources.emptyStorage')}
      renderItem={(pvc) => (
        <InfrastructureRow
          key={`${pvc.clusterName}-${pvc.id}`}
          icon={<Database className="h-6 w-6" />}
          title={pvc.name}
          kind="PersistentVolumeClaim"
          namespace={pvc.namespace}
          clusterName={pvc.clusterName}
          status={pvc.status}
          healthy={isHealthyStatus(pvc.status)}
          metrics={getPVCMetrics(pvc)}
          onClick={() => onSelect({ kind: 'pvc', item: pvc })}
        />
      )}
    />
  );
};

interface ClusterSectionProps {
  activeCategory: ClusterResourceCategory;
  emptyMessage?: string;
  namespaces: NamespaceExplorerItem[];
  nodes: NodeExplorerItem[];
  onSelect: (resource: InfrastructureResource) => void;
}

export const ClusterSection: React.FC<ClusterSectionProps> = ({ activeCategory, emptyMessage, namespaces, nodes, onSelect }) => {
  const { t } = useTranslation();
  const items = sortAttentionFirst([
    ...(activeCategory === 'All' || activeCategory === 'Node'
      ? nodes.map((item) => ({ kind: 'node' as const, item }))
      : []),
    ...(activeCategory === 'All' || activeCategory === 'Namespace'
      ? namespaces.map((item) => ({ kind: 'namespace' as const, item }))
      : [])
  ], (resource) => !isHealthyStatus(resource.item.status));

  return (
    <ResourceList
      items={items}
      emptyMessage={emptyMessage || t('resources.emptyCluster')}
      renderItem={(resource) => {
        if (resource.kind === 'node') {
          const node = resource.item;
          return (
            <InfrastructureRow
              key={`${node.clusterName}-${node.name}`}
              icon={<Server className="h-6 w-6" />}
              title={node.name}
              kind={t('resources.kinds.node')}
              namespace={t('resources.clusterScoped')}
              clusterName={node.clusterName}
              status={node.status}
              healthy={isHealthyStatus(node.status)}
              metrics={getNodeMetrics(node)}
              onClick={() => onSelect({ kind: 'node', item: node })}
            />
          );
        }

        const namespace = resource.item;
        return (
          <InfrastructureRow
            key={`${namespace.clusterName}-${namespace.id}`}
            icon={<Braces className="h-6 w-6" />}
            title={namespace.name}
            kind={t('resources.kinds.namespace')}
            namespace={t('resources.clusterScoped')}
            clusterName={namespace.clusterName}
            status={namespace.status}
            healthy={isHealthyStatus(namespace.status)}
            metrics={getNamespaceMetrics(namespace)}
            onClick={() => onSelect({ kind: 'namespace', item: namespace })}
          />
        );
      }}
    />
  );
};

interface WorkloadsExplorerDrawersProps {
  canReadPodLogs: boolean;
  onAnalyzePod?: (workload: WorkloadExplorerItem) => void;
  onCloseResource: () => void;
  onCloseWorkload: () => void;
  onLoadPodLogs?: (workload: WorkloadExplorerItem, options: ControlPlanePodLogsOptions) => Promise<ControlPlanePodLogs>;
  resource: InfrastructureResource | null;
  workload: WorkloadExplorerItem | null;
}

export const WorkloadsExplorerDrawers: React.FC<WorkloadsExplorerDrawersProps> = ({
  canReadPodLogs,
  onAnalyzePod,
  onCloseResource,
  onCloseWorkload,
  onLoadPodLogs,
  resource,
  workload
}) => (
  <>
    <WorkloadDetailsDrawer
      selectedWorkload={workload}
      canReadPodLogs={canReadPodLogs}
      onClose={onCloseWorkload}
      onAnalyzePod={onAnalyzePod}
      onLoadPodLogs={onLoadPodLogs}
    />
    <ResourceDetailsDrawer
      resource={resource}
      onClose={onCloseResource}
    />
  </>
);
