import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { ChatMessage, ChatSession, KubernetesCluster, PendingApproval } from '@/types';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneRunToolApproval, ControlPlaneSessionListPage } from '@/services/controlPlaneApi';
import { createLocalMessageId, toTimestamp } from '@/features/kubernetes-cluster-detail/lib/helpers';
import {
  isBlankAssistantMessage,
  mapControlPlaneMessage,
  sanitizeChatMessages,
  upsertSession
} from '@/features/kubernetes-cluster-detail/lib/session-utils';
import {
  buildTraceFromRunEvents,
  isRunInProgress,
  isRunTerminal,
  isTraceInProgress
} from '@/features/kubernetes-cluster-detail/hooks/chatRunTrace';
import { LiveRunTrace } from '@/features/kubernetes-cluster-detail/types';
import { replaceCancelledRunAssistantMessages } from '@/features/kubernetes-cluster-detail/hooks/chatRunCancellation';

export function sortSessionsByTimestamp(sessions: ChatSession[]): ChatSession[] {
  return [...sessions].sort((left, right) => right.timestamp - left.timestamp);
}

export function createConversationId(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (typeof randomUuid === 'string' && randomUuid.length > 0) {
    return randomUuid;
  }
  return `session-${createLocalMessageId()}`;
}

export function createConversationName(id: string): string {
  return `Conversation ${id.slice(0, 8)}`;
}

export function mergeFetchedChatSessions(
  fetched: ChatSession[],
  existingSessions: ChatSession[],
  activeSessionId: string | null
): ChatSession[] {
  const merged = [...fetched];
  for (const draft of existingSessions.filter((session) => !session.backendSessionId)) {
    if (!merged.some((session) => session.id === draft.id)) {
      merged.push(draft);
    }
  }

  const activeBackendSession = existingSessions.find(
    (session) => session.id === activeSessionId && Boolean(session.backendSessionId)
  );
  if (activeBackendSession && !merged.some((session) => session.id === activeBackendSession.id)) {
    merged.push(activeBackendSession);
  }

  return sortSessionsByTimestamp(merged);
}

export function mapControlPlaneApprovalToPendingApproval(
  approval: ControlPlaneRunToolApproval
): PendingApproval {
  return {
    id: approval.id,
    runId: approval.runId,
    toolCallId: approval.toolCallId,
    action: `Run ${approval.toolName}`,
    toolName: approval.toolName,
    arguments: approval.arguments || {},
    expiresAt: approval.expiresAt,
    status: approval.status
  };
}

export function replaceCancelledRunMessagesForHydration(
  messages: ChatMessage[],
  cancelledRunIds: ReadonlySet<string>,
  cancelledMessage: string
): ChatMessage[] {
  let nextMessages = messages;
  for (const runId of cancelledRunIds) {
    nextMessages = replaceCancelledRunAssistantMessages(nextMessages, runId, cancelledMessage);
  }
  return nextMessages;
}

