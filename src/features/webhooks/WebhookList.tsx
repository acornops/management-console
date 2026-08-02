import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@acornops/ui';
import { CollectionState } from '@acornops/ui';
import { CollectionLoadingSkeleton } from '@acornops/ui';
import { DataTableGridHeader, DataTableGridHeaderCell } from '@acornops/ui';
import { EmptyState } from '@acornops/ui';
import { MenuItem } from '@acornops/ui';
import { OverflowActionMenu } from '@acornops/ui';
import { DataSurface } from '@acornops/ui';
import { StatusBadge } from '@acornops/ui';
import { ICONS } from '@/constants';
import type {
  ControlPlaneWebhookHistory,
  ControlPlaneWebhookSubscription
} from '@/services/controlPlaneApi';
import { formatUserDateTime } from '@/utils/dateTime';
import { formatIdentifierLabel } from '@/utils/textFormatting';

interface WebhookListProps {
  webhooks: ControlPlaneWebhookSubscription[];
  hasActiveFilters: boolean;
  canManageWebhooks: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  loadError: string | null;
  deletingId: string | null;
  historyWebhookId: string | null;
  history: ControlPlaneWebhookHistory[];
  isHistoryLoading: boolean;
  historyError: string | null;
  actionButtonRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
  onClearFilters: () => void;
  onRefresh: () => void;
  onEdit: (webhook: ControlPlaneWebhookSubscription) => void;
  onDelete: (webhook: ControlPlaneWebhookSubscription) => void;
  onLoadHistory: (webhook: ControlPlaneWebhookSubscription) => void;
}

const webhookLedgerGridClass =
  'grid-cols-[minmax(0,1fr)_auto] xl:grid-cols-[minmax(11rem,0.85fr)_minmax(0,1.2fr)_minmax(11rem,1fr)_minmax(9rem,0.75fr)_4.5rem]';

function deliveryStatusTone(entry: ControlPlaneWebhookHistory): 'success' | 'warning' | 'danger' | 'neutral' {
  if (entry.status === 'success') return 'success';
  if (entry.status === 'failed') return entry.willRetry ? 'warning' : 'danger';
  if (entry.status === 'paused') return 'warning';
  return 'neutral';
}

