import {
  Alert,
  HealthStatus,
  KubernetesCluster,
  Ingress as ClusterIngress,
  Namespace as ClusterNamespace,
  Node as ClusterNode,
  PVC as ClusterPVC,
  Service as ClusterService,
  Workload
} from '@/types';
import {
  ControlPlaneCluster,
  ControlPlaneClusterDetail,
  ControlPlaneResourcePageItem,
  SnapshotEvent,
  SnapshotMetricNode,
  SnapshotResourceCronJob,
  SnapshotResourceIngress,
  SnapshotResourceJob,
  SnapshotResourceNamespace,
  SnapshotResourceNode,
  SnapshotResourcePod,
  SnapshotResourcePVC,
  SnapshotResourceScalableWorkload,
  SnapshotResourceService
} from './types';
import {
  formatCpuCores,
  formatMemoryBytes,
  formatNamespaceScope,
  formatResourceAge,
  normalizeNamespaceList,
  normalizeServiceType,
  parseCpuToCores,
  parseMemoryToBytes,
  toArray
} from './formatters';
import { mapResourceSignals } from './resourceSignals';
import { formatUserDateTime } from '@/utils/dateTime';

const criticalPodContainerReasons = new Set([
  'crashloopbackoff',
  'imagepullbackoff',
  'errimagepull',
  'oomkilled',
  'createcontainerconfigerror'
]);

export function mapClusterStatus(status: ControlPlaneCluster['status']): HealthStatus {
  if (status === 'online') return HealthStatus.GREEN;
  if (status === 'degraded') return HealthStatus.RED;
  return HealthStatus.YELLOW;
}

function formatServicePorts(ports: SnapshotResourceService['ports']): string {
  const formatted = toArray(ports)
    .filter((port) => typeof port.port === 'number')
    .map((port) => {
      const protocol = port.protocol || 'TCP';
      const target = port.targetPort !== undefined ? `:${port.targetPort}` : '';
      const nodePort = port.nodePort !== undefined ? ` -> ${port.nodePort}` : '';
      return `${port.port}${target}/${protocol}${nodePort}`;
    });
  return formatted.length > 0 ? formatted.join(', ') : '-';
}

function inferNodeStatus(node: SnapshotResourceNode): string {
  const ready = toArray(node.status?.conditions).find((condition) => condition.type === 'Ready');
  if (!ready) return 'Unknown';
  return String(ready.status).toLowerCase() === 'true' ? 'Ready' : 'NotReady';
}

function inferNodeRole(node: SnapshotResourceNode): string {
  const labels = node.labels || {};
  if ('node-role.kubernetes.io/control-plane' in labels || 'node-role.kubernetes.io/master' in labels) {
    return 'control-plane';
  }

  for (const key of Object.keys(labels)) {
    const prefix = 'node-role.kubernetes.io/';
    if (key.startsWith(prefix) && key.length > prefix.length) {
      return key.slice(prefix.length);
    }
  }
  return 'worker';
}

function summarizeMetrics(nodes: SnapshotMetricNode[] | undefined): { cpu: string; memory: string } {
  let totalCpu = 0;
  let totalMemory = 0;
  let hasCpu = false;
  let hasMemory = false;

  for (const metricNode of toArray(nodes)) {
    const cpu = parseCpuToCores(metricNode.usage?.cpu);
    const memory = parseMemoryToBytes(metricNode.usage?.memory);
    if (cpu !== null) {
      totalCpu += cpu;
      hasCpu = true;
    }
    if (memory !== null) {
      totalMemory += memory;
      hasMemory = true;
    }
  }

  return {
    cpu: hasCpu ? formatCpuCores(totalCpu) : 'Unavailable',
    memory: hasMemory ? formatMemoryBytes(totalMemory) : 'Unavailable'
  };
}

