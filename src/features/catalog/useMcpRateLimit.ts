import React from 'react';

import { formatMcpError, type FormattedMcpError } from '@/services/control-plane/mcpError';

export function useMcpRateLimit() {
  const [retryUntilByKey, setRetryUntilByKey] = React.useState<Record<string, number>>({});
  const [, setClockTick] = React.useState(0);

  React.useEffect(() => {
    if (!Object.values(retryUntilByKey).some((retryUntil) => retryUntil > Date.now())) return;
    const interval = window.setInterval(() => setClockTick((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [retryUntilByKey]);

  const remainingSeconds = React.useCallback((key: string): number => {
    const retryUntil = retryUntilByKey[key];
    return retryUntil ? Math.max(0, Math.ceil((retryUntil - Date.now()) / 1000)) : 0;
  }, [retryUntilByKey]);

  const captureError = React.useCallback((key: string, error: unknown, fallback: string): FormattedMcpError => {
    const formatted = formatMcpError(error, fallback);
    if (formatted.retryAfterSeconds) {
      setRetryUntilByKey((current) => ({
        ...current,
        [key]: Date.now() + formatted.retryAfterSeconds! * 1000
      }));
    }
    return formatted;
  }, []);

  const clear = React.useCallback((key: string) => {
    setRetryUntilByKey((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  return { captureError, clear, remainingSeconds };
}
