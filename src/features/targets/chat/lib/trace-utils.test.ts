import { describe, expect, it } from 'vitest';

import {
  appendReasoningSummaryDelta,
  appendRunTraceStep,
  completeReasoningSummary,
  formatTraceFailureDetail,
  formatRunUsageDetail,
  getTraceActivityLabel,
  getStatusBadgeClass,
  mapRunStage,
  mapTraceStatusClass,
  parseRunUsage,
  upsertToolCall
} from '@/features/targets/chat/lib/trace-utils';
import { LiveRunTrace } from '@/features/targets/chat/types';

function createTrace(overrides: Partial<LiveRunTrace> = {}): LiveRunTrace {
  return {
    runId: 'run-1',
    status: 'connecting',
    steps: [],
    toolCalls: [],
    ...overrides
  };
}

describe('trace-utils', () => {
  it('parses run usage payloads and normalizes counts', () => {
    expect(parseRunUsage({ input_tokens: 12.9, output_tokens: 4.1, tool_calls: 2.9 })).toEqual({
      inputTokens: 12,
      outputTokens: 4,
      toolCalls: 2
    });
    expect(parseRunUsage({ input_tokens: 5, output_tokens: 1 })).toEqual({
      inputTokens: 5,
      outputTokens: 1,
      toolCalls: 0
    });
    expect(parseRunUsage({ input_tokens: -1, output_tokens: 2 })).toBeUndefined();
    expect(parseRunUsage({ input_tokens: 1, output_tokens: '2' })).toBeUndefined();
  });

  it('formats usage details for the trace footer', () => {
    expect(formatRunUsageDetail({ inputTokens: 8, outputTokens: 3, toolCalls: 1 })).toBe(
      'Tokens: input 8, output 3'
    );
    expect(formatRunUsageDetail({ inputTokens: 8, outputTokens: 3, toolCalls: 1, reasoningTokens: 0 })).toBe(
      'Tokens: input 8, output 3, reasoning 0'
    );
    expect(formatRunUsageDetail(undefined)).toBeUndefined();
    expect(formatTraceFailureDetail()).toBe('Check the assistant response for details.');
  });

  it('deduplicates identical consecutive trace steps', () => {
    const trace = createTrace({
      steps: [{ id: 'step-1', label: 'Assistant started', detail: 'Accepted', status: 'info', timestamp: 1 }]
    });

    expect(appendRunTraceStep(trace, 'Assistant started', 'info', 'Accepted')).toBe(trace);
  });

  it('keeps oversized newest reasoning summaries retained and consistent', () => {
    const oversizedSummary = 'x'.repeat(25_000);
    const next = appendReasoningSummaryDelta(createTrace(), oversizedSummary);

    expect(next.reasoningSummaries).toHaveLength(1);
    expect(next.reasoningSummaries?.[0].text).toHaveLength(20_000);
    expect(next.reasoningSummaries?.[0].text.endsWith('… [Reasoning summary truncated]')).toBe(true);
    expect(next.activeReasoningSummary).toBe(next.reasoningSummaries?.[0].text);
    expect(next.timelineEvents?.[0].detail).toBe(next.reasoningSummaries?.[0].text);

    const completed = completeReasoningSummary(next, `${oversizedSummary} completed`);
    expect(completed.reasoningSummaries).toHaveLength(1);
    expect(completed.reasoningSummaries?.[0].status).toBe('completed');
    expect(completed.reasoningSummaries?.[0].text).toHaveLength(20_000);
    expect(completed.reasoningSummaries?.[0].text.endsWith('… [Reasoning summary truncated]')).toBe(true);
    expect(completed.activeReasoningSummary).toBe(completed.reasoningSummaries?.[0].text);
    expect(completed.timelineEvents?.[0].detail).toBe(completed.reasoningSummaries?.[0].text);
  });

  it('retains only the most recent 200 trace steps', () => {
    const steps = Array.from({ length: 200 }, (_, index) => ({
      id: `step-${index}`,
      label: `Step ${index}`,
      status: 'info' as const,
      timestamp: index
    }));

    const next = appendRunTraceStep(createTrace({ steps }), 'Newest step');

    expect(next.steps).toHaveLength(200);
    expect(next.steps[0]?.label).toBe('Step 1');
    expect(next.steps.at(-1)?.label).toBe('Newest step');
  });

  it('inserts and updates tool call progress entries', () => {
    const trace = createTrace();
    const inserted = upsertToolCall(trace, 'call-1', { tool: 'kubectl', status: 'running' });
    const updated = upsertToolCall(inserted, 'call-1', { status: 'completed', isError: true });

    expect(inserted.toolCalls).toEqual([{ callId: 'call-1', tool: 'kubectl', status: 'running', isError: undefined }]);
    expect(updated.toolCalls).toEqual([{ callId: 'call-1', tool: 'kubectl', status: 'completed', isError: true }]);
  });

  it('maps trace and resource statuses to the expected badge classes', () => {
    expect(mapTraceStatusClass('completed')).toContain('status-success');
    expect(mapTraceStatusClass('failed')).toContain('status-danger');
    expect(mapTraceStatusClass('cancelled')).toContain('status-warning');
    expect(mapTraceStatusClass('running')).toContain('blue');

    expect(getStatusBadgeClass('Running')).toContain('status-success');
    expect(getStatusBadgeClass('Pending')).toContain('status-warning');
    expect(getStatusBadgeClass('Crashed')).toContain('status-danger');
  });

  it('maps known run stages and preserves unknown ones', () => {
    expect(mapRunStage('bootstrap')).toBe('Preparing response');
    expect(mapRunStage('context_fetch')).toBe('Reviewing context');
    expect(mapRunStage('reasoning')).toBe('Thinking');
    expect(mapRunStage('inference')).toBe('Writing response');
    expect(mapRunStage('mystery_stage')).toBe('Progress: mystery_stage');
  });

  it('derives operator-facing trace activity labels', () => {
    expect(getTraceActivityLabel(createTrace({ status: 'connecting' }))).toBe('Thinking');
    expect(getTraceActivityLabel(createTrace({ status: 'completed' }))).toBe('Done');
    expect(getTraceActivityLabel(createTrace({ status: 'failed' }))).toBe('Could not complete');
    expect(getTraceActivityLabel(createTrace({ status: 'cancelled' }))).toBe('Cancelled');
    expect(getTraceActivityLabel(createTrace({
      status: 'running',
      steps: [{ id: 'step-1', label: 'Request queued', status: 'info', timestamp: 1 }]
    }))).toBe('Thinking');
    expect(getTraceActivityLabel(createTrace({
      status: 'running',
      steps: [{ id: 'step-1', label: 'Reviewing context', status: 'info', timestamp: 1 }]
    }))).toBe('Reviewing context');
    expect(getTraceActivityLabel(createTrace({
      status: 'running',
      steps: [{ id: 'step-1', label: 'Thinking started', status: 'info', timestamp: 1 }]
    }))).toBe('Thinking');
    expect(getTraceActivityLabel(createTrace({
      status: 'running',
      steps: [{ id: 'step-1', label: 'Writing response', status: 'info', timestamp: 1 }]
    }))).toBe('Writing response');
    expect(getTraceActivityLabel(createTrace({
      status: 'running',
      toolCalls: [{ callId: 'call-1', tool: 'kubectl', status: 'running' }]
    }))).toBe('Using tools');
    expect(getTraceActivityLabel(createTrace({
      status: 'running',
      skillLoads: [{ skillRef: 'skill_1', name: 'CNPG triage', status: 'loading' }]
    }))).toBe('Loading skill context');
    expect(getTraceActivityLabel(createTrace({
      status: 'running',
      steps: [{ id: 'step-1', label: 'Approval requested: restart_workload', status: 'info', timestamp: 1 }]
    }))).toBe('Waiting for approval');
    expect(getTraceActivityLabel(createTrace({
      status: 'running',
      steps: [
        { id: 'step-1', label: 'Approval requested: restart_workload', status: 'info', timestamp: 1 },
        { id: 'step-2', label: 'Approval granted: restart_workload', status: 'success', timestamp: 2 }
      ]
    }))).toBe('Working');
  });
});
