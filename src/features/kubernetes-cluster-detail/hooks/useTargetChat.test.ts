import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildRecentActivityWarning,
  createRecentActivitySessionPlaceholder,
  deriveActivityDiscoveredRunId,
  deriveTargetChatRunState,
  isConversationOwner,
  shouldDiscoverActiveRunFromActivity
} from '@/features/kubernetes-cluster-detail/hooks/targetChatState';
import { mergeFetchedChatSessions } from '@/features/kubernetes-cluster-detail/hooks/chatSessionSync';
import type { ControlPlaneTargetChatActivity } from '@/services/controlPlaneApi';
import { ChatSession } from '@/types';
import { LiveRunTrace } from '@/features/kubernetes-cluster-detail/types';

const root = resolve(__dirname, '../../../..');

function makeSession(messages: ChatSession['messages']): ChatSession {
  return {
    id: 'session-1',
    name: 'Session one',
    hydrated: true,
    messages,
    timestamp: 1
  };
}

function makeTrace(runId: string, status: LiveRunTrace['status']): LiveRunTrace {
  return {
    runId,
    status,
    steps: [],
    toolCalls: []
  };
}

function makeActivity(overrides?: Partial<ControlPlaneTargetChatActivity>): ControlPlaneTargetChatActivity {
  return {
    targetId: 'target-1',
    targetType: 'kubernetes',
    targetName: 'prod-cluster',
    windowSeconds: 300,
    generatedAt: '2026-06-01T05:00:00.000Z',
    recentActivity: [],
    ...overrides
  };
}

function makeTranslator(messages: Record<string, string>) {
  return (key: string, options?: Record<string, unknown>) => {
    let value = messages[key] || String(options?.defaultValue || key);
    for (const [name, optionValue] of Object.entries(options || {})) {
      value = value.replaceAll(`{{${name}}}`, String(optionValue));
    }
    return value;
  };
}

