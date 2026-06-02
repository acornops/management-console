import { Alert } from '@/types';
import {
  ControlPlaneClusterDetail,
  SnapshotResourceNode,
  SnapshotResourcePod
} from '@/services/control-plane/types';
import { toArray } from '@/services/control-plane/formatters';

function inferNodeStatus(node: SnapshotResourceNode): string {
  const ready = toArray(node.status?.conditions).find((condition) => condition.type === 'Ready');
  if (!ready) return 'Unknown';
  return String(ready.status).toLowerCase() === 'true' ? 'Ready' : 'NotReady';
}

function getPodWaitingReasons(pod: SnapshotResourcePod): string[] {
  return toArray(pod.containerStatuses)
    .map((status) => status.state?.waiting?.reason || status.state?.terminated?.reason)
    .filter(Boolean);
}

function getPodRestartCount(pod: SnapshotResourcePod): number {
  const statusRestartTotal = toArray(pod.containerStatuses).reduce(
    (total, status) => total + Number(status.restartCount || 0),
    0
  );
  return Math.max(Number(pod.restartCount || 0), statusRestartTotal);
}

function buildSnapshotSignal(input: {
  id: string;
  severity: Alert['severity'];
  title: string;
  message: string;
  timestamp: string | undefined;
  namespace?: string;
  objectKind: string;
  objectName: string;
  reason: string;
}): Alert {
  return {
    id: input.id,
    severity: input.severity,
    title: input.title,
    message: input.message,
    timestamp: Date.parse(input.timestamp || '') || Date.now(),
    namespace: input.namespace,
    source: 'snapshot',
    objectKind: input.objectKind,
    objectName: input.objectName,
    reason: input.reason
  };
}

export function mapResourceSignals(
  resources: NonNullable<NonNullable<ControlPlaneClusterDetail['latestSnapshot']>['data']>['resources'] | undefined,
  snapshotTimestamp: string | undefined
): Alert[] {
  const signals: Alert[] = [];

  for (const pod of toArray(resources?.pods)) {
    if (!pod.name) continue;
    const namespace = pod.namespace || 'default';
    const reasons = getPodWaitingReasons(pod);
    const normalizedReasons = reasons.map((reason) => reason.toLowerCase());
    const phase = String(pod.phase || 'Unknown');
    const normalizedPhase = phase.toLowerCase();
    const restartCount = getPodRestartCount(pod);
    const hasCriticalReason = normalizedReasons.some((reason) =>
      ['crashloopbackoff', 'imagepullbackoff', 'errimagepull', 'oomkilled', 'createcontainerconfigerror'].includes(reason)
    );

    if (hasCriticalReason || normalizedPhase === 'failed') {
      const reason = reasons[0] || phase;
      const restartDetail = restartCount > 0 ? ` Restart count: ${restartCount}.` : '';
      signals.push(buildSnapshotSignal({
        id: `snapshot-pod-${namespace}-${pod.name}`,
        severity: 'critical',
        title: `Pod ${pod.name} is unhealthy`,
        message: `Latest snapshot reports pod ${pod.name} in namespace ${namespace} as ${reason}.${restartDetail}`,
        timestamp: snapshotTimestamp,
        namespace,
        objectKind: 'Pod',
        objectName: pod.name,
        reason
      }));
      continue;
    }

    if (normalizedPhase === 'pending') {
      signals.push(buildSnapshotSignal({
        id: `snapshot-pod-${namespace}-${pod.name}`,
        severity: 'warning',
        title: `Pod ${pod.name} is pending`,
        message: `Latest snapshot reports pod ${pod.name} in namespace ${namespace} as Pending.`,
        timestamp: snapshotTimestamp,
        namespace,
        objectKind: 'Pod',
        objectName: pod.name,
        reason: 'Pending'
      }));
    }
  }

  for (const node of toArray(resources?.nodes)) {
    if (!node.name) continue;
    const status = inferNodeStatus(node);
    if (status !== 'Ready') {
      signals.push(buildSnapshotSignal({
        id: `snapshot-node-${node.name}`,
        severity: status === 'NotReady' ? 'critical' : 'warning',
        title: `Node ${node.name} is ${status}`,
        message: `Latest snapshot reports node ${node.name} as ${status}.`,
        timestamp: snapshotTimestamp,
        objectKind: 'Node',
        objectName: node.name,
        reason: status
      }));
    }
  }

  for (const pvc of toArray(resources?.pvcs)) {
    if (!pvc.name) continue;
    const namespace = pvc.namespace || 'default';
    const status = pvc.status || 'Unknown';
    if (status !== 'Bound') {
      signals.push(buildSnapshotSignal({
        id: `snapshot-pvc-${namespace}-${pvc.name}`,
        severity: status === 'Lost' ? 'critical' : 'warning',
        title: `PVC ${pvc.name} is ${status}`,
        message: `Latest snapshot reports PVC ${pvc.name} in namespace ${namespace} as ${status}.`,
        timestamp: snapshotTimestamp,
        namespace,
        objectKind: 'PersistentVolumeClaim',
        objectName: pvc.name,
        reason: status
      }));
    }
  }

  for (const job of toArray(resources?.jobs)) {
    if (!job.name || Number(job.failed || 0) <= 0) continue;
    const namespace = job.namespace || 'default';
    signals.push(buildSnapshotSignal({
      id: `snapshot-job-${namespace}-${job.name}`,
      severity: 'critical',
      title: `Job ${job.name} has failures`,
      message: `Latest snapshot reports ${job.failed} failed pod${Number(job.failed) === 1 ? '' : 's'} for job ${job.name}.`,
      timestamp: snapshotTimestamp,
      namespace,
      objectKind: 'Job',
      objectName: job.name,
      reason: 'Failed'
    }));
  }

  return signals;
}
