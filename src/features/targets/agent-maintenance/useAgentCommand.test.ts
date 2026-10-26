import { describe, expect, it, vi } from 'vitest';
import { copyAgentCommand } from './useAgentCommand';

describe('Agent command copying', () => {
  it('copies only the executable command', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const command = "set -o pipefail; curl 'https://example.test/install-agentv.sh' | sudo bash";

    await copyAgentCommand(command, writeText);

    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith(command);
  });
});
