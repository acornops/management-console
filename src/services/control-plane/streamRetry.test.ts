import { describe, expect, it } from 'vitest';
import { ControlPlaneRequestError } from './http';
import { streamReconnectDelay } from './streamRetry';

const delays = [250, 1000, 3000] as const;

describe('SSE retry classification', () => {
  it('stops immediately for authentication and authorization failures', () => {
    expect(streamReconnectDelay(new ControlPlaneRequestError('unauthorized', 401), 0, delays)).toBeNull();
    expect(streamReconnectDelay(new ControlPlaneRequestError('forbidden', 403), 0, delays)).toBeNull();
  });

  it('uses capped delays and a bounded attempt count for network and 5xx failures', () => {
    expect(streamReconnectDelay(new TypeError('network'), 0, delays)).toBe(250);
    expect(streamReconnectDelay(new ControlPlaneRequestError('upstream', 503), 3, delays)).toBe(3000);
    expect(streamReconnectDelay(new ControlPlaneRequestError('upstream', 503), 5, delays)).toBeNull();
    expect(streamReconnectDelay(new ControlPlaneRequestError('not found', 404), 0, delays)).toBeNull();
  });
});
