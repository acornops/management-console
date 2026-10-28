import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { ControlPlaneRequestError } from '@/services/control-plane/http';
import type { ChatSession } from '@/types';
import type { LiveRunTrace } from '../types';
import { useWatchedRunStream } from './targetChatRunWatcher';
import { deriveTargetChatRunState } from './targetChatState';
import { buildTraceFromRunEvents, preferRicherRunTrace } from './chatRunTrace';
import { mergeHydratedChatMessages } from './chatSessionSync';

const lifecycle = vi.hoisted(() => ({ effects: [] as Array<() => void | (() => void)> }));
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useRef: (current: unknown) => ({ current }),
  useEffect: (effect: () => void | (() => void)) => { lifecycle.effects.push(effect); }
}));

let cleanups: Array<() => void> = [];
const completedRun = { id: 'run-1', status: 'completed', assistantMessage: { content: 'Final answer' } } as const;
const finalMessages = { items: [{
  id: 'durable-assistant', sessionId: 'session-1', runId: 'run-1', role: 'assistant',
  kind: 'assistant_final', content: 'Final answer', createdAt: '2026-10-29T00:00:00Z'
}], nextCursor: null };

function mountWatcher() {
  const latestSessionsRef = { current: [{
    id: 'session-1', backendSessionId: 'session-1', name: 'Chat', timestamp: 1,
    messages: [{ id: 'stream-run-1', role: 'assistant', runId: 'run-1', content: '', timestamp: 1 }]
  }] as ChatSession[] };
  const runTracesByRunIdRef = { current: {
    'run-1': { runId: 'run-1', status: 'running', steps: [], toolCalls: [] }
  } as Record<string, LiveRunTrace> };
  useWatchedRunStream({
    activeRunId: null, activeSessionRecord: latestSessionsRef.current[0], effectiveActiveRunId: 'run-1',
    latestSessionsRef, onUpdateSessions: (sessions) => { latestSessionsRef.current = sessions; },
    runTracesByRunIdRef,
    setRunTracesByRunId: (update) => {
      runTracesByRunIdRef.current = typeof update === 'function' ? update(runTracesByRunIdRef.current) : update;
    },
    setTraceExpandedByRunId: () => undefined, runCancelledMessage: 'Run cancelled.'
  });
  cleanups = lifecycle.effects.flatMap((effect) => { const cleanup = effect(); return cleanup ? [cleanup] : []; });
  return { latestSessionsRef, runTracesByRunIdRef };
}

