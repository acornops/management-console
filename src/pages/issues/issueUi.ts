import type { ControlPlaneIssueItem } from '@/services/controlPlaneApi';

export function issueStatusTone(status: ControlPlaneIssueItem['status']): string {
  if (status === 'active') return 'bg-ui-surface-strong text-ui-text-muted';
  if (status === 'recovering') return 'bg-status-warning-soft text-status-warning-text';
  return 'bg-status-success-soft text-status-success-text';
}

export function shouldShowIssueStatus(status: ControlPlaneIssueItem['status']): boolean {
  return status !== 'active';
}

export function issueSeverityTone(severity: ControlPlaneIssueItem['severity']): string {
  if (severity === 'critical') return 'bg-status-danger-soft text-status-danger-text';
  if (severity === 'warning') return 'bg-status-warning-soft text-status-warning-text';
  return 'bg-ui-surface-strong text-ui-text-muted';
}

function normalizedIssueCopy(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function isMachineReason(value: string): boolean {
  return /^[A-Z][A-Z0-9_:-]*$/.test(value);
}

export function issueSupportingText(issue: Pick<ControlPlaneIssueItem, 'title' | 'summary' | 'reason'>): string {
  const title = issue.title.trim();
  const summary = issue.summary.trim();
  if (summary && normalizedIssueCopy(summary) !== normalizedIssueCopy(title)) return summary;

  const reason = issue.reason?.trim() || '';
  if (!reason || isMachineReason(reason) || normalizedIssueCopy(reason) === normalizedIssueCopy(title)) return '';
  return reason;
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
