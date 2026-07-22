import { ControlPlaneRun, ControlPlaneRunEvent } from '@/services/controlPlaneApi';
import { createLocalMessageId, previewValue } from '@/features/targets/chat/lib/helpers';
import {
  appendReasoningSummaryDelta,
  appendReasoningUnavailable,
  appendRunTraceStep,
  completeReasoningSummary,
  formatTraceFailureDetail,
  mapRunStage,
  parseRunUsage,
  upsertSkillLoad,
  upsertToolCall
} from '@/features/targets/chat/lib/trace-utils';
import { LiveRunTrace } from '@/features/targets/chat/types';
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

export function hasTraceDetails(trace?: LiveRunTrace): boolean {
  return Boolean(
    trace && (
      trace.steps.length > 0 ||
      trace.toolCalls.length > 0 ||
      (trace.skillLoads?.length || 0) > 0 ||
      (trace.reasoningSummaries?.length || 0) > 0 ||
      (trace.timelineEvents?.length || 0) > 0 ||
      Boolean(trace.usage)
    )
  );
}

export function traceDetailScore(trace?: LiveRunTrace): number {
  if (!trace) return 0;
  return (
    trace.steps.length +
    trace.toolCalls.length * 2 +
    (trace.skillLoads?.length || 0) * 2 +
    (trace.reasoningSummaries?.length || 0) * 2 +
    (trace.timelineEvents?.length || 0) +
    (trace.usage ? 1 : 0)
  );
}

export function preferRicherRunTrace(existing: LiveRunTrace | undefined, restored: LiveRunTrace): LiveRunTrace {
  if (!existing || traceDetailScore(existing) <= traceDetailScore(restored)) return restored;
  return {
    ...existing,
    status: restored.status,
    usage: restored.usage || existing.usage
  };
}

export function mapRunStatusToTraceStatus(status: ControlPlaneRun['status']): LiveRunTrace['status'] {
  if (status === 'completed') return 'completed';
  if (status === 'failed') return 'failed';
  if (status === 'cancelled') return 'cancelled';
  return status === 'queued' || status === 'dispatching' ? 'connecting' : 'running';
}

function toolResultDetail(result: unknown, contextMeta?: LiveRunTrace['toolCalls'][number]['contextMeta']): string {
  const serialized = (() => {
    if (typeof result === 'string') return result;
    try {
      return JSON.stringify(result, null, 2) || '';
    } catch {
      return String(result || '');
    }
  })();
  const evidence = serialized.length <= 16_384
    ? serialized
    : 'Structured evidence exceeded the 16,384-character trace viewer limit.';
  if (!contextMeta) return evidence;
  const projection = contextMeta.strategy.replaceAll('_', ' ');
  const status = contextMeta.truncated
    ? `${contextMeta.omissions?.length || 1} explicit omission(s)`
    : 'no explicit projection omissions';
  return [`Evidence: ${projection} · ${status}`, evidence].filter(Boolean).join('\n\n');
}

function parseContextMeta(value: unknown): LiveRunTrace['toolCalls'][number]['contextMeta'] | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const metadata = value as Record<string, unknown>;
  if (
    metadata.schema_version !== 'v1'
    || typeof metadata.strategy !== 'string'
    || metadata.strategy.length === 0
  ) return undefined;
  return {
    schema_version: 'v1',
    strategy: metadata.strategy,
    ...(typeof metadata.original_bytes === 'number' ? { original_bytes: metadata.original_bytes } : {}),
    ...(typeof metadata.context_bytes === 'number' ? { context_bytes: metadata.context_bytes } : {}),
    truncated: metadata.truncated === true,
    omissions: Array.isArray(metadata.omissions) ? metadata.omissions : []
  };
}

function parseArtifact(value: unknown): LiveRunTrace['toolCalls'][number]['artifact'] | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const artifact = value as Record<string, unknown>;
  if (
    typeof artifact.id !== 'string' || typeof artifact.expires_at !== 'string'
    || typeof artifact.sha256 !== 'string' || typeof artifact.content_type !== 'string'
    || typeof artifact.uncompressed_bytes !== 'number' || typeof artifact.compressed_bytes !== 'number'
  ) return undefined;
  return artifact as LiveRunTrace['toolCalls'][number]['artifact'];
}

