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

function cleanText(value: unknown): string {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f-\u009f]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function targetLabel(t: TFunction, argumentsValue: Record<string, unknown> | undefined, defaultKind?: string): string {
  const kind = cleanText(argumentsValue?.kind) || cleanText(defaultKind);
  const namespace = cleanText(argumentsValue?.namespace);
  const name = cleanText(argumentsValue?.name);
  const target = cleanText(argumentsValue?.target || argumentsValue?.resource || argumentsValue?.service);

  if (namespace && name) return `${kind ? `${kind} ` : ''}${namespace}/${name}`;
  if (name) return `${kind ? `${kind} ` : ''}${name}`;
  if (target) return `${kind ? `${kind} ` : ''}${target}`;
  if (namespace) {
    return kind
      ? t('chat.approvalFallbackTarget.kindNamespace', { kind, namespace })
      : t('chat.approvalFallbackTarget.namespace', { namespace });
  }
  return kind ? t('chat.approvalFallbackTarget.selectedKind', { kind }) : '';
}

function fallbackApprovalSummary(approval: PendingApproval, t: TFunction): string {
  const toolName = cleanText(approval.toolName || approval.action).replace(/[_.]+/g, ' ');
  if (approval.toolName === 'restart_workload') {
    return t('chat.approvalFallbackSummary.restart', {
      target: targetLabel(t, approval.arguments, t('chat.approvalFallbackTarget.workload'))
    });
  }
  if (approval.toolName === 'scale_workload') {
    const replicas = cleanText(approval.arguments?.replicas);
    const target = targetLabel(t, approval.arguments, t('chat.approvalFallbackTarget.workload'));
    const guards = [
      replicas === '0' && approval.arguments?.confirm_scale_to_zero === true
        ? t('chat.approvalFallbackSummary.scaleToZeroConfirmed')
        : '',
      approval.arguments?.confirm_hpa_override === true
        ? t('chat.approvalFallbackSummary.hpaOverrideConfirmed')
        : ''
    ].filter(Boolean).join('; ');
    return replicas
      ? guards
        ? t('chat.approvalFallbackSummary.scaleReplicasGuarded', { target, replicas, guards })
        : t('chat.approvalFallbackSummary.scaleReplicas', { target, replicas })
      : t('chat.approvalFallbackSummary.scale', { target });
  }
  const target = targetLabel(t, approval.arguments);
  if (target) {
    return t('chat.approvalFallbackSummary.genericTarget', {
      tool: toolName || t('chat.approvalFallbackTarget.writeTool'),
      target
    });
  }
  return cleanText(approval.action) || t('chat.approvalFallbackSummary.generic');
}

export const ApprovalCheckpoint: React.FC<ApprovalCheckpointProps> = ({
  approval,
  canApproveWriteActions,
  onApprove,
  onReject,
  t
}) => {
  const approvalSummary = cleanText(approval.summary) || fallbackApprovalSummary(approval, t);
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
      className="mt-5 overflow-hidden rounded-md border border-ui-border bg-ui-bg text-ui-text shadow-sm"
      aria-label={t('chat.approvalCheckpoint')}
    >
      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${statusToneClass}`}>
              <StatusIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold leading-6 text-ui-text">{t('chat.guardTitle')}</h3>
              <p className="mt-1 break-words text-base font-semibold leading-6 text-ui-text">
                {approvalSummary}
              </p>
            </div>
          </div>
          <p className={`type-micro-label shrink-0 rounded-full border px-2.5 py-1 ${statusToneClass}`} aria-live="polite">
            {t(`chat.approvalStatusLabel.${approvalStatus}`)}
          </p>
        </div>
        {!isPending && (
          <p className="mt-2 text-xs leading-5 text-ui-text-muted">{t(`chat.approvalStatus.${approvalStatus}`)}</p>
        )}
        {isPending && !canApproveWriteActions && (
          <p className="mt-2 text-xs leading-5 text-status-warning-text">{t('chat.approvalNoPermission')}</p>
        )}
        {approval.arguments && Object.keys(approval.arguments).length > 0 && (
          <details className="mt-3 rounded-md border border-ui-border bg-ui-surface/40 px-3 py-2">
            <summary className="cursor-pointer select-none text-xs font-semibold leading-5 text-ui-text-muted">
              {t('chat.approvalAdvancedDetails')}
            </summary>
            <pre className="type-code mt-1 max-h-36 overflow-auto rounded-md border border-ui-border bg-code-bg px-3 py-2 text-slate-100">
              {JSON.stringify(approval.arguments, null, 2)}
            </pre>
          </details>
        )}
        {isPending && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              onClick={() => void onReject(approval.id)}
              variant="secondary"
              size="sm"
              className="w-full sm:w-auto"
              disabled={!canApproveWriteActions}
            >
              <XCircle className="h-4 w-4" />
              {t('chat.rejectAction')}
            </Button>
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
          </div>
        )}
      </div>
    </section>
  );
};
