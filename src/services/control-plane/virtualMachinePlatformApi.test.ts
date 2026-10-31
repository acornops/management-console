import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestJson } = vi.hoisted(() => ({ requestJson: vi.fn() }));
vi.mock('./http', async (original) => ({
  ...await original<typeof import('./http')>(),
  requestJson
}));

beforeEach(() => vi.clearAllMocks());

describe('VM platform API', () => {
  it('discovers server-authorized Windows registration and sends its explicit immutable identity', async () => {
    requestJson.mockResolvedValueOnce({ platforms: [{ osFamily: 'linux', serviceManager: 'systemd', accessModes: ['read_only', 'read_write'] }, { osFamily: 'windows', serviceManager: 'scm', accessModes: ['read_only'] }] });
    const { controlPlaneApi } = await import('../controlPlaneApi');
    expect(await controlPlaneApi.getVirtualMachineRegistrationOptions('workspace 1')).toEqual({ platforms: [{ osFamily: 'linux', serviceManager: 'systemd', accessModes: ['read_only', 'read_write'] }, { osFamily: 'windows', serviceManager: 'scm', accessModes: ['read_only'] }] });
    expect(requestJson).toHaveBeenLastCalledWith('/api/v1/workspaces/workspace%201/virtual-machines/registration-options');
    requestJson.mockResolvedValueOnce({
      virtualMachine: { id: 'win-1', osFamily: 'windows', serviceManager: 'scm', agentAccessMode: 'read_only', restartServices: [], permissionMode: 'ask_before_changes', permissionModeOverride: null, permissionModeSource: 'deployment_default' },
      installInstructions: { command: "powershell.exe -NoProfile -File 'install-agentv.ps1'", releaseVersion: '1.0.0', bootstrapUrl: 'https://example.invalid/install-agentv.ps1', warnings: [] }
    });
    const input = { name: 'Windows', osFamily: 'windows' as const, serviceManager: 'scm' as const, agentAccessMode: 'read_only' as const, restartServices: [] };
    expect(await controlPlaneApi.registerVirtualMachine('workspace 1', input)).toMatchObject({ virtualMachine: { osFamily: 'windows', serviceManager: 'scm' }, installInstructions: { command: "powershell.exe -NoProfile -File 'install-agentv.ps1'" } });
    expect(requestJson).toHaveBeenLastCalledWith('/api/v1/workspaces/workspace%201/virtual-machines', { method: 'POST', body: JSON.stringify(input) });
  });

  it('requests native Windows channels while preserving the Linux log query', async () => {
    requestJson.mockResolvedValue({ entries: [] });
    const { controlPlaneApi } = await import('../controlPlaneApi');
    await controlPlaneApi.getVirtualMachineLogs('ws-1', 'win-1', { channel: 'System' });
    expect(requestJson).toHaveBeenLastCalledWith('/api/v1/workspaces/ws-1/virtual-machines/win-1/logs?channel=System');
    await controlPlaneApi.getVirtualMachineLogs('ws-1', 'linux-1');
    expect(requestJson).toHaveBeenLastCalledWith('/api/v1/workspaces/ws-1/virtual-machines/linux-1/logs');
    await controlPlaneApi.getVirtualMachineLogs('ws-1', 'linux-1', { source: 'journald', q: 'error' });
    expect(requestJson).toHaveBeenLastCalledWith('/api/v1/workspaces/ws-1/virtual-machines/linux-1/logs?q=error&source=journald');
  });
});

for (const status of ['permission_denied', 'unavailable', 'partial']) {
  it(`retains successful Windows log ${status} counts and removes untrusted health text`, async () => {
    requestJson.mockResolvedValueOnce({ entries: [{ message: 'kept' }], health: { status, message: '<script>unsafe</script>', collector: 'arbitrary' },
      truncated: true, returned_count: 1, original_count: 2, byte_count: 100 });
    const { controlPlaneApi } = await import('../controlPlaneApi');
    expect(await controlPlaneApi.getVirtualMachineLogs('ws', 'vm', { channel: 'System' })).toEqual({
      entries: [{ message: 'kept' }], health: { status }, truncated: true, returned_count: 1, original_count: 2, byte_count: 100
    });
  });
}
it('keeps Linux envelopes exact and bounds unknown Windows health and invalid counts', async () => {
  const { controlPlaneApi } = await import('../controlPlaneApi');
  const payload = { entries: [], source: 'journald', truncated: false };
  requestJson.mockResolvedValueOnce(payload);
  expect(await controlPlaneApi.getVirtualMachineLogs('ws', 'linux')).toEqual(payload);
  requestJson.mockResolvedValueOnce({ entries: [], health: { status: '<script>unsafe</script>' }, returned_count: -1, original_count: 1e30, byte_count: '100' });
  expect(await controlPlaneApi.getVirtualMachineLogs('ws', 'windows', { channel: 'System' })).toEqual({ entries: [],
    health: { status: 'unknown' }, truncated: undefined, returned_count: undefined, original_count: undefined, byte_count: undefined });
});
it('binds inventory evidence to the requested workspace, target and every row timestamp', async () => {
  const { controlPlaneApi } = await import('../controlPlaneApi');
  const snapshotTs = '2026-10-31T01:00:00.000Z';
  const collectionStatus = { workspaceId: 'ws', targetId: 'vm', snapshotTs,
    categories: { processes: { status: 'partial', omittedCount: 3 }, services: { status: 'permission_denied', findingCoverage: 'incomplete' } } };
  const items = [{ name: 'kept', snapshotTs }];
  requestJson.mockResolvedValueOnce({ items, collectionStatus });
  const response = await controlPlaneApi.listVirtualMachineInventory('ws', 'vm');
  expect(response.items).toEqual(items);
  expect(response.collectionStatus).toMatchObject({ workspaceId: 'ws', targetId: 'vm', snapshotTs,
    categories: { host: { status: 'unknown' }, services: { status: 'permission_denied' }, processes: { status: 'partial', omittedCount: 3 } } });
  for (const change of [{ workspaceId: 'other' }, { targetId: 'other' }, { snapshotTs: '2026-10-31T02:00:00.000Z' }]) {
    requestJson.mockResolvedValueOnce({ items, collectionStatus: { ...collectionStatus, ...change } });
    expect((await controlPlaneApi.listVirtualMachineInventory('ws', 'vm')).collectionStatus).toBeNull();
  }
});
