import { useEffect, useMemo, useRef, useState } from 'react';
import {
  deriveAssistantSessionStatus,
  isActiveAssistantStatus,
  isTerminalAssistantStatus,
  type AssistantNavStatus
} from '@/app/assistantNavStatus';
import type { LiveRunTrace } from '@/features/targets/chat/types';
import type { ChatSession } from '@/types';

interface UseConversationAssistantStatusesArgs {
  activeSessionId: string | null;
  isChatVisible: boolean;
  runTracesByRunId: Record<string, LiveRunTrace>;
  sessions: ChatSession[];
}

export function useConversationAssistantStatuses({
  activeSessionId,
  isChatVisible,
  runTracesByRunId,
  sessions
}: UseConversationAssistantStatusesArgs): Record<string, AssistantNavStatus> {
  const [completedSessionStatusIds, setCompletedSessionStatusIds] = useState<Set<string>>(() => new Set());
  const previousSessionStatusesRef = useRef<Map<string, AssistantNavStatus>>(new Map());
  const rawSessionAssistantStatuses = useMemo(() => {
    const statuses: Record<string, AssistantNavStatus> = {};
    for (const session of sessions) {
      statuses[session.id] = deriveAssistantSessionStatus(session, runTracesByRunId);
    }
    return statuses;
  }, [runTracesByRunId, sessions]);

  useEffect(() => {
    const previousSessionStatuses = previousSessionStatusesRef.current;
    setCompletedSessionStatusIds((current) => {
      const next = new Set<string>();
      let changed = false;

      for (const session of sessions) {
        const rawStatus = rawSessionAssistantStatuses[session.id] || 'idle';
        const previousStatus = previousSessionStatuses.get(session.id) || 'idle';
        const isUnseenSession = !isChatVisible || session.id !== activeSessionId;
        const wasUnseenActive = isActiveAssistantStatus(previousStatus) && isUnseenSession;

        if (wasUnseenActive && isTerminalAssistantStatus(rawStatus)) {
          next.add(session.id);
          if (!current.has(session.id)) changed = true;
        } else if (current.has(session.id) && isUnseenSession && isTerminalAssistantStatus(rawStatus)) {
          next.add(session.id);
        } else if (current.has(session.id)) {
          changed = true;
        }
      }

      if (current.size !== next.size) changed = true;
      return changed ? next : current;
    });
    previousSessionStatusesRef.current = new Map(
      sessions.map((session) => [session.id, rawSessionAssistantStatuses[session.id] || 'idle'])
    );
  }, [activeSessionId, isChatVisible, rawSessionAssistantStatuses, sessions]);

  return useMemo(() => {
    const statuses: Record<string, AssistantNavStatus> = {};
    for (const session of sessions) {
      const rawStatus = rawSessionAssistantStatuses[session.id] || 'idle';
      statuses[session.id] = completedSessionStatusIds.has(session.id)
        ? 'done'
        : rawStatus === 'done'
          ? 'idle'
          : rawStatus;
    }
    return statuses;
  }, [completedSessionStatusIds, rawSessionAssistantStatuses, sessions]);
}
