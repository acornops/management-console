import React from 'react';
import { useTranslation } from 'react-i18next';
import { ICONS } from '@/constants';
import { Button, StatusBadge } from '@acornops/ui';
import { PageHeader, PageShell } from '@acornops/ui';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import {
  controlPlaneApi,
  ControlPlaneVirtualMachine,
  type ControlPlaneIssueItem,
  type ControlPlaneTargetIssueSummary,
  type ControlPlaneVirtualMachineMetricHistoryPoint
} from '@/services/controlPlaneApi';
import type { NavigateOptions } from '@/hooks/useAppRouter';
import { AppPaths, AppRoute, getCurrentAppPath, type VmCatalogReturnState, VmSubview } from '@/utils/routes';
import { Workspace } from '@/types';
import {
  formatSnapshotTime,
  getVmStatusLabel,
  type VmConnectionFilter
} from '@/pages/virtual-machines/virtualMachineUi';
import {
  type VmMetricLoadState
} from '@/pages/virtual-machines/VirtualMachineMetrics';
import { VirtualMachineTelemetryPanel } from '@/pages/virtual-machines/VirtualMachineTelemetryPanel';
import { AddVirtualMachineModal } from '@/pages/virtual-machines/AddVirtualMachineModal';
import { VirtualMachineAdminView } from '@/pages/virtual-machines/VirtualMachineAdminView';
import { VirtualMachineChatView } from '@/pages/virtual-machines/VirtualMachineChatView';
import { VirtualMachineIssuesPanel } from '@/pages/virtual-machines/VirtualMachineIssuesPanel';
import { VirtualMachinesListView } from '@/pages/virtual-machines/VirtualMachinesListView';
import { VirtualMachineResourcesView, VmResourceCategory } from '@/pages/virtual-machines/VirtualMachineResourcesView';
import { VirtualMachineSettingsView } from '@/pages/virtual-machines/VirtualMachineSettingsView';
import { useVirtualMachineListRefresh } from '@/pages/virtual-machines/useVirtualMachineListRefresh';
import { useVirtualMachineIssueSummaries } from '@/pages/virtual-machines/useVirtualMachineIssueSummaries';
import { useVirtualMachineAgentSetup } from '@/pages/virtual-machines/useVirtualMachineAgentSetup';
import { getSelectedVmTargetPrompt, shouldClearPendingVmTargetPrompt } from '@/pages/virtual-machines/virtualMachineTargetPrompt';
import type { PendingVmTargetPrompt } from '@/pages/target-prompts/targetPromptModel';
import { useVisibilityAwareRefresh } from '@/hooks/useVisibilityAwareRefresh';
import { hasSessionDataCacheValue, useSessionCachedState } from '@/hooks/sessionDataCache';
import { useCapabilityCatalogCache } from '@/features/targets/admin/useCapabilityCatalogCache';

interface VirtualMachinesPageProps {
  workspace: Workspace;
  currentUserId: string;
  route: Extract<AppRoute, { kind: 'workspaceVirtualMachines' | 'workspaceVirtualMachineDetail' }>;
  activeSubview: VmSubview;
  virtualMachines: ControlPlaneVirtualMachine[];
  hasLoadedWorkspaceVirtualMachines: boolean;
  isDark: boolean;
  canManageTargets: boolean;
  canManageAgentKeys: boolean;
  canCreateReadWriteRuns: boolean;
  navigate: (path: string, options?: NavigateOptions) => void;
  onUpdateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => void;
  onReplaceWorkspaceVirtualMachines: (workspaceId: string, nextVirtualMachines: ControlPlaneVirtualMachine[]) => void;
  onUpsertWorkspaceVirtualMachine: (workspaceId: string, virtualMachine: ControlPlaneVirtualMachine) => void;
  onRemoveWorkspaceVirtualMachine: (workspaceId: string, virtualMachineId: string) => void;
  pendingTargetPrompt?: PendingVmTargetPrompt | null;
  issueSummary?: ControlPlaneTargetIssueSummary | null;
  onPendingTargetPromptConsumed?: () => void;
}

function isVmResourceSubview(view: VmSubview): view is 'resources' | 'services' | 'processes' | 'network' | 'logs' {
  return view === 'resources' || view === 'services' || view === 'processes' || view === 'network' || view === 'logs';
}

