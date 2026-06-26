import type { ControlPlaneIssueItem } from '@/services/controlPlaneApi';

export function issueStatusTone(status: ControlPlaneIssueItem['status']): string {
  if (status === 'active') return 'border border-accent/25 bg-accent-soft text-accent-strong';
  if (status === 'recovering') return 'border border-status-warning/25 bg-status-warning-soft text-status-warning-text';
  return 'border border-status-success/25 bg-status-success-soft text-status-success-text';
}
