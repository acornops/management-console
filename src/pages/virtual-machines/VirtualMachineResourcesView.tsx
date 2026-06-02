import React from 'react';
import { FileText, Network, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { InlineLoadingIndicator } from '@/components/common/Loading';
import { ICONS } from '@/constants';

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

const resourceCategories: Array<{
  id: VmResourceCategory;
  labelKey: string;
  descriptionKey: string;
  icon: React.ElementType;
}> = [
  {
    id: 'all',
    labelKey: 'virtualMachines.resources.categories.all',
    descriptionKey: 'virtualMachines.resources.categoryDescriptions.all',
    icon: ICONS.Activity
  },
  {
    id: 'services',
    labelKey: 'virtualMachines.resources.categories.services',
    descriptionKey: 'virtualMachines.resources.categoryDescriptions.services',
    icon: ICONS.Layers
  },
  {
    id: 'processes',
    labelKey: 'virtualMachines.resources.categories.processes',
    descriptionKey: 'virtualMachines.resources.categoryDescriptions.processes',
    icon: ICONS.Terminal
  },
  {
    id: 'network',
    labelKey: 'virtualMachines.resources.categories.network',
    descriptionKey: 'virtualMachines.resources.categoryDescriptions.network',
    icon: Network
  },
  {
    id: 'logs',
    labelKey: 'virtualMachines.resources.categories.logs',
    descriptionKey: 'virtualMachines.resources.categoryDescriptions.logs',
    icon: FileText
  }
];

function getInventoryCategory(item: Record<string, unknown>): VmResourceCategory | null {
  const category = String(item.category || '').toLowerCase();
  if (category === 'services' || category === 'processes' || category === 'network') {
    return category;
  }
  return null;
}

function getInventoryStatus(item: Record<string, unknown>): string {
  return String(item.status || item.location || item.kind || '');
}

function getInventoryDetail(item: Record<string, unknown>): string {
  return String(item.detail || item.description || item.command || item.address || item.path || '');
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
  const filteredInventory = React.useMemo(
    () =>
      inventory.filter((item) => {
        if (activeCategory === 'all') return true;
        if (activeCategory === 'logs') return false;
        return getInventoryCategory(item) === activeCategory;
      }),
    [activeCategory, inventory]
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
    <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
      <header className="mb-8 min-w-0">
        <h1 className="type-route-title">{t('app.resources')}</h1>
        <p className="type-body mt-2">{t('virtualMachines.resources.pageDescription', { name: vmName })}</p>
      </header>
      <div className="rounded-lg border border-ui-border bg-ui-surface shadow-sm">
        <div className="border-b border-ui-border bg-ui-bg px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-ui-text">{t('virtualMachines.resources.hostResources')}</h2>
              <p className="mt-1 text-sm font-medium leading-6 text-ui-text-muted">
                {t('virtualMachines.resources.description')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-ui-text-muted sm:flex">
              <span className="rounded-md border border-ui-border bg-ui-surface px-3 py-1.5">{t('virtualMachines.resources.serviceCount', { count: counts.services })}</span>
              <span className="rounded-md border border-ui-border bg-ui-surface px-3 py-1.5">{t('virtualMachines.resources.processCount', { count: counts.processes })}</span>
              <span className="rounded-md border border-ui-border bg-ui-surface px-3 py-1.5">{t('virtualMachines.resources.networkCount', { count: counts.network })}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-2 border-b border-ui-border p-3 md:grid-cols-5">
          {resourceCategories.map((category) => {
            const Icon = category.icon;
            const active = activeCategory === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onCategoryChange(category.id)}
                className={`min-h-[6.5rem] rounded-md border px-3 py-3 text-left transition-colors ${
                  active
                    ? 'border-accent/40 bg-accent-soft text-accent-strong'
                    : 'border-ui-border bg-ui-bg text-ui-text hover:border-ui-text-muted/40 hover:bg-ui-surface'
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm font-bold">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t(category.labelKey)}</span>
                  </span>
                  <span className="rounded-full bg-ui-surface px-2 py-0.5 text-[11px] font-bold text-ui-text-muted">
                    {counts[category.id]}
                  </span>
                </span>
                <span className="mt-2 block text-xs font-medium leading-5 text-ui-text-muted">
                  {t(category.descriptionKey)}
                </span>
              </button>
            );
          })}
        </div>

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
            ) : logs.length === 0 ? (
              <p className="px-4 py-5 text-sm font-medium text-ui-text-muted">{t('virtualMachines.resources.noLogs')}</p>
            ) : (
              <div className="divide-y divide-ui-border">
                {logs.map((entry, index) => (
                  <article key={String(entry.entryId || index)} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[11rem_minmax(0,12rem)_minmax(0,1fr)]">
                    <span className="font-mono text-xs text-ui-text-muted">{String(entry.timestamp || '')}</span>
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
              <p className="px-4 py-5 text-sm font-medium text-ui-text-muted">{t('virtualMachines.resources.noInventory')}</p>
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
                      <p className="mt-1 text-sm font-medium leading-6 text-ui-text-muted">{getInventoryDetail(item) || String(item.kind || t('virtualMachines.resources.noAdditionalDetail'))}</p>
                    </article>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
