import { virtualMachineConnectionState } from '@/utils/agentConnection';
import type { ControlPlaneTargetIssueSummary, ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import { formatRelativeTime } from '@/utils/dateTime';

export function getVmReportedStatus(vm: ControlPlaneVirtualMachine): ControlPlaneVirtualMachine['status'] | 'unavailable' {
  if (!vm.connection) return vm.status;
  const state = virtualMachineConnectionState(vm);
  if (state === 'unknown') return 'unavailable';
  if (state === 'not_installed') return 'unknown';
  if (state === 'disconnected') return 'offline';
  return vm.status;
}

export function isVmAgentConnected(vm: ControlPlaneVirtualMachine): boolean {
  const status = getVmReportedStatus(vm);
  return status === 'online' || status === 'degraded';
}

export type VmConnectionFilter = 'all' | 'attention' | 'healthy' | 'not_installed';

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function vmNeedsAttention(vm: ControlPlaneVirtualMachine, issueSummary?: ControlPlaneTargetIssueSummary): boolean {
  const status = getVmReportedStatus(vm);
  if (status === 'unknown') return false;
  if (status === 'degraded' || status === 'offline' || status === 'unavailable') return true;
  return (issueSummary?.total ?? 0) > 0;
}

export function vmMatchesConnectionFilter(vm: ControlPlaneVirtualMachine, filter: VmConnectionFilter, issueSummary?: ControlPlaneTargetIssueSummary): boolean {
  const status = getVmReportedStatus(vm);
  if (filter === 'all') return true;
  if (filter === 'attention') return vmNeedsAttention(vm, issueSummary);
  if (filter === 'healthy') return status === 'online' && !vmNeedsAttention(vm, issueSummary);
  return status === 'unknown';
}

export function getVmStatusLabel(
  status: ControlPlaneVirtualMachine['status'] | 'unavailable',
  t: (key: string) => string
): string {
  if (status === 'unavailable') return t('dashboard.unavailable');
  if (status === 'online') return t('virtualMachines.list.agentConnected');
  if (status === 'degraded') return t('virtualMachines.list.degraded');
  if (status === 'offline') return t('virtualMachines.list.offline');
  return t('dashboard.notConnected');
}

export function getVmCatalogStatusLabel(vm: ControlPlaneVirtualMachine, issueSummary: ControlPlaneTargetIssueSummary | undefined, t: Translate): string {
  const status = getVmReportedStatus(vm);
  if (status === 'unknown' || status === 'offline' || status === 'unavailable') return getVmStatusLabel(status, t);
  if ((issueSummary?.critical ?? 0) > 0) {
    return t('dashboard.criticalStatus', { count: issueSummary?.critical });
  }
  if ((issueSummary?.warning ?? 0) > 0) {
    return t('dashboard.warningStatus', { count: issueSummary?.warning });
  }
  if ((issueSummary?.total ?? 0) > 0) {
    return t('dashboard.findingStatus', { count: issueSummary?.total });
  }
  return getVmStatusLabel(status, t);
}

export function getVmCatalogStatusReason(
  vm: ControlPlaneVirtualMachine,
  issueSummary: ControlPlaneTargetIssueSummary | undefined,
  issueSummaryLoadState: 'loading' | 'ready' | 'error' | undefined,
  t: Translate
): string {
  const status = getVmReportedStatus(vm);
  if (status === 'unknown') return t('virtualMachines.list.vmStateInstallAgent');
  if (status === 'unavailable') return t('dashboard.unavailable');
  if (status === 'offline') return t('virtualMachines.list.vmStateAgentOffline');
  if (issueSummaryLoadState === 'error') return issueSummary
    ? t('virtualMachines.list.vmStateIssuesRefreshFailed')
    : t('virtualMachines.list.vmStateIssuesUnavailable');
  if (!issueSummary) return t('virtualMachines.list.vmStateCheckingIssues');
  if (issueSummary.critical > 0) return t('virtualMachines.list.vmStateCriticalIssues', { count: issueSummary.critical });
  if (issueSummary.warning > 0) return t('virtualMachines.list.vmStateWarningIssues', { count: issueSummary.warning });
  if (issueSummary.total > 0) return t('virtualMachines.list.vmStateIssues', { count: issueSummary.total });
  if (status === 'degraded') return t('virtualMachines.list.vmStateDegraded');
  return t('virtualMachines.list.vmStateClear');
}

export function getVmCatalogStatusTone(vm: ControlPlaneVirtualMachine, issueSummary?: ControlPlaneTargetIssueSummary): 'success' | 'warning' | 'danger' | 'neutral' {
  const status = getVmReportedStatus(vm);
  if (status === 'unknown' || status === 'unavailable') return 'warning';
  if ((issueSummary?.critical ?? 0) > 0) {
    return 'danger';
  }
  if ((issueSummary?.total ?? 0) > 0 && status === 'online') {
    return 'warning';
  }
  if (status === 'online') return 'success';
  if (status === 'degraded') return 'warning';
  if (status === 'offline') return 'danger';
  return 'neutral';
}

export function formatSnapshotTime(vm: ControlPlaneVirtualMachine, now = Date.now()): string {
  return formatRelativeTime(vm.latestSnapshot?.timestamp || vm.updatedAt, {
    fallback: 'Waiting for agent',
    now
  });
}
