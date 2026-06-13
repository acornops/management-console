import { LiveRunTrace, RunTraceReasoningSummary, RunTraceStatus, RunTraceStep, RunTraceTimelineEvent, RunTraceToolCall, RunTraceUsage } from '@/features/kubernetes-cluster-detail/types';
import { createLocalMessageId } from '@/features/kubernetes-cluster-detail/lib/helpers';

const MAX_TRACE_STEPS = 200;
const MAX_REASONING_SUMMARIES = 50;
const MAX_REASONING_SUMMARY_CHARS = 20_000;
const MAX_TIMELINE_EVENTS = 250;

/**
 * Returns fixed detail text for run-level errors in the reasoning pane.
 */
export function formatTraceFailureDetail(): string {
  return 'Check the assistant response for details.';
}

function toNonNegativeInt(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value < 0) return null;
  return Math.floor(value);
}

/**
 * Parses usage payloads from stream events and run objects.
 */
export function parseRunUsage(value: unknown): RunTraceUsage | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const usage = value as { input_tokens?: unknown; output_tokens?: unknown; tool_calls?: unknown; reasoning_tokens?: unknown };
  const inputTokens = toNonNegativeInt(usage.input_tokens);
  const outputTokens = toNonNegativeInt(usage.output_tokens);
  const toolCalls = toNonNegativeInt(usage.tool_calls);
  const reasoningTokens = toNonNegativeInt(usage.reasoning_tokens);
  if (inputTokens === null || outputTokens === null) return undefined;
  return {
    inputTokens,
    outputTokens,
    toolCalls: toolCalls ?? 0,
    reasoningTokens: reasoningTokens ?? undefined
  };
}

export function formatRunUsageDetail(usage: RunTraceUsage | undefined): string | undefined {
  if (!usage) return undefined;
  const reasoning = usage.reasoningTokens !== undefined ? `, reasoning ${usage.reasoningTokens}` : '';
  return `Tokens: input ${usage.inputTokens}, output ${usage.outputTokens}${reasoning}`;
}

function normalizeReasoningText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function capReasoningSummaries(summaries: RunTraceReasoningSummary[]): RunTraceReasoningSummary[] {
  const capped = summaries.slice(-MAX_REASONING_SUMMARIES);
  let totalChars = 0;
  const retained: RunTraceReasoningSummary[] = [];
  for (let index = capped.length - 1; index >= 0; index -= 1) {
    const item = capped[index];
    const remainingChars = MAX_REASONING_SUMMARY_CHARS - totalChars;
    if (remainingChars <= 0) break;
    if (item.text.length > remainingChars) {
      if (retained.length === 0) {
        retained.unshift({ ...item, text: item.text.slice(0, remainingChars) });
      }
      break;
    }
    retained.unshift(item);
    totalChars += item.text.length;
  }
  return retained;
}

function capTimelineEvents(events: RunTraceTimelineEvent[] | undefined): RunTraceTimelineEvent[] | undefined {
  if (!events) return undefined;
  return events.slice(-MAX_TIMELINE_EVENTS);
}

function appendTimelineEvent(currentTrace: LiveRunTrace, event: RunTraceTimelineEvent): RunTraceTimelineEvent[] {
  return capTimelineEvents([...(currentTrace.timelineEvents || []), event]) || [];
}

function upsertTimelineEvent(currentTrace: LiveRunTrace, event: RunTraceTimelineEvent): RunTraceTimelineEvent[] {
  const events = currentTrace.timelineEvents || [];
  const existingIndex = events.findIndex((item) => item.id === event.id);
  if (existingIndex < 0) {
    return appendTimelineEvent(currentTrace, event);
  }
  const nextEvents = [...events];
  nextEvents[existingIndex] = event;
  return capTimelineEvents(nextEvents) || [];
}

