import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildRecentActivityWarning,
  createRecentActivitySessionPlaceholder,
  deriveTargetChatRunState,
  isConversationOwner
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
  const chatSessionSync = readFileSync(resolve(root, 'src/features/kubernetes-cluster-detail/hooks/chatSessionSync.ts'), 'utf8');
  const targetChatRunWatcher = readFileSync(resolve(root, 'src/features/kubernetes-cluster-detail/hooks/targetChatRunWatcher.ts'), 'utf8');

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
    expect(chatView).toContain('disabled={isRunActive ? !canCancelActiveRun || isCancellingRun : !canPost || !inputValue.trim()}');
  });

  it('optimistically resolves cancelled runs so the composer and placeholder recover', () => {
    expect(useTargetChat).toContain('await controlPlaneApi.cancelRun(runId);');
    expect(useTargetChat).toContain('setActiveRunId(null);');
    expect(useTargetChat).toContain('setIsLoading(false);');
    expect(useTargetChat).toContain("status: 'cancelled'");
    expect(useTargetChat).toContain("t('chat.runCancelledMessage')");
    expect(useTargetChat).toContain('cancelledRunIdsRef.current.add(runId);');
    expect(useTargetChat).toContain('activeRunStreamControlsRef.current[runId]?.abort();');
    expect(useTargetChat).toContain('replaceCancelledRunAssistantMessages(');
  });

  it('merges session refreshes with the latest selected session id', () => {
    expect(chatSessionSync).toContain('const activeSessionIdRef = useRef(activeSessionId);');
    expect(chatSessionSync).toContain('activeSessionIdRef.current = activeSessionId;');
    expect(chatSessionSync).toContain('mergeFetchedChatSessions(fetched, latestSessionsRef.current, activeSessionIdRef.current)');
    expect(chatSessionSync).toContain("if (existingTrace.status === 'cancelled')");
    expect(chatSessionSync).toContain('replaceCancelledRunMessagesForHydration(');
  });

  it('does not mark watched sessions inactive after a stream pause without checking run status', () => {
    expect(appClusterChatRuntime).toContain('useTargetChat({');
    expect(targetChatRunWatcher).toContain('const missedEvents = await controlPlaneApi.getRunEvents(runId).catch(() => []);');
    expect(targetChatRunWatcher).toContain('hydrated: backendMessages ? true : session.hydrated');
    expect(targetChatRunWatcher).toContain('hasActiveRun: latestRun ? isRunInProgress(latestRun.status) : isTraceInProgress(trace)');
  });

  it('reconnects watched run streams with capped backoff instead of opening duplicate streams', () => {
    expect(targetChatRunWatcher).toContain('const WATCHER_RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000];');
    expect(targetChatRunWatcher).toContain('while (!cancelled && !isRunCancelled(runId) && latestRun && isRunInProgress(latestRun.status))');
    expect(targetChatRunWatcher).toContain('await waitForReconnect(delayMs);');
    expect(targetChatRunWatcher).toContain('abortController.abort();');
    expect(targetChatRunWatcher).toContain('let pendingSessionPublish');
    expect(targetChatRunWatcher).toContain('pendingSessionPublish = setTimeout');
    expect(targetChatRunWatcher).toContain('}, 80);');
    expect(targetChatRunWatcher).toContain('watchedBackendSessionId,');
    expect(targetChatRunWatcher).toContain('watchedSessionId');
    expect(targetChatRunWatcher).not.toMatch(/activeSessionRecord,\s*activeSessionRecord\?\.backendSessionId/);
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
    expect(targetChatRunWatcher).toContain('approval: streamingApproval || message.approval');
    expect(targetChatRunWatcher).not.toContain('content: `${message.content}${text}`');
  });
});
