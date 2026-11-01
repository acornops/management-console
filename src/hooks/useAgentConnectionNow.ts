import { useEffect, useReducer } from 'react';
import { agentConnectionDeadline, type AgentConnectionObservation } from '@/utils/agentConnection';

/** Re-render at the next cached observation expiry, even when all fetches fail. */
export function useAgentConnectionNow(targets: ReadonlyArray<{ connection?: AgentConnectionObservation } | null>): number {
  const [, refresh] = useReducer((revision: number) => revision + 1, 0);
  const now = Date.now();
  const deadlines = targets.flatMap((target) => {
    const deadline = target?.connection ? agentConnectionDeadline(target.connection) : null;
    return deadline !== null && deadline > now ? [deadline] : [];
  });
  const nextDeadline = deadlines.length ? Math.min(...deadlines) : null;
  useEffect(() => {
    if (nextDeadline === null) return;
    const timer = window.setTimeout(refresh, Math.max(0, nextDeadline - Date.now()));
    return () => window.clearTimeout(timer);
  }, [nextDeadline]);
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState !== 'hidden') refresh(); };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return now;
}
