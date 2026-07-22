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
});
