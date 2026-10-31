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
