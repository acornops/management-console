import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  isSameAutoTriageDraft,
  shouldOfferExistingIssueStart,
  TargetAutoTriageSettingsSection,
  toAutoTriageDraft
} from '@/features/targets/auto-triage/TargetAutoTriageSettingsSection';
import type { TargetAutoTriageSettings } from '@/services/controlPlaneApi';

function settings(): TargetAutoTriageSettings {
  return {
    workspaceId: 'workspace-1',
    targetId: 'target-1',
    enabled: false,
    minimumSeverity: 'warning',
    writeMode: 'follow_target',
    additionalInstructions: '',
    revision: 0,
    canEdit: true,
    eligibleCurrentIssueCount: 0,
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
      additionalInstructions: ''
    });
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
  });

  it('offers explicit existing-issue start again when enabled settings are revisited', () => {
    expect(shouldOfferExistingIssueStart(settings())).toBe(false);
    expect(shouldOfferExistingIssueStart({
      ...settings(),
      enabled: true,
      eligibleCurrentIssueCount: 3
    })).toBe(true);
  });
});
