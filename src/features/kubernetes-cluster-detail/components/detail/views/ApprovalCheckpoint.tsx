import React from 'react';
import type { TFunction } from 'i18next';
import { CheckCircle2, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { PendingApproval } from '@/types';

interface ApprovalCheckpointProps {
  approval: PendingApproval;
  canApproveWriteActions: boolean;
  onApprove: (approvalId: string) => void | Promise<void>;
  onReject: (approvalId: string) => void | Promise<void>;
  t: TFunction;
}

export const ApprovalCheckpoint: React.FC<ApprovalCheckpointProps> = ({
  approval,
  canApproveWriteActions,
  onApprove,
  onReject,
  t
}) => {
  const approvalTarget = [
    approval.toolName,
    typeof approval.arguments?.namespace === 'string' ? approval.arguments.namespace : '',
    typeof approval.arguments?.name === 'string' ? approval.arguments.name : ''
  ].filter(Boolean).join(' · ');
  const approvalStatus = approval.status || 'pending';
  const isPending = approvalStatus === 'pending';
  const StatusIcon = approvalStatus === 'approved' ? CheckCircle2 : approvalStatus === 'pending' ? ShieldCheck : XCircle;
  const statusToneClass =
    approvalStatus === 'approved'
      ? 'border-status-success/30 bg-status-success-soft text-status-success-text'
      : approvalStatus === 'pending'
        ? 'border-status-warning/30 bg-status-warning-soft text-status-warning-text'
        : 'border-status-danger/30 bg-status-danger-soft text-status-danger-text';

  return (
    <section
      data-chat-approval-checkpoint="true"
      className="mt-5 overflow-hidden rounded-md border border-ui-border bg-ui-bg/85 text-ui-text shadow-sm"
      aria-label={t('chat.approvalCheckpoint')}
    >
      <div className="flex items-start justify-between gap-4 border-b border-ui-border bg-ui-surface px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${statusToneClass}`}>
            <StatusIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="type-micro-label text-ui-text-muted">{t('chat.approvalCheckpoint')}</p>
            <h3 className="mt-1 text-base font-semibold leading-6 text-ui-text">{t('chat.guardTitle')}</h3>
            <p className="mt-1 text-xs leading-5 text-ui-text-muted">{t('chat.guardBody', { action: approval.action })}</p>
          </div>
        </div>
        <p className={`type-micro-label shrink-0 rounded-full border px-2.5 py-1 ${statusToneClass}`} aria-live="polite">
          {t(`chat.approvalStatusLabel.${approvalStatus}`)}
        </p>
      </div>

      <div className="px-4 py-4">
        <p className="text-xs leading-5 text-ui-text-muted">
          {isPending ? t('chat.approvalHelp') : t(`chat.approvalStatus.${approvalStatus}`)}
        </p>
        <div className="mt-3 divide-y divide-ui-border rounded-md border border-ui-border bg-ui-surface/70">
          <div className="grid gap-1 px-3 py-2.5 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
            <p className="type-micro-label text-ui-text-muted">{t('chat.approvalActionLabel')}</p>
            <p className="break-words text-sm font-semibold leading-6 text-ui-text">{approval.action}</p>
          </div>
          <div className="grid gap-1 px-3 py-2.5 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
            <p className="type-micro-label text-ui-text-muted">{t('chat.approvalConsequenceLabel')}</p>
            <div className="min-w-0">
              <p className="text-sm leading-6 text-ui-text">{t('chat.approvalConsequence')}</p>
              {!canApproveWriteActions && (
                <p className="mt-1 text-xs leading-5 text-status-warning-text">{t('chat.approvalNoPermission')}</p>
              )}
            </div>
          </div>
          {approvalTarget && (
            <div className="grid gap-1 px-3 py-2.5 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
              <p className="type-micro-label text-ui-text-muted">{t('chat.approvalTargetLabel')}</p>
              <p className="min-w-0 break-words text-xs font-semibold leading-5 text-ui-text-muted">{approvalTarget}</p>
            </div>
          )}
        </div>
        {approval.arguments && Object.keys(approval.arguments).length > 0 && (
          <div className="mt-3">
            <p className="type-micro-label text-ui-text-muted">{t('chat.approvalArgumentsLabel')}</p>
            <pre className="type-code mt-1 max-h-36 overflow-auto rounded-md border border-ui-border bg-code-bg px-3 py-2 text-slate-100">
              {JSON.stringify(approval.arguments, null, 2)}
            </pre>
          </div>
        )}
        {isPending && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              onClick={() => void onApprove(approval.id)}
              variant="primary"
              size="sm"
              className="w-full sm:w-auto"
              disabled={!canApproveWriteActions}
            >
              <CheckCircle2 className="h-4 w-4" />
              {t('chat.approveAction')}
            </Button>
            <Button onClick={() => void onReject(approval.id)} variant="secondary" size="sm" className="w-full sm:w-auto">
              <XCircle className="h-4 w-4" />
              {t('chat.rejectAction')}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};
