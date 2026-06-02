import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getControlPlaneBaseUrl,
  getControlPlaneUrl,
  normalizeBaseUrl,
  readRunEventStream,
  requestJson
} from './http';

describe('control-plane http helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (globalThis as { window?: unknown }).window;
  });

  it('normalizes the configured base URL', () => {
    const env = import.meta.env as Record<string, unknown>;
    const previous = env.VITE_CONTROL_PLANE_API_BASE_URL;
    Reflect.deleteProperty(env, 'VITE_CONTROL_PLANE_API_BASE_URL');

    expect(normalizeBaseUrl('')).toBe('');
    expect(normalizeBaseUrl('https://control-plane.example.com/')).toBe('https://control-plane.example.com');
    expect(normalizeBaseUrl('https://control-plane.example.com')).toBe('https://control-plane.example.com');
    expect(getControlPlaneBaseUrl()).toBe('http://localhost:8081');

    env.VITE_CONTROL_PLANE_API_BASE_URL = previous;
  });

  it('falls back to window origin when there is no configured base URL', () => {
    (globalThis as { window?: { location: { origin: string } } }).window = {
      location: { origin: 'https://console.example.com' }
    };
    const env = import.meta.env as Record<string, unknown>;
    const previous = env.VITE_CONTROL_PLANE_API_BASE_URL;
    env.VITE_CONTROL_PLANE_API_BASE_URL = '';

    try {
      expect(getControlPlaneUrl('/api/v1/me').toString()).toBe('https://console.example.com/api/v1/me');
    } finally {
      env.VITE_CONTROL_PLANE_API_BASE_URL = previous;
    }
  });

  it('sends JSON requests with default headers and cache policy', async () => {
    const env = import.meta.env as Record<string, unknown>;
    const previous = env.VITE_CONTROL_PLANE_API_BASE_URL;
    env.VITE_CONTROL_PLANE_API_BASE_URL = 'http://localhost:8081';
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestJson<{ ok: boolean }>('/api/v1/test')).resolves.toEqual({ ok: true });
    const [, init] = fetchMock.mock.calls[0];
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8081/api/v1/test');
    expect(init).toMatchObject({
      credentials: 'include',
      cache: 'no-store'
    });
    expect(Object.fromEntries((init?.headers as Headers).entries())).toEqual({
      'content-type': 'application/json'
    });
    env.VITE_CONTROL_PLANE_API_BASE_URL = previous;
  });

  it('preserves explicit cache, attaches CSRF for non-GET requests, and returns undefined for 204', async () => {
    const env = import.meta.env as Record<string, unknown>;
    const previous = env.VITE_CONTROL_PLANE_API_BASE_URL;
    env.VITE_CONTROL_PLANE_API_BASE_URL = 'http://localhost:8081';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'csrf-token-1' }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      requestJson<void>('/api/v1/logout', {
        method: 'POST',
        cache: 'reload',
        headers: { 'x-trace-id': 'trace-1' }
      })
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://localhost:8081/api/v1/auth/csrf', {
      credentials: 'include',
      cache: 'no-store'
    });
    const [, init] = fetchMock.mock.calls[1];
    expect(fetchMock.mock.calls[1][0]).toBe('http://localhost:8081/api/v1/logout');
    expect(init).toMatchObject({
      method: 'POST',
      cache: 'reload',
      credentials: 'include'
    });
    expect(Object.fromEntries((init?.headers as Headers).entries())).toEqual({
      'content-type': 'application/json',
      'x-csrf-token': 'csrf-token-1',
      'x-trace-id': 'trace-1'
    });
    env.VITE_CONTROL_PLANE_API_BASE_URL = previous;
  });

  it('normalizes error responses from unauthorized, json, and raw text bodies', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401, statusText: 'Unauthorized' }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { detail: 'Detailed failure' } }), {
          status: 500,
          statusText: 'Server Error'
        })
      )
      .mockResolvedValueOnce(
        new Response('plain failure', {
          status: 502,
          statusText: 'Bad Gateway'
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestJson('/api/v1/protected')).rejects.toThrow('UNAUTHORIZED');
    await expect(requestJson('/api/v1/json-error')).rejects.toThrow(
      'Control plane request failed (500): Detailed failure'
    );
    await expect(requestJson('/api/v1/text-error')).rejects.toThrow(
      'Control plane request failed (502): plain failure'
    );
  });

  it('parses streamed SSE frames and ignores malformed payloads', async () => {
    const events: unknown[] = [];
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"type":"status","message":"queued","step":"one"}\n\n' +
                ': keep-alive\n' +
                'data: not-json\n\n' +
                'data: {"type":"status"'
            )
          );
          controller.enqueue(new TextEncoder().encode(',"message":"done"}\n'));
          controller.close();
        }
      })
    );

    await readRunEventStream(response, (event) => events.push(event));

    expect(events).toEqual([
      { type: 'status', message: 'queued', step: 'one' },
      { type: 'status', message: 'done' }
    ]);
  });

  it('returns early when an event stream has no body', async () => {
    await expect(readRunEventStream(new Response(null, { status: 204 }))).resolves.toBeUndefined();
  });
});
