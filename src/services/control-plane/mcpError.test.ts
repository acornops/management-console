import { describe, expect, it } from 'vitest';

import { ControlPlaneRequestError } from './http';
import { formatMcpError } from './mcpError';

describe('formatMcpError', () => {
  it('uses one MCP formatter for bounded rate-limit guidance', () => {
    const error = new ControlPlaneRequestError(
      'Control plane request failed (429): Wait before retrying.',
      429,
      'MCP_CONNECTION_RATE_LIMITED',
      undefined,
      8
    );

    expect(formatMcpError(error, 'Connection failed.')).toEqual({
      message: 'Too many attempts. Wait a moment and try again. Try again in 8 seconds.',
      retryAfterSeconds: 8
    });
  });

  it('shows bounded sanitized OAuth protocol errors returned by the control plane', () => {
    const error = new ControlPlaneRequestError(
      'Control plane request failed (400): The MCP server did not publish valid protected resource metadata.',
      400,
      'MCP_OAUTH_PROTECTED_RESOURCE_METADATA_MISSING'
    );

    expect(formatMcpError(error, 'OAuth configuration could not be prepared.')).toEqual({
      message: 'The MCP server did not publish valid protected resource metadata.'
    });
  });

  it('does not show malformed OAuth protocol error text', () => {
    const error = new ControlPlaneRequestError(
      'Control plane request failed (400): unsafe\nsecond line',
      400,
      'MCP_OAUTH_METADATA_INVALID'
    );

    expect(formatMcpError(error, 'OAuth configuration could not be prepared.')).toEqual({
      message: 'Check the MCP server URL, headers, and auth settings.'
    });
  });
});