const zhChatWarningTranslator = makeTranslator({
  'chat.recentActivityTime.minuteAgo': '{{count}} 分钟前',
  'chat.recentActivityTime.minutesAgo': '{{count}} 分钟前',
  'chat.recentWriteActivity.sameUser': '你在 {{relativeTime}}开始了一个可写聊天。建议先查看该会话，再开始新的分诊聊天。',
  'chat.recentWriteActivity.otherUser': '{{user}} 在 {{relativeTime}}开始了一个可写聊天。建议先查看该会话，再开始新的分诊聊天。'
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('deriveTargetChatRunState', () => {
  it('uses the local active run while the submitter is still loading', () => {
    const state = deriveTargetChatRunState({
      localActiveRunId: 'run-local',
      activeSession: makeSession([]),
      runTracesByRunId: {},
      isLocalRunLoading: true
    });

    expect(state).toEqual({ activeRunId: 'run-local', isRunActive: true });
  });

  it('restores active state from an in-progress assistant placeholder and trace', () => {
    const state = deriveTargetChatRunState({
      localActiveRunId: null,
      activeSession: makeSession([
        { id: 'user-1', role: 'user', content: 'Check pods', runId: 'run-restored', timestamp: 1 },
        { id: 'rehydrated-run-restored', role: 'assistant', content: '', runId: 'run-restored', timestamp: 2 }
      ]),
      runTracesByRunId: {
        'run-restored': makeTrace('run-restored', 'running')
      }
    });

    expect(state).toEqual({ activeRunId: 'run-restored', isRunActive: true });
  });

  it('ignores terminal restored traces', () => {
    const state = deriveTargetChatRunState({
      localActiveRunId: null,
      activeSession: makeSession([
        { id: 'assistant-1', role: 'assistant', content: 'Done', runId: 'run-done', timestamp: 1 }
      ]),
      runTracesByRunId: {
        'run-done': makeTrace('run-done', 'completed')
      }
    });

    expect(state).toEqual({ activeRunId: null, isRunActive: false });
  });

  it('prefers the local active run when its trace is still in progress', () => {
    const state = deriveTargetChatRunState({
      localActiveRunId: 'run-local',
      activeSession: makeSession([
        { id: 'assistant-1', role: 'assistant', content: 'Done', runId: 'run-restored', timestamp: 1 }
      ]),
      runTracesByRunId: {
        'run-local': makeTrace('run-local', 'running'),
        'run-restored': makeTrace('run-restored', 'completed')
      }
    });

    expect(state).toEqual({ activeRunId: 'run-local', isRunActive: true });
  });

  it('ignores locally cancelled runs even when stale traces still look active', () => {
    const state = deriveTargetChatRunState({
      localActiveRunId: 'run-local',
      activeSession: makeSession([
        { id: 'assistant-local', role: 'assistant', content: 'Run cancelled.', runId: 'run-local', timestamp: 1 },
        { id: 'assistant-restored', role: 'assistant', content: '', runId: 'run-restored', timestamp: 2 }
      ]),
      runTracesByRunId: {
        'run-local': makeTrace('run-local', 'running'),
        'run-restored': makeTrace('run-restored', 'connecting')
      },
      isLocalRunLoading: true,
      cancelledRunIds: new Set(['run-local', 'run-restored'])
    });

    expect(state).toEqual({ activeRunId: null, isRunActive: false });
  });

  it('restores the most recent in-progress run from session messages', () => {
    const state = deriveTargetChatRunState({
      localActiveRunId: null,
      activeSession: makeSession([
        { id: 'assistant-older', role: 'assistant', content: '', runId: 'run-older', timestamp: 1 },
        { id: 'assistant-newer', role: 'assistant', content: '', runId: 'run-newer', timestamp: 2 }
      ]),
      runTracesByRunId: {
        'run-older': makeTrace('run-older', 'running'),
        'run-newer': makeTrace('run-newer', 'running')
      }
    });

    expect(state).toEqual({ activeRunId: 'run-newer', isRunActive: true });
  });
});

describe('deriveActivityDiscoveredRunId', () => {
  it('uses an in-progress run discovered from target activity for the active session', () => {
    expect(deriveActivityDiscoveredRunId({
      activityWatchedRun: { sessionId: 'session-1', runId: 'run-2' },
      activeSession: makeSession([
        { id: 'user-1', role: 'user', content: 'First check', runId: 'run-1', timestamp: 1 }
      ]),
      runTracesByRunId: {
        'run-2': makeTrace('run-2', 'running')
      }
    })).toBe('run-2');
  });

  it('ignores discovered runs from another session, terminal traces, and cancelled runs', () => {
    expect(deriveActivityDiscoveredRunId({
      activityWatchedRun: { sessionId: 'session-2', runId: 'run-2' },
      activeSession: makeSession([]),
      runTracesByRunId: {
        'run-2': makeTrace('run-2', 'running')
      }
    })).toBeNull();

    expect(deriveActivityDiscoveredRunId({
      activityWatchedRun: { sessionId: 'session-1', runId: 'run-2' },
      activeSession: makeSession([]),
      runTracesByRunId: {
        'run-2': makeTrace('run-2', 'completed')
      }
    })).toBeNull();

    expect(deriveActivityDiscoveredRunId({
      activityWatchedRun: { sessionId: 'session-1', runId: 'run-2' },
      activeSession: makeSession([]),
      runTracesByRunId: {
        'run-2': makeTrace('run-2', 'running')
      },
      cancelledRunIds: new Set(['run-2'])
    })).toBeNull();
  });
});

describe('shouldDiscoverActiveRunFromActivity', () => {
  it('auto-attaches activity runs only when the session is already active', () => {
    expect(shouldDiscoverActiveRunFromActivity(null, 'session-1')).toBe(false);
    expect(shouldDiscoverActiveRunFromActivity('session-1', 'session-1')).toBe(true);
    expect(shouldDiscoverActiveRunFromActivity('draft-session', 'session-1')).toBe(false);
  });
});

describe('target chat ownership and recent activity warnings', () => {
  it('treats local drafts and unresolved owners as writable but backend sessions as owner-only', () => {
    expect(isConversationOwner(makeSession([]), 'user-2')).toBe(true);
    expect(isConversationOwner({ ...makeSession([]), backendSessionId: 'backend-1' }, 'user-2')).toBe(true);
    expect(isConversationOwner({ ...makeSession([]), backendSessionId: 'backend-1', createdBy: 'user-1' }, 'user-1')).toBe(true);
    expect(isConversationOwner({ ...makeSession([]), backendSessionId: 'backend-1', createdBy: 'user-1' }, 'user-2')).toBe(false);
  });

  it('uses same-user recent activity copy for the current user', () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-06-01T05:05:00.000Z'));

    const warning = buildRecentActivityWarning(makeActivity({
      recentActivity: [{
        sessionId: 'session-1',
        title: 'Restart api',
        createdBy: 'user-1',
        createdByUser: { id: 'user-1', displayName: 'Ops User' },
        lastActivityAt: '2026-06-01T05:03:00.000Z',
        hasActiveRun: false,
        hasRecentWriteCapableRun: false
      }]
    }), 'user-1');

    expect(warning?.message).toContain('You recently investigated this target.');
    expect(warning?.message).toContain('"Restart api"');
    expect(warning?.actionSessionId).toBe('session-1');
  });

  it('uses stronger copy for recent write-capable activity', () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-06-01T05:05:00.000Z'));

    const warning = buildRecentActivityWarning(makeActivity({
      recentActivity: [{
        sessionId: 'session-2',
        title: 'Scale workers',
        createdBy: 'user-2',
        createdByUser: { id: 'user-2', displayName: 'Platform Lead' },
        lastActivityAt: '2026-06-01T05:04:00.000Z',
        hasActiveRun: false,
        hasRecentWriteCapableRun: true
      }]
    }), 'user-1');

    expect(warning?.message).toBe('Platform Lead started a write-capable chat 1 minute ago. Consider reviewing that conversation before starting another triage chat.');
    expect(warning?.actionSessionId).toBe('session-2');
  });

  it('uses Mandarin copy for another user recent write-capable activity', () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-06-01T05:05:00.000Z'));

    const warning = buildRecentActivityWarning(makeActivity({
      recentActivity: [{
        sessionId: 'session-2',
        title: 'Scale workers',
        createdBy: 'user-2',
        createdByUser: { id: 'user-2', displayName: 'Platform Lead' },
        lastActivityAt: '2026-06-01T05:04:00.000Z',
        hasActiveRun: false,
        hasRecentWriteCapableRun: true
      }]
    }), 'user-1', zhChatWarningTranslator);

    expect(warning?.message).toBe('Platform Lead 在 1 分钟前开始了一个可写聊天。建议先查看该会话，再开始新的分诊聊天。');
    expect(warning?.actionSessionId).toBe('session-2');
  });

  it('uses concise same-user copy for recent write-capable activity', () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-06-01T05:05:00.000Z'));

    const warning = buildRecentActivityWarning(makeActivity({
      recentActivity: [{
        sessionId: 'session-3',
        title: 'Patch deployment',
        createdBy: 'user-1',
        createdByUser: { id: 'user-1', displayName: 'Ops User' },
        lastActivityAt: '2026-06-01T05:02:00.000Z',
        hasActiveRun: false,
        hasRecentWriteCapableRun: true
      }]
    }), 'user-1');

    expect(warning?.message).toBe('You started a write-capable chat 3 minutes ago. Consider reviewing that conversation before starting another triage chat.');
    expect(warning?.actionSessionId).toBe('session-3');
  });

  it('uses Mandarin copy for same-user recent write-capable activity', () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-06-01T05:05:00.000Z'));

    const warning = buildRecentActivityWarning(makeActivity({
      recentActivity: [{
        sessionId: 'session-3',
        title: 'Patch deployment',
        createdBy: 'user-1',
        createdByUser: { id: 'user-1', displayName: 'Ops User' },
        lastActivityAt: '2026-06-01T05:02:00.000Z',
        hasActiveRun: false,
        hasRecentWriteCapableRun: true
      }]
    }), 'user-1', zhChatWarningTranslator);

    expect(warning?.message).toBe('你在 3 分钟前开始了一个可写聊天。建议先查看该会话，再开始新的分诊聊天。');
    expect(warning?.actionSessionId).toBe('session-3');
  });

  it('links the primary write-capable conversation even when other recent activity exists', () => {
    const warning = buildRecentActivityWarning(makeActivity({
      recentActivity: [
        {
          sessionId: 'session-read',
          title: 'Read check',
          createdBy: 'user-1',
          lastActivityAt: '2026-06-01T05:04:00.000Z',
          hasActiveRun: false,
          hasRecentWriteCapableRun: false
        },
        {
          sessionId: 'session-write',
          title: 'Write check',
          createdBy: 'user-2',
          lastActivityAt: '2026-06-01T05:03:00.000Z',
          hasActiveRun: false,
          hasRecentWriteCapableRun: true
        }
      ]
    }), 'user-3');

    expect(warning?.actionSessionId).toBe('session-write');
    expect(warning?.actionLabel).toBe('Open conversation');
  });

  it('summarizes multiple recent users without linking to a single conversation', () => {
    const warning = buildRecentActivityWarning(makeActivity({
      recentActivity: [
        {
          sessionId: 'session-1',
          title: 'Pods',
          createdBy: 'user-1',
          lastActivityAt: '2026-06-01T05:04:00.000Z',
          hasActiveRun: false,
          hasRecentWriteCapableRun: false
        },
        {
          sessionId: 'session-2',
          title: 'Nodes',
          createdBy: 'user-2',
          lastActivityAt: '2026-06-01T05:03:00.000Z',
          hasActiveRun: false,
          hasRecentWriteCapableRun: false
        }
      ]
    }), 'user-3');

    expect(warning?.message).toContain('Multiple users investigated this target in the last 5 minutes');
    expect(warning?.actionSessionId).toBeUndefined();
    expect(warning?.actionLabel).toBeUndefined();
  });

  it('creates a hydratable placeholder for recent activity outside the loaded session page', () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-06-01T05:05:00.000Z'));

    const placeholder = createRecentActivitySessionPlaceholder('session-outside-page');

    expect(placeholder).toMatchObject({
      id: 'session-outside-page',
      backendSessionId: 'session-outside-page',
      name: 'Conversation session-',
      hydrated: false,
      messages: [],
      status: 'open'
    });
    expect(placeholder.timestamp).toBe(Date.parse('2026-06-01T05:05:00.000Z'));
  });

  it('keeps the selected backend session when a refresh page does not include it', () => {
    const selected = createRecentActivitySessionPlaceholder('session-outside-page');
    const fetched = [{ ...makeSession([]), id: 'session-fetched', backendSessionId: 'session-fetched', timestamp: 2 }];

    const merged = mergeFetchedChatSessions(fetched, [selected], selected.id);

    expect(merged.map((session) => session.id)).toContain('session-outside-page');
  });
});

