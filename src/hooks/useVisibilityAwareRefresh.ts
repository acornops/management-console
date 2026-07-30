import React from 'react';

export const ISSUE_ACTIVITY_REFRESH_MS = 5000;

export function useVisibilityAwareRefresh(
  refresh: () => void | Promise<void>,
  options?: { enabled?: boolean; intervalMs?: number }
): void {
  const refreshRef = React.useRef(refresh);
  refreshRef.current = refresh;
  const enabled = options?.enabled ?? true;
  const intervalMs = options?.intervalMs ?? ISSUE_ACTIVITY_REFRESH_MS;

  React.useEffect(() => {
    if (!enabled) return undefined;
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'hidden') return;
      void refreshRef.current();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshWhenVisible();
    };
    const intervalId = window.setInterval(refreshWhenVisible, intervalMs);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, intervalMs]);
}
