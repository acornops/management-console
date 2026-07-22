import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/common/Button';
import { CollectionState } from '@/components/common/CollectionState';
import { EmptyState } from '@/components/common/EmptyState';
import { InlineConfirmation } from '@/components/common/InlineConfirmation';
import { DataSurface } from '@/components/common/PageComposition';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ICONS } from '@/constants';
import type {
  ControlPlaneWebhookHistory,
  ControlPlaneWebhookSubscription
} from '@/services/controlPlaneApi';
import { formatUserDateTime } from '@/utils/dateTime';

interface WebhookListProps {
  webhooks: ControlPlaneWebhookSubscription[];
  canManageWebhooks: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  loadError: string | null;
  deletingId: string | null;
  historyWebhookId: string | null;
  history: ControlPlaneWebhookHistory[];
  isHistoryLoading: boolean;
  historyError: string | null;
  onRefresh: () => void;
  onEdit: (webhook: ControlPlaneWebhookSubscription) => void;
  onDelete: (webhook: ControlPlaneWebhookSubscription) => void;
  onLoadHistory: (webhook: ControlPlaneWebhookSubscription) => void;
}

function deliveryStatusTone(entry: ControlPlaneWebhookHistory): 'success' | 'warning' | 'danger' | 'neutral' {
  if (entry.status === 'success') return 'success';
  if (entry.status === 'failed') return entry.willRetry ? 'warning' : 'danger';
  if (entry.status === 'paused') return 'warning';
  return 'neutral';
}

