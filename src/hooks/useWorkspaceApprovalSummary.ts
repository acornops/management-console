import React from 'react';
import { listWorkspaceApprovalInbox } from '@/services/control-plane/workflowApi';

export interface WorkspaceApprovalSummary {
  pendingCount: number | undefined;
  refresh: () => Promise<void>;
}

export function useWorkspaceApprovalSummary(
  workspaceId: string | null,
  enabled: boolean
): WorkspaceApprovalSummary {
  const [pendingCount, setPendingCount] = React.useState<number | undefined>(undefined);
  const requestSequenceRef = React.useRef(0);

  const refresh = React.useCallback(async () => {
    if (!workspaceId || !enabled) return;
    const requestSequence = ++requestSequenceRef.current;
    try {
      const response = await listWorkspaceApprovalInbox(workspaceId, { status: 'pending', limit: 1 });
      if (requestSequence === requestSequenceRef.current) {
        setPendingCount(response.pendingCount);
      }
    } catch {
      // Navigation keeps the last successful count; the inbox owns visible errors.
    }
  }, [enabled, workspaceId]);

  React.useEffect(() => {
    requestSequenceRef.current += 1;
    setPendingCount(undefined);
    if (!workspaceId || !enabled) return;

    void refresh();
    const poll = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    let intervalId = document.visibilityState === 'visible'
      ? window.setInterval(poll, 30_000)
      : undefined;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
        if (intervalId === undefined) intervalId = window.setInterval(poll, 30_000);
      } else if (intervalId !== undefined) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    };
    const handleFocus = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      requestSequenceRef.current += 1;
      if (intervalId !== undefined) window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, refresh, workspaceId]);

  return { pendingCount, refresh };
}