export function appendReasoningSummaryDelta(
  currentTrace: LiveRunTrace,
  text: string,
  provider?: string,
  model?: string
): LiveRunTrace {
  const normalized = normalizeReasoningText(text);
  if (!normalized) return currentTrace;
  const summaries = currentTrace.reasoningSummaries || [];
  const last = summaries.at(-1);
  const nextSummary: RunTraceReasoningSummary = last && last.status === 'streaming'
    ? {
        ...last,
        text: normalizeReasoningText(`${last.text} ${normalized}`),
        provider: provider || last.provider,
        model: model || last.model
      }
    : {
        id: createLocalMessageId(),
        text: normalized,
        provider,
        model,
        status: 'streaming',
        timestamp: Date.now()
      };
  const nextSummaries = last && last.status === 'streaming'
    ? [...summaries.slice(0, -1), nextSummary]
    : [...summaries, nextSummary];
  const cappedSummaries = capReasoningSummaries(nextSummaries);
  const retainedSummary = cappedSummaries.find((summary) => summary.id === nextSummary.id) || nextSummary;
  return {
    ...currentTrace,
    reasoningSummaries: cappedSummaries,
    timelineEvents: upsertTimelineEvent(currentTrace, {
      id: retainedSummary.id,
      type: 'reasoning',
      label: 'Reasoning summary',
      detail: retainedSummary.text,
      status: retainedSummary.status,
      provider: retainedSummary.provider,
      model: retainedSummary.model,
      timestamp: retainedSummary.timestamp
    }),
    activeReasoningSummary: retainedSummary.text
  };
}

export function completeReasoningSummary(
  currentTrace: LiveRunTrace,
  text: string,
  provider?: string,
  model?: string
): LiveRunTrace {
  const normalized = normalizeReasoningText(text);
  if (!normalized) return currentTrace;
  const summaries = currentTrace.reasoningSummaries || [];
  const last = summaries.at(-1);
  const completed: RunTraceReasoningSummary = last && last.status === 'streaming'
    ? { ...last, text: normalized, provider: provider || last.provider, model: model || last.model, status: 'completed' }
    : { id: createLocalMessageId(), text: normalized, provider, model, status: 'completed', timestamp: Date.now() };
  const nextSummaries = last && last.status === 'streaming'
    ? [...summaries.slice(0, -1), completed]
    : [...summaries, completed];
  const cappedSummaries = capReasoningSummaries(nextSummaries);
  const retainedSummary = cappedSummaries.find((summary) => summary.id === completed.id) || completed;
  return {
    ...currentTrace,
    reasoningSummaries: cappedSummaries,
    timelineEvents: upsertTimelineEvent(currentTrace, {
      id: retainedSummary.id,
      type: 'reasoning',
      label: 'Reasoning summary',
      detail: retainedSummary.text,
      status: retainedSummary.status,
      provider: retainedSummary.provider,
      model: retainedSummary.model,
      timestamp: retainedSummary.timestamp
    }),
    activeReasoningSummary: retainedSummary.text
  };
}

export function appendReasoningUnavailable(
  currentTrace: LiveRunTrace,
  reason: string,
  provider?: string,
  model?: string
): LiveRunTrace {
  const detail = reason.replace(/_/g, ' ');
  const summary: RunTraceReasoningSummary = {
    id: createLocalMessageId(),
    text: `Reasoning summary unavailable: ${detail}`,
    provider,
    model,
    status: 'unavailable',
    reason,
    timestamp: Date.now()
  };
  return {
    ...currentTrace,
    reasoningSummaries: capReasoningSummaries([
      ...(currentTrace.reasoningSummaries || []),
      summary
    ]),
    timelineEvents: appendTimelineEvent(currentTrace, {
      id: summary.id,
      type: 'reasoning',
      label: 'Reasoning summary unavailable',
      detail: summary.text,
      status: 'unavailable',
      provider,
      model,
      timestamp: summary.timestamp
    })
  };
}

