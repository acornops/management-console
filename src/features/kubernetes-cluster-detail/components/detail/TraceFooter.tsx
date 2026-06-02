import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronRight, CircleDashed, Wrench } from 'lucide-react';
import { truncateText } from '@/features/kubernetes-cluster-detail/lib/helpers';
import { formatRunUsageDetail, mapTraceStatusClass } from '@/features/kubernetes-cluster-detail/lib/trace-utils';
import { LiveRunTrace } from '@/features/kubernetes-cluster-detail/types';

interface TraceFooterProps {
  isDark: boolean;
  runId: string;
  trace: LiveRunTrace;
  isExpanded: boolean;
  hideTopDivider?: boolean;
  setExpanded: (runId: string, expanded: boolean) => void;
}

/**
 * Shows compact and expandable reasoning details attached to one assistant message.
 */
export const TraceFooter: React.FC<TraceFooterProps> = ({
  isDark: _isDark,
  runId,
  trace,
  isExpanded,
  hideTopDivider = false,
  setExpanded
}) => {
  const contentId = React.useId();
  const isInProgress = trace.status === 'connecting' || trace.status === 'running';
  const statusLabel = trace.status === 'connecting'
    ? 'Connecting'
    : trace.status === 'running'
      ? 'Running'
      : trace.status === 'completed'
        ? 'Completed'
        : trace.status === 'cancelled'
          ? 'Cancelled'
          : 'Failed';
  const latestStep = trace.steps[trace.steps.length - 1];
  const completedToolCalls = trace.toolCalls.filter((toolCall) => toolCall.status === 'completed').length;
  const usageDetail = formatRunUsageDetail(trace.usage);
  const toolSummary =
    trace.toolCalls.length > 0
      ? `${completedToolCalls}/${trace.toolCalls.length} tools completed`
      : 'No tool calls recorded';
  const statusDotClass = trace.status === 'completed'
    ? 'bg-status-success'
    : trace.status === 'failed' || trace.status === 'cancelled'
      ? 'bg-status-danger'
      : 'bg-accent';

  return (
    <div
      className={
        hideTopDivider
          ? 'mt-3'
          : 'mt-4 border-t border-ui-border/70 pt-3'
      }
    >
      <button
        type="button"
        onClick={() => setExpanded(runId, !isExpanded)}
        className="group flex w-full items-center justify-between gap-3 rounded-md border border-ui-border bg-ui-bg/80 px-3 py-2.5 text-left transition-colors hover:border-ui-text-muted/35 hover:bg-ui-surface"
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDotClass} ${isInProgress ? 'animate-pulse' : ''}`} />
          <span className="min-w-0">
            <span className="type-caption block text-ui-text">
              Run audit trail
            </span>
            <span className="type-caption mt-0.5 block leading-4">
              {trace.steps.length} updates · {toolSummary}
              {usageDetail ? ` · ${usageDetail}` : ''}
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className={`type-micro-label rounded-full px-2 py-0.5 ${mapTraceStatusClass(trace.status)}`}>
            {statusLabel}
          </span>
          <span className="text-ui-text-muted transition-colors group-hover:text-ui-text">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        </span>
      </button>
      <AnimatePresence initial={false} mode="wait">
        {!isExpanded && latestStep && (
          <motion.p
            key="summary"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className="type-caption mt-2 px-1"
          >
            Current step: {latestStep.label}
            {latestStep.detail ? `: ${truncateText(latestStep.detail)}` : ''}
          </motion.p>
        )}
        {isExpanded && (
          <motion.div
            key="details"
            id={contentId}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mt-3 overflow-hidden rounded-md border border-ui-border bg-ui-bg/65">
              <p className="type-micro-label border-b border-ui-border px-3 py-2 text-ui-text-muted">Run updates</p>
              <div className="divide-y divide-ui-border">
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
            <div className="mt-3 overflow-hidden rounded-md border border-ui-border bg-ui-bg/65">
              <div className="type-caption flex items-center gap-2 border-b border-ui-border px-3 py-2">
                <Wrench className="h-3.5 w-3.5" />
                Tool Activity
              </div>
              {trace.toolCalls.length > 0 ? (
                <div className="divide-y divide-ui-border">
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
      </AnimatePresence>
    </div>
  );
};
