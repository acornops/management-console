import { useState } from 'react';
import { Button, StatusBadge } from '@acornops/ui';
import { Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ControlPlaneRunToolApproval } from '@/services/control-plane/types';

/** Only use an enriched user name when it belongs to the recorded actor. */
export function approvalUserName(id?: string, user?: { id: string; displayName: string }): string | undefined {
  return id && user?.id === id ? user.displayName?.trim() || undefined : undefined;
}

export function ApprovalIdentity({ id, name, label, showId = false, fallback }: {
  id?: string;
  name?: string;
  label: string;
  showId?: boolean;
  fallback?: string;
}) {
  const { t } = useTranslation();
  const [copyStatus, setCopyStatus] = useState('');
  const displayName = name?.trim();
  const copy = async () => {
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      setCopyStatus(t('approvals.identity.copied'));
    } catch {
      setCopyStatus(t('approvals.identity.copyFailed'));
    }
  };
  return <div className="min-w-0">
    <span className="break-words [overflow-wrap:anywhere]">{displayName || fallback || t('approvals.identity.nameUnavailable')}</span>
    {id && (showId || !displayName) && <div className="mt-1 flex min-w-0 items-start gap-2">
      <span className="min-w-0 break-all font-mono type-caption text-ui-text-muted">{id}</span>
      {showId && <Button type="button" variant="icon" size="sm" className="shrink-0"
        aria-label={t('approvals.identity.copyId', { label })} onClick={() => void copy()}>
        <Copy className="h-4 w-4" aria-hidden="true" />
      </Button>}
    </div>}
    {showId && <span role="status" className="type-caption text-ui-text-muted">{copyStatus}</span>}
  </div>;
}

/** Authorization and execution are independent outcomes, even when both are terminal. */
export function ApprovalOutcome({ status, executionStatus }: Pick<ControlPlaneRunToolApproval, 'status' | 'executionStatus'>) {
  const { t } = useTranslation();
  const execution = executionStatus || 'unknown';
  const executionTone = execution === 'failed' ? 'danger' : execution === 'succeeded' ? 'success'
    : execution === 'executing' ? 'warning' : 'neutral';
  return <dl className="grid min-w-0 gap-2 type-caption">
    <div>
      <dt className="text-ui-text-muted">{t('approvals.table.decision')}</dt>
      <dd className="mt-1"><StatusBadge tone={status === 'pending' ? 'warning' : 'neutral'}>{t(`approvals.status.${status}`)}</StatusBadge></dd>
    </div>
    <div>
      <dt className="text-ui-text-muted">{t('approvals.review.execution')}</dt>
      <dd className="mt-1"><StatusBadge tone={executionTone}>{t(`approvals.review.executionStatus.${execution}`, { defaultValue: t('approvals.review.executionStatus.unknown') })}</StatusBadge></dd>
    </div>
  </dl>;
}
