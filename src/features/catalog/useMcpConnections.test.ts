import { describe, expect, it } from 'vitest';

import { mcpConnectionsToLoad } from './useMcpConnections';

describe('mcpConnectionsToLoad', () => {
  it('loads credentials only for authenticated workspace-managed installations', () => {
    const installations = [
      { id: 'local-auth', credentialMode: 'individual' as const },
      { id: 'platform-default', credentialMode: 'individual' as const, inherited: true },
      { id: 'native', credentialMode: 'workspace' as const, isSystem: true },
      { id: 'no-auth', credentialMode: 'none' as const }
    ];

    expect(mcpConnectionsToLoad(installations).map((installation) => installation.id)).toEqual(['local-auth']);
  });
});
