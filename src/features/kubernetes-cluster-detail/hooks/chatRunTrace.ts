import { ControlPlaneRun, ControlPlaneRunEvent } from '@/services/controlPlaneApi';
import { createLocalMessageId, previewValue } from '@/features/kubernetes-cluster-detail/lib/helpers';
import {
  appendReasoningSummaryDelta,
  appendReasoningUnavailable,
  appendRunTraceStep,
  completeReasoningSummary,
  formatTraceFailureDetail,
  mapRunStage,
  parseRunUsage,
  upsertToolCall
} from '@/features/kubernetes-cluster-detail/lib/trace-utils';
import { LiveRunTrace } from '@/features/kubernetes-cluster-detail/types';
import { PendingApproval } from '@/types';

export function isRunInProgress(status: ControlPlaneRun['status']): boolean {
  return status === 'queued' || status === 'dispatching' || status === 'running' || status === 'waiting_for_approval' || status === 'cancelling';
}

export function isRunTerminal(status: ControlPlaneRun['status']): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

export function isTraceInProgress(trace?: LiveRunTrace): boolean {
  return trace?.status === 'connecting' || trace?.status === 'running';
}

export function isTraceTerminal(trace?: LiveRunTrace): boolean {
  return trace?.status === 'completed' || trace?.status === 'failed' || trace?.status === 'cancelled';
}

export function mapRunStatusToTraceStatus(status: ControlPlaneRun['status']): LiveRunTrace['status'] {
  if (status === 'completed') return 'completed';
  if (status === 'failed') return 'failed';
  if (status === 'cancelled') return 'cancelled';
  return status === 'queued' || status === 'dispatching' ? 'connecting' : 'running';
}

