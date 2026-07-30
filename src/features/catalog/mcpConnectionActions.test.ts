import { describe, expect, it } from 'vitest';

import {
  mcpConnectAction,
  showsMcpConnectionAction
} from '@/features/catalog/mcpConnectionActions';

describe('MCP connection actions', () => {
  it('does not offer authorization after an OAuth connection is connected', () => {
    expect(showsMcpConnectionAction('oauth', undefined)).toBe(false);
    expect(showsMcpConnectionAction('oauth', 'verify_mcp_server')).toBe(false);
  });

  it('preserves authorization and static credential actions', () => {
    expect(showsMcpConnectionAction('oauth', 'authorize_mcp_server')).toBe(true);
    expect(showsMcpConnectionAction('oauth', 'reauthorize_mcp_server')).toBe(true);
    expect(showsMcpConnectionAction('bearer_token', undefined)).toBe(true);
    expect(mcpConnectAction('oauth', 'select_authorization_server'))
      .toBe('select_authorization_server');
  });
});