beforeEach(() => {
  lifecycle.effects = [];
  cleanups = [];
  vi.useFakeTimers();
  vi.stubGlobal('window', globalThis);
  vi.spyOn(controlPlaneApi, 'getRunEvents').mockResolvedValue([]);
  vi.spyOn(controlPlaneApi, 'getSessionMessages').mockResolvedValue(finalMessages as never);
  vi.spyOn(controlPlaneApi, 'streamRunEvents').mockResolvedValue(undefined);
});
afterEach(() => {
  cleanups.forEach((cleanup) => cleanup());
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('watched run recovery lifecycle', () => {
  it('recovers initial status reads through more than five failures without another render', async () => {
    const getRun = vi.spyOn(controlPlaneApi, 'getRun');
    for (let attempt = 0; attempt < 7; attempt += 1) getRun.mockRejectedValueOnce(new TypeError('connection closed'));
    getRun.mockResolvedValue(completedRun as never);
    const state = mountWatcher();
    await vi.advanceTimersByTimeAsync(60000);
    expect(getRun).toHaveBeenCalledTimes(8);
    expect(state.latestSessionsRef.current[0].messages).toEqual([
      expect.objectContaining({ id: 'stream-run-1', runId: 'run-1', content: 'Final answer' })
    ]);
    expect(state.runTracesByRunIdRef.current['run-1'].status).toBe('completed');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('retains terminal observation until durable message hydration succeeds', async () => {
    vi.spyOn(controlPlaneApi, 'getRun').mockResolvedValue(completedRun as never);
    const messages = vi.mocked(controlPlaneApi.getSessionMessages)
      .mockRejectedValueOnce(new ControlPlaneRequestError('draining', 503))
      .mockResolvedValue(finalMessages as never);
    const state = mountWatcher();
    await vi.advanceTimersByTimeAsync(0);
    const traces = state.runTracesByRunIdRef.current;
    expect(traces['run-1'].status).toBe('completed');
    expect(deriveTargetChatRunState({ localActiveRunId: null, activeSession: state.latestSessionsRef.current[0], runTracesByRunId: traces }).activeRunId).toBe('run-1');
    await vi.advanceTimersByTimeAsync(2000);
    expect(messages).toHaveBeenCalledTimes(2);
    expect(state.latestSessionsRef.current[0].messages[0].content).toBe('Final answer');
    expect(deriveTargetChatRunState({ localActiveRunId: null, activeSession: state.latestSessionsRef.current[0], runTracesByRunId: state.runTracesByRunIdRef.current }).activeRunId).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([401, 403, 404])('stops on permanent initial status failure (%s)', async (status) => {
    const getRun = vi.spyOn(controlPlaneApi, 'getRun').mockRejectedValue(new ControlPlaneRequestError('denied', status));
    mountWatcher();
    await vi.advanceTimersByTimeAsync(60000);
    expect(getRun).toHaveBeenCalledTimes(1);
    expect(controlPlaneApi.getSessionMessages).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reconciles after terminal SSE even when status reads fail during handoff', async () => {
    const getRun = vi.spyOn(controlPlaneApi, 'getRun')
      .mockResolvedValueOnce({ id: 'run-1', status: 'running' } as never)
      .mockRejectedValueOnce(new TypeError('connection closed'))
      .mockResolvedValue(completedRun as never);
    vi.mocked(controlPlaneApi.streamRunEvents).mockImplementation(async (_runId, options) => {
      options?.onEvent?.({ seq: 1, type: 'run_completed', payload: {} } as never);
    });
    const state = mountWatcher();
    await vi.advanceTimersByTimeAsync(0);
    expect(state.runTracesByRunIdRef.current['run-1']).toMatchObject({ status: 'completed', needsReconciliation: true });
    expect(getRun).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(2000);
    expect(getRun).toHaveBeenCalledTimes(3);
    expect(controlPlaneApi.streamRunEvents).toHaveBeenCalledTimes(1);
    expect(state.latestSessionsRef.current[0].messages[0].content).toBe('Final answer');
    expect(state.runTracesByRunIdRef.current['run-1'].needsReconciliation).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reconciles a polled terminal event while the SSE connection remains open', async () => {
    vi.spyOn(controlPlaneApi, 'getRun')
      .mockResolvedValueOnce({ id: 'run-1', status: 'running' } as never)
      .mockResolvedValue(completedRun as never);
    vi.mocked(controlPlaneApi.getRunEvents)
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ seq: 1, type: 'run_completed', payload: {} }] as never);
    vi.mocked(controlPlaneApi.streamRunEvents).mockImplementation(async (_runId, options) => {
      await new Promise<void>((resolve) => options?.signal?.addEventListener('abort', () => resolve(), { once: true }));
    });
    const state = mountWatcher();
    await vi.advanceTimersByTimeAsync(2000);
    expect(state.latestSessionsRef.current[0].messages).toEqual([
      expect.objectContaining({ id: 'stream-run-1', runId: 'run-1', content: 'Final answer' })
    ]);
    expect(state.runTracesByRunIdRef.current['run-1']).toMatchObject({ status: 'completed', needsReconciliation: false });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps the placeholder until the completed run has a durable assistant message', async () => {
    vi.spyOn(controlPlaneApi, 'getRun').mockResolvedValue(completedRun as never);
    vi.mocked(controlPlaneApi.getSessionMessages)
      .mockResolvedValueOnce({ items: [], nextCursor: null } as never)
      .mockResolvedValue(finalMessages as never);
    const state = mountWatcher();
    await vi.advanceTimersByTimeAsync(0);
    expect(state.latestSessionsRef.current[0].messages).toEqual([
      expect.objectContaining({ id: 'stream-run-1', runId: 'run-1', content: '' })
    ]);
    expect(state.runTracesByRunIdRef.current['run-1']).toMatchObject({ status: 'completed', needsReconciliation: true });
    await vi.advanceTimersByTimeAsync(2000);
    expect(state.latestSessionsRef.current[0].messages).toEqual([
      expect.objectContaining({ id: 'stream-run-1', runId: 'run-1', content: 'Final answer' })
    ]);
    expect(state.runTracesByRunIdRef.current['run-1'].needsReconciliation).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('finds an older final message without replacing the newest page or traversing older history afterward', async () => {
    vi.spyOn(controlPlaneApi, 'getRun').mockResolvedValue(completedRun as never);
    const newestMessages = Array.from({ length: 100 }, (_, index) => ({
      id: `newer-${index}`, sessionId: 'session-1', runId: `newer-run-${Math.floor(index / 2)}`,
      role: index % 2 ? 'assistant' : 'user', kind: index % 2 ? 'assistant_final' : 'user',
      content: 'A newer completed turn', createdAt: '2026-10-29T01:00:00Z'
    }));
    const unrelatedOlderMessage = { ...finalMessages.items[0], id: 'older-unrelated', runId: 'older-run' };
    const messages = vi.mocked(controlPlaneApi.getSessionMessages).mockImplementation(async (_sessionId, options) =>
      options?.cursor === 'older-page'
        ? { items: [unrelatedOlderMessage, ...finalMessages.items], nextCursor: 'oldest-page' } as never
        : { items: newestMessages, nextCursor: 'older-page' } as never);
    const state = mountWatcher();
    await vi.advanceTimersByTimeAsync(60000);
    const session = state.latestSessionsRef.current[0];
    expect(session.messages).toHaveLength(101);
    expect(session.messages).toContainEqual(
      expect.objectContaining({ id: 'stream-run-1', runId: 'run-1', content: 'Final answer' }));
    expect(session.messages.filter((message) => message.id.startsWith('newer-'))).toHaveLength(100);
    expect(session.messages.some((message) => message.id === 'older-unrelated')).toBe(false);
    expect(deriveTargetChatRunState({ localActiveRunId: null, activeSession: session,
      runTracesByRunId: state.runTracesByRunIdRef.current })).toEqual({ activeRunId: null, isRunActive: false });
    expect(messages.mock.calls).toEqual([
      ['session-1', { limit: 100 }], ['session-1', { limit: 100, cursor: 'older-page' }]
    ]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('retries a transient older-page read without restarting the page traversal', async () => {
    vi.spyOn(controlPlaneApi, 'getRun').mockResolvedValue(completedRun as never);
    const messages = vi.mocked(controlPlaneApi.getSessionMessages)
      .mockResolvedValueOnce({ items: [], nextCursor: 'older-page' } as never)
      .mockRejectedValueOnce(new ControlPlaneRequestError('draining', 503))
      .mockResolvedValue(finalMessages as never);
    const state = mountWatcher();
    await vi.advanceTimersByTimeAsync(2000);
    expect(state.latestSessionsRef.current[0].messages).toEqual([
      expect.objectContaining({ id: 'stream-run-1', runId: 'run-1', content: 'Final answer' })
    ]);
    expect(messages.mock.calls).toEqual([
      ['session-1', { limit: 100 }], ['session-1', { limit: 100, cursor: 'older-page' }],
      ['session-1', { limit: 100, cursor: 'older-page' }]
    ]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([401, 403, 404])('stops older-page reconciliation on permanent failure (%s)', async (status) => {
    vi.spyOn(controlPlaneApi, 'getRun').mockResolvedValue(completedRun as never);
    const messages = vi.mocked(controlPlaneApi.getSessionMessages)
      .mockResolvedValueOnce({ items: [], nextCursor: 'older-page' } as never)
      .mockRejectedValue(new ControlPlaneRequestError('denied', status));
    const state = mountWatcher();
    await vi.advanceTimersByTimeAsync(60000);
    expect(messages.mock.calls).toEqual([
      ['session-1', { limit: 100 }], ['session-1', { limit: 100, cursor: 'older-page' }]
    ]);
    expect(state.runTracesByRunIdRef.current['run-1']).toMatchObject({ status: 'completed', needsReconciliation: false });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('disposes retrying older-page reconciliation without fetching another page', async () => {
    vi.spyOn(controlPlaneApi, 'getRun').mockResolvedValue(completedRun as never);
    const messages = vi.mocked(controlPlaneApi.getSessionMessages)
      .mockResolvedValueOnce({ items: [], nextCursor: 'older-page' } as never)
      .mockRejectedValue(new TypeError('connection closed'));
    mountWatcher();
    await vi.advanceTimersByTimeAsync(0);
    cleanups.forEach((cleanup) => cleanup());
    await vi.advanceTimersByTimeAsync(60000);
    expect(messages.mock.calls).toEqual([
      ['session-1', { limit: 100 }], ['session-1', { limit: 100, cursor: 'older-page' }]
    ]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('retains watcher ownership through competing terminal activity hydration', async () => {
    vi.spyOn(controlPlaneApi, 'getRun').mockResolvedValue(completedRun as never);
    vi.mocked(controlPlaneApi.getSessionMessages)
      .mockResolvedValueOnce({ items: [], nextCursor: null } as never)
      .mockResolvedValue(finalMessages as never);
    const state = mountWatcher();
    await vi.advanceTimersByTimeAsync(0);
    // Activity/session hydration may see the same terminal status before the final row.
    const traces = state.runTracesByRunIdRef.current;
    traces['run-1'] = preferRicherRunTrace(traces['run-1'], buildTraceFromRunEvents(completedRun, []));
    const session = state.latestSessionsRef.current[0];
    session.messages = mergeHydratedChatMessages({
      localMessages: session.messages, backendMessages: [], runTracesByRunId: traces,
      terminalRunIds: new Set(['run-1'])
    });
    expect(deriveTargetChatRunState({ localActiveRunId: null, activeSession: session, runTracesByRunId: traces }))
      .toEqual({ activeRunId: 'run-1', isRunActive: true });
    await vi.advanceTimersByTimeAsync(2000);
    expect(state.latestSessionsRef.current[0].messages).toEqual([
      expect.objectContaining({ id: 'stream-run-1', runId: 'run-1', content: 'Final answer' })
    ]);
    expect(state.runTracesByRunIdRef.current['run-1'].needsReconciliation).toBe(false);
  });

  it.each([401, 403, 404])('stops final-message reconciliation on permanent failure (%s)', async (status) => {
    vi.spyOn(controlPlaneApi, 'getRun').mockResolvedValue(completedRun as never);
    const messages = vi.mocked(controlPlaneApi.getSessionMessages)
      .mockResolvedValueOnce({ items: [], nextCursor: null } as never)
      .mockRejectedValue(new ControlPlaneRequestError('denied', status));
    const state = mountWatcher();
    await vi.advanceTimersByTimeAsync(60000);
    expect(messages).toHaveBeenCalledTimes(2);
    expect(state.runTracesByRunIdRef.current['run-1']).toMatchObject({ status: 'completed', needsReconciliation: false });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('disposes final-message reconciliation while the durable message is pending', async () => {
    vi.spyOn(controlPlaneApi, 'getRun').mockResolvedValue(completedRun as never);
    const messages = vi.mocked(controlPlaneApi.getSessionMessages)
      .mockResolvedValue({ items: [], nextCursor: null } as never);
    mountWatcher();
    await vi.advanceTimersByTimeAsync(0);
    cleanups.forEach((cleanup) => cleanup());
    await vi.advanceTimersByTimeAsync(60000);
    expect(messages).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels retry timers and further requests on unmount', async () => {
    const getRun = vi.spyOn(controlPlaneApi, 'getRun').mockRejectedValue(new TypeError('connection closed'));
    mountWatcher();
    await vi.advanceTimersByTimeAsync(0);
    cleanups.forEach((cleanup) => cleanup());
    await vi.advanceTimersByTimeAsync(60000);
    expect(getRun).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
