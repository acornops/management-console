import { describe, expect, it } from 'vitest';

import type { ControlPlaneTargetIssueSummary, ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import {
  getVmCatalogStatusLabel,
  getVmCatalogStatusReason,
  getVmCatalogStatusTone,
  getVmStatusLabel,
  vmMatchesConnectionFilter,
  vmNeedsAttention
} from '@/pages/virtual-machines/virtualMachineUi';

function vmWithStatus(
  status: ControlPlaneVirtualMachine['status'],
  summary?: ControlPlaneVirtualMachine['summary']
): ControlPlaneVirtualMachine {
  return {
    id: `vm-${status}`,
    workspaceId: 'workspace-a',
    name: `VM ${status}`,
    status,
    osFamily: 'linux',
    serviceManager: 'systemd',
    summary,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  };
}

describe('virtual machine connection filters', () => {
  const issueSummary = (overrides: Partial<ControlPlaneTargetIssueSummary> = {}): ControlPlaneTargetIssueSummary => ({
    total: 0,
    active: 0,
    recovering: 0,
    critical: 0,
    warning: 0,
    info: 0,
    ...overrides
  });

  it('maps AIOps posture filters onto VM health statuses', () => {
    expect(vmMatchesConnectionFilter(vmWithStatus('online'), 'healthy')).toBe(true);
    expect(vmMatchesConnectionFilter(vmWithStatus('degraded'), 'healthy')).toBe(false);
    expect(vmMatchesConnectionFilter(vmWithStatus('degraded'), 'attention')).toBe(true);
    expect(vmMatchesConnectionFilter(vmWithStatus('offline'), 'attention')).toBe(true);
    expect(vmMatchesConnectionFilter(vmWithStatus('unknown'), 'attention')).toBe(false);
    expect(vmMatchesConnectionFilter(vmWithStatus('unknown'), 'not_installed')).toBe(true);
  });

  it('keeps setup-required distinct from disconnected copy', () => {
    const t = (key: string) => key;

    expect(getVmStatusLabel('unknown', t)).toBe('dashboard.setupRequired');
    expect(getVmStatusLabel('offline', t)).toBe('virtualMachines.list.offline');
  });

  it('treats durable active issues as attention even while the VM is online', () => {
    const vm = vmWithStatus('online', {
      inventoryCount: 3,
      findingCount: 2,
      criticalFindingCount: 1,
      serviceCount: 4,
      processCount: 12,
      listenerCount: 5,
      logCount: 8
    });
    const issues = issueSummary({ total: 2, active: 2, critical: 1, warning: 1 });
    const t = (key: string, options?: Record<string, unknown>) => `${key}:${options?.count ?? ''}`;

    expect(vmNeedsAttention(vm, issues)).toBe(true);
    expect(vmMatchesConnectionFilter(vm, 'attention', issues)).toBe(true);
    expect(vmMatchesConnectionFilter(vm, 'healthy', issues)).toBe(false);
    expect(getVmCatalogStatusLabel(vm, issues, t)).toBe('dashboard.criticalStatus:1');
    expect(getVmCatalogStatusTone(vm, issues)).toContain('text-status-danger-text');
    expect(getVmCatalogStatusReason(vm, issues, 'ready', t)).toBe('virtualMachines.list.vmStateCriticalIssues:1');
  });

  it('does not turn raw snapshot findings into catalog issues', () => {
    const vm = vmWithStatus('online', {
      inventoryCount: 3,
      findingCount: 1,
      criticalFindingCount: 1,
      serviceCount: 4,
      processCount: 12,
      listenerCount: 5,
      logCount: 8
    });
    const noIssues = issueSummary();

    expect(vmNeedsAttention(vm, noIssues)).toBe(false);
    expect(vmMatchesConnectionFilter(vm, 'healthy', noIssues)).toBe(true);
    expect(getVmCatalogStatusLabel(vm, noIssues, (key) => key)).toBe('dashboard.healthy');
    expect(getVmCatalogStatusTone(vm, noIssues)).toContain('text-status-success-text');
  });

  it('keeps setup-required VMs out of attention regardless of incomplete summaries', () => {
    const vm = vmWithStatus('unknown', {
      inventoryCount: 0,
      findingCount: 2,
      criticalFindingCount: 1,
      serviceCount: 0,
      processCount: 0,
      listenerCount: 0,
      logCount: 0
    });

    expect(vmNeedsAttention(vm)).toBe(false);
    expect(vmMatchesConnectionFilter(vm, 'not_installed')).toBe(true);
    expect(getVmCatalogStatusLabel(vm, undefined, (key) => key)).toBe('dashboard.setupRequired');
    expect(getVmCatalogStatusTone(vm, undefined)).toContain('text-ui-text-muted');
  });
});
