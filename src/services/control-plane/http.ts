import { ControlPlaneRunEvent } from './types';
import { emitSessionExpired } from './sessionLifecycle';

const CSRF_COOKIE_NAME = 'acornops_cp_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';
let csrfTokenRequest: Promise<string> | null = null;
let cachedCsrfToken = '';

export class ControlPlaneRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: Record<string, unknown>,
    readonly retryAfterSeconds?: number,
    readonly requestId?: string
  ) {
    super(message);
    this.name = 'ControlPlaneRequestError';
  }
}

const MAX_RETRY_AFTER_SECONDS = 60 * 60;

export function parseRetryAfterSeconds(value: string | null, nowMs = Date.now()): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const numericSeconds = Number(trimmed);
  const rawSeconds = Number.isFinite(numericSeconds) && numericSeconds >= 0
    ? Math.ceil(numericSeconds)
    : Math.ceil((Date.parse(trimmed) - nowMs) / 1000);
  if (!Number.isFinite(rawSeconds) || rawSeconds <= 0) return undefined;
  return Math.min(rawSeconds, MAX_RETRY_AFTER_SECONDS);
}

export function normalizeBaseUrl(value: string): string {
  if (!value) return '';
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export function resolveControlPlaneBaseUrl(configuredBaseUrl: string | undefined, production: boolean): string {
  return normalizeBaseUrl(configuredBaseUrl === undefined
    ? production ? '' : 'http://localhost:8081'
    : configuredBaseUrl);
}

export function getControlPlaneBaseUrl(): string {
  return resolveControlPlaneBaseUrl(
    import.meta.env.VITE_CONTROL_PLANE_API_BASE_URL,
    import.meta.env.PROD
  );
}

export function getControlPlaneUrl(path: string): URL {
  const baseUrl = getControlPlaneBaseUrl();
  if (baseUrl) return new URL(path, baseUrl);
  return new URL(path, window.location.origin);
}

function readCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const prefix = `${name}=`;
  const entry = document.cookie
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : '';
}

async function getCsrfToken(sessionExpiry: SessionExpiryBehavior): Promise<string> {
  const existing = readCookie(CSRF_COOKIE_NAME);
  if (existing) return existing;
  if (cachedCsrfToken) return cachedCsrfToken;
  if (!csrfTokenRequest) {
    csrfTokenRequest = fetch(`${getControlPlaneBaseUrl()}/api/v1/auth/csrf`, {
      credentials: 'include',
      cache: 'no-store'
    })
      .then(async (response) => {
        if (!response.ok) {
          await throwControlPlaneResponseError(response, sessionExpiry);
        }
        const body = (await response.json()) as { csrfToken?: string };
        if (!body.csrfToken) {
          throw new Error('CSRF token response was missing a token');
        }
        cachedCsrfToken = body.csrfToken;
        return body.csrfToken;
      })
      .finally(() => {
        csrfTokenRequest = null;
      });
  }
  return csrfTokenRequest;
}

export type SessionExpiryBehavior = 'notify' | 'ignore';

async function throwControlPlaneResponseError(
  response: Response,
  sessionExpiry: SessionExpiryBehavior = 'notify'
): Promise<never> {
  const requestId = response.headers.get('x-request-id') || undefined;
  if (response.status === 401) {
    if (sessionExpiry === 'notify') emitSessionExpired(requestId);
    throw new ControlPlaneRequestError('Control plane request was unauthorized', 401, 'UNAUTHORIZED', undefined, undefined, requestId);
  }
  const body = await response.text();
  let message = body.trim();
  let code: string | undefined;
  let details: Record<string, unknown> | undefined;
  if (message) {
    try {
      const parsed = JSON.parse(message) as {
        error?: string | { message?: string; detail?: string; code?: string; details?: Record<string, unknown> };
        message?: string;
        detail?: string;
      };
      if (typeof parsed.error === 'object' && parsed.error) {
        code = parsed.error.code;
        details = parsed.error.details;
        message = parsed.error.message || parsed.error.detail || parsed.error.code || message;
      } else if (typeof parsed.error === 'string') {
        message = parsed.error;
      } else {
        message = parsed.message || parsed.detail || message;
      }
    } catch {
      // Keep the raw body for non-JSON responses.
    }
  }
  throw new ControlPlaneRequestError(
    `Control plane request failed (${response.status}): ${message || response.statusText}`,
    response.status,
    code,
    details,
    response.status === 429
      ? parseRetryAfterSeconds(response.headers.get('retry-after'))
      : undefined,
    requestId
  );
}

