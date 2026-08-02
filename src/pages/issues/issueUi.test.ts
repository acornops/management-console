import { describe, expect, it } from 'vitest';
import type { ControlPlaneIssueItem } from '@/services/controlPlaneApi';
import { issueSeverityTone, issueStatusTone, issueSupportingText, issueTargetScopeLabel, kubernetesIssueNamespace, shouldShowIssueStatus } from './issueUi';

function issue(overrides: Partial<ControlPlaneIssueItem> = {}): ControlPlaneIssueItem {
  return {
    id: 'issue-1',
    workspaceId: 'workspace-1',
    targetId: 'cluster-1',
    targetType: 'kubernetes',
    fingerprint: 'fingerprint-1',
    issueType: 'kubernetes_pod_unhealthy',
    status: 'active',
    severity: 'critical',
    title: 'Pod unhealthy',
    summary: 'The pod is unhealthy.',
    firstSeenAt: '2026-07-28T00:00:00.000Z',
    lastSeenAt: '2026-07-28T00:00:00.000Z',
    lastObservedSnapshotAt: '2026-07-28T00:00:00.000Z',
    occurrenceCount: 1,
    reopenedCount: 0,
    cleanSnapshotCount: 0,
    createdAt: '2026-07-28T00:00:00.000Z',
    updatedAt: '2026-07-28T00:00:00.000Z',
    ...overrides
  };
}

describe('kubernetesIssueNamespace', () => {
  it('prefers the explicit namespace over a resource-scoped name', () => {
    expect(kubernetesIssueNamespace(issue({
      namespace: 'production',
      scopeKind: 'Pod',
      scopeName: 'payments-worker-7c5b9f-demo'
    }), 'Cluster-wide')).toBe('production');
  });

  it('uses namespace scope and otherwise falls back to cluster-wide', () => {
    expect(kubernetesIssueNamespace(issue({
      scopeKind: 'Namespace',
      scopeName: 'payments'
    }), 'Cluster-wide')).toBe('payments');
    expect(kubernetesIssueNamespace(issue({
      scopeKind: 'Node',
      scopeName: 'worker-1'
    }), 'Cluster-wide')).toBe('Cluster-wide');
  });
});

describe('issueSeverityTone', () => {
  it('uses the shared warning treatment for warning pills', () => {
    expect(issueSeverityTone('warning')).toBe('warning');
  });

  it('keeps critical and informational severities semantically distinct', () => {
    expect(issueSeverityTone('critical')).toBe('danger');
    expect(issueSeverityTone('info')).toBe('neutral');
  });
});

describe('issueStatusTone', () => {
  it('keeps issue status pills borderless across semantic tones', () => {
    expect(issueStatusTone('active')).toBe('neutral');
    expect(issueStatusTone('recovering')).toBe('warning');
    expect(issueStatusTone('resolved')).toBe('success');
  });
});

describe('shouldShowIssueStatus', () => {
  it('suppresses the default active state while preserving transitional and terminal states', () => {
    expect(shouldShowIssueStatus('active')).toBe(false);
    expect(shouldShowIssueStatus('recovering')).toBe(true);
    expect(shouldShowIssueStatus('resolved')).toBe(true);
  });
});

describe('issueSupportingText', () => {
  it('prefers the diagnostic summary over a generic state reason', () => {
    expect(issueSupportingText({
      title: 'Pod pending',
      summary: 'Latest snapshot reports pod api-7d8 in namespace demo as Pending.',
      reason: 'Pending'
    })).toBe('Latest snapshot reports pod api-7d8 in namespace demo as Pending.');
  });

  it('falls back to the reason when no summary is available', () => {
    expect(issueSupportingText({ title: 'Pod pending', summary: '  ', reason: 'Unschedulable' })).toBe('Unschedulable');
  });

  it('omits repeated summaries and machine-only reason codes', () => {
    expect(issueSupportingText({
      title: 'ssh.service is failed',
      summary: 'ssh.service is failed.',
      reason: 'SERVICE_FAILED'
    })).toBe('');
  });
});

describe('issueTargetScopeLabel', () => {
  it('prefers the affected object over its broader namespace scope', () => {
    expect(issueTargetScopeLabel(issue({
      scopeKind: 'Namespace',
      scopeName: 'production',
      objectKind: 'Deployment',
      objectName: 'payments-worker'
    }), 'Cluster-wide')).toBe('Deployment/payments-worker');
  });

  it('falls back through scope, namespace, and the supplied label', () => {
    expect(issueTargetScopeLabel(issue({
      scopeKind: 'Node',
      scopeName: 'worker-1'
    }), 'Cluster-wide')).toBe('Node/worker-1');
    expect(issueTargetScopeLabel(issue({
      namespace: 'production'
    }), 'Cluster-wide')).toBe('production');
    expect(issueTargetScopeLabel(issue(), 'Cluster-wide')).toBe('Cluster-wide');
  });
});