export function buildTraceFromRunEvents(run: ControlPlaneRun, events: ControlPlaneRunEvent[]): LiveRunTrace {
  const restoredStep = {
    id: createLocalMessageId(),
    label: 'Run details restored',
    detail: isRunTerminal(run.status)
      ? 'Restored saved progress for this response.'
      : 'Reconnected to an in-progress assistant response.',
    status: 'info' as const,
    timestamp: Date.now()
  };
  let trace: LiveRunTrace = {
    runId: run.id,
    status: mapRunStatusToTraceStatus(run.status),
    steps: [restoredStep],
    toolCalls: [],
    timelineEvents: [
      {
        id: restoredStep.id,
        type: 'step',
        label: restoredStep.label,
        detail: restoredStep.detail,
        status: restoredStep.status,
        timestamp: restoredStep.timestamp
      }
    ]
  };

  let reachedTerminalEvent = false;
  for (const event of events) {
    if (reachedTerminalEvent) {
      break;
    }

    if (event.type === 'run_started') {
      trace = appendRunTraceStep({ ...trace, status: 'running' }, 'Assistant started', 'info', 'The assistant worker accepted the request.');
    } else if (event.type === 'assistant_message_started') {
      trace = appendRunTraceStep({ ...trace, status: 'running' }, 'Thinking started', 'info', 'Reviewing the request and available context.');
    } else if (event.type === 'assistant_message_completed') {
      const usage = parseRunUsage(event.payload?.usage);
      trace = appendRunTraceStep(usage ? { ...trace, usage } : trace, 'Response ready', 'success', 'The assistant finished writing its response.');
    } else if (event.type === 'run_progress') {
      const stage = typeof event.payload?.stage === 'string' ? event.payload.stage : 'progress';
      const message = typeof event.payload?.message === 'string' ? event.payload.message : '';
      trace = appendRunTraceStep({ ...trace, status: 'running' }, mapRunStage(stage), 'info', message || undefined);
    } else if (event.type === 'assistant_reasoning_summary_delta') {
      const text = typeof event.payload?.text === 'string' ? event.payload.text : '';
      const provider = typeof event.payload?.provider === 'string' ? event.payload.provider : undefined;
      const model = typeof event.payload?.model === 'string' ? event.payload.model : undefined;
      trace = appendReasoningSummaryDelta({ ...trace, status: 'running' }, text, provider, model);
    } else if (event.type === 'assistant_reasoning_summary_completed') {
      const text = typeof event.payload?.text === 'string' ? event.payload.text : '';
      const provider = typeof event.payload?.provider === 'string' ? event.payload.provider : undefined;
      const model = typeof event.payload?.model === 'string' ? event.payload.model : undefined;
      trace = completeReasoningSummary({ ...trace, status: 'running' }, text, provider, model);
    } else if (event.type === 'assistant_reasoning_summary_unavailable') {
      const reason = typeof event.payload?.reason === 'string' ? event.payload.reason : 'provider_omitted';
      const provider = typeof event.payload?.provider === 'string' ? event.payload.provider : undefined;
      const model = typeof event.payload?.model === 'string' ? event.payload.model : undefined;
      trace = appendReasoningUnavailable(trace, reason, provider, model);
    } else if (event.type === 'tool_call_started') {
      const callId = typeof event.payload?.call_id === 'string' ? event.payload.call_id : createLocalMessageId();
      const toolName = typeof event.payload?.tool === 'string' ? event.payload.tool : 'tool';
      trace = appendRunTraceStep(
        upsertToolCall(trace, callId, { callId, tool: toolName, status: 'running' }),
        `Tool call started: ${toolName}`,
        'info',
        previewValue(event.payload?.arguments, 600),
        'tool'
      );
    } else if (event.type === 'tool_call_completed') {
      const callId = typeof event.payload?.call_id === 'string' ? event.payload.call_id : createLocalMessageId();
      const toolName = typeof event.payload?.tool === 'string' ? event.payload.tool : 'tool';
      const isError = Boolean(event.payload?.is_error);
      trace = appendRunTraceStep(
        upsertToolCall(trace, callId, { callId, tool: toolName, status: 'completed', isError }),
        `Tool call completed: ${toolName}`,
        isError ? 'error' : 'success',
        previewValue(event.payload?.result, 6000),
        'tool'
      );
    } else if (event.type === 'tool_approval_requested') {
      const toolName = typeof event.payload?.tool === 'string' ? event.payload.tool : 'write tool';
      trace = appendRunTraceStep(
        { ...trace, status: 'running' },
        `Approval requested: ${toolName}`,
        'info',
        previewValue(event.payload?.arguments, 600),
        'tool'
      );
    } else if (event.type === 'tool_approval_approved') {
      const toolName = typeof event.payload?.tool === 'string' ? event.payload.tool : 'write tool';
      trace = appendRunTraceStep(trace, `Approval granted: ${toolName}`, 'success', 'User approved the write action.', 'tool');
    } else if (event.type === 'tool_approval_rejected') {
      const toolName = typeof event.payload?.tool === 'string' ? event.payload.tool : 'write tool';
      trace = appendRunTraceStep(trace, `Approval rejected: ${toolName}`, 'error', 'User rejected the write action.', 'tool');
    } else if (event.type === 'tool_approval_expired') {
      const toolName = typeof event.payload?.tool === 'string' ? event.payload.tool : 'write tool';
      trace = appendRunTraceStep(trace, `Approval expired: ${toolName}`, 'error', 'No approval was recorded before timeout.', 'tool');
    } else if (event.type === 'run_failed') {
      trace = appendRunTraceStep({ ...trace, status: 'failed' }, 'Could not complete', 'error', formatTraceFailureDetail());
      reachedTerminalEvent = true;
    } else if (event.type === 'run_completed') {
      trace = appendRunTraceStep({ ...trace, status: 'completed' }, 'Completed', 'success', 'The run finished successfully.');
      reachedTerminalEvent = true;
    } else if (event.type === 'run_cancelled') {
      trace = appendRunTraceStep({ ...trace, status: 'cancelled' }, 'Cancelled', 'error', 'You cancelled this response.');
      reachedTerminalEvent = true;
    }
  }

  return {
    ...trace,
    status: mapRunStatusToTraceStatus(run.status),
    usage: parseRunUsage(run.usage) || trace.usage
  };
}

export function createBaseRunTrace(runId: string, status: LiveRunTrace['status']): LiveRunTrace {
  return {
    runId,
    status,
    steps: [],
    toolCalls: []
  };
}

