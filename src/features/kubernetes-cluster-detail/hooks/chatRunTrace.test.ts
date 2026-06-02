import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ControlPlaneRun, ControlPlaneRunEvent } from '@/services/controlPlaneApi';
import type { LiveRunTrace } from '@/features/kubernetes-cluster-detail/types';
import {
  buildTraceFromRunEvents,
  createBaseRunTrace,
  createRunEventHandler,
  isRunInProgress,
  isRunTerminal,
  isTraceInProgress,
  isTraceTerminal,
  mapRunStatusToTraceStatus
} from '@/features/kubernetes-cluster-detail/hooks/chatRunTrace';

function createRun(overrides: Partial<ControlPlaneRun> = {}): ControlPlaneRun {
  return {
    id: 'run-1',
    workspaceId: 'workspace-1',
    targetId: 'cluster-1',
    targetType: 'kubernetes',
    clusterId: 'cluster-1',
    sessionId: 'session-1',
    messageId: 'message-1',
    status: 'running',
    requestedAt: '2026-05-25T00:00:00.000Z',
    ...overrides
  };
}

function createEvent(
  type: string,
  seq: number,
  payload: Record<string, unknown> = {}
): ControlPlaneRunEvent {
  return {
    schema_version: 1,
    run_id: 'run-1',
    seq,
    ts: '2026-05-25T00:00:00.000Z',
    type,
    payload
  };
}