export function mapNodes(resourceNodes: SnapshotResourceNode[] | undefined, metricNodes: SnapshotMetricNode[] | undefined): ClusterNode[] {
  const usageByNodeName = new Map<string, { cpu: string; memory: string }>();
  for (const metricNode of toArray(metricNodes)) {
    if (!metricNode.name) continue;
    usageByNodeName.set(metricNode.name, {
      cpu: formatCpuCores(parseCpuToCores(metricNode.usage?.cpu)),
      memory: formatMemoryBytes(parseMemoryToBytes(metricNode.usage?.memory))
    });
  }

  const nodes: ClusterNode[] = [];
  for (const resourceNode of toArray(resourceNodes)) {
    if (!resourceNode.name) continue;

    const usage = usageByNodeName.get(resourceNode.name);
    if (usage) {
      usageByNodeName.delete(resourceNode.name);
    }

    nodes.push({
      uid: resourceNode.uid,
      name: resourceNode.name,
      status: inferNodeStatus(resourceNode),
      role: inferNodeRole(resourceNode),
      version: resourceNode.kubeletVersion || '-',
      cpu: usage?.cpu || '-',
      memory: usage?.memory || '-',
      osImage: resourceNode.osImage,
      containerRuntimeVersion: resourceNode.containerRuntimeVersion,
      architecture: resourceNode.architecture,
      operatingSystem: resourceNode.operatingSystem,
      capacity: resourceNode.capacity,
      allocatable: resourceNode.allocatable,
      labels: resourceNode.labels,
      conditions: toArray(resourceNode.status?.conditions)
        .filter((condition) => Boolean(condition.type))
        .map((condition) => ({
          type: condition.type || 'Unknown',
          status: condition.status || 'Unknown',
          reason: condition.reason,
          message: condition.message
        }))
    });
  }

  for (const [name, usage] of usageByNodeName.entries()) {
    nodes.push({
      name,
      status: 'Unknown',
      role: 'worker',
      version: '-',
      cpu: usage.cpu,
      memory: usage.memory
    });
  }

  return nodes;
}

export function mapNamespaces(namespaces: SnapshotResourceNamespace[] | undefined): ClusterNamespace[] {
  return toArray(namespaces)
    .filter((namespace) => Boolean(namespace.name))
    .map((namespace) => ({
      id: namespace.uid || namespace.name || 'unknown',
      uid: namespace.uid,
      name: namespace.name || 'unknown',
      status: namespace.status || 'Unknown',
      age: formatResourceAge(namespace.creationTimestamp),
      labels: namespace.labels || {}
    }));
}

function mapPodStats(pods: SnapshotResourcePod[] | undefined): KubernetesCluster['podStats'] {
  let running = 0;
  let failed = 0;
  let pending = 0;

  for (const pod of toArray(pods)) {
    const hasCrashLoop = toArray(pod.containerStatuses).some((status) =>
      String(status.state?.waiting?.reason || '').toLowerCase() === 'crashloopbackoff'
    );
    if (hasCrashLoop) {
      failed += 1;
      continue;
    }

    const phase = String(pod.phase || '').toLowerCase();
    if (phase === 'running') running += 1;
    if (phase === 'pending') pending += 1;
    if (phase === 'failed') failed += 1;
  }

  return { running, failed, pending };
}

export function mapServices(services: SnapshotResourceService[] | undefined): ClusterService[] {
  return toArray(services)
    .filter((service) => Boolean(service.name))
    .map((service) => ({
      id: service.uid || `${service.namespace || 'default'}/${service.name}`,
      name: service.name || 'unknown',
      namespace: service.namespace || 'default',
      type: normalizeServiceType(service.type),
      clusterIP: service.clusterIP || '-',
      selector: service.selector || {},
      externalIPs: toArray(service.externalIPs).filter(Boolean),
      loadBalancerIP: service.loadBalancerIP,
      ports: formatServicePorts(service.ports),
      portDetails: toArray(service.ports),
      age: formatResourceAge(service.creationTimestamp)
    }));
}

export function mapIngresses(ingresses: SnapshotResourceIngress[] | undefined): ClusterIngress[] {
  return toArray(ingresses)
    .filter((ingress) => Boolean(ingress.name))
    .map((ingress) => ({
      id: ingress.uid || `${ingress.namespace || 'default'}/${ingress.name}`,
      name: ingress.name || 'unknown',
      namespace: ingress.namespace || 'default',
      ingressClassName: ingress.ingressClassName,
      hosts: toArray(ingress.hosts).filter(Boolean),
      address: ingress.address || '-',
      rules: toArray(ingress.rules).map((rule) => ({
        host: rule.host,
        paths: toArray(rule.paths).map((path) => ({
          path: path.path,
          pathType: path.pathType,
          serviceName: path.serviceName,
          servicePort: path.servicePort
        }))
      })),
      tls: toArray(ingress.tls).map((tls) => ({
        hosts: toArray(tls.hosts).filter(Boolean),
        secretName: tls.secretName
      })),
      age: formatResourceAge(ingress.creationTimestamp)
    }));
}

