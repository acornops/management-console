import { describe, expect, it } from 'vitest';

import {
  isSafeMcpOAuthCallbackResult,
  mcpVerificationKind,
  oauthAuthorizationCompletedDespiteVerificationFailure
} from './mcpVerificationPresentation';

describe('MCP verification presentation', () => {
  it('maps only provider-neutral verification codes', () => {
    expect(mcpVerificationKind('MCP_ENDPOINT_NOT_FOUND')).toBe('endpointNotFound');
    expect(mcpVerificationKind('MCP_DISCOVERY_TIMEOUT')).toBe('discoveryTimeout');
    expect(mcpVerificationKind('MCP_DISCOVERY_INVALID_RESPONSE')).toBe('protocolError');
    expect(mcpVerificationKind('GITLAB_GROUP_NOT_FOUND')).toBe('toolDiscoveryFailed');
  });

  it('accepts OAuth and allowlisted verification callback results', () => {
    expect(isSafeMcpOAuthCallbackResult('MCP_OAUTH_AUTHORIZATION_DENIED')).toBe(true);
    expect(isSafeMcpOAuthCallbackResult('MCP_ENDPOINT_NOT_FOUND')).toBe(true);
    expect(isSafeMcpOAuthCallbackResult('MCP_UNTRUSTED_PROVIDER_DETAIL')).toBe(false);
  });

  it('separates completed OAuth from downstream endpoint verification', () => {
    expect(oauthAuthorizationCompletedDespiteVerificationFailure(
      'error',
      'MCP_ENDPOINT_NOT_FOUND'
    )).toBe(true);
    expect(oauthAuthorizationCompletedDespiteVerificationFailure(
      'error',
      'MCP_AUTHENTICATION_REJECTED'
    )).toBe(false);
    expect(oauthAuthorizationCompletedDespiteVerificationFailure(
      'error',
      'MCP_UNTRUSTED_PROVIDER_DETAIL'
    )).toBe(false);
  });
});
