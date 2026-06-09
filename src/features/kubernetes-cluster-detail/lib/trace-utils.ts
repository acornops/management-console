import { LiveRunTrace, RunTraceStatus, RunTraceStep, RunTraceToolCall, RunTraceUsage } from '@/features/kubernetes-cluster-detail/types';
import { createLocalMessageId } from '@/features/kubernetes-cluster-detail/lib/helpers';

const MAX_TRACE_STEPS = 200;

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
  const usage = value as { input_tokens?: unknown; output_tokens?: unknown; tool_calls?: unknown };
  const inputTokens = toNonNegativeInt(usage.input_tokens);
  const outputTokens = toNonNegativeInt(usage.output_tokens);
  const toolCalls = toNonNegativeInt(usage.tool_calls);
  if (inputTokens === null || outputTokens === null) return undefined;
  return {
    inputTokens,
    outputTokens,
    toolCalls: toolCalls ?? 0
  };
}

export function formatRunUsageDetail(usage: RunTraceUsage | undefined): string | undefined {
  if (!usage) return undefined;
  return `Tokens: input ${usage.inputTokens}, output ${usage.outputTokens}`;
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
  detail?: string
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

  return {
    ...currentTrace,
    steps: [
      ...currentTrace.steps,
      {
        id: createLocalMessageId(),
        label,
        detail,
        status,
        timestamp: Date.now()
      }
    ].slice(-MAX_TRACE_STEPS)
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