export function getTraceActivityLabel(trace: LiveRunTrace): string {
  if (trace.status === 'completed') return 'Done';
  if (trace.status === 'failed') return 'Could not complete';
  if (trace.status === 'cancelled') return 'Cancelled';
  if (trace.status === 'connecting') return 'Thinking';

  let hasUnresolvedApproval = false;
  for (let index = trace.steps.length - 1; index >= 0; index -= 1) {
    const step = trace.steps[index];
    if (
      step.label.startsWith('Approval granted:') ||
      step.label.startsWith('Approval rejected:') ||
      step.label.startsWith('Approval expired:')
    ) {
      break;
    }
    if (step.label.startsWith('Approval requested:')) {
      hasUnresolvedApproval = true;
      break;
    }
  }
  if (hasUnresolvedApproval) return 'Waiting for approval';

  if (trace.toolCalls.some((toolCall) => toolCall.status === 'running')) return 'Using tools';

  const latestStep = trace.steps.at(-1)?.label || '';
  if (latestStep === 'Reviewing context' || latestStep === 'Context ready') return 'Reviewing context';
  if (latestStep === 'Thinking' || latestStep === 'Thinking started') return 'Thinking';
  if (latestStep === 'Writing response' || latestStep === 'Response ready') return 'Writing response';
  if (latestStep === 'Request queued' || latestStep === 'Submitting request' || latestStep === 'Conversation ready') {
    return 'Thinking';
  }

  return 'Working';
}

/**
 * Appends a reasoning step while deduplicating identical consecutive entries.
 */
export function appendRunTraceStep(
  currentTrace: LiveRunTrace,
  label: string,
  status: RunTraceStep['status'] = 'info',
  detail?: string,
  timelineType: RunTraceTimelineEvent['type'] = 'step'
): LiveRunTrace {
  const lastStep = currentTrace.steps[currentTrace.steps.length - 1];
  if (
    lastStep &&
    lastStep.label === label &&
    lastStep.status === status &&
    (lastStep.detail || '') === (detail || '')
  ) {
    return currentTrace;
  }
  const timestamp = Date.now();
  const step: RunTraceStep = {
    id: createLocalMessageId(),
    label,
    detail,
    status,
    timestamp
  };

  return {
    ...currentTrace,
    steps: [
      ...currentTrace.steps,
      step
    ].slice(-MAX_TRACE_STEPS),
    timelineEvents: appendTimelineEvent(currentTrace, {
      id: step.id,
      type: timelineType,
      label: step.label,
      detail: step.detail,
      status: step.status,
      timestamp: step.timestamp
    })
  };
}

/**
 * Inserts or updates a tool call progress record for one run.
 */
export function upsertToolCall(
  currentTrace: LiveRunTrace,
  callId: string,
  patch: Partial<RunTraceToolCall>
): LiveRunTrace {
  const existingIndex = currentTrace.toolCalls.findIndex((toolCall) => toolCall.callId === callId);
  let nextToolCalls = [...currentTrace.toolCalls];

  if (existingIndex >= 0) {
    nextToolCalls[existingIndex] = {
      ...nextToolCalls[existingIndex],
      ...patch
    };
  } else {
    nextToolCalls = [
      ...nextToolCalls,
      {
        callId,
        tool: patch.tool || 'tool',
        status: patch.status || 'running',
        isError: patch.isError
      }
    ];
  }

  return {
    ...currentTrace,
    toolCalls: nextToolCalls
  };
}

export function mapTraceStatusClass(status: RunTraceStatus): string {
  if (status === 'completed') return 'bg-status-success-soft text-status-success-text';
  if (status === 'failed') return 'bg-status-danger-soft text-status-danger-text';
  if (status === 'cancelled') return 'bg-status-warning-soft text-status-warning-text';
  return 'bg-metric-blue/10 text-metric-blue';
}

export function mapRunStage(stage: string): string {
  if (stage === 'bootstrap') return 'Preparing response';
  if (stage === 'context_fetch') return 'Reviewing context';
  if (stage === 'context_ready') return 'Context ready';
  if (stage === 'reasoning') return 'Thinking';
  if (stage === 'inference') return 'Writing response';
  return `Progress: ${stage}`;
}

export function getStatusBadgeClass(status: string): string {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('running') || normalized.includes('ready') || normalized.includes('succeeded')) {
    return 'bg-status-success-soft text-status-success-text';
  }
  if (normalized.includes('pending') || normalized.includes('unknown')) {
    return 'bg-status-warning-soft text-status-warning-text';
  }
  return 'bg-status-danger-soft text-status-danger-text';
}
