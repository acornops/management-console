import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, ChevronRight, CircleDashed, Wrench } from 'lucide-react';
import { formatRunUsageDetail, getTraceActivityLabel } from '@/features/kubernetes-cluster-detail/lib/trace-utils';
import { LiveRunTrace } from '@/features/kubernetes-cluster-detail/types';

interface TraceFooterProps {
  runId: string;
  trace: LiveRunTrace;
  isExpanded: boolean;
  setExpanded: (runId: string, expanded: boolean) => void;
}

/**
 * Shows compact and expandable reasoning details attached to one assistant message.
 */
export const TraceFooter: React.FC<TraceFooterProps> = ({
  runId,
  trace,
  isExpanded,
  setExpanded
}) => {
  const contentId = React.useId();
  const shouldReduceMotion = useReducedMotion();
  const isInProgress = trace.status === 'connecting' || trace.status === 'running';
  const statusLabel = getTraceActivityLabel(trace);
  const completedToolCalls = trace.toolCalls.filter((toolCall) => toolCall.status === 'completed').length;
  const usageDetail = formatRunUsageDetail(trace.usage);
  const compactToolSummary =
    trace.toolCalls.length > 0
      ? `${completedToolCalls} of ${trace.toolCalls.length} tools complete`
      : 'No tools';
  const activitySummary = trace.status === 'connecting'
    ? 'Waiting for progress'
    : [
        `${trace.steps.length} steps`,
        compactToolSummary,
        trace.status === 'completed' ? usageDetail : undefined
      ].filter(Boolean).join(' · ');
  const disclosureLabel = isExpanded ? 'Hide run details' : 'Show run details';
  const statusDotClass = trace.status === 'completed'
    ? 'bg-status-success'
    : trace.status === 'failed' || trace.status === 'cancelled'
      ? 'bg-status-danger'
      : 'bg-accent';

  return (
    <div className="mt-3 max-w-[72ch]">
      <button
        type="button"
        onClick={() => setExpanded(runId, !isExpanded)}
        className={`group inline-flex min-h-10 max-w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 ${
          isExpanded
            ? 'bg-ui-surface text-ui-text shadow-sm ring-1 ring-ui-border'
            : 'bg-ui-surface/45 text-ui-text-muted hover:bg-ui-surface/75 hover:text-ui-text'
        }`}
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass} ${isInProgress ? 'animate-pulse' : ''}`} />
        <span className="type-caption shrink-0 text-ui-text">
          {disclosureLabel}
        </span>
        <span className="type-micro-label w-[9.25rem] shrink-0 text-ui-text-muted" aria-live="polite">
          {statusLabel}
        </span>
        <span className="type-caption min-w-0 max-w-[min(20rem,45vw)] truncate" title={activitySummary}>
          {activitySummary}
        </span>
        <span className="shrink-0 text-ui-text-muted transition-colors group-hover:text-ui-text">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
      </button>
      <div id={contentId} hidden={!isExpanded}>
        {isExpanded && (
          <motion.div
            key="details"
            initial={shouldReduceMotion ? false : { opacity: 0, y: -4 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mt-2 max-h-72 overflow-hidden rounded-md border border-ui-border bg-ui-bg/65">
              <p className="type-micro-label border-b border-ui-border px-3 py-2 text-ui-text-muted">Progress steps</p>
              <div className="max-h-60 divide-y divide-ui-border overflow-y-auto overscroll-contain">
              {trace.steps.map((step) => (
                <div key={step.id} className="flex items-start gap-2 px-3 py-2.5">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    step.status === 'success'
                      ? 'bg-status-success'
                      : step.status === 'error'
                        ? 'bg-status-danger'
                        : 'bg-accent'
                  }`}></span>
                  <div className="min-w-0">
                    <p className="type-caption text-ui-text">{step.label}</p>
                    {step.detail && (
                      <p className="type-caption mt-0.5 whitespace-pre-wrap break-words">{step.detail}</p>
                    )}
                  </div>
                </div>
              ))}
              </div>
            </div>
            <div className="mt-3 max-h-56 overflow-hidden rounded-md border border-ui-border bg-ui-bg/65">
              <div className="type-caption flex items-center gap-2 border-b border-ui-border px-3 py-2">
                <Wrench className="h-3.5 w-3.5" />
                Tool Activity
              </div>
              {trace.toolCalls.length > 0 ? (
                <div className="max-h-44 divide-y divide-ui-border overflow-y-auto overscroll-contain">
                {trace.toolCalls.map((toolCall) => (
                  <div key={toolCall.callId} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="type-code truncate text-ui-text" title={toolCall.tool}>{toolCall.tool}</span>
                    <span className={`type-micro-label shrink-0 ${
                      toolCall.status === 'running'
                        ? 'text-accent-strong'
                        : toolCall.isError
                          ? 'text-status-danger-text'
                          : 'text-status-success-text'
                    }`}>
                      {toolCall.status === 'running' ? 'Running' : (toolCall.isError ? 'Error' : 'Completed')}
                    </span>
                  </div>
                ))}
                </div>
              ) : (
                <div className="type-caption flex items-center gap-2 px-3 py-2">
                  <CircleDashed className="h-3.5 w-3.5" />
                  No MCP or target tools were recorded for this message.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
