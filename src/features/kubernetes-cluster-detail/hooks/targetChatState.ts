import type { ChatMessage, ChatSession } from '@/types';
import type { ControlPlaneTargetChatActivity } from '@/services/controlPlaneApi';
import { isTraceInProgress } from '@/features/kubernetes-cluster-detail/hooks/chatRunTrace';
import type { LiveRunTrace } from '@/features/kubernetes-cluster-detail/types';

type ActivityWarningTranslator = (key: string, options?: Record<string, unknown>) => string;

export function isConversationOwner(session: ChatSession | null | undefined, currentUserId: string): boolean {
  if (!session?.backendSessionId) return true;
  if (!session.createdBy) return true;
  return session.createdBy === currentUserId;
}

export function buildTargetChatConversationAccessState(args: {
  canChat: boolean;
  currentUserId: string;
  session: ChatSession | null;
}): {
  isActiveSessionOwner: boolean;
  conversationNotice: string | null;
  recentActivityWarning: ChatSession['recentActivityWarning'] | null;
  canPostInActiveSession: boolean;
} {
  const { canChat, currentUserId, session } = args;
  const isActiveSessionOwner = isConversationOwner(session, currentUserId);
  const ownerName = session?.createdByUser?.displayName || 'Another user';
  const conversationNotice = session?.backendSessionId
    ? isActiveSessionOwner
      ? 'Your conversation. Others can watch this investigation live, but only you can send follow-ups here.'
      : `View-only conversation. ${ownerName} started this conversation. You can follow the live run, but only ${ownerName} can send follow-ups here.`
    : null;
  const recentActivityWarning = session?.recentActivityWarning && !session.recentActivityWarning.dismissed
    ? session.recentActivityWarning
    : null;
  return {
    isActiveSessionOwner,
    conversationNotice,
    recentActivityWarning,
    canPostInActiveSession: canChat && isActiveSessionOwner && !recentActivityWarning
  };
}

export function buildTargetChatAutoScrollSignature(args: {
  messages: ChatMessage[];
  effectiveActiveRunId: string | null | undefined;
  runTracesByRunId: Record<string, LiveRunTrace>;
}): string {
  const { messages, effectiveActiveRunId, runTracesByRunId } = args;
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
        activeRunTrace.reasoningSummaries?.length || 0,
        activeRunTrace.activeReasoningSummary?.length || 0,
        activeRunTrace.usage ? 'usage' : ''
      ].join(',')
    : 'none';
  return [
    messages.length,
    lastMessage?.id || '',
    lastMessage?.content.length || 0,
    lastMessage?.approval?.id || '',
    lastMessage?.approval?.status || '',
    effectiveActiveRunId || '',
    activeRunTraceSignature
  ].join(':');
}

function translateActivityCopy(
  t: ActivityWarningTranslator | undefined,
  key: string,
  fallback: string,
  options: Record<string, unknown> = {}
): string {
  if (!t) return fallback;
  return t(key, { defaultValue: fallback, ...options });
}

function formatRelativeActivityTime(timestamp: string, t?: ActivityWarningTranslator): string {
  const elapsedMs = Date.now() - (Date.parse(timestamp) || Date.now());
  const elapsedMinutes = Math.max(0, Math.round(elapsedMs / 60000));
  if (elapsedMinutes < 1) return translateActivityCopy(t, 'chat.recentActivityTime.justNow', 'just now');
  if (elapsedMinutes === 1) {
    return translateActivityCopy(t, 'chat.recentActivityTime.minuteAgo', '1 minute ago', { count: 1 });
  }
  if (elapsedMinutes < 60) {
    return translateActivityCopy(t, 'chat.recentActivityTime.minutesAgo', `${elapsedMinutes} minutes ago`, { count: elapsedMinutes });
  }
  const elapsedHours = Math.round(elapsedMinutes / 60);
  return elapsedHours === 1
    ? translateActivityCopy(t, 'chat.recentActivityTime.hourAgo', '1 hour ago', { count: 1 })
    : translateActivityCopy(t, 'chat.recentActivityTime.hoursAgo', `${elapsedHours} hours ago`, { count: elapsedHours });
}

