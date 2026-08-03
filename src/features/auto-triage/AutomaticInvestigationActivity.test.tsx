import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  AutomaticInvestigationActivity,
  shouldShowManualAssistantFallback
} from '@/features/auto-triage/AutomaticInvestigationActivity';
import type { AutomaticInvestigationSummary } from '@/services/controlPlaneApi';

function activity(overrides: Partial<AutomaticInvestigationSummary>): AutomaticInvestigationSummary {
  return {
    issueId: 'issue-1',
    lifecycleVersion: 1,
    state: 'queued',
    updatedAt: '2026-07-29T00:00:00.000Z',
    canRetry: false,
    ...overrides
  };
}

describe('automatic investigation issue activity', () => {
  it('renders a disabled starting action until a session exists', () => {
    const markup = renderToStaticMarkup(
      <AutomaticInvestigationActivity
        workspaceId="workspace-1"
        targetId="target-1"
        targetType="kubernetes"
        issueId="issue-1"
        activity={activity({})}
      />
    );
    expect(markup).toContain('data-automatic-investigation-activity="queued"');
    expect(markup).toContain('disabled=""');
  });

  it('explains bounded readiness blockers instead of appearing stuck at starting', () => {
    const markup = renderToStaticMarkup(
      <AutomaticInvestigationActivity
        workspaceId="workspace-1"
        targetId="target-1"
        targetType="kubernetes"
        issueId="issue-1"
        activity={activity({ errorCode: 'AI_PROVIDER_NEEDS_SETUP' })}
      />
    );
    expect(markup).toContain('automaticInvestigation.state.delayed');
    expect(markup).toContain('automaticInvestigation.delay.aiProviderNeedsSetup');
    expect(markup).toContain('automaticInvestigation.actions.waiting');
  });

  it('deep-links a running investigation into the existing target chat route', () => {
    const markup = renderToStaticMarkup(
      <AutomaticInvestigationActivity
        workspaceId="workspace-1"
        targetId="target-1"
        targetType="virtual_machine"
        issueId="issue-1"
        activity={activity({ state: 'investigating', sessionId: 'session-1', runId: 'run-1' })}
      />
    );
    expect(markup).toContain('session=session-1');
    expect(markup).toContain('data-automatic-investigation-activity="investigating"');
  });

  it('offers retry only when the server marks a failed lifecycle eligible', () => {
    const eligible = renderToStaticMarkup(
      <AutomaticInvestigationActivity
        workspaceId="workspace-1"
        targetId="target-1"
        targetType="kubernetes"
        issueId="issue-1"
        activity={activity({ state: 'failed', canRetry: true })}
      />
    );
    const ineligible = renderToStaticMarkup(
      <AutomaticInvestigationActivity
        workspaceId="workspace-1"
        targetId="target-1"
        targetType="kubernetes"
        issueId="issue-1"
        activity={activity({ state: 'failed', canRetry: false })}
      />
    );
    expect(eligible).toContain('automaticInvestigation.actions.retry');
    expect(eligible).toContain('automaticInvestigation.failure.retryable');
    expect(ineligible).not.toContain('automaticInvestigation.actions.retry');
    expect(ineligible).toContain('automaticInvestigation.failure.manualFallback');
  });

  it('names the repair for a known failed readiness dependency', () => {
    const markup = renderToStaticMarkup(
      <AutomaticInvestigationActivity
        workspaceId="workspace-1"
        targetId="target-1"
        targetType="kubernetes"
        issueId="issue-1"
        activity={activity({ state: 'failed', canRetry: true, errorCode: 'TARGET_DISCONNECTED' })}
      />
    );
    expect(markup).toContain('automaticInvestigation.failure.targetDisconnected');
    expect(markup).toContain('automaticInvestigation.actions.retry');
  });

  it('uses the existing assistant only when automatic activity has no usable action', () => {
    expect(shouldShowManualAssistantFallback()).toBe(true);
    expect(shouldShowManualAssistantFallback(activity({ state: 'queued' }))).toBe(false);
    expect(shouldShowManualAssistantFallback(activity({
      state: 'investigating',
      sessionId: 'session-1'
    }))).toBe(false);
    expect(shouldShowManualAssistantFallback(activity({
      state: 'failed',
      canRetry: true
    }))).toBe(false);
    expect(shouldShowManualAssistantFallback(activity({
      state: 'failed',
      canRetry: false
    }))).toBe(true);
    expect(shouldShowManualAssistantFallback(activity({
      state: 'cancelled',
      sessionId: 'session-1'
    }))).toBe(false);
    expect(shouldShowManualAssistantFallback(activity({ state: 'cancelled' }))).toBe(true);
    expect(shouldShowManualAssistantFallback(activity({ state: 'deleted' }))).toBe(true);
  });
});
