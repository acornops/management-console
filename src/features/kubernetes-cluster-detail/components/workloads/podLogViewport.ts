const LOG_VIEWPORT_BOTTOM_THRESHOLD_PX = 24;

interface LogViewportMetrics {
  clientHeight: number;
  scrollHeight: number;
  scrollTop: number;
}

export interface LogViewportSnapshot {
  followLatest: boolean;
  scrollTop: number;
}

export function captureLogViewport(
  metrics: LogViewportMetrics,
  followRefresh: boolean
): LogViewportSnapshot {
  const distanceFromBottom = metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight;
  return {
    followLatest: followRefresh && distanceFromBottom <= LOG_VIEWPORT_BOTTOM_THRESHOLD_PX,
    scrollTop: metrics.scrollTop
  };
}

export function resolveRestoredLogScrollTop(
  snapshot: LogViewportSnapshot,
  metrics: Pick<LogViewportMetrics, 'clientHeight' | 'scrollHeight'>
): number {
  const maximumScrollTop = Math.max(0, metrics.scrollHeight - metrics.clientHeight);
  return snapshot.followLatest
    ? maximumScrollTop
    : Math.min(snapshot.scrollTop, maximumScrollTop);
}
