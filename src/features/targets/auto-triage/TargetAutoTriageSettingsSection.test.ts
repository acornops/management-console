import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  isSameAutoTriageDraft,
  QueueSummary,
  shouldOfferExistingIssueStart,
  TargetAutoTriageSettingsSection,
  toAutoTriageDraft
} from '@/features/targets/auto-triage/TargetAutoTriageSettingsSection';
import {
  AutoTriageNamespaceEligibilityFields
} from '@/features/targets/auto-triage/AutoTriageNamespaceEligibilityFields';
import {
  parseAutoTriageNamespaceList,
  validateAutoTriageNamespaceList
} from '@/features/targets/auto-triage/autoTriageNamespaceValidation';
import type { TargetAutoTriageSettings } from '@/services/controlPlaneApi';

function settings(): TargetAutoTriageSettings {
  return {
    workspaceId: 'workspace-1',
    targetId: 'target-1',
    enabled: false,
    minimumSeverity: 'warning',
    writeMode: 'follow_target',
    additionalInstructions: '',
    namespaceInclude: [],
    namespaceExclude: [],
    includeClusterScopedIssues: true,
    revision: 0,
    canEdit: true,
    eligibleCurrentIssueCount: 0,
    queueSummary: {
      activeCount: 0,
      waitingCount: 0
    },
    effectiveBehavior: {
      requestedWriteMode: 'follow_target',
      effectiveToolMode: 'read_write',
      confirmationRequiredForWrite: true,
      targetCeilingApplied: false,
      targetSupportsWrite: true,
      summary: 'approval_required'
    },
    readiness: {
      status: 'ready',
      reasons: [],
      unavailableOptionalMcpToolCount: 0
    }
  };
}

describe('target auto-triage settings draft', () => {
  it('marks the settings section with the shared experimental treatment', () => {
    const markup = renderToStaticMarkup(
      React.createElement(TargetAutoTriageSettingsSection, {
        workspaceId: 'workspace-1',
        targetId: 'target-1',
        targetType: 'kubernetes',
        canManageTargets: false,
        canCreateReadWriteRuns: false
      })
    );

    expect(markup).toContain('autoTriage.title');
    expect(markup).toContain('app.experimental');
    expect(markup).toContain('bg-status-warning-soft');
  });

  it('copies only editable fields into one local draft', () => {
    expect(toAutoTriageDraft(settings())).toEqual({
      enabled: false,
      minimumSeverity: 'warning',
      writeMode: 'follow_target',
      additionalInstructions: '',
      namespaceIncludeText: '',
      namespaceExcludeText: '',
      includeClusterScopedIssues: true
    });
  });

  it('normalizes comma and newline separated namespace eligibility', () => {
    expect(parseAutoTriageNamespaceList(' payments, production\nsandbox, payments ')).toEqual([
      'payments',
      'production',
      'sandbox'
    ]);
  });

  it('rejects invalid and oversized namespace lists before save', () => {
    expect(validateAutoTriageNamespaceList('payments, Production')).toMatchObject({
      error: 'invalid'
    });
    expect(validateAutoTriageNamespaceList(
      Array.from({ length: 101 }, (_, index) => `team-${index}`).join(',')
    )).toMatchObject({
      error: 'too_many'
    });
    expect(validateAutoTriageNamespaceList('payments, payments')).toEqual({
      values: ['payments']
    });
  });

  it('associates namespace validation errors with the invalid field', () => {
    const markup = renderToStaticMarkup(
      React.createElement(AutoTriageNamespaceEligibilityFields, {
        targetId: 'cluster-1',
        canEdit: true,
        namespaceIncludeText: 'Production',
        namespaceExcludeText: '',
        includeClusterScopedIssues: true,
        namespaceIncludeError: 'invalid',
        onNamespaceIncludeTextChange: () => undefined,
        onNamespaceExcludeTextChange: () => undefined,
        onIncludeClusterScopedIssuesChange: () => undefined
      })
    );

    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('auto-triage-namespace-include-cluster-1-error');
    expect(markup).toContain('autoTriage.namespaceInvalid');
  });

  it('keeps unsaved combinations local until every editable field matches', () => {
    const persisted = settings();
    const draft = toAutoTriageDraft(persisted);
    expect(isSameAutoTriageDraft(persisted, draft)).toBe(true);
    expect(isSameAutoTriageDraft(persisted, { ...draft, enabled: true })).toBe(false);
    expect(isSameAutoTriageDraft(persisted, {
      ...draft,
      additionalInstructions: 'Never modify production.'
    })).toBe(false);
    expect(isSameAutoTriageDraft(persisted, {
      ...draft,
      namespaceIncludeText: 'payments'
    })).toBe(false);
  });

  it('offers explicit existing-issue start again when enabled settings are revisited', () => {
    expect(shouldOfferExistingIssueStart(settings())).toBe(false);
    expect(shouldOfferExistingIssueStart({
      ...settings(),
      enabled: true,
      eligibleCurrentIssueCount: 3
    })).toBe(true);
  });

  it('shows compact queue activity and links to the existing target issue surface', () => {
    const markup = renderToStaticMarkup(
      React.createElement(QueueSummary, {
        workspaceId: 'workspace-1',
        targetId: 'target-1',
        targetType: 'kubernetes',
        settings: {
          ...settings(),
          queueSummary: {
            activeCount: 2,
            waitingCount: 18,
            oldestWaitingAt: '2026-07-29T00:00:00.000Z'
          }
        },
        t: (key: string, values?: Record<string, unknown>) =>
          `${key}:${values ? JSON.stringify(values) : ''}`
      })
    );

    expect(markup).toContain('autoTriage.activityCounts');
    expect(markup).toContain('&quot;active&quot;:2');
    expect(markup).toContain('&quot;waiting&quot;:18');
    expect(markup).toContain('/workspaces/workspace-1/kubernetes-clusters/target-1/overview');
    expect(markup).toContain('autoTriage.viewIssues');
  });
});