export function mapPVCs(pvcs: SnapshotResourcePVC[] | undefined): ClusterPVC[] {
  return toArray(pvcs)
    .filter((pvc) => Boolean(pvc.name))
    .map((pvc) => ({
      id: pvc.uid || `${pvc.namespace || 'default'}/${pvc.name}`,
      name: pvc.name || 'unknown',
      namespace: pvc.namespace || 'default',
      status: pvc.status || 'Unknown',
      capacity: pvc.capacity || '-',
      accessModes: toArray(pvc.accessModes).filter(Boolean),
      storageClass: pvc.storageClass || '-',
      volumeName: pvc.volumeName,
      volumeMode: pvc.volumeMode,
      age: formatResourceAge(pvc.creationTimestamp)
    }));
}

function mapAlerts(events: SnapshotEvent[] | undefined): Alert[] {
  return toArray(events).map((event, index) => {
    const namespace = event.involvedObject?.namespace;
    const objectKind = event.involvedObject?.kind;
    const objectName = event.involvedObject?.name || 'resource';
    const signalText = `${event.type || ''} ${event.reason || ''} ${event.message || ''}`.toLowerCase();
    const severity: Alert['severity'] = [
      'crashloop',
      'failed',
      'failure',
      'unhealthy',
      'notready',
      'backoff',
      'oom',
      'evicted'
    ].some((token) => signalText.includes(token))
      ? 'critical'
      : String(event.type || '').toLowerCase() === 'warning'
        ? 'warning'
        : 'info';
    return {
      id: `${namespace || 'default'}-${objectName}-${index}`,
      severity,
      title: event.reason || 'Cluster Event',
      message: event.message || 'No details provided.',
      timestamp: Date.parse(event.lastTimestamp || new Date().toISOString()) || Date.now(),
      namespace,
      source: 'event',
      objectKind,
      objectName,
      reason: event.reason
    };
  });
}

export function mapScalableWorkloads(
  items: SnapshotResourceScalableWorkload[] | undefined,
  type: Extract<Workload['type'], 'Deployment' | 'StatefulSet' | 'DaemonSet'>
): Workload[] {
  return toArray(items)
    .filter((item) => Boolean(item.name))
    .map((item) => {
      const desiredReplicas = Number(item.replicas ?? 0);
      const readyReplicas = Number(item.readyReplicas ?? 0);
      let status: Workload['status'] = 'Pending';
      if (desiredReplicas > 0 && readyReplicas >= desiredReplicas) status = 'Running';
      if (desiredReplicas > 0 && readyReplicas === 0) status = 'Failed';

      return {
        id: item.uid || `${type.toLowerCase()}/${item.namespace || 'default'}/${item.name}`,
        uid: item.uid,
        name: item.name || 'unknown',
        type,
        namespace: item.namespace || 'default',
        status,
        replicas: `${readyReplicas}/${desiredReplicas}`,
        desiredReplicas,
        readyReplicas,
        availableReplicas: Number(item.availableReplicas ?? 0),
        age: formatResourceAge(item.creationTimestamp)
      };
    });
}

