import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatMessage, ChatSession, PendingApproval } from '@/types';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import {
  mapControlPlaneMessage,
  sanitizeChatMessages,
  isPendingAssistantPlaceholder,
  isBlankAssistantMessage,
  upsertSession
} from '@/features/kubernetes-cluster-detail/lib/session-utils';
import { submitChatMessage } from '@/features/kubernetes-cluster-detail/hooks/chatSubmit';
import {
  createConversationId,
  createConversationName,
  sortSessionsByTimestamp,
  useControlPlaneChatSessionSync
} from '@/features/kubernetes-cluster-detail/hooks/chatSessionSync';
import {
  isTraceInProgress
} from '@/features/kubernetes-cluster-detail/hooks/chatRunTrace';
import {
  buildRecentActivityWarning,
  createRecentActivitySessionPlaceholder,
  deriveTargetChatRunState,
  isConversationOwner
} from '@/features/kubernetes-cluster-detail/hooks/targetChatState';
import type { TargetChatController, UseTargetChatArgs } from '@/features/kubernetes-cluster-detail/hooks/targetChatControllerTypes';
import { useWatchedRunStream } from '@/features/kubernetes-cluster-detail/hooks/targetChatRunWatcher';
import { LiveRunTrace } from '@/features/kubernetes-cluster-detail/types';
import {
  replaceCancelledRunAssistantMessages,
  type ActiveRunStreamControls
} from '@/features/kubernetes-cluster-detail/hooks/chatRunCancellation';

export type { TargetChatController } from '@/features/kubernetes-cluster-detail/hooks/targetChatControllerTypes';