export const WebhookList: React.FC<WebhookListProps> = ({
  webhooks,
  canManageWebhooks,
  isLoading,
  isRefreshing,
  loadError,
  deletingId,
  historyWebhookId,
  history,
  isHistoryLoading,
  historyError,
  onRefresh,
  onEdit,
  onDelete,
  onLoadHistory
}) => {
  const { t } = useTranslation();
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);
  const phase = isLoading
    ? 'loading'
    : isRefreshing
      ? 'refreshing'
      : loadError
        ? 'error'
        : 'ready';

  return (
    <DataSurface
      heading={t('workspaceWebhooks.listTitle')}
      description={t('workspaceWebhooks.listDescription')}
      count={t('workspaceWebhooks.count', { count: webhooks.length })}
      toolbar={(
        <Button size="sm" variant="secondary" onClick={onRefresh} disabled={isLoading || isRefreshing}>
          <ICONS.RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t('common.refresh')}
        </Button>
      )}
    >
      <CollectionState
        phase={phase}
        itemCount={webhooks.length}
        loading={<p className="p-5 text-sm font-semibold text-ui-text-muted">{t('workspaceWebhooks.loading')}</p>}
        empty={(
          <EmptyState
            embedded
            icon={<ICONS.Send />}
            title={t('workspaceWebhooks.emptyTitle')}
            description={t('workspaceWebhooks.emptyDescription')}
          />
        )}
        error={(
          <div role="alert" className="p-5">
            <p className="text-sm font-semibold text-status-danger-text">{loadError}</p>
            <Button className="mt-3" size="sm" variant="secondary" onClick={onRefresh}>{t('common.retry')}</Button>
          </div>
        )}
        feedback={loadError ? <p role="alert" className="border-t border-ui-border p-4 text-sm text-status-danger-text">{loadError}</p> : null}
        announcement={isRefreshing ? t('workspaceWebhooks.refreshing') : undefined}
      >
        <div className="divide-y divide-ui-border">
        {webhooks.map((webhook) => {
          const showingHistory = historyWebhookId === webhook.id;
          const deleting = deletingId === webhook.id;
          return (
            <article key={webhook.id}>
              <div className="p-[var(--surface-padding)]">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-ui-text">{webhook.name}</h3>
                      <StatusBadge tone={webhook.enabled ? 'success' : 'neutral'}>
                        {webhook.enabled ? t('workspaceWebhooks.enabled') : t('workspaceWebhooks.disabled')}
                      </StatusBadge>
                      {webhook.targetId && <StatusBadge tone="neutral">{t('workspaceWebhooks.targetScoped')}</StatusBadge>}
                    </div>
                    <p className="mt-2 break-all text-xs font-semibold text-ui-text-muted">{webhook.url}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {webhook.eventTypes.map((eventType) => (
                        <span key={eventType} className="rounded-md border border-ui-border bg-ui-bg px-2 py-1 text-[11px] font-semibold text-ui-text-muted">
                          {eventType}
                        </span>
                      ))}
                    </div>
                  </div>
                  {canManageWebhooks && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => onEdit(webhook)} disabled={deleting}>
                        <ICONS.Pencil className="h-4 w-4" aria-hidden="true" />
                        {t('workspaceWebhooks.edit')}
                      </Button>
                      <Button size="sm" onClick={() => onLoadHistory(webhook)} disabled={deleting || (showingHistory && isHistoryLoading)}>
                        <ICONS.Activity className="h-4 w-4" aria-hidden="true" />
                        {t('workspaceWebhooks.history')}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setPendingDeleteId(webhook.id)} disabled={deleting}>
                        <ICONS.Trash2 className="h-4 w-4" aria-hidden="true" />
                        {deleting ? t('workspaceWebhooks.deleting') : t('workspaceWebhooks.delete')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {pendingDeleteId === webhook.id && (
                <InlineConfirmation
                  id={`delete-webhook-${webhook.id}`}
                  title={t('workspaceWebhooks.deleteTitle', { name: webhook.name })}
                  description={t('workspaceWebhooks.deleteDescription')}
                  tone="danger"
                  confirmLabel={t('workspaceWebhooks.delete')}
                  confirmVariant="danger"
                  confirmDisabled={deleting}
                  cancelLabel={t('common.cancel')}
                  onCancel={() => setPendingDeleteId(null)}
                  onConfirm={() => {
                    onDelete(webhook);
                    setPendingDeleteId(null);
                  }}
                  className="border-t border-status-danger/20"
                />
              )}

              {canManageWebhooks && showingHistory && (
                <div className="border-t border-ui-border bg-ui-bg p-4">
                  <h4 className="type-label text-ui-text">{t('workspaceWebhooks.recentDeliveries')}</h4>
                  {isHistoryLoading && <p className="mt-3 type-caption text-ui-text-muted">{t('workspaceWebhooks.historyLoading')}</p>}
                  {!isHistoryLoading && historyError && <p role="alert" className="mt-3 type-caption text-status-danger-text">{historyError}</p>}
                  {!isHistoryLoading && !historyError && history.length === 0 && (
                    <p className="mt-3 type-caption text-ui-text-muted">{t('workspaceWebhooks.historyEmpty')}</p>
                  )}
                  {!isHistoryLoading && !historyError && history.length > 0 && (
                    <div className="mt-3 divide-y divide-ui-border overflow-hidden rounded-md border border-ui-border bg-ui-surface">
                      {history.map((entry) => (
                        <div key={entry.id} className="grid gap-3 p-3 text-xs font-semibold text-ui-text-muted md:grid-cols-[minmax(0,1fr)_140px_minmax(160px,auto)]">
                          <div className="min-w-0">
                            <span className="block truncate text-ui-text">{entry.eventType}</span>
                            <span className="mt-1 block">
                              {entry.status === 'paused'
                                ? t('workspaceWebhooks.historyPaused')
                                : t('workspaceWebhooks.historyAttempt', { attempt: entry.attemptNumber })}
                              {entry.willRetry && entry.nextAttemptAt
                                ? ` · ${t('workspaceWebhooks.historyNextRetry', {
                                    time: formatUserDateTime(entry.nextAttemptAt, { fallback: entry.nextAttemptAt })
                                  })}`
                                : ''}
                            </span>
                            {entry.terminalReason && (
                              <span className="mt-1 block text-ui-text">
                                {t(`workspaceWebhooks.terminalReason.${entry.terminalReason}`, {
                                  defaultValue: entry.terminalReason.replaceAll('_', ' ')
                                })}
                              </span>
                            )}
                          </div>
                          <span className="flex flex-wrap items-center gap-2">
                            <StatusBadge tone={deliveryStatusTone(entry)}>
                              {t(`workspaceWebhooks.historyStatus.${entry.status}`)}
                            </StatusBadge>
                            {entry.responseStatus ? `HTTP ${entry.responseStatus}` : ''}
                            {entry.willRetry ? t('workspaceWebhooks.retrying') : ''}
                          </span>
                          <time dateTime={entry.sentAt}>{formatUserDateTime(entry.sentAt, { fallback: entry.sentAt })}</time>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
        </div>
      </CollectionState>
    </DataSurface>
  );
};
