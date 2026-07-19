import { describe, expect, it } from 'vitest';
import {
  deriveAssistantSessionStatus,
  deriveAssistantRuntimeStatus,
  isActiveAssistantStatus,
  isTerminalAssistantStatus
} from '@/app/assistantNavStatus';
import type { ChatSession } from '@/types';
import type { TargetChatController } from '@/features/targets/chat/hooks/useTargetChat';

function controller(overrides: Partial<TargetChatController> = {}): TargetChatController {
  return {
    sessions: [],
    activeSessionId: null,
    activeSession: null,
    isActiveSessionOwner: true,
    conversationNotice: null,
    recentActivityWarning: null,
    inputValue: '',
    isLoading: false,
    isRunActive: false,
    isSessionsLoading: false,
    isLoadingEarlierMessages: false,
    hasEarlierMessages: false,
    activeRunId: null,
    isCancellingRun: false,
    visibleMessages: [],
    runTracesByRunId: {},
    traceExpandedByRunId: {},
    composerRuntimeSelection: undefined,
    workspaceAiSettings: null,
    isWorkspaceAiSettingsLoading: false,
    workspaceAiSettingsError: '',
    workspaceAiSettingsRefreshToken: 0,
    transcriptRef: () => undefined,
    setActiveSessionId: () => undefined,
    handleCreateSession: () => undefined,
    handleCreateSessionWithInput: async () => undefined,
    handleDismissRecentActivityWarning: () => undefined,
    handleOpenRecentActivitySession: () => undefined,
    handleDeleteSession: async () => undefined,
    handleCancelRun: async () => undefined,
    setInputValue: () => undefined,
    setComposerRuntimeSelection: () => undefined,
    setTraceExpandedByRunId: () => undefined,
    handleChatScroll: () => undefined,
    handleLoadEarlierMessages: async () => undefined,
    handleSend: async () => undefined,
    handleSendInNewSession: async () => undefined,
    handleEditLastUserMessage: async () => undefined,
    handleApprove: async () => undefined,
    handleReject: async () => undefined,
    isInFlightAssistantPlaceholder: () => false,
    ...overrides
  };
}

describe('assistant navigation status', () => {
  it('prioritizes review prompts above generic working state', () => {
    const status = deriveAssistantRuntimeStatus(controller({
      isRunActive: true,
      visibleMessages: [{
        id: 'assistant-1',
        role: 'assistant',
        content: '',
        timestamp: 1,
        approval: {
          id: 'approval-1',
          toolCallId: 'call-1',
          toolName: 'restart_workload',
          action: 'Run restart_workload',
          arguments: {},
          expiresAt: '2026-06-16T00:05:00.000Z',
          status: 'pending'
        }
      }]
    }));

    expect(status).toBe('review');
  });

  it('reports active and terminal assistant states without surfacing old traces as active work', () => {
    expect(deriveAssistantRuntimeStatus(controller({ isRunActive: true }))).toBe('working');
    expect(deriveAssistantRuntimeStatus(controller({
      runTracesByRunId: {
        old: { runId: 'old', status: 'completed', steps: [{ id: 'step-1', label: 'Done', status: 'success', timestamp: 1 }], toolCalls: [] },
        latest: { runId: 'latest', status: 'completed', steps: [{ id: 'step-2', label: 'Done', status: 'success', timestamp: 2 }], toolCalls: [] }
      }
    }))).toBe('done');
    expect(deriveAssistantRuntimeStatus(controller({
      runTracesByRunId: {
        latest: { runId: 'latest', status: 'failed', steps: [{ id: 'step-1', label: 'Failed', status: 'error', timestamp: 2 }], toolCalls: [] }
      }
    }))).toBe('done');
    expect(deriveAssistantRuntimeStatus(controller({
      runTracesByRunId: {
        cancelled: { runId: 'cancelled', status: 'cancelled', steps: [], toolCalls: [] }
      }
    }))).toBe('idle');
  });

  it('classifies active and terminal states for unseen navigation behavior', () => {
    expect(isActiveAssistantStatus('working')).toBe(true);
    expect(isActiveAssistantStatus('review')).toBe(true);
    expect(isTerminalAssistantStatus('done')).toBe(true);
    expect(isTerminalAssistantStatus('idle')).toBe(false);
  });

  it('derives per-conversation indicators from approvals, active runs, and terminal traces', () => {
    const baseSession: ChatSession = {
      id: 'session-1',
      name: 'Check rollout',
      timestamp: 1,
      messages: []
    };

    expect(deriveAssistantSessionStatus({
      ...baseSession,
      messages: [{
        id: 'assistant-1',
        role: 'assistant',
        content: '',
        timestamp: 1,
        approval: {
          id: 'approval-1',
          action: 'Run restart_workload',
          status: 'pending'
        }
      }]
    })).toBe('review');
    expect(deriveAssistantSessionStatus({ ...baseSession, hasActiveRun: true })).toBe('working');
    expect(deriveAssistantSessionStatus(
      { ...baseSession, messages: [{ id: 'assistant-1', role: 'assistant', content: 'Failed', timestamp: 1, runId: 'run-1' }] },
      { 'run-1': { runId: 'run-1', status: 'failed', steps: [], toolCalls: [] } }
    )).toBe('done');
    expect(deriveAssistantSessionStatus({
      ...baseSession,
      messages: [{ id: 'assistant-2', role: 'assistant', content: 'Finished inspecting the workload.', timestamp: 2, runId: 'run-2' }]
    })).toBe('done');
  });
});
