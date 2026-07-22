import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { CollectionState } from '@/components/common/CollectionState';
import { FilterToggleGroup, type CompactControlItem } from '@/components/common/ComponentVocabulary';
import { EmptyState } from '@/components/common/EmptyState';
import { InlineAlert } from '@/components/common/InlineAlert';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { PageHeader, PageShell } from '@/components/common/PageComposition';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ICONS } from '@/constants';
import { Workspace } from '@/types';
import {
  decideWorkflowRunApproval,
  listWorkspaceApprovalInbox,
  type WorkspaceApprovalInboxRow
} from '@/services/control-plane/workflowApi';
import { formatUserDateTime } from '@/utils/dateTime';
import { hasWorkspacePermission } from '@/app/workspacePermissions';
import type { CursorCollectionPhase } from '@/hooks/resourceLifecycle';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';

interface WorkspaceApprovalsPageProps {
  workspace: Workspace;
  onApprovalDecision?: () => Promise<void> | void;
  runId?: string;
  approvalId?: string;
}

type ApprovalFilter = 'pending' | 'decided';

function formatDateTime(value: string | undefined, fallback: string): string {
  return formatUserDateTime(value, { fallback: value || fallback });
}

function isToday(value?: string): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function approvalTone(status: WorkspaceApprovalInboxRow['status']): React.ComponentProps<typeof StatusBadge>['tone'] {
  if (status === 'pending') return 'warning';
  if (status === 'approved') return 'success';
  return 'neutral';
}

function sourceLabel(source: WorkspaceApprovalInboxRow['source'], t: TFunction): string {
  return t(`approvals.sources.${source}`);
}