function vmSubviewToResourceCategory(view: VmSubview): VmResourceCategory {
  if (view === 'services' || view === 'processes' || view === 'network' || view === 'logs') return view;
  return 'all';
}

export const VirtualMachinesPage: React.FC<VirtualMachinesPageProps> = ({
  workspace,
  currentUserId,
  route,
  activeSubview,
  virtualMachines,
  hasLoadedWorkspaceVirtualMachines,
  isDark,
  canManageTargets,
  canManageAgentKeys,
  canCreateReadWriteRuns,
  navigate,
  onUpdateWorkspace,
  onReplaceWorkspaceVirtualMachines,
  onUpsertWorkspaceVirtualMachine,
  onRemoveWorkspaceVirtualMachine,
  pendingTargetPrompt,
  issueSummary,
  onPendingTargetPromptConsumed
}) => {
  const { t } = useTranslation();
  const selectedId = route.kind === 'workspaceVirtualMachineDetail' ? route.vmId : null;
  const vmDetailCachePrefix = `workspace:${workspace.id}:virtual-machine:${selectedId || 'none'}:`;
  const inventoryCacheKey = `${vmDetailCachePrefix}inventory`;
  const issueCacheKey = `${vmDetailCachePrefix}issues`;
  const logsCacheKey = `${vmDetailCachePrefix}logs`;
  const metricHistoryCacheKey = `${vmDetailCachePrefix}metric-history`;
  const [inventory, setInventory] = useSessionCachedState<Record<string, unknown>[]>(inventoryCacheKey, []);
  const [issues, setIssues] = useSessionCachedState<ControlPlaneIssueItem[] | null>(issueCacheKey, null);
  const [isLoadingIssueEvidence, setIsLoadingIssueEvidence] = React.useState(false);
  const [issueLoadFailed, setIssueLoadFailed] = React.useState(false);
  const [logs, setLogs] = useSessionCachedState<Record<string, unknown>[]>(logsCacheKey, []);
  const [resourceStatus, setResourceStatus] = React.useState<'idle' | 'loading' | 'ready' | 'error'>(() => hasSessionDataCacheValue(inventoryCacheKey) ? 'ready' : 'idle');
  const [resourceError, setResourceError] = React.useState<string | null>(null);
  const [logsStatus, setLogsStatus] = React.useState<'idle' | 'loading' | 'ready' | 'error'>(() => hasSessionDataCacheValue(logsCacheKey) ? 'ready' : 'idle');
  const [logsError, setLogsError] = React.useState<string | null>(null);
  const [metricHistory, setMetricHistory] = useSessionCachedState<ControlPlaneVirtualMachineMetricHistoryPoint[]>(metricHistoryCacheKey, []);
  const [metricHistoryByVmId, setMetricHistoryByVmId] = useSessionCachedState<Record<string, ControlPlaneVirtualMachineMetricHistoryPoint[]>>(`workspace:${workspace.id}:virtual-machine-card-metrics`, {});
  const [metricLoadStateByVmId, setMetricLoadStateByVmId] = useSessionCachedState<Record<string, VmMetricLoadState>>(`workspace:${workspace.id}:virtual-machine-card-metric-states`, {});
  const [metricHistoryStatus, setMetricHistoryStatus] = React.useState<'idle' | 'loading' | 'ready' | 'error'>(() => hasSessionDataCacheValue(metricHistoryCacheKey) ? 'ready' : 'idle');
  const [pendingChatPrompt, setPendingChatPrompt] = React.useState('');
  const [resourceCategory, setResourceCategory] = React.useState<VmResourceCategory>('all');
  const activeCatalogState = route.kind === 'workspaceVirtualMachines' ? route : route.catalogState;
  const query = activeCatalogState?.q ?? '';
  const status: VmConnectionFilter = activeCatalogState?.status ?? 'all';
  const catalogReturnState: VmCatalogReturnState = {
    q: query || undefined,
    status: status === 'all' ? undefined : status
  };
  const metricHistoryRequestSeqRef = React.useRef(0);
  const view = route.kind === 'workspaceVirtualMachineDetail' ? activeSubview : 'overview';
  const selected = selectedId ? virtualMachines.find((item) => item.id === selectedId) || null : null;
  const selectedTargetId = selected?.id || null;
  const capabilityCatalogCache = useCapabilityCatalogCache(selectedId ? `${workspace.id}:${selectedId}` : '');
  const refreshVisibleVmIssues = React.useCallback(async () => {
    if (!selectedTargetId || view !== 'overview') return;
    try {
      const page = await controlPlaneApi.listTargetIssues(workspace.id, selectedTargetId, { limit: 50 });
      setIssues(page.items || []);
      setIssueLoadFailed(false);
    } catch (error) {
      console.error('Failed refreshing virtual machine issues', error);
    }
  }, [selectedTargetId, view, workspace.id]);
  useVisibilityAwareRefresh(refreshVisibleVmIssues, { enabled: Boolean(selectedTargetId && view === 'overview') });
  const selectedTargetPrompt = getSelectedVmTargetPrompt(pendingTargetPrompt, workspace.id, selectedId);
  const activeResourceCategory = isVmResourceSubview(view)
    ? vmSubviewToResourceCategory(view)
    : resourceCategory;
  const catalogMetricVms = React.useMemo(
    () => route.kind === 'workspaceVirtualMachines'
      ? virtualMachines.filter((vm) => vm.status !== 'unknown')
      : [],
    [route.kind, virtualMachines]
  );
  const { isLoading, loadError, reload: reloadVirtualMachines } = useVirtualMachineListRefresh({
    workspaceId: workspace.id,
    virtualMachines,
    hasLoadedWorkspaceVirtualMachines,
    onReplaceWorkspaceVirtualMachines
  });
  const { issueSummaryByVmId, issueSummaryLoadStateByVmId } = useVirtualMachineIssueSummaries(catalogMetricVms);

  const updateCatalogState = React.useCallback((patch: Partial<VmCatalogReturnState>) => {
    if (route.kind !== 'workspaceVirtualMachines') return;
    const nextState: VmCatalogReturnState = {
      q: query || undefined,
      status: status === 'all' ? undefined : status,
      ...patch
    };
    navigate(AppPaths.workspaceVirtualMachines(workspace.id, {
      q: nextState.q?.trim() || undefined,
      status: nextState.status && nextState.status !== 'all' ? nextState.status : undefined
    }), { replace: true });
  }, [navigate, query, route.kind, status, workspace.id]);

  const vmDetailPath = React.useCallback((vmId: string, tab?: VmSubview) =>
    AppPaths.workspaceVirtualMachineDetail(workspace.id, vmId, tab, catalogReturnState),
  [catalogReturnState.q, catalogReturnState.status, workspace.id]);

  const refreshWorkspaceSummary = React.useCallback(async () => {
    const refreshed = await controlPlaneApi.getWorkspace(workspace.id);
    const { clusterIds: _clusterIds, members: _members, ...updates } = refreshed;
    onUpdateWorkspace(workspace.id, updates);
  }, [onUpdateWorkspace, workspace.id]);
  const {
    credentialReplacementError, confirmVmInstalled, installInstructions, isAddingVm, isRegisteringVm,
    isReplacingCredential, isGeneratingRepairInstructions, newVmName, openAddVmModal, registerVm,
    resetVmCreationState, replaceCredential, generateRepairInstructions, regenerateEnrollment, generateInitialEnrollment,
    setNewVmName, vmCreationError, vmCreationStep
  } = useVirtualMachineAgentSetup({
    workspaceId: workspace.id,
    canManageTargets,
    canManageAgentKeys,
    refreshWorkspaceSummary,
    onUpsertVirtualMachine: (virtualMachine) => onUpsertWorkspaceVirtualMachine(workspace.id, virtualMachine),
    t
  });
  const shouldOpenConnectDialog = route.kind === 'workspaceVirtualMachines' && route.connect;
  React.useEffect(() => {
    if (!shouldOpenConnectDialog) return;
    openAddVmModal();
    navigate(AppPaths.workspaceVirtualMachines(workspace.id, catalogReturnState), { replace: true });
  }, [catalogReturnState.q, catalogReturnState.status, navigate, openAddVmModal, shouldOpenConnectDialog, workspace.id]);
  const isRegisteredVmAgentConnected = Boolean(
    installInstructions?.vmId &&
    virtualMachines.some((virtualMachine) =>
      virtualMachine.id === installInstructions.vmId && virtualMachine.status !== 'unknown'
    )
  );

  React.useEffect(() => {
    if (!selectedId || selected || isLoading) return;
    let cancelled = false;
    void controlPlaneApi.getVirtualMachine(workspace.id, selectedId)
      .then((vm) => {
        if (cancelled) return;
        onUpsertWorkspaceVirtualMachine(workspace.id, vm);
      })
      .catch((error) => {
        console.error('Failed loading virtual machine detail', error);
        if (cancelled) return;
        if (pendingTargetPrompt?.workspaceId === workspace.id && pendingTargetPrompt.targetId === selectedId) {
          onPendingTargetPromptConsumed?.();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    isLoading,
    onPendingTargetPromptConsumed,
    onUpsertWorkspaceVirtualMachine,
    pendingTargetPrompt,
    selected,
    selectedId,
    workspace.id
  ]);

  React.useEffect(() => {
    if (shouldClearPendingVmTargetPrompt(pendingTargetPrompt, workspace.id, selectedId, view)) {
      onPendingTargetPromptConsumed?.();
    }
  }, [onPendingTargetPromptConsumed, pendingTargetPrompt, selectedId, view, workspace.id]);

  const loadVmInventory = React.useCallback(async (vmId: string) => {
    if (!hasSessionDataCacheValue(inventoryCacheKey)) setResourceStatus('loading');
    setResourceError(null);
    try {
      const page = await controlPlaneApi.listVirtualMachineInventory(workspace.id, vmId);
      setInventory(page.items || []);
      setResourceStatus('ready');
    } catch (error) {
      console.error('Failed loading virtual machine inventory', error);
      setResourceError(formatControlPlaneError(error, t('virtualMachines.resources.loadFailed'), { area: 'virtualMachines' }));
      setResourceStatus(hasSessionDataCacheValue(inventoryCacheKey) ? 'ready' : 'error');
    }
  }, [inventoryCacheKey, t, workspace.id]);
  const loadVmLogs = React.useCallback(async (vmId: string) => {
    if (!hasSessionDataCacheValue(logsCacheKey)) setLogsStatus('loading');
    setLogsError(null);
    try {
      const payload = await controlPlaneApi.getVirtualMachineLogs(workspace.id, vmId);
      setLogs(payload.entries || []);
      setLogsStatus('ready');
    } catch (error) {
      console.error('Failed loading virtual machine logs', error);
      setLogsError(formatControlPlaneError(error, t('virtualMachines.resources.logsLoadFailed'), { area: 'virtualMachines' }));
      setLogsStatus(hasSessionDataCacheValue(logsCacheKey) ? 'ready' : 'error');
    }
  }, [logsCacheKey, t, workspace.id]);

  React.useEffect(() => {
    if (!selectedTargetId) {
      setIssues(null);
      setIsLoadingIssueEvidence(false);
      setIssueLoadFailed(false);
      return;
    }
    if (isVmResourceSubview(view)) {
      void loadVmInventory(selectedTargetId);
      if (view === 'logs') {
        void loadVmLogs(selectedTargetId);
      }
    }
    if (view === 'overview') {
      let isCurrent = true;
      setIssueLoadFailed(false);
      setIsLoadingIssueEvidence(!hasSessionDataCacheValue(issueCacheKey));
      void controlPlaneApi.listTargetIssues(workspace.id, selectedTargetId, { limit: 50 })
        .then((page) => {
          if (!isCurrent) return;
          setIssues(page.items || []);
        })
        .catch((error) => {
          console.error('Failed loading virtual machine issues', error);
          if (!isCurrent) return;
          setIssueLoadFailed(true);
        })
        .finally(() => {
          if (!isCurrent) return;
          setIsLoadingIssueEvidence(false);
        });
      if (!hasSessionDataCacheValue(metricHistoryCacheKey)) setMetricHistoryStatus('loading');
      void controlPlaneApi.getVirtualMachineMetricsHistory(workspace.id, selectedTargetId)
        .then((payload) => {
          if (!isCurrent) return;
          setMetricHistory(payload.points || []);
          setMetricHistoryStatus('ready');
        })
        .catch((error) => {
          console.error('Failed loading virtual machine metric history', error);
          if (!isCurrent) return;
          setMetricHistoryStatus(hasSessionDataCacheValue(metricHistoryCacheKey) ? 'ready' : 'error');
        });
      return () => {
        isCurrent = false;
      };
    }
    setIsLoadingIssueEvidence(false);
    setIssueLoadFailed(false);
  }, [
    issueCacheKey,
    loadVmInventory,
    loadVmLogs,
    selectedTargetId,
    view,
    metricHistoryCacheKey,
    workspace.id
  ]);

  React.useEffect(() => {
    if (isVmResourceSubview(view)) {
      setResourceCategory(vmSubviewToResourceCategory(view));
    }
  }, [view]);

  React.useEffect(() => {
    if (route.kind !== 'workspaceVirtualMachines') return undefined;
    const visibleVmIds = new Set(catalogMetricVms.map((vm) => vm.id));
    setMetricHistoryByVmId((prev) => Object.fromEntries(
      Object.entries(prev).filter(([vmId]) => visibleVmIds.has(vmId))
    ));
    setMetricLoadStateByVmId((prev) => Object.fromEntries(
      catalogMetricVms.map((vm) => [vm.id, prev[vm.id] === 'ready' ? 'ready' : 'loading'])
    ));

    if (catalogMetricVms.length === 0) return undefined;

    let isCurrent = true;
    const requestId = ++metricHistoryRequestSeqRef.current;
    const entries: Array<readonly [string, ControlPlaneVirtualMachineMetricHistoryPoint[]]> = [];
    const failedVmIds = new Set<string>();
    let nextVmIndex = 0;
    const loadNextMetricHistory = async () => {
      while (isCurrent && nextVmIndex < catalogMetricVms.length) {
        const vm = catalogMetricVms[nextVmIndex];
        nextVmIndex += 1;
        if (!vm) continue;
        try {
          const payload = await controlPlaneApi.getVirtualMachineMetricsHistory(workspace.id, vm.id);
          entries.push([vm.id, payload.points || []] as const);
        } catch (error) {
          console.error('Failed loading VM card metric history', error);
          failedVmIds.add(vm.id);
        }
      }
    };
    const workerCount = Math.min(6, catalogMetricVms.length);
    void Promise.all(Array.from({ length: workerCount }, () => loadNextMetricHistory())).then(() => {
      if (!isCurrent || requestId !== metricHistoryRequestSeqRef.current) return;
      setMetricHistoryByVmId((prev) => {
        const visibleOnly = Object.fromEntries(
          Object.entries(prev).filter(([vmId]) => visibleVmIds.has(vmId))
        );
        return { ...visibleOnly, ...Object.fromEntries(entries) };
      });
      setMetricLoadStateByVmId(Object.fromEntries(
        catalogMetricVms.map((vm) => [vm.id, failedVmIds.has(vm.id) ? 'error' : 'ready'])
      ));
    });

    return () => {
      isCurrent = false;
    };
  }, [catalogMetricVms, route.kind, workspace.id]);

  const deleteVirtualMachine = React.useCallback(async (vm: ControlPlaneVirtualMachine) => {
    await controlPlaneApi.deleteVirtualMachine(workspace.id, vm.id);
    onRemoveWorkspaceVirtualMachine(workspace.id, vm.id);
    await refreshWorkspaceSummary();
    setMetricHistoryByVmId((current) => {
      const remaining = { ...current };
      delete remaining[vm.id];
      return remaining;
    });
    if (route.kind === 'workspaceVirtualMachineDetail' && route.vmId === vm.id) {
      navigate(AppPaths.workspaceVirtualMachines(workspace.id, catalogReturnState));
    }
  }, [catalogReturnState, navigate, onRemoveWorkspaceVirtualMachine, refreshWorkspaceSummary, route, workspace.id]);

  const selectResourceCategory = React.useCallback((category: VmResourceCategory) => {
    if (!selected) return;
    setResourceCategory(category);
    const tab: VmSubview = category === 'all' ? 'resources' : category;
    navigate(vmDetailPath(selected.id, tab));
  }, [navigate, selected, vmDetailPath]);
  const openVmIssueTriage = React.useCallback((issue: ControlPlaneIssueItem) => {
    if (!selected) return;
    const prompt = t('virtualMachines.overview.triageIssuePrompt', {
      title: issue.title,
      severity: issue.severity,
      source: issue.objectName || issue.objectKind || issue.reason || t('virtualMachines.overview.hostSource'),
      message: issue.summary
    });
    setPendingChatPrompt(prompt);
    navigate(vmDetailPath(selected.id, 'chat'));
  }, [navigate, selected, t, vmDetailPath]);
  const retryVmMetricHistory = React.useCallback(async () => {
    if (!selectedTargetId) return;
    setMetricHistoryStatus('loading');
    try {
      const payload = await controlPlaneApi.getVirtualMachineMetricsHistory(workspace.id, selectedTargetId);
      setMetricHistory(payload.points || []);
      setMetricHistoryStatus('ready');
    } catch (error) {
      console.error('Failed reloading virtual machine metric history', error);
      setMetricHistoryStatus(metricHistory.length > 0 ? 'ready' : 'error');
    }
  }, [metricHistory.length, selectedTargetId, workspace.id]);
  if (route.kind === 'workspaceVirtualMachines') {
    return (
      <>
        <VirtualMachinesListView
          workspace={workspace}
          items={virtualMachines}
          isLoading={isLoading}
          hasLoadError={Boolean(loadError)}
          query={query}
          status={status}
          catalogReturnState={catalogReturnState}
          metricHistoryByVmId={metricHistoryByVmId}
          metricLoadStateByVmId={metricLoadStateByVmId}
          issueSummaryByVmId={issueSummaryByVmId}
          issueSummaryLoadStateByVmId={issueSummaryLoadStateByVmId}
          canManageTargets={canManageTargets}
          canManageAgentKeys={canManageAgentKeys}
          onQueryChange={(nextQuery) => updateCatalogState({ q: nextQuery || undefined })}
          onStatusChange={(nextStatus) => updateCatalogState({ status: nextStatus === 'all' ? undefined : nextStatus })}
          onClearFilters={() => updateCatalogState({ q: undefined, status: undefined })}
          onOpenRegisterVm={openAddVmModal}
          onRetryLoad={() => void reloadVirtualMachines()}
          onDeleteVirtualMachine={deleteVirtualMachine}
          navigate={navigate}
        />
        <AddVirtualMachineModal
          isOpen={isAddingVm}
          creationStep={vmCreationStep}
          vmName={newVmName}
          installInstructions={installInstructions?.value || null}
          isAgentConnected={isRegisteredVmAgentConnected}
          isRegistering={isRegisteringVm}
          errorMessage={vmCreationError}
          onClose={resetVmCreationState}
          onVmNameChange={setNewVmName}
          onProceedToInstructions={registerVm}
          onConfirmInstalled={() => void confirmVmInstalled()}
          onRegenerateEnrollment={() => void regenerateEnrollment()}
        />
      </>
    );
  }

  if (isLoading && !selected) {
    return <div className="flex h-full items-center justify-center bg-ui-bg type-body type-emphasis text-ui-text-muted">{t('virtualMachines.loadingDetail')}</div>;
  }

  if (!selected) {
    return (
      <div className="flex h-full items-center justify-center bg-ui-bg px-6">
        <div className="max-w-xl text-center">
          <ICONS.Server className="mx-auto h-10 w-10 text-ui-text-muted" />
          <h2 className="mt-4 type-data">{t('virtualMachines.notFoundTitle')}</h2>
          <p className="mt-2 type-body text-ui-text-muted">{t('virtualMachines.notFoundBody')}</p>
          <Button variant="secondary" onClick={() => navigate(AppPaths.workspaceVirtualMachines(workspace.id, catalogReturnState))} className="mt-5">
            <ICONS.ChevronLeft className="h-4 w-4" />
            {t('virtualMachines.backToList')}
          </Button>
        </div>
      </div>
    );
  }

  if (view === 'mcpServers' || view === 'tools' || view === 'skills') {
    return (
      <VirtualMachineAdminView view={view} virtualMachine={selected} workspace={workspace} {...capabilityCatalogCache} />
    );
  }

  if (view === 'overview') {
    return (
      <PageShell>
        <PageHeader title={t('virtualMachines.overview.title')} description={t('virtualMachines.overview.latestTelemetryFor', { name: selected.name })} actions={
          <div className="flex min-h-11 w-fit items-center gap-2 rounded-md border border-ui-border bg-ui-surface px-4 py-2 shadow-sm">
            <StatusBadge tone={selected.status === 'online' ? 'success' : selected.status === 'degraded' ? 'warning' : 'danger'}>
              {getVmStatusLabel(selected.status, t)}
            </StatusBadge>
            <span className="type-caption text-ui-text-muted">{formatSnapshotTime(selected)}</span>
          </div>
        } />

        <VirtualMachineIssuesPanel
          workspaceId={workspace.id}
          issues={issues}
          issueSummary={issueSummary || null}
          isLoading={isLoadingIssueEvidence}
          issueLoadFailed={issueLoadFailed}
          onOpenIssueTriage={openVmIssueTriage}
        />

        <VirtualMachineTelemetryPanel metricHistory={metricHistory} status={metricHistoryStatus} onRetry={retryVmMetricHistory} />

        <div className="mb-12 grid w-full grid-cols-1 gap-6 lg:grid-cols-3">
          {[
            [t('virtualMachines.settings.osFamily'), selected.osFamily],
            [t('virtualMachines.settings.serviceManager'), selected.serviceManager],
            [t('virtualMachines.settings.allowedLogs'), selected.allowedLogSources?.join(', ') || t('virtualMachines.settings.defaultAllowedLogs')]
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-ui-border bg-ui-surface p-4 shadow-sm sm:p-6">
              <p className="type-micro-label text-ui-text-muted">{label}</p>
              <p className="mt-2 type-row-title">{value}</p>
            </div>
          ))}
        </div>
      </PageShell>
    );
  }

  if (view === 'chat') {
    return (
      <VirtualMachineChatView
        vm={selected}
        workspace={workspace}
        currentUserId={currentUserId}
        isDark={isDark}
        initialInputValue={selectedTargetPrompt || pendingChatPrompt}
        onOpenAiSettings={() => navigate(AppPaths.workspaceAiSettings(workspace.id, getCurrentAppPath()))}
        onInitialInputConsumed={() => {
          if (selectedTargetPrompt) onPendingTargetPromptConsumed?.();
          setPendingChatPrompt('');
        }}
      />
    );
  }

  if (isVmResourceSubview(view)) {
    return (
      <VirtualMachineResourcesView
        vmName={selected.name}
        activeCategory={activeResourceCategory}
        inventory={inventory}
        logs={logs}
        isLoading={resourceStatus === 'loading'}
        error={resourceError}
        isLogsLoading={logsStatus === 'loading'}
        logsError={logsError}
        onCategoryChange={selectResourceCategory}
        onRetry={() => {
          void loadVmInventory(selected.id);
          if (activeResourceCategory === 'logs') void loadVmLogs(selected.id);
        }}
      />
    );
  }

  if (view === 'settings') {
    return (
      <VirtualMachineSettingsView
        vm={selected}
        workspace={workspace}
        installInstructions={installInstructions?.vmId === selected.id ? installInstructions.value : null}
        requiresInitialEnrollment={selected.status === 'unknown'}
        onGenerateInitialEnrollment={canManageTargets && selected.status === 'unknown' ? () => generateInitialEnrollment(selected) : undefined}
        onReplaceCredential={canManageAgentKeys && selected.status !== 'unknown' ? () => replaceCredential(selected) : undefined}
        onGenerateRepairInstructions={canManageTargets && selected.status !== 'unknown' ? () => generateRepairInstructions(selected) : undefined}
        isGeneratingRepairInstructions={isGeneratingRepairInstructions}
        isReplacingCredential={isReplacingCredential}
        isGeneratingInitialEnrollment={isRegisteringVm}
        credentialError={credentialReplacementError}
        onDeleteVirtualMachine={canManageTargets ? () => deleteVirtualMachine(selected) : undefined}
        canManageTargets={canManageTargets}
        canCreateReadWriteRuns={canCreateReadWriteRuns}
      />
    );
  }

  return null;
};