export function createRunEventHandler(args: {
  seenSeq: Set<number>;
  getTrace: () => LiveRunTrace;
  setTrace: (nextTrace: LiveRunTrace) => void;
  setTraceExpanded: (expanded: boolean) => void;
  ensureStreamingMessage: () => void;
  appendStreamingText: (text: string) => void;
  onApprovalRequested?: (approval: PendingApproval) => void;
  onApprovalResolved?: (approvalId: string, status: 'approved' | 'rejected' | 'expired') => void;
}): (event: ControlPlaneRunEvent) => void {
  const updateTrace = (nextTrace: LiveRunTrace): LiveRunTrace => {
    args.setTrace(nextTrace);
    return nextTrace;
  };

  return (event) => {
    if (!event || typeof event.seq !== 'number') return;
    if (args.seenSeq.has(event.seq)) return;

    let trace = args.getTrace();
    if (isTraceTerminal(trace)) return;
    args.seenSeq.add(event.seq);

    if (event.type === 'run_started') {
      trace = updateTrace({ ...trace, status: 'running' });
      updateTrace(appendRunTraceStep(trace, 'Assistant started', 'info', 'The assistant worker accepted the request.'));
      return;
    }

    if (event.type === 'assistant_message_started') {
      if (trace.status === 'connecting') {
        trace = updateTrace({ ...trace, status: 'running' });
      }
      updateTrace(
        appendRunTraceStep(trace, 'Thinking started', 'info', 'Reviewing the request and available context.')
      );
      args.ensureStreamingMessage();
      return;
    }

    if (event.type === 'assistant_token_delta') {
      if (trace.status === 'connecting') {
        updateTrace({ ...trace, status: 'running' });
      }
      const text = typeof event.payload?.text === 'string' ? event.payload.text : '';
      args.appendStreamingText(text);
      return;
    }

    if (event.type === 'assistant_message_completed') {
      const usage = parseRunUsage(event.payload?.usage);
      const nextTrace = usage ? { ...trace, usage } : trace;
      updateTrace(
        appendRunTraceStep(nextTrace, 'Response ready', 'success', 'The assistant finished writing its response.')
      );
      return;
    }

    if (event.type === 'run_progress') {
      const stage = typeof event.payload?.stage === 'string' ? event.payload.stage : 'progress';
      const message = typeof event.payload?.message === 'string' ? event.payload.message : '';
      if (trace.status === 'connecting') {
        trace = updateTrace({ ...trace, status: 'running' });
      }
      updateTrace(appendRunTraceStep(trace, mapRunStage(stage), 'info', message || undefined));
      return;
    }

    if (event.type === 'assistant_reasoning_summary_delta') {
      const text = typeof event.payload?.text === 'string' ? event.payload.text : '';
      const provider = typeof event.payload?.provider === 'string' ? event.payload.provider : undefined;
      const model = typeof event.payload?.model === 'string' ? event.payload.model : undefined;
      args.ensureStreamingMessage();
      if (trace.status === 'connecting') {
        trace = updateTrace({ ...trace, status: 'running' });
      }
      updateTrace(appendReasoningSummaryDelta(trace, text, provider, model));
      return;
    }

    if (event.type === 'assistant_reasoning_summary_completed') {
      const text = typeof event.payload?.text === 'string' ? event.payload.text : '';
      const provider = typeof event.payload?.provider === 'string' ? event.payload.provider : undefined;
      const model = typeof event.payload?.model === 'string' ? event.payload.model : undefined;
      args.ensureStreamingMessage();
      if (trace.status === 'connecting') {
        trace = updateTrace({ ...trace, status: 'running' });
      }
      updateTrace(completeReasoningSummary(trace, text, provider, model));
      return;
    }

    if (event.type === 'assistant_reasoning_summary_unavailable') {
      const reason = typeof event.payload?.reason === 'string' ? event.payload.reason : 'provider_omitted';
      const provider = typeof event.payload?.provider === 'string' ? event.payload.provider : undefined;
      const model = typeof event.payload?.model === 'string' ? event.payload.model : undefined;
      args.ensureStreamingMessage();
      updateTrace(appendReasoningUnavailable(trace, reason, provider, model));
      return;
    }

    if (event.type === 'tool_call_started') {
      const callId = typeof event.payload?.call_id === 'string' ? event.payload.call_id : createLocalMessageId();
      const toolName = typeof event.payload?.tool === 'string' ? event.payload.tool : 'tool';
      const nextTrace = upsertToolCall(trace, callId, {
        callId,
        tool: toolName,
        status: 'running'
      });
      updateTrace(
        appendRunTraceStep(
          nextTrace,
          `Tool call started: ${toolName}`,
          'info',
          previewValue(event.payload?.arguments, 600),
          'tool'
        )
      );
      return;
    }

    if (event.type === 'tool_call_completed') {
      const callId = typeof event.payload?.call_id === 'string' ? event.payload.call_id : createLocalMessageId();
      const toolName = typeof event.payload?.tool === 'string' ? event.payload.tool : 'tool';
      const isError = Boolean(event.payload?.is_error);
      const nextTrace = upsertToolCall(trace, callId, {
        callId,
        tool: toolName,
        status: 'completed',
        isError
      });
      updateTrace(
        appendRunTraceStep(
          nextTrace,
          `Tool call completed: ${toolName}`,
          isError ? 'error' : 'success',
          previewValue(event.payload?.result, 6000),
          'tool'
        )
      );
      return;
    }

    if (event.type === 'tool_approval_requested') {
      const approvalId = typeof event.payload?.approval_id === 'string' ? event.payload.approval_id : '';
      const toolName = typeof event.payload?.tool === 'string' ? event.payload.tool : 'write tool';
      const toolCallId = typeof event.payload?.tool_call_id === 'string' ? event.payload.tool_call_id : undefined;
      const expiresAt = typeof event.payload?.expires_at === 'string' ? event.payload.expires_at : undefined;
      const toolArguments = event.payload?.arguments && typeof event.payload.arguments === 'object'
        ? event.payload.arguments as Record<string, unknown>
        : {};
      if (approvalId) {
        args.onApprovalRequested?.({
          id: approvalId,
          runId: event.run_id,
          toolCallId,
          action: `Run ${toolName}`,
          toolName,
          arguments: toolArguments,
          expiresAt,
          status: 'pending'
        });
      }
      updateTrace(
        appendRunTraceStep(
          { ...trace, status: 'running' },
          `Approval requested: ${toolName}`,
          'info',
          previewValue(toolArguments, 600),
          'tool'
        )
      );
      return;
    }

    if (event.type === 'tool_approval_approved' || event.type === 'tool_approval_rejected' || event.type === 'tool_approval_expired') {
      const approvalId = typeof event.payload?.approval_id === 'string' ? event.payload.approval_id : '';
      const toolName = typeof event.payload?.tool === 'string' ? event.payload.tool : 'write tool';
      const status = event.type === 'tool_approval_approved'
        ? 'approved'
        : event.type === 'tool_approval_rejected'
          ? 'rejected'
          : 'expired';
      if (approvalId) args.onApprovalResolved?.(approvalId, status);
      updateTrace(
        appendRunTraceStep(
          trace,
          status === 'approved'
            ? `Approval granted: ${toolName}`
            : status === 'rejected'
              ? `Approval rejected: ${toolName}`
              : `Approval expired: ${toolName}`,
          status === 'approved' ? 'success' : 'error',
          status === 'approved'
            ? 'User approved the write action.'
            : status === 'rejected'
              ? 'User rejected the write action.'
              : 'No approval was recorded before timeout.',
          'tool'
        )
      );
      return;
    }

    if (event.type === 'run_failed') {
      updateTrace(
        appendRunTraceStep({ ...trace, status: 'failed' }, 'Could not complete', 'error', formatTraceFailureDetail())
      );
      args.setTraceExpanded(false);
      return;
    }

    if (event.type === 'run_completed') {
      updateTrace(
        appendRunTraceStep({ ...trace, status: 'completed' }, 'Completed', 'success', 'The run finished successfully.')
      );
      args.setTraceExpanded(false);
      return;
    }

    if (event.type === 'run_cancelled') {
      updateTrace(
        appendRunTraceStep({ ...trace, status: 'cancelled' }, 'Cancelled', 'error', 'You cancelled this response.')
      );
      args.setTraceExpanded(false);
    }
  };
}