export const WorkspaceApprovalsPage: React.FC<WorkspaceApprovalsPageProps> = ({
  workspace,
  onApprovalDecision,
  runId,
  approvalId
}) => {
  const { t } = useTranslation();
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>('pending');
  const [approvalsByFilter, setApprovalsByFilter] = useState<Record<ApprovalFilter, WorkspaceApprovalInboxRow[]>>({
    pending: [],
    decided: []
  });
  const [pendingApprovalCount, setPendingApprovalCount] = useState<number | undefined>(undefined);
  const [approvalPhase, setApprovalPhase] = useState<CursorCollectionPhase>('loading');
  const [approvalError, setApprovalError] = useState('');
  const [decisionState, setDecisionState] = useState<Record<string, 'approved' | 'rejected' | 'loading'>>({});
  const approvalRequestSequence = useRef(0);
  const scopeKey = `${workspace.id}\u0000${runId || ''}\u0000${approvalId || ''}`;
  const [stateScopeKey, setStateScopeKey] = useState(scopeKey);
  const currentScopeKey = useRef(scopeKey);
  currentScopeKey.current = scopeKey;
  const approvalFilterItems = useMemo<Array<CompactControlItem<ApprovalFilter>>>(() => [
    { value: 'pending', label: t('approvals.filters.pending') },
    { value: 'decided', label: t('approvals.filters.recent') }
  ], [t]);

  const canDecideApprovals = hasWorkspacePermission(workspace, 'create_read_write_runs');
  const focusedApproval = Boolean(runId || approvalId);

  const loadApprovals = useCallback(async (initial = false) => {
    const requestSequence = ++approvalRequestSequence.current;
    const requestedScopeKey = scopeKey;
    const isCurrentRequest = () => currentScopeKey.current === requestedScopeKey
      && approvalRequestSequence.current === requestSequence;
    setApprovalPhase(initial ? 'loading' : 'refreshing');
    setApprovalError('');
    try {
      if (focusedApproval) {
        const response = await listWorkspaceApprovalInbox(workspace.id, {
          status: 'all',
          limit: 50,
          runId,
          approvalId
        });
        if (!isCurrentRequest()) return;
        setApprovalsByFilter({
          pending: response.items.filter((approval) => approval.status === 'pending'),
          decided: response.items.filter((approval) => approval.status !== 'pending')
        });
        setPendingApprovalCount(undefined);
        setApprovalPhase('ready');
        return;
      }
      const [pendingResponse, decidedResponse] = await Promise.all([
        listWorkspaceApprovalInbox(workspace.id, { status: 'pending', limit: 50 }),
        listWorkspaceApprovalInbox(workspace.id, { status: 'decided', limit: 50 })
      ]);
      if (!isCurrentRequest()) return;
      setApprovalsByFilter({
        pending: pendingResponse.items,
        decided: decidedResponse.items
      });
      setPendingApprovalCount(pendingResponse.pendingCount);
      setApprovalPhase('ready');
    } catch (err) {
      if (!isCurrentRequest()) return;
      setApprovalError(formatControlPlaneError(err, t('approvals.loadError')));
      setApprovalPhase('error');
    }
  }, [approvalId, focusedApproval, runId, scopeKey, t, workspace.id]);

  useEffect(() => {
    approvalRequestSequence.current += 1;
    setStateScopeKey(scopeKey);
    setApprovalsByFilter({ pending: [], decided: [] });
    setPendingApprovalCount(undefined);
    setApprovalError('');
    setDecisionState({});
    void loadApprovals(true);
  }, [loadApprovals]);

  const scopeStateCurrent = stateScopeKey === scopeKey;
  const visibleApprovalsByFilter = scopeStateCurrent
    ? approvalsByFilter
    : { pending: [], decided: [] };
  const visiblePendingApprovalCount = scopeStateCurrent ? pendingApprovalCount : undefined;
  const visibleApprovalPhase = scopeStateCurrent ? approvalPhase : 'loading';
  const visibleApprovalError = scopeStateCurrent ? approvalError : '';
  const approvals = focusedApproval
    ? [...visibleApprovalsByFilter.pending, ...visibleApprovalsByFilter.decided]
    : visibleApprovalsByFilter[approvalFilter];
  const hasAnyApprovals = (visiblePendingApprovalCount ?? visibleApprovalsByFilter.pending.length) > 0
    || visibleApprovalsByFilter.decided.length > 0;
  const approvalsBusy = visibleApprovalPhase === 'loading' || visibleApprovalPhase === 'refreshing';

  const summary = useMemo(() => {
    const pending = visibleApprovalsByFilter.pending;
    const decided = visibleApprovalsByFilter.decided;
    const expiringSoon = pending.filter((approval) => {
      const expiresAt = new Date(approval.expiresAt).getTime();
      return Number.isFinite(expiresAt) && expiresAt - Date.now() <= 30 * 60 * 1000;
    });
    return {
      waiting: visiblePendingApprovalCount ?? pending.length,
      expiringSoon: expiringSoon.length,
      approved: decided.filter((approval) => approval.status === 'approved' && isToday(approval.decidedAt)).length,
      rejected: decided.filter((approval) => approval.status === 'rejected' && isToday(approval.decidedAt)).length
    };
  }, [visibleApprovalsByFilter, visiblePendingApprovalCount]);

  const decideApproval = async (approval: WorkspaceApprovalInboxRow, decision: 'approved' | 'rejected') => {
    if (!canDecideApprovals || approval.status !== 'pending') return;
    const decisionScopeKey = scopeKey;
    setDecisionState((current) => ({ ...current, [approval.approvalId]: 'loading' }));
    setApprovalError('');
    try {
      await decideWorkflowRunApproval(approval.runId, approval.approvalId, decision);
      if (currentScopeKey.current !== decisionScopeKey) return;
      setDecisionState((current) => ({ ...current, [approval.approvalId]: decision }));
      await onApprovalDecision?.();
      if (currentScopeKey.current !== decisionScopeKey) return;
      await loadApprovals();
    } catch (err) {
      if (currentScopeKey.current !== decisionScopeKey) return;
      setApprovalError(formatControlPlaneError(err, t('approvals.decisionError')));
      setDecisionState((current) => {
        const next = { ...current };
        delete next[approval.approvalId];
        return next;
      });
    }
  };

  return (
    <PageShell>
      <PageHeader title={t('approvals.title')} description={t('approvals.subtitle', { workspace: workspace.name })} actions={
        <Button size="md" variant="secondary" onClick={() => void loadApprovals()} disabled={approvalsBusy}>
          <ICONS.RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t('common.refresh', { defaultValue: 'Refresh' })}
        </Button>
      } />

      {!canDecideApprovals && (
        <div className="mb-5 rounded-md border border-ui-border bg-ui-surface px-4 py-3 text-sm font-medium text-ui-text-muted">
          {t('approvals.permissionNotice')}
        </div>
      )}
      {visibleApprovalError && visibleApprovalPhase !== 'error' && <InlineAlert tone="danger" className="mb-5">{visibleApprovalError}</InlineAlert>}
      {focusedApproval && <InlineAlert tone="neutral" className="mb-5">{t('approvals.focusedNotice')}</InlineAlert>}

      <CollectionState
        phase={visibleApprovalPhase}
        itemCount={hasAnyApprovals ? visibleApprovalsByFilter.pending.length + visibleApprovalsByFilter.decided.length : 0}
        loading={<InlineLoadingIndicator label={t('common.loading')} className="w-full justify-center py-10" />}
        empty={<EmptyState
          icon={<ICONS.CheckCircle2 />}
          title={t(focusedApproval ? 'approvals.focusedEmptyTitle' : 'approvals.emptyTitle')}
          description={t(focusedApproval ? 'approvals.focusedEmptyBody' : 'approvals.emptyBody')}
        />}
        error={<EmptyState
          role="alert"
          icon={<ICONS.AlertTriangle />}
          title={t('approvals.loadError')}
          description={visibleApprovalError}
          actions={<Button variant="secondary" onClick={() => void loadApprovals()}>{t('common.retry', { defaultValue: 'Retry' })}</Button>}
        />}
        feedback={visibleApprovalError ? <InlineAlert tone="danger" className="mb-5">{visibleApprovalError}</InlineAlert> : <InlineLoadingIndicator label={t('common.loading')} className="mb-5" />}
        announcement={visibleApprovalPhase === 'ready' ? `${summary.waiting} ${t('approvals.filters.pending')}` : undefined}
      >
        <section aria-label={t('approvals.summaryLabel')} className="mb-5 overflow-hidden rounded-lg border border-ui-border bg-ui-surface">
        <div className="grid divide-y divide-ui-border sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          {[
            { labelKey: 'approvals.summary.waiting', value: String(summary.waiting) },
            { labelKey: 'approvals.summary.expiringSoon', value: String(summary.expiringSoon) },
            { labelKey: 'approvals.summary.approvedToday', value: String(summary.approved) },
            { labelKey: 'approvals.summary.rejectedToday', value: String(summary.rejected) }
          ].map((metric) => (
            <div key={metric.labelKey} className="px-4 py-3">
              <div className="type-micro-label text-ui-text-muted">{t(metric.labelKey)}</div>
              <div className="mt-1 text-sm font-bold text-ui-text">{metric.value}</div>
            </div>
          ))}
        </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
        <div className="flex flex-col gap-3 border-b border-ui-border bg-ui-bg px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-surface text-accent-strong">
              <ICONS.CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="type-section-title">{t('approvals.queueTitle')}</h2>
              <p className="type-caption mt-1 text-ui-text-muted">{t('approvals.queueBody')}</p>
            </div>
          </div>
          {!focusedApproval && (
            <FilterToggleGroup<ApprovalFilter>
              activeValue={approvalFilter}
              ariaLabel={t('approvals.filters.label')}
              items={approvalFilterItems}
              onValueChange={setApprovalFilter}
            />
          )}
        </div>

        {approvals.length === 0 ? (
          <EmptyState
            embedded
            headingLevel={3}
            icon={<ICONS.CheckCircle2 />}
            title={t(focusedApproval
              ? 'approvals.focusedEmptyTitle'
              : approvalFilter === 'pending' ? 'approvals.emptyTitle' : 'approvals.emptyRecentTitle')}
            description={t(focusedApproval
              ? 'approvals.focusedEmptyBody'
              : approvalFilter === 'pending' ? 'approvals.emptyBody' : 'approvals.emptyRecentBody')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[72rem] w-full border-collapse text-left">
              <thead className="border-b border-ui-border bg-ui-surface">
                <tr className="type-micro-label text-ui-text-muted">
                  <th scope="col" className="px-4 py-3">{t('approvals.table.approval')}</th>
                  <th scope="col" className="px-4 py-3">{t('approvals.table.workflowRun')}</th>
                  <th scope="col" className="px-4 py-3">{t('approvals.table.requestedBy')}</th>
                  <th scope="col" className="px-4 py-3">{t('approvals.table.target')}</th>
                  <th scope="col" className="px-4 py-3">{t('approvals.table.risk')}</th>
                  <th scope="col" className="px-4 py-3">{t('approvals.table.expires')}</th>
                  <th scope="col" className="px-4 py-3">{t('approvals.table.status')}</th>
                  <th scope="col" className="px-4 py-3">{t('approvals.table.decision')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border">
                {approvals.map((approval) => {
                  const decision = decisionState[approval.approvalId];
                  const pending = approval.status === 'pending';
                  const isFocusedApproval = Boolean(
                    (approvalId && approval.approvalId === approvalId) ||
                    (!approvalId && runId && approval.runId === runId)
                  );
                  return (
                    <tr key={approval.approvalId} className={`text-sm ${isFocusedApproval ? 'bg-accent-soft ring-1 ring-inset ring-accent/30' : 'bg-ui-surface'}`}>
                      <th scope="row" className="px-4 py-4 font-semibold text-ui-text">{approval.summary}</th>
                      <td className="px-4 py-4 font-medium text-ui-text">{approval.workflowId || sourceLabel(approval.source, t)} · {approval.runId}</td>
                      <td className="px-4 py-4 text-ui-text-muted">{approval.requestedBy || t('approvals.system')}</td>
                      <td className="px-4 py-4 text-ui-text-muted">{approval.targetId || t('approvals.targetWorkspace')}</td>
                      <td className="px-4 py-4 font-semibold text-ui-text">{sourceLabel(approval.source, t)}</td>
                      <td className="px-4 py-4 text-ui-text-muted">{formatDateTime(approval.expiresAt, t('approvals.none'))}</td>
                      <td className="px-4 py-4"><StatusBadge tone={approvalTone(approval.status)}>{t(`approvals.status.${approval.status}`)}</StatusBadge></td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => void decideApproval(approval, 'approved')} disabled={!canDecideApprovals || !pending || decision === 'loading'}>
                            {decision === 'loading' ? t('approvals.actions.deciding') : t('approvals.actions.approve')}
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => void decideApproval(approval, 'rejected')} disabled={!canDecideApprovals || !pending || decision === 'loading'}>
                            {t('approvals.actions.reject')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        </section>
      </CollectionState>
    </PageShell>
  );
};