function parseReportArtifact(value: unknown): LiveRunTrace['toolCalls'][number]['reportArtifact'] | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const envelope = value as Record<string, unknown>;
  const structured = envelope.structuredContent && typeof envelope.structuredContent === 'object'
    ? envelope.structuredContent as Record<string, unknown>
    : envelope;
  if (typeof structured.reportId !== 'string' || typeof structured.downloadUrl !== 'string'
    || structured.mediaType !== 'application/pdf') return undefined;
  return {
    reportId: structured.reportId,
    title: typeof structured.title === 'string' ? structured.title : 'Workflow report',
    mediaType: 'application/pdf',
    downloadUrl: structured.downloadUrl,
    ...(typeof structured.retentionExpiresAt === 'string' ? { retentionExpiresAt: structured.retentionExpiresAt } : {})
  };
}

function applySkillContextEvent(trace: LiveRunTrace, event: ControlPlaneRunEvent): LiveRunTrace | null {
  if (
    event.type !== 'skill_context_load_started' &&
    event.type !== 'skill_context_loaded' &&
    event.type !== 'skill_context_load_failed'
  ) {
    return null;
  }

  const skillRef = typeof event.payload?.skill_ref === 'string' ? event.payload.skill_ref : createLocalMessageId();
  const skillName = typeof event.payload?.name === 'string' ? event.payload.name : skillRef;

  if (event.type === 'skill_context_load_started') {
    return appendRunTraceStep(
      upsertSkillLoad(trace, skillRef, { skillRef, name: skillName, status: 'loading' }),
      `Loading skill context: ${skillName}`,
      'info',
      undefined,
      'skill'
    );
  }

  if (event.type === 'skill_context_loaded') {
    const skillId = typeof event.payload?.skill_id === 'string' ? event.payload.skill_id : undefined;
    const fileCount = typeof event.payload?.file_count === 'number' ? event.payload.file_count : undefined;
    const totalBytes = typeof event.payload?.total_bytes === 'number' ? event.payload.total_bytes : undefined;
    const detail = fileCount !== undefined && totalBytes !== undefined ? `${fileCount} files, ${totalBytes} bytes` : undefined;
    return appendRunTraceStep(
      upsertSkillLoad(trace, skillRef, { skillRef, skillId, name: skillName, status: 'loaded', fileCount, totalBytes }),
      `Skill context loaded: ${skillName}`,
      'success',
      detail,
      'skill'
    );
  }

  const message = typeof event.payload?.message === 'string' ? event.payload.message : 'Skill context was not available.';
  return appendRunTraceStep(
    upsertSkillLoad(trace, skillRef, { skillRef, name: skillName, status: 'failed' }),
    `Skill context unavailable: ${skillName}`,
    'error',
    message,
    'skill'
  );
}

