import { useCallback } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ChatMessage, ChatSession } from '@/types';
import { replacePendingCancelledRunMessages } from '@/features/targets/chat/hooks/chatRunCancellation';
import type { PendingCancellationAcceptedArgs } from '@/features/targets/chat/hooks/chatSubmitTypes';
import type { LiveRunTrace } from '@/features/targets/chat/types';
import { upsertSession } from '@/features/targets/chat/lib/session-utils';

export function useTargetChatSessionReconciliation(args: {
  activeSession: ChatSession;
  activeSessionId: string | null;
  commitSessions: (sessions: ChatSession[]) => void;
  latestSessionsRef: MutableRefObject<ChatSession[]>;
  setActiveSessionId: (sessionId: string) => void;
  setRunTracesByRunId: Dispatch<SetStateAction<Record<string, LiveRunTrace>>>;
  setTraceExpandedByRunId: Dispatch<SetStateAction<Record<string, boolean>>>;
}) {
  const {
    activeSession,
    activeSessionId,
    commitSessions,
    latestSessionsRef,
    setActiveSessionId,
    setRunTracesByRunId,
    setTraceExpandedByRunId
  } = args;

  const updateCurrentSession = useCallback((newMessages: ChatMessage[]) => {
    const currentSessions = latestSessionsRef.current;
    let updatedSessions: ChatSession[];
    if (currentSessions.some((session) => session.id === activeSessionId)) {
      updatedSessions = currentSessions.map((session) =>
        session.id === activeSessionId ? { ...session, messages: newMessages, messagesLoadFailed: false } : session
      );
    } else {
      const newSession: ChatSession = {
        id: activeSessionId || 'default',
        name: activeSession.name,
        messages: newMessages,
        timestamp: Date.now()
      };
      updatedSessions = [...currentSessions, newSession];
      if (!activeSessionId) setActiveSessionId(newSession.id);
    }
    commitSessions(updatedSessions);
  }, [activeSession.name, activeSessionId, commitSessions, latestSessionsRef, setActiveSessionId]);

  const reconcilePendingCancellation = useCallback((remap: PendingCancellationAcceptedArgs) => {
    setRunTracesByRunId((current) => {
      const { [remap.pendingRunId]: pendingTrace, ...rest } = current;
      return {
        ...rest,
        [remap.acceptedRunId]: {
          ...(pendingTrace || current[remap.acceptedRunId] || { steps: [], toolCalls: [] }),
          runId: remap.acceptedRunId,
          status: 'cancelled'
        }
      };
    });
    setTraceExpandedByRunId((current) => {
      const { [remap.pendingRunId]: pendingExpanded, ...rest } = current;
      return {
        ...rest,
        [remap.acceptedRunId]: pendingExpanded ?? current[remap.acceptedRunId] ?? false
      };
    });

    const currentSessions = latestSessionsRef.current;
    const currentSession = currentSessions.find((session) => session.id === remap.localSessionId);
    if (!currentSession) return;
    commitSessions(upsertSession(currentSessions, {
      ...currentSession,
      messages: replacePendingCancelledRunMessages(currentSession.messages, remap)
    }));
  }, [commitSessions, latestSessionsRef, setRunTracesByRunId, setTraceExpandedByRunId]);

  return { updateCurrentSession, reconcilePendingCancellation };
}
