import React from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  DataTableGridHeader,
  DataTableGridHeaderCell,
  DataTableHeader,
  DataTableHeaderCell,
  CollectionLoadingSkeleton,
  EmptyState,
  PageHeader,
  PageShell,
  formInputClassName
} from '@acornops/ui';
import { ResourceCategoryTabs } from '@/components/common/ResourceCategoryTabs';
import { formatUserDateTime } from '@/utils/dateTime';
import { TextInput } from '@acornops/ui';
import { DataTableBody, DataTableCell, DataTableRow } from '@acornops/ui';

const virtualMachineLogGridClass =
  'md:grid-cols-[11rem_minmax(0,12rem)_minmax(0,1fr)]';

export type VmResourceCategory = 'all' | 'services' | 'processes' | 'network' | 'logs';

interface VirtualMachineResourcesViewProps {
  vmName: string;
  activeCategory: VmResourceCategory;
  inventory: Record<string, unknown>[];
  logs: Record<string, unknown>[];
  isLoading: boolean;
  error: string | null;
  isLogsLoading: boolean;
  logsError: string | null;
  onCategoryChange: (category: VmResourceCategory) => void;
  onRetry: () => void;
}

const resourceCategories: ReadonlyArray<VmResourceCategory> = ['all', 'services', 'processes', 'network', 'logs'];
const vmResourceSearchInputClassName = formInputClassName('h-11 py-3 pl-11 pr-4 type-body');

function getInventoryCategory(item: Record<string, unknown>): VmResourceCategory | null {
  const category = String(item.category || '').toLowerCase();
  if (category === 'services' || category === 'processes' || category === 'network' || category === 'logs') {
    return category;
  }
  return null;
}

function getInventoryStatus(item: Record<string, unknown>): string {
  const payload = getInventoryPayload(item);
  const serviceState = [payload.activeState, payload.subState].filter(Boolean).join(' / ');
  return String(item.status || serviceState || item.location || item.kind || '');
}

function getInventoryDetail(item: Record<string, unknown>): string {
  const payload = getInventoryPayload(item);
  const category = getInventoryCategory(item);
  if (category === 'services') {
    return [payload.description, payload.loadState].filter(Boolean).map(String).join(' · ');
  }
  if (category === 'processes') {
    return [
      payload.command,
      payload.user ? `user ${payload.user}` : '',
      payload.pid ? `pid ${payload.pid}` : ''
    ].filter(Boolean).map(String).join(' · ');
  }
  if (category === 'network') {
    const address = payload.localAddress || payload.address;
    return [
      payload.protocol,
      address && payload.port ? `${address}:${payload.port}` : address,
      payload.process
    ].filter(Boolean).map(String).join(' · ');
  }
  if (category === 'logs') {
    return [
      payload.unit || payload.source,
      payload.message
    ].filter(Boolean).map(String).join(' · ');
  }
  return String(item.detail || payload.description || payload.command || payload.address || payload.path || '');
}

function getInventoryPayload(item: Record<string, unknown>): Record<string, unknown> {
  return item.item && typeof item.item === 'object' && !Array.isArray(item.item)
    ? item.item as Record<string, unknown>
    : item;
}

