import { useTranslation } from 'react-i18next';
import type { VmCategoryCollection, VmCollectionCategory, VmInventoryCollection, VmLogsResponse } from '@/services/control-plane/virtualMachineCollection';
import { formatUserDateTime } from '@/utils/dateTime';

export function isIncompleteCollection(collection: VmCategoryCollection) {
  return collection.status !== 'ok' || (collection.omittedCount || 0) > 0 || collection.findingCoverage === 'incomplete';
}
export function inventoryCollectionNotices(collection: VmInventoryCollection | null | undefined, category: 'all' | 'services' | 'processes' | 'network') {
  const keys: VmCollectionCategory[] = category === 'all' ? ['host', 'filesystems', 'services', 'processes', 'network'] : [category];
  return keys.map((key) => ({ key, collection: collection?.categories[key] || { status: 'unknown' as const } }))
    .filter((item) => isIncompleteCollection(item.collection));
}
export function logCollectionState(logs?: VmLogsResponse): VmCategoryCollection {
  return { status: logs?.health?.status || 'unknown' };
}

export function VirtualMachineCollectionNotice({ label, collection, snapshotTs, logs }: {
  label: string; collection: VmCategoryCollection; snapshotTs?: string; logs?: VmLogsResponse;
}) {
  const { t } = useTranslation();
  const prefix = 'virtualMachines.resources.collection';
  return <div role="status" className="type-caption border-b border-ui-border bg-ui-bg px-4 py-3 text-ui-text-muted">
    <p>{label}: {t(`${prefix}.${collection.status === 'ok' ? 'partial' : collection.status}`)}</p>
    {(collection.omittedCount || 0) > 0 && <p>{t(`${prefix}.omitted`, { count: collection.omittedCount })}</p>}
    {collection.findingCoverage === 'incomplete' && <p>{t(`${prefix}.coverage`)}</p>}
    {logs?.truncated && <p>{t(`${prefix}.truncated`)}</p>}
    {logs?.returned_count !== undefined && logs.original_count !== undefined && <p>{t(`${prefix}.counts`, { count: logs.returned_count, returned: logs.returned_count, original: logs.original_count })}</p>}
    {snapshotTs && <p>{t(`${prefix}.snapshot`)} <time dateTime={snapshotTs}>{formatUserDateTime(snapshotTs)}</time></p>}
  </div>;
}
