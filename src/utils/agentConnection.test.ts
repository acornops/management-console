import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseControlPlaneVirtualMachine } from '@/services/control-plane/virtualMachineTypes';
import { mapControlPlaneClusterToKubernetesCluster } from '@/services/control-plane/clusterMappers';
import { getAgentConnectionState, getTelemetryFreshness } from '@/utils/telemetry';
import { getVmCatalogStatusLabel, getVmCatalogStatusTone, vmMatchesConnectionFilter, vmNeedsAttention } from '@/pages/virtual-machines/virtualMachineUi';
import { toVirtualMachineTargetDescriptor } from '@/features/targets/targetDescriptor';

const receipt = Date.parse('2030-01-01T00:00:00Z'); // Deliberately different from the server clock.
const observation = { state: 'connected', lastHeartbeatAt: '2026-11-02T00:00:00Z',
  observedAt: '2026-11-02T00:00:30Z', expiresAt: '2026-11-02T00:02:00Z' };
const rawVm = { id: 'vm', workspaceId: 'workspace', name: 'VM', status: 'online',
  agentAccessMode: 'read_only', restartServices: [], pendingAgentAccessPolicy: null,
  permissionMode: 'read_only', permissionModeOverride: null, permissionModeSource: 'deployment_default',
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
const t = (key: string) => key;
afterEach(() => vi.useRealTimers());

describe('cached agent connection observations', () => {
  for (const osFamily of ['linux', 'windows']) it(`${osFamily} ages remaining server validity and preserves health and onboarding`, () => {
    vi.useFakeTimers(); vi.setSystemTime(receipt);
    const vm = parseControlPlaneVirtualMachine({ ...rawVm, osFamily, serviceManager: osFamily === 'linux' ? 'systemd' : 'scm', connection: observation });
    expect(vmMatchesConnectionFilter(vm, 'healthy')).toBe(true);
    vi.setSystemTime(receipt + 89_999);
    expect(toVirtualMachineTargetDescriptor(vm).agentConnectionState).toBe('connected');
    // Rehydration is not a new API receipt and must not extend this deadline.
    const cached = JSON.parse(JSON.stringify(vm));
    vi.setSystemTime(receipt + 90_000);
    expect(vmNeedsAttention(cached)).toBe(true);
    expect(vmMatchesConnectionFilter(cached, 'healthy')).toBe(false);
    expect(vmMatchesConnectionFilter(cached, 'not_installed')).toBe(false);
    expect(getVmCatalogStatusLabel(cached, undefined, t)).toBe('virtualMachines.list.offline');
    expect(getVmCatalogStatusTone(cached)).toBe('danger');
    expect(toVirtualMachineTargetDescriptor(cached).agentConnectionState).toBe('disconnected');
    expect(cached.status).toBe('online');
  });

  it('keeps a fresh degraded VM connected and preserves its warning', () => {
    vi.useFakeTimers(); vi.setSystemTime(receipt);
    const vm = parseControlPlaneVirtualMachine({ ...rawVm, status: 'degraded', connection: observation });
    expect(toVirtualMachineTargetDescriptor(vm).agentConnectionState).toBe('connected');
    expect(vmNeedsAttention(vm)).toBe(true);
    expect(getVmCatalogStatusLabel(vm, undefined, t)).toBe('virtualMachines.list.degraded');
  });

  for (const connection of [null, {}, { ...observation, state: 'invalid' },
    { ...observation, observedAt: 'invalid' }, { ...observation, lastHeartbeatAt: '2099-01-01T00:00:00Z' },
    { ...observation, expiresAt: '2099-01-01T00:00:00Z' }]) {
    it(`fails malformed observations to unavailable: ${JSON.stringify(connection)}`, () => {
      const vm = parseControlPlaneVirtualMachine({ ...rawVm, connection });
      expect(getVmCatalogStatusLabel(vm, undefined, t)).toBe('dashboard.unavailable');
      expect(vmMatchesConnectionFilter(vm, 'healthy')).toBe(false);
      expect(vmMatchesConnectionFilter(vm, 'not_installed')).toBe(false);
    });
  }

  it('preserves legacy payloads and never-connected onboarding', () => {
    expect(vmMatchesConnectionFilter(parseControlPlaneVirtualMachine(rawVm), 'healthy')).toBe(true);
    const vm = parseControlPlaneVirtualMachine({ ...rawVm, status: 'unknown', connection: {
      state: 'unknown', lastHeartbeatAt: null, observedAt: observation.observedAt, expiresAt: null
    } });
    expect(vmMatchesConnectionFilter(vm, 'not_installed')).toBe(true);
  });

  it('ages Kubernetes connections independently of snapshot availability', () => {
    vi.useFakeTimers(); vi.setSystemTime(receipt);
    const cluster = mapControlPlaneClusterToKubernetesCluster({ id: 'cluster', workspaceId: 'workspace', name: 'Cluster', status: 'degraded', connection: observation });
    expect(getAgentConnectionState(cluster)).toBe('connected');
    vi.setSystemTime(receipt + 90_000);
    expect(getAgentConnectionState(cluster)).toBe('disconnected');
    expect(getTelemetryFreshness(cluster)).toBe('offline');
  });

  it('keeps missing evidence distinct from Kubernetes installation', () => {
    const unknown = { state: 'unknown', lastHeartbeatAt: null, observedAt: observation.observedAt, expiresAt: null };
    const cluster = { id: 'cluster', workspaceId: 'workspace', name: 'Cluster', status: 'online' as const, connection: unknown };
    expect(getAgentConnectionState(mapControlPlaneClusterToKubernetesCluster(cluster))).toBe('unknown');
    expect(getAgentConnectionState(mapControlPlaneClusterToKubernetesCluster({ ...cluster, status: 'offline', connection: { ...unknown, state: 'disconnected' } }))).toBe('not_installed');
  });

  it('does not turn rejected backend evidence into VM or Kubernetes onboarding', () => {
    const rejected = { state: 'unknown', lastHeartbeatAt: null, observedAt: observation.observedAt,
      expiresAt: null, hasConnectionEvidence: true };
    const vm = parseControlPlaneVirtualMachine({ ...rawVm, status: 'unknown', connection: rejected });
    expect(vmMatchesConnectionFilter(vm, 'not_installed')).toBe(false);
    expect(getVmCatalogStatusLabel(vm, undefined, t)).toBe('dashboard.unavailable');
    const cluster = mapControlPlaneClusterToKubernetesCluster({ id: 'cluster', workspaceId: 'workspace', name: 'Cluster',
      status: 'offline', connection: { ...rejected, state: 'disconnected' } });
    expect(getAgentConnectionState(cluster)).toBe('disconnected');
  });
});
