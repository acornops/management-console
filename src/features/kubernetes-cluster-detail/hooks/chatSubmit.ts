import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { ChatMessage, ChatRuntimeSelection, ChatSession, KubernetesCluster } from '@/types';
import { controlPlaneApi, type ControlPlaneSession } from '@/services/controlPlaneApi';
import { createLocalMessageId, sleep } from '@/features/kubernetes-cluster-detail/lib/helpers';
import { appendRunTraceStep, formatTraceFailureDetail, parseRunUsage } from '@/features/kubernetes-cluster-detail/lib/trace-utils';
import {
  buildChatFailureMessage,
  buildConversationTitleFromPrompt,
  filterMessagesByRunIds,
  formatRunFailureMessage,
  mapControlPlaneMessage,
  preserveStreamingAssistantMessageId,
  resolveAssistantTransientStatus,
  sanitizeChatMessages,
  upsertSession
} from '@/features/kubernetes-cluster-detail/lib/session-utils';
import { createBaseRunTrace, createRunEventHandler } from '@/features/kubernetes-cluster-detail/hooks/chatRunTrace';
import { createConversationId } from '@/features/kubernetes-cluster-detail/hooks/chatSessionSync';
import {
  replaceCancelledRunAssistantMessages,
  replacePendingCancelledRunMessages,
  type ActiveRunStreamControls
} from '@/features/kubernetes-cluster-detail/hooks/chatRunCancellation';
import { LiveRunTrace } from '@/features/kubernetes-cluster-detail/types';
import {
  buildChatSubmitFailureMessage,
  replacePendingAssistantWithFailure
} from '@/features/kubernetes-cluster-detail/hooks/chatSubmitFailures';

