import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatMessage, ChatSession } from '@/types';
import { isRuntimeSelectionPolicyRejection, RUN_TERMINAL_WAIT_TIMEOUT_MS, submitChatMessage } from '@/features/targets/chat/hooks/chatSubmit';
import { ControlPlaneRequestError } from '@/services/control-plane/http';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import { preserveStreamingAssistantMessageId } from '@/features/targets/chat/lib/session-utils';
import {
  replaceCancelledRunAssistantMessages,
  replacePendingCancelledRunMessages
} from '@/features/targets/chat/hooks/chatRunCancellation';

afterEach(() => {
  vi.restoreAllMocks();
});

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve = (_value: T) => undefined;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

describe('preserveStreamingAssistantMessageId', () => {
  it('keeps the streamed assistant message mounted when backend messages reconcile', () => {
    const messages: ChatMessage[] = [
      {
        id: 'backend-user-message',
        role: 'user',
        content: 'Check the pods',
        timestamp: 1
      },
      {
        id: 'backend-assistant-message',
        role: 'assistant',
        runId: 'run-123',
        content: 'The pods are healthy.',
        timestamp: 2
      },
      {
        id: 'other-assistant-message',
        role: 'assistant',
        runId: 'run-older',
        content: 'Earlier result.',
        timestamp: 3
      }
    ];

    expect(preserveStreamingAssistantMessageId(messages, 'run-123', 'stream-run-123')).toEqual([
      messages[0],
      {
        ...messages[1],
        id: 'stream-run-123'
      },
      messages[2]
    ]);
  });

  it('remaps a cancelled pending trace to the accepted backend run id', () => {
    const messages: ChatMessage[] = [
      {
        id: 'local-user',
        role: 'user',
        content: 'Check pods',
        timestamp: 1,
        clientMessageId: 'local-user'
      },
      {
        id: 'pending-assistant',
        role: 'assistant',
        runId: 'pending-trace-1',
        content: '',
        transientStatus: 'pending_assistant',
        timestamp: 2
      }
    ];

    expect(replacePendingCancelledRunMessages(messages, {
      pendingRunId: 'pending-trace-1',
      acceptedRunId: 'run-123',
      userMessageId: 'local-user',
      pendingAssistantMessageId: 'pending-assistant',
      streamingMessageId: 'stream-run-123',
      cancelledMessage: 'Run cancelled. You can send another message when ready.',
      timestamp: 3
    })).toEqual([
      {
        ...messages[0],
        runId: 'run-123'
      },
      {
        id: 'stream-run-123',
        role: 'assistant',
        content: 'Run cancelled. You can send another message when ready.',
        runId: 'run-123',
        timestamp: 3
      }
    ]);
  });

  it('preserves a newer follow-up while remapping the cancelled turn', () => {
    const messages: ChatMessage[] = [
      { id: 'cancelled-user', role: 'user', content: 'First request', runId: 'pending-trace-1', timestamp: 1 },
      { id: 'cancelled-assistant', role: 'assistant', content: 'Run cancelled.', runId: 'pending-trace-1', timestamp: 2 },
      { id: 'follow-up-user', role: 'user', content: 'Follow-up request', runId: 'pending-trace-2', timestamp: 3 },
      { id: 'follow-up-assistant', role: 'assistant', content: '', runId: 'pending-trace-2', timestamp: 4 }
    ];

    expect(replacePendingCancelledRunMessages(messages, {
      pendingRunId: 'pending-trace-1',
      acceptedRunId: 'run-1',
      userMessageId: 'cancelled-user',
      pendingAssistantMessageId: 'cancelled-assistant',
      streamingMessageId: 'stream-run-1',
      cancelledMessage: 'Run cancelled.',
      timestamp: 5
    })).toEqual([
      { ...messages[0], runId: 'run-1' },
      { id: 'stream-run-1', role: 'assistant', content: 'Run cancelled.', runId: 'run-1', timestamp: 5 },
      messages[2],
      messages[3]
    ]);
  });
});