describe('chatRunTrace helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-25T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('classifies run and trace activity states', () => {
    expect(isRunInProgress('queued')).toBe(true);
    expect(isRunInProgress('waiting_for_approval')).toBe(true);
    expect(isRunInProgress('completed')).toBe(false);

    expect(isRunTerminal('failed')).toBe(true);
    expect(isRunTerminal('cancelled')).toBe(true);
    expect(isRunTerminal('running')).toBe(false);

    expect(isTraceInProgress({ runId: 'run-1', status: 'connecting', steps: [], toolCalls: [] })).toBe(true);
    expect(isTraceInProgress({ runId: 'run-1', status: 'running', steps: [], toolCalls: [] })).toBe(true);
    expect(isTraceInProgress({ runId: 'run-1', status: 'completed', steps: [], toolCalls: [] })).toBe(false);
    expect(isTraceInProgress()).toBe(false);
    expect(isTraceTerminal({ runId: 'run-1', status: 'cancelled', steps: [], toolCalls: [] })).toBe(true);
    expect(isTraceTerminal({ runId: 'run-1', status: 'running', steps: [], toolCalls: [] })).toBe(false);
  });

  it('maps run statuses to trace statuses', () => {
    expect(mapRunStatusToTraceStatus('queued')).toBe('connecting');
    expect(mapRunStatusToTraceStatus('dispatching')).toBe('connecting');
    expect(mapRunStatusToTraceStatus('running')).toBe('running');
    expect(mapRunStatusToTraceStatus('waiting_for_approval')).toBe('running');
    expect(mapRunStatusToTraceStatus('completed')).toBe('completed');
    expect(mapRunStatusToTraceStatus('failed')).toBe('failed');
    expect(mapRunStatusToTraceStatus('cancelled')).toBe('cancelled');
  });

  it('rebuilds a live trace from persisted run events', () => {
    const trace = buildTraceFromRunEvents(createRun({
      status: 'completed',
      usage: { input_tokens: 12, output_tokens: 7, tool_calls: 1 }
    }), [
      createEvent('run_started', 1),
      createEvent('assistant_message_started', 2),
      createEvent('run_progress', 3, { stage: 'context_fetch', message: 'Loading prior context' }),
      createEvent('tool_call_started', 4, { call_id: 'call-1', tool: 'kubectl', arguments: { cmd: 'get pods' } }),
      createEvent('tool_call_completed', 5, { call_id: 'call-1', tool: 'kubectl', result: { ok: true } }),
      createEvent('assistant_message_completed', 6, { usage: { input_tokens: 5, output_tokens: 3, tool_calls: 1 } }),
      createEvent('run_completed', 7)
    ]);

    expect(trace.status).toBe('completed');
    expect(trace.usage).toEqual({ inputTokens: 12, outputTokens: 7, toolCalls: 1 });
    expect(trace.steps.map((step) => step.label)).toEqual(expect.arrayContaining([
      'Run restored',
      'Run started',
      'Reasoning started',
      'Loading conversation context',
      'Tool call started: kubectl',
      'Tool call completed: kubectl',
      'Response draft completed',
      'Run completed'
    ]));
    expect(trace.toolCalls).toEqual([
      {
        callId: 'call-1',
        tool: 'kubectl',
        status: 'completed',
        isError: false
      }
    ]);
  });

  it('creates and incrementally updates traces from streamed events', () => {
    let trace: LiveRunTrace = createBaseRunTrace('run-1', 'connecting');
    const seenSeq = new Set<number>();
    const setTraceExpanded = vi.fn();
    const ensureStreamingMessage = vi.fn();
    const appendStreamingText = vi.fn();
    const onApprovalRequested = vi.fn();
    const onApprovalResolved = vi.fn();

    const handleEvent = createRunEventHandler({
      seenSeq,
      getTrace: () => trace,
      setTrace: (nextTrace) => {
        trace = nextTrace;
      },
      setTraceExpanded,
      ensureStreamingMessage,
      appendStreamingText,
      onApprovalRequested,
      onApprovalResolved
    });

    handleEvent(createEvent('run_started', 1));
    handleEvent(createEvent('run_started', 1));
    handleEvent(createEvent('assistant_message_started', 2));
    handleEvent(createEvent('assistant_token_delta', 3, { text: 'hello' }));
    handleEvent(createEvent('run_progress', 4, { stage: 'reasoning', message: 'Thinking' }));
    handleEvent(createEvent('tool_call_started', 5, { call_id: 'call-1', tool: 'kubectl', arguments: { cmd: 'get pods' } }));
    handleEvent(createEvent('tool_call_completed', 6, { call_id: 'call-1', tool: 'kubectl', is_error: true, result: { error: 'boom' } }));
    handleEvent(createEvent('tool_approval_requested', 7, {
      approval_id: 'approval-1',
      tool_call_id: 'call-1',
      tool: 'restart_workload',
      arguments: { namespace: 'prod' },
      expires_at: '2026-05-25T00:05:00.000Z'
    }));
    handleEvent(createEvent('tool_approval_approved', 8, { approval_id: 'approval-1', tool: 'restart_workload' }));
    handleEvent(createEvent('assistant_message_completed', 9, { usage: { input_tokens: 9, output_tokens: 4, tool_calls: 1 } }));
    handleEvent(createEvent('run_completed', 10));

    expect(seenSeq.size).toBe(10);
    expect(trace.status).toBe('completed');
    expect(trace.usage).toEqual({ inputTokens: 9, outputTokens: 4, toolCalls: 1 });
    expect(trace.steps.map((step) => step.label)).toEqual(expect.arrayContaining([
      'Run started',
      'Reasoning started',
      'Reasoning',
      'Tool call started: kubectl',
      'Tool call completed: kubectl',
      'Approval requested: restart_workload',
      'Approval granted: restart_workload',
      'Response draft completed',
      'Run completed'
    ]));
    expect(trace.toolCalls).toEqual([
      {
        callId: 'call-1',
        tool: 'kubectl',
        status: 'completed',
        isError: true
      }
    ]);
    expect(ensureStreamingMessage).toHaveBeenCalledTimes(1);
    expect(appendStreamingText).toHaveBeenCalledWith('hello');
    expect(onApprovalRequested).toHaveBeenCalledWith({
      id: 'approval-1',
      runId: 'run-1',
      toolCallId: 'call-1',
      action: 'Run restart_workload',
      toolName: 'restart_workload',
      arguments: { namespace: 'prod' },
      expiresAt: '2026-05-25T00:05:00.000Z',
      status: 'pending'
    });
    expect(onApprovalResolved).toHaveBeenCalledWith('approval-1', 'approved');
    expect(setTraceExpanded).toHaveBeenCalledWith(false);
  });

  it('marks failed and cancelled runs terminal without streaming side effects', () => {
    let trace: LiveRunTrace = createBaseRunTrace('run-1', 'connecting');
    const setTraceExpanded = vi.fn();
    const appendStreamingText = vi.fn();

    const handleEvent = createRunEventHandler({
      seenSeq: new Set<number>(),
      getTrace: () => trace,
      setTrace: (nextTrace) => {
        trace = nextTrace;
      },
      setTraceExpanded,
      ensureStreamingMessage: vi.fn(),
      appendStreamingText
    });

    handleEvent(createEvent('run_failed', 1));
    expect(trace.status).toBe('failed');
    expect(trace.steps.at(-1)?.label).toBe('Run failed');
    handleEvent(createEvent('assistant_token_delta', 2, { text: 'stale' }));
    expect(trace.status).toBe('failed');
    expect(trace.steps.at(-1)?.label).toBe('Run failed');

    trace = createBaseRunTrace('run-1', 'connecting');
    const handleCancelledEvent = createRunEventHandler({
      seenSeq: new Set<number>(),
      getTrace: () => trace,
      setTrace: (nextTrace) => {
        trace = nextTrace;
      },
      setTraceExpanded,
      ensureStreamingMessage: vi.fn(),
      appendStreamingText
    });

    handleCancelledEvent(createEvent('run_cancelled', 1));
    expect(trace.status).toBe('cancelled');
    expect(trace.steps.at(-1)?.label).toBe('Run cancelled');
    handleCancelledEvent(createEvent('assistant_token_delta', 2, { text: 'stale' }));
    handleCancelledEvent(createEvent('run_completed', 3));
    expect(trace.status).toBe('cancelled');
    expect(trace.steps.at(-1)?.label).toBe('Run cancelled');
    expect(setTraceExpanded).toHaveBeenCalledTimes(2);
    expect(appendStreamingText).not.toHaveBeenCalled();
  });
});
