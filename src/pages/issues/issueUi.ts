import type { ControlPlaneIssueItem } from '@/services/controlPlaneApi';
import type { StatusBadgeTone } from '@acornops/ui';

export function issueStatusTone(status: ControlPlaneIssueItem['status']): StatusBadgeTone {
  if (status === 'active') return 'neutral';
  if (status === 'recovering') return 'warning';
  return 'success';
}

export function shouldShowIssueStatus(status: ControlPlaneIssueItem['status']): boolean {
  return status !== 'active';
}

export function issueSeverityTone(severity: ControlPlaneIssueItem['severity']): StatusBadgeTone {
  if (severity === 'critical') return 'danger';
  if (severity === 'warning') return 'warning';
  return 'neutral';
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
