import React from 'react';

import type { ControlPlaneTargetIssueSummary } from '@/services/controlPlaneApi';
import { controlPlaneApi } from '@/services/controlPlaneApi';

export type TargetIssueSummaryLoadState = 'loading' | 'ready' | 'error';

export const TARGET_ISSUE_SUMMARY_REFRESH_MS = 60_000;
const TARGET_ISSUE_SUMMARY_CONCURRENCY = 4;

interface TargetIssueSummaryRef {
  id: string;
  workspaceId: string;
}

export function useTargetIssueSummaries<T extends TargetIssueSummaryRef>(targets: ReadonlyArray<T>) {
  const requestSequenceRef = React.useRef(0);
  const targetsRef = React.useRef(targets);
  targetsRef.current = targets;
  const targetKey = React.useMemo(
    () => targets.map((target) => `${target.workspaceId}:${target.id}`).sort().join('|'),
    [targets]
  );
  const [summaryByTargetId, setSummaryByTargetId] = React.useState<Record<string, ControlPlaneTargetIssueSummary | undefined>>({});
  const [loadStateByTargetId, setLoadStateByTargetId] = React.useState<Record<string, TargetIssueSummaryLoadState>>({});

  const refresh = React.useCallback(async () => {
    const activeTargets = targetsRef.current;
    if (activeTargets.length === 0) {
      requestSequenceRef.current += 1;
      setSummaryByTargetId({});
      setLoadStateByTargetId({});
      return;
    }

    const requestId = ++requestSequenceRef.current;
    const activeTargetIds = new Set(activeTargets.map((target) => target.id));
    const entries: Array<readonly [string, ControlPlaneTargetIssueSummary]> = [];
    const failedTargetIds = new Set<string>();
    let nextTargetIndex = 0;
    setLoadStateByTargetId((current) => Object.fromEntries(
      activeTargets.map((target) => [target.id, current[target.id] === 'ready' ? 'ready' : 'loading'])
    ));

    const loadNextSummary = async () => {
      while (requestId === requestSequenceRef.current && nextTargetIndex < activeTargets.length) {
        const target = activeTargets[nextTargetIndex];
        nextTargetIndex += 1;
        if (!target) continue;
        try {
          const summary = await controlPlaneApi.getTargetIssueSummary(target.workspaceId, target.id);
          entries.push([target.id, summary] as const);
        } catch {
          failedTargetIds.add(target.id);
        }
      }
    };

    await Promise.all(
      Array.from(
        { length: Math.min(TARGET_ISSUE_SUMMARY_CONCURRENCY, activeTargets.length) },
        () => loadNextSummary()
      )
    );
    if (requestId !== requestSequenceRef.current) return;

    setSummaryByTargetId((current) => ({
      ...Object.fromEntries(Object.entries(current).filter(([targetId]) => activeTargetIds.has(targetId))),
      ...Object.fromEntries(entries)
    }));
    setLoadStateByTargetId(Object.fromEntries(
      activeTargets.map((target) => [target.id, failedTargetIds.has(target.id) ? 'error' : 'ready'])
    ));
    if (failedTargetIds.size > 0) {
      console.error('Target issue summary refresh failed', {
        failedTargetIds: [...failedTargetIds],
        requestedTargetCount: activeTargets.length
      });
    }
  }, [targetKey]);

  React.useEffect(() => {
    void refresh();
    return () => {
      requestSequenceRef.current += 1;
    };
  }, [refresh]);

  React.useEffect(() => {
    if (!targetKey) return undefined;
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'hidden') return;
      void refresh();
    };
    const intervalId = window.setInterval(refreshWhenVisible, TARGET_ISSUE_SUMMARY_REFRESH_MS);
    window.addEventListener('focus', refreshWhenVisible);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshWhenVisible);
    };
  }, [refresh, targetKey]);

  return { summaryByTargetId, loadStateByTargetId, refresh };
}
