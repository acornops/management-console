import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, DialogFrame, InlineAlert, InlineLoadingIndicator, StatusBadge } from '@acornops/ui';
import { X } from 'lucide-react';
import { decideWorkflowRunApproval, listWorkflowRunApprovals, selectWorkflowApprovalReview, type WorkflowRunApproval } from '@/services/control-plane/workflowApi';
import { ControlPlaneRequestError } from '@/services/control-plane/http';
import { formatUserDateTime } from '@/utils/dateTime';
import { AppPaths } from '@/utils/routes';
import { formatApprovalArguments } from '@/utils/approvalArguments';

interface ApprovalReviewDialogProps {
  workspaceId: string;
  runId: string;
  approvalId: string;
  canDecide: boolean;
  onClose: () => void;
  onDecisionApplied: () => void;
}

export function canDecideApprovalReview(approval: WorkflowRunApproval | undefined, canDecide: boolean, busy: boolean, now: number): boolean {
  return Boolean(approval && canDecide && !busy && approval.status === 'pending'
    && typeof approval.expiresAt === 'string'
    && Number.isFinite(Date.parse(approval.expiresAt)) && Date.parse(approval.expiresAt) > now);
}

export function ApprovalReviewContent({ approval, canDecide, busy, onDecide, now }: {
  approval: WorkflowRunApproval;
  canDecide: boolean;
  busy: boolean;
  onDecide: (decision: 'approved' | 'rejected') => void;
  now: number;
}) {
  const { t } = useTranslation();
  const unavailable = t('approvals.review.unavailable');
  const date = (value?: string) => formatUserDateTime(value, { fallback: unavailable });
  const enabled = canDecideApprovalReview(approval, canDecide, busy, now);
  const expired = approval.status === 'pending' && Date.parse(approval.expiresAt) <= now;
  const facts = [
    [t('approvals.review.kind'), t(`approvals.review.${approval.approvalKind === 'pre_step' ? 'gate' : 'tool'}`)],
    [t('approvals.review.toolName'), approval.toolRef?.toolName || approval.toolName],
    ...(approval.toolRef?.serverId ? [[t('approvals.review.mcpServer'), approval.toolRef.serverId]] : []),
    [t('approvals.review.workspace'), approval.workspaceId],
    [t('approvals.table.target'), [approval.targetType, approval.targetId].filter(Boolean).join(': ') || unavailable],
    [t('approvals.table.requestedBy'), approval.requestedBy || unavailable],
    [t('approvals.review.requestedAt'), date(approval.createdAt)],
    [t('approvals.table.expires'), date(approval.expiresAt)],
    [t('approvals.review.execution'), approval.executionStatus ? t(`approvals.review.executionStatus.${approval.executionStatus}`) : unavailable],
    ...(approval.status !== 'pending' ? [
      [t('approvals.review.decidedBy'), approval.decidedBy || unavailable],
      [t('approvals.review.decidedAt'), date(approval.decidedAt)]
    ] : [])
  ];
  return <>
    <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 break-words type-body text-ui-text">{approval.summary || unavailable}</p>
        <StatusBadge tone={approval.status === 'approved' ? 'success' : approval.status === 'pending' ? 'warning' : 'neutral'}>{t(`approvals.status.${expired ? 'expired' : approval.status}`)}</StatusBadge>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {facts.map(([label, value]) => <div key={label} className="min-w-0">
          <dt className="type-caption text-ui-text-muted">{label}</dt>
          <dd className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] type-ui text-ui-text">{value}</dd>
        </div>)}
      </dl>
      <h3 className="mt-5 type-row-title">{t('approvals.review.arguments')}</h3>
      <pre className="type-code mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-md border border-ui-border bg-code-bg p-3 text-code-text">{formatApprovalArguments(approval.arguments, t('approvals.review.redacted'))}</pre>
      <a className="control-target mt-3 inline-flex min-h-11 items-center break-all type-ui text-accent hover:underline" href={AppPaths.workspaceApprovals(approval.workspaceId, { runId: approval.runId })}>{t('approvals.review.run', { runId: approval.runId })}</a>
      {!canDecide && <InlineAlert tone="neutral" className="mt-3">{t('approvals.permissionNotice')}</InlineAlert>}
      {expired && <InlineAlert tone="warning" className="mt-3">{t('approvals.review.expired')}</InlineAlert>}
    </div>
    <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-ui-border px-5 py-4">
      <Button variant="secondary" size="md" disabled={!enabled} onClick={() => onDecide('rejected')}>{t('approvals.actions.reject')}</Button>
      <Button variant="primary" size="md" disabled={!enabled} onClick={() => onDecide('approved')}>{busy ? t('approvals.actions.deciding') : t('approvals.actions.approve')}</Button>
    </footer>
  </>;
}

