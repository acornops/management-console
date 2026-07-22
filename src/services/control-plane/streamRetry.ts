import { ControlPlaneRequestError } from './http';

export const MAX_STREAM_RECONNECT_ATTEMPTS = 5;

export function isStreamAuthorizationFailure(error: unknown): boolean {
  return error instanceof ControlPlaneRequestError && (error.status === 401 || error.status === 403);
}

export function isTransientStreamFailure(error: unknown): boolean {
  if (error === undefined) return true;
  if (error instanceof TypeError) return true;
  return error instanceof ControlPlaneRequestError && error.status >= 500;
}

export function streamReconnectDelay(error: unknown, attempt: number, delays: readonly number[]): number | null {
  if (isStreamAuthorizationFailure(error) || !isTransientStreamFailure(error)) return null;
  if (attempt >= MAX_STREAM_RECONNECT_ATTEMPTS) return null;
  return delays[Math.min(attempt, delays.length - 1)] ?? null;
}