export const RUN_TERMINAL_WAIT_TIMEOUT_MS = 600000;
export async function submitChatMessage(args: {
  cluster: KubernetesCluster;
  activeSession: ChatSession;
  activeSessionId: string | null;
  canChat: boolean;
  canRequestWriteRuns: boolean;
  inputValue: string;
  isLoading: boolean;
  overrideInput?: string;
  runtimeSelection?: ChatRuntimeSelection;
  shouldStickToBottomRef: MutableRefObject<boolean>;
  onUpdateSessions: (sessions: ChatSession[]) => void;
  setActiveSessionId: (sessionId: string) => void;
  setInputValue: (value: string) => void;
  setIsLoading: (value: boolean) => void;
  setActiveRunId: (runId: string | null) => void;
  setRunTracesByRunId: Dispatch<SetStateAction<Record<string, LiveRunTrace>>>;
  setTraceExpandedByRunId: Dispatch<SetStateAction<Record<string, boolean>>>;
  draftConversationName: string;
  fallbackBackendErrorMessage: string;
  runCancelledMessage: string;
  createSession?: (workspaceId: string, targetId: string, title: string) => Promise<ControlPlaneSession>;
  isRunCancelled?: (runId: string) => boolean;
  markRunCancelled?: (runId: string) => void;
  registerRunStream?: (runId: string, controls: ActiveRunStreamControls) => void;
  unregisterRunStream?: (runId: string) => void;
  suppressedRunIdsRef?: MutableRefObject<ReadonlySet<string>>;
}): Promise<void> {
  const {
    cluster,
    activeSession,
    activeSessionId,
    canChat,
    canRequestWriteRuns,
    inputValue,
    isLoading,
    overrideInput,
    runtimeSelection,
    shouldStickToBottomRef,
    onUpdateSessions,
    setActiveSessionId,
    setInputValue,
    setIsLoading,
    setActiveRunId,
    setRunTracesByRunId,
    setTraceExpandedByRunId,
    draftConversationName,
    fallbackBackendErrorMessage,
    runCancelledMessage,
    createSession = controlPlaneApi.createSession,
    isRunCancelled = () => false,
    markRunCancelled,
    registerRunStream,
    unregisterRunStream,
    suppressedRunIdsRef
  } = args;
  const prompt = (overrideInput ?? inputValue).trim();
  if (!prompt || isLoading || !canChat) return;

  const localSessionId = activeSessionId || createConversationId();
  const now = Date.now();
  let sessions = [...cluster.chatSessions];
  const existingSession = sessions.find((candidate) => candidate.id === localSessionId);
  let session = existingSession ? {
    ...existingSession,
    hydrated: true, messagesLoadFailed: false,
    messages: activeSession.messages,
    timestamp: activeSession.timestamp
  } : {
      id: localSessionId,
      name: draftConversationName,
      hydrated: true, messagesLoadFailed: false,
      messages: activeSession.messages,
      timestamp: now
    };

  sessions = existingSession ? upsertSession(sessions, session) : [...sessions, session];
  if (!activeSessionId) setActiveSessionId(localSessionId);

  const isFirstUserMessage = !session.messages.some((message) => message.role === 'user');
  if (isFirstUserMessage) {
    session = {
      ...session,
      name: buildConversationTitleFromPrompt(prompt, session.name)
    };
    sessions = upsertSession(sessions, session);
  }

  const userMessageId = createLocalMessageId();
  const userMsg: ChatMessage = {
    id: userMessageId,
    role: 'user',
    content: prompt,
    timestamp: now,
    clientMessageId: userMessageId
  };

  session = {
    ...session,
    messages: [...session.messages, userMsg],
    timestamp: now
  };
  sessions = upsertSession(sessions, session);

  const pendingAssistantMessageId = `pending-${createLocalMessageId()}`;
  const pendingTraceRunId = `pending-trace-${createLocalMessageId()}`;
  session = {
    ...session,
    messages: [
      ...session.messages,
      {
        id: pendingAssistantMessageId,
        role: 'assistant',
        runId: pendingTraceRunId,
        content: '',
        transientStatus: resolveAssistantTransientStatus(''),
        timestamp: Date.now()
      }
    ],
    timestamp: Date.now()
  };
  sessions = upsertSession(sessions, session);
  const pendingTrace = appendRunTraceStep(
    createBaseRunTrace(pendingTraceRunId, 'connecting'),
    'Submitting request',
    'info',
    'Sending your message.'
  );
  setRunTracesByRunId((current) => ({ ...current, [pendingTraceRunId]: pendingTrace }));
  setTraceExpandedByRunId((current) => ({
    ...current,
    [pendingTraceRunId]: false
  }));

  let streamAbortController: AbortController | null = null, streamPromise: Promise<void> | null = null;
  let pollEventsStop = false;
  let pollEventsPromise: Promise<void> | null = null;
  let runIdForMessage: string | undefined;
  const isAcceptedRunCancelled = () => Boolean(runIdForMessage && isRunCancelled(runIdForMessage));
  const canPublishSessions = () => !isAcceptedRunCancelled();
  let pendingSessionPublish: ReturnType<typeof setTimeout> | null = null;
  const filterSuppressedMessages = (nextMessages: ChatMessage[]) => filterMessagesByRunIds(nextMessages, suppressedRunIdsRef?.current);
  const publishSessions = (immediate = false) => {
    if (immediate) {
      if (pendingSessionPublish) {
        clearTimeout(pendingSessionPublish);
        pendingSessionPublish = null;
      }
      if (canPublishSessions()) {
        onUpdateSessions(sessions);
      }
      return;
    }

    if (pendingSessionPublish) {
      return;
    }
    pendingSessionPublish = setTimeout(() => {
      pendingSessionPublish = null;
      if (canPublishSessions()) {
        onUpdateSessions(sessions);
      }
    }, 80);
  };

  publishSessions(true);
  setInputValue('');
  setIsLoading(true);
  shouldStickToBottomRef.current = true;
  try {
    if (!session.backendSessionId) {
      const createdSession = await createSession(cluster.workspaceId, cluster.id, session.name);
      session = {
        ...session,
        backendSessionId: createdSession.id,
        status: createdSession.status,
        createdBy: createdSession.createdBy,
        createdByUser: createdSession.createdByUser,
        hydrated: true, messagesLoadFailed: false,
        timestamp: Date.parse(createdSession.updatedAt) || Date.now()
      };
      sessions = upsertSession(sessions, session);
      publishSessions(true);
      setRunTracesByRunId((current) => {
        const trace = current[pendingTraceRunId];
        if (!trace) return current;
        return {
          ...current,
          [pendingTraceRunId]: appendRunTraceStep(
            trace,
            'Conversation ready',
            'info',
            'Waiting for the assistant to accept the request.'
          )
        };
      });
    }

    const accepted = await controlPlaneApi.postSessionMessage(
      session.backendSessionId!,
      prompt,
      canRequestWriteRuns ? 'read_write' : 'read_only',
      userMsg.id,
      runtimeSelection
    );
    const streamingMessageId = `stream-${accepted.runId}`;
    runIdForMessage = accepted.runId;
    if (isRunCancelled(pendingTraceRunId)) {
      const timestamp = Date.now();
      markRunCancelled?.(accepted.runId);
      session = {
        ...session,
        messages: replacePendingCancelledRunMessages(session.messages, {
          pendingRunId: pendingTraceRunId,
          acceptedRunId: accepted.runId,
          userMessageId: userMsg.id,
          pendingAssistantMessageId,
          streamingMessageId,
          cancelledMessage: runCancelledMessage,
          timestamp
        }),
        timestamp
      };
      sessions = upsertSession(sessions, session);
      publishSessions(true);
      await controlPlaneApi.cancelRun(accepted.runId).catch(() => undefined);
      return;
    }
    if (isRunCancelled(accepted.runId)) {
      return;
    }
    setActiveRunId(accepted.runId);
    session = {
      ...session,
      messages: session.messages.map((message) => {
        if (message.id === userMsg.id) {
          return {
            ...message,
            runId: accepted.runId
          };
        }
        if (message.id !== pendingAssistantMessageId) return message;
        return {
          ...message,
          id: streamingMessageId,
          runId: accepted.runId,
          timestamp: Date.now()
        };
      }),
      timestamp: Date.now()
    };
    sessions = upsertSession(sessions, session);
    publishSessions(true);
    setRunTracesByRunId((current) => {
      const { [pendingTraceRunId]: _removed, ...rest } = current;
      return rest;
    });
    setTraceExpandedByRunId((current) => {
      const { [pendingTraceRunId]: _removed, ...rest } = current;
      return rest;
    });
    const seenSeq = new Set<number>();
    let trace: LiveRunTrace = {
      runId: accepted.runId,
      status: 'connecting',
      steps: [
        {
          id: createLocalMessageId(),
          label: 'Request queued',
          detail: 'Waiting for an assistant worker.',
          status: 'info',
          timestamp: Date.now()
        }
      ],
      toolCalls: []
    };
    setRunTracesByRunId((current) => ({
      ...current,
      [accepted.runId]: trace
    }));
    setTraceExpandedByRunId((current) => ({
      ...current,
      [accepted.runId]: false
    }));

    const setTraceForRun = (nextTrace: LiveRunTrace) => {
      if (isRunCancelled(accepted.runId)) return;
      trace = nextTrace;
      setRunTracesByRunId((current) => ({
        ...current,
        [accepted.runId]: nextTrace
      }));
    };

    const setTraceExpandedForRun = (expanded: boolean) => {
      setTraceExpandedByRunId((current) => ({
        ...current,
        [accepted.runId]: expanded
      }));
    };

    const ensureStreamingMessage = () => {
      if (isRunCancelled(accepted.runId)) return;
      if (session.messages.some((message) => message.id === streamingMessageId)) return;
      session = {
        ...session,
        messages: [
          ...session.messages,
          {
            id: streamingMessageId,
            role: 'assistant',
            runId: accepted.runId,
            content: '',
            transientStatus: resolveAssistantTransientStatus(''),
            timestamp: Date.now()
          }
        ],
        timestamp: Date.now()
      };
      sessions = upsertSession(sessions, session);
      publishSessions(false);
    };

    const appendStreamingText = (text: string) => {
      if (!text || isRunCancelled(accepted.runId)) return;
      ensureStreamingMessage();
      if (isRunCancelled(accepted.runId)) return;
      session = {
        ...session,
        messages: session.messages.map((message) => {
          if (message.id !== streamingMessageId) return message;
          const nextContent = `${message.content}${text}`;
          return {
            ...message,
            content: nextContent,
            transientStatus: resolveAssistantTransientStatus(nextContent, message.approval),
            timestamp: Date.now()
          };
        }),
        timestamp: Date.now()
      };
      sessions = upsertSession(sessions, session);
      publishSessions(false);
    };

    const upsertApprovalOnStreamingMessage = (approval: ChatMessage['approval']) => {
      if (!approval || isRunCancelled(accepted.runId)) return;
      ensureStreamingMessage();
      if (isRunCancelled(accepted.runId)) return;
      session = {
        ...session,
        messages: session.messages.map((message) => {
          if (message.id !== streamingMessageId) return message;
          return {
            ...message,
            approval,
            transientStatus: undefined,
            timestamp: Date.now()
          };
        }),
        timestamp: Date.now()
      };
      sessions = upsertSession(sessions, session);
      publishSessions(true);
    };

    const resolveApprovalOnStreamingMessage = (
      approvalId: string,
      status: 'approved' | 'rejected' | 'expired'
    ) => {
      if (isRunCancelled(accepted.runId)) return;
      session = {
        ...session,
        messages: session.messages.map((message) => {
          if (message.id !== streamingMessageId || message.approval?.id !== approvalId) return message;
          return {
            ...message,
            approval: {
              ...message.approval,
              status
            },
            timestamp: Date.now()
          };
        }),
        timestamp: Date.now()
      };
      sessions = upsertSession(sessions, session);
      publishSessions(true);
    };

    const applyRunEvent = createRunEventHandler({
      seenSeq,
      getTrace: () => trace,
      setTrace: setTraceForRun,
      setTraceExpanded: setTraceExpandedForRun,
      ensureStreamingMessage,
      appendStreamingText,
      onApprovalRequested: upsertApprovalOnStreamingMessage,
      onApprovalResolved: resolveApprovalOnStreamingMessage
    });

    streamAbortController = new AbortController();
    const stopActiveRunStreams = () => {
      pollEventsStop = true;
      streamAbortController?.abort();
    };
    registerRunStream?.(accepted.runId, { abort: stopActiveRunStreams });
    const handleRunEvent = (event: Parameters<typeof applyRunEvent>[0]) => {
      if (isRunCancelled(accepted.runId)) return;
      applyRunEvent(event);
    };
    streamPromise = controlPlaneApi.streamRunEvents(accepted.runId, {
      signal: streamAbortController.signal,
      onEvent: handleRunEvent
    });
    pollEventsPromise = (async () => {
      while (!pollEventsStop && !isRunCancelled(accepted.runId)) {
        try {
          const polledEvents = await controlPlaneApi.getRunEvents(accepted.runId);
          for (const polledEvent of polledEvents) {
            if (isRunCancelled(accepted.runId)) break;
            handleRunEvent(polledEvent);
          }
        } catch {
          // Polling is best-effort; SSE remains the primary channel.
        }
        await sleep(700);
      }
    })();

    let run = await controlPlaneApi.waitForRunTerminalState(accepted.runId, {
      timeoutMs: RUN_TERMINAL_WAIT_TIMEOUT_MS,
      pollIntervalMs: 1200
    });
    if (isRunCancelled(accepted.runId)) {
      return;
    }
    pollEventsStop = true;
    streamAbortController.abort();
    await streamPromise.catch(() => undefined);
    if (pollEventsPromise) {
      await pollEventsPromise.catch(() => undefined);
    }

    if (run.status === 'completed') {
      setTraceExpandedForRun(false);
      setRunTracesByRunId((current) => {
        const existingTrace = current[accepted.runId] || createBaseRunTrace(accepted.runId, 'completed');
        const usage = parseRunUsage(run.usage);
        const traceWithUsage = usage ? { ...existingTrace, usage } : existingTrace;
        const completedTrace = appendRunTraceStep(
          { ...traceWithUsage, status: 'completed' },
          'Completed',
          'success',
          'The run finished successfully.'
        );
        return {
          ...current,
          [accepted.runId]: {
            ...completedTrace,
            status: 'completed'
          }
        };
      });
    } else if (run.status === 'cancelled') {
      setTraceExpandedForRun(false);
      setRunTracesByRunId((current) => {
        const existingTrace = current[accepted.runId] || createBaseRunTrace(accepted.runId, 'cancelled');
        const cancelledTrace = existingTrace.steps.length > 0
          ? existingTrace
          : appendRunTraceStep(existingTrace, 'Cancelled', 'error', 'You cancelled this response.');
        return {
          ...current,
          [accepted.runId]: {
            ...cancelledTrace,
            status: 'cancelled'
          }
        };
      });
    } else if (run.status === 'failed') {
      setTraceExpandedForRun(false);
      setRunTracesByRunId((current) => {
        const existingTrace = current[accepted.runId] || createBaseRunTrace(accepted.runId, 'failed');
        const failedTrace = existingTrace.steps.length > 0
          ? existingTrace
          : appendRunTraceStep(existingTrace, 'Could not complete', 'error', formatTraceFailureDetail());
        return {
          ...current,
          [accepted.runId]: {
            ...failedTrace,
            status: 'failed'
          }
        };
      });
    }

    if (run.status === 'completed') {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const committedContent = String(run.assistantMessage?.content || '').trim();
        if (committedContent) {
          break;
        }
        await sleep(250);
        run = await controlPlaneApi.getRun(accepted.runId);
      }
    }

    let backendMessages = await controlPlaneApi.getSessionMessages(session.backendSessionId!, { limit: 100 });
    let mappedMessages = filterSuppressedMessages(sanitizeChatMessages(backendMessages.items.map(mapControlPlaneMessage)));
    mappedMessages = preserveStreamingAssistantMessageId(mappedMessages, run.id, streamingMessageId);
    if (run.status === 'cancelled') {
      mappedMessages = replaceCancelledRunAssistantMessages(mappedMessages, run.id, runCancelledMessage);
    }
    const hasRunAssistantMessage = mappedMessages.some(
      (message) => message.role === 'assistant' && message.runId === run.id && message.content.trim().length > 0
    );
    if (run.status === 'failed' && !hasRunAssistantMessage) {
      mappedMessages.push(buildChatFailureMessage(formatRunFailureMessage(run.errorCode, run.errorMessage), run.id));
    } else if (run.status === 'completed' && !hasRunAssistantMessage) {
      const committedAssistantContent = String(run.assistantMessage?.content || '').trim();
      if (committedAssistantContent) {
        mappedMessages.push({
          id: createLocalMessageId(),
          role: 'assistant',
          content: committedAssistantContent,
          runId: run.id,
          timestamp: Date.now()
        });
      } else {
        await sleep(300);
        backendMessages = await controlPlaneApi.getSessionMessages(session.backendSessionId!, { limit: 100 });
        mappedMessages = filterSuppressedMessages(sanitizeChatMessages(backendMessages.items.map(mapControlPlaneMessage)));
        mappedMessages = preserveStreamingAssistantMessageId(mappedMessages, run.id, streamingMessageId);
        const hasRunAssistantMessageAfterRetry = mappedMessages.some(
          (message) => message.role === 'assistant' && message.runId === run.id && message.content.trim().length > 0
        );
        if (!hasRunAssistantMessageAfterRetry) {
          mappedMessages.push(
            buildChatFailureMessage(
              'The run finished without a response body. Please retry once; if it persists, check execution-engine and llm-gateway logs.',
              run.id
            )
          );
        }
      }
    }

    if (mappedMessages.length > 0) {
      session = {
        ...session,
        hydrated: true, messagesLoadFailed: false,
        messages: filterSuppressedMessages(mappedMessages),
        timestamp: Date.now()
      };
    } else if (run.status === 'failed') {
      session = {
        ...session,
        hydrated: true, messagesLoadFailed: false,
        messages: filterSuppressedMessages([...sanitizeChatMessages(session.messages), buildChatFailureMessage(formatRunFailureMessage(run.errorCode, run.errorMessage), run.id)]),
        timestamp: Date.now()
      };
    } else if (run.status === 'cancelled') {
      session = {
        ...session,
        hydrated: true, messagesLoadFailed: false,
        messages: replaceCancelledRunAssistantMessages(
          filterSuppressedMessages(sanitizeChatMessages(session.messages)),
          run.id,
          runCancelledMessage
        ),
        timestamp: Date.now()
      };
    }

    sessions = upsertSession(sessions, session);
    publishSessions(true);
  } catch (error) {
    if (isAcceptedRunCancelled()) {
      return;
    }
    const failureMessage = buildChatSubmitFailureMessage({
      error,
      workspaceId: cluster.workspaceId,
      fallbackMessage: fallbackBackendErrorMessage,
      runId: runIdForMessage
    });
    session = {
      ...session,
      hydrated: true, messagesLoadFailed: false,
      messages: replacePendingAssistantWithFailure({
        messages: session.messages,
        pendingAssistantMessageId,
        pendingTraceRunId,
        acceptedRunId: runIdForMessage,
        failureMessage
      }),
      timestamp: Date.now()
    };
    sessions = upsertSession(sessions, session);
    publishSessions(true);
  } finally {
    if (streamAbortController) streamAbortController.abort();
    if (streamPromise) await streamPromise.catch(() => undefined);
    pollEventsStop = true;
    if (pollEventsPromise) await pollEventsPromise.catch(() => undefined);
    setRunTracesByRunId((current) => {
      const { [pendingTraceRunId]: _removed, ...rest } = current;
      return rest;
    });
    setTraceExpandedByRunId((current) => {
      const { [pendingTraceRunId]: _removed, ...rest } = current;
      return rest;
    });
    if (pendingSessionPublish) {
      clearTimeout(pendingSessionPublish);
      pendingSessionPublish = null;
    }
    if (runIdForMessage) unregisterRunStream?.(runIdForMessage);
    setIsLoading(false);
    setActiveRunId(null);
  }
}