/**
 * Encapsulates target triage session state and run orchestration.
 *
 * This hook owns optimistic message insertion, streaming updates, run trace
 * state, reconciliation with persisted run records, and approval handling.
 */
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const lastChatScrollTopRef = useRef(0);
  const loadingEarlierMessagesRef = useRef(false);
  const latestSessionsRef = useRef<ChatSession[]>(sessions);
  const cancelledRunIdsRef = useRef<Set<string>>(new Set());
  const activeRunStreamControlsRef = useRef<Record<string, ActiveRunStreamControls>>({});
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

  const activeSession = sessions.find((s) => s.id === activeSessionId) || {
    id: 'default',
    name: 'New Conversation',
    messages: [],
    timestamp: Date.now()
  };
  const activeSessionRecord = sessions.find((s) => s.id === activeSessionId) || null;
  const isActiveSessionOwner = isConversationOwner(activeSessionRecord, currentUserId);
  const ownerName = activeSessionRecord?.createdByUser?.displayName || 'Another user';
  const conversationNotice = activeSessionRecord?.backendSessionId
    ? isActiveSessionOwner
      ? 'Your conversation. Others can watch this investigation live, but only you can send follow-ups here.'
      : `View-only conversation. ${ownerName} started this conversation. You can follow the live run, but only ${ownerName} can send follow-ups here.`
    : null;
  const recentActivityWarning = activeSessionRecord?.recentActivityWarning && !activeSessionRecord.recentActivityWarning.dismissed
    ? activeSessionRecord.recentActivityWarning
    : null;
  const canPostInActiveSession = canChat && isActiveSessionOwner && !recentActivityWarning;

  const messages = activeSession.messages;
  const derivedRunState = deriveTargetChatRunState({
    localActiveRunId: activeRunId,
    activeSession,
    runTracesByRunId,
    isLocalRunLoading: isLoading,
    cancelledRunIds: cancelledRunIdsRef.current
  });
  const effectiveActiveRunId = derivedRunState.activeRunId;
  const isRunActive = isLoading || derivedRunState.isRunActive;
  const lastMessage = messages[messages.length - 1];
  const activeRunTrace = effectiveActiveRunId ? runTracesByRunId[effectiveActiveRunId] : undefined;
  const activeRunLatestStep = activeRunTrace?.steps.at(-1);
  const activeRunTraceSignature = activeRunTrace
    ? [
        activeRunTrace.status,
        activeRunTrace.steps.length,
        activeRunLatestStep?.id || '',
        activeRunLatestStep?.detail?.length || 0,
        activeRunTrace.toolCalls.length,
        activeRunTrace.toolCalls.filter((toolCall) => toolCall.status === 'running').length,
        activeRunTrace.toolCalls.filter((toolCall) => toolCall.status === 'completed').length,
        activeRunTrace.usage ? 'usage' : ''
      ].join(',')
    : 'none';
  const chatAutoScrollSignature = [
    messages.length,
    lastMessage?.id || '',
    lastMessage?.content.length || 0,
    lastMessage?.approval?.id || '',
    lastMessage?.approval?.status || '',
    effectiveActiveRunId || '',
    activeRunTraceSignature
  ].join(':');

  useEffect(() => {
    const sortedSessions = sortSessionsByTimestamp(cluster.chatSessions);
    if (sortedSessions.length > 0) {
      if (activeSessionId && sortedSessions.some((session) => session.id === activeSessionId)) {
        return;
      }
      setActiveSessionId(sortedSessions[0].id);
      return;
    }
    setActiveSessionId(null);
  }, [activeSessionId, cluster.chatSessions, cluster.id]);

  useEffect(() => {
    setRunTracesByRunId({});
    setTraceExpandedByRunId({});
    setActiveRunId(null);
    setIsCancellingRun(false);
    cancelledRunIdsRef.current.clear();
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
    runCancelledMessage: t('chat.runCancelledMessage'),
    listSessions: sessionApi?.listSessions
  });

  useWatchedRunStream({
    activeRunId,
    activeSessionRecord,
    effectiveActiveRunId,
    latestSessionsRef,
    onUpdateSessions,
    runTracesByRunIdRef,
    setTraceExpandedByRunId,
    setRunTracesByRunId,
    isRunCancelled,
    runCancelledMessage: t('chat.runCancelledMessage')
  });

  useLayoutEffect(() => {
    if (!scrollRef.current || !isChatActive) {
      return;
    }
    if (isLoadingEarlierMessages) {
      return;
    }
    if (!shouldStickToBottomRef.current) {
      return;
    }
    const node = scrollRef.current;
    node.scrollTop = node.scrollHeight;
    lastChatScrollTopRef.current = node.scrollTop;
    const frame = requestAnimationFrame(() => {
      if (scrollRef.current !== node || !shouldStickToBottomRef.current) {
        return;
      }
      node.scrollTop = node.scrollHeight;
      lastChatScrollTopRef.current = node.scrollTop;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [chatAutoScrollSignature, isChatActive, isLoadingEarlierMessages]);

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

  const visibleMessages = sanitizeChatMessages(messages).filter(
    (message) => !isBlankAssistantMessage(message) || isInFlightAssistantPlaceholder(message)
  );
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
    if (node.scrollTop < 160 && hasEarlierMessages && !loadingEarlierMessagesRef.current) {
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
        hydrated: true
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
        s.id === activeSessionId ? { ...s, messages: newMessages } : s
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
      name: createConversationName(newSessionId),
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
      const hasCancelledStep = existingTrace.steps.some((step) => step.label === 'Run cancelled');
      const cancelledTrace: LiveRunTrace = {
        ...existingTrace,
        status: 'cancelled',
        steps: hasCancelledStep
          ? existingTrace.steps
          : [
              ...existingTrace.steps,
              {
                id: `cancelled-${runId}-${timestamp}`,
                label: 'Run cancelled',
                detail: 'Cancelled by user.',
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

  const runSubmittedChatMessage = (args: {
    activeSessionForSubmit: ChatSession;
    activeSessionIdForSubmit: string | null;
    canChatForSubmit: boolean;
    overrideInput?: string;
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
      shouldStickToBottomRef,
      onUpdateSessions,
      setActiveSessionId,
      setInputValue,
      setIsLoading,
      setActiveRunId,
      setRunTracesByRunId: setRunTracesByRunIdAndRef,
      setTraceExpandedByRunId,
      createSession: sessionApi?.createSession,
      fallbackBackendErrorMessage: t('chat.backendRequestFailed'),
      runCancelledMessage: t('chat.runCancelledMessage'),
      isRunCancelled,
      markRunCancelled,
      registerRunStream,
      unregisterRunStream
    });

  const handleSend = (overrideInput?: string) =>
    runSubmittedChatMessage({
      activeSessionForSubmit: activeSession,
      activeSessionIdForSubmit: activeSessionId,
      canChatForSubmit: canPostInActiveSession,
      overrideInput
    });

  const handleSendInNewSession = async (overrideInput: string) => {
    const draftSession = await createDraftSessionWithWarning();
    const sessionId = draftSession.id;
    setActiveSessionId(sessionId);
    shouldStickToBottomRef.current = true;
    if (draftSession.recentActivityWarning) {
      onUpdateSessions(sortSessionsByTimestamp([draftSession, ...cluster.chatSessions]));
      setInputValue(overrideInput);
      return;
    }
    return runSubmittedChatMessage({
      activeSessionForSubmit: draftSession,
      activeSessionIdForSubmit: sessionId,
      canChatForSubmit: canChat,
      overrideInput
    });
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
    scrollRef,
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
    handleApprove,
    handleReject,
    isInFlightAssistantPlaceholder
  };
}
