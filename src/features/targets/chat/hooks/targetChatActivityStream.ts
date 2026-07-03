import { useEffect, useRef } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { ChatMessage, ChatSession } from '@/types';
import {
  controlPlaneApi,
  type ControlPlaneRun,
  type ControlPlaneTargetChatActivityEvent
} from '@/services/controlPlaneApi';
import {
  mapControlPlaneMessage,
  resolveAssistantTransientStatus,
  sanitizeChatMessages,
  upsertSession
} from '@/features/targets/chat/lib/session-utils';
import {
  findExistingSessionForBackendId,
  mapControlPlaneApprovalToPendingApproval,
  mapControlPlaneSessionToChatSession,
  mergeFetchedChatSessions,
  mergeHydratedChatMessages
} from '@/features/targets/chat/hooks/chatSessionSync';
import {
  createRecentActivitySessionPlaceholder,
  shouldDiscoverActiveRunFromActivity
} from '@/features/targets/chat/hooks/targetChatState';
import {
  buildTraceFromRunEvents,
  isRunInProgress,
  isRunTerminal,
  preferRicherRunTrace
} from '@/features/targets/chat/hooks/chatRunTrace';
import { replaceCancelledRunAssistantMessages } from '@/features/targets/chat/hooks/chatRunCancellation';
import type { LiveRunTrace } from '@/features/targets/chat/types';
import type { TargetDescriptor } from '@/features/targets/targetDescriptor';

const ACTIVITY_RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000];

function createPlaceholderForRun(run: ControlPlaneRun, approval?: ChatMessage['approval']): ChatMessage {
  return {
    id: `rehydrated-${run.id}`,
    role: 'assistant',
    runId: run.id,
    content: '',
    transientStatus: resolveAssistantTransientStatus('', approval),
    timestamp: Date.now(),
    approval
  };
}

