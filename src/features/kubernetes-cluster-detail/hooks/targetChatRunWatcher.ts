import { useEffect, useRef } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ChatSession } from '@/types';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import {
  mapControlPlaneMessage,
  resolveAssistantTransientStatus,
  sanitizeChatMessages,
  upsertSession
} from '@/features/kubernetes-cluster-detail/lib/session-utils';
import { mergeHydratedChatMessages } from '@/features/kubernetes-cluster-detail/hooks/chatSessionSync';
import { replaceCancelledRunAssistantMessages } from '@/features/kubernetes-cluster-detail/hooks/chatRunCancellation';
import {
  buildTraceFromRunEvents,
  createBaseRunTrace,
  createRunEventHandler,
  isRunInProgress,
  isTraceTerminal,
  mapRunStatusToTraceStatus,
  isTraceInProgress,
  preferRicherRunTrace
} from '@/features/kubernetes-cluster-detail/hooks/chatRunTrace';
import type { LiveRunTrace } from '@/features/kubernetes-cluster-detail/types';

const WATCHER_RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000];
const WATCHER_EVENT_POLL_INTERVAL_MS = 700;

function isTerminalRunEventType(type: string): boolean {
  return type === 'run_completed' || type === 'run_failed' || type === 'run_cancelled';
}

type ControlPlaneRun = Awaited<ReturnType<typeof controlPlaneApi.getRun>>;
type ControlPlaneRunEvent = Awaited<ReturnType<typeof controlPlaneApi.getRunEvents>>[number];

