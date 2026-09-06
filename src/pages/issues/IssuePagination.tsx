import { Button, InlineAlert } from '@acornops/ui';
import { useTranslation } from 'react-i18next';
import type { CursorCollectionResult } from '@/hooks/useCursorCollection';
import type { ControlPlaneIssueItem } from '@/services/controlPlaneApi';

export function IssuePagination({ collection, total }: {
  collection: CursorCollectionResult<ControlPlaneIssueItem>;
  total?: number;
}) {
  const { t } = useTranslation();
  const busy = ['loading', 'loadingMore', 'refreshing'].includes(collection.phase);
  const hasCurrentTotal = total !== undefined && total >= collection.items.length;
  return (
    <div className="border-t border-ui-border px-5 py-4 sm:px-6">
      {collection.error && <InlineAlert tone="warning" className="mb-3">{t('issues.pagination.loadError')}</InlineAlert>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="type-caption text-ui-text-muted" role="status">
          {t(hasCurrentTotal ? 'issues.pagination.loadedOf' : 'issues.pagination.loaded', { count: collection.items.length, total })}
        </p>
        {collection.error ? (
          <Button variant="secondary" size="sm" onClick={() => void collection.retry()} disabled={busy}>{t('common.retry')}</Button>
        ) : collection.nextCursor ? (
          <Button variant="secondary" size="sm" onClick={() => void collection.loadMore()} disabled={busy}>
            {busy ? t('common.loading') : t('issues.pagination.loadMore')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
