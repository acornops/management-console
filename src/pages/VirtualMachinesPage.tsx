import React from 'react';
import { Activity, Gauge, Terminal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ICONS } from '@/constants';
import { Button } from '@/components/common/Button';
import { MetricChart } from '@/components/common/MetricChart';
import { PageHeader, PageShell } from '@/components/common/PageComposition';
import { formatControlPlaneError } from '@/services/control-plane/errorFormatting';
import {
  controlPlaneApi,
  ControlPlaneVirtualMachine,
  type ControlPlaneIssueItem,
  type ControlPlaneTargetIssueSummary,
  type ControlPlaneVirtualMachineMetricHistoryPoint
} from '@/services/controlPlaneApi';
import type { NavigateOptions } from '@/hooks/useAppRouter';
import { AppPaths, AppRoute, VmSubview } from '@/utils/routes';
import { Workspace } from '@/types';
import {
  formatSnapshotTime,
  getVmStatusLabel,
  type VmConnectionFilter
} from '@/pages/virtual-machines/virtualMachineUi';
import {
  formatMetricTime,
  getLatestVmTelemetryPoint,
  getVmMetricTimeline,
  VmMetricTimelinePoint
} from '@/pages/virtual-machines/VirtualMachineMetrics';
import { VirtualMachineTelemetrySummary } from '@/pages/virtual-machines/VirtualMachineTelemetrySummary';
import { AddVirtualMachineModal } from '@/pages/virtual-machines/AddVirtualMachineModal';
import { VirtualMachineAdminView } from '@/pages/virtual-machines/VirtualMachineAdminView';
import { VirtualMachineChatView } from '@/pages/virtual-machines/VirtualMachineChatView';
import { VirtualMachineIssuesPanel } from '@/pages/virtual-machines/VirtualMachineIssuesPanel';
import { VirtualMachinesListView } from '@/pages/virtual-machines/VirtualMachinesListView';
import { VirtualMachineResourcesView, VmResourceCategory } from '@/pages/virtual-machines/VirtualMachineResourcesView';
import { VirtualMachineSettingsView } from '@/pages/virtual-machines/VirtualMachineSettingsView';
import { useVirtualMachineListRefresh } from '@/pages/virtual-machines/useVirtualMachineListRefresh';
import { getSelectedVmTargetPrompt, shouldClearPendingVmTargetPrompt } from '@/pages/virtual-machines/virtualMachineTargetPrompt';
import type { PendingVmTargetPrompt } from '@/pages/target-prompts/targetPromptModel';

interface VirtualMachinesPageProps {
  workspace: Workspace;
  currentUserId: string;
  route: Extract<AppRoute, { kind: 'workspaceVirtualMachines' | 'workspaceVirtualMachineDetail' }>;
  activeSubview: VmSubview;
  virtualMachines: ControlPlaneVirtualMachine[];
  hasLoadedWorkspaceVirtualMachines: boolean;
  isDark: boolean;
  canManageTargets: boolean;
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
  const [inventory, setInventory] = React.useState<Record<string, unknown>[]>([]);
  const [issues, setIssues] = React.useState<ControlPlaneIssueItem[] | null>(null);
  const [isLoadingIssueEvidence, setIsLoadingIssueEvidence] = React.useState(false);
  const [issueLoadFailed, setIssueLoadFailed] = React.useState(false);
  const [logs, setLogs] = React.useState<Record<string, unknown>[]>([]);
  const [resourceStatus, setResourceStatus] = React.useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [resourceError, setResourceError] = React.useState<string | null>(null);
  const [logsStatus, setLogsStatus] = React.useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [logsError, setLogsError] = React.useState<string | null>(null);
  const [metricHistory, setMetricHistory] = React.useState<ControlPlaneVirtualMachineMetricHistoryPoint[]>([]);
  const [metricHistoryByVmId, setMetricHistoryByVmId] = React.useState<Record<string, ControlPlaneVirtualMachineMetricHistoryPoint[]>>({});
  const [metricHistoryStatus, setMetricHistoryStatus] = React.useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [installInstructions, setInstallInstructions] = React.useState<{ vmId: string; value: string } | null>(null);
  const [isAddingVm, setIsAddingVm] = React.useState(false);
  const [vmCreationStep, setVmCreationStep] = React.useState<'details' | 'instructions'>('details');
  const [isRegisteringVm, setIsRegisteringVm] = React.useState(false);
  const [newVmInstallInstructions, setNewVmInstallInstructions] = React.useState('');
  const [vmCreationError, setVmCreationError] = React.useState<string | null>(null);
  const [newVmName, setNewVmName] = React.useState('');
  const [pendingChatPrompt, setPendingChatPrompt] = React.useState('');
  const [resourceCategory, setResourceCategory] = React.useState<VmResourceCategory>('all');
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState<VmConnectionFilter>('all');
  const metricHistoryRequestSeqRef = React.useRef(0);
  const selectedId = route.kind === 'workspaceVirtualMachineDetail' ? route.vmId : null;
  const view = route.kind === 'workspaceVirtualMachineDetail' ? activeSubview : 'overview';
  const selected = selectedId ? virtualMachines.find((item) => item.id === selectedId) || null : null;
  const selectedTargetPrompt = getSelectedVmTargetPrompt(pendingTargetPrompt, workspace.id, selectedId);
  const activeResourceCategory = isVmResourceSubview(view)
    ? vmSubviewToResourceCategory(view)
    : resourceCategory;
  const visibleMetricVms = React.useMemo(
    () => route.kind === 'workspaceVirtualMachines'
      ? virtualMachines.filter((vm) => vm.status === 'online').slice(0, 6)
      : [],
    [route.kind, virtualMachines]
  );
  const isLoading = useVirtualMachineListRefresh({
    workspaceId: workspace.id,
    virtualMachines,
    hasLoadedWorkspaceVirtualMachines,
    query,
    status,
    onReplaceWorkspaceVirtualMachines
  });