function formatDuration(startTime?: string, completionTime?: string): string {
  const start = Date.parse(startTime || '');
  const end = Date.parse(completionTime || '');
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return '-';
  const seconds = Math.round((end - start) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function formatSnapshotTimestamp(value?: string): string {
  return formatUserDateTime(value, { fallback: '-' });
}

export function mapCronJobs(cronJobs: SnapshotResourceCronJob[] | undefined): Workload[] {
  return toArray(cronJobs)
    .filter((cronJob) => Boolean(cronJob.name))
    .map((cronJob) => ({
      id: cronJob.uid || `cronjob/${cronJob.namespace || 'default'}/${cronJob.name}`,
      uid: cronJob.uid,
      name: cronJob.name || 'unknown',
      type: 'CronJob',
      namespace: cronJob.namespace || 'default',
      status: cronJob.suspend ? 'Suspended' : Number(cronJob.active || 0) > 0 ? 'Active' : 'Scheduled',
      schedule: cronJob.schedule || '-',
      lastRun: formatSnapshotTimestamp(cronJob.lastScheduleTime),
      age: formatResourceAge(cronJob.creationTimestamp)
    }));
}

export function mapJobs(jobs: SnapshotResourceJob[] | undefined): Workload[] {
  return toArray(jobs)
    .filter((job) => Boolean(job.name))
    .map((job) => {
      const succeeded = Number(job.succeeded ?? 0);
      const failed = Number(job.failed ?? 0);
      const active = Number(job.active ?? 0);
      const desired = Number(job.completions ?? 1);
      const status: Workload['status'] =
        failed > 0 ? 'Failed' : succeeded >= desired ? 'Succeeded' : active > 0 ? 'Running' : 'Pending';
      return {
        id: job.uid || `job/${job.namespace || 'default'}/${job.name}`,
        uid: job.uid,
        name: job.name || 'unknown',
        type: 'Job',
        namespace: job.namespace || 'default',
        status,
        completions: `${succeeded}/${desired}`,
        duration: formatDuration(job.startTime, job.completionTime),
        age: formatResourceAge(job.creationTimestamp)
      };
    });
}

export function mapPodWorkloads(pods: SnapshotResourcePod[] | undefined): Workload[] {
  return toArray(pods)
    .filter((pod) => Boolean(pod.name))
    .map((pod) => {
      const criticalContainerReason = toArray(pod.containerStatuses)
        .map((status) => status.state?.waiting?.reason || status.state?.terminated?.reason)
        .find((reason) => criticalPodContainerReasons.has(String(reason || '').toLowerCase()));
      return {
        id: pod.uid || `pod/${pod.namespace || 'default'}/${pod.name}`,
        uid: pod.uid,
        name: pod.name || 'unknown',
        type: 'Pod',
        namespace: pod.namespace || 'default',
        status: criticalContainerReason || String(pod.phase || 'Unknown'),
        restarts: pod.restartCount,
        node: pod.nodeName || '-',
        containers: toArray(pod.containerStatuses).map((status) => status.name).filter(Boolean),
        containerStatuses: toArray(pod.containerStatuses)
          .filter((status) => Boolean(status.name))
          .map((status) => {
            const waitingReason = status.state?.waiting?.reason;
            const terminatedReason = status.state?.terminated?.reason;
            const state = status.state?.waiting
              ? 'waiting'
              : status.state?.terminated
                ? 'terminated'
                : 'running';
            return {
              name: status.name || 'unknown',
              ready: status.ready,
              restartCount: status.restartCount,
              state,
              reason: waitingReason || terminatedReason
            };
          }),
        age: formatResourceAge(pod.creationTimestamp)
      };
    });
}

function mapWorkloads(resources: NonNullable<NonNullable<ControlPlaneClusterDetail['latestSnapshot']>['data']>['resources']): Workload[] {
  return [
    ...mapScalableWorkloads(resources?.deployments, 'Deployment'),
    ...mapScalableWorkloads(resources?.statefulSets, 'StatefulSet'),
    ...mapScalableWorkloads(resources?.daemonSets, 'DaemonSet'),
    ...mapCronJobs(resources?.cronJobs),
    ...mapJobs(resources?.jobs),
    ...mapPodWorkloads(resources?.pods)
  ];
}

export function mapClusterResourcePageItems(items: ControlPlaneResourcePageItem[]): Pick<
  KubernetesCluster,
  'workloads' | 'services' | 'ingresses' | 'pvcs' | 'nodes' | 'namespaces'
> {
  const workloads: Workload[] = [];
  const services: ClusterService[] = [];
  const ingresses: ClusterIngress[] = [];
  const pvcs: ClusterPVC[] = [];
  const nodes: ClusterNode[] = [];
  const namespaces: ClusterNamespace[] = [];

  for (const resource of items) {
    if (resource.kind === 'Deployment' || resource.kind === 'StatefulSet' || resource.kind === 'DaemonSet') {
      workloads.push(...mapScalableWorkloads([resource.item as SnapshotResourceScalableWorkload], resource.kind));
      continue;
    }
    if (resource.kind === 'CronJob') {
      workloads.push(...mapCronJobs([resource.item as SnapshotResourceCronJob]));
      continue;
    }
    if (resource.kind === 'Job') {
      workloads.push(...mapJobs([resource.item as SnapshotResourceJob]));
      continue;
    }
    if (resource.kind === 'Pod') {
      workloads.push(...mapPodWorkloads([resource.item as SnapshotResourcePod]));
      continue;
    }
    if (resource.kind === 'Service') {
      services.push(...mapServices([resource.item as SnapshotResourceService]));
      continue;
    }
    if (resource.kind === 'Ingress') {
      ingresses.push(...mapIngresses([resource.item as SnapshotResourceIngress]));
      continue;
    }
    if (resource.kind === 'PersistentVolumeClaim') {
      pvcs.push(...mapPVCs([resource.item as SnapshotResourcePVC]));
      continue;
    }
    if (resource.kind === 'Node') {
      nodes.push(...mapNodes([resource.item as SnapshotResourceNode], undefined));
      continue;
    }
    if (resource.kind === 'Namespace') {
      namespaces.push(...mapNamespaces([resource.item as SnapshotResourceNamespace]));
    }
  }

  return { workloads, services, ingresses, pvcs, nodes, namespaces };
}

export function mapControlPlaneClusterToKubernetesCluster(cluster: ControlPlaneCluster | ControlPlaneClusterDetail): KubernetesCluster {
  const now = new Date().toISOString();
  const detail = cluster as ControlPlaneClusterDetail;
  const snapshot = detail.latestSnapshot;
  const snapshotData = snapshot?.data;
  const resources = snapshotData?.resources;
  const metricNodes = snapshotData?.metrics?.nodes;
  const workloads = mapWorkloads(resources);
  const podStats = mapPodStats(resources?.pods);
  const hasFailedWorkload = workloads.some((workload) => {
    const normalized = workload.status.toLowerCase();
    return normalized === 'failed' || normalized === 'crashloopbackoff';
  });
  const hasPendingWorkload = workloads.some((workload) => workload.status.toLowerCase() === 'pending');
  const hasSnapshotData = Boolean(snapshot?.timestamp);
  const agentConnectionState: KubernetesCluster['agentConnectionState'] =
    cluster.status === 'online' || cluster.status === 'degraded'
      ? 'connected'
      : hasSnapshotData
        ? 'disconnected'
        : 'not_installed';
  const computedStatus = hasFailedWorkload
    ? HealthStatus.RED
    : hasPendingWorkload
      ? HealthStatus.YELLOW
      : mapClusterStatus(cluster.status);
  const namespaceInclude = normalizeNamespaceList(cluster.namespaceInclude);
  const namespaceExclude = normalizeNamespaceList(cluster.namespaceExclude);

  return {
    id: cluster.id,
    name: cluster.name,
    cluster: cluster.name,
    namespace: formatNamespaceScope(namespaceInclude, namespaceExclude),
    namespaceScope: {
      include: namespaceInclude,
      exclude: namespaceExclude
    },
    writeConfirmationPolicy: cluster.writeConfirmationPolicy,
    workspaceId: cluster.workspaceId,
    agentConnectionState,
    owners: [],
    gitlabPipelines: [],
    status: computedStatus,
    podStats,
    metrics: summarizeMetrics(metricNodes),
    resourceSummary: detail.summary,
    metricHistory: [],
    lastUpdate: snapshot?.timestamp || now,
    chatSessions: [],
    mcpTools: [],
    workloads,
    nodes: mapNodes(resources?.nodes, metricNodes),
    namespaces: mapNamespaces(resources?.namespaces),
    services: mapServices(resources?.services),
    ingresses: mapIngresses(resources?.ingresses),
    pvcs: mapPVCs(resources?.pvcs),
    alerts: [
      ...mapResourceSignals(resources, snapshot?.timestamp),
      ...mapAlerts(snapshotData?.events)
    ]
  };
}
