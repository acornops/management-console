import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildRecentActivityWarning,
  buildTargetChatConversationAccessState,
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
  'chat.conversationNotice.owner': '你的会话。其他人可以实时查看，但只有你可以在这里回复。',
  'chat.conversationNotice.viewer': '只读会话。你可以实时查看，但只有 {{owner}} 可以在这里回复。',
  'chat.recentActivityTime.minuteAgo': '{{count}} 分钟前',
  'chat.recentActivityTime.minutesAgo': '{{count}} 分钟前',
  'chat.recentReadActivity.sameUser': '你在 {{relativeTime}}开始了“{{title}}”。继续该会话以保留上下文，或单独开始。',
  'chat.recentWriteActivity.sameUser': '你在 {{relativeTime}}开始了一个可写聊天。重新打开以保留上下文，或单独开始。',
  'chat.recentWriteActivity.otherUser': '{{user}} 在 {{relativeTime}}开始了一个可写聊天。建议先查看，再开始新的聊天。'
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

  it('localizes conversation ownership notices', () => {
    const state = buildTargetChatConversationAccessState({
      canChat: true,
      currentUserId: 'user-2',
      session: {
        ...makeSession([]),
        backendSessionId: 'backend-1',
        createdBy: 'user-1',
        createdByUser: { id: 'user-1', displayName: '平台负责人' }
      },
      t: zhChatWarningTranslator
    });

    expect(state.conversationNotice).toBe('只读会话。你可以实时查看，但只有 平台负责人 可以在这里回复。');
    expect(state.canPostInActiveSession).toBe(false);
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

    expect(warning?.message).toContain('You started');
    expect(warning?.message).toContain('"Restart api"');
    expect(warning?.actionSessionId).toBe('session-1');
    expect(warning?.actionLabel).toBeUndefined();
  });

  it('uses localized copy for same-user recent read activity', () => {
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
    }), 'user-1', zhChatWarningTranslator);

    expect(warning?.message).toBe('你在 2 分钟前开始了“Restart api”。继续该会话以保留上下文，或单独开始。');
    expect(warning?.actionSessionId).toBe('session-1');
    expect(warning?.actionLabel).toBeUndefined();
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

    expect(warning?.message).toBe('Platform Lead started a write-capable chat 1 minute ago. Review it before starting another.');
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

    expect(warning?.message).toBe('Platform Lead 在 1 分钟前开始了一个可写聊天。建议先查看，再开始新的聊天。');
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

    expect(warning?.message).toBe('You started a write-capable chat 3 minutes ago. Reopen it to keep context together, or start separately.');
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

    expect(warning?.message).toBe('你在 3 分钟前开始了一个可写聊天。重新打开以保留上下文，或单独开始。');
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
    expect(warning?.actionLabel).toBeUndefined();
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

    expect(warning?.message).toBe('Multiple users investigated this target recently. Review recent conversations before starting another.');
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