describe('submitChatMessage pending cancellation', () => {
  it('does not publish a stale snapshot over an immediate follow-up', async () => {
    const accepted = deferred<Awaited<ReturnType<typeof controlPlaneApi.postSessionMessage>>>();
    vi.spyOn(controlPlaneApi, 'postSessionMessage').mockReturnValueOnce(accepted.promise);
    const cancelRun = vi.spyOn(controlPlaneApi, 'cancelRun').mockResolvedValueOnce(undefined);
    const runtimeSelection = { provider: 'openai' as const, model: 'gpt-5', reasoningEffort: 'low' as const };
    const initialSession: ChatSession = {
      id: 'session-local',
      backendSessionId: 'session-backend',
      name: 'Chat',
      messages: [],
      timestamp: 1
    };
    let latestSessions = [initialSession];
    let runTraces: Record<string, { runId: string; status: 'connecting' | 'cancelled'; steps: never[]; toolCalls: never[] }> = {};
    let traceExpanded: Record<string, boolean> = {};
    const cancelledRunIds = new Set<string>();
    let followUpInserted = false;
    let stalePublishAfterFollowUp = false;
    const commitSessions = (nextSessions: ChatSession[]) => {
      if (followUpInserted && !nextSessions[0].messages.some((message) => message.id === 'follow-up-user')) {
        stalePublishAfterFollowUp = true;
      }
      latestSessions = nextSessions;
    };

    const submit = submitChatMessage({
      target: {
        id: 'target-1',
        workspaceId: 'workspace-1',
        targetType: 'kubernetes',
        name: 'Target',
        chatSessions: latestSessions,
        mcpTools: []
      },
      activeSession: initialSession,
      activeSessionId: initialSession.id,
      canChat: true,
      canRequestWriteRuns: false,
      inputValue: 'First request',
      isLoading: false,
      runtimeSelection,
      shouldStickToBottomRef: { current: false },
      onUpdateSessions: commitSessions,
      setActiveSessionId: () => undefined,
      setInputValue: () => undefined,
      setIsLoading: () => undefined,
      setActiveRunId: () => undefined,
      setRunTracesByRunId: (update) => {
        runTraces = typeof update === 'function' ? update(runTraces) as typeof runTraces : update as typeof runTraces;
      },
      setTraceExpandedByRunId: (update) => {
        traceExpanded = typeof update === 'function' ? update(traceExpanded) : update;
      },
      draftConversationName: 'New conversation',
      fallbackBackendErrorMessage: 'Request failed.',
      runCancelledMessage: 'Run cancelled. You can send another message when ready.',
      isRunCancelled: (runId) => cancelledRunIds.has(runId),
      markRunCancelled: (runId) => cancelledRunIds.add(runId),
      onPendingCancellationAccepted: (args) => {
        const { [args.pendingRunId]: pendingTrace, ...remainingTraces } = runTraces;
        runTraces = {
          ...remainingTraces,
          [args.acceptedRunId]: {
            ...(pendingTrace || { steps: [], toolCalls: [] }),
            runId: args.acceptedRunId,
            status: 'cancelled'
          }
        };
        const currentSession = latestSessions[0];
        commitSessions([{
          ...currentSession,
          messages: replacePendingCancelledRunMessages(currentSession.messages, args)
        }]);
      }
    });

    const pendingRunId = latestSessions[0].messages.find((message) => message.role === 'assistant')?.runId;
    expect(pendingRunId).toMatch(/^pending-trace-/);
    cancelledRunIds.add(pendingRunId!);
    runTraces[pendingRunId!] = { ...runTraces[pendingRunId!], status: 'cancelled' };
    latestSessions = [{
      ...latestSessions[0],
      messages: [
        ...replaceCancelledRunAssistantMessages(
          latestSessions[0].messages,
          pendingRunId!,
          'Run cancelled. You can send another message when ready.',
          2
        ),
        { id: 'follow-up-user', role: 'user', content: 'Follow-up request', timestamp: 3 },
        { id: 'follow-up-assistant', role: 'assistant', content: '', runId: 'pending-trace-follow-up', timestamp: 4 }
      ]
    }];
    followUpInserted = true;

    accepted.resolve({ messageId: 'message-1', runId: 'run-1', runtimeSelection });
    await submit;

    expect(stalePublishAfterFollowUp).toBe(false);
    expect(latestSessions[0].messages.map((message) => message.id)).toEqual([
      expect.any(String),
      'stream-run-1',
      'follow-up-user',
      'follow-up-assistant'
    ]);
    expect(latestSessions[0].messages[0].runId).toBe('run-1');
    expect(runTraces['run-1']).toMatchObject({ runId: 'run-1', status: 'cancelled' });
    expect(runTraces[pendingRunId!]).toBeUndefined();
    expect(cancelRun).toHaveBeenCalledWith('run-1');
  });
});

describe('replaceCancelledRunAssistantMessages', () => {
  it('replaces stale assistant content for a cancelled run with the cancellation message', () => {
    const messages: ChatMessage[] = [
      {
        id: 'user-message',
        role: 'user',
        content: 'Check the pods',
        timestamp: 1
      },
      {
        id: 'stale-assistant-message',
        role: 'assistant',
        runId: 'run-123',
        content: 'Stale generated content that arrived after cancel.',
        timestamp: 2,
        approval: {
          id: 'approval-1',
          runId: 'run-123',
          action: 'Run restart_workload',
          toolName: 'restart_workload',
          arguments: {},
          status: 'approved'
        }
      },
      {
        id: 'stale-rejected-approval-message',
        role: 'assistant',
        runId: 'run-123',
        content: '',
        timestamp: 3,
        approval: {
          id: 'approval-2',
          runId: 'run-123',
          action: 'Run scale_workload',
          toolName: 'scale_workload',
          arguments: {},
          status: 'rejected'
        }
      },
      {
        id: 'other-assistant-message',
        role: 'assistant',
        runId: 'run-older',
        content: 'Earlier result.',
        timestamp: 4
      }
    ];

    expect(replaceCancelledRunAssistantMessages(
      messages,
      'run-123',
      'Run cancelled. You can send another message when ready.',
      5
    )).toEqual([
      messages[0],
      {
        id: 'stale-assistant-message',
        role: 'assistant',
        content: 'Run cancelled. You can send another message when ready.',
        runId: 'run-123',
        timestamp: 5
      },
      messages[3]
    ]);
  });
});

describe('RUN_TERMINAL_WAIT_TIMEOUT_MS', () => {
  it('exceeds the default write approval timeout window', () => {
    expect(RUN_TERMINAL_WAIT_TIMEOUT_MS).toBeGreaterThan(300000);
  });
});

describe('isRuntimeSelectionPolicyRejection', () => {
  it.each(['PROVIDER_NOT_ALLOWED', 'MODEL_NOT_ALLOWED', 'REASONING_EFFORT_NOT_ALLOWED'])(
    'refreshes settings after a %s policy race',
    (code) => {
      expect(isRuntimeSelectionPolicyRejection(new ControlPlaneRequestError('rejected', 400, code))).toBe(true);
    }
  );

  it('does not treat unrelated submission errors as runtime policy races', () => {
    expect(isRuntimeSelectionPolicyRejection(new ControlPlaneRequestError('unavailable', 503, 'UPSTREAM_UNAVAILABLE'))).toBe(false);
  });
});