function ApprovalReviewSession({ workspaceId, runId, approvalId, canDecide, onClose, onDecisionApplied }: ApprovalReviewDialogProps) {
  const { t } = useTranslation();
  const titleId = React.useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [approval, setApproval] = useState<WorkflowRunApproval>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const [now, setNow] = useState(Date.now);
  const submitting = useRef(false);
  const active = useRef(true);
  const permission = useRef(canDecide);
  permission.current = canDecide;
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setApproval(undefined);
    void listWorkflowRunApprovals(runId).then((records) => {
      const selected = selectWorkflowApprovalReview(records, workspaceId, runId, approvalId);
      if (current) { setApproval(selected); setNow(Date.now()); }
    }).catch(() => { if (current) setError(t('approvals.review.loadError')); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [approvalId, retry, runId, t, workspaceId]);

  useEffect(() => {
    if (!approval || approval.status !== 'pending') return;
    const remaining = Date.parse(approval.expiresAt) - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(remaining + 1, 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [approval, now]);

  const decide = async (decision: 'approved' | 'rejected') => {
    if (submitting.current || denied || !canDecideApprovalReview(approval, permission.current, loading, Date.now())) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await decideWorkflowRunApproval(runId, approvalId, decision);
      if (!active.current) return;
      const confirmed = selectWorkflowApprovalReview([result], workspaceId, runId, approvalId);
      if (confirmed.status !== decision) throw new Error('Unconfirmed decision');
      onDecisionApplied();
      onClose();
    } catch (cause) {
      if (!active.current) return;
      const status = cause instanceof ControlPlaneRequestError ? cause.status : undefined;
      if (status === 403) setDenied(true);
      setError(t(status === 409 ? 'approvals.review.conflict' : status === 403 ? 'approvals.permissionNotice' : 'approvals.review.decisionError'));
      // A failed/conflicting write is not success. Re-read authoritative state
      // before enabling a deliberate retry, including ambiguous network errors.
      setApproval(undefined);
      setRetry((value) => value + 1);
    } finally {
      submitting.current = false;
      if (active.current) setBusy(false);
    }
  };

  return <DialogFrame unframed titleId={titleId} initialFocusRef={closeRef} closeDisabled={busy} onClose={onClose}
    className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-ui-border bg-ui-surface text-ui-text shadow-xl">
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-ui-border px-5 py-4">
      <h2 id={titleId} className="type-panel-title">{t('approvals.review.title')}</h2>
      <Button ref={closeRef} variant="icon" size="md" aria-label={t('common.close')} disabled={busy} onClick={onClose}><X className="h-4 w-4" aria-hidden="true" /></Button>
    </header>
    {error && <InlineAlert tone="danger" className="mx-5 mt-4 shrink-0">{error}</InlineAlert>}
    {loading ? <div className="p-5" role="status"><InlineLoadingIndicator label={t('common.loading')} /></div>
      : approval ? <ApprovalReviewContent approval={approval} canDecide={canDecide && !denied} busy={busy} now={now} onDecide={(decision) => void decide(decision)} />
        : <div className="p-5"><Button variant="secondary" size="md" onClick={() => { setError(''); setRetry((value) => value + 1); }}>{t('common.retry')}</Button></div>}
  </DialogFrame>;
}

/** A selection change mounts a fresh session, immediately isolating stale detail and writes. */
export function ApprovalReviewDialog(props: ApprovalReviewDialogProps) {
  return <ApprovalReviewSession key={`${props.workspaceId}\u0000${props.runId}\u0000${props.approvalId}`} {...props} />;
}
