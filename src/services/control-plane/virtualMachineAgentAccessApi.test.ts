import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestJson } = vi.hoisted(() => ({ requestJson: vi.fn() }));

vi.mock('./http', () => ({ requestJson }));

import { createVirtualMachineAgentAccessPolicyUpdate } from './virtualMachineAgentAccessApi';

describe('virtual machine AgentV host access API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a pending host policy update and parses its command', async () => {
    requestJson.mockResolvedValue({
      virtualMachine: {
        id: 'vm-1', workspaceId: 'workspace-1', name: 'prod-vm', status: 'online',
        osFamily: 'linux', serviceManager: 'systemd', agentAccessMode: 'read_only', restartServices: [],
        pendingAgentAccessPolicy: { accessMode: 'read_write', restartServices: ['worker.service'] },
        permissionMode: 'ask_before_changes', permissionModeOverride: null,
        permissionModeSource: 'deployment_default', createdAt: '2026-08-09T00:00:00.000Z',
        updatedAt: '2026-08-09T00:01:00.000Z'
      },
      installInstructions: {
        command: 'set -o pipefail; curl example | sudo bash --replace-credential',
        releaseVersion: '0.0.1-experimental.6',
        bootstrapUrl: 'https://example.test/install-agentv.sh',
        warnings: ['Contains a one-use token.'],
        enrollmentExpiresAt: '2026-08-09T12:15:00.000Z'
      }
    });

    await expect(createVirtualMachineAgentAccessPolicyUpdate(
      'workspace-1', 'vm-1', { agentAccessMode: 'read_write', restartServices: ['worker.service'] }
    )).resolves.toMatchObject({
      virtualMachine: {
        agentAccessMode: 'read_only',
        pendingAgentAccessPolicy: { accessMode: 'read_write', restartServices: ['worker.service'] }
      },
      installInstructions: { releaseVersion: '0.0.1-experimental.6' }
    });
    expect(requestJson).toHaveBeenCalledWith(
      '/api/v1/workspaces/workspace-1/virtual-machines/vm-1/agent-access-policy-updates',
      { method: 'POST', body: JSON.stringify({ agentAccessMode: 'read_write', restartServices: ['worker.service'] }) }
    );
  });
});