  const refreshWorkspaceSummary = React.useCallback(async () => {
    const refreshed = await controlPlaneApi.getWorkspace(workspace.id);
    const { clusterIds: _clusterIds, members: _members, ...updates } = refreshed;
    onUpdateWorkspace(workspace.id, updates);
  }, [onUpdateWorkspace, workspace.id]);

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

  const loadVmInventory = React.useCallback(async (vm: ControlPlaneVirtualMachine) => {
    setResourceStatus('loading');
    setResourceError(null);
    try {
      const page = await controlPlaneApi.listVirtualMachineInventory(workspace.id, vm.id);
      setInventory(page.items || []);
      setResourceStatus('ready');
    } catch (error) {
      console.error('Failed loading virtual machine inventory', error);
      setInventory([]);
      setResourceError(formatControlPlaneError(error, t('virtualMachines.resources.loadFailed'), { area: 'virtualMachines' }));
      setResourceStatus('error');
    }
  }, [t, workspace.id]);

  const loadVmLogs = React.useCallback(async (vm: ControlPlaneVirtualMachine) => {
    setLogsStatus('loading');
    setLogsError(null);
    try {
      const payload = await controlPlaneApi.getVirtualMachineLogs(workspace.id, vm.id);
      setLogs(payload.entries || []);
      setLogsStatus('ready');
    } catch (error) {
      console.error('Failed loading virtual machine logs', error);
      setLogs([]);
      setLogsError(formatControlPlaneError(error, t('virtualMachines.resources.logsLoadFailed'), { area: 'virtualMachines' }));
      setLogsStatus('error');
    }
  }, [t, workspace.id]);

  React.useEffect(() => {
    if (!selected) {
      setIssues(null);
      setIsLoadingIssueEvidence(false);
      setIssueLoadFailed(false);
      return;
    }
    if (isVmResourceSubview(view)) {
      void loadVmInventory(selected);
      if (view === 'logs') {
        void loadVmLogs(selected);
      }
    }
    if (view === 'overview') {
      let isCurrent = true;
      setIssues(null);
      setIssueLoadFailed(false);
      setIsLoadingIssueEvidence(true);
      void controlPlaneApi.listTargetIssues(workspace.id, selected.id, { limit: 50 })
        .then((page) => {
          if (!isCurrent) return;
          setIssues(page.items || []);
        })
        .catch((error) => {
          console.error('Failed loading virtual machine issues', error);
          if (!isCurrent) return;
          setIssues(null);
          setIssueLoadFailed(true);
        })
        .finally(() => {
          if (!isCurrent) return;
          setIsLoadingIssueEvidence(false);
        });
      setMetricHistoryStatus('loading');
      void controlPlaneApi.getVirtualMachineMetricsHistory(workspace.id, selected.id)
        .then((payload) => {
          if (!isCurrent) return;
          setMetricHistory(payload.points || []);
          setMetricHistoryStatus('ready');
        })
        .catch((error) => {
          console.error('Failed loading virtual machine metric history', error);
          if (!isCurrent) return;
          setMetricHistory([]);
          setMetricHistoryStatus('error');
        });
      return () => {
        isCurrent = false;
      };
    }
    setIsLoadingIssueEvidence(false);
    setIssueLoadFailed(false);
  }, [loadVmInventory, loadVmLogs, selected, view, workspace.id]);

