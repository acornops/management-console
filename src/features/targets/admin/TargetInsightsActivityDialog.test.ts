import { describe, expect, it } from 'vitest';
import type { ControlPlaneWorkspaceAuditEvent } from '@/services/controlPlaneApi';
import { targetInsightsCheckpointActivityDetails } from './TargetInsightsActivityDialog';

function auditEvent(metadata: Record<string, unknown>): ControlPlaneWorkspaceAuditEvent {
  return {
    id: 'audit-1',
    workspaceId: 'workspace-1',
    category: 'insights',
    eventType: 'target_insights.checkpoint.invalid_response.v1',
    operation: 'write',
    actor: { type: 'system' },
    object: { type: 'target_insights', id: 'cluster-1' },
    summary: 'Target Insights checkpoint returned an invalid response',
    metadata,
    occurredAt: '2026-07-25T08:25:25.000Z'
  };
}

describe('Target Insights checkpoint activity details', () => {
  it('presents safe diagnostics and links to the exact source session', () => {
    expect(targetInsightsCheckpointActivityDetails(auditEvent({
      outcome: 'invalid_response',
      reasonCode: 'invalid_schema',
      provider: 'openai',
      model: 'gpt-5',
      sessionId: 'session 1',
      appliedPatchCount: 0,
      rejectedPatchCount: 1
    }), {
      workspaceId: 'workspace-1',
      targetId: 'cluster-1',
      targetType: 'kubernetes'
    })).toEqual({
      outcome: 'invalid_response',
      reasonCode: 'invalid_schema',
      provider: 'openai',
      model: 'gpt-5',
      appliedPatchCount: null,
      rejectedPatchCount: 1,
      sourcePath: '/workspaces/workspace-1/kubernetes-clusters/cluster-1/chat?session=session%201',
      tone: 'danger'
    });
  });

  it('keeps legacy rows and malformed optional metadata backward compatible', () => {
    expect(targetInsightsCheckpointActivityDetails(auditEvent({
      outcome: 'unexpected',
      reasonCode: 42,
      appliedPatchCount: -1
    }), {
      workspaceId: 'workspace-1',
      targetId: 'vm-1',
      targetType: 'virtual_machine'
    })).toEqual({
      outcome: null,
      reasonCode: null,
      provider: null,
      model: null,
      appliedPatchCount: null,
      rejectedPatchCount: null,
      sourcePath: null,
      tone: null
    });
  });
});
