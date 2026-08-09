import { describe, expect, it, vi } from 'vitest';
import { copyAgentVInstallCommand } from './useAgentVInstallCommand';

describe('AgentV install command copying', () => {
  it('copies only the executable command', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const command = "set -o pipefail; curl 'https://example.test/install-agentv.sh' | sudo bash";

    await copyAgentVInstallCommand(command, writeText);

    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith(command);
  });
});
