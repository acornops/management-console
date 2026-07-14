import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { FilterToggleGroup, type CompactControlItem } from '@/components/common/ComponentVocabulary';
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

interface WorkspaceApprovalsPageProps {
  workspace: Workspace;
  onApprovalDecision?: () => Promise<void> | void;
}

type ApprovalFilter = 'pending' | 'decided';

function formatDateTime(value?: string): string {
  return formatUserDateTime(value, { fallback: value || 'None' });
}

function approvalTone(status: WorkspaceApprovalInboxRow['status']): React.ComponentProps<typeof StatusBadge>['tone'] {
  if (status === 'pending') return 'warning';
  if (status === 'approved') return 'success';
  return 'neutral';
}

function sourceLabel(source: WorkspaceApprovalInboxRow['source']): string {
  const labels: Record<WorkspaceApprovalInboxRow['source'], string> = {
    target_tool: 'Target tool',
    workflow_gate: 'Workflow gate',
    agent_gate: 'Agent gate',
    agent_tool: 'Agent tool',
    workflow_tool: 'Workflow tool'
  };
  return labels[source];
}

export const WorkspaceApprovalsPage: React.FC<WorkspaceApprovalsPageProps> = ({ workspace, onApprovalDecision }) => {
  const { t } = useTranslation();
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>('pending');
  const [approvals, setApprovals] = useState<WorkspaceApprovalInboxRow[]>([]);
  const [isLoadingApprovals, setIsLoadingApprovals] = useState(true);
  const [approvalError, setApprovalError] = useState('');
  const [decisionState, setDecisionState] = useState<Record<string, 'approved' | 'rejected' | 'loading'>>({});
  const approvalFilterItems = useMemo<Array<CompactControlItem<ApprovalFilter>>>(() => [
    { value: 'pending', label: t('approvals.filters.pending') },
    { value: 'decided', label: t('approvals.filters.recent') }
  ], [t]);

  const canDecideApprovals = Boolean(
    workspace.permissions?.create_read_write_runs ||
    workspace.currentUserRoleTemplate?.capabilities.includes('create_read_write_runs')
  );

  const loadApprovals = async (status: ApprovalFilter = approvalFilter) => {
    setIsLoadingApprovals(true);
    setApprovalError('');
    try {
      const response = await listWorkspaceApprovalInbox(workspace.id, { status, limit: 50 });
      setApprovals(response.items);
    } catch (err) {
      setApprovalError(err instanceof Error ? err.message : t('approvals.loadError'));
    } finally {
      setIsLoadingApprovals(false);
    }
  };

  useEffect(() => {
    void loadApprovals(approvalFilter);
  }, [workspace.id, approvalFilter]);

  const summary = useMemo(() => {
    const pending = approvals.filter((approval) => approval.status === 'pending');
    const expiringSoon = pending.filter((approval) => {
      const expiresAt = new Date(approval.expiresAt).getTime();
      return Number.isFinite(expiresAt) && expiresAt - Date.now() <= 30 * 60 * 1000;
    });
    return {
      waiting: pending.length,
      expiringSoon: expiringSoon.length,
      approved: approvals.filter((approval) => approval.status === 'approved').length,
      rejected: approvals.filter((approval) => approval.status === 'rejected').length
    };
  }, [approvals]);

  const decideApproval = async (approval: WorkspaceApprovalInboxRow, decision: 'approved' | 'rejected') => {
    if (!canDecideApprovals || approval.status !== 'pending') return;
    setDecisionState((current) => ({ ...current, [approval.approvalId]: 'loading' }));
    setApprovalError('');
    try {
      await decideWorkflowRunApproval(approval.runId, approval.approvalId, decision);
      setDecisionState((current) => ({ ...current, [approval.approvalId]: decision }));
      await onApprovalDecision?.();
      await loadApprovals(approvalFilter);
    } catch (err) {
      setApprovalError(err instanceof Error ? err.message : t('approvals.decisionError'));
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
        <Button size="md" variant="secondary" onClick={() => void loadApprovals()} disabled={isLoadingApprovals}>
          <ICONS.RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t('common.refresh', { defaultValue: 'Refresh' })}
        </Button>
      } />

      {!canDecideApprovals && (
        <div className="mb-5 rounded-md border border-ui-border bg-ui-surface px-4 py-3 text-sm font-medium text-ui-text-muted">
          {t('approvals.permissionNotice')}
        </div>
      )}
      {approvalError && (
        <div className="mb-5 rounded-md border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm font-semibold text-status-danger-text">
          {approvalError}
        </div>
      )}

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
          <FilterToggleGroup<ApprovalFilter>
            activeValue={approvalFilter}
            ariaLabel={t('approvals.filters.label')}
            items={approvalFilterItems}
            onValueChange={setApprovalFilter}
          />
        </div>

        {isLoadingApprovals ? (
          <div className="space-y-3 p-5" aria-busy="true">
            {[0, 1, 2].map((item) => <div key={item} className="h-12 rounded-md bg-ui-bg" />)}
          </div>
        ) : approvals.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <h3 className="type-section-title">{t('approvals.emptyTitle')}</h3>
            <p className="type-body mx-auto mt-2 max-w-xl text-ui-text-muted">{t('approvals.emptyBody')}</p>
          </div>
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
                  return (
                    <tr key={approval.approvalId} className="bg-ui-surface text-sm">
                      <th scope="row" className="px-4 py-4 font-semibold text-ui-text">{approval.summary}</th>
                      <td className="px-4 py-4 font-medium text-ui-text">{approval.workflowId || sourceLabel(approval.source)} · {approval.runId}</td>
                      <td className="px-4 py-4 text-ui-text-muted">{approval.requestedBy || 'System'}</td>
                      <td className="px-4 py-4 text-ui-text-muted">{approval.targetId || t('approvals.targetWorkspace')}</td>
                      <td className="px-4 py-4 font-semibold text-ui-text">{sourceLabel(approval.source)}</td>
                      <td className="px-4 py-4 text-ui-text-muted">{formatDateTime(approval.expiresAt)}</td>
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
    </PageShell>
  );
};
