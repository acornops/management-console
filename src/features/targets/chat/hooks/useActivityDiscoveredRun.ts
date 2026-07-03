import { useCallback, useState } from 'react';
import type { ChatSession } from '@/types';
import { deriveActivityDiscoveredRunId } from '@/features/targets/chat/hooks/targetChatState';
import type { LiveRunTrace } from '@/features/targets/chat/types';

interface ActivityWatchedRun {
  sessionId: string;
  runId: string;
}

export function useActivityDiscoveredRun(args: {
  activeSession: ChatSession;
  runTracesByRunId: Record<string, LiveRunTrace>;
  cancelledRunIds: ReadonlySet<string>;
}): {
  activityDiscoveredRunId: string | null;
  clearActivityWatchedRunForSession: (sessionId: string) => void;
  handleActiveRunDiscovered: (sessionId: string, runId: string) => void;
  resetActivityWatchedRun: () => void;
} {
  const { activeSession, runTracesByRunId, cancelledRunIds } = args;
  const [activityWatchedRun, setActivityWatchedRun] = useState<ActivityWatchedRun | null>(null);
  const activityDiscoveredRunId = deriveActivityDiscoveredRunId({
    activityWatchedRun,
    activeSession,
    runTracesByRunId,
    cancelledRunIds
  });
  const handleActiveRunDiscovered = useCallback(
    (sessionId: string, runId: string) => setActivityWatchedRun({ sessionId, runId }),
    []
  );
  const resetActivityWatchedRun = useCallback(() => setActivityWatchedRun(null), []);
  const clearActivityWatchedRunForSession = useCallback((sessionId: string) => {
    setActivityWatchedRun((current) => current?.sessionId === sessionId ? null : current);
  }, []);

  return {
    activityDiscoveredRunId,
    clearActivityWatchedRunForSession,
    handleActiveRunDiscovered,
    resetActivityWatchedRun
  };
}
