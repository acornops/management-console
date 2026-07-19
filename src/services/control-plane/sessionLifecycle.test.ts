import { describe, expect, it, vi } from 'vitest';
import {
  emitSessionExpired,
  setAuthenticatedSession,
  subscribeToSessionExpiry
} from './sessionLifecycle';

describe('authenticated session lifecycle', () => {
  it('coalesces authenticated 401 transitions and rearms for a later session', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToSessionExpiry(listener);
    setAuthenticatedSession(true);

    expect(emitSessionExpired('request-1')).toBe(true);
    expect(emitSessionExpired('request-2')).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ type: 'session-expired', requestId: 'request-1' });

    setAuthenticatedSession(true);
    expect(emitSessionExpired()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    setAuthenticatedSession(false);
  });

  it('ignores unauthorized responses before a session is authenticated', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToSessionExpiry(listener);
    setAuthenticatedSession(false);
    expect(emitSessionExpired()).toBe(false);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});
