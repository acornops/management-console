import type { Dispatch, SetStateAction } from 'react';
import { RunMonitoringTimeoutError } from '@/services/control-plane/runMonitoring';
import { isTransientStreamFailure } from '@/services/control-plane/streamRetry';
import type { LiveRunTrace } from '../types';
import { createBaseRunTrace } from './chatRunTrace';

/** Hand an accepted run to the watcher without changing its known execution result. */
export function retainRunForReconciliation(
  error: unknown,
  runId: string | undefined,
  update: Dispatch<SetStateAction<Record<string, LiveRunTrace>>>
): boolean {
  if (!runId || !(error instanceof RunMonitoringTimeoutError || isTransientStreamFailure(error))) return false;
  update((current) => ({
    ...current,
    [runId]: { ...(current[runId] || createBaseRunTrace(runId, 'connecting')), needsReconciliation: true }
  }));
  return true;
}