export function buildRecentActivityWarning(
  activity: ControlPlaneTargetChatActivity,
  currentUserId: string,
  t?: ActivityWarningTranslator
): ChatSession['recentActivityWarning'] | undefined {
  const entries = activity.recentActivity;
  if (entries.length === 0) return undefined;
  const writeEntry = entries.find((entry) => entry.hasRecentWriteCapableRun);
  const primary = writeEntry || entries[0];
  const userName = primary.createdBy === currentUserId
    ? 'You'
    : primary.createdByUser?.displayName || 'Another user';
  const relativeTime = formatRelativeActivityTime(primary.lastActivityAt, t);
  const multipleUsers = new Set(entries.map((entry) => entry.createdBy)).size > 1;
  let message: string;
  if (writeEntry && multipleUsers) {
    message = translateActivityCopy(
      t,
      'chat.recentWriteActivity.multipleUsers',
      `Multiple users started a write-capable chat ${relativeTime}. Consider reviewing that conversation before starting another triage chat.`,
      { relativeTime }
    );
  } else if (writeEntry && primary.createdBy === currentUserId) {
    message = translateActivityCopy(
      t,
      'chat.recentWriteActivity.sameUser',
      `You started a write-capable chat ${relativeTime}. Consider reviewing that conversation before starting another triage chat.`,
      { relativeTime }
    );
  } else if (writeEntry) {
    message = translateActivityCopy(
      t,
      'chat.recentWriteActivity.otherUser',
      `${userName} started a write-capable chat ${relativeTime}. Consider reviewing that conversation before starting another triage chat.`,
      { user: userName, relativeTime }
    );
  } else {
    message = entries.length === 1 && primary.createdBy === currentUserId
      ? `You recently investigated this target. You started "${primary.title}" ${relativeTime}. Continue that conversation to keep context together, or start a separate chat.`
      : entries.length === 1
        ? `Recent AI activity on this target. ${userName} investigated this target ${relativeTime}. Review "${primary.title}" before starting another chat.`
        : `Recent AI activity on this target. ${multipleUsers ? 'Multiple users' : userName} investigated this target in the last ${Math.round(activity.windowSeconds / 60)} minutes. Review recent conversations before starting another chat.`;
  }
  const actionSessionId = writeEntry || entries.length === 1 ? primary.sessionId : undefined;
  return {
    message,
    actionSessionId,
    actionLabel: actionSessionId ? 'Open conversation' : undefined
  };
}

export function createRecentActivitySessionPlaceholder(sessionId: string): ChatSession {
  return {
    id: sessionId,
    backendSessionId: sessionId,
    name: `Conversation ${sessionId.slice(0, 8)}`,
    hydrated: false,
    messages: [],
    timestamp: Date.now(),
    status: 'open'
  };
}

export function deriveTargetChatRunState(args: {
  localActiveRunId: string | null;
  activeSession: ChatSession;
  runTracesByRunId: Record<string, LiveRunTrace>;
  isLocalRunLoading?: boolean;
  cancelledRunIds?: ReadonlySet<string>;
}): { activeRunId: string | null; isRunActive: boolean } {
  const { localActiveRunId, activeSession, runTracesByRunId, isLocalRunLoading = false, cancelledRunIds } = args;

  if (localActiveRunId && !cancelledRunIds?.has(localActiveRunId) && isLocalRunLoading) {
    return { activeRunId: localActiveRunId, isRunActive: true };
  }

  if (localActiveRunId && !cancelledRunIds?.has(localActiveRunId) && isTraceInProgress(runTracesByRunId[localActiveRunId])) {
    return { activeRunId: localActiveRunId, isRunActive: true };
  }

  for (let index = activeSession.messages.length - 1; index >= 0; index -= 1) {
    const runId = activeSession.messages[index].runId;
    if (runId && cancelledRunIds?.has(runId)) {
      continue;
    }
    if (runId && isTraceInProgress(runTracesByRunId[runId])) {
      return { activeRunId: runId, isRunActive: true };
    }
  }

  return { activeRunId: null, isRunActive: false };
}

export function deriveActivityDiscoveredRunId(args: {
  activityWatchedRun: { sessionId: string; runId: string } | null;
  activeSession: ChatSession;
  runTracesByRunId: Record<string, LiveRunTrace>;
  cancelledRunIds?: ReadonlySet<string>;
}): string | null {
  const { activityWatchedRun, activeSession, runTracesByRunId, cancelledRunIds } = args;
  if (!activityWatchedRun) return null;
  if (activityWatchedRun.sessionId !== activeSession.id) return null;
  if (cancelledRunIds?.has(activityWatchedRun.runId)) return null;
  return isTraceInProgress(runTracesByRunId[activityWatchedRun.runId])
    ? activityWatchedRun.runId
    : null;
}

export function shouldDiscoverActiveRunFromActivity(activeSessionId: string | null, sessionId: string): boolean {
  return activeSessionId === sessionId;
}
