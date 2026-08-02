import type { ControlPlaneTargetIssueSummary, ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import { formatRelativeTime } from '@/utils/dateTime';

export type VmConnectionFilter = 'all' | 'attention' | 'healthy' | 'not_installed';

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function vmNeedsAttention(vm: ControlPlaneVirtualMachine, issueSummary?: ControlPlaneTargetIssueSummary): boolean {
  if (vm.status === 'unknown') return false;
  if (vm.status === 'degraded' || vm.status === 'offline') return true;
  return (issueSummary?.total ?? 0) > 0;
}

export function vmMatchesConnectionFilter(vm: ControlPlaneVirtualMachine, filter: VmConnectionFilter, issueSummary?: ControlPlaneTargetIssueSummary): boolean {
  if (filter === 'all') return true;
  if (filter === 'attention') return vmNeedsAttention(vm, issueSummary);
  if (filter === 'healthy') return vm.status === 'online' && !vmNeedsAttention(vm, issueSummary);
  return vm.status === 'unknown';
}

export function getVmStatusLabel(
  status: ControlPlaneVirtualMachine['status'],
  t: (key: string) => string
): string {
  if (status === 'online') return t('dashboard.healthy');
  if (status === 'degraded') return t('virtualMachines.list.degraded');
  if (status === 'offline') return t('virtualMachines.list.offline');
  return t('dashboard.notConnected');
}

export function getVmCatalogStatusLabel(vm: ControlPlaneVirtualMachine, issueSummary: ControlPlaneTargetIssueSummary | undefined, t: Translate): string {
  if (vm.status === 'unknown') return getVmStatusLabel(vm.status, t);
  if ((issueSummary?.critical ?? 0) > 0) {
    return t('dashboard.criticalStatus', { count: issueSummary?.critical });
  }
  if ((issueSummary?.warning ?? 0) > 0) {
    return t('dashboard.warningStatus', { count: issueSummary?.warning });
  }
  if ((issueSummary?.total ?? 0) > 0) {
    return t('dashboard.findingStatus', { count: issueSummary?.total });
  }
  return getVmStatusLabel(vm.status, t);
}

export function getVmCatalogStatusReason(
  vm: ControlPlaneVirtualMachine,
  issueSummary: ControlPlaneTargetIssueSummary | undefined,
  issueSummaryLoadState: 'loading' | 'ready' | 'error' | undefined,
  t: Translate
): string {
  if (vm.status === 'unknown') return t('virtualMachines.list.vmStateInstallAgent');
  if (issueSummaryLoadState === 'error') return issueSummary
    ? t('virtualMachines.list.vmStateIssuesRefreshFailed')
    : t('virtualMachines.list.vmStateIssuesUnavailable');
  if (!issueSummary) return t('virtualMachines.list.vmStateCheckingIssues');
  if (issueSummary.critical > 0) return t('virtualMachines.list.vmStateCriticalIssues', { count: issueSummary.critical });
  if (vm.status === 'offline') return t('virtualMachines.list.vmStateAgentOffline');
  if (issueSummary.warning > 0) return t('virtualMachines.list.vmStateWarningIssues', { count: issueSummary.warning });
  if (issueSummary.total > 0) return t('virtualMachines.list.vmStateIssues', { count: issueSummary.total });
  if (vm.status === 'degraded') return t('virtualMachines.list.vmStateDegraded');
  return t('virtualMachines.list.vmStateClear');
}

export function getVmCatalogStatusTone(vm: ControlPlaneVirtualMachine, issueSummary?: ControlPlaneTargetIssueSummary): 'success' | 'warning' | 'danger' | 'neutral' {
  if (vm.status === 'unknown') return 'warning';
  if ((issueSummary?.critical ?? 0) > 0) {
    return 'danger';
  }
  if ((issueSummary?.total ?? 0) > 0 && vm.status === 'online') {
    return 'warning';
  }
  if (vm.status === 'online') return 'success';
  if (vm.status === 'degraded') return 'warning';
  if (vm.status === 'offline') return 'danger';
  return 'neutral';
}

export function formatSnapshotTime(vm: ControlPlaneVirtualMachine, now = Date.now()): string {
  return formatRelativeTime(vm.latestSnapshot?.timestamp || vm.updatedAt, {
    fallback: 'Waiting for agent',
    now
  });
}
