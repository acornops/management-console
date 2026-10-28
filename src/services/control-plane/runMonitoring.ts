import { delay } from './http';
import { activeRunReconnectDelay, isTransientStreamFailure } from './streamRetry';
import type { ControlPlaneRun } from './types';

/** Dispose retry timers/listeners together with the observer that owns them. */
export function waitForRunObservation(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) { resolve(); return; }
    const finish = () => { clearTimeout(timer); signal.removeEventListener('abort', finish); resolve(); };
    const timer = setTimeout(finish, delayMs);
    signal.addEventListener('abort', finish, { once: true });
  });
}

/** Safe reads may resume for as long as their mounted observer still needs them. */
export async function retryRunObservation<T>(read: () => Promise<T>, signal: AbortSignal): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    signal.throwIfAborted();
    try {
      const result = await read();
      signal.throwIfAborted();
      return result;
    } catch (error) {
      const delayMs = activeRunReconnectDelay(error, attempt, [1000, 2000, 5000, 10000]);
      if (delayMs === null) throw error;
      await waitForRunObservation(delayMs, signal);
    }
  }
}

/** Observation ending does not establish a terminal result for the backend run. */
export class RunMonitoringTimeoutError extends Error {
  constructor(runId: string, timeoutMs: number) {
    super(`Run ${runId} did not complete within ${timeoutMs}ms`);
    this.name = 'RunMonitoringTimeoutError';
  }
}

export async function waitForRunTerminalState(
  runId: string,
  getRun: (id: string) => Promise<ControlPlaneRun>,
  options?: { timeoutMs?: number; pollIntervalMs?: number }
): Promise<ControlPlaneRun> {
  const timeoutMs = options?.timeoutMs ?? 120000;
  const pollIntervalMs = options?.pollIntervalMs ?? 1200;
  const deadline = Date.now() + timeoutMs;
  let failures = 0;

  while (true) {
    let nextDelay = pollIntervalMs;
    try {
      const run = await getRun(runId);
      if (run.status === 'completed' || run.status === 'failed' || run.status === 'cancelled') return run;
      failures = 0;
    } catch (error) {
      if (!isTransientStreamFailure(error)) throw error;
      nextDelay = Math.min(pollIntervalMs * 2 ** Math.min(failures, 4), 10000);
      failures += 1;
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new RunMonitoringTimeoutError(runId, timeoutMs);
    await delay(Math.min(nextDelay, remaining));
  }
}
