import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trans, useTranslation } from 'react-i18next';
import { MoreHorizontal, Server, Settings, Trash2 } from 'lucide-react';
import { ICONS } from '@/constants';
import { Button } from '@/components/common/Button';
import { CloseButton, TextInput } from '@/components/common/ComponentVocabulary';
import { PageSearchInput } from '@/components/common/PageSearchInput';
import { Select, SelectOption } from '@/components/common/Select';
import { actionCardButtonClassName, cardClassName } from '@/components/common/Card';
import { Dialog } from '@/components/common/Dialog';
import { headerMotion } from '@/lib/motion';
import { AppPaths } from '@/utils/routes';
import type { NavigateOptions } from '@/hooks/useAppRouter';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import type { ControlPlaneVirtualMachine, ControlPlaneVirtualMachineMetricHistoryPoint } from '@/services/controlPlaneApi';
import type { Workspace } from '@/types';
import { getVmMetricTimeline, VmCardResourceChart } from '@/pages/virtual-machines/VirtualMachineMetrics';
import { PendingVirtualMachineSetup } from '@/pages/virtual-machines/PendingVirtualMachineSetup';
import {
  getVmPostureClass,
  getVmStatusLabel,
  statusTone,
  type VmConnectionFilter
} from '@/pages/virtual-machines/virtualMachineUi';

interface VirtualMachinesListViewProps {
  workspace: Workspace;
  items: ControlPlaneVirtualMachine[];
  isLoading: boolean;
  query: string;
  status: VmConnectionFilter;
  metricHistoryByVmId: Record<string, ControlPlaneVirtualMachineMetricHistoryPoint[]>;
  canManageTargets: boolean;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: VmConnectionFilter) => void;
  onOpenRegisterVm: () => void;
  onDeleteVirtualMachine: (vm: ControlPlaneVirtualMachine) => Promise<void> | void;
  navigate: (path: string, options?: NavigateOptions) => void;
}

