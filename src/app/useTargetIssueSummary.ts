import React from 'react';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneTargetIssueSummary } from '@/services/controlPlaneApi';

export const TARGET_ISSUE_SUMMARY_REFRESH_MS = 30000;

export interface TargetIssueSummaryContext {
  workspaceId: string;
  targetId: string;
}

function targetSummaryKey(target: TargetIssueSummaryContext | null): string | null {
  return target ? `${target.workspaceId}:${target.targetId}` : null;
}

export function useTargetIssueSummary(
  target: TargetIssueSummaryContext | null,
  enabled: boolean
): ControlPlaneTargetIssueSummary | null {
  const [summaryState, setSummaryState] = React.useState<{
    key: string;
    summary: ControlPlaneTargetIssueSummary;
  } | null>(null);
  const latestRequestRef = React.useRef(0);
  const activeKeyRef = React.useRef<string | null>(null);
  const key = targetSummaryKey(target);
  const workspaceId = target?.workspaceId;
  const targetId = target?.targetId;

  const refresh = React.useCallback(() => {
    if (!enabled || !workspaceId || !targetId) return;
    const requestId = ++latestRequestRef.current;
    const requestKey = key;
    void controlPlaneApi.getTargetIssueSummary(workspaceId, targetId)
      .then((nextSummary) => {
        if (requestId !== latestRequestRef.current || requestKey !== activeKeyRef.current) return;
        if (!requestKey) return;
        setSummaryState({ key: requestKey, summary: nextSummary });
      })
      .catch((error) => {
        if (requestId !== latestRequestRef.current || requestKey !== activeKeyRef.current) return;
        console.error('Failed loading target issue summary', error);
      });
  }, [enabled, key, targetId, workspaceId]);

  React.useEffect(() => {
    activeKeyRef.current = enabled ? key : null;
    latestRequestRef.current += 1;
    setSummaryState(null);
    if (!enabled || !key) return;
    refresh();
  }, [enabled, key, refresh]);

  React.useEffect(() => {
    if (!enabled || !key) return undefined;
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      refresh();
    }, TARGET_ISSUE_SUMMARY_REFRESH_MS);
    return () => window.clearInterval(intervalId);
  }, [enabled, key, refresh]);

  React.useEffect(() => {
    if (!enabled || !key) return undefined;
    const handleFocus = () => refresh();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [enabled, key, refresh]);

  return enabled && key && summaryState?.key === key ? summaryState.summary : null;
}
