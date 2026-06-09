import React from 'react';
import type { TFunction } from 'i18next';
import { Loader2 } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { TraceFooter } from '@/features/kubernetes-cluster-detail/components/detail/TraceFooter';
import { ApprovalCheckpoint } from '@/features/kubernetes-cluster-detail/components/detail/views/ApprovalCheckpoint';
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
  t
}) => (
  <article
    data-chat-assistant-turn="true"
    className="w-full min-w-0 text-sm font-medium text-ui-text"
  >
    <div className="mb-2 flex max-w-[72ch] items-center justify-between gap-3 text-[11px] font-semibold text-ui-text-muted">
      <span>{t('chat.roleAssistant')}</span>
      <time>{timestampLabel}</time>
    </div>

    {isInFlightPlaceholder ? (
      <div
        data-chat-assistant-loading-row="true"
        className="flex min-h-8 max-w-[72ch] items-center gap-2 text-ui-text-muted"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{t('chat.preparingResponse')}</span>
      </div>
    ) : (
      <div className="max-w-[72ch]">
        <ReactMarkdown components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </div>
    )}

    {approval && (
      <ApprovalCheckpoint
        approval={approval}
        canApproveWriteActions={canApproveWriteActions}
        onApprove={onApprove}
        onReject={onReject}
        t={t}
      />
    )}

    {trace && trace.steps.length > 0 && (
      <TraceFooter
        runId={traceRunId}
        trace={trace}
        isExpanded={isTraceExpanded}
        setExpanded={setTraceExpanded}
      />
    )}
  </article>
);
