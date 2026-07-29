import React from 'react';
import type { ChatSession } from '@/types';
import { safeStorage } from '@/utils/safeStorage';

const INITIAL_UNSEEN_LOOKBACK_MS = 24 * 60 * 60 * 1000;

export function automaticInvestigationViewedStorageKey(
  currentUserId: string,
  workspaceId: string,
  targetId: string
): string {
  return currentUserId
    ? `acornops.target-investigations.viewed.v1:${currentUserId}:${workspaceId}:${targetId}`
    : '';
}

export function newestAutomaticInvestigationAt(sessions: ChatSession[]): number {
  return sessions.reduce(
    (latest, session) => session.origin === 'auto_triage'
      ? Math.max(latest, session.createdTimestamp ?? session.timestamp)
      : latest,
    0
  );
}

export function countUnseenAutomaticInvestigations(
  sessions: ChatSession[],
  lastViewedAt: number
): number {
  return sessions.filter((session) =>
    session.origin === 'auto_triage'
    && (session.createdTimestamp ?? session.timestamp) > lastViewedAt
  ).length;
}

export function resolveInitialInvestigationViewedAt(
  storedValue: string | null,
  now: number
): number {
  const stored = Number(storedValue);
  return Number.isFinite(stored) && stored > 0
    ? stored
    : now - INITIAL_UNSEEN_LOOKBACK_MS;
}

export function useAutomaticInvestigationViewState(args: {
  currentUserId: string;
  workspaceId: string;
  targetId: string;
  sessions: ChatSession[];
}) {
  const { currentUserId, workspaceId, targetId, sessions } = args;
  const storageKey = automaticInvestigationViewedStorageKey(currentUserId, workspaceId, targetId);
  const newestInvestigationAt = newestAutomaticInvestigationAt(sessions);
  const [lastViewedAt, setLastViewedAt] = React.useState(
    () => Date.now() - INITIAL_UNSEEN_LOOKBACK_MS
  );

  React.useEffect(() => {
    const stored = safeStorage.getItem(storageKey);
    const initialViewedAt = storageKey
      ? resolveInitialInvestigationViewedAt(stored, Date.now())
      : Date.now();
    if (storageKey && stored !== String(initialViewedAt)) {
      safeStorage.setItem(storageKey, String(initialViewedAt));
    }
    setLastViewedAt(initialViewedAt);
  }, [storageKey]);

  const unseenCount = currentUserId
    ? countUnseenAutomaticInvestigations(sessions, lastViewedAt)
    : 0;
  const markViewed = React.useCallback(() => {
    if (!storageKey) return;
    const viewedAt = Math.max(Date.now(), newestInvestigationAt);
    safeStorage.setItem(storageKey, String(viewedAt));
    setLastViewedAt(viewedAt);
  }, [newestInvestigationAt, storageKey]);

  return { unseenCount, markViewed };
}
