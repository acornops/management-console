import { Alert, KubernetesCluster } from '@/types';

export interface InvestigationQueueItem {
  id: string;
  cluster: KubernetesCluster;
  alert: Alert;
  relatedAlerts: Alert[];
  clusterId: string;
  clusterName: string;
  severity: Alert['severity'];
  title: string;
  summary: string;
  namespace?: string;
  timestamp: number;
}

export function getInvestigationSeverityRank(severity: Alert['severity']): number {
  if (severity === 'critical') return 0;
  if (severity === 'warning') return 1;
  return 2;
}

interface PendingInvestigationItem {
  cluster: KubernetesCluster;
  alert: Alert;
  itemId: string;
  groupKey: string;
}

function normalizeFingerprintPart(value: string | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function hasAnyToken(text: string, tokens: string[]): boolean {
  return tokens.some((token) => text.includes(token));
}

function getIncidentClass(alert: Alert): string | undefined {
  const objectKind = normalizeFingerprintPart(alert.objectKind);
  const reason = normalizeFingerprintPart(alert.reason || alert.title);
  const text = `${reason} ${normalizeFingerprintPart(alert.message)}`;

  if (objectKind === 'pod') {
    if (hasAnyToken(text, ['failedscheduling', 'unschedulable', 'pending'])) return 'pod-pending';
    if (
      hasAnyToken(text, [
        'crashloopbackoff',
        'crash loop',
        'readiness probe failed',
        'liveness probe failed',
        'probe failed',
        'backoff',
        'back-off',
        'oomkilled',
        'oom',
        'unhealthy',
        'failed'
      ])
    ) {
      return 'pod-unhealthy';
    }
  }

  if (objectKind === 'node' && hasAnyToken(text, ['notready', 'not ready'])) return 'node-notready';

  if (objectKind === 'persistentvolumeclaim' || objectKind === 'pvc') {
    if (text.includes('lost')) return 'pvc-lost';
    if (hasAnyToken(text, ['pending', 'unbound', 'not bound'])) return 'pvc-unbound';
  }

  if (objectKind === 'job' && hasAnyToken(text, ['failed', 'failure'])) return 'job-failed';

  return undefined;
}

function getIncidentFingerprint(cluster: KubernetesCluster, alert: Alert): string | undefined {
  const objectKind = normalizeFingerprintPart(alert.objectKind);
  const objectName = normalizeFingerprintPart(alert.objectName);
  const incidentClass = getIncidentClass(alert);
  if (!objectKind || !objectName || !incidentClass) return undefined;

  const namespace = objectKind === 'node' ? '' : normalizeFingerprintPart(alert.namespace);
  return `${cluster.id}|${namespace}|${objectKind}|${objectName}|${incidentClass}`;
}

function sortAlertsByInvestigationRank(left: Alert, right: Alert): number {
  const severityDelta =
    getInvestigationSeverityRank(left.severity) - getInvestigationSeverityRank(right.severity);
  if (severityDelta !== 0) return severityDelta;
  return right.timestamp - left.timestamp;
}

function chooseRepresentativeAlert(alerts: Alert[]): Alert {
  return [...alerts].sort(sortAlertsByInvestigationRank)[0];
}

function getNewestTimestamp(alerts: Alert[]): number {
  return Math.max(...alerts.map((alert) => alert.timestamp));
}

export function buildInvestigationQueue(kubernetesClusters: KubernetesCluster[]): InvestigationQueueItem[] {
  const groups = new Map<string, PendingInvestigationItem[]>();

  for (const cluster of kubernetesClusters) {
    for (const alert of cluster.alerts) {
      const itemId = `${cluster.id}-${alert.id}`;
      const groupKey = getIncidentFingerprint(cluster, alert) || itemId;
      const group = groups.get(groupKey) || [];
      group.push({ cluster, alert, itemId, groupKey });
      groups.set(groupKey, group);
    }
  }

  return Array.from(groups.values())
    .map((group) => {
      const relatedAlerts = group.map((item) => item.alert).sort(sortAlertsByInvestigationRank);
      const representative = chooseRepresentativeAlert(relatedAlerts);
      const representativeItem = group.find((item) => item.alert === representative) || group[0];
      const timestamp = getNewestTimestamp(relatedAlerts);

      return {
        id: group.length > 1 ? representativeItem.groupKey : representativeItem.itemId,
        cluster: representativeItem.cluster,
        alert: representative,
        relatedAlerts,
        clusterId: representativeItem.cluster.id,
        clusterName: representativeItem.cluster.name,
        severity: representative.severity,
        title: representative.title,
        summary: representative.message,
        namespace: representative.namespace,
        timestamp
      };
    })
    .sort((left, right) => {
      const severityDelta =
        getInvestigationSeverityRank(left.severity) - getInvestigationSeverityRank(right.severity);
      if (severityDelta !== 0) return severityDelta;
      return right.timestamp - left.timestamp;
    });
}

export function getTopInvestigationQueueItem(
  queue: InvestigationQueueItem[]
): InvestigationQueueItem | undefined {
  return queue[0];
}
