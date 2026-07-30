import React from 'react';
import type { ChatSession } from '@/types';
import { controlPlaneApi, type ControlPlaneSession } from '@/services/controlPlaneApi';
import {
  findExistingSessionForBackendId,
  mapControlPlaneSessionToChatSession
} from '@/features/targets/chat/hooks/chatSessionSync';
import { upsertSession } from '@/features/targets/chat/lib/session-utils';
import type { TargetDescriptor } from '@/features/targets/targetDescriptor';

function writeSessionQuery(sessionId: string | undefined, mode: 'push' | 'replace'): void {
  if (typeof window === 'undefined') return;
  const updateHistory = mode === 'replace'
    ? window.history.replaceState.bind(window.history)
    : window.history.pushState.bind(window.history);
  if (window.location.hash.startsWith('#/')) {
    const route = new URL(window.location.hash.slice(1), 'https://console.acornops.invalid');
    if (!route.pathname.endsWith('/chat')) return;
    if (sessionId) route.searchParams.set('session', sessionId);
    else route.searchParams.delete('session');
    updateHistory(window.history.state, '', `${window.location.pathname}${window.location.search}#${route.pathname}${route.search}`);
    window.dispatchEvent(new Event('popstate'));
    return;
  }
  if (!window.location.pathname.endsWith('/chat')) return;
  const url = new URL(window.location.href);
  if (sessionId) url.searchParams.set('session', sessionId);
  else url.searchParams.delete('session');
  updateHistory(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  window.dispatchEvent(new Event('popstate'));
}

function updateSessionQuery(sessionId?: string): void {
  writeSessionQuery(sessionId, 'push');
}

function clearUnavailableSessionQuery(): void {
  writeSessionQuery(undefined, 'replace');
}

export function useTargetChatSessionDeepLink(args: {
  initialActiveSessionId: string | null;
  isSessionsLoading: boolean;
  sessions: ChatSession[];
  target: TargetDescriptor;
  unavailableMessage: string;
  onInitialSession: (sessionId: string | null) => void;
  onUpdateSessions: (sessions: ChatSession[]) => void;
  getSession?: (sessionId: string) => Promise<ControlPlaneSession>;
}) {
  const {
    initialActiveSessionId,
    isSessionsLoading,
    sessions,
    target,
    unavailableMessage,
    onInitialSession,
    onUpdateSessions,
    getSession = controlPlaneApi.getSession
  } = args;
  const [error, setError] = React.useState<string | null>(null);
  const clearedUnavailableSessionRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!initialActiveSessionId && clearedUnavailableSessionRef.current) return;
    onInitialSession(initialActiveSessionId);
  }, [initialActiveSessionId, onInitialSession]);
  React.useEffect(() => {
    if (!initialActiveSessionId || isSessionsLoading) {
      if (
        !initialActiveSessionId
        && clearedUnavailableSessionRef.current
      ) {
        clearedUnavailableSessionRef.current = null;
      } else {
        setError(null);
      }
      return;
    }
    const existing = sessions.find(
      (session) => session.id === initialActiveSessionId || session.backendSessionId === initialActiveSessionId
    );
    if (existing) {
      clearedUnavailableSessionRef.current = null;
      setError(null);
      return;
    }
    let cancelled = false;
    void getSession(initialActiveSessionId)
      .then((session) => {
        if (cancelled) return;
        if (session.workspaceId !== target.workspaceId || session.targetId !== target.id) {
          onInitialSession(sessions[0]?.id || null);
          clearedUnavailableSessionRef.current = initialActiveSessionId;
          clearUnavailableSessionQuery();
          setError(unavailableMessage);
          return;
        }
        const mapped = mapControlPlaneSessionToChatSession(
          session,
          findExistingSessionForBackendId(sessions, session.id)
        );
        onUpdateSessions(upsertSession(sessions, mapped));
        setError(null);
      })
      .catch(() => {
        if (!cancelled) {
          onInitialSession(sessions[0]?.id || null);
          clearedUnavailableSessionRef.current = initialActiveSessionId;
          clearUnavailableSessionQuery();
          setError(unavailableMessage);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    getSession,
    initialActiveSessionId,
    isSessionsLoading,
    onInitialSession,
    onUpdateSessions,
    sessions,
    target.id,
    target.workspaceId,
    unavailableMessage
  ]);
  return { sessionDeepLinkError: error, updateSessionQuery };
}
