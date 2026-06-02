import { describe, expect, it } from 'vitest';

import {
  appendRunTraceStep,
  formatRunUsageDetail,
  getStatusBadgeClass,
  mapRunStage,
  mapTraceStatusClass,
  parseRunUsage,
  upsertToolCall
} from '@/features/kubernetes-cluster-detail/lib/trace-utils';
import { LiveRunTrace } from '@/features/kubernetes-cluster-detail/types';

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
    expect(formatRunUsageDetail(undefined)).toBeUndefined();
  });

  it('deduplicates identical consecutive trace steps', () => {
    const trace = createTrace({
      steps: [{ id: 'step-1', label: 'Run started', detail: 'Accepted', status: 'info', timestamp: 1 }]
    });

    expect(appendRunTraceStep(trace, 'Run started', 'info', 'Accepted')).toBe(trace);
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
    expect(mapRunStage('bootstrap')).toBe('Bootstrapping run');
    expect(mapRunStage('context_fetch')).toBe('Loading conversation context');
    expect(mapRunStage('mystery_stage')).toBe('Progress: mystery_stage');
  });
});
