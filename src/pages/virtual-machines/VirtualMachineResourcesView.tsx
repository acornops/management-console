import React from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { ResourceCategoryTabs } from '@/components/common/ResourceCategoryTabs';
import { PageHeader, PageShell } from '@/components/common/PageComposition';
import { formInputClassName } from '@/components/common/formControlStyles';
import { formatUserDateTime } from '@/utils/dateTime';

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
const vmResourceSearchInputClassName = formInputClassName('h-11 py-3 pl-11 pr-4 font-normal');

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
    <PageShell>
      <PageHeader title={t('app.resources')} description={t('virtualMachines.resources.pageDescription', { name: vmName })} />

      <div className="mb-6 flex min-w-0 w-full max-w-full flex-col gap-4">
        <ResourceCategoryTabs<VmResourceCategory>
          categories={resourceCategories}
          active={activeCategory}
          counts={counts}
          labelPrefix="virtualMachines.resources.categories"
          onSelect={onCategoryChange}
          ariaLabel={t('virtualMachines.resources.categories.label')}
        />
        <div
          data-vm-resource-search-filter-bar="true"
          className="grid min-w-0 w-full max-w-full gap-3 rounded-lg border border-ui-border bg-ui-surface px-4 py-4 shadow-sm"
        >
          <div className="relative min-w-0">
            <label htmlFor="vm-resource-search" className="sr-only">{t('virtualMachines.resources.search')}</label>
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-text-muted" aria-hidden="true" />
            <input
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

      <section className="min-h-[14rem] overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
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
              <div className="px-4 py-5">
                <InlineLoadingIndicator label={t('virtualMachines.resources.loadingLogs')} />
              </div>
            ) : filteredLogs.length === 0 ? (
              <p className="px-4 py-5 text-sm font-medium text-ui-text-muted">
                {t(hasResourceSearch ? 'virtualMachines.resources.noSearchResults' : 'virtualMachines.resources.noLogs')}
              </p>
            ) : (
              <div className="divide-y divide-ui-border">
                <div className="hidden border-b border-ui-border bg-ui-bg/60 px-4 py-3 md:grid md:grid-cols-[11rem_minmax(0,12rem)_minmax(0,1fr)]">
                  <span className="type-label">{t('virtualMachines.resources.logTime')}</span>
                  <span className="type-label">{t('virtualMachines.resources.logSource')}</span>
                  <span className="type-label">{t('virtualMachines.resources.logMessage')}</span>
                </div>
                {filteredLogs.map((entry, index) => (
                  <article key={String(entry.entryId || index)} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[11rem_minmax(0,12rem)_minmax(0,1fr)]">
                    <span className="font-mono text-xs text-ui-text-muted">{formatUserDateTime(String(entry.timestamp || ''), { fallback: String(entry.timestamp || '') })}</span>
                    <span className="truncate font-semibold text-ui-text">{String(entry.source || t('virtualMachines.resources.host'))}</span>
                    <span className="min-w-0 break-words text-ui-text-muted">{String(entry.message || '')}</span>
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
              <div className="px-4 py-5">
                <InlineLoadingIndicator label={t('virtualMachines.resources.loading')} />
              </div>
            ) : filteredInventory.length === 0 ? (
              <p className="px-4 py-5 text-sm font-medium text-ui-text-muted">
                {t(hasResourceSearch ? 'virtualMachines.resources.noSearchResults' : 'virtualMachines.resources.noInventory')}
              </p>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-ui-border">
                        <th className="type-label px-5 py-3 text-left">{t('virtualMachines.resources.name')}</th>
                        <th className="type-label px-5 py-3 text-left">{t('virtualMachines.resources.category')}</th>
                        <th className="type-label px-5 py-3 text-left">{t('virtualMachines.resources.status')}</th>
                        <th className="type-label px-5 py-3 text-left">{t('virtualMachines.resources.detail')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInventory.map((item, index) => {
                        const category = getInventoryCategory(item) || t('virtualMachines.resources.inventory');
                        return (
                          <tr key={String(item.itemId || index)} className="border-b border-ui-border transition-colors last:border-b-0 hover:bg-ui-bg/70">
                            <td className="max-w-[24rem] px-5 py-4">
                              <p className="truncate text-sm font-bold text-ui-text">{String(item.name || t('virtualMachines.resources.item'))}</p>
                              <p className="mt-1 truncate text-xs font-semibold text-ui-text-muted">{String(item.kind || '')}</p>
                            </td>
                            <td className="px-5 py-4 align-top">
                              <span className="rounded-full bg-ui-bg px-2.5 py-1 text-xs font-bold capitalize text-ui-text-muted">
                                {category}
                              </span>
                            </td>
                            <td className="px-5 py-4 align-top text-sm font-semibold text-ui-text-muted">
                              {getInventoryStatus(item)}
                            </td>
                            <td className="max-w-[28rem] px-5 py-4 align-top text-sm font-medium text-ui-text-muted">
                              <span className="line-clamp-2">{getInventoryDetail(item) || t('virtualMachines.resources.noAdditionalDetail')}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-ui-border md:hidden">
                  {filteredInventory.map((item, index) => (
                    <article key={String(item.itemId || index)} className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-ui-bg px-2.5 py-1 text-xs font-bold capitalize text-ui-text-muted">
                          {getInventoryCategory(item) || t('virtualMachines.resources.inventory')}
                        </span>
                        <span className="text-xs font-semibold text-ui-text-muted">{getInventoryStatus(item)}</span>
                      </div>
                      <h3 className="mt-3 truncate text-sm font-bold text-ui-text">{String(item.name || t('virtualMachines.resources.item'))}</h3>
                      <p className="mt-1 break-words text-sm font-medium leading-6 text-ui-text-muted">{getInventoryDetail(item) || String(item.kind || t('virtualMachines.resources.noAdditionalDetail'))}</p>
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
