import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ControlPlaneRun, ControlPlaneRunEvent } from '@/services/controlPlaneApi';
import type { LiveRunTrace } from '@/features/targets/chat/types';
import {
  buildTraceFromRunEvents,
  createBaseRunTrace,
  createRunEventHandler,
  isRunInProgress,
  isRunTerminal,
  isTraceInProgress,
  isTraceTerminal,
  mapRunStatusToTraceStatus,
  preferRicherRunTrace,
  traceDetailScore
} from '@/features/targets/chat/hooks/chatRunTrace';

function createRun(overrides: Partial<ControlPlaneRun> = {}): ControlPlaneRun {
  return {
    id: 'run-1',
    workspaceId: 'workspace-1',
    targetId: 'target-1',
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
    vi.useFakeTimers({ toFake: ['Date'] });
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

  it('preserves a richer live trace when terminal replay is sparse', () => {
    const liveTrace: LiveRunTrace = {
      runId: 'run-1',
      status: 'running',
      steps: [
        { id: 'step-1', label: 'Assistant started', status: 'info', timestamp: 1 },
        { id: 'step-2', label: 'Reviewing context', status: 'info', timestamp: 2 },
        { id: 'step-3', label: 'Tool call started: kubectl', status: 'info', timestamp: 3 }
      ],
      toolCalls: [{ callId: 'call-1', tool: 'kubectl', status: 'completed' }],
      timelineEvents: [
        { id: 'step-1', type: 'step', label: 'Assistant started', status: 'info', timestamp: 1 },
        { id: 'step-2', type: 'step', label: 'Reviewing context', status: 'info', timestamp: 2 },
        { id: 'tool-1', type: 'tool', label: 'Tool call completed: kubectl', status: 'success', timestamp: 3 }
      ]
    };
    const sparseRestored = buildTraceFromRunEvents(createRun({ status: 'completed' }), [
      createEvent('assistant_message_completed', 1, { usage: { input_tokens: 5, output_tokens: 3, tool_calls: 0 } }),
      createEvent('run_completed', 2)
    ]);

    expect(traceDetailScore(liveTrace)).toBeGreaterThan(traceDetailScore(sparseRestored));
    expect(preferRicherRunTrace(liveTrace, sparseRestored)).toMatchObject({
      status: 'completed',
      toolCalls: liveTrace.toolCalls,
      timelineEvents: liveTrace.timelineEvents,
      usage: sparseRestored.usage
    });
  });

  it('rebuilds a live trace from persisted run events', () => {
    const trace = buildTraceFromRunEvents(createRun({
      status: 'completed',
      usage: { input_tokens: 12, output_tokens: 7, tool_calls: 1 }
    }), [
      createEvent('run_started', 1),
      createEvent('assistant_message_started', 2),
      createEvent('run_progress', 3, { stage: 'context_fetch', message: 'Loading prior context' }),
      createEvent('assistant_reasoning_summary_delta', 4, {
        text: 'Checking whether current target state is needed.',
        provider: 'openai',
        model: 'gpt-test'
      }),
      createEvent('tool_call_started', 5, { call_id: 'call-1', tool: 'kubectl', arguments: { cmd: 'get pods' } }),
      createEvent('tool_call_completed', 6, { call_id: 'call-1', tool: 'kubectl', result: { ok: true } }),
      createEvent('assistant_message_completed', 7, { usage: { input_tokens: 5, output_tokens: 3, tool_calls: 1 } }),
      createEvent('run_completed', 8)
    ]);

    expect(trace.status).toBe('completed');
    expect(trace.usage).toEqual({ inputTokens: 12, outputTokens: 7, toolCalls: 1 });
    expect(trace.steps.map((step) => step.label)).toEqual(expect.arrayContaining([
      'Run details restored',
      'Assistant started',
      'Thinking started',
      'Reviewing context',
      'Tool call started: kubectl',
      'Tool call completed: kubectl',
      'Response ready',
      'Completed'
    ]));
    expect(trace.toolCalls).toEqual([
      {
        callId: 'call-1',
        tool: 'kubectl',
        status: 'completed',
        isError: false
      }
    ]);
    expect(trace.reasoningSummaries?.[0]?.text).toBe('Checking whether current target state is needed.');
    expect(trace.timelineEvents?.map((event) => event.label)).toEqual([
      'Run details restored',
      'Assistant started',
      'Thinking started',
      'Reviewing context',
      'Reasoning summary',
      'Tool call started: kubectl',
      'Tool call completed: kubectl',
      'Response ready',
      'Completed'
    ]);
    expect(trace.timelineEvents?.[4]).toMatchObject({
      type: 'reasoning',
      detail: 'Checking whether current target state is needed.',
      provider: 'openai',
      model: 'gpt-test',
      status: 'streaming'
    });
    expect(trace.timelineEvents?.[5]).toMatchObject({
      type: 'tool',
      label: 'Tool call started: kubectl'
    });
    expect(trace.timelineEvents?.[6]).toMatchObject({
      type: 'tool',
      label: 'Tool call completed: kubectl'
    });
  });

  it('shows projection strategy and explicit omissions with compact tool evidence', () => {
    const trace = buildTraceFromRunEvents(createRun({ status: 'completed' }), [
      createEvent('tool_call_completed', 1, {
        call_id: 'call-1', tool: 'get_resource', result: { summary: 'Inspected Pod default/api.' },
        context_meta: {
          schema_version: 'v1', strategy: 'producer_projection', truncated: true,
          omissions: [{ path: 'data.health.conditions', reason: 'context_byte_limit' }]
        }
      }),
      createEvent('run_completed', 2)
    ]);

    const step = trace.steps.find((item) => item.label === 'Tool call completed: get_resource');
    expect(step?.detail).toContain('Evidence: producer projection · 1 explicit omission(s)');
    expect(step?.detail).toContain('Inspected Pod default/api.');
  });

  it('restores skill context events separately from tool calls', () => {
    const trace = buildTraceFromRunEvents(createRun({ status: 'running' }), [
      createEvent('skill_catalog_available', 1, { count: 1, skills: [{ skill_ref: 'skill_1', name: 'CNPG triage' }] }),
      createEvent('skill_context_load_started', 2, { skill_ref: 'skill_1', name: 'CNPG triage' }),
      createEvent('skill_context_loaded', 3, {
        skill_ref: 'skill_1',
        skill_id: 'target-skill-1',
        name: 'CNPG triage',
        file_count: 2,
        total_bytes: 128,
        content_hash: 'sha256:abc'
      })
    ]);

    expect(trace.toolCalls).toEqual([]);
    expect(trace.skillLoads).toEqual([
      {
        skillRef: 'skill_1',
        skillId: 'target-skill-1',
        name: 'CNPG triage',
        status: 'loaded',
        fileCount: 2,
        totalBytes: 128
      }
    ]);
    expect(trace.timelineEvents?.filter((event) => event.type === 'skill').map((event) => event.label)).toEqual([
      'Loading skill context: CNPG triage',
      'Skill context loaded: CNPG triage'
    ]);
  });

  it('renders Insights retrieval outcomes in run details', () => {
    const hitTrace = buildTraceFromRunEvents(createRun({ status: 'running' }), [
      createEvent('target_insights_context_retrieved', 1, {
        retrieval_status: 'hit',
        snippet_count: 1,
        snippets: [{ title: 'CrashLoopBackOff restart pattern' }]
      })
    ]);
    const missTrace = buildTraceFromRunEvents(createRun({ status: 'running' }), [
      createEvent('target_insights_context_retrieved', 1, {
        retrieval_status: 'miss',
        snippet_count: 0,
        snippets: []
      })
    ]);

    expect(hitTrace.steps.at(-1)).toMatchObject({
      label: 'Insights searched',
      status: 'success',
      detail: 'Matched:\nCrashLoopBackOff restart pattern'
    });
    expect(missTrace.steps.at(-1)).toMatchObject({
      label: 'Insights searched',
      status: 'info',
      detail: 'No matching active Insights files.'
    });
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
    vi.advanceTimersByTime(1000);
    handleEvent(createEvent('assistant_reasoning_summary_delta', 5, {
      text: 'Checking whether a target read is needed.',
      provider: 'openai',
      model: 'gpt-test'
    }));
    const reasoningStartedAt = trace.timelineEvents?.find((event) => event.type === 'reasoning')?.timestamp;
    vi.advanceTimersByTime(1000);
    handleEvent(createEvent('assistant_reasoning_summary_delta', 6, {
      text: 'Preparing to inspect pods.',
      provider: 'openai',
      model: 'gpt-test'
    }));
    vi.advanceTimersByTime(1000);
    handleEvent(createEvent('assistant_reasoning_summary_completed', 7, {
      text: 'Checking whether a target read is needed. Preparing to inspect pods.',
      provider: 'openai',
      model: 'gpt-test'
    }));
    handleEvent(createEvent('tool_call_started', 8, { call_id: 'call-1', tool: 'kubectl', arguments: { cmd: 'get pods' } }));
    handleEvent(createEvent('tool_call_completed', 9, { call_id: 'call-1', tool: 'kubectl', is_error: true, result: { error: 'boom' } }));
    handleEvent(createEvent('tool_approval_requested', 10, {
      approval_id: 'approval-1',
      tool_call_id: 'call-1',
      tool: 'restart_workload',
      summary: 'Restart workload in namespace prod.',
      arguments: { namespace: 'prod' },
      expires_at: '2026-05-25T00:05:00.000Z'
    }));
    handleEvent(createEvent('tool_approval_approved', 11, { approval_id: 'approval-1', tool: 'restart_workload' }));
    handleEvent(createEvent('assistant_message_completed', 12, { usage: { input_tokens: 9, output_tokens: 4, tool_calls: 1 } }));
    handleEvent(createEvent('run_completed', 13));

    expect(seenSeq.size).toBe(13);
    expect(trace.status).toBe('completed');
    expect(trace.usage).toEqual({ inputTokens: 9, outputTokens: 4, toolCalls: 1 });
    expect(trace.steps.map((step) => step.label)).toEqual(expect.arrayContaining([
      'Assistant started',
      'Thinking started',
      'Thinking',
      'Tool call started: kubectl',
      'Tool call completed: kubectl',
      'Approval requested: restart_workload',
      'Approval granted: restart_workload',
      'Response ready',
      'Completed'
    ]));
    expect(trace.toolCalls).toEqual([
      {
        callId: 'call-1',
        tool: 'kubectl',
        status: 'completed',
        isError: true
      }
    ]);
    expect(ensureStreamingMessage).toHaveBeenCalledTimes(4);
    expect(appendStreamingText).toHaveBeenCalledWith('hello');
    expect(trace.reasoningSummaries).toHaveLength(1);
    expect(trace.reasoningSummaries?.[0]).toMatchObject({
      text: 'Checking whether a target read is needed. Preparing to inspect pods.',
      status: 'completed'
    });
    expect(trace.timelineEvents?.map((event) => event.label)).toEqual([
      'Assistant started',
      'Thinking started',
      'Thinking',
      'Reasoning summary',
      'Tool call started: kubectl',
      'Tool call completed: kubectl',
      'Approval requested: restart_workload',
      'Approval granted: restart_workload',
      'Response ready',
      'Completed'
    ]);
    expect(trace.timelineEvents?.filter((event) => event.type === 'reasoning')).toHaveLength(1);
    expect(trace.timelineEvents?.[3]).toMatchObject({
      type: 'reasoning',
      detail: 'Checking whether a target read is needed. Preparing to inspect pods.',
      status: 'completed',
      timestamp: reasoningStartedAt
    });
    expect(trace.timelineEvents?.filter((event) => event.type === 'tool').map((event) => event.label)).toEqual([
      'Tool call started: kubectl',
      'Tool call completed: kubectl',
      'Approval requested: restart_workload',
      'Approval granted: restart_workload'
    ]);
    expect(onApprovalRequested).toHaveBeenCalledWith({
      id: 'approval-1',
      runId: 'run-1',
      toolCallId: 'call-1',
      action: 'Run restart_workload',
      summary: 'Restart workload in namespace prod.',
      toolName: 'restart_workload',
      arguments: { namespace: 'prod' },
      expiresAt: '2026-05-25T00:05:00.000Z',
      status: 'pending'
    });
    expect(onApprovalResolved).toHaveBeenCalledWith('approval-1', 'approved');
    expect(setTraceExpanded).toHaveBeenCalledWith(false);
  });

  it('materializes the assistant turn when reasoning summaries arrive before text', () => {
    let trace: LiveRunTrace = createBaseRunTrace('run-1', 'connecting');
    const ensureStreamingMessage = vi.fn();
    const appendStreamingText = vi.fn();

    const handleEvent = createRunEventHandler({
      seenSeq: new Set<number>(),
      getTrace: () => trace,
      setTrace: (nextTrace) => {
        trace = nextTrace;
      },
      setTraceExpanded: vi.fn(),
      ensureStreamingMessage,
      appendStreamingText
    });

    handleEvent(createEvent('assistant_reasoning_summary_delta', 1, {
      text: 'Checking target health and recent rollout events.',
      provider: 'openai',
      model: 'gpt-test'
    }));

    expect(ensureStreamingMessage).toHaveBeenCalledTimes(1);
    expect(appendStreamingText).not.toHaveBeenCalled();
    expect(trace.status).toBe('running');
    expect(trace.activeReasoningSummary).toBe('Checking target health and recent rollout events.');
    expect(trace.reasoningSummaries).toHaveLength(1);
    expect(trace.timelineEvents).toHaveLength(1);
    expect(trace.timelineEvents?.[0]).toMatchObject({
      type: 'reasoning',
      label: 'Reasoning summary',
      detail: 'Checking target health and recent rollout events.'
    });
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
    expect(trace.steps.at(-1)?.label).toBe('Could not complete');
    handleEvent(createEvent('assistant_token_delta', 2, { text: 'stale' }));
    expect(trace.status).toBe('failed');
    expect(trace.steps.at(-1)?.label).toBe('Could not complete');

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
    expect(trace.steps.at(-1)?.label).toBe('Cancelled');
    handleCancelledEvent(createEvent('assistant_token_delta', 2, { text: 'stale' }));
    handleCancelledEvent(createEvent('run_completed', 3));
    expect(trace.status).toBe('cancelled');
    expect(trace.steps.at(-1)?.label).toBe('Cancelled');
    expect(setTraceExpanded).toHaveBeenCalledTimes(2);
    expect(appendStreamingText).not.toHaveBeenCalled();
  });
});
