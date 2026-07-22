export interface SessionExpiredEvent {
  type: 'session-expired';
  requestId?: string;
}

export type SessionExpiryListener = (event: SessionExpiredEvent) => void;

const listeners = new Set<SessionExpiryListener>();
let authenticated = false;
let expiryEmitted = false;

export function setAuthenticatedSession(active: boolean): void {
  if (active && !authenticated) expiryEmitted = false;
  authenticated = active;
  if (!active) expiryEmitted = false;
}

export function emitSessionExpired(requestId?: string): boolean {
  if (!authenticated || expiryEmitted) return false;
  expiryEmitted = true;
  authenticated = false;
  const event: SessionExpiredEvent = { type: 'session-expired', requestId };
  listeners.forEach((listener) => listener(event));
  return true;
}

export function subscribeToSessionExpiry(listener: SessionExpiryListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const RETURN_PATH_KEY = 'acornops.session.returnPath';

export function preserveSessionReturnPath(location: Pick<Location, 'pathname' | 'search' | 'hash'>): string {
  const path = `${location.pathname}${location.search}${location.hash}`;
  try {
    window.sessionStorage.setItem(RETURN_PATH_KEY, path);
  } catch {
    // Route state still remains in the address bar when storage is unavailable.
  }
  return path;
}

export function consumeSessionReturnPath(): string | null {
  try {
    const path = window.sessionStorage.getItem(RETURN_PATH_KEY);
    window.sessionStorage.removeItem(RETURN_PATH_KEY);
    return path?.startsWith('/') && !path.startsWith('//') ? path : null;
  } catch {
    return null;
  }
}

export function clearSessionReturnPath(): void {
  try {
    window.sessionStorage.removeItem(RETURN_PATH_KEY);
  } catch {
    // Storage is optional.
  }
}
