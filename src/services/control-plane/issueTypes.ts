import type { TargetType } from './types';
import type { AutomaticInvestigationSummary } from './autoTriageTypes';
import type { WorkflowActivitySummary } from './workflowApi';

export interface ControlPlaneIssueItem {
  id: string;
  workspaceId: string;
  targetId: string;
  targetType: TargetType;
  targetName?: string;
  fingerprint: string;
  issueType: string;
  status: 'active' | 'recovering' | 'resolved';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  summary: string;
  scopeKind?: string;
  scopeName?: string;
  namespace?: string;
  objectKind?: string;
  objectName?: string;
  reason?: string;
  firstSeenAt: string;
  lastSeenAt: string;
  lastObservedSnapshotAt: string;
  resolvedAt?: string;
  occurrenceCount: number;
  reopenedCount: number;
  cleanSnapshotCount: number;
  lifecycleVersion?: number;
  latestEvidence?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  workflowActivity?: WorkflowActivitySummary;
  automaticInvestigation?: AutomaticInvestigationSummary;
}

export interface ControlPlaneIssueObservationItem {
  id: string;
  issueId: string;
  workspaceId: string;
  targetId: string;
  targetType: TargetType;
  snapshotTs: string;
  findingId?: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  reason?: string;
  evidence?: Record<string, unknown>;
  createdAt: string;
}

export interface ControlPlaneTargetIssueSummary {
  total: number;
  active: number;
  recovering: number;
  critical: number;
  warning: number;
  info: number;
}