export const WebhookList: React.FC<WebhookListProps> = ({
  webhooks,
  hasActiveFilters,
  canManageWebhooks,
  isLoading,
  isRefreshing,
  loadError,
  deletingId,
  historyWebhookId,
  history,
  isHistoryLoading,
  historyError,
  actionButtonRefs,
  onClearFilters,
  onRefresh,
  onEdit,
  onDelete,
  onLoadHistory
}) => {
  const { t } = useTranslation();
  const phase = isLoading
    ? 'loading'
    : isRefreshing
      ? 'refreshing'
      : loadError
        ? 'error'
        : 'ready';

  return (
    <DataSurface
      aria-label={t('workspaceWebhooks.listTitle')}
    >
      <DataTableGridHeader
        showAt="xl"
        className={webhookLedgerGridClass}
        collectionState={{ phase, itemCount: webhooks.length }}
      >
        <DataTableGridHeaderCell>{t('workspaceWebhooks.columns.webhook')}</DataTableGridHeaderCell>
        <DataTableGridHeaderCell>{t('workspaceWebhooks.columns.destination')}</DataTableGridHeaderCell>
        <DataTableGridHeaderCell>{t('workspaceWebhooks.columns.events')}</DataTableGridHeaderCell>
        <DataTableGridHeaderCell>{t('workspaceWebhooks.columns.modified')}</DataTableGridHeaderCell>
        <DataTableGridHeaderCell numeric>{t('workspaceWebhooks.columns.actions')}</DataTableGridHeaderCell>
      </DataTableGridHeader>
      <CollectionState
        phase={phase}
        itemCount={webhooks.length}
        loading={<CollectionLoadingSkeleton label={t('workspaceWebhooks.loading')} />}
        empty={(
          <EmptyState
            embedded
            icon={hasActiveFilters ? <ICONS.Search /> : <ICONS.Send />}
            title={hasActiveFilters ? t('workspaceWebhooks.filters.emptyTitle') : t('workspaceWebhooks.emptyTitle')}
            description={hasActiveFilters ? t('workspaceWebhooks.filters.emptyDescription') : t('workspaceWebhooks.emptyDescription')}
            actions={hasActiveFilters
              ? <Button size="sm" variant="secondary" onClick={onClearFilters}>{t('common.clearAll')}</Button>
              : undefined}
          />
        )}
        error={(
          <div role="alert" className="p-5">
            <p className="type-body type-emphasis text-status-danger-text">{loadError}</p>
            <Button className="mt-3" size="sm" variant="secondary" onClick={onRefresh}>{t('common.retry')}</Button>
          </div>
        )}
        feedback={loadError ? <p role="alert" className="border-t border-ui-border p-4 type-body text-status-danger-text">{loadError}</p> : null}
        announcement={isRefreshing ? t('workspaceWebhooks.refreshing') : undefined}
      >
        <div className="divide-y divide-ui-border">
        {webhooks.map((webhook) => {
          const showingHistory = historyWebhookId === webhook.id;
          const deleting = deletingId === webhook.id;
          const modifiedAt = webhook.updatedAt || webhook.createdAt;
          const runAction = (close: () => void, action: () => void) => {
            close();
            actionButtonRefs.current.get(webhook.id)?.focus({ preventScroll: true });
            action();
          };
          return (
            <article key={webhook.id}>
              <div className="p-[var(--ao-surface-padding)] xl:px-8 xl:py-6">
                <div className={`grid gap-4 xl:items-start ${webhookLedgerGridClass}`}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="type-row-title">{webhook.name}</h2>
                      <StatusBadge tone={webhook.enabled ? 'success' : 'neutral'}>
                        {webhook.enabled ? t('workspaceWebhooks.enabled') : t('workspaceWebhooks.disabled')}
                      </StatusBadge>
                      {webhook.targetId && <StatusBadge tone="neutral">{t('workspaceWebhooks.targetScoped')}</StatusBadge>}
                    </div>
                  </div>
                  <div className="col-span-2 min-w-0 xl:col-span-1">
                    <p className="type-micro-label mb-1 text-ui-text-muted xl:hidden">{t('workspaceWebhooks.columns.destination')}</p>
                    <p className="break-all type-caption type-emphasis text-ui-text-muted">{webhook.url}</p>
                  </div>
                  <div className="col-span-2 min-w-0 xl:col-span-1">
                    <p className="type-micro-label mb-1 text-ui-text-muted xl:hidden">{t('workspaceWebhooks.columns.events')}</p>
                    <p className="type-caption mb-2 type-emphasis text-ui-text">{t('workspaceWebhooks.eventCount', { count: webhook.eventTypes.length })}</p>
                    <div className="flex flex-wrap content-start gap-1.5">
                      {webhook.eventTypes.slice(0, 3).map((eventType) => (
                        <span key={eventType} className="rounded-md border border-ui-border bg-ui-bg px-2 py-1 type-caption">
                          {eventType}
                        </span>
                      ))}
                      {webhook.eventTypes.length > 3 && (
                        <span className="rounded-md border border-ui-border bg-ui-bg px-2 py-1 type-caption">
                          {t('workspaceWebhooks.moreEvents', { count: webhook.eventTypes.length - 3 })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 min-w-0 xl:col-span-1">
                    <p className="type-micro-label mb-1 text-ui-text-muted xl:hidden">{t('workspaceWebhooks.columns.modified')}</p>
                    <time className="type-caption type-emphasis text-ui-text-muted" dateTime={modifiedAt}>
                      {modifiedAt
                        ? formatUserDateTime(modifiedAt, { fallback: modifiedAt })
                        : t('workspaceWebhooks.modifiedUnavailable')}
                    </time>
                  </div>
                  {canManageWebhooks && (
                    <div className="col-start-2 row-start-1 flex justify-end xl:col-start-auto xl:row-start-auto">
                      <OverflowActionMenu
                        ref={(node) => {
                          if (node) actionButtonRefs.current.set(webhook.id, node);
                          else actionButtonRefs.current.delete(webhook.id);
                        }}
                        label={t('workspaceWebhooks.actionsFor', { name: webhook.name })}
                        disabled={deleting}
                        estimatedHeight={152}
                      >
                        {(close) => <>
                          <MenuItem onClick={() => runAction(close, () => onEdit(webhook))}>
                            <ICONS.Pencil className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
                            {t('workspaceWebhooks.edit')}
                          </MenuItem>
                          <MenuItem disabled={showingHistory && isHistoryLoading} onClick={() => runAction(close, () => onLoadHistory(webhook))}>
                            <ICONS.Activity className="h-4 w-4 shrink-0 text-ui-text-muted" aria-hidden="true" />
                            {t('workspaceWebhooks.history')}
                          </MenuItem>
                          <MenuItem destructive onClick={() => runAction(close, () => onDelete(webhook))}>
                            <ICONS.Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                            {deleting ? t('workspaceWebhooks.deleting') : t('workspaceWebhooks.delete')}
                          </MenuItem>
                        </>}
                      </OverflowActionMenu>
                    </div>
                  )}
                  {!canManageWebhooks && (
                    <div
                      aria-hidden="true"
                      className="col-start-2 row-start-1 text-right type-caption text-ui-text-muted xl:col-start-auto xl:row-start-auto"
                    >
                      —
                    </div>
                  )}
                </div>
              </div>

              {canManageWebhooks && showingHistory && (
                <div className="border-t border-ui-border bg-ui-bg p-4">
                  <h3 className="type-row-title text-ui-text">{t('workspaceWebhooks.recentDeliveries')}</h3>
                  {isHistoryLoading && <p className="mt-3 type-caption text-ui-text-muted">{t('workspaceWebhooks.historyLoading')}</p>}
                  {!isHistoryLoading && historyError && <p role="alert" className="mt-3 type-caption text-status-danger-text">{historyError}</p>}
                  {!isHistoryLoading && !historyError && history.length === 0 && (
                    <p className="mt-3 type-caption text-ui-text-muted">{t('workspaceWebhooks.historyEmpty')}</p>
                  )}
                  {!isHistoryLoading && !historyError && history.length > 0 && (
                    <div className="mt-3 divide-y divide-ui-border overflow-hidden rounded-md border border-ui-border bg-ui-surface">
                      {history.map((entry) => (
                        <div key={entry.id} className="grid gap-3 p-3 type-caption type-emphasis text-ui-text-muted md:grid-cols-[minmax(0,1fr)_140px_minmax(160px,auto)]">
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
                                  defaultValue: formatIdentifierLabel(entry.terminalReason)
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
