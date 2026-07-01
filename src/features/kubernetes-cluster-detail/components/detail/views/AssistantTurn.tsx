import React from 'react';
import type { TFunction } from 'i18next';
import { motion, type Transition, useReducedMotion } from 'framer-motion';
import ReactMarkdown, { type Components } from 'react-markdown';
import { TraceFooter } from '@/features/kubernetes-cluster-detail/components/detail/TraceFooter';
import { ApprovalCheckpoint } from '@/features/kubernetes-cluster-detail/components/detail/views/ApprovalCheckpoint';
import { MessageActions } from '@/features/kubernetes-cluster-detail/components/detail/views/MessageActions';
import { ThinkingAcorn } from '@/features/kubernetes-cluster-detail/components/detail/views/ThinkingAcorn';
import { markdownRemarkPlugins } from '@/features/kubernetes-cluster-detail/lib/markdown';
import type { LiveRunTrace } from '@/features/kubernetes-cluster-detail/types';
import type { PendingApproval } from '@/types';

interface AssistantTurnProps {
  timestampLabel: string;
  content: string;
  isInFlightPlaceholder: boolean;
  markdownComponents: Components;
  approval?: PendingApproval;
  canApproveWriteActions: boolean;
  onApprove: (approvalId: string) => void | Promise<void>;
  onReject: (approvalId: string) => void | Promise<void>;
  trace?: LiveRunTrace;
  traceRunId: string;
  isTraceExpanded: boolean;
  setTraceExpanded: (runId: string, expanded: boolean) => void;
  compactStatusOnly?: boolean;
  t: TFunction;
}

export const AssistantTurn: React.FC<AssistantTurnProps> = ({
  timestampLabel,
  content,
  isInFlightPlaceholder,
  markdownComponents,
  approval,
  canApproveWriteActions,
  onApprove,
  onReject,
  trace,
  traceRunId,
  isTraceExpanded,
  setTraceExpanded,
  compactStatusOnly = false,
  t
}) => {
  const shouldReduceMotion = useReducedMotion();
  const assistantColumnClass = 'w-full max-w-[72ch]';
  const previousWorkingTextRef = React.useRef('');
  const isTraceInProgress = trace?.status === 'connecting' || trace?.status === 'running';
  const isAssistantWorking = isInFlightPlaceholder || isTraceInProgress;
  const activeReasoningSummary = isTraceInProgress
    ? trace?.activeReasoningSummary
      ?.replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\s+/g, ' ')
      .trim()
    : '';
  const inlineWorkingText = activeReasoningSummary || (isAssistantWorking ? t('chat.thinking') : '');
  const previousWorkingText = previousWorkingTextRef.current;
  const stableWorkingText = previousWorkingText && inlineWorkingText.startsWith(previousWorkingText)
    ? previousWorkingText
    : '';
  const incomingWorkingText = stableWorkingText
    ? inlineWorkingText.slice(stableWorkingText.length)
    : inlineWorkingText;
  const shouldAnimateIncomingText = Boolean(inlineWorkingText && incomingWorkingText);
  const incomingTextInitial = shouldReduceMotion
    ? { opacity: 0.78 }
    : { opacity: 0.38 };
  const incomingTextAnimate = { opacity: 1 };
  const incomingTextTransition: Transition = shouldReduceMotion
    ? { duration: 0.14, ease: [0.16, 1, 0.3, 1] }
    : { duration: 0.24, ease: [0.16, 1, 0.3, 1] };
  const shouldShowWorkingShimmer = Boolean(inlineWorkingText && isAssistantWorking && shouldReduceMotion !== true);
  const workingShimmerDurationSeconds = activeReasoningSummary ? 5 : 3.8;

  React.useEffect(() => {
    previousWorkingTextRef.current = inlineWorkingText;
  }, [inlineWorkingText]);

  const workingLine = inlineWorkingText ? (
    <div className={isInFlightPlaceholder ? `flex min-h-10 items-center gap-2 ${assistantColumnClass}` : `mt-4 flex min-h-10 items-center gap-2 border-t border-ui-border/80 pt-2 ${assistantColumnClass}`}>
      <ThinkingAcorn reducedMotion={shouldReduceMotion === true} />
      <p
        className={`type-caption relative block min-w-0 flex-1 truncate text-ui-text-muted ${
          shouldShowWorkingShimmer ? 'reasoning-summary-active' : ''
        }`}
        title={inlineWorkingText}
        aria-live="polite"
        style={{
          '--reasoning-summary-shimmer-duration': `${workingShimmerDurationSeconds}s`
        } as React.CSSProperties}
      >
        {shouldAnimateIncomingText ? (
          <>
            {stableWorkingText && (
              <span>{stableWorkingText}</span>
            )}
            <motion.span
              key={inlineWorkingText}
              initial={incomingTextInitial}
              animate={incomingTextAnimate}
              transition={incomingTextTransition}
            >
              {incomingWorkingText}
            </motion.span>
          </>
        ) : (
          <span>{inlineWorkingText}</span>
        )}
      </p>
    </div>
  ) : null;
  const copyText = content.trim() || inlineWorkingText;
  const messageActions = (
    <div className={assistantColumnClass}>
      <MessageActions
        align="left"
        copyText={copyText}
        timestampLabel={timestampLabel}
        t={t}
      />
    </div>
  );
  const hasTraceDetails = Boolean(
    trace && (
      trace.steps.length > 0 ||
      trace.toolCalls.length > 0 ||
      (trace.skillLoads?.length || 0) > 0 ||
      (trace.reasoningSummaries?.length || 0) > 0 ||
      (trace.timelineEvents?.length || 0) > 0
    )
  );
  const shouldRenderCompactStatusOnly = compactStatusOnly && hasTraceDetails;

  return (
    <article
      data-chat-assistant-turn="true"
      className="group w-full min-w-0 text-sm font-medium text-ui-text"
      aria-label={t('chat.roleAssistant')}
    >
      <span className="sr-only">{t('chat.roleAssistant')}</span>

      {isInFlightPlaceholder ? workingLine : shouldRenderCompactStatusOnly ? null : (
        <div className={assistantColumnClass}>
          <ReactMarkdown components={markdownComponents} remarkPlugins={markdownRemarkPlugins}>
            {content}
          </ReactMarkdown>
        </div>
      )}

      {!isInFlightPlaceholder && workingLine}

      {!hasTraceDetails && !shouldRenderCompactStatusOnly && messageActions}

      {approval && (
        <ApprovalCheckpoint
          approval={approval}
          canApproveWriteActions={canApproveWriteActions}
          onApprove={onApprove}
          onReject={onReject}
          t={t}
        />
      )}

      {hasTraceDetails && trace && (
        <TraceFooter
          runId={traceRunId}
          trace={trace}
          isExpanded={isTraceExpanded}
          setExpanded={setTraceExpanded}
          suppressCompactReasoningSummary={Boolean(inlineWorkingText)}
          compactStatusOnly={shouldRenderCompactStatusOnly}
        />
      )}

      {hasTraceDetails && !shouldRenderCompactStatusOnly && messageActions}
    </article>
  );
};