describe('target chat controller wiring', () => {
  const clusterDetail = readFileSync(resolve(root, 'src/features/kubernetes-cluster-detail/KubernetesClusterDetail.tsx'), 'utf8');
  const clusterChatPanel = readFileSync(resolve(root, 'src/features/kubernetes-cluster-detail/components/detail/ClusterChatPanel.tsx'), 'utf8');
  const appClusterChatRuntime = readFileSync(resolve(root, 'src/app/AppClusterChatRuntime.tsx'), 'utf8');
  const chatView = readFileSync(resolve(root, 'src/features/kubernetes-cluster-detail/components/detail/views/TargetChatView.tsx'), 'utf8');
  const useTargetChat = readFileSync(resolve(root, 'src/features/kubernetes-cluster-detail/hooks/useTargetChat.ts'), 'utf8');
  const chatSubmit = readFileSync(resolve(root, 'src/features/kubernetes-cluster-detail/hooks/chatSubmit.ts'), 'utf8');
  const chatSubmitFailures = readFileSync(resolve(root, 'src/features/kubernetes-cluster-detail/hooks/chatSubmitFailures.ts'), 'utf8');
  const chatSessionSync = readFileSync(resolve(root, 'src/features/kubernetes-cluster-detail/hooks/chatSessionSync.ts'), 'utf8');
  const targetChatRunWatcher = readFileSync(resolve(root, 'src/features/kubernetes-cluster-detail/hooks/targetChatRunWatcher.ts'), 'utf8');
  const targetChatActivityStream = readFileSync(resolve(root, 'src/features/kubernetes-cluster-detail/hooks/targetChatActivityStream.ts'), 'utf8');
  const useActivityDiscoveredRun = readFileSync(resolve(root, 'src/features/kubernetes-cluster-detail/hooks/useActivityDiscoveredRun.ts'), 'utf8');
  const useTargetChatScrollAnchor = readFileSync(resolve(root, 'src/features/kubernetes-cluster-detail/hooks/useTargetChatScrollAnchor.ts'), 'utf8');

  it('keeps the chat runtime hoisted above sidebar and fullscreen presentations', () => {
    expect(clusterDetail).not.toContain('useTargetChat({');
    expect(clusterChatPanel).not.toContain('useTargetChat({');
    expect(appClusterChatRuntime).toContain('useTargetChat({');
  });

  it('uses restored active run state to disable input and expose cancellation', () => {
    expect(chatView).toContain('const canCancelActiveRun = isRunActive && canCancelRuns && Boolean(activeRunId);');
    expect(chatView).toContain("type={isRunActive ? 'button' : 'submit'}");
    expect(chatView).toContain('if (canCancelActiveRun && !isCancellingRun) void onCancelRun();');
    expect(chatView).toContain('disabled={!canPost || isRunActive}');
    expect(chatView).toContain('const hasComposerSubmitPayload = Boolean(inputValue.trim() || hasComposerAttachmentContext);');
    expect(chatView).toContain('disabled={isRunActive ? !canCancelActiveRun || isCancellingRun : !canPost || !hasComposerSubmitPayload || isComposerRuntimeUnavailable}');
  });

  it('serializes chat submissions before React run-active state catches up', () => {
    expect(useTargetChat).toContain('const submitInFlightRef = useRef(false);');
    expect(useTargetChat).toContain('const submitChatMessageForArgs = (args: {');
    expect(useTargetChat).toContain('const releaseSubmitLockSoon = () => {');
    expect(useTargetChat).toContain('setTimeout(() => {');
    expect(useTargetChat).toContain('if (submitInFlightRef.current) return;');
    expect(useTargetChat).toContain('submitInFlightRef.current = true;');
    expect(useTargetChat).toContain('releaseSubmitLockSoon();');
    expect(useTargetChat).toContain('if (shouldReleaseSubmitLock) submitInFlightRef.current = false;');
    expect(useTargetChat).toContain('if (!prompt || isRunActive || !canPostInActiveSession || submitInFlightRef.current) return;');
    expect(useTargetChat).toContain('const handleSendInNewSession = async (overrideInput: string, runtimeSelection?: ChatRuntimeSelection) => {');
    expect(useTargetChat).toContain('let shouldReleaseSubmitLock = true;');
    expect(useTargetChat).toContain('const submitPromise = submitChatMessageForArgs({');
  });

  it('optimistically resolves cancelled runs so the composer and placeholder recover', () => {
    expect(useTargetChat).toContain('await controlPlaneApi.cancelRun(runId);');
    expect(useTargetChat).toContain('setActiveRunId(null);');
    expect(useTargetChat).toContain('setIsLoading(false);');
    expect(useTargetChat).toContain("status: 'cancelled'");
    expect(useTargetChat).toContain("t('chat.runCancelledMessage')");
    expect(useTargetChat).toContain('cancelledRunIdsRef.current.add(runId);');
    expect(useTargetChat).toContain("const isPendingAcceptedRun = runId.startsWith('pending-trace-');");
    expect(useTargetChat).toContain('if (!isPendingAcceptedRun)');
    expect(useTargetChat).toContain('markRunCancelled,');
    expect(useTargetChat).toContain('activeRunStreamControlsRef.current[runId]?.abort();');
    expect(useTargetChat).toContain('runTracesByRunIdRef.current = next;');
    expect(useTargetChat).toContain('replaceCancelledRunAssistantMessages(');
    expect(chatSubmit).toContain('isRunCancelled(pendingTraceRunId)');
    expect(chatSubmit).toContain('markRunCancelled?.(accepted.runId);');
    expect(chatSubmit).toContain('replacePendingCancelledRunMessages(');
    expect(chatSubmit).toContain('await controlPlaneApi.cancelRun(accepted.runId).catch(() => undefined);');
  });

  it('replaces transient assistant placeholders with actionable setup failures', () => {
    expect(chatSubmitFailures).toContain("error.code === 'AI_PROVIDER_CREDENTIAL_MISSING'");
    expect(chatSubmitFailures).toContain('buildChatSetupFailureMessage(errorMessage, args.runId)');
    expect(chatSubmit).toContain('buildChatSubmitFailureMessage({');
    expect(chatSubmit).toContain('replacePendingAssistantWithFailure({');
    expect(chatSubmit).toContain('pendingAssistantMessageId,');
    expect(chatSubmit).toContain('pendingTraceRunId,');
    expect(chatSubmitFailures).toContain('isBlankAssistantMessage(message)');
    expect(chatSubmitFailures).toContain('AI Settings](#${AppPaths.workspaceAiSettings(workspaceId)}');
  });

  it('merges session refreshes with the latest selected session id', () => {
    expect(chatSessionSync).toContain('const activeSessionIdRef = useRef(activeSessionId);');
    expect(chatSessionSync).toContain('activeSessionIdRef.current = activeSessionId;');
    expect(chatSessionSync).toContain('mergeFetchedChatSessions(fetched, latestSessionsRef.current, activeSessionIdRef.current)');
    expect(chatSessionSync).toContain('mergeHydratedChatMessages({');
    expect(chatSessionSync).toContain("if (existingTrace.status === 'cancelled')");
    expect(chatSessionSync).toContain('if (message.runId && isRunCancelled(message.runId))');
    expect(chatSessionSync).toContain('isRunCancelled,');
    expect(chatSessionSync).toContain('suppressedRunIds: suppressedHydrationRunIdsRef?.current');
    expect(useTargetChat).toContain('filterMessagesByRunIds(sanitizeChatMessages(messages), suppressedHydrationRunIdsRef.current)');
    expect(useTargetChat).toContain('const revisedRunIds = new Set(turnMessages.map((message) => message.runId).filter(Boolean) as string[]);');
    expect(useTargetChat).toContain('for (const revisedRunId of revisedRunIds) suppressedHydrationRunIdsRef.current.add(revisedRunId);');
    expect(chatSubmit).toContain('suppressedRunIdsRef?: MutableRefObject<ReadonlySet<string>>;');
    expect(chatSubmit).toContain('const filterSuppressedMessages = (nextMessages: ChatMessage[]) => filterMessagesByRunIds(nextMessages, suppressedRunIdsRef?.current);');
    expect(chatSessionSync).toContain('replaceCancelledRunMessagesForHydration(');
  });

  it('keeps chat auto-scroll anchored by stable render signals', () => {
    expect(useTargetChat).toContain('const chatAutoScrollSignature = [');
    expect(useTargetChat).toContain('lastMessage?.content.length || 0');
    expect(useTargetChat).toContain('lastMessage?.approval?.status ||');
    expect(useTargetChat).toContain('const activeRunTraceSignature = activeRunTrace');
    expect(useTargetChat).toContain('activeRunTrace.steps.length');
    expect(useTargetChat).toContain('activeRunLatestStep?.detail?.length || 0');
    expect(useTargetChat).toContain("toolCall.status === 'running'");
    expect(useTargetChat).toContain('activeRunTraceSignature');
    expect(useTargetChat).toContain('useTargetChatScrollAnchor({');
    expect(useTargetChat).toContain('transcriptRef');
    expect(useTargetChatScrollAnchor).toContain('useLayoutEffect(() => {');
    expect(useTargetChatScrollAnchor).toContain('const wasChatActiveRef = useRef(isChatActive);');
    expect(useTargetChatScrollAnchor).toContain('const openedChatSessionIdRef = useRef(isChatActive ? activeSessionId : null);');
    expect(useTargetChatScrollAnchor).toContain('const wasChatActive = wasChatActiveRef.current;');
    expect(useTargetChatScrollAnchor).toContain('wasChatActiveRef.current = isChatActive;');
    expect(useTargetChatScrollAnchor).toContain('const didChangeOpenSession = isChatActive && activeSessionId !== openedChatSessionIdRef.current;');
    expect(useTargetChatScrollAnchor).toContain('openedChatSessionIdRef.current = isChatActive ? activeSessionId : null;');
    expect(useTargetChatScrollAnchor).toContain('if ((isChatActive && !wasChatActive) || didChangeOpenSession) {');
    expect(useTargetChatScrollAnchor).toContain('lastChatScrollTopRef.current = 0;');
    expect(useTargetChatScrollAnchor).toContain('const transcriptRef = useCallback((node: HTMLDivElement | null) => {');
    expect(useTargetChatScrollAnchor).toContain('scrollRef.current = node;');
    expect(useTargetChatScrollAnchor).toContain('lastChatScrollTopRef.current = node.scrollTop;');
    expect(useTargetChatScrollAnchor).toContain('window.requestAnimationFrame(() => {');
    expect(useTargetChatScrollAnchor).toContain('isLoadingEarlierMessages');
    expect(useTargetChatScrollAnchor).toContain('node.scrollTop = node.scrollHeight;');
    expect(useTargetChatScrollAnchor).toContain('const lastChatScrollTopRef = useRef(0);');
    expect(useTargetChat).toContain('currentScrollTop < lastChatScrollTopRef.current - 0.5');
    expect(useTargetChat).toContain('currentScrollTop > lastChatScrollTopRef.current + 0.5');
    expect(useTargetChat).toContain('shouldStickToBottomRef.current = false;');
    expect(useTargetChat).toContain('distanceToBottom <= 2 && (shouldStickToBottomRef.current || isScrollingDown)');
    expect(useTargetChat).toContain('!shouldStickToBottomRef.current && node.scrollTop < 160 && hasEarlierMessages');
    expect(useTargetChatScrollAnchor).toContain('[activeSessionId, chatAutoScrollSignature, isChatActive, isLoadingEarlierMessages]');
    expect(useTargetChat).not.toContain('[messages, isRunActive, isChatActive]');
  });

  it('keeps live run trace state and reconciliation refs synchronized', () => {
    expect(useTargetChat).toContain('const setRunTracesByRunIdAndRef: typeof setRunTracesByRunId = useCallback((update) => {');
    expect(useTargetChat).toContain('runTracesByRunIdRef.current = next;');
    expect(useTargetChat).toContain('setRunTracesByRunId: setRunTracesByRunIdAndRef,');
    expect(targetChatRunWatcher).toContain('runTracesByRunIdRef.current = next;');
    expect(chatSessionSync).toContain('runTracesByRunIdRef.current = next;');
  });

  it('advances target activity replay cursors only after canonical reconciliation', () => {
    expect(targetChatActivityStream).toContain('let processing = Promise.resolve();');
    expect(targetChatActivityStream).toContain('let activityRefreshFailed = false;');
    expect(targetChatActivityStream).toContain('if (activityRefreshFailed) {');
    expect(targetChatActivityStream).toContain('await refreshSession(event);');
    expect(targetChatActivityStream).toContain('lastEventIdRef.current = event.id;');
    expect(targetChatActivityStream.indexOf('await refreshSession(event);')).toBeLessThan(
      targetChatActivityStream.indexOf('lastEventIdRef.current = event.id;')
    );
    expect(targetChatActivityStream.indexOf('activityRefreshFailed = true;')).toBeGreaterThan(
      targetChatActivityStream.indexOf('lastEventIdRef.current = event.id;')
    );
    expect(targetChatActivityStream).toContain('const onUpdateSessionsRef = useRef(onUpdateSessions);');
    expect(targetChatActivityStream).toContain('onUpdateSessionsRef.current = onUpdateSessions;');
    expect(targetChatActivityStream).toContain('controlPlaneApi.getRun(event.runId).catch(() => null)');
    expect(targetChatActivityStream).toContain('let fetchedSessions: ChatSession[] | null = null;');
    expect(targetChatActivityStream).toContain('findExistingSessionForBackendId(latestSessions, session.id)');
    expect(targetChatActivityStream).toContain('const currentSessions = latestSessionsRef.current;');
    expect(targetChatActivityStream).toContain('const publishBase = fetchedSessions');
    expect(targetChatActivityStream).toContain('nextSessions = upsertSession(publishBase, hydratedSession);');
    expect(targetChatActivityStream).toContain('onUpdateSessionsRef.current(nextSessions);');
    const activityEffectDependencies = targetChatActivityStream.slice(targetChatActivityStream.lastIndexOf('  }, ['));
    expect(activityEffectDependencies).not.toContain('onUpdateSessions,');
    expect(targetChatActivityStream).toContain("console.warn('Target chat activity refresh failed', error);");
    expect(targetChatActivityStream).toContain('streamAbortController?.abort();');
    expect(targetChatActivityStream).toContain('replaceCancelledRunAssistantMessages(mappedMessages, run.id, runCancelledMessage)');
    expect(targetChatActivityStream).toContain('const restoredTrace = buildTraceFromRunEvents(run, events);');
    expect(targetChatActivityStream).toContain('existingTrace && hasTraceDetails(existingTrace)');
    expect(targetChatActivityStream).toContain('status: mapRunStatusToTraceStatus(run.status)');
    expect(targetChatActivityStream).not.toContain('steps: [],\n                toolCalls: []');
    expect(targetChatActivityStream).toContain('createRecentActivitySessionPlaceholder(event.sessionId)');
    expect(targetChatActivityStream).toContain('shouldDiscoverActiveRunFromActivity(activeSessionIdRef.current, hydratedSession.id)');
    expect(targetChatActivityStream).toContain('onActiveRunDiscovered?.(hydratedSession.id, run.id);');
    expect(useTargetChat).toContain('} = useActivityDiscoveredRun({');
    expect(useTargetChat).toContain('const effectiveActiveRunId = derivedRunState.activeRunId || activityDiscoveredRunId;');
    expect(useTargetChat).toContain('const isRunActive = isLoading || derivedRunState.isRunActive || Boolean(activityDiscoveredRunId);');
    expect(useTargetChat).toContain('onActiveRunDiscovered: handleActiveRunDiscovered,');
    expect(useTargetChat).toContain('cancelledRunIds: cancelledRunIdsRef.current,');
    expect(useTargetChat).toContain("runCancelledMessage: t('chat.runCancelledMessage')");
    expect(targetChatActivityStream).toContain('cancelledRunIds?: ReadonlySet<string>;');
    expect(targetChatActivityStream).toContain('const isLocallyCancelledRun = cancelledRunIds?.has(run.id) === true;');
    expect(targetChatActivityStream).toContain('if (isLocallyCancelledRun) {');
    expect(targetChatActivityStream).toContain('hasActiveRun: run && cancelledRunIds?.has(run.id) ? false');
    expect(targetChatActivityStream).toContain('!cancelledRunIds?.has(run.id) &&');
    expect(useTargetChat).toContain('resetActivityWatchedRun();');
    expect(useTargetChat).toContain('clearActivityWatchedRunForSession(sessionId);');
    expect(useTargetChat).toContain('if (!activeSessionId) {\n      setActiveSessionId(sortedSessions.length > 0 ? sortedSessions[0].id : null);\n      return;\n    }');
    expect(chatSessionSync).not.toContain('activeHydrationRunSignature');
    expect(chatSessionSync).toContain('Run-id churn is intentionally excluded');
    expect(useActivityDiscoveredRun).toContain('const [activityWatchedRun, setActivityWatchedRun]');
    expect(useActivityDiscoveredRun).toContain('const activityDiscoveredRunId = deriveActivityDiscoveredRunId({');
    expect(useActivityDiscoveredRun).toContain('(sessionId: string, runId: string) => setActivityWatchedRun({ sessionId, runId })');
    expect(useActivityDiscoveredRun).toContain('current?.sessionId === sessionId ? null : current');
  });

  it('sanitizes visible messages before rendering in-flight placeholders', () => {
    expect(useTargetChat).toContain('const visibleMessages = filterMessagesByRunIds(sanitizeChatMessages(messages), suppressedHydrationRunIdsRef.current)');
    expect(useTargetChat).toContain(".filter((message) => !isBlankAssistantMessage(message) || isInFlightAssistantPlaceholder(message));");
  });

  it('does not mark watched sessions inactive after a stream pause without checking run status', () => {
    expect(appClusterChatRuntime).toContain('useTargetChat({');
    expect(targetChatRunWatcher).toContain('const missedEvents = await controlPlaneApi.getRunEvents(runId).catch(() => []);');
    expect(targetChatRunWatcher).toContain('hydrated: backendMessages ? true : session.hydrated');
    expect(targetChatRunWatcher).toContain('hasActiveRun: latestRun ? isRunInProgress(latestRun.status) : isTraceInProgress(trace)');
    expect(targetChatRunWatcher).toContain('mergeHydratedChatMessages({');
  });

  it('reconnects watched run streams with capped backoff instead of opening duplicate streams', () => {
    expect(targetChatRunWatcher).toContain('const WATCHER_RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000];');
    expect(targetChatRunWatcher).toContain('const WATCHER_EVENT_POLL_INTERVAL_MS = 700;');
    expect(targetChatRunWatcher).toContain('const replayRunEvents = (run: ControlPlaneRun, events: ControlPlaneRunEvent[]) =>');
    expect(targetChatRunWatcher).toContain('setTraceForRun(createBaseRunTrace(run.id, isRunInProgress(run.status) ? mapRunStatusToTraceStatus(run.status) :');
    expect(targetChatRunWatcher).toContain('handleRunEvent(event);');
    expect(targetChatRunWatcher).toContain('replayRunEvents(run, events);');
    expect(targetChatRunWatcher).not.toContain('seenSeq.add(event.seq);');
    expect(targetChatRunWatcher).toContain('while (!cancelled && !isRunCancelled(runId) && latestRun && isRunInProgress(latestRun.status))');
    expect(targetChatRunWatcher).toContain('const polledEvents = await controlPlaneApi.getRunEvents(runId);');
    expect(targetChatRunWatcher).toContain('handleRunEvent(polledEvent);');
    expect(targetChatRunWatcher).toContain('pollEventsStop = true;');
    expect(targetChatRunWatcher).toContain('await pollEventsPromise.catch(() => undefined);');
    expect(targetChatRunWatcher).toContain('await waitForReconnect(delayMs);');
    expect(targetChatRunWatcher).toContain('abortController.abort();');
    expect(targetChatRunWatcher).toContain('let pendingSessionPublish');
    expect(targetChatRunWatcher).toContain('pendingSessionPublish = setTimeout');
    expect(targetChatRunWatcher).toContain('}, 80);');
    expect(targetChatRunWatcher).toContain('const onUpdateSessionsRef = useRef(onUpdateSessions);');
    expect(targetChatRunWatcher).toContain('onUpdateSessionsRef.current = onUpdateSessions;');
    expect(targetChatRunWatcher).toContain('onUpdateSessionsRef.current(nextSessions);');
    const watcherEffectDependencies = targetChatRunWatcher.slice(targetChatRunWatcher.lastIndexOf('  }, ['));
    expect(watcherEffectDependencies).not.toContain('onUpdateSessions,');
    expect(targetChatRunWatcher).toContain('watchedBackendSessionId,');
    expect(targetChatRunWatcher).toContain('watchedSessionId');
    expect(targetChatRunWatcher).toContain('if (cancelled || isRunCancelled(runId)) return;');
    expect(targetChatRunWatcher).not.toMatch(/activeSessionRecord,\s*activeSessionRecord\?\.backendSessionId/);
  });

  it('skips only locally owned submit streams when following active runs', () => {
    expect(useTargetChat).toContain('const hasLocalRunStream = useCallback((runId: string) => Boolean(activeRunStreamControlsRef.current[runId]), []);');
    expect(useTargetChat).toContain('hasLocalRunStream,');
    expect(targetChatRunWatcher).toContain('hasLocalRunStream?: (runId: string) => boolean;');
    expect(targetChatRunWatcher).toContain('hasLocalRunStream = (runId: string) => activeRunId === runId');
    expect(targetChatRunWatcher).toContain('hasLocalRunStream(runId)');
    expect(targetChatRunWatcher).not.toContain('activeRunId === runId ||');
  });

  it('reuses restored assistant placeholders for watched streams', () => {
    expect(targetChatRunWatcher).toContain('let activeStreamingMessageId = streamingMessageId;');
    expect(targetChatRunWatcher).toContain("message.role === 'assistant' && message.runId === runId");
    expect(targetChatRunWatcher).toContain('activeStreamingMessageId = existingRunMessage.id;');
    expect(targetChatRunWatcher).toContain('message.id === activeStreamingMessageId');
    expect(targetChatRunWatcher).toContain('let streamingContent =');
    expect(targetChatRunWatcher).toContain('let streamingApproval');
    expect(targetChatRunWatcher).toContain('const replayApprovalState = (events: ControlPlaneRunEvent[]) =>');
    expect(targetChatRunWatcher).toContain("event.type === 'tool_approval_requested'");
    expect(targetChatRunWatcher).toContain("approval.status === 'pending'");
    expect(targetChatRunWatcher).toContain('replayApprovalState(events);');
    expect(targetChatRunWatcher).toContain('streamingContent = `${streamingContent}${text}`;');
    expect(targetChatRunWatcher).toContain('streamingApproval = approval;');
    expect(targetChatRunWatcher).toContain('const nextApproval = streamingApproval || existingRunMessage.approval;');
    expect(targetChatRunWatcher).toContain('approval: nextApproval');
    expect(targetChatRunWatcher).toContain('resolveAssistantTransientStatus(nextContent, nextApproval)');
    expect(targetChatRunWatcher).toContain('resolveAssistantTransientStatus(content, streamingApproval)');
    expect(chatSubmit).toContain('resolveAssistantTransientStatus(nextContent, message.approval)');
    expect(targetChatRunWatcher).not.toContain('content: `${message.content}${text}`');
  });
});