function applyTargetInsightsContextEvent(trace: LiveRunTrace, event: ControlPlaneRunEvent): LiveRunTrace {
  const snippetCount = typeof event.payload?.snippet_count === 'number' ? event.payload.snippet_count : 0;
  const retrievalStatus = typeof event.payload?.retrieval_status === 'string'
    ? event.payload.retrieval_status
    : snippetCount > 0 ? 'hit' : 'miss';
  const snippets = Array.isArray(event.payload?.snippets) ? event.payload.snippets : [];
  const titles = snippets
    .map((snippet) => snippet && typeof snippet === 'object' && typeof snippet.title === 'string' ? snippet.title : '')
    .filter(Boolean)
    .slice(0, 4);
  const detail = (() => {
    if (retrievalStatus === 'hit') {
      return titles.length > 0
        ? `Matched:\n${titles.join('\n')}`
        : `${snippetCount} active Insights files matched this run.`;
    }
    if (retrievalStatus === 'miss') {
      return 'No matching active Insights files.';
    }
    if (retrievalStatus === 'disabled') {
      return 'Insights is disabled in this environment.';
    }
    if (retrievalStatus === 'skipped') {
      return 'Insights is turned off for this target.';
    }
    if (retrievalStatus === 'error') {
      return 'Insights retrieval failed; the run continued without snippets.';
    }
    return snippetCount > 0
      ? `${snippetCount} active Insights files matched this run.`
      : 'No matching active Insights files.';
  })();
  const status = retrievalStatus === 'hit'
    ? 'success'
    : retrievalStatus === 'error' ? 'error' : 'info';
  return appendRunTraceStep(
    { ...trace, status: trace.status === 'connecting' ? 'running' : trace.status },
    'Insights searched',
    status,
    detail
  );
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
    skillLoads: [],
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
    } else if (event.type === 'skill_catalog_available') {
      trace = { ...trace, status: 'running' };
    } else if (event.type === 'target_insights_context_retrieved') {
      trace = applyTargetInsightsContextEvent(trace, event);
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
      const artifact = parseArtifact(event.payload?.artifact);
      const contextMeta = parseContextMeta(event.payload?.context_meta);
      const reportArtifact = parseReportArtifact(event.payload?.result);
      trace = appendRunTraceStep(
        upsertToolCall(trace, callId, {
          callId,
          tool: toolName,
          status: 'completed',
          isError,
          ...(contextMeta ? { contextMeta } : {}),
          ...(artifact ? { artifact } : {}),
          ...(reportArtifact ? { reportArtifact } : {}),
          ...(event.payload?.artifactUnavailable ? { artifactUnavailable: true } : {})
        }),
        `Tool call completed: ${toolName}`,
        isError ? 'error' : 'success',
        toolResultDetail(event.payload?.result, contextMeta),
        'tool'
      );
    } else if (
      event.type === 'skill_context_load_started' ||
      event.type === 'skill_context_loaded' ||
      event.type === 'skill_context_load_failed'
    ) {
      const skillTrace = applySkillContextEvent(trace, event);
      if (skillTrace) {
        trace = skillTrace;
      }
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
      trace = appendRunTraceStep(
        { ...trace, status: 'failed' },
        'Could not complete',
        'error',
        formatTraceFailureDetail(event.payload?.code, event.payload?.message)
      );
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
    toolCalls: [],
    skillLoads: []
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

    if (event.type === 'skill_catalog_available') {
      if (trace.status === 'connecting') {
        updateTrace({ ...trace, status: 'running' });
      }
      return;
    }

    if (event.type === 'target_insights_context_retrieved') {
      updateTrace(applyTargetInsightsContextEvent(trace, event));
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
      const artifact = parseArtifact(event.payload?.artifact);
      const contextMeta = parseContextMeta(event.payload?.context_meta);
      const reportArtifact = parseReportArtifact(event.payload?.result);
      const nextTrace = upsertToolCall(trace, callId, {
        callId,
        tool: toolName,
        status: 'completed',
        isError,
        ...(contextMeta ? { contextMeta } : {}),
        ...(artifact ? { artifact } : {}),
        ...(reportArtifact ? { reportArtifact } : {}),
        ...(event.payload?.artifactUnavailable ? { artifactUnavailable: true } : {})
      });
      updateTrace(
        appendRunTraceStep(
          nextTrace,
          `Tool call completed: ${toolName}`,
          isError ? 'error' : 'success',
          toolResultDetail(event.payload?.result, contextMeta),
          'tool'
        )
      );
      return;
    }

    const skillTrace = applySkillContextEvent(trace, event);
    if (skillTrace) {
      updateTrace(skillTrace);
      return;
    }

    if (event.type === 'tool_approval_requested') {
      const approvalId = typeof event.payload?.approval_id === 'string' ? event.payload.approval_id : '';
      const toolName = typeof event.payload?.tool === 'string' ? event.payload.tool : 'write tool';
      const toolCallId = typeof event.payload?.tool_call_id === 'string' ? event.payload.tool_call_id : undefined;
      const summary = typeof event.payload?.summary === 'string' ? event.payload.summary : undefined;
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
          summary,
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
        appendRunTraceStep(
          { ...trace, status: 'failed' },
          'Could not complete',
          'error',
          formatTraceFailureDetail(event.payload?.code, event.payload?.message)
        )
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
