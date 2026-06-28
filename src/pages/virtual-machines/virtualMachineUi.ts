import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';

export type VmConnectionFilter = 'all' | 'connected' | 'disconnected' | 'not_installed';

export function getVmApiStatusForConnectionFilter(
  filter: VmConnectionFilter
): ControlPlaneVirtualMachine['status'] | undefined {
  if (filter === 'disconnected') return 'offline';
  if (filter === 'not_installed') return 'unknown';
  return undefined;
}

export function vmMatchesConnectionFilter(vm: ControlPlaneVirtualMachine, filter: VmConnectionFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'connected') return vm.status === 'online' || vm.status === 'degraded';
  if (filter === 'disconnected') return vm.status === 'offline';
  return vm.status === 'unknown';
}

export function statusClass(status: ControlPlaneVirtualMachine['status']): string {
  if (status === 'online') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'degraded') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-ui-bg text-ui-text-muted border-ui-border';
}

export function statusTone(status: ControlPlaneVirtualMachine['status']): string {
  if (status === 'online') return 'bg-status-success-soft text-status-success-text';
  if (status === 'degraded') return 'bg-status-warning-soft text-status-warning-text';
  if (status === 'offline') return 'bg-status-danger-soft text-status-danger-text';
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

export function getVmPostureClass(attentionCount: number): string {
  if (attentionCount > 0) {
    return 'border-status-warning/25 bg-status-warning-soft text-status-warning-text';
  }
  return 'border-status-success/25 bg-status-success-soft text-status-success-text';
}

export function formatSnapshotTime(vm: ControlPlaneVirtualMachine): string {
  return vm.latestSnapshot?.timestamp || vm.updatedAt || 'Waiting for agent';
}

export function issueSeverityTone(severity: 'critical' | 'warning' | 'info'): string {
  if (severity === 'critical') return 'bg-status-danger-soft text-status-danger-text';
  if (severity === 'warning') return 'bg-status-warning-soft text-status-warning-text';
  return 'bg-sky-500/10 text-sky-600 dark:text-sky-300';
}
