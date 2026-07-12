import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Trans, useTranslation } from 'react-i18next';
import { MoreHorizontal, Search, Server, Settings, Trash2 } from 'lucide-react';
import { ICONS } from '@/constants';
import { Button } from '@/components/common/Button';
import { CloseButton, TextInput } from '@/components/common/ComponentVocabulary';
import { PageSearchInput } from '@/components/common/PageSearchInput';
import { PageHeader, PageShell } from '@/components/common/PageComposition';
import { ResourceCategoryTabs } from '@/components/common/ResourceCategoryTabs';
import { Dialog } from '@/components/common/Dialog';
import { AppPaths, type VmCatalogReturnState } from '@/utils/routes';
import type { NavigateOptions } from '@/hooks/useAppRouter';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import type { ControlPlaneTargetIssueSummary, ControlPlaneVirtualMachine, ControlPlaneVirtualMachineMetricHistoryPoint } from '@/services/controlPlaneApi';
import type { Workspace } from '@/types';
import { getVmMetricTimeline, VmCardResourceChart, VmOperationalDetails, type VmMetricLoadState } from '@/pages/virtual-machines/VirtualMachineMetrics';
import { PendingVirtualMachineSetup } from '@/pages/virtual-machines/PendingVirtualMachineSetup';
import {
  getVmCatalogStatusLabel,
  getVmCatalogStatusTone,
  vmMatchesConnectionFilter,
  vmNeedsAttention,
  type VmConnectionFilter
} from '@/pages/virtual-machines/virtualMachineUi';

const VM_STATUS_FILTERS: ReadonlyArray<VmConnectionFilter> = ['all', 'attention', 'healthy', 'not_installed'];

function vmSearchMatches(vm: ControlPlaneVirtualMachine, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return [vm.name, vm.hostname, vm.id].some((value) => value?.toLowerCase().includes(normalizedQuery));
}

function vmPriority(vm: ControlPlaneVirtualMachine, issueSummary?: ControlPlaneTargetIssueSummary): number {
  if ((issueSummary?.critical ?? 0) > 0) return 0;
  if (vm.status === 'offline') return 1;
  if (vm.status === 'degraded') return 2;
  if ((issueSummary?.total ?? 0) > 0) return 3;
  if (vm.status === 'unknown') return 4;
  return 5;
}

const VmStatusPill: React.FC<{ vm: ControlPlaneVirtualMachine; issueSummary?: ControlPlaneTargetIssueSummary }> = ({ vm, issueSummary }) => {
  const { t } = useTranslation();
  const label = getVmCatalogStatusLabel(vm, issueSummary, t);
  return (
    <span
      className={`inline-flex max-w-[8.5rem] items-center rounded-full border px-2 py-0.5 text-[0.6875rem] font-bold uppercase leading-4 tracking-[0.06em] ${getVmCatalogStatusTone(vm, issueSummary)}`}
      title={label}
    >
      <span className="truncate">{label}</span>
    </span>
  );
};

interface VirtualMachinesListViewProps {
  workspace: Workspace;
  items: ControlPlaneVirtualMachine[];
  isLoading: boolean;
  hasLoadError: boolean;
  query: string;
  status: VmConnectionFilter;
  catalogReturnState: VmCatalogReturnState;
  metricHistoryByVmId: Record<string, ControlPlaneVirtualMachineMetricHistoryPoint[]>;
  metricLoadStateByVmId: Record<string, VmMetricLoadState | undefined>;
  issueSummaryByVmId: Record<string, ControlPlaneTargetIssueSummary | undefined>;
  issueSummaryLoadStateByVmId: Record<string, 'loading' | 'ready' | 'error' | undefined>;
  canManageTargets: boolean;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: VmConnectionFilter) => void;
  onOpenRegisterVm: () => void;
  onRetryLoad: () => void;
  onDeleteVirtualMachine: (vm: ControlPlaneVirtualMachine) => Promise<void> | void;
  navigate: (path: string, options?: NavigateOptions) => void;
}

