import { describe, expect, it } from 'vitest';

import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import {
  getVmApiStatusForConnectionFilter,
  getVmStatusLabel,
  vmMatchesConnectionFilter
} from '@/pages/virtual-machines/virtualMachineUi';

function vmWithStatus(status: ControlPlaneVirtualMachine['status']): ControlPlaneVirtualMachine {
  return {
    id: `vm-${status}`,
    workspaceId: 'workspace-a',
    name: `VM ${status}`,
    status,
    osFamily: 'linux',
    serviceManager: 'systemd',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  };
}

describe('virtual machine connection filters', () => {
  it('maps lifecycle filters onto VM health statuses', () => {
    expect(vmMatchesConnectionFilter(vmWithStatus('online'), 'connected')).toBe(true);
    expect(vmMatchesConnectionFilter(vmWithStatus('degraded'), 'connected')).toBe(true);
    expect(vmMatchesConnectionFilter(vmWithStatus('offline'), 'connected')).toBe(false);
    expect(vmMatchesConnectionFilter(vmWithStatus('unknown'), 'connected')).toBe(false);

    expect(vmMatchesConnectionFilter(vmWithStatus('offline'), 'disconnected')).toBe(true);
    expect(vmMatchesConnectionFilter(vmWithStatus('unknown'), 'not_installed')).toBe(true);
  });

  it('only sends exact server filters where one lifecycle state maps to one VM status', () => {
    expect(getVmApiStatusForConnectionFilter('connected')).toBeUndefined();
    expect(getVmApiStatusForConnectionFilter('all')).toBeUndefined();
    expect(getVmApiStatusForConnectionFilter('disconnected')).toBe('offline');
    expect(getVmApiStatusForConnectionFilter('not_installed')).toBe('unknown');
  });

  it('keeps setup-required distinct from disconnected copy', () => {
    const t = (key: string) => key;

    expect(getVmStatusLabel('unknown', t)).toBe('dashboard.setupRequired');
    expect(getVmStatusLabel('offline', t)).toBe('virtualMachines.list.offline');
  });
});