  React.useEffect(() => {
    if (isVmResourceSubview(view)) {
      setResourceCategory(vmSubviewToResourceCategory(view));
    }
  }, [view]);

  React.useEffect(() => {
    if (route.kind !== 'workspaceVirtualMachines') return undefined;
    const visibleVmIds = new Set(visibleMetricVms.map((vm) => vm.id));
    setMetricHistoryByVmId((prev) => Object.fromEntries(
      Object.entries(prev).filter(([vmId]) => visibleVmIds.has(vmId))
    ));

    if (visibleMetricVms.length === 0) return undefined;

    let isCurrent = true;
    const requestId = ++metricHistoryRequestSeqRef.current;
    void Promise.all(
      visibleMetricVms.map(async (vm) => {
        try {
          const payload = await controlPlaneApi.getVirtualMachineMetricsHistory(workspace.id, vm.id);
          return [vm.id, payload.points || []] as const;
        } catch (error) {
          console.error('Failed loading VM card metric history', error);
          return [vm.id, []] as const;
        }
      })
    ).then((entries) => {
      if (!isCurrent || requestId !== metricHistoryRequestSeqRef.current) return;
      setMetricHistoryByVmId((prev) => {
        const visibleOnly = Object.fromEntries(
          Object.entries(prev).filter(([vmId]) => visibleVmIds.has(vmId))
        );
        return { ...visibleOnly, ...Object.fromEntries(entries) };
      });
    });

    return () => {
      isCurrent = false;
    };
  }, [route.kind, visibleMetricVms, workspace.id]);

  const resetVmCreationState = () => {
    setIsAddingVm(false);
    setVmCreationStep('details');
    setIsRegisteringVm(false);
    setInstallInstructions(null);
    setNewVmInstallInstructions('');
    setVmCreationError(null);
    setNewVmName('');
  };

  const openAddVmModal = () => {
    if (!canManageTargets) return;
    setIsAddingVm(true);
    setVmCreationStep('details');
    setNewVmInstallInstructions('');
    setVmCreationError(null);
  };

  const registerVm = async () => {
    if (!newVmName.trim() || !canManageTargets) return;
    setIsRegisteringVm(true);
    setVmCreationError(null);
    try {
      const result = await controlPlaneApi.registerVirtualMachine(workspace.id, {
        name: newVmName.trim()
      });
      setInstallInstructions({ vmId: result.virtualMachine.id, value: result.installInstructions });
      setNewVmInstallInstructions(result.installInstructions);
      onUpsertWorkspaceVirtualMachine(workspace.id, result.virtualMachine);
      await refreshWorkspaceSummary();
      setVmCreationStep('instructions');
    } catch (error) {
      console.error('Failed registering virtual machine in control plane', error);
      setVmCreationError(formatControlPlaneError(error, t('virtualMachines.list.registerFailed'), { area: 'virtualMachines' }));
    } finally {
      setIsRegisteringVm(false);
    }
  };

  const confirmVmInstalled = () => {
    resetVmCreationState();
  };

