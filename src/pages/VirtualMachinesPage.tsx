import React from 'react';
import { Activity, Cpu, Terminal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ICONS } from '@/constants';
import { Button } from '@/components/common/Button';
import { MetricChart } from '@/components/common/MetricChart';
import { McpServersView } from '@/features/kubernetes-cluster-detail/components/detail/views/McpServersView';
import { controlPlaneApi, ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import type { NavigateOptions } from '@/hooks/useAppRouter';
import { AppPaths, AppRoute, VmSubview } from '@/utils/routes';
import { Workspace } from '@/types';
import {
  findingSeverityTone,
  formatSnapshotTime,
  getFindingSeverity,
  getVmStatusLabel,
  type VmConnectionFilter
} from '@/pages/virtual-machines/virtualMachineUi';
import {
  formatMetricTime,
  getVmMetricTimeline,
  VmMetricTimelinePoint
} from '@/pages/virtual-machines/VirtualMachineMetrics';
import { AddVirtualMachineModal } from '@/pages/virtual-machines/AddVirtualMachineModal';
import { VirtualMachineChatView } from '@/pages/virtual-machines/VirtualMachineChatView';
import { VirtualMachinesListView } from '@/pages/virtual-machines/VirtualMachinesListView';
import { VirtualMachineResourcesView, VmResourceCategory } from '@/pages/virtual-machines/VirtualMachineResourcesView';
import { VirtualMachineSettingsView } from '@/pages/virtual-machines/VirtualMachineSettingsView';
import { toClusterShim } from '@/pages/virtual-machines/virtualMachineClusterShim';
import { useVirtualMachineListRefresh } from '@/pages/virtual-machines/useVirtualMachineListRefresh';
import { getSelectedVmRunbookPrompt, shouldClearPendingVmRunbookPrompt } from '@/pages/virtual-machines/virtualMachineRunbookPrompt';
import type { PendingVmRunbookPrompt } from '@/pages/runbooks/runbookModel';

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
  pendingRunbookPrompt?: PendingVmRunbookPrompt | null;
  onPendingRunbookPromptConsumed?: () => void;
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
  pendingRunbookPrompt,
  onPendingRunbookPromptConsumed
}) => {
  const { t } = useTranslation();
  const [inventory, setInventory] = React.useState<Record<string, unknown>[]>([]);
  const [findings, setFindings] = React.useState<Record<string, unknown>[]>([]);
  const [logs, setLogs] = React.useState<Record<string, unknown>[]>([]);
  const [resourceStatus, setResourceStatus] = React.useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [resourceError, setResourceError] = React.useState<string | null>(null);
  const [logsStatus, setLogsStatus] = React.useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [logsError, setLogsError] = React.useState<string | null>(null);
  const [metricHistory, setMetricHistory] = React.useState<Record<string, unknown>[]>([]);
  const [metricHistoryByVmId, setMetricHistoryByVmId] = React.useState<Record<string, Record<string, unknown>[]>>({});
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
  const selectedRunbookPrompt = getSelectedVmRunbookPrompt(pendingRunbookPrompt, workspace.id, selectedId);
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
        if (pendingRunbookPrompt?.workspaceId === workspace.id && pendingRunbookPrompt.targetId === selectedId) {
          onPendingRunbookPromptConsumed?.();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    isLoading,
    onPendingRunbookPromptConsumed,
    onUpsertWorkspaceVirtualMachine,
    pendingRunbookPrompt,
    selected,
    selectedId,
    workspace.id
  ]);

  React.useEffect(() => {
    if (shouldClearPendingVmRunbookPrompt(pendingRunbookPrompt, workspace.id, selectedId, view)) {
      onPendingRunbookPromptConsumed?.();
    }
  }, [onPendingRunbookPromptConsumed, pendingRunbookPrompt, selectedId, view, workspace.id]);

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
      setResourceError(error instanceof Error ? error.message : t('virtualMachines.resources.loadFailed'));
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
      setLogsError(error instanceof Error ? error.message : t('virtualMachines.resources.logsLoadFailed'));
      setLogsStatus('error');
    }
  }, [t, workspace.id]);

  React.useEffect(() => {
    if (!selected) return;
    if (isVmResourceSubview(view)) {
      void loadVmInventory(selected);
      if (view === 'logs') {
        void loadVmLogs(selected);
      }
    }
    if (view === 'overview') {
      void controlPlaneApi.listVirtualMachineFindings(workspace.id, selected.id).then((page) => setFindings(page.items || []));
      let isCurrent = true;
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
      setVmCreationError(error instanceof Error ? error.message.replace(/^Control plane request failed \(\d+\):\s*/, '') : t('virtualMachines.list.registerFailed'));
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
  const openVmTriage = React.useCallback((finding?: Record<string, unknown>) => {
    if (!selected) return;
    const prompt = finding
      ? t('virtualMachines.overview.triageFindingPrompt', {
        title: String(finding.title || t('virtualMachines.overview.findingFallback')),
        severity: getFindingSeverity(finding),
        source: String(finding.source || finding.category || 'host'),
        message: String(finding.message || '')
      })
      : t('virtualMachines.overview.triageHostPrompt', { name: selected.name });
    setPendingChatPrompt(prompt);
    navigate(AppPaths.workspaceVirtualMachineDetail(workspace.id, selected.id, 'chat'));
  }, [navigate, selected, t, workspace.id]);
  const metricTimeline = React.useMemo(() => getVmMetricTimeline(metricHistory), [metricHistory]);
  const cpuSeries = React.useMemo(
    () =>
      metricTimeline
        .filter((point): point is VmMetricTimelinePoint & { cpu: number } => point.cpu !== null)
        .map((point) => ({ label: formatMetricTime(point.timestamp), value: point.cpu })),
    [metricTimeline]
  );
  const memorySeries = React.useMemo(
    () =>
      metricTimeline
        .filter((point): point is VmMetricTimelinePoint & { memory: number } => point.memory !== null)
        .map((point) => ({ label: formatMetricTime(point.timestamp), value: point.memory })),
    [metricTimeline]
  );
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

  if (view === 'mcpServers') {
    return (
      <McpServersView
        cluster={toClusterShim(selected)}
        targetContext={{ workspaceId: workspace.id, targetId: selected.id, targetType: 'virtual_machine' }}
        canManageMcp={Boolean(workspace.permissions?.manage_mcp)}
        canManageTools={Boolean(workspace.permissions?.manage_tools)}
        canRequestWriteRuns={Boolean(workspace.permissions?.create_read_write_runs)}
      />
    );
  }

  if (view === 'overview') {
    const findingCount = findings.length;
    const criticalFindings = findings.filter((finding) => getFindingSeverity(finding) === 'critical').length;
    const warningFindings = findings.filter((finding) => getFindingSeverity(finding) === 'warning').length;

    return (
      <div className="min-h-0 flex-1 overflow-y-auto bg-ui-bg px-4 py-6 custom-scrollbar stable-scrollbar-gutter sm:px-6 lg:px-10 lg:py-8">
        <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="type-route-title">{t('virtualMachines.overview.title')}</h1>
            <p className="type-body mt-2">{t('virtualMachines.overview.latestTelemetryFor', { name: selected.name })}</p>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center lg:w-auto lg:max-w-2xl lg:justify-end">
            <Button onClick={() => openVmTriage()} variant="secondary" size="md" className="whitespace-nowrap">
              <Terminal className="h-4 w-4" />
              {t('virtualMachines.overview.openAssistant')}
            </Button>
            <div className="flex min-h-11 w-fit items-center gap-2 rounded-md border border-ui-border bg-ui-surface px-4 py-2 shadow-sm">
              <div className={`h-2 w-2 rounded-full ${selected.status === 'online' ? 'bg-status-success' : selected.status === 'degraded' ? 'bg-status-warning' : 'bg-status-danger'}`} />
              <span className="type-label">{getVmStatusLabel(selected.status, t)} · {formatSnapshotTime(selected)}</span>
            </div>
          </div>
        </header>

        <section className="mb-10 overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-sm">
          <div className="flex flex-col gap-6 border-b border-ui-border bg-ui-bg px-5 py-5 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-ui-border bg-ui-surface/70 text-accent-strong">
                <ICONS.AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="type-row-title">{t('virtualMachines.overview.activeFindings')}</p>
                <p className="mt-1 text-sm leading-6 text-ui-text-muted">
                  {t('virtualMachines.overview.activeFindingsBody')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="type-caption rounded-full bg-ui-surface px-3 py-1">
                {t('virtualMachines.overview.findingCount', { count: findingCount })}
              </span>
              <span className="type-caption rounded-full bg-status-danger-soft px-3 py-1 text-status-danger-text">
                {t('virtualMachines.overview.criticalFindings', { count: criticalFindings })}
              </span>
              <span className="type-caption rounded-full bg-status-warning-soft px-3 py-1 text-status-warning-text">
                {t('virtualMachines.overview.warningFindings', { count: warningFindings })}
              </span>
            </div>
          </div>

          {findings.length === 0 ? (
            <div className="flex min-h-36 flex-col items-center justify-center px-6 py-10 text-center">
              <div className="rounded-md border border-status-success/20 bg-status-success-soft p-3 text-status-success-text">
                <ICONS.CheckCircle2 className="h-5 w-5" />
              </div>
              <h2 className="type-row-title mt-4">{t('virtualMachines.overview.noFindingsTitle')}</h2>
              <p className="type-body mt-2 max-w-xl">{t('virtualMachines.overview.noFindingsBody')}</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-ui-border">
                      <th className="type-label px-5 py-3 text-left">{t('clusterOverview.finding')}</th>
                      <th className="type-label px-5 py-3 text-left">{t('clusterOverview.severity')}</th>
                      <th className="type-label px-5 py-3 text-left">{t('virtualMachines.overview.source')}</th>
                      <th className="type-label px-5 py-3 text-left">{t('clusterOverview.updated')}</th>
                      <th className="type-label px-5 py-3 text-right">{t('clusterOverview.action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {findings.map((finding, index) => {
                      const severity = getFindingSeverity(finding);
                      return (
                        <tr key={String(finding.findingId || index)} className="border-b border-ui-border transition-colors last:border-b-0 hover:bg-ui-bg/70">
                          <td className="max-w-[34rem] px-5 py-4">
                            <p className="type-micro-label">{t('virtualMachines.overview.snapshotFinding')}</p>
                            <h2 className="type-row-title mt-2">{String(finding.title || t('virtualMachines.overview.findingFallback'))}</h2>
                            <p className="type-body mt-1">{String(finding.message || '')}</p>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <span className={`type-micro-label rounded-full px-2.5 py-1 ${findingSeverityTone(severity)}`}>
                              {t(`investigations.severity.${severity}`)}
                            </span>
                          </td>
                          <td className="type-caption px-5 py-4 align-top">
                            {String(finding.source || finding.category || 'host')}
                          </td>
                          <td className="type-caption px-5 py-4 align-top">
                            {String(finding.timestamp || selected.latestSnapshot?.timestamp || selected.updatedAt)}
                          </td>
                          <td className="px-5 py-4 align-top text-right">
                            <Button onClick={() => openVmTriage(finding)} variant="accent" size="md">
                              <Terminal className="h-4 w-4" />
                              {t('clusterOverview.runTriage')}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-ui-border md:hidden">
                {findings.map((finding, index) => {
                  const severity = getFindingSeverity(finding);
                  return (
                    <article key={String(finding.findingId || index)} className="p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`type-micro-label rounded-full px-2.5 py-1 ${findingSeverityTone(severity)}`}>
                          {t(`investigations.severity.${severity}`)}
                        </span>
                        <span className="type-caption">{String(finding.source || finding.category || 'host')}</span>
                      </div>
                      <h2 className="type-row-title mt-4">{String(finding.title || t('virtualMachines.overview.findingFallback'))}</h2>
                      <p className="type-body mt-2">{String(finding.message || '')}</p>
                      <Button onClick={() => openVmTriage(finding)} variant="accent" size="md" className="mt-4">
                        <Terminal className="h-4 w-4" />
                        {t('clusterOverview.runTriage')}
                      </Button>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <div className="mb-12 grid w-full grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          <MetricChart
            title={t('clusterOverview.cpuUsage')}
            description={t('virtualMachines.overview.cpuDescription')}
            icon={Cpu}
            points={cpuSeries}
            unit="Core"
            type="area"
            isLoading={metricHistoryStatus === 'loading'}
            emptyTitle={t('clusterOverview.noTelemetryHistory')}
            loadingTitle={t('clusterOverview.collectingHistory')}
            emptyDescription={t('virtualMachines.overview.trendAfterSamples')}
          />
          <MetricChart
            title={t('clusterOverview.memory')}
            description={t('virtualMachines.overview.memoryDescription')}
            icon={Activity}
            points={memorySeries}
            unit="GiB"
            type="line"
            isLoading={metricHistoryStatus === 'loading'}
            emptyTitle={t('clusterOverview.noTelemetryHistory')}
            loadingTitle={t('clusterOverview.collectingHistory')}
            emptyDescription={t('virtualMachines.overview.trendAfterSamples')}
          />
        </div>

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
      </div>
    );
  }

  if (view === 'chat') {
    return (
      <VirtualMachineChatView
        vm={selected}
        workspace={workspace}
        currentUserId={currentUserId}
        isDark={isDark}
        initialInputValue={selectedRunbookPrompt || pendingChatPrompt}
        onInitialInputConsumed={() => {
          if (selectedRunbookPrompt) onPendingRunbookPromptConsumed?.();
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
