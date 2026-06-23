import type { ControlPlaneInvestigationItem, ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
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
  detail: string;
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

export function isConnectedCluster(cluster: KubernetesCluster): boolean {
  return cluster.agentConnectionState === 'connected';
}

export function isConnectedVirtualMachine(virtualMachine: ControlPlaneVirtualMachine): boolean {
  return virtualMachine.status === 'online' || virtualMachine.status === 'degraded';
}

export function mapClusterInvestigationToOverviewIssue(
  item: ControlPlaneInvestigationItem,
  t: OverviewTranslator
): WorkspaceOverviewIssue {
  return {
    id: item.id,
    targetId: item.clusterId,
    targetType: 'kubernetes',
    severity: item.severity,
    title: item.title,
    timestamp: item.timestamp,
    detail: item.namespace || t('overview.clusterWide')
  };
}

export function mapVmFindingToOverviewIssue(
  virtualMachine: ControlPlaneVirtualMachine,
  finding: Record<string, unknown>,
  t: OverviewTranslator
): WorkspaceOverviewIssue {
  const severity = String(finding.severity || '').toLowerCase();
  const normalizedSeverity: WorkspaceOverviewSeverity =
    severity === 'critical' ? 'critical' : severity === 'warning' ? 'warning' : 'info';

  return {
    id: String(finding.id || `${virtualMachine.id}-${finding.title || 'finding'}-${finding.updatedAt || finding.timestamp || ''}`),
    targetId: virtualMachine.id,
    targetType: 'virtual_machine',
    severity: normalizedSeverity,
    title: String(finding.title || t('virtualMachines.overview.findingFallback')),
    timestamp: Date.parse(String(finding.updatedAt || finding.timestamp || virtualMachine.updatedAt || Date.now())) || Date.now(),
    detail: String(finding.source || finding.category || t('virtualMachines.overview.snapshotFinding'))
  };
}

export function buildWorkspaceOverviewCards(args: {
  kubernetesClusters: KubernetesCluster[];
  clusterInvestigations: ControlPlaneInvestigationItem[];
  virtualMachines: ControlPlaneVirtualMachine[];
  vmFindingsById: Record<string, Record<string, unknown>[]>;
  t: OverviewTranslator;
}): {
  attentionItems: WorkspaceOverviewAttentionItem[];
  connectedClusterCards: WorkspaceOverviewTargetCard[];
  connectedVirtualMachineCards: WorkspaceOverviewTargetCard[];
  criticalIssueCount: number;
  warningIssueCount: number;
} {
  const { kubernetesClusters, clusterInvestigations, virtualMachines, vmFindingsById, t } = args;
  const clusterIssuesById = new Map<string, WorkspaceOverviewIssue[]>();
  for (const item of clusterInvestigations) {
    const mapped = mapClusterInvestigationToOverviewIssue(item, t);
    const issues = clusterIssuesById.get(item.clusterId);
    if (issues) issues.push(mapped);
    else clusterIssuesById.set(item.clusterId, [mapped]);
  }

  const attentionItems: WorkspaceOverviewAttentionItem[] = [];
  const connectedClusterCards: WorkspaceOverviewTargetCard[] = [];
  const connectedVirtualMachineCards: WorkspaceOverviewTargetCard[] = [];

  for (const cluster of kubernetesClusters) {
    if (!isConnectedCluster(cluster)) continue;
    const issues = sortWorkspaceOverviewIssues(clusterIssuesById.get(cluster.id) || []);
    const healthStatus = getEffectiveHealthStatus(cluster);
    const card: WorkspaceOverviewTargetCard = {
      targetId: cluster.id,
      targetType: 'kubernetes',
      name: cluster.name,
      postureLabel: clusterPostureLabel(healthStatus, t),
      postureTone: clusterPostureTone(healthStatus)
    };

    connectedClusterCards.push(card);
    attentionItems.push(
      ...issues.map((issue) => ({
        issue,
        targetId: cluster.id,
        targetType: 'kubernetes' as const,
        targetName: cluster.name,
        targetTypeLabel: t('overview.kubernetesCluster')
      }))
    );
  }

  for (const virtualMachine of virtualMachines) {
    if (!isConnectedVirtualMachine(virtualMachine)) continue;
    const issues = sortWorkspaceOverviewIssues(
      (vmFindingsById[virtualMachine.id] || []).map((finding) => mapVmFindingToOverviewIssue(virtualMachine, finding, t))
    );
    const card: WorkspaceOverviewTargetCard = {
      targetId: virtualMachine.id,
      targetType: 'virtual_machine',
      name: virtualMachine.name,
      postureLabel: getVmStatusLabel(virtualMachine.status, t),
      postureTone: statusTone(virtualMachine.status)
    };

    connectedVirtualMachineCards.push(card);
    attentionItems.push(
      ...issues.map((issue) => ({
        issue,
        targetId: virtualMachine.id,
        targetType: 'virtual_machine' as const,
        targetName: virtualMachine.name,
        targetTypeLabel: t('overview.virtualMachine')
      }))
    );
  }

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