  const rotateKey = async () => {
    if (!selected) return;
    const result = await controlPlaneApi.rotateVirtualMachineAgentKey(workspace.id, selected.id);
    setInstallInstructions({ vmId: selected.id, value: result.installInstructions });
  };

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
      navigate(AppPaths.workspaceVirtualMachines(workspace.id));
    }
  }, [navigate, onRemoveWorkspaceVirtualMachine, refreshWorkspaceSummary, route, workspace.id]);

  const selectResourceCategory = React.useCallback((category: VmResourceCategory) => {
    if (!selected) return;
    setResourceCategory(category);
    const tab: VmSubview = category === 'all' ? 'resources' : category;
    navigate(AppPaths.workspaceVirtualMachineDetail(workspace.id, selected.id, tab));
  }, [navigate, selected, workspace.id]);
  const openVmTriage = React.useCallback(() => {
    if (!selected) return;
    const prompt = t('virtualMachines.overview.triageHostPrompt', { name: selected.name });
    setPendingChatPrompt(prompt);
    navigate(AppPaths.workspaceVirtualMachineDetail(workspace.id, selected.id, 'chat'));
  }, [navigate, selected, t, workspace.id]);
  const openVmIssueTriage = React.useCallback((issue: ControlPlaneIssueItem) => {
    if (!selected) return;
    const prompt = t('virtualMachines.overview.triageIssuePrompt', {
      title: issue.title,
      severity: issue.severity,
      source: issue.objectName || issue.objectKind || issue.reason || 'host',
      message: issue.summary
    });
    setPendingChatPrompt(prompt);
    navigate(AppPaths.workspaceVirtualMachineDetail(workspace.id, selected.id, 'chat'));
  }, [navigate, selected, t, workspace.id]);
  const metricTimeline = React.useMemo(() => getVmMetricTimeline(metricHistory), [metricHistory]);
  const loadSeries = React.useMemo(
    () =>
      metricTimeline
        .filter((point): point is VmMetricTimelinePoint & { loadAverage1m: number } => point.loadAverage1m !== null)
        .map((point) => ({ label: formatMetricTime(point.timestamp), value: point.loadAverage1m })),
    [metricTimeline]
  );
  const memorySeries = React.useMemo(
    () =>
      metricTimeline
        .filter((point): point is VmMetricTimelinePoint & { memoryUsedPercent: number } => point.memoryUsedPercent !== null)
        .map((point) => ({ label: formatMetricTime(point.timestamp), value: point.memoryUsedPercent })),
    [metricTimeline]
  );
  const latestTelemetryPoint = React.useMemo(
    () => getLatestVmTelemetryPoint(metricTimeline),
    [metricTimeline]
  );
  const getVmMetricEmptyTitle = React.useCallback((seriesLength: number): string => {
    if (metricHistoryStatus === 'error') return t('virtualMachines.overview.telemetryLoadFailedTitle');
    if (metricTimeline.length === 0) return t('virtualMachines.overview.noVmMetricSamples');
    if (seriesLength === 0) return t('virtualMachines.overview.noUsableVmMetricSamples');
    return t('virtualMachines.overview.waitingForAnotherVmSample');
  }, [metricHistoryStatus, metricTimeline.length, t]);
  const getVmMetricEmptyDescription = React.useCallback((seriesLength: number): string => {
    if (metricHistoryStatus === 'error') return t('virtualMachines.overview.telemetryLoadFailedBody');
    if (metricTimeline.length === 0) return t('virtualMachines.overview.noVmMetricSamplesBody');
    if (seriesLength === 0) return t('virtualMachines.overview.noUsableVmMetricSamplesBody');
    return t('virtualMachines.overview.waitingForAnotherVmSampleBody');
  }, [metricHistoryStatus, metricTimeline.length, t]);
  if (route.kind === 'workspaceVirtualMachines') {
    return (
      <>
        <VirtualMachinesListView
          workspace={workspace}
          items={virtualMachines}
          isLoading={isLoading}
          query={query}
          status={status}
          metricHistoryByVmId={metricHistoryByVmId}
          canManageTargets={canManageTargets}
          onQueryChange={setQuery}
          onStatusChange={setStatus}
          onOpenRegisterVm={openAddVmModal}
          onDeleteVirtualMachine={deleteVirtualMachine}
          navigate={navigate}
        />
        <AddVirtualMachineModal
          isOpen={isAddingVm}
          creationStep={vmCreationStep}
          vmName={newVmName}
          installInstructions={newVmInstallInstructions}
          isRegistering={isRegisteringVm}
          errorMessage={vmCreationError}
          onClose={resetVmCreationState}
          onVmNameChange={setNewVmName}
          onProceedToInstructions={registerVm}
          onConfirmInstalled={confirmVmInstalled}
        />
      </>
    );
  }

  if (isLoading && !selected) {
    return <div className="flex h-full items-center justify-center bg-ui-bg text-sm font-semibold text-ui-text-muted">{t('virtualMachines.loadingDetail')}</div>;
  }

  if (!selected) {
    return (
      <div className="flex h-full items-center justify-center bg-ui-bg px-6">
        <div className="max-w-xl text-center">
          <ICONS.Server className="mx-auto h-10 w-10 text-ui-text-muted" />
          <h2 className="mt-4 text-lg font-bold text-ui-text">{t('virtualMachines.notFoundTitle')}</h2>
          <p className="mt-2 text-sm text-ui-text-muted">{t('virtualMachines.notFoundBody')}</p>
          <Button onClick={() => navigate(AppPaths.workspaceVirtualMachines(workspace.id))} className="mt-5">
            <ICONS.ChevronLeft className="h-4 w-4" />
            {t('virtualMachines.backToList')}
          </Button>
        </div>
      </div>
    );
  }

  if (view === 'mcpServers' || view === 'tools' || view === 'skills') {
    return (
      <VirtualMachineAdminView
        view={view}
        virtualMachine={selected}
        workspace={workspace}
      />
    );
  }

  if (view === 'overview') {
    return (
      <PageShell>
        <PageHeader title={t('virtualMachines.overview.title')} description={t('virtualMachines.overview.latestTelemetryFor', { name: selected.name })} actions={
          <>
            <Button onClick={() => openVmTriage()} variant="secondary" size="md" className="whitespace-nowrap">
              <Terminal className="h-4 w-4" />
              {t('virtualMachines.overview.openAssistant')}
            </Button>
            <div className="flex min-h-11 w-fit items-center gap-2 rounded-md border border-ui-border bg-ui-surface px-4 py-2 shadow-sm">
              <div className={`h-2 w-2 rounded-full ${selected.status === 'online' ? 'bg-status-success' : selected.status === 'degraded' ? 'bg-status-warning' : 'bg-status-danger'}`} />
              <span className="type-label">{getVmStatusLabel(selected.status, t)} · {formatSnapshotTime(selected)}</span>
            </div>
          </>
        } />

        <VirtualMachineIssuesPanel
          issues={issues}
          issueSummary={issueSummary || null}
          isLoading={isLoadingIssueEvidence}
          issueLoadFailed={issueLoadFailed}
          onOpenIssueTriage={openVmIssueTriage}
        />

        <div className="mb-12 grid w-full grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          <MetricChart
            title={t('virtualMachines.overview.loadAverage')}
            description={t('virtualMachines.overview.loadDescription')}
            icon={Activity}
            points={loadSeries}
            unit=""
            type="area"
            isLoading={metricHistoryStatus === 'loading'}
            emptyTitle={getVmMetricEmptyTitle(loadSeries.length)}
            loadingTitle={t('virtualMachines.overview.loadingMetricHistory')}
            emptyDescription={getVmMetricEmptyDescription(loadSeries.length)}
          />
          <MetricChart
            title={t('virtualMachines.overview.memory')}
            description={t('virtualMachines.overview.memoryDescription')}
            icon={Gauge}
            points={memorySeries}
            unit="%"
            type="line"
            isLoading={metricHistoryStatus === 'loading'}
            emptyTitle={getVmMetricEmptyTitle(memorySeries.length)}
            loadingTitle={t('virtualMachines.overview.loadingMetricHistory')}
            emptyDescription={getVmMetricEmptyDescription(memorySeries.length)}
          />
        </div>

        <VirtualMachineTelemetrySummary latestTelemetryPoint={latestTelemetryPoint} />

        <div className="mb-12 grid w-full grid-cols-1 gap-6 lg:grid-cols-3">
          {[
            [t('virtualMachines.settings.osFamily'), selected.osFamily],
            [t('virtualMachines.settings.serviceManager'), selected.serviceManager],
            [t('virtualMachines.settings.allowedLogs'), selected.allowedLogSources?.join(', ') || t('virtualMachines.settings.defaultAllowedLogs')]
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-ui-border bg-ui-surface p-4 shadow-sm sm:p-6">
              <p className="type-micro-label text-ui-text-muted">{label}</p>
              <p className="mt-2 text-sm font-bold text-ui-text">{value}</p>
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
        onOpenAiSettings={() => navigate(AppPaths.workspaceAiSettings(workspace.id))}
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
          void loadVmInventory(selected);
          if (activeResourceCategory === 'logs') void loadVmLogs(selected);
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
        onRotateKey={rotateKey}
      />
    );
  }

  return null;
};