export function useWatchedRunStream(args: {
  activeRunId: string | null;
  activeSessionRecord: ChatSession | null;
  effectiveActiveRunId: string | null;
  hasLocalRunStream?: (runId: string) => boolean;
  latestSessionsRef: MutableRefObject<ChatSession[]>;
  onUpdateSessions: (sessions: ChatSession[]) => void;
  runTracesByRunIdRef: MutableRefObject<Record<string, LiveRunTrace>>;
  suppressedHydrationRunIdsRef?: MutableRefObject<ReadonlySet<string>>;
  setRunTracesByRunId: Dispatch<SetStateAction<Record<string, LiveRunTrace>>>;
  setTraceExpandedByRunId: Dispatch<SetStateAction<Record<string, boolean>>>;
  isRunCancelled?: (runId: string) => boolean;
  runCancelledMessage: string;
}): void {
  const {
    activeRunId,
    activeSessionRecord,
    effectiveActiveRunId,
    hasLocalRunStream = (runId: string) => activeRunId === runId,
    latestSessionsRef,
    onUpdateSessions,
    runTracesByRunIdRef,
    suppressedHydrationRunIdsRef,
    setRunTracesByRunId,
    setTraceExpandedByRunId,
    isRunCancelled = () => false,
    runCancelledMessage
  } = args;
  const watchedSessionId = activeSessionRecord?.id || null;
  const watchedBackendSessionId = activeSessionRecord?.backendSessionId || null;
  const onUpdateSessionsRef = useRef(onUpdateSessions);

  useEffect(() => {
    onUpdateSessionsRef.current = onUpdateSessions;
  }, [onUpdateSessions]);

  useEffect(() => {
    const runId = effectiveActiveRunId;
    if (
      !runId ||
      hasLocalRunStream(runId) ||
      isRunCancelled(runId) ||
      !watchedSessionId ||
      !watchedBackendSessionId
    ) {
      return;
    }

    let cancelled = false;
    const abortController = new AbortController();
    const seenSeq = new Set<number>();
    let trace = runTracesByRunIdRef.current[runId] || {
      runId,
      status: 'connecting' as const,
      steps: [],
      toolCalls: []
    };
    const streamingMessageId = `stream-${runId}`;
    let activeStreamingMessageId = streamingMessageId;
    let streamingContent = '';
    let streamingApproval: ChatSession['messages'][number]['approval'];
    let pendingWatchedSessions: ChatSession[] | null = null;
    let pendingSessionPublish: ReturnType<typeof setTimeout> | null = null;
    let pollEventsStop = false;

    const setTraceForRun = (nextTrace: LiveRunTrace) => {
      if (isRunCancelled(runId)) return;
      trace = nextTrace;
      setRunTracesByRunId((current) => {
        const next = {
          ...current,
          [runId]: nextTrace
        };
        runTracesByRunIdRef.current = next;
        return next;
      });
    };

    const publishWatchedSessions = (immediate = false) => {
      if (isRunCancelled(runId)) {
        pendingWatchedSessions = null;
        return;
      }
      if (!pendingWatchedSessions) {
        return;
      }

      if (immediate) {
        if (pendingSessionPublish) {
          clearTimeout(pendingSessionPublish);
          pendingSessionPublish = null;
        }
        const nextSessions = pendingWatchedSessions;
        pendingWatchedSessions = null;
        onUpdateSessionsRef.current(nextSessions);
        return;
      }

      if (pendingSessionPublish) {
        return;
      }
      pendingSessionPublish = setTimeout(() => {
        pendingSessionPublish = null;
        if (!pendingWatchedSessions) {
          return;
        }
        const nextSessions = pendingWatchedSessions;
        pendingWatchedSessions = null;
        onUpdateSessionsRef.current(nextSessions);
      }, 80);
    };

    const updateWatchedSession = (mutate: (session: ChatSession) => ChatSession, immediate = false) => {
      if (cancelled || isRunCancelled(runId)) return;
      const currentSessions = pendingWatchedSessions || latestSessionsRef.current;
      const currentSession = currentSessions.find((session) => session.id === watchedSessionId);
      if (!currentSession) return;
      pendingWatchedSessions = upsertSession(currentSessions, mutate(currentSession));
      publishWatchedSessions(immediate);
    };

    const readCurrentStreamingContent = () => {
      const currentSession = latestSessionsRef.current.find((session) => session.id === watchedSessionId);
      const existingRunMessage = currentSession?.messages.find(
        (message) => message.role === 'assistant' && message.runId === runId
      );
      if (existingRunMessage) {
        activeStreamingMessageId = existingRunMessage.id;
      }
      return existingRunMessage?.content || '';
    };

    const writeStreamingMessage = (content: string, shouldUpdateExistingContent: boolean) => {
      updateWatchedSession((session) => {
        const existingRunMessage = session.messages.find(
          (message) => message.role === 'assistant' && message.runId === runId
        );
        if (existingRunMessage) {
          activeStreamingMessageId = existingRunMessage.id;
          const shouldSyncContent = shouldUpdateExistingContent && existingRunMessage.content !== content;
          const shouldSyncApproval = Boolean(streamingApproval && existingRunMessage.approval !== streamingApproval);
          if (!shouldSyncContent && !shouldSyncApproval) {
            return session;
          }
          const nextContent = shouldSyncContent ? content : existingRunMessage.content;
          const nextApproval = streamingApproval || existingRunMessage.approval;
          return {
            ...session,
            hasActiveRun: true,
            messages: session.messages.map((message) =>
              message.id === existingRunMessage.id
                ? {
                    ...message,
                    content: nextContent,
                    approval: nextApproval,
                    transientStatus: resolveAssistantTransientStatus(nextContent, nextApproval),
                    timestamp: Date.now()
                  }
                : message
            ),
            timestamp: Date.now()
          };
        }
        return {
          ...session,
          hasActiveRun: true,
          messages: [
            ...session.messages,
            {
              id: streamingMessageId,
              role: 'assistant',
              runId,
              content,
              approval: streamingApproval,
              transientStatus: resolveAssistantTransientStatus(content, streamingApproval),
              timestamp: Date.now()
            }
          ],
          timestamp: Date.now()
        };
      });
    };

    const ensureStreamingMessage = (content = '') => {
      if (isRunCancelled(runId)) return;
      if (content) {
        streamingContent = content;
      } else if (!streamingContent) {
        streamingContent = readCurrentStreamingContent();
      }
      writeStreamingMessage(streamingContent, Boolean(content));
    };

    const replayApprovalState = (events: ControlPlaneRunEvent[]) => {
      const approvalsById = new Map<string, NonNullable<typeof streamingApproval>>();
      for (const event of events) {
        const approvalId = typeof event.payload?.approval_id === 'string' ? event.payload.approval_id : '';
        if (!approvalId) continue;

        if (event.type === 'tool_approval_requested') {
          const toolName = typeof event.payload?.tool === 'string' ? event.payload.tool : 'write tool';
          const toolCallId = typeof event.payload?.tool_call_id === 'string' ? event.payload.tool_call_id : undefined;
          const summary = typeof event.payload?.summary === 'string' ? event.payload.summary : undefined;
          const expiresAt = typeof event.payload?.expires_at === 'string' ? event.payload.expires_at : undefined;
          const toolArguments = event.payload?.arguments && typeof event.payload.arguments === 'object'
            ? event.payload.arguments as Record<string, unknown>
            : {};
          approvalsById.set(approvalId, {
            id: approvalId,
            runId,
            toolCallId,
            action: `Run ${toolName}`,
            summary,
            toolName,
            arguments: toolArguments,
            expiresAt,
            status: 'pending'
          });
        } else if (
          event.type === 'tool_approval_approved' ||
          event.type === 'tool_approval_rejected' ||
          event.type === 'tool_approval_expired'
        ) {
          const existing = approvalsById.get(approvalId);
          if (existing) {
            approvalsById.set(approvalId, {
              ...existing,
              status: event.type === 'tool_approval_approved'
                ? 'approved'
                : event.type === 'tool_approval_rejected'
                  ? 'rejected'
                  : 'expired'
            });
          }
        }
      }

      const pendingApproval = Array.from(approvalsById.values()).reverse().find((approval) => approval.status === 'pending');
      if (pendingApproval) {
        streamingApproval = pendingApproval;
      }
    };

    const appendStreamingText = (text: string) => {
      if (!text || isRunCancelled(runId)) return;
      if (!streamingContent) {
        streamingContent = readCurrentStreamingContent();
      }
      streamingContent = `${streamingContent}${text}`;
      writeStreamingMessage(streamingContent, true);
    };

    const handleRunEvent = createRunEventHandler({
      seenSeq,
      getTrace: () => trace,
      setTrace: setTraceForRun,
      setTraceExpanded: (expanded) => {
        setTraceExpandedByRunId((current) => ({ ...current, [runId]: expanded }));
      },
      ensureStreamingMessage,
      appendStreamingText,
      onApprovalRequested: (approval) => {
        streamingApproval = approval;
        ensureStreamingMessage();
        publishWatchedSessions(true);
      },
      onApprovalResolved: (approvalId, status) => {
        if (streamingApproval?.id === approvalId) {
          streamingApproval = { ...streamingApproval, status };
          ensureStreamingMessage();
          publishWatchedSessions(true);
          return;
        }
        updateWatchedSession((session) => ({
          ...session,
          messages: session.messages.map((message) =>
            message.id === activeStreamingMessageId && message.approval?.id === approvalId
              ? { ...message, approval: { ...message.approval, status }, timestamp: Date.now() }
              : message
          )
        }), true);
      }
    });

    const replayRunEvents = (run: ControlPlaneRun, events: ControlPlaneRunEvent[]) => {
      if (!isRunInProgress(run.status)) {
        setTraceForRun(preferRicherRunTrace(trace, buildTraceFromRunEvents(run, events)));
        return;
      }
      if (events.length === 0) {
        setTraceForRun(buildTraceFromRunEvents(run, events));
        return;
      }
      setTraceForRun(createBaseRunTrace(run.id, isRunInProgress(run.status) ? mapRunStatusToTraceStatus(run.status) : 'connecting'));
      for (const event of events) {
        handleRunEvent(event);
      }
      if (!isRunInProgress(run.status) && !isTraceTerminal(trace)) {
        setTraceForRun({ ...trace, status: mapRunStatusToTraceStatus(run.status) });
      }
    };

    const waitForReconnect = (delayMs: number) =>
      new Promise<void>((resolve) => {
        const timer = window.setTimeout(resolve, delayMs);
        abortController.signal.addEventListener(
          'abort',
          () => {
            window.clearTimeout(timer);
            resolve();
          },
          { once: true }
        );
      });

    const reconcileWatchedSession = async (latestRun: ControlPlaneRun | null) => {
      const backendMessages = await controlPlaneApi.getSessionMessages(watchedBackendSessionId, { limit: 100 }).catch(() => null);
      if (cancelled || isRunCancelled(runId)) return;
      let mappedMessages = backendMessages
        ? sanitizeChatMessages(backendMessages.items.map(mapControlPlaneMessage))
        : null;
      if (latestRun?.status === 'cancelled' && mappedMessages) {
        mappedMessages = replaceCancelledRunAssistantMessages(mappedMessages, runId, runCancelledMessage);
      }
      updateWatchedSession((session) => {
        const fallbackMessages = latestRun?.status === 'cancelled'
          ? replaceCancelledRunAssistantMessages(session.messages, runId, runCancelledMessage)
          : session.messages;
        const terminalRunIds = latestRun && !isRunInProgress(latestRun.status) ? new Set([runId]) : undefined;
        const nextMessages = mappedMessages
          ? mergeHydratedChatMessages({
              localMessages: fallbackMessages,
              backendMessages: mappedMessages,
              runTracesByRunId: runTracesByRunIdRef.current,
              terminalRunIds,
              suppressedRunIds: suppressedHydrationRunIdsRef?.current
            })
          : fallbackMessages;
        return {
          ...session,
          hydrated: backendMessages ? true : session.hydrated,
          messagesLoadFailed: backendMessages ? false : session.messagesLoadFailed,
          hasActiveRun: latestRun ? isRunInProgress(latestRun.status) : isTraceInProgress(trace),
          messages: nextMessages,
          timestamp: Date.now()
        };
      }, true);
    };

    void (async () => {
      let latestRun: ControlPlaneRun | null = null;
      let reconnectAttempt = 0;
      let pollEventsPromise: Promise<void> | null = null;
      try {
        const [run, events] = await Promise.all([
          controlPlaneApi.getRun(runId),
          controlPlaneApi.getRunEvents(runId).catch(() => [])
        ]);
        latestRun = run;
        if (cancelled || isRunCancelled(runId)) return;
        replayRunEvents(run, events);
        replayApprovalState(events);
        if (isRunCancelled(runId)) return;
        const replayedText = events
          .filter((event) => event.type === 'assistant_token_delta' && typeof event.payload?.text === 'string')
          .map((event) => String(event.payload.text))
          .join('');
        ensureStreamingMessage(replayedText);
        pollEventsPromise = (async () => {
          while (!pollEventsStop && !cancelled && !isRunCancelled(runId)) {
            try {
              const polledEvents = await controlPlaneApi.getRunEvents(runId);
              for (const polledEvent of polledEvents) {
                if (pollEventsStop || cancelled || isRunCancelled(runId)) break;
                handleRunEvent(polledEvent);
              }
            } catch {
              // Polling is best-effort; SSE remains the primary channel.
            }
            await waitForReconnect(WATCHER_EVENT_POLL_INTERVAL_MS);
          }
        })();

        while (!cancelled && !isRunCancelled(runId) && latestRun && isRunInProgress(latestRun.status)) {
          try {
            await controlPlaneApi.streamRunEvents(runId, {
              signal: abortController.signal,
              onEvent: (event) => {
                handleRunEvent(event);
                if (isTerminalRunEventType(event.type)) {
                  abortController.abort();
                }
              }
            });
          } catch (error) {
            if (!cancelled) {
              console.warn('Live run watcher stream paused', error);
            }
          }

          if (cancelled || isRunCancelled(runId)) return;
          latestRun = await controlPlaneApi.getRun(runId).catch(() => latestRun);
          const missedEvents = await controlPlaneApi.getRunEvents(runId).catch(() => []);
          for (const event of missedEvents) {
            if (isRunCancelled(runId)) break;
            handleRunEvent(event);
          }
          await reconcileWatchedSession(latestRun);

          if (!latestRun || !isRunInProgress(latestRun.status)) {
            pollEventsStop = true;
            return;
          }

          const delayMs = WATCHER_RECONNECT_DELAYS_MS[Math.min(reconnectAttempt, WATCHER_RECONNECT_DELAYS_MS.length - 1)];
          reconnectAttempt += 1;
          await waitForReconnect(delayMs);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('Live run watcher could not start', error);
        }
      } finally {
        pollEventsStop = true;
        if (pollEventsPromise) {
          await pollEventsPromise.catch(() => undefined);
        }
        if (!cancelled) {
          if (isRunCancelled(runId)) return;
          await reconcileWatchedSession(latestRun || await controlPlaneApi.getRun(runId).catch(() => null));
        }
      }
    })();

    return () => {
      cancelled = true;
      pollEventsStop = true;
      abortController.abort();
      if (pendingSessionPublish) {
        clearTimeout(pendingSessionPublish);
        pendingSessionPublish = null;
      }
    };
  }, [
    activeRunId,
    effectiveActiveRunId,
    hasLocalRunStream,
    latestSessionsRef,
    runTracesByRunIdRef,
    setTraceExpandedByRunId,
    setRunTracesByRunId,
    isRunCancelled,
    runCancelledMessage,
    watchedBackendSessionId,
    watchedSessionId
  ]);
}