export const VirtualMachinesListView: React.FC<VirtualMachinesListViewProps> = ({
  workspace,
  items,
  isLoading,
  hasLoadError,
  query,
  status,
  catalogReturnState,
  metricHistoryByVmId,
  metricLoadStateByVmId,
  issueSummaryByVmId,
  issueSummaryLoadStateByVmId,
  canManageTargets,
  onQueryChange,
  onStatusChange,
  onOpenRegisterVm,
  onRetryLoad,
  onDeleteVirtualMachine,
  navigate
}) => {
  const { t } = useTranslation();
  const [deleteTargetVm, setDeleteTargetVm] = React.useState<ControlPlaneVirtualMachine | null>(null);
  const [deleteVmConfirmation, setDeleteVmConfirmation] = React.useState('');
  const [deleteVmError, setDeleteVmError] = React.useState<string | null>(null);
  const [isDeletingVm, setIsDeletingVm] = React.useState(false);
  const [openVmActionMenuId, setOpenVmActionMenuId] = React.useState<string | null>(null);
  const [now, setNow] = React.useState(() => Date.now());
  const setupRequiredCount = items.filter((vm) => vm.status === 'unknown').length;
  const hasCompleteIssueSummaries = items
    .filter((vm) => vm.status !== 'unknown')
    .every((vm) => issueSummaryLoadStateByVmId[vm.id] === 'ready' && issueSummaryByVmId[vm.id] !== undefined);
  const statusLabels: Record<VmConnectionFilter, string> = {
    all: t('virtualMachines.list.allVms'),
    attention: t('dashboard.needsAttention'),
    healthy: t('dashboard.healthy'),
    not_installed: t('dashboard.notInstalled')
  };
  const catalogCounts: Partial<Record<VmConnectionFilter, number>> = {
    all: items.length,
    not_installed: setupRequiredCount
  };
  if (hasCompleteIssueSummaries) {
    catalogCounts.attention = items.filter((vm) => vmNeedsAttention(vm, issueSummaryByVmId[vm.id])).length;
    catalogCounts.healthy = items.filter((vm) => vm.status === 'online' && !vmNeedsAttention(vm, issueSummaryByVmId[vm.id])).length;
  }
  const visibleItems = React.useMemo(
    () => items
      .filter((vm) => vmMatchesConnectionFilter(vm, status, issueSummaryByVmId[vm.id]) && vmSearchMatches(vm, query))
      .sort((left, right) => vmPriority(left, issueSummaryByVmId[left.id]) - vmPriority(right, issueSummaryByVmId[right.id]) || left.name.localeCompare(right.name)),
    [issueSummaryByVmId, items, query, status]
  );
  const hasActiveFilter = Boolean(query.trim()) || status !== 'all';

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    if (!openVmActionMenuId) return undefined;

    const closeMenu = () => setOpenVmActionMenuId(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };

    window.addEventListener('click', closeMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openVmActionMenuId]);

  const closeDeleteVmDialog = () => {
    setDeleteVmConfirmation('');
    setDeleteVmError(null);
    setDeleteTargetVm(null);
  };

  const handleConfirmDeleteVm = async () => {
    if (!deleteTargetVm || isDeletingVm || deleteVmConfirmation !== deleteTargetVm.name) {
      return;
    }

    setIsDeletingVm(true);
    setDeleteVmError(null);
    try {
      await onDeleteVirtualMachine(deleteTargetVm);
      closeDeleteVmDialog();
    } catch (error) {
      const message = formatControlPlaneError(error, t('virtualMachines.list.deleteVmFailed'), { area: 'virtualMachines' });
      setDeleteVmError(message);
    } finally {
      setIsDeletingVm(false);
    }
  };

  return (
    <PageShell>
      <PageHeader title={t('virtualMachines.title')} description={t('virtualMachines.list.description')} actions={
        <>
          {canManageTargets && (
            <Button onClick={onOpenRegisterVm} variant="primary" size="md" className="whitespace-nowrap">
              <ICONS.Plus className="h-4 w-4" />
              {t('virtualMachines.list.connectVm')}
            </Button>
          )}
        </>
      } />

      <div className="mb-6 flex min-w-0 w-full max-w-full flex-col gap-4">
        <ResourceCategoryTabs<VmConnectionFilter>
          categories={VM_STATUS_FILTERS}
          active={status}
          counts={catalogCounts}
          labelPrefix="virtualMachines.list"
          getLabel={(filter) => statusLabels[filter]}
          onSelect={onStatusChange}
          ariaLabel={t('virtualMachines.list.filterByState')}
          idBase="vm-catalog-filter"
          controlsId="vm-catalog-panel"
        />
      </div>

      <section id="vm-catalog-panel" role="tabpanel" tabIndex={0} aria-labelledby={`vm-catalog-filter-${status}-tab`} className="grid min-w-0 shrink-0 content-start gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25">
        <div data-vm-catalog-controls="true" className="grid min-w-0 gap-3 rounded-lg border border-ui-border bg-ui-surface px-4 py-4 shadow-sm sm:grid-cols-[minmax(16rem,1fr)_minmax(10rem,12rem)]">
          <div className="relative min-w-0">
            <label htmlFor="vm-search" className="sr-only">{t('virtualMachines.list.search')}</label>
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-text-muted" aria-hidden="true" />
            <PageSearchInput id="vm-search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={t('virtualMachines.list.search')} className="w-full pl-11 lg:w-full" />
          </div>
          <span className="flex h-11 min-h-11 items-center justify-center rounded-lg border border-ui-border bg-ui-bg/60 px-4 text-sm font-semibold text-ui-text-muted shadow-[inset_0_1px_0_rgb(var(--surface-rgb)/0.75)]">
            {t('virtualMachines.list.showingVms', { count: visibleItems.length, total: items.length })}
          </span>
        </div>

        {hasLoadError && items.length > 0 && (
          <div role="alert" className="flex flex-col gap-3 rounded-lg border border-status-danger/25 bg-status-danger-soft px-4 py-3 text-status-danger-text sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="type-row-title">{t('virtualMachines.list.loadFailedTitle')}</p>
              <p className="type-caption mt-1 text-status-danger-text/80">{t('virtualMachines.list.loadFailedBody')}</p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={onRetryLoad} className="shrink-0">
              {t('common.retry')}
            </Button>
          </div>
        )}

        {visibleItems.length > 0 ? (
          <div data-vm-card-grid="true" className="grid min-w-0 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((vm) => {
              const requiresAgentInstall = vm.status === 'unknown';
              const canDeleteVm = canManageTargets;
              const hasVmMenu = canManageTargets;
              const vmIssueSummary = issueSummaryByVmId[vm.id];

              return (
                <article
                  key={vm.id}
                  data-vm-card="true"
                  className="group relative flex min-w-0 flex-col overflow-visible rounded-lg border border-ui-border bg-ui-surface shadow-sm transition-colors hover:border-accent/25"
                >
                  <button
                    type="button"
                    onClick={() => navigate(AppPaths.workspaceVirtualMachineDetail(workspace.id, vm.id, requiresAgentInstall ? 'settings' : 'overview', catalogReturnState))}
                    className="absolute inset-0 z-0 cursor-pointer rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/25"
                    aria-label={requiresAgentInstall ? t('virtualMachines.list.installAgentFor', { name: vm.name }) : t('virtualMachines.list.openVm', { name: vm.name })}
                  />

                  <div className="pointer-events-none relative z-10 flex min-w-0 flex-col">
                    <div className="flex min-h-[4.5rem] min-w-0 items-start gap-3 px-4 py-4">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-ui-border bg-ui-bg text-accent-strong"><Server className="h-4 w-4" /></span>
                        <div className="min-w-0 flex-1">
                          <h3 className="type-panel-title truncate text-ui-text" title={vm.name}>{vm.name}</h3>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <div className="xl:hidden 2xl:block">
                          <VmStatusPill vm={vm} issueSummary={vmIssueSummary} />
                        </div>
                        {hasVmMenu && (
                          <div className="pointer-events-auto relative z-20">
                            <button
                              data-vm-overflow-action="toggle"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenVmActionMenuId((current) => current === vm.id ? null : vm.id);
                              }}
                              className={`inline-flex h-10 w-10 items-center justify-center rounded-md text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${openVmActionMenuId === vm.id ? 'bg-ui-bg text-ui-text' : ''}`}
                              aria-haspopup="menu"
                              aria-expanded={openVmActionMenuId === vm.id}
                              aria-label={t('virtualMachines.list.vmActionsFor', { name: vm.name })}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {openVmActionMenuId === vm.id && (
                              <div
                                role="menu"
                                onClick={(event) => event.stopPropagation()}
                                className="absolute right-0 top-10 w-52 overflow-hidden rounded-lg border border-ui-border bg-ui-surface p-1 text-sm shadow-xl"
                              >
                                <button
                                  data-vm-overflow-action="settings"
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setOpenVmActionMenuId(null);
                                    navigate(AppPaths.workspaceVirtualMachineDetail(workspace.id, vm.id, 'settings', catalogReturnState));
                                  }}
                                  className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-ui-text transition-colors hover:bg-ui-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
                                >
                                  <Settings className="h-4 w-4 text-ui-text-muted" />
                                  {t('virtualMachines.list.vmSettings')}
                                </button>
                                {canDeleteVm && (
                                  <button
                                    data-vm-overflow-action="delete"
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenVmActionMenuId(null);
                                      setDeleteVmConfirmation('');
                                      setDeleteVmError(null);
                                      setDeleteTargetVm(vm);
                                    }}
                                    className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-status-danger-text transition-colors hover:bg-status-danger-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-status-danger/25"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    {t('virtualMachines.list.deleteVm')}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="-mt-4 hidden pb-3 pl-16 pr-4 xl:block 2xl:hidden">
                      <VmStatusPill vm={vm} issueSummary={vmIssueSummary} />
                    </div>

                    {requiresAgentInstall ? (
                      <PendingVirtualMachineSetup vmId={vm.id} vmName={vm.name} onInstallAgent={(vmId) => navigate(AppPaths.workspaceVirtualMachineDetail(workspace.id, vmId, 'settings', catalogReturnState))} />
                    ) : (
                      <VmCardResourceChart
                        vm={vm}
                        points={getVmMetricTimeline(metricHistoryByVmId[vm.id] || [])}
                        now={now}
                        paused={vm.status === 'offline'}
                        loadState={metricLoadStateByVmId[vm.id] || 'loading'}
                      />
                    )}
                    <VmOperationalDetails vm={vm} issueCount={vmIssueSummary?.total} />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-[12rem] items-center justify-center rounded-lg border border-dashed border-ui-border bg-ui-surface px-5 py-8 text-center">
            <div className="max-w-sm">
              <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-md border border-ui-border bg-ui-bg text-ui-text-muted">
                {hasActiveFilter ? <Search className="h-4 w-4" /> : <ICONS.Server className="h-4 w-4" />}
              </div>
              <h3 className="type-row-title text-ui-text">{isLoading ? t('virtualMachines.list.loadingTitle') : hasLoadError ? t('virtualMachines.list.loadFailedTitle') : hasActiveFilter ? t('virtualMachines.list.noMatchingVms') : t('virtualMachines.list.emptyTitle')}</h3>
              <p className="type-caption mt-1.5 text-ui-text-muted">
                {isLoading ? t('virtualMachines.list.loadingBody') : hasLoadError ? t('virtualMachines.list.loadFailedBody') : hasActiveFilter ? t('virtualMachines.list.noMatchingVmsBody') : t('virtualMachines.list.emptyBody')}
              </p>
              {!isLoading && hasLoadError && (
                <Button type="button" variant="secondary" size="sm" onClick={onRetryLoad} className="mt-5">
                  {t('common.retry')}
                </Button>
              )}
              {!isLoading && !hasLoadError && !hasActiveFilter && canManageTargets && (
                <Button onClick={onOpenRegisterVm} variant="primary" size="md" className="mt-6">
                  <ICONS.Plus className="h-4 w-4" />
                  {t('virtualMachines.list.connectVm')}
                </Button>
              )}
            </div>
          </div>
        )}
      </section>
      <AnimatePresence>
        {deleteTargetVm && (
          <Dialog
            titleId="delete-vm-title"
            closeDisabled={isDeletingVm}
            className="w-full max-w-lg overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-2xl"
            onClose={closeDeleteVmDialog}
          >
            <div className="flex items-center justify-between border-b border-ui-border bg-ui-bg px-7 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-status-danger-soft text-status-danger-text">
                  <Trash2 className="h-4 w-4" />
                </span>
                <div>
                  <h3 id="delete-vm-title" className="type-row-title text-ui-text">{t('virtualMachines.list.deleteVm')}</h3>
                  <p className="mt-0.5 text-[11px] font-semibold text-ui-text-muted">{t('virtualMachines.list.deleteVmSubtitle')}</p>
                </div>
              </div>
              <CloseButton
                type="button"
                onClick={closeDeleteVmDialog}
                disabled={isDeletingVm}
                aria-label={t('virtualMachines.list.closeDeleteVm')}
              />
            </div>
            <div className="space-y-4 px-7 py-6">
              <p className="text-sm leading-6 text-ui-text-muted">
                {t('virtualMachines.list.deleteVmBody', { name: deleteTargetVm.name })}
              </p>
              <p className="type-caption rounded-lg border border-status-warning/25 bg-status-warning-soft px-4 py-3 text-status-warning-text">
                {t('virtualMachines.list.deleteVmAgentWarning')}
              </p>
              <div>
                <label
                  htmlFor="delete-vm-confirmation-input"
                  className="mb-1.5 block px-1 text-xs font-bold text-ui-text-muted"
                >
                  <Trans
                    i18nKey="virtualMachines.list.deleteVmConfirmationLabel"
                    values={{ name: deleteTargetVm.name }}
                    components={{ name: <span className="font-extrabold text-status-danger-text" /> }}
                  />
                </label>
                <TextInput
                  id="delete-vm-confirmation-input"
                  value={deleteVmConfirmation}
                  onChange={(event) => setDeleteVmConfirmation(event.target.value)}
                  disabled={isDeletingVm}
                  autoComplete="off"
                  spellCheck={false}
                  className="px-4 focus:border-status-danger/45 focus:ring-status-danger/20"
                />
              </div>
              {deleteVmError && (
                <div className="type-caption rounded-lg border border-status-danger/25 bg-status-danger-soft px-3 py-2 text-status-danger-text">
                  {deleteVmError}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-ui-border bg-ui-bg px-7 py-5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={closeDeleteVmDialog}
                disabled={isDeletingVm}
              >
                {t('app.cancel')}
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => void handleConfirmDeleteVm()}
                disabled={isDeletingVm || deleteVmConfirmation !== deleteTargetVm.name}
              >
                {isDeletingVm ? t('dashboard.deleting') : t('dashboard.delete')}
              </Button>
            </div>
          </Dialog>
        )}
      </AnimatePresence>
    </PageShell>
  );
};
