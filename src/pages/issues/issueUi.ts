import type { ControlPlaneIssueItem } from '@/services/controlPlaneApi';

export function issueStatusTone(status: ControlPlaneIssueItem['status']): string {
  if (status === 'active') return 'border border-accent/25 bg-accent-soft text-accent-readable';
  if (status === 'recovering') return 'border border-status-warning/25 bg-status-warning-soft text-status-warning-text';
  return 'border border-status-success/25 bg-status-success-soft text-status-success-text';
}

export function kubernetesIssueNamespace(
  issue: ControlPlaneIssueItem,
  clusterWideLabel: string
): string {
  if (issue.namespace) return issue.namespace;
  return issue.scopeKind?.toLowerCase() === 'namespace' && issue.scopeName
    ? issue.scopeName
    : clusterWideLabel;
}

export function issueTargetScopeLabel(
  issue: ControlPlaneIssueItem,
  fallbackLabel: string
): string {
  if (issue.objectName) {
    return issue.objectKind
      ? `${issue.objectKind}/${issue.objectName}`
      : issue.objectName;
  }
  if (issue.scopeName) {
    return issue.scopeKind
      ? `${issue.scopeKind}/${issue.scopeName}`
      : issue.scopeName;
  }
  return issue.namespace || fallbackLabel;
}
