import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BookOpen, ChevronRight, CircleDashed, MessageSquare, Wrench } from 'lucide-react';
import { formatRunUsageDetail, getTraceActivityLabel } from '@/features/targets/chat/lib/trace-utils';
import { LiveRunTrace, RunTraceTimelineEvent } from '@/features/targets/chat/types';

interface TraceFooterProps {
  runId: string;
  trace: LiveRunTrace;
  isExpanded: boolean;
  setExpanded: (runId: string, expanded: boolean) => void;
  suppressCompactReasoningSummary?: boolean;
  compactStatusOnly?: boolean;
  className?: string;
}

function inferTimelineStepType(label: string): RunTraceTimelineEvent['type'] {
  if (label.startsWith('Skill context ') || label.startsWith('Loading skill context:')) return 'skill';
  return label.startsWith('Tool call ') || label.startsWith('Approval ') ? 'tool' : 'step';
}

function inferTimelineToolStatus(toolCall: LiveRunTrace['toolCalls'][number]): RunTraceTimelineEvent['status'] {
  if (toolCall.status === 'running') return 'info';
  return toolCall.isError ? 'error' : 'success';
}

function buildTimelineEvents(trace: LiveRunTrace): RunTraceTimelineEvent[] {
  if (trace.timelineEvents?.length) {
    return trace.timelineEvents;
  }

  const fallbackToolTimestamp = Math.max(
    0,
    ...trace.steps.map((step) => step.timestamp),
    ...(trace.reasoningSummaries || []).map((summary) => summary.timestamp)
  );

  return [
    ...trace.steps.map((step) => ({
      id: step.id,
      type: inferTimelineStepType(step.label),
      label: step.label,
      detail: step.detail,
      status: step.status,
      timestamp: step.timestamp
    })),
    ...(trace.reasoningSummaries || []).map((summary) => ({
      id: summary.id,
      type: 'reasoning' as const,
      label: summary.status === 'unavailable' ? 'Reasoning summary unavailable' : 'Reasoning summary',
      detail: summary.text,
      status: summary.status,
      provider: summary.provider,
      model: summary.model,
      timestamp: summary.timestamp
    })),
    ...trace.toolCalls.map((toolCall, index) => ({
      id: toolCall.callId,
      type: 'tool' as const,
      label: toolCall.tool,
      status: inferTimelineToolStatus(toolCall),
      timestamp: fallbackToolTimestamp + index + 1
    }))
  ].sort((left, right) => left.timestamp - right.timestamp);
}

function getTimelineEventMeta(event: RunTraceTimelineEvent): string {
  if (event.type === 'reasoning') {
    const source = [event.provider, event.model].filter(Boolean).join(' / ');
    const status = event.status === 'unavailable'
      ? 'Unavailable'
      : event.status === 'completed'
        ? 'Completed'
        : 'Live';
    return [source, status].filter(Boolean).join(' · ');
  }

  if (event.type === 'tool') {
    if (event.status === 'success') return 'Function tool · Done';
    if (event.status === 'error') return 'Function tool · Attention';
    if (event.status === 'info') return 'Function tool · Running';
    return 'Function tool';
  }

  if (event.type === 'skill') {
    if (event.status === 'success') return 'Skill context · Loaded';
    if (event.status === 'error') return 'Skill context · Unavailable';
    return 'Skill context';
  }

  if (event.status === 'success') return 'Done';
  if (event.status === 'error') return 'Attention';
  return 'Progress';
}

function getTimelineEventToneClass(event: RunTraceTimelineEvent): string {
  if (event.status === 'error') return 'text-status-danger-text';
  if (event.status === 'unavailable') return 'text-status-warning-text';
  if (event.status === 'success' || event.status === 'completed') return 'text-status-success-text';
  if (event.status === 'streaming') return 'text-accent-strong';
  return 'text-ui-text-muted';
}

function getTimelineMarkerClass(event: RunTraceTimelineEvent): string {
  if (event.status === 'error') return 'bg-status-danger';
  if (event.status === 'unavailable') return 'bg-status-warning';
  if (event.status === 'success' || event.status === 'completed') return 'bg-status-success';
  return 'bg-accent';
}

function formatCountedLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatCompactSkillSummary(skillLoads: LiveRunTrace['skillLoads'] = []): string | undefined {
  if (skillLoads.length === 0) return undefined;

  const loaded = skillLoads.filter((skillLoad) => skillLoad.status === 'loaded').length;
  const failed = skillLoads.filter((skillLoad) => skillLoad.status === 'failed').length;
  const loading = skillLoads.filter((skillLoad) => skillLoad.status === 'loading').length;
  const parts = [
    loaded > 0 ? `${formatCountedLabel(loaded, 'skill context', 'skill contexts')} loaded` : undefined,
    failed > 0 ? `${formatCountedLabel(failed, 'skill context', 'skill contexts')} unavailable` : undefined,
    loading > 0 ? `${formatCountedLabel(loading, 'skill context', 'skill contexts')} loading` : undefined
  ].filter(Boolean);

  return parts.join(', ');
}

/**
 * Shows compact and expandable reasoning details attached to one assistant message.
 */
export const TraceFooter: React.FC<TraceFooterProps> = ({
  runId,
  trace,
  isExpanded,
  setExpanded,
  suppressCompactReasoningSummary = false,
  compactStatusOnly = false,
  className
}) => {
  const contentId = React.useId();
  const shouldReduceMotion = useReducedMotion();
  const isInProgress = trace.status === 'connecting' || trace.status === 'running';
  const statusLabel = getTraceActivityLabel(trace);
  const completedToolCalls = trace.toolCalls.filter((toolCall) => toolCall.status === 'completed').length;
  const skillLoads = trace.skillLoads || [];
  const reasoningSummaryCount = trace.reasoningSummaries?.length || 0;
  const compactReasoningSummary = isInProgress && !suppressCompactReasoningSummary
    ? trace.activeReasoningSummary?.trim()
    : '';
  const hasCompactReasoningSummary = Boolean(compactReasoningSummary);
  const shouldShowCompactStatusLabel = hasCompactReasoningSummary || !isInProgress || !suppressCompactReasoningSummary;
  const compactStatusLabel = hasCompactReasoningSummary ? 'Working through' : statusLabel;
  const usageDetail = formatRunUsageDetail(trace.usage);
  const timelineEvents = buildTimelineEvents(trace);
  const timelineScrollRef = React.useRef<HTMLDivElement>(null);
  const latestTimelineEventKey = timelineEvents.at(-1)
    ? [
        timelineEvents.at(-1)?.id,
        timelineEvents.at(-1)?.timestamp,
        timelineEvents.at(-1)?.status,
        timelineEvents.at(-1)?.detail || ''
      ].join(':')
    : '';
  const compactToolSummary =
    trace.toolCalls.length > 0
      ? `${completedToolCalls} of ${trace.toolCalls.length} function calls complete`
      : 'No function tool calls';
  const compactSkillSummary = formatCompactSkillSummary(skillLoads);
  const activitySummary = trace.status === 'connecting'
    ? 'Waiting for progress'
    : [
        `${trace.steps.length} steps`,
        reasoningSummaryCount > 0 ? `${reasoningSummaryCount} summaries` : undefined,
        compactSkillSummary,
        compactToolSummary,
        trace.status === 'completed' ? usageDetail : undefined
      ].filter(Boolean).join(' · ');
  const disclosureLabel = isExpanded ? 'Hide run details' : 'Show run details';
  const disclosureSummary = hasCompactReasoningSummary ? compactReasoningSummary : activitySummary;
  const statusDotClass = trace.status === 'completed'
    ? 'bg-status-success'
    : trace.status === 'failed' || trace.status === 'cancelled'
      ? 'bg-status-danger'
      : 'bg-accent';

  React.useLayoutEffect(() => {
    if (!isExpanded || !isInProgress || !timelineScrollRef.current) return;
    timelineScrollRef.current.scrollTop = timelineScrollRef.current.scrollHeight;
  }, [isExpanded, isInProgress, latestTimelineEventKey, timelineEvents.length]);

  return (
    <div className={`${compactStatusOnly ? '' : 'mt-3'} w-full ${className || 'max-w-[72ch]'}`}>
      <button
        type="button"
        onClick={() => setExpanded(runId, !isExpanded)}
        className={`group min-h-10 items-center gap-2 py-2 pl-0 pr-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 ${
          isExpanded
            ? 'flex w-full rounded-md bg-ui-surface/45 text-ui-text hover:bg-ui-surface/75'
            : 'flex w-full rounded-md bg-ui-surface/45 text-ui-text-muted hover:bg-ui-surface/75 hover:text-ui-text'
        }`}
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <span
          className={`-ml-1 shrink-0 text-ui-text-muted group-hover:text-ui-text ${
            shouldReduceMotion
              ? ''
              : 'transition-transform duration-150 ease-out'
          } ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
          aria-hidden="true"
        >
          <ChevronRight className="h-4 w-4" />
        </span>
        <span className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass} ${isInProgress ? 'animate-pulse motion-reduce:animate-none' : ''}`} />
        <span className="type-caption shrink-0 text-ui-text">
          {disclosureLabel}
        </span>
        <span
          className="flex min-w-0 max-w-[min(34rem,54vw)] flex-1 items-center gap-1.5"
          aria-live="polite"
        >
          {shouldShowCompactStatusLabel && (
            <span className="type-micro-label shrink-0 text-ui-text-muted">
              {compactStatusLabel}
            </span>
          )}
          {shouldShowCompactStatusLabel && (
            <span className="type-caption shrink-0 text-ui-text-muted/70">·</span>
          )}
          <span
            className={`type-caption min-w-0 truncate ${
              hasCompactReasoningSummary
                ? 'text-ui-text'
                : 'text-ui-text-muted'
            }`}
            title={disclosureSummary}
          >
            {disclosureSummary}
          </span>
        </span>
      </button>
      <div id={contentId} hidden={!isExpanded}>
        {isExpanded && (
          <motion.div
            key="details"
            className="mt-1 border-t border-ui-border/80 pt-1"
            initial={shouldReduceMotion ? false : { opacity: 0, y: -4 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="max-h-80 overflow-hidden">
              {timelineEvents.length > 0 ? (
                <div ref={timelineScrollRef} className="max-h-80 divide-y divide-ui-border overflow-y-auto overscroll-contain">
                  {timelineEvents.map((event) => (
                    <div key={event.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 px-3 py-2.5">
                      <span className="mt-0.5 flex h-5 w-5 items-center justify-center">
                        {event.type === 'reasoning' ? (
                          <MessageSquare className={`h-3.5 w-3.5 ${getTimelineEventToneClass(event)}`} />
                        ) : event.type === 'tool' ? (
                          <Wrench className={`h-3.5 w-3.5 ${getTimelineEventToneClass(event)}`} />
                        ) : event.type === 'skill' ? (
                          <BookOpen className={`h-3.5 w-3.5 ${getTimelineEventToneClass(event)}`} />
                        ) : (
                          <span className={`h-2 w-2 rounded-full ${getTimelineMarkerClass(event)}`} />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-baseline gap-2">
                          <p className="type-caption min-w-0 truncate text-ui-text" title={event.label}>
                            {event.label}
                          </p>
                          <span
                            className={`type-micro-label max-w-[45%] shrink truncate ${getTimelineEventToneClass(event)}`}
                            title={getTimelineEventMeta(event)}
                          >
                            {getTimelineEventMeta(event)}
                          </span>
                        </div>
                        {event.detail && (
                          <p
                            className="type-caption mt-0.5 line-clamp-4 whitespace-pre-wrap break-words text-ui-text-muted"
                            title={event.detail}
                          >
                            {event.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="type-caption flex items-center gap-2 px-3 py-2">
                  <CircleDashed className="h-3.5 w-3.5" />
                  No run activity has been recorded for this message.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