export const VirtualMachinesListView: React.FC<VirtualMachinesListViewProps> = ({
  workspace,
  items,
  isLoading,
  query,
  status,
  metricHistoryByVmId,
  canManageTargets,
  onQueryChange,
  onStatusChange,
  onOpenRegisterVm,
  onDeleteVirtualMachine,
  navigate
}) => {
  const { t } = useTranslation();
  const [deleteTargetVm, setDeleteTargetVm] = React.useState<ControlPlaneVirtualMachine | null>(null);
  const [deleteVmConfirmation, setDeleteVmConfirmation] = React.useState('');
  const [deleteVmError, setDeleteVmError] = React.useState<string | null>(null);
  const [isDeletingVm, setIsDeletingVm] = React.useState(false);
  const [openVmActionMenuId, setOpenVmActionMenuId] = React.useState<string | null>(null);
  const statusOptions: Array<SelectOption<typeof status>> = [
    { value: 'all', label: t('dashboard.allStates') },
    { value: 'connected', label: t('dashboard.connected') },
    { value: 'disconnected', label: t('dashboard.disconnected') },
    { value: 'not_installed', label: t('dashboard.notInstalled') }
  ];
  const onlineCount = items.filter((vm) => vm.status === 'online').length;
  const attentionCount = items.filter((vm) => vm.status === 'degraded' || vm.status === 'offline').length;
  const setupRequiredCount = items.filter((vm) => vm.status === 'unknown').length;

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
    <section className="min-h-0 flex-1 overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
      <div className="flex flex-col gap-8">
        <motion.header {...headerMotion} className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="type-route-title">{t('virtualMachines.title')}</h1>
            <p className="type-body mt-2 max-w-md">
              {t('virtualMachines.list.description')}
            </p>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-3 lg:w-auto lg:max-w-2xl lg:flex-row lg:items-center lg:justify-end">
            <label htmlFor="vm-search" className="sr-only">{t('virtualMachines.list.search')}</label>
            <PageSearchInput
              id="vm-search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={t('virtualMachines.list.search')}
            />
            <Select<typeof status>
              value={status}
              options={statusOptions}
              onChange={onStatusChange}
              className="min-w-44"
              ariaLabel={t('virtualMachines.list.filterByState')}
            />
            {canManageTargets && (
              <Button onClick={onOpenRegisterVm} variant="secondary" size="md" className="whitespace-nowrap">
                <ICONS.Plus className="h-4 w-4" />
                {t('virtualMachines.list.connectVm')}
              </Button>
            )}
          </div>
        </motion.header>

        <section className={cardClassName({ className: 'overflow-hidden' })}>
          <div className={`grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(26rem,0.7fr)] lg:items-center ${getVmPostureClass(attentionCount)}`}>
            <div className="flex min-w-0 items-start gap-4">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-current/15 bg-ui-surface/70">
                <Server className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="type-row-title">
                  {t('virtualMachines.list.fleetStatus', { status: attentionCount > 0 ? t('dashboard.attention') : t('dashboard.optimal') })}
                </p>
                <p className="mt-1 text-sm leading-6 text-ui-text-muted">
                  {attentionCount > 0
                    ? t('virtualMachines.list.needReview', { count: attentionCount })
                    : setupRequiredCount > 0
                      ? t('virtualMachines.list.setupRequiredSummary', { count: setupRequiredCount })
                      : t('virtualMachines.list.loadedTelemetry', { online: onlineCount, total: items.length })}
                </p>
              </div>
            </div>
            <dl className="grid overflow-hidden rounded-md border border-current/10 bg-ui-surface/70 sm:grid-cols-3 lg:min-w-[26rem]">
              <div className="border-b border-ui-border/70 px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r">
                <dt className="type-caption">{t('virtualMachines.title')}</dt>
                <dd className="type-data mt-1">{items.length}</dd>
              </div>
              <div className="border-b border-ui-border/70 px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r">
                <dt className="type-caption">{t('dashboard.attention')}</dt>
                <dd className={`type-data mt-1 ${attentionCount > 0 ? 'text-status-warning-text' : 'text-status-success-text'}`}>
                  {attentionCount}
                </dd>
              </div>
              <div className="px-4 py-3">
                <dt className="type-caption">{t('virtualMachines.list.active')}</dt>
                <dd className="type-data mt-1 text-metric-blue">{onlineCount}/{items.length}</dd>
              </div>
            </dl>
          </div>
        </section>

        {items.length > 0 ? (
          <section data-vm-card-grid="true" className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {items.map((vm) => {
              const requiresAgentInstall = vm.status === 'unknown';
              const canDeleteVm = canManageTargets;
              const hasVmMenu = canManageTargets;

              return (
                <article
                  key={vm.id}
                  data-vm-card="true"
                  className={cardClassName({
                    interactive: !requiresAgentInstall,
                    className: 'group relative flex h-[20rem] min-w-0 flex-col overflow-hidden'
                  })}
                >
                  {!requiresAgentInstall && (
                    <button
                      type="button"
                      onClick={() => navigate(AppPaths.workspaceVirtualMachineDetail(workspace.id, vm.id, 'overview'))}
                      className="absolute inset-0 z-0 cursor-pointer rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/30"
                      aria-label={t('virtualMachines.list.openVm', { name: vm.name })}
                    />
                  )}

                  {hasVmMenu && (
                    <div className="absolute right-3 top-3 z-20 pointer-events-auto">
                      <button
                        data-vm-overflow-action="toggle"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenVmActionMenuId((current) => current === vm.id ? null : vm.id);
                        }}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-transparent bg-transparent text-ui-text-muted transition-colors hover:border-ui-border hover:bg-ui-surface hover:text-ui-text active:bg-ui-bg/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
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
                              navigate(AppPaths.workspaceVirtualMachineDetail(workspace.id, vm.id, 'settings'));
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

                  <div className="relative z-10 flex flex-1 flex-col pointer-events-none">
                    <div className="flex min-h-0 flex-1 flex-col gap-5 px-4 pb-6 pt-4 sm:px-5 sm:pb-7">
                      <div className="min-w-0 text-left">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-ui-border bg-ui-bg">
                            <Server className="h-5 w-5 text-accent-strong" />
                          </div>
                          <div className="min-w-0 flex-1 pr-14">
                            <div className="flex min-w-0 items-center gap-2">
                              <h3 className="type-panel-title min-w-0 flex-1 truncate" title={vm.name}>{vm.name}</h3>
                              <span className={`type-micro-label shrink-0 rounded-full px-1.5 py-px text-[0.625rem] leading-3 ${statusTone(vm.status)}`}>
                                {getVmStatusLabel(vm.status, t)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {requiresAgentInstall && (
                        <PendingVirtualMachineSetup
                          vmId={vm.id}
                          onInstallAgent={(vmId) => navigate(AppPaths.workspaceVirtualMachineDetail(workspace.id, vmId, 'settings'))}
                        />
                      )}

                      {!requiresAgentInstall && (
                        <div className="flex min-h-0 flex-1 flex-col">
                          {vm.status === 'online' ? (
                            <VmCardResourceChart vm={vm} points={getVmMetricTimeline(metricHistoryByVmId[vm.id] || [])} />
                          ) : (
                            <div className="type-caption flex min-h-[118px] items-center border-y border-status-warning/25 bg-status-warning-soft px-4 py-3 text-status-warning-text">
                              {t('virtualMachines.list.telemetryUnavailable')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
            {canManageTargets && (
              <button
                data-vm-add-card="true"
                type="button"
                onClick={onOpenRegisterVm}
                className={actionCardButtonClassName({ className: 'h-[20rem] flex-col' })}
              >
                <ICONS.Plus className="h-4 w-4" />
                {t('virtualMachines.list.connectVm')}
              </button>
            )}
          </section>
        ) : (
          <section className={cardClassName({ className: 'flex flex-col items-center justify-center px-6 py-12 text-center' })}>
            <div className="mb-4 rounded-lg border border-ui-border bg-ui-bg p-4 text-ui-text-muted">
              <ICONS.Server className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-ui-text">{isLoading ? t('virtualMachines.list.loadingTitle') : t('virtualMachines.list.emptyTitle')}</h3>
            <p className="mt-2 max-w-sm text-sm text-ui-text-muted">
              {isLoading ? t('virtualMachines.list.loadingBody') : t('virtualMachines.list.emptyBody')}
            </p>
            {!isLoading && canManageTargets && (
              <Button onClick={onOpenRegisterVm} variant="accent" size="md" className="mt-6">
                <ICONS.Plus className="h-4 w-4" />
                {t('virtualMachines.list.connectVm')}
              </Button>
            )}
          </section>
        )}
      </div>
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
    </section>
  );
};
