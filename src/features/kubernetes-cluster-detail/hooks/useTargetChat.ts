import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatMessage, ChatRuntimeSelection, ChatSession, PendingApproval } from '@/types';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import {
  mapControlPlaneMessage,
  sanitizeChatMessages,
  filterMessagesByRunIds,
  isPendingAssistantPlaceholder,
  isBlankAssistantMessage,
  upsertSession
} from '@/features/kubernetes-cluster-detail/lib/session-utils';
import { submitChatMessage } from '@/features/kubernetes-cluster-detail/hooks/chatSubmit';
import {
  createConversationId,
  sortSessionsByTimestamp,
  useControlPlaneChatSessionSync
} from '@/features/kubernetes-cluster-detail/hooks/chatSessionSync';
import { isTraceInProgress } from '@/features/kubernetes-cluster-detail/hooks/chatRunTrace';
import {
  buildRecentActivityWarning,
  buildTargetChatAutoScrollSignature,
  buildTargetChatConversationAccessState,
  createRecentActivitySessionPlaceholder,
  deriveTargetChatRunState,
} from '@/features/kubernetes-cluster-detail/hooks/targetChatState';
import type { TargetChatController, UseTargetChatArgs } from '@/features/kubernetes-cluster-detail/hooks/targetChatControllerTypes';
import { useTargetChatActivityStream } from '@/features/kubernetes-cluster-detail/hooks/targetChatActivityStream';
import { useWatchedRunStream } from '@/features/kubernetes-cluster-detail/hooks/targetChatRunWatcher';
import { useActivityDiscoveredRun } from '@/features/kubernetes-cluster-detail/hooks/useActivityDiscoveredRun';
import { useTargetChatScrollAnchor } from '@/features/kubernetes-cluster-detail/hooks/useTargetChatScrollAnchor';
import { LiveRunTrace } from '@/features/kubernetes-cluster-detail/types';
import {
  replaceCancelledRunAssistantMessages,
  type ActiveRunStreamControls
} from '@/features/kubernetes-cluster-detail/hooks/chatRunCancellation';
export type { TargetChatController } from '@/features/kubernetes-cluster-detail/hooks/targetChatControllerTypes';
export function useTargetChat({
  target,
  currentUserId,
  canChat,
  canRequestWriteRuns,
  isChatActive,
  onUpdateSessions,
  onSessionDeleted,
  initialActiveSessionId = null,
  sessionApi
}: UseTargetChatArgs): TargetChatController {
  const { t } = useTranslation();
  const cluster = target;
  const sessions = sortSessionsByTimestamp(cluster.chatSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    initialActiveSessionId || (sessions.length > 0 ? sessions[0].id : null)
  );
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [isCancellingRun, setIsCancellingRun] = useState(false);
  const [isLoadingEarlierMessages, setIsLoadingEarlierMessages] = useState(false);
  const [runTracesByRunId, setRunTracesByRunId] = useState<Record<string, LiveRunTrace>>({});
  const runTracesByRunIdRef = useRef<Record<string, LiveRunTrace>>({});
  const [traceExpandedByRunId, setTraceExpandedByRunId] = useState<Record<string, boolean>>({});
  const loadingEarlierMessagesRef = useRef(false);
  const latestSessionsRef = useRef<ChatSession[]>(sessions);
  const cancelledRunIdsRef = useRef<Set<string>>(new Set());
  const suppressedHydrationRunIdsRef = useRef<Set<string>>(new Set());
  const activeRunStreamControlsRef = useRef<Record<string, ActiveRunStreamControls>>({});
  const submitInFlightRef = useRef(false);
  const isRunCancelled = useCallback((runId: string) => cancelledRunIdsRef.current.has(runId), []);
  const markRunCancelled = useCallback((runId: string) => {
    cancelledRunIdsRef.current.add(runId);
  }, []);
  const setRunTracesByRunIdAndRef: typeof setRunTracesByRunId = useCallback((update) => {
    setRunTracesByRunId((current) => {
      const next = typeof update === 'function'
        ? (update as (previous: Record<string, LiveRunTrace>) => Record<string, LiveRunTrace>)(current)
        : update;
      runTracesByRunIdRef.current = next;
      return next;
    });
  }, []);
  const registerRunStream = useCallback((runId: string, controls: ActiveRunStreamControls) => {
    activeRunStreamControlsRef.current[runId] = controls;
  }, []);
  const unregisterRunStream = useCallback((runId: string) => {
    delete activeRunStreamControlsRef.current[runId];
  }, []);
  const hasLocalRunStream = useCallback((runId: string) => Boolean(activeRunStreamControlsRef.current[runId]), []);
  const activeSession = sessions.find((s) => s.id === activeSessionId) || {
    id: 'default',
    name: t('chat.newConversation'),
    messages: [],
    timestamp: Date.now()
  };
  const activeSessionRecord = sessions.find((s) => s.id === activeSessionId) || null;
  const {
    isActiveSessionOwner,
    conversationNotice,
    recentActivityWarning,
    canPostInActiveSession
  } = buildTargetChatConversationAccessState({ canChat, currentUserId, session: activeSessionRecord });
  const messages = activeSession.messages;
  const derivedRunState = deriveTargetChatRunState({
    localActiveRunId: activeRunId,
    activeSession,
    runTracesByRunId,
    isLocalRunLoading: isLoading,
    cancelledRunIds: cancelledRunIdsRef.current
  });
  const {
    activityDiscoveredRunId,
    clearActivityWatchedRunForSession,
    handleActiveRunDiscovered,
    resetActivityWatchedRun
  } = useActivityDiscoveredRun({
    activeSession,
    runTracesByRunId,
    cancelledRunIds: cancelledRunIdsRef.current
  });
  const effectiveActiveRunId = derivedRunState.activeRunId || activityDiscoveredRunId;
  const isRunActive = isLoading || derivedRunState.isRunActive || Boolean(activityDiscoveredRunId);
  const chatAutoScrollSignature = buildTargetChatAutoScrollSignature({ messages, effectiveActiveRunId, runTracesByRunId });
  const {
    lastChatScrollTopRef,
    scrollRef,
    shouldStickToBottomRef,
    transcriptRef
  } = useTargetChatScrollAnchor({
    activeSessionId,
    chatAutoScrollSignature,
    isChatActive,
    isLoadingEarlierMessages
  });
  useEffect(() => {
    const sortedSessions = sortSessionsByTimestamp(cluster.chatSessions);
    if (!activeSessionId) {
      setActiveSessionId(sortedSessions.length > 0 ? sortedSessions[0].id : null);
      return;
    }
    if (sortedSessions.some((session) => session.id === activeSessionId)) {
      return;
    }
    setActiveSessionId(sortedSessions.length > 0 ? sortedSessions[0].id : null);
  }, [activeSessionId, cluster.chatSessions, cluster.id]);
  useEffect(() => {
    setRunTracesByRunId({});
    setTraceExpandedByRunId({});
    setActiveRunId(null);
    resetActivityWatchedRun();
    setIsCancellingRun(false);
    cancelledRunIdsRef.current.clear();
    suppressedHydrationRunIdsRef.current.clear();
    activeRunStreamControlsRef.current = {};
    shouldStickToBottomRef.current = true;
  }, [cluster.id]);
  useEffect(() => {
    runTracesByRunIdRef.current = runTracesByRunId;
  }, [runTracesByRunId]);
  useEffect(() => {
    latestSessionsRef.current = sessions;
  }, [sessions]);

  const { isSessionsLoading, clearHydratingSession } = useControlPlaneChatSessionSync({
    cluster,
    activeSessionId,
    sessions,
    onUpdateSessions,
    runTracesByRunIdRef,
    setRunTracesByRunId,
    setTraceExpandedByRunId,
    isRunCancelled,
    suppressedHydrationRunIdsRef,
    runCancelledMessage: t('chat.runCancelledMessage'),
    listSessions: sessionApi?.listSessions
  });
  useWatchedRunStream({
    activeRunId,
    activeSessionRecord,
    effectiveActiveRunId,
    hasLocalRunStream,
    latestSessionsRef,
    onUpdateSessions,
    runTracesByRunIdRef,
    suppressedHydrationRunIdsRef,
    setTraceExpandedByRunId,
    setRunTracesByRunId,
    isRunCancelled,
    runCancelledMessage: t('chat.runCancelledMessage')
  });
  useTargetChatActivityStream({
    cluster,
    latestSessionsRef,
    activeSessionId,
    onActiveRunDiscovered: handleActiveRunDiscovered,
    onUpdateSessions,
    runTracesByRunIdRef,
    runCancelledMessage: t('chat.runCancelledMessage'),
    cancelledRunIds: cancelledRunIdsRef.current,
    setRunTracesByRunId: setRunTracesByRunIdAndRef,
    setTraceExpandedByRunId
  });
  const isInFlightAssistantPlaceholder = (message: ChatMessage): boolean => {
    if (isPendingAssistantPlaceholder(message)) {
      return true;
    }
    if (!isBlankAssistantMessage(message)) {
      return false;
    }
    const messageId = String(message.id || '');
    if (isRunActive && (messageId.startsWith('pending-') || messageId.startsWith('stream-'))) {
      return true;
    }
    if (!message.runId) {
      return false;
    }

    const trace = runTracesByRunId[message.runId];
    if (!trace) {
      return false;
    }

    return isTraceInProgress(trace);
  };

  const visibleMessages = filterMessagesByRunIds(sanitizeChatMessages(messages), suppressedHydrationRunIdsRef.current)
    .filter((message) => !isBlankAssistantMessage(message) || isInFlightAssistantPlaceholder(message));
  const hasEarlierMessages = Boolean(activeSession.backendSessionId && activeSession.messagesNextCursor);

  const handleChatScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    const currentScrollTop = node.scrollTop;
    const distanceToBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    const isScrollingUp = currentScrollTop < lastChatScrollTopRef.current - 0.5;
    const isScrollingDown = currentScrollTop > lastChatScrollTopRef.current + 0.5;
    if (isScrollingUp) {
      shouldStickToBottomRef.current = false;
    } else if (distanceToBottom <= 2 && (shouldStickToBottomRef.current || isScrollingDown)) {
      shouldStickToBottomRef.current = true;
    }
    lastChatScrollTopRef.current = currentScrollTop;
    if (!shouldStickToBottomRef.current && node.scrollTop < 160 && hasEarlierMessages && !loadingEarlierMessagesRef.current) {
      void handleLoadEarlierMessages();
    }
  };

  const handleLoadEarlierMessages = async () => {
    if (!activeSession.backendSessionId || !activeSession.messagesNextCursor || loadingEarlierMessagesRef.current) return;
    loadingEarlierMessagesRef.current = true;
    setIsLoadingEarlierMessages(true);
    shouldStickToBottomRef.current = false;
    const node = scrollRef.current;
    const previousScrollHeight = node?.scrollHeight ?? 0;
    const previousScrollTop = node?.scrollTop ?? 0;
    try {
      const page = await controlPlaneApi.getSessionMessages(activeSession.backendSessionId, {
        limit: 100,
        cursor: activeSession.messagesNextCursor
      });
      const earlierMessages = sanitizeChatMessages(page.items.map(mapControlPlaneMessage));
      const existingIds = new Set(activeSession.messages.map((message) => message.id));
      const dedupedEarlierMessages = earlierMessages.filter((message) => !existingIds.has(message.id));
      const nextSession: ChatSession = {
        ...activeSession,
        messagesNextCursor: page.nextCursor,
        messages: [...dedupedEarlierMessages, ...activeSession.messages],
        hydrated: true, messagesLoadFailed: false
      };
      onUpdateSessions(upsertSession(cluster.chatSessions, nextSession));
      if (node && dedupedEarlierMessages.length > 0) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            node.scrollTop = node.scrollHeight - previousScrollHeight + previousScrollTop;
          });
        });
      }
    } finally {
      loadingEarlierMessagesRef.current = false;
      setIsLoadingEarlierMessages(false);
    }
  };

  const updateCurrentSession = (newMessages: ChatMessage[]) => {
    let updatedSessions: ChatSession[];
    if (cluster.chatSessions.find((s) => s.id === activeSessionId)) {
      updatedSessions = cluster.chatSessions.map((s) =>
        s.id === activeSessionId ? { ...s, messages: newMessages, messagesLoadFailed: false } : s
      );
    } else {
      const newSession: ChatSession = {
        id: activeSessionId || 'default',
        name: activeSession.name,
        messages: newMessages,
        timestamp: Date.now()
      };
      updatedSessions = [...cluster.chatSessions, newSession];
      if (!activeSessionId) setActiveSessionId(newSession.id);
    }
    onUpdateSessions(updatedSessions);
  };

  const createDraftSessionWithWarning = async (): Promise<ChatSession> => {
    const now = Date.now();
    const newSessionId = createConversationId();
    let recentActivityWarning: ChatSession['recentActivityWarning'];
    try {
      const activity = await (sessionApi?.getTargetChatActivity || controlPlaneApi.getTargetChatActivity)(cluster.workspaceId, cluster.id);
      recentActivityWarning = buildRecentActivityWarning(activity, currentUserId, t);
    } catch {
      recentActivityWarning = undefined;
    }
    return {
      id: newSessionId,
      name: t('chat.newConversation'),
      hydrated: true,
      messages: [],
      timestamp: now,
      status: 'open',
      recentActivityWarning
    };
  };

  const handleCreateSession = () => {
    const reusableDraft = sessions.find(
      (session) => session.messages.length === 0 && !session.backendSessionId
    );
    if (reusableDraft) {
      if (reusableDraft.recentActivityWarning?.dismissed) {
        setActiveSessionId(reusableDraft.id);
        shouldStickToBottomRef.current = true;
        return;
      }
      void createDraftSessionWithWarning().then((checkedDraft) => {
        const nextDraft: ChatSession = {
          ...reusableDraft,
          recentActivityWarning: checkedDraft.recentActivityWarning,
          timestamp: Date.now()
        };
        onUpdateSessions(sortSessionsByTimestamp(upsertSession(cluster.chatSessions, nextDraft)));
        setActiveSessionId(reusableDraft.id);
        shouldStickToBottomRef.current = true;
      });
      return;
    }

    void createDraftSessionWithWarning().then((nextSession) => {
      onUpdateSessions(sortSessionsByTimestamp([nextSession, ...cluster.chatSessions]));
      setActiveSessionId(nextSession.id);
      shouldStickToBottomRef.current = true;
    });
  };

  const handleDismissRecentActivityWarning = () => {
    if (!activeSessionId) return;
    onUpdateSessions(cluster.chatSessions.map((session) =>
      session.id === activeSessionId && session.recentActivityWarning
        ? {
            ...session,
            recentActivityWarning: {
              ...session.recentActivityWarning,
              dismissed: true
            }
          }
        : session
    ));
  };

  const handleOpenRecentActivitySession = (sessionId: string) => {
    if (!cluster.chatSessions.some((session) => session.id === sessionId)) {
      onUpdateSessions(sortSessionsByTimestamp([
        createRecentActivitySessionPlaceholder(sessionId),
        ...cluster.chatSessions
      ]));
    }
    setActiveSessionId(sessionId);
    shouldStickToBottomRef.current = true;
  };

  const handleDeleteSession = async (sessionId: string) => {
    const sessionToDelete = cluster.chatSessions.find((session) => session.id === sessionId);
    if (!sessionToDelete) {
      return;
    }

    if (sessionToDelete.backendSessionId) {
      await controlPlaneApi.deleteSession(sessionToDelete.backendSessionId);
      clearHydratingSession(sessionToDelete.backendSessionId);
    }

    const nextSessions = sortSessionsByTimestamp(cluster.chatSessions.filter((session) => session.id !== sessionId));
    onUpdateSessions(nextSessions);
    if (activeSessionId === sessionId) {
      setActiveSessionId(nextSessions.length > 0 ? nextSessions[0].id : null);
    }
    onSessionDeleted?.(sessionToDelete);
  };

  const handleCancelRun = async () => {
    if (!effectiveActiveRunId || isCancellingRun) return;
    const runId = effectiveActiveRunId;
    const timestamp = Date.now();
    cancelledRunIdsRef.current.add(runId);
    const isPendingAcceptedRun = runId.startsWith('pending-trace-');
    activeRunStreamControlsRef.current[runId]?.abort();
    setIsCancellingRun(true);
    setActiveRunId(null);
    setIsLoading(false);
    setTraceExpandedByRunId((current) => ({ ...current, [runId]: false }));
    setRunTracesByRunId((current) => {
      const existingTrace = current[runId] || { runId, status: 'cancelled' as const, steps: [], toolCalls: [] };
      const hasCancelledStep = existingTrace.steps.some((step) => step.label === 'Cancelled' || step.label === 'Run cancelled');
      const cancelledTrace: LiveRunTrace = {
        ...existingTrace,
        status: 'cancelled',
        steps: hasCancelledStep
          ? existingTrace.steps
          : [
              ...existingTrace.steps,
              {
                id: `cancelled-${runId}-${timestamp}`,
                label: 'Cancelled',
                detail: 'You cancelled this response.',
                status: 'error',
                timestamp
              }
            ]
      };
      const next = {
        ...current,
        [runId]: cancelledTrace
      };
      runTracesByRunIdRef.current = next;
      return next;
    });
    const cancelledMessage = t('chat.runCancelledMessage');
    updateCurrentSession(replaceCancelledRunAssistantMessages(
      sanitizeChatMessages(activeSession.messages),
      runId,
      cancelledMessage,
      timestamp
    ));
    try {
      if (!isPendingAcceptedRun) {
        await controlPlaneApi.cancelRun(runId);
      }
    } catch (error) {
      console.error('Failed cancelling run', error);
    } finally {
      setIsCancellingRun(false);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    clearActivityWatchedRunForSession(sessionId);
    shouldStickToBottomRef.current = true;
  };

  const decideApproval = async (approvalId: string, decision: 'approved' | 'rejected') => {
    const target = messages.find((message) => message.approval?.id === approvalId)?.approval;
    if (!target?.runId) return;
    let resolvedStatus: PendingApproval['status'] = decision;
    try {
      const approval = await controlPlaneApi.decideRunApproval(target.runId, approvalId, decision);
      resolvedStatus = approval.status;
    } catch (err) {
      const approvals = await controlPlaneApi.listRunApprovals(target.runId).catch(() => []);
      const currentApproval = approvals.find((approval) => approval.id === approvalId);
      if (!currentApproval || currentApproval.status === 'pending') {
        throw err;
      }
      resolvedStatus = currentApproval.status;
    }
    const updatedMessages = messages.map((message) => {
      if (message.approval?.id !== approvalId) return message;
      return {
        ...message,
        approval: {
          ...message.approval,
          status: resolvedStatus
        }
      };
    });
    updateCurrentSession(updatedMessages);
  };

  const handleApprove = (approvalId: string) => decideApproval(approvalId, 'approved');
  const handleReject = (approvalId: string) => decideApproval(approvalId, 'rejected');

  const submitChatMessageForArgs = (args: {
    activeSessionForSubmit: ChatSession;
    activeSessionIdForSubmit: string | null;
    canChatForSubmit: boolean;
    overrideInput?: string;
    runtimeSelection?: ChatRuntimeSelection;
  }) =>
    submitChatMessage({
      cluster,
      activeSession: args.activeSessionForSubmit,
      activeSessionId: args.activeSessionIdForSubmit,
      canChat: args.canChatForSubmit,
      canRequestWriteRuns,
      inputValue,
      isLoading: isRunActive,
      overrideInput: args.overrideInput,
      runtimeSelection: args.runtimeSelection,
      shouldStickToBottomRef,
      onUpdateSessions,
      setActiveSessionId,
      setInputValue,
      setIsLoading,
      setActiveRunId,
      setRunTracesByRunId: setRunTracesByRunIdAndRef,
      setTraceExpandedByRunId,
      createSession: sessionApi?.createSession,
      draftConversationName: t('chat.newConversation'),
      fallbackBackendErrorMessage: t('chat.backendRequestFailed'),
      runCancelledMessage: t('chat.runCancelledMessage'),
      isRunCancelled,
      markRunCancelled,
      registerRunStream,
      unregisterRunStream,
      suppressedRunIdsRef: suppressedHydrationRunIdsRef
    });

  const releaseSubmitLockSoon = () => {
    setTimeout(() => {
      submitInFlightRef.current = false;
    }, 0);
  };

  const runSubmittedChatMessage = async (args: Parameters<typeof submitChatMessageForArgs>[0]) => {
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    try {
      const submitPromise = submitChatMessageForArgs(args);
      releaseSubmitLockSoon();
      await submitPromise;
    } catch (error) {
      submitInFlightRef.current = false;
      throw error;
    }
  };

  const handleSend = (overrideInput?: string, runtimeSelection?: ChatRuntimeSelection) =>
    runSubmittedChatMessage({
      activeSessionForSubmit: activeSession,
      activeSessionIdForSubmit: activeSessionId,
      canChatForSubmit: canPostInActiveSession,
      overrideInput,
      runtimeSelection
    });

  const handleEditLastUserMessage = async (messageId: string, nextContent: string, runtimeSelection?: ChatRuntimeSelection) => {
    const prompt = nextContent.trim();
    if (!prompt || isRunActive || !canPostInActiveSession || submitInFlightRef.current) return;
    const sanitizedMessages = sanitizeChatMessages(activeSession.messages);
    const userIndex = sanitizedMessages.findIndex((message) => message.id === messageId && message.role === 'user');
    if (userIndex < 0) return;
    const nextUserIndex = sanitizedMessages.findIndex((message, index) => index > userIndex && message.role === 'user');
    const turnEndIndex = nextUserIndex >= 0 ? nextUserIndex : sanitizedMessages.length;
    const turnMessages = sanitizedMessages.slice(userIndex, turnEndIndex);
    const runId = sanitizedMessages[userIndex].runId || turnMessages.find((message) => message.runId)?.runId;
    const revisedRunIds = new Set(turnMessages.map((message) => message.runId).filter(Boolean) as string[]);
    const trace = runId ? runTracesByRunIdRef.current[runId] : undefined;
    const canReviseTurn = runId && (trace?.status === 'cancelled' || trace?.status === 'failed' || cancelledRunIdsRef.current.has(runId));
    const hasLaterUserMessage = sanitizedMessages.slice(turnEndIndex).some((message) => message.role === 'user');
    if (!runId || !canReviseTurn || hasLaterUserMessage) return;

    const revisedSession: ChatSession = { ...activeSession, messages: sanitizedMessages.slice(0, userIndex), timestamp: Date.now() };
    revisedRunIds.add(runId);
    for (const revisedRunId of revisedRunIds) suppressedHydrationRunIdsRef.current.add(revisedRunId);
    updateCurrentSession(revisedSession.messages);
    shouldStickToBottomRef.current = true;
    await runSubmittedChatMessage({
      activeSessionForSubmit: revisedSession,
      activeSessionIdForSubmit: activeSessionId,
      canChatForSubmit: canPostInActiveSession,
      overrideInput: prompt,
      runtimeSelection
    });
  };

  const handleSendInNewSession = async (overrideInput: string, runtimeSelection?: ChatRuntimeSelection) => {
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    let shouldReleaseSubmitLock = true;
    try {
      const draftSession = await createDraftSessionWithWarning();
      const sessionId = draftSession.id;
      setActiveSessionId(sessionId);
      shouldStickToBottomRef.current = true;
      if (draftSession.recentActivityWarning) {
        onUpdateSessions(sortSessionsByTimestamp([draftSession, ...cluster.chatSessions]));
        setInputValue(overrideInput);
        return;
      }
      const submitPromise = submitChatMessageForArgs({
        activeSessionForSubmit: draftSession,
        activeSessionIdForSubmit: sessionId,
        canChatForSubmit: canChat,
        overrideInput,
        runtimeSelection
      });
      releaseSubmitLockSoon();
      shouldReleaseSubmitLock = false;
      await submitPromise;
    } finally {
      if (shouldReleaseSubmitLock) submitInFlightRef.current = false;
    }
  };

  return {
    sessions,
    activeSessionId,
    activeSession: activeSessionRecord,
    isActiveSessionOwner,
    conversationNotice,
    recentActivityWarning,
    inputValue,
    isLoading,
    isRunActive,
    isSessionsLoading,
    isLoadingEarlierMessages,
    hasEarlierMessages,
    activeRunId: effectiveActiveRunId,
    isCancellingRun,
    visibleMessages,
    runTracesByRunId,
    traceExpandedByRunId,
    transcriptRef,
    setActiveSessionId: handleSelectSession,
    handleCreateSession,
    handleDismissRecentActivityWarning,
    handleOpenRecentActivitySession,
    handleDeleteSession,
    handleCancelRun,
    setInputValue,
    setTraceExpandedByRunId,
    handleChatScroll,
    handleLoadEarlierMessages,
    handleSend,
    handleSendInNewSession,
    handleEditLastUserMessage,
    handleApprove,
    handleReject,
    isInFlightAssistantPlaceholder
  };
}