export type ControlPlaneRequestInit = RequestInit & { sessionExpiry?: SessionExpiryBehavior };

export async function requestJson<T>(path: string, init?: ControlPlaneRequestInit): Promise<T> {
  const method = (init?.method || 'GET').toUpperCase();
  const { sessionExpiry = 'notify', ...fetchInit } = init || {};
  const requestInit: RequestInit = {
    ...fetchInit,
    credentials: 'include'
  };
  const headers = new Headers(init?.headers);
  headers.set('content-type', 'application/json');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers.set(CSRF_HEADER_NAME, await getCsrfToken(sessionExpiry));
  }
  requestInit.headers = headers;
  if ((method === 'GET' || method === 'HEAD') && requestInit.cache === undefined) {
    requestInit.cache = 'no-store';
  }
  const response = await fetch(`${getControlPlaneBaseUrl()}${path}`, requestInit);

  if (!response.ok) {
    return throwControlPlaneResponseError(response, sessionExpiry);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/** Fetch a bounded redacted artifact as JSON or text using the user session. */
export async function requestArtifact(path: string): Promise<unknown> {
  const response = await fetch(`${getControlPlaneBaseUrl()}${path}`, {
    credentials: 'include',
    cache: 'no-store'
  });
  if (!response.ok) {
    return throwControlPlaneResponseError(response);
  }
  const body = await response.text();
  if (response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    try {
      return JSON.parse(body) as unknown;
    } catch {
      throw new ControlPlaneRequestError('Control plane returned an invalid JSON artifact', 502);
    }
  }
  return body;
}

export function clearControlPlaneCsrfState(): void {
  cachedCsrfToken = '';
  csrfTokenRequest = null;
}

export async function requestEventStream<T>(
  path: string,
  options?: {
    signal?: AbortSignal;
    onEvent?: (event: T) => void;
    sessionExpiry?: SessionExpiryBehavior;
  }
): Promise<void> {
  try {
    const response = await fetch(`${getControlPlaneBaseUrl()}${path}`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: { accept: 'text/event-stream' },
      signal: options?.signal
    });
    if (!response.ok) {
      await throwControlPlaneResponseError(response, options?.sessionExpiry);
    }
    await readJsonEventStream<T>(response, options?.onEvent);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    throw error;
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function readJsonEventStream<T>(
  response: Response,
  onEvent?: (event: T) => void
): Promise<void> {
  if (!response.body) {
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let dataLines: string[] = [];

  const emitDataLines = () => {
    if (dataLines.length === 0) return;
    const payload = dataLines.join('\n');
    dataLines = [];
    try {
      const parsed = JSON.parse(payload) as T;
      onEvent?.(parsed);
    } catch {
      // Ignore malformed frames.
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const newlineIndex = buffer.indexOf('\n');
      if (newlineIndex === -1) break;
      const rawLine = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;

      if (line.length === 0) {
        emitDataLines();
        continue;
      }
      if (line.startsWith(':')) continue;
      if (line.startsWith('data:')) {
        dataLines.push(line.slice('data:'.length).trimStart());
      }
    }
  }

  if (buffer.trim().length > 0 && buffer.startsWith('data:')) {
    dataLines.push(buffer.slice('data:'.length).trimStart());
  }
  emitDataLines();
}

export async function readRunEventStream(
  response: Response,
  onEvent?: (event: ControlPlaneRunEvent) => void
): Promise<void> {
  return readJsonEventStream<ControlPlaneRunEvent>(response, onEvent);
}