export function useTargetChatActivityStream(args: {
  target: TargetDescriptor;
  latestSessionsRef: RefObject<ChatSession[]>;
  activeSessionId: string | null;
  onActiveRunDiscovered?: (sessionId: string, runId: string) => void;
  onUpdateSessions: (sessions: ChatSession[]) => void;
  runTracesByRunIdRef: RefObject<Record<string, LiveRunTrace>>;
  runCancelledMessage: string;
  cancelledRunIds?: ReadonlySet<string>;
  setRunTracesByRunId: Dispatch<SetStateAction<Record<string, LiveRunTrace>>>;
  setTraceExpandedByRunId: Dispatch<SetStateAction<Record<string, boolean>>>;
}): void {
  const {
    target,
    latestSessionsRef,
    activeSessionId,
    onActiveRunDiscovered,
    onUpdateSessions,
    runTracesByRunIdRef,
    runCancelledMessage,
    cancelledRunIds,
    setRunTracesByRunId,
    setTraceExpandedByRunId
  } = args;
  const lastEventIdRef = useRef<string | undefined>(undefined);
  const activeSessionIdRef = useRef(activeSessionId);
  const onUpdateSessionsRef = useRef(onUpdateSessions);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    onUpdateSessionsRef.current = onUpdateSessions;
  }, [onUpdateSessions]);

  useEffect(() => {
    let cancelled = false;
    const cleanupController = new AbortController();
    let streamAbortController: AbortController | null = null;
    lastEventIdRef.current = undefined;

    const waitForReconnect = (delayMs: number) =>
      new Promise<void>((resolve) => {
        const timer = window.setTimeout(resolve, delayMs);
        cleanupController.signal.addEventListener(
          'abort',
          () => {
            window.clearTimeout(timer);
            resolve();
          },
          { once: true }
        );
      });

    const refreshSession = async (event: ControlPlaneTargetChatActivityEvent) => {
      if (cancelled) return;
      const latestSessions = latestSessionsRef.current;
      const findSession = (sessions: ChatSession[]) =>
        sessions.find((session) => session.backendSessionId === event.sessionId || session.id === event.sessionId);
      const shouldRefreshSessionList =
        event.type === 'message.created' ||
        event.type === 'run.created' ||
        event.type === 'session.deleted' ||
        !findSession(latestSessions);
      let nextSessions = latestSessions;
      let sessionRecord = findSession(latestSessions);
      let fetchedSessions: ChatSession[] | null = null;

      if (shouldRefreshSessionList) {
        const sessionPage = await controlPlaneApi.listTargetSessions(target.workspaceId, target.id, { limit: 50 }).catch(() => null);
        if (sessionPage) {
          fetchedSessions = sessionPage.items.map((session) =>
            mapControlPlaneSessionToChatSession(session, findExistingSessionForBackendId(latestSessions, session.id))
          );
          nextSessions = mergeFetchedChatSessions(fetchedSessions, latestSessions, activeSessionIdRef.current);
          sessionRecord = findSession(nextSessions) || sessionRecord;
        }
      }

      if (event.type === 'session.deleted') {
        const currentSessions = latestSessionsRef.current;
        const publishBase = fetchedSessions
          ? mergeFetchedChatSessions(fetchedSessions, currentSessions, activeSessionIdRef.current)
          : currentSessions;
        onUpdateSessionsRef.current(
          publishBase.filter((session) => session.backendSessionId !== event.sessionId && session.id !== event.sessionId)
        );
        return;
      }

      if (!sessionRecord?.backendSessionId) {
        sessionRecord = createRecentActivitySessionPlaceholder(event.sessionId);
        nextSessions = upsertSession(nextSessions, sessionRecord);
      }

      const [backendMessages, run] = await Promise.all([
        controlPlaneApi.getSessionMessages(sessionRecord.backendSessionId, { limit: 100 }),
        event.runId ? controlPlaneApi.getRun(event.runId).catch(() => null) : Promise.resolve(null)
      ]);
      if (!backendMessages || cancelled) return;

      let mappedMessages = sanitizeChatMessages(backendMessages.items.map(mapControlPlaneMessage));
      const traceUpdates: Record<string, LiveRunTrace> = {};
      let terminalRunIds: Set<string> | undefined;

      if (run) {
        const isLocallyCancelledRun = cancelledRunIds?.has(run.id) === true;
        const events = await controlPlaneApi.getRunEvents(run.id).catch(() => []);
        if (isLocallyCancelledRun) {
          terminalRunIds = new Set([run.id]);
          mappedMessages = replaceCancelledRunAssistantMessages(mappedMessages, run.id, runCancelledMessage);
        } else if (isRunTerminal(run.status)) {
          traceUpdates[run.id] = preferRicherRunTrace(runTracesByRunIdRef.current[run.id], buildTraceFromRunEvents(run, events));
          terminalRunIds = new Set([run.id]);
          if (run.status === 'cancelled') {
            mappedMessages = replaceCancelledRunAssistantMessages(mappedMessages, run.id, runCancelledMessage);
          }
        } else if (isRunInProgress(run.status)) {
          const approvals = await controlPlaneApi.listRunApprovals(run.id).catch(() => []);
          const approval = approvals.find((item) => item.status === 'pending') || approvals[approvals.length - 1];
          const pendingApproval = approval ? mapControlPlaneApprovalToPendingApproval(approval) : undefined;
          if (!mappedMessages.some((message) => message.role === 'assistant' && message.runId === run.id)) {
            mappedMessages = [...mappedMessages, createPlaceholderForRun(run, pendingApproval)];
          } else if (pendingApproval) {
            mappedMessages = mappedMessages.map((message) =>
              message.role === 'assistant' && message.runId === run.id
                ? {
                    ...message,
                    approval: pendingApproval,
                    transientStatus: resolveAssistantTransientStatus(message.content, pendingApproval)
                  }
                : message
            );
          }
          const existingTrace = runTracesByRunIdRef.current[run.id];
          const restoredTrace = buildTraceFromRunEvents(run, events);
          traceUpdates[run.id] = preferRicherRunTrace(existingTrace, restoredTrace);
        }
      }

      const currentSessions = latestSessionsRef.current;
      const publishBase = fetchedSessions
        ? mergeFetchedChatSessions(fetchedSessions, currentSessions, activeSessionIdRef.current)
        : currentSessions;
      const currentSession =
        findSession(publishBase) ||
        publishBase.find((session) => session.id === sessionRecord.id) ||
        sessionRecord;
      const mergedMessages = mergeHydratedChatMessages({
        localMessages: currentSession.messages,
        backendMessages: mappedMessages,
        runTracesByRunId: {
          ...(runTracesByRunIdRef.current || {}),
          ...traceUpdates
        },
        terminalRunIds
      });
      const hydratedSession: ChatSession = {
        ...currentSession,
        hydrated: true,
        messagesLoadFailed: false,
        messagesNextCursor: backendMessages.nextCursor,
        hasActiveRun: run && cancelledRunIds?.has(run.id) ? false : run ? isRunInProgress(run.status) : currentSession.hasActiveRun,
        messages: mergedMessages,
        timestamp: mergedMessages.length > 0 ? mergedMessages[mergedMessages.length - 1].timestamp : currentSession.timestamp
      };
      nextSessions = upsertSession(publishBase, hydratedSession);

      if (Object.keys(traceUpdates).length > 0) {
        setRunTracesByRunId((current) => {
          const next = { ...current, ...traceUpdates };
          runTracesByRunIdRef.current = next;
          return next;
        });
        setTraceExpandedByRunId((current) => {
          const next = { ...current };
          for (const runId of Object.keys(traceUpdates)) {
            next[runId] = current[runId] ?? false;
          }
          return next;
        });
      }

      if (
        run &&
        !cancelledRunIds?.has(run.id) &&
        isRunInProgress(run.status) &&
        shouldDiscoverActiveRunFromActivity(activeSessionIdRef.current, hydratedSession.id)
      ) {
        onActiveRunDiscovered?.(hydratedSession.id, run.id);
      }

      onUpdateSessionsRef.current(nextSessions);
    };

    void (async () => {
      let reconnectAttempt = 0;
      while (!cancelled) {
        streamAbortController = new AbortController();
        let processing = Promise.resolve();
        let activityRefreshFailed = false;
        try {
          await controlPlaneApi.streamTargetChatActivity(target.workspaceId, target.id, {
            signal: streamAbortController.signal,
            after: lastEventIdRef.current,
            onEvent: (event) => {
              processing = processing
                .then(async () => {
                  if (activityRefreshFailed) {
                    return;
                  }
                  try {
                    await refreshSession(event);
                    lastEventIdRef.current = event.id;
                  } catch (error) {
                    activityRefreshFailed = true;
                    if (!cancelled) {
                      console.warn('Target chat activity refresh failed', error);
                      streamAbortController?.abort();
                    }
                  }
                })
                .catch((error) => {
                  activityRefreshFailed = true;
                  if (!cancelled) {
                    console.warn('Target chat activity queue failed', error);
                    streamAbortController?.abort();
                  }
                });
            }
          });
          await processing;
        } catch (error) {
          if (!cancelled) {
            console.warn('Target chat activity stream paused', error);
          }
        } finally {
          streamAbortController = null;
        }
        if (cancelled) break;
        const delayMs = ACTIVITY_RECONNECT_DELAYS_MS[Math.min(reconnectAttempt, ACTIVITY_RECONNECT_DELAYS_MS.length - 1)];
        reconnectAttempt += 1;
        await waitForReconnect(delayMs);
      }
    })();

    return () => {
      cancelled = true;
      cleanupController.abort();
      streamAbortController?.abort();
    };
  }, [
    target.id,
    target.workspaceId,
    latestSessionsRef,
    onActiveRunDiscovered,
    runTracesByRunIdRef,
    runCancelledMessage,
    cancelledRunIds,
    setRunTracesByRunId,
    setTraceExpandedByRunId
  ]);
}