export function useControlPlaneChatSessionSync(args: {
  cluster: KubernetesCluster;
  activeSessionId: string | null;
  sessions: ChatSession[];
  onUpdateSessions: (sessions: ChatSession[]) => void;
  runTracesByRunIdRef: RefObject<Record<string, LiveRunTrace>>;
  setRunTracesByRunId: Dispatch<SetStateAction<Record<string, LiveRunTrace>>>;
  setTraceExpandedByRunId: Dispatch<SetStateAction<Record<string, boolean>>>;
  runCancelledMessage: string;
  listSessions?: (workspaceId: string, targetId: string, options?: { limit?: number; cursor?: string; q?: string; status?: string }) => Promise<ControlPlaneSessionListPage>;
}): {
  isSessionsLoading: boolean;
  clearHydratingSession: (backendSessionId: string) => void;
} {
  const {
    cluster,
    activeSessionId,
    sessions,
    onUpdateSessions,
    runTracesByRunIdRef,
    setRunTracesByRunId,
    setTraceExpandedByRunId,
    runCancelledMessage,
    listSessions = controlPlaneApi.listSessions
  } = args;
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);
  const hydratingBackendSessionsRef = useRef<Set<string>>(new Set());
  const latestSessionsRef = useRef<ChatSession[]>(cluster.chatSessions);
  const activeSessionIdRef = useRef(activeSessionId);
  const onUpdateSessionsRef = useRef(onUpdateSessions);

  useEffect(() => {
    latestSessionsRef.current = cluster.chatSessions;
  }, [cluster.chatSessions]);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    onUpdateSessionsRef.current = onUpdateSessions;
  }, [onUpdateSessions]);

  useEffect(() => {
    hydratingBackendSessionsRef.current = new Set();
  }, [cluster.id]);

  useEffect(() => {
    let cancelled = false;
    const loadSessions = async () => {
      setIsSessionsLoading(true);
      try {
        const fetched: ChatSession[] = [];
        const page = await listSessions(cluster.workspaceId, cluster.id, { limit: 50 });
        const existingSessions = latestSessionsRef.current;
        const existingById = new Map(existingSessions.map((session) => [session.id, session]));
        for (const session of page.items) {
          const existing = existingById.get(session.id);
          fetched.push({
            id: session.id,
            backendSessionId: session.id,
            status: session.status,
            createdBy: session.createdBy,
            createdByUser: session.createdByUser,
            name: session.title,
            hydrated: existing?.hydrated ?? false,
            messagesNextCursor: existing?.messagesNextCursor,
            messages: existing?.messages || [],
            timestamp: toTimestamp(session.lastMessageAt || session.updatedAt)
          });
        }

        if (cancelled) return;
        onUpdateSessionsRef.current(mergeFetchedChatSessions(fetched, latestSessionsRef.current, activeSessionIdRef.current));
      } catch {
        // Session listing failures should not block active chat usage.
      } finally {
        if (!cancelled) {
          setIsSessionsLoading(false);
        }
      }
    };

    loadSessions();
    return () => {
      cancelled = true;
    };
  }, [cluster.id, cluster.workspaceId]);

  useEffect(() => {
    if (!activeSessionId) {
      return;
    }

    const session = sessions.find((item) => item.id === activeSessionId);
    const backendSessionId = session?.backendSessionId;
    if (!session || !backendSessionId) {
      return;
    }

    const hasTransientAssistantPlaceholder = session.messages.some(isBlankAssistantMessage);
    const hasAssistantWithInProgressTrace = session.messages.some(
      (message) =>
        message.role === 'assistant' &&
        Boolean(message.runId) &&
        isTraceInProgress(runTracesByRunIdRef.current?.[message.runId as string])
    );
    if (session.hydrated && session.messages.length > 0 && !hasTransientAssistantPlaceholder && !hasAssistantWithInProgressTrace) {
      return;
    }
    if (hydratingBackendSessionsRef.current.has(backendSessionId)) {
      return;
    }

    let cancelled = false;
    const loadMessages = async () => {
      hydratingBackendSessionsRef.current.add(backendSessionId);
      try {
        const backendMessages = await controlPlaneApi.getSessionMessages(backendSessionId, { limit: 100 });
        if (cancelled) return;
        const mappedMessages = sanitizeChatMessages(backendMessages.items.map(mapControlPlaneMessage));
        const assistantRunIds = new Set(
          mappedMessages
            .filter((message) => message.role === 'assistant' && message.runId)
            .map((message) => message.runId as string)
        );
        const restoredAssistantPlaceholders: ChatMessage[] = [];
        const restoredTraces: Record<string, LiveRunTrace> = {};
        const terminalTraces: Record<string, LiveRunTrace> = {};
        const cancelledRunIds = new Set<string>();

        for (const runId of assistantRunIds) {
          const existingTrace = runTracesByRunIdRef.current?.[runId];
          if (existingTrace && !isTraceInProgress(existingTrace)) {
            if (existingTrace.status === 'cancelled') {
              cancelledRunIds.add(runId);
            }
            continue;
          }

          try {
            const run = await controlPlaneApi.getRun(runId);
            if (!isRunTerminal(run.status)) {
              continue;
            }
            const events = await controlPlaneApi.getRunEvents(run.id).catch(() => []);
            terminalTraces[run.id] = buildTraceFromRunEvents(run, events);
            if (run.status === 'cancelled') {
              cancelledRunIds.add(run.id);
            }
          } catch {
            // Best-effort reconciliation; persisted assistant messages can render without a footer.
          }
        }

        for (const message of mappedMessages) {
          if (message.role !== 'user' || !message.runId || assistantRunIds.has(message.runId)) {
            continue;
          }

          try {
            const run = await controlPlaneApi.getRun(message.runId);
            if (isRunTerminal(run.status)) {
              const events = await controlPlaneApi.getRunEvents(run.id).catch(() => []);
              terminalTraces[run.id] = buildTraceFromRunEvents(run, events);
              if (run.status === 'cancelled') {
                cancelledRunIds.add(run.id);
              }
              continue;
            }
            if (!isRunInProgress(run.status)) {
              continue;
            }
            const events = await controlPlaneApi.getRunEvents(run.id).catch(() => []);
            const approvals = await controlPlaneApi.listRunApprovals(run.id).catch(() => []);
            const approval = approvals.find((item) => item.status === 'pending') || approvals[approvals.length - 1];
            restoredAssistantPlaceholders.push({
              id: `rehydrated-${run.id}`,
              role: 'assistant',
              runId: run.id,
              content: '',
              timestamp: Date.now(),
              approval: approval ? mapControlPlaneApprovalToPendingApproval(approval) : undefined
            });
            restoredTraces[run.id] = buildTraceFromRunEvents(run, events);
          } catch {
            // Best-effort restoration; normal message hydration should still succeed.
          }
        }

        const restoredMessages =
          restoredAssistantPlaceholders.length > 0
            ? [...mappedMessages, ...restoredAssistantPlaceholders]
            : mappedMessages;
        const sanitizedRestoredMessages = replaceCancelledRunMessagesForHydration(
          restoredMessages,
          cancelledRunIds,
          runCancelledMessage
        );
        const nextSession: ChatSession = {
          ...session,
          hydrated: true,
          hasActiveRun: restoredAssistantPlaceholders.length > 0,
          messagesNextCursor: backendMessages.nextCursor,
          messages: sanitizedRestoredMessages,
          timestamp: sanitizedRestoredMessages.length > 0
            ? sanitizedRestoredMessages[sanitizedRestoredMessages.length - 1].timestamp
            : session.timestamp
        };
        const tracesToApply = {
          ...restoredTraces,
          ...terminalTraces
        };
        if (Object.keys(tracesToApply).length > 0) {
          setRunTracesByRunId((current) => ({
            ...current,
            ...tracesToApply
          }));
          setTraceExpandedByRunId((current) => {
            const next = { ...current };
            for (const runId of Object.keys(tracesToApply)) {
              next[runId] = current[runId] ?? false;
            }
            return next;
          });
        }
        onUpdateSessionsRef.current(upsertSession(latestSessionsRef.current, nextSession));
      } catch {
        // Message hydration can be retried by selecting the session again.
      } finally {
        hydratingBackendSessionsRef.current.delete(backendSessionId);
      }
    };
    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [
    activeSessionId,
    cluster.id,
    cluster.workspaceId,
    listSessions,
    runTracesByRunIdRef,
    runCancelledMessage,
    sessions,
    setRunTracesByRunId,
    setTraceExpandedByRunId
  ]);

  const clearHydratingSession = useCallback((backendSessionId: string) => {
    hydratingBackendSessionsRef.current.delete(backendSessionId);
  }, []);

  return { isSessionsLoading, clearHydratingSession };
}
