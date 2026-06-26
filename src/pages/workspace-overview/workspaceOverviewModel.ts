import type { ControlPlaneIssueItem, ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import { HealthStatus, type KubernetesCluster } from '@/types';
import { getVmStatusLabel, statusTone } from '@/pages/virtual-machines/virtualMachineUi';
import { getEffectiveHealthStatus } from '@/utils/telemetry';

export type WorkspaceOverviewSeverity = 'critical' | 'warning' | 'info';

export interface WorkspaceOverviewIssue {
  id: string;
  targetId: string;
  targetType: 'kubernetes' | 'virtual_machine';
  severity: WorkspaceOverviewSeverity;
  title: string;
  timestamp: number;
  status: ControlPlaneIssueItem['status'];
  firstSeenAt: string;
  lastSeenAt: string;
  detail: string;
  evidence: string;
}

export interface WorkspaceOverviewTargetCard {
  targetId: string;
  targetType: 'kubernetes' | 'virtual_machine';
  name: string;
  postureLabel: string;
  postureTone: string;
}

export interface WorkspaceOverviewAttentionItem {
  issue: WorkspaceOverviewIssue;
  targetId: string;
  targetType: 'kubernetes' | 'virtual_machine';
  targetName: string;
  targetTypeLabel: string;
}

type OverviewTranslator = (key: string, options?: Record<string, unknown>) => string;

export function getSeverityRank(severity: WorkspaceOverviewSeverity): number {
  if (severity === 'critical') return 0;
  if (severity === 'warning') return 1;
  return 2;
}

export function sortWorkspaceOverviewIssues(issues: WorkspaceOverviewIssue[]): WorkspaceOverviewIssue[] {
  return [...issues].sort((left, right) => {
    const severityDelta = getSeverityRank(left.severity) - getSeverityRank(right.severity);
    if (severityDelta !== 0) return severityDelta;
    if (right.timestamp !== left.timestamp) return right.timestamp - left.timestamp;
    const titleDelta = left.title.localeCompare(right.title);
    if (titleDelta !== 0) return titleDelta;
    return left.id.localeCompare(right.id);
  });
}

function clusterPostureLabel(status: HealthStatus, t: OverviewTranslator): string {
  if (status === HealthStatus.GREEN) return t('overview.healthy');
  if (status === HealthStatus.YELLOW) return t('overview.warning');
  return t('overview.critical');
}

function clusterPostureTone(status: HealthStatus): string {
  if (status === HealthStatus.GREEN) return 'bg-status-success-soft text-status-success-text';
  if (status === HealthStatus.YELLOW) return 'bg-status-warning-soft text-status-warning-text';
  return 'bg-status-danger-soft text-status-danger-text';
}

function compactText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function isConnectedCluster(cluster: KubernetesCluster): boolean {
  return cluster.agentConnectionState === 'connected';
}

export function isConnectedVirtualMachine(virtualMachine: ControlPlaneVirtualMachine): boolean {
  return virtualMachine.status === 'online' || virtualMachine.status === 'degraded';
}

function issueDetail(item: ControlPlaneIssueItem, t: OverviewTranslator): string {
  const object = [compactText(item.objectKind), compactText(item.objectName)].filter(Boolean).join(' ');
  const defaultScope = item.targetType === 'kubernetes' ? t('overview.clusterWide') : t('overview.targetWide');
  return [compactText(item.namespace || item.scopeName) || defaultScope, object].filter(Boolean).join(' · ');
}

export function mapControlPlaneIssueToOverviewIssue(
  item: ControlPlaneIssueItem,
  t: OverviewTranslator
): WorkspaceOverviewIssue {
  return {
    id: item.id,
    targetId: item.targetId,
    targetType: item.targetType,
    severity: item.severity,
    title: item.title,
    timestamp: Date.parse(item.lastSeenAt || item.updatedAt) || Date.now(),
    status: item.status,
    firstSeenAt: item.firstSeenAt,
    lastSeenAt: item.lastSeenAt,
    detail: issueDetail(item, t),
    evidence: compactText(item.reason) || compactText(item.summary)
  };
}

export function buildWorkspaceOverviewCards(args: {
  kubernetesClusters: KubernetesCluster[];
  issues: ControlPlaneIssueItem[];
  virtualMachines: ControlPlaneVirtualMachine[];
  t: OverviewTranslator;
}): {
  attentionItems: WorkspaceOverviewAttentionItem[];
  connectedClusterCards: WorkspaceOverviewTargetCard[];
  connectedVirtualMachineCards: WorkspaceOverviewTargetCard[];
  criticalIssueCount: number;
  warningIssueCount: number;
} {
  const { kubernetesClusters, issues, virtualMachines, t } = args;
  const clustersById = new Map(kubernetesClusters.map((cluster) => [cluster.id, cluster]));
  const virtualMachinesById = new Map(virtualMachines.map((vm) => [vm.id, vm]));

  const attentionItems: WorkspaceOverviewAttentionItem[] = [];
  const connectedClusterCards: WorkspaceOverviewTargetCard[] = [];
  const connectedVirtualMachineCards: WorkspaceOverviewTargetCard[] = [];

  for (const cluster of kubernetesClusters) {
    if (!isConnectedCluster(cluster)) continue;
    const healthStatus = getEffectiveHealthStatus(cluster);
    const card: WorkspaceOverviewTargetCard = {
      targetId: cluster.id,
      targetType: 'kubernetes',
      name: cluster.name,
      postureLabel: clusterPostureLabel(healthStatus, t),
      postureTone: clusterPostureTone(healthStatus)
    };

    connectedClusterCards.push(card);
  }

  for (const virtualMachine of virtualMachines) {
    if (!isConnectedVirtualMachine(virtualMachine)) continue;
    const card: WorkspaceOverviewTargetCard = {
      targetId: virtualMachine.id,
      targetType: 'virtual_machine',
      name: virtualMachine.name,
      postureLabel: getVmStatusLabel(virtualMachine.status, t),
      postureTone: statusTone(virtualMachine.status)
    };

    connectedVirtualMachineCards.push(card);
  }

  attentionItems.push(
    ...sortWorkspaceOverviewIssues(issues.map((issue) => mapControlPlaneIssueToOverviewIssue(issue, t))).map((issue) => {
      const target =
        issue.targetType === 'kubernetes'
          ? clustersById.get(issue.targetId)
          : virtualMachinesById.get(issue.targetId);
      return {
        issue,
        targetId: issue.targetId,
        targetType: issue.targetType,
        targetName: target?.name || issues.find((item) => item.id === issue.id)?.targetName || issue.targetId,
        targetTypeLabel: issue.targetType === 'kubernetes' ? t('overview.kubernetesCluster') : t('overview.virtualMachine')
      };
    })
  );

  const compareAttentionItems = (left: WorkspaceOverviewAttentionItem, right: WorkspaceOverviewAttentionItem) => {
    const severityDelta = getSeverityRank(left.issue.severity) - getSeverityRank(right.issue.severity);
    if (severityDelta !== 0) return severityDelta;
    if (right.issue.timestamp !== left.issue.timestamp) return right.issue.timestamp - left.issue.timestamp;
    const titleDelta = left.issue.title.localeCompare(right.issue.title);
    if (titleDelta !== 0) return titleDelta;
    return left.issue.id.localeCompare(right.issue.id);
  };

  attentionItems.sort(compareAttentionItems);
  connectedClusterCards.sort((left, right) => left.name.localeCompare(right.name));
  connectedVirtualMachineCards.sort((left, right) => left.name.localeCompare(right.name));

  return {
    attentionItems,
    connectedClusterCards,
    connectedVirtualMachineCards,
    criticalIssueCount: attentionItems.reduce((total, item) => total + (item.issue.severity === 'critical' ? 1 : 0), 0),
    warningIssueCount: attentionItems.reduce((total, item) => total + (item.issue.severity === 'warning' ? 1 : 0), 0)
  };
}
