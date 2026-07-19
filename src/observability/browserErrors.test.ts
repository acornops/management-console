import { describe, expect, it, vi } from 'vitest';
import { ControlPlaneRequestError } from '@/services/control-plane/http';
import { reportBrowserError } from './browserErrors';

describe('browser incident reporting', () => {
  it('sanitizes records, preserves request IDs, and deduplicates the same error', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new ControlPlaneRequestError(
      'secret token and response body', 503, 'UPSTREAM', { requestBody: 'secret' }, undefined, 'request-123'
    );

    const first = reportBrowserError(error, 'operation');
    const second = reportBrowserError(error, 'react-boundary');

    expect(second).toBe(first);
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith({
      event: 'management_console_browser_error',
      incidentId: first,
      source: 'operation',
      errorType: 'ControlPlaneRequestError',
      status: 503,
      requestId: 'request-123'
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret');
  });
});