function getSearchTokens(value: string): string[] {
  return value.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function matchesSearch(searchTerm: string, values: unknown[]): boolean {
  const tokens = getSearchTokens(searchTerm);
  if (tokens.length === 0) return true;
  const searchable = values
    .filter((value) => value !== undefined && value !== null)
    .map(String)
    .join(' ')
    .toLowerCase();
  return tokens.every((token) => searchable.includes(token));
}

function isInventoryAttention(item: Record<string, unknown>): boolean {
  const status = getInventoryStatus(item).toLowerCase().replace(/[\s_-]+/g, '');
  if (!status) return false;
  return (
    status.includes('failed') ||
    status.includes('error') ||
    status.includes('unhealthy') ||
    status.includes('crash') ||
    status.includes('down') ||
    status.includes('stopped') ||
    status.includes('inactive') ||
    status.includes('notrunning')
  );
}

function sortInventoryAttentionFirst(items: Record<string, unknown>[]): Record<string, unknown>[] {
  return items
    .map((item, index) => ({ item, index, hasAttention: isInventoryAttention(item) }))
    .sort((first, second) => Number(second.hasAttention) - Number(first.hasAttention) || first.index - second.index)
    .map(({ item }) => item);
}

export const VirtualMachineResourcesView: React.FC<VirtualMachineResourcesViewProps> = ({
  vmName,
  activeCategory,
  inventory,
  logs,
  isLoading,
  error,
  isLogsLoading,
  logsError,
  onCategoryChange,
  onRetry
}) => {
  const { t } = useTranslation();
  const [resourceSearchTerm, setResourceSearchTerm] = React.useState('');
  const hasResourceSearch = resourceSearchTerm.trim().length > 0;
  const filteredInventory = React.useMemo(
    () =>
      sortInventoryAttentionFirst(
        inventory.filter((item) => {
          const matchesCategory =
            activeCategory === 'all'
              ? true
              : activeCategory === 'logs'
                ? false
                : getInventoryCategory(item) === activeCategory;
          return matchesCategory && matchesSearch(resourceSearchTerm, [
            item.name,
            item.kind,
            getInventoryCategory(item),
            getInventoryStatus(item),
            getInventoryDetail(item)
          ]);
        })
      ),
    [activeCategory, inventory, resourceSearchTerm]
  );
  const filteredLogs = React.useMemo(
    () =>
      logs.filter((entry) =>
        matchesSearch(resourceSearchTerm, [
          entry.entryId,
          entry.timestamp,
          entry.source,
          entry.message
        ])
      ),
    [logs, resourceSearchTerm]
  );
  const counts = React.useMemo(
    () => ({
      all: inventory.length,
      services: inventory.filter((item) => getInventoryCategory(item) === 'services').length,
      processes: inventory.filter((item) => getInventoryCategory(item) === 'processes').length,
      network: inventory.filter((item) => getInventoryCategory(item) === 'network').length,
      logs: logs.length
    }),
    [inventory, logs]
  );
  return (
    <PageShell data-vm-resource-category={activeCategory}>
      <PageHeader title={t('app.resources')} description={t('virtualMachines.resources.pageDescription', { name: vmName })} />

      <div className="mb-6 flex min-w-0 w-full max-w-full flex-col gap-4">
        <ResourceCategoryTabs<VmResourceCategory>
          categories={resourceCategories}
          active={activeCategory}
          counts={counts}
          labelPrefix="virtualMachines.resources.categories"
          onSelect={onCategoryChange}
          ariaLabel={t('virtualMachines.resources.categories.label')}
          idBase="vm-resource-category"
          controlsId="vm-resource-panel"
        />
        <div
          data-vm-resource-search-filter-bar="true"
          className="grid min-w-0 w-full max-w-full gap-3 rounded-lg border border-ui-border bg-ui-surface px-4 py-4 shadow-sm"
        >
          <div className="relative min-w-0">
            <label htmlFor="vm-resource-search" className="sr-only">{t('virtualMachines.resources.search')}</label>
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-text-muted" aria-hidden="true" />
            <TextInput
              id="vm-resource-search"
              type="search"
              value={resourceSearchTerm}
              onChange={(event) => setResourceSearchTerm(event.target.value)}
              placeholder={t('virtualMachines.resources.search')}
              className={vmResourceSearchInputClassName}
            />
          </div>
        </div>
      </div>

      <section id="vm-resource-panel" role="tabpanel" tabIndex={0} aria-labelledby={`vm-resource-category-${activeCategory}-tab`} className="min-h-[14rem] overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25">
        {activeCategory === 'logs' ? (
          <div className="max-h-[calc(100vh-22rem)] overflow-auto">
            {logsError ? (
              <div className="flex flex-col items-start gap-3 px-4 py-5">
                <p className="type-caption rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
                  {logsError}
                </p>
                <Button onClick={onRetry} variant="secondary" size="sm">
                  <RefreshCw className="h-4 w-4" />
                  {t('common.retry')}
                </Button>
              </div>
            ) : isLogsLoading ? (
              <CollectionLoadingSkeleton label={t('virtualMachines.resources.loadingLogs')} />
            ) : filteredLogs.length === 0 ? (
              <EmptyState
                embedded
                headingLevel={3}
                icon={<Search />}
                title={t(hasResourceSearch ? 'virtualMachines.resources.noSearchResults' : 'virtualMachines.resources.noLogs')}
                description={t(hasResourceSearch ? 'virtualMachines.resources.noSearchResultsHelp' : 'virtualMachines.resources.emptyHelp')}
              />
            ) : (
              <div>
                <DataTableGridHeader showAt="md" className={virtualMachineLogGridClass}>
                  <DataTableGridHeaderCell>{t('virtualMachines.resources.logTime')}</DataTableGridHeaderCell>
                  <DataTableGridHeaderCell>{t('virtualMachines.resources.logSource')}</DataTableGridHeaderCell>
                  <DataTableGridHeaderCell>{t('virtualMachines.resources.logMessage')}</DataTableGridHeaderCell>
                </DataTableGridHeader>
                {filteredLogs.map((entry, index) => (
                  <article key={String(entry.entryId || index)} className={`grid gap-2 border-b border-ui-border px-4 py-5 last:border-b-0 sm:px-6 lg:px-8 lg:py-6 ${virtualMachineLogGridClass}`}>
                    <span className="type-code text-ui-text-muted">{formatUserDateTime(String(entry.timestamp || ''), { fallback: String(entry.timestamp || '') })}</span>
                    <span className="type-row-title truncate">{String(entry.source || t('virtualMachines.resources.host'))}</span>
                    <span className="type-body min-w-0 break-words">{String(entry.message || '')}</span>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {error ? (
              <div className="flex flex-col items-start gap-3 px-4 py-5">
                <p className="type-caption rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text">
                  {error}
                </p>
                <Button onClick={onRetry} variant="secondary" size="sm">
                  <RefreshCw className="h-4 w-4" />
                  {t('common.retry')}
                </Button>
              </div>
            ) : isLoading ? (
              <CollectionLoadingSkeleton label={t('virtualMachines.resources.loading')} />
            ) : filteredInventory.length === 0 ? (
              <EmptyState
                embedded
                headingLevel={3}
                icon={<Search />}
                title={t(hasResourceSearch ? 'virtualMachines.resources.noSearchResults' : 'virtualMachines.resources.noInventory')}
                description={t(hasResourceSearch ? 'virtualMachines.resources.noSearchResultsHelp' : 'virtualMachines.resources.emptyHelp')}
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <DataTable caption={t('virtualMachines.resources.pageDescription', { name: vmName })}>
                    <DataTableHeader>
                      <DataTableRow>
                        <DataTableHeaderCell>{t('virtualMachines.resources.name')}</DataTableHeaderCell>
                        <DataTableHeaderCell>{t('virtualMachines.resources.category')}</DataTableHeaderCell>
                        <DataTableHeaderCell>{t('virtualMachines.resources.status')}</DataTableHeaderCell>
                        <DataTableHeaderCell>{t('virtualMachines.resources.detail')}</DataTableHeaderCell>
                      </DataTableRow>
                    </DataTableHeader>
                    <DataTableBody>
                      {filteredInventory.map((item, index) => {
                        const category = getInventoryCategory(item) || t('virtualMachines.resources.inventory');
                        return (
                          <DataTableRow key={String(item.itemId || index)} className="border-b border-ui-border transition-colors last:border-b-0 hover:bg-ui-bg/70">
                            <DataTableCell className="max-w-[24rem] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
                              <p className="truncate type-row-title">{String(item.name || t('virtualMachines.resources.item'))}</p>
                              <p className="type-caption mt-1 truncate">{String(item.kind || '')}</p>
                            </DataTableCell>
                            <DataTableCell className="px-4 py-5 align-top sm:px-6 lg:px-8 lg:py-6">
                              <span className="type-micro-label rounded-full bg-ui-bg px-2.5 py-1">
                                {category}
                              </span>
                            </DataTableCell>
                            <DataTableCell className="type-ui px-4 py-5 align-top text-ui-text-muted sm:px-6 lg:px-8 lg:py-6">
                              {getInventoryStatus(item)}
                            </DataTableCell>
                            <DataTableCell className="type-body max-w-[28rem] px-4 py-5 align-top sm:px-6 lg:px-8 lg:py-6">
                              <span className="line-clamp-2">{getInventoryDetail(item) || t('virtualMachines.resources.noAdditionalDetail')}</span>
                            </DataTableCell>
                          </DataTableRow>
                        );
                      })}
                    </DataTableBody>
                  </DataTable>
                </div>

                <div className="divide-y divide-ui-border md:hidden">
                  {filteredInventory.map((item, index) => (
                    <article key={String(item.itemId || index)} className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="type-micro-label rounded-full bg-ui-bg px-2.5 py-1">
                          {getInventoryCategory(item) || t('virtualMachines.resources.inventory')}
                        </span>
                        <span className="type-caption">{getInventoryStatus(item)}</span>
                      </div>
                      <h2 className="mt-3 truncate type-row-title">{String(item.name || t('virtualMachines.resources.item'))}</h2>
                      <p className="type-body mt-1 break-words">{getInventoryDetail(item) || String(item.kind || t('virtualMachines.resources.noAdditionalDetail'))}</p>
                    </article>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>
    </PageShell>
  );
};
