import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { ChatMessage, ChatSession, KubernetesCluster, PendingApproval } from '@/types';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import type { ControlPlaneRunToolApproval, ControlPlaneSessionListPage } from '@/services/controlPlaneApi';
import { createLocalMessageId, toTimestamp } from '@/features/kubernetes-cluster-detail/lib/helpers';
import {
  dedupeAssistantMessagesByRun,
  filterMessagesByRunIds,
  isBlankAssistantMessage,
  isPendingAssistantPlaceholder,
  mapControlPlaneMessage,
  resolveAssistantTransientStatus,
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
    summary: approval.summary,
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

interface HydrationBackendIndex {
  messageIndexesByIdentityKey: Map<string, number[]>;
  assistantRunIds: Set<string>;
  assistantFinalRunIds: Set<string>;
}

function addBackendIdentityKey(index: HydrationBackendIndex, key: string | undefined, messageIndex: number): void {
  if (!key) return;
  const indexes = index.messageIndexesByIdentityKey.get(key) || [];
  indexes.push(messageIndex);
  index.messageIndexesByIdentityKey.set(key, indexes);
}

function buildHydrationBackendIndex(backendMessages: ChatMessage[]): HydrationBackendIndex {
  const index: HydrationBackendIndex = {
    messageIndexesByIdentityKey: new Map(),
    assistantRunIds: new Set(),
    assistantFinalRunIds: new Set()
  };

  backendMessages.forEach((message, messageIndex) => {
    addBackendIdentityKey(index, message.id, messageIndex);
    addBackendIdentityKey(index, message.clientMessageId, messageIndex);

    if (message.role === 'assistant' && message.runId) {
      index.assistantRunIds.add(message.runId);
      if (String(message.content || '').trim().length > 0) {
        index.assistantFinalRunIds.add(message.runId);
      }
    }
  });

  return index;
}

function findBackendMessageIndexForLocalMessage(args: {
  localMessage: ChatMessage;
  backendIndex: HydrationBackendIndex;
  usedBackendIndexes: Set<number>;
}): number {
  const { localMessage, backendIndex, usedBackendIndexes } = args;
  const identityKeys = [localMessage.id, localMessage.clientMessageId].filter(Boolean) as string[];
  const checkedIndexes = new Set<number>();

  for (const identityKey of identityKeys) {
    for (const candidateIndex of backendIndex.messageIndexesByIdentityKey.get(identityKey) || []) {
      if (checkedIndexes.has(candidateIndex)) continue;
      checkedIndexes.add(candidateIndex);
      if (!usedBackendIndexes.has(candidateIndex)) {
        return candidateIndex;
      }
    }
  }

  return -1;
}

function shouldPreserveLocalHydrationMessage(args: {
  message: ChatMessage;
  backendIndex: HydrationBackendIndex;
  runTracesByRunId: Record<string, LiveRunTrace>;
  terminalRunIds?: ReadonlySet<string>;
}): boolean {
  const { message, backendIndex, runTracesByRunId, terminalRunIds } = args;

  if (message.role === 'user') {
    return true;
  }

  if (message.role !== 'assistant') {
    return false;
  }

  if (message.runId && backendIndex.assistantFinalRunIds.has(message.runId)) {
    return false;
  }

  if (message.runId && terminalRunIds?.has(message.runId)) {
    return false;
  }

  if (isBlankAssistantMessage(message) && message.runId && backendIndex.assistantRunIds.has(message.runId)) {
    return false;
  }

  if (!isBlankAssistantMessage(message)) {
    return true;
  }

  return isPendingAssistantPlaceholder(message) || Boolean(message.runId && isTraceInProgress(runTracesByRunId[message.runId]));
}

function orderMessagesByRunTurn(messages: ChatMessage[]): ChatMessage[] {
  const assistantMessagesByRunId = new Map<string, ChatMessage[]>();
  for (const message of messages) {
    if (message.role !== 'assistant' || !message.runId) continue;
    const messagesForRun = assistantMessagesByRunId.get(message.runId) || [];
    messagesForRun.push(message);
    assistantMessagesByRunId.set(message.runId, messagesForRun);
  }

  const ordered: ChatMessage[] = [];
  const addedIds = new Set<string>();
  const appendMessage = (message: ChatMessage) => {
    if (addedIds.has(message.id)) return;
    ordered.push(message);
    addedIds.add(message.id);
  };
  const appendRunAssistants = (runId?: string) => {
    if (!runId) return;
    for (const assistantMessage of assistantMessagesByRunId.get(runId) || []) {
      appendMessage(assistantMessage);
    }
  };

  for (const message of messages) {
    if (message.role === 'assistant' && message.runId) continue;
    appendMessage(message);
    appendRunAssistants(message.runId);
  }

  for (const message of messages) {
    appendMessage(message);
  }

  return ordered;
}

export function mergeHydratedChatMessages(args: {
  localMessages: ChatMessage[];
  backendMessages: ChatMessage[];
  runTracesByRunId?: Record<string, LiveRunTrace>;
  terminalRunIds?: ReadonlySet<string>;
  suppressedRunIds?: ReadonlySet<string>;
}): ChatMessage[] {
  const { runTracesByRunId = {}, terminalRunIds, suppressedRunIds } = args;
  const localMessages = filterMessagesByRunIds(args.localMessages, suppressedRunIds);
  const backendMessages = filterMessagesByRunIds(args.backendMessages, suppressedRunIds);
  const backendIndex = buildHydrationBackendIndex(backendMessages);
  const usedBackendIndexes = new Set<number>();
  const merged: ChatMessage[] = [];

  for (const localMessage of localMessages) {
    const backendMessageIndex = findBackendMessageIndexForLocalMessage({
      localMessage,
      backendIndex,
      usedBackendIndexes
    });

    if (backendMessageIndex >= 0) {
      usedBackendIndexes.add(backendMessageIndex);
      merged.push(backendMessages[backendMessageIndex]);
      continue;
    }

    if (shouldPreserveLocalHydrationMessage({ message: localMessage, backendIndex, runTracesByRunId, terminalRunIds })) {
      merged.push(localMessage);
    }
  }

  for (const [index, backendMessage] of backendMessages.entries()) {
    if (!usedBackendIndexes.has(index)) {
      if (
        backendMessage.role === 'assistant' &&
        isBlankAssistantMessage(backendMessage) &&
        merged.some((message) => message.role === 'assistant' && message.runId === backendMessage.runId)
      ) {
        continue;
      }
      merged.push(backendMessage);
    }
  }

  return orderMessagesByRunTurn(dedupeAssistantMessagesByRun(merged));
}

export function useControlPlaneChatSessionSync(args: {
  cluster: KubernetesCluster;
  activeSessionId: string | null;
  sessions: ChatSession[];
  onUpdateSessions: (sessions: ChatSession[]) => void;
  runTracesByRunIdRef: RefObject<Record<string, LiveRunTrace>>;
  setRunTracesByRunId: Dispatch<SetStateAction<Record<string, LiveRunTrace>>>;
  setTraceExpandedByRunId: Dispatch<SetStateAction<Record<string, boolean>>>;
  isRunCancelled?: (runId: string) => boolean;
  suppressedHydrationRunIdsRef?: RefObject<ReadonlySet<string>>;
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
    isRunCancelled = () => false,
    suppressedHydrationRunIdsRef,
    runCancelledMessage,
    listSessions = controlPlaneApi.listSessions
  } = args;
  const sessionListKey = `${cluster.workspaceId}:${cluster.id}`;
  const [isSessionListRequestInFlight, setIsSessionListRequestInFlight] = useState(true);
  const [loadedSessionListKey, setLoadedSessionListKey] = useState<string | null>(null);
  const isSessionsLoading = isSessionListRequestInFlight || loadedSessionListKey !== sessionListKey;
  const hydratingBackendSessionsRef = useRef<Set<string>>(new Set());
  const latestSessionsRef = useRef<ChatSession[]>(cluster.chatSessions);
  const activeSessionIdRef = useRef(activeSessionId);
  const onUpdateSessionsRef = useRef(onUpdateSessions);
  const activeHydrationSession = sessions.find((item) => item.id === activeSessionId) || null;
  // Do not depend on the full sessions array; list refreshes can otherwise cancel
  // the only in-flight message hydration and leave the transcript skeleton up.
  const activeHydrationSessionKey = activeHydrationSession
    ? [
        activeHydrationSession.id,
        activeHydrationSession.backendSessionId || '',
        activeHydrationSession.hydrated === false ? 'pending' : 'ready',
        activeHydrationSession.messagesLoadFailed ? 'failed' : 'ok'
      ].join(':')
    : 'none';

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
      setIsSessionListRequestInFlight(true);
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
            messagesLoadFailed: existing?.messagesLoadFailed,
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
          setLoadedSessionListKey(sessionListKey);
          setIsSessionListRequestInFlight(false);
        }
      }
    };

    loadSessions();
    return () => {
      cancelled = true;
    };
  }, [cluster.id, cluster.workspaceId, sessionListKey]);

  useEffect(() => {
    if (!activeSessionId) {
      return;
    }

    const session = activeHydrationSession;
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
    if (session.messagesLoadFailed) {
      return;
    }
    if (session.hydrated && !hasTransientAssistantPlaceholder && !hasAssistantWithInProgressTrace) {
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
        for (const message of mappedMessages) {
          if (message.runId && isRunCancelled(message.runId)) {
            cancelledRunIds.add(message.runId);
          }
        }

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
            const pendingApproval = approval ? mapControlPlaneApprovalToPendingApproval(approval) : undefined;
            restoredAssistantPlaceholders.push({
              id: `rehydrated-${run.id}`,
              role: 'assistant',
              runId: run.id,
              content: '',
              transientStatus: resolveAssistantTransientStatus('', pendingApproval),
              timestamp: Date.now(),
              approval: pendingApproval
            });
            restoredTraces[run.id] = buildTraceFromRunEvents(run, events);
          } catch {
            // Best-effort restoration; normal message hydration should still succeed.
          }
        }

        if (cancelled) {
          return;
        }
        const currentSessionForMerge =
          latestSessionsRef.current.find((item) => item.id === session.id) || session;
        if (currentSessionForMerge.backendSessionId !== backendSessionId) {
          return;
        }
        const restoredMessages =
          restoredAssistantPlaceholders.length > 0
            ? [...mappedMessages, ...restoredAssistantPlaceholders]
            : mappedMessages;
        const terminalRunIds = new Set([...Object.keys(terminalTraces), ...cancelledRunIds]);
        const mergedMessages = mergeHydratedChatMessages({
          localMessages: currentSessionForMerge.messages,
          backendMessages: restoredMessages,
          runTracesByRunId: {
            ...(runTracesByRunIdRef.current || {}),
            ...restoredTraces,
            ...terminalTraces
          },
          terminalRunIds,
          suppressedRunIds: suppressedHydrationRunIdsRef?.current
        });
        const sanitizedRestoredMessages = replaceCancelledRunMessagesForHydration(
          mergedMessages,
          cancelledRunIds,
          runCancelledMessage
        );
        const nextSession: ChatSession = {
          ...currentSessionForMerge,
          hydrated: true,
          messagesLoadFailed: false,
          hasActiveRun: restoredAssistantPlaceholders.length > 0,
          messagesNextCursor: backendMessages.nextCursor,
          messages: sanitizedRestoredMessages,
          timestamp: sanitizedRestoredMessages.length > 0
            ? sanitizedRestoredMessages[sanitizedRestoredMessages.length - 1].timestamp
            : currentSessionForMerge.timestamp
        };
        const tracesToApply = {
          ...restoredTraces,
          ...terminalTraces
        };
        if (Object.keys(tracesToApply).length > 0) {
          setRunTracesByRunId((current) => {
            const next = {
              ...current,
              ...tracesToApply
            };
            runTracesByRunIdRef.current = next;
            return next;
          });
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
        if (!cancelled) {
          const currentSession = latestSessionsRef.current.find((item) => item.id === session.id);
          if (currentSession?.backendSessionId === backendSessionId && currentSession.messages.length === 0) {
            onUpdateSessionsRef.current(upsertSession(latestSessionsRef.current, {
              ...currentSession,
              hydrated: true,
              messagesLoadFailed: true
            }));
          }
        }
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
    activeHydrationSessionKey,
    cluster.id,
    cluster.workspaceId,
    isRunCancelled,
    listSessions,
    runTracesByRunIdRef,
    suppressedHydrationRunIdsRef,
    runCancelledMessage,
    setRunTracesByRunId,
    setTraceExpandedByRunId
  ]);

  const clearHydratingSession = useCallback((backendSessionId: string) => {
    hydratingBackendSessionsRef.current.delete(backendSessionId);
  }, []);

  return { isSessionsLoading, clearHydratingSession };
}
