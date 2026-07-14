import type { ControlPlaneTargetIssueSummary, ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';

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

export function statusClass(status: ControlPlaneVirtualMachine['status']): string {
  if (status === 'online') return 'border-status-success/25 bg-status-success-soft text-status-success-text';
  if (status === 'degraded') return 'border-status-warning/25 bg-status-warning-soft text-status-warning-text';
  return 'bg-ui-bg text-ui-text-muted border-ui-border';
}

export function statusTone(status: ControlPlaneVirtualMachine['status']): string {
  if (status === 'online') return 'border-status-success/25 bg-status-success-soft text-status-success-text';
  if (status === 'degraded') return 'border-status-warning/25 bg-status-warning-soft text-status-warning-text';
  if (status === 'offline') return 'border-status-danger/25 bg-status-danger-soft text-status-danger-text';
  return 'border border-ui-border bg-ui-bg text-ui-text-muted';
}

export function getVmStatusLabel(
  status: ControlPlaneVirtualMachine['status'],
  t: (key: string) => string
): string {
  if (status === 'online') return t('dashboard.healthy');
  if (status === 'degraded') return t('virtualMachines.list.degraded');
  if (status === 'offline') return t('virtualMachines.list.offline');
  return t('dashboard.setupRequired');
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

export function getVmCatalogStatusTone(vm: ControlPlaneVirtualMachine, issueSummary?: ControlPlaneTargetIssueSummary): string {
  if (vm.status === 'unknown') return statusTone(vm.status);
  if ((issueSummary?.critical ?? 0) > 0) {
    return 'border-status-danger/25 bg-status-danger-soft text-status-danger-text';
  }
  if ((issueSummary?.total ?? 0) > 0 && vm.status === 'online') {
    return 'border-status-warning/25 bg-status-warning-soft text-status-warning-text';
  }
  return statusTone(vm.status);
}

export function formatSnapshotTime(vm: ControlPlaneVirtualMachine): string {
  return vm.latestSnapshot?.timestamp || vm.updatedAt || 'Waiting for agent';
}

export function issueSeverityTone(severity: 'critical' | 'warning' | 'info'): string {
  if (severity === 'critical') return 'bg-status-danger-soft text-status-danger-text';
  if (severity === 'warning') return 'bg-status-warning-soft text-status-warning-text';
  return 'border border-ui-border bg-ui-surface-strong text-ui-text-muted';
}
