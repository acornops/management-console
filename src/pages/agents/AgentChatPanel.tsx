import React from 'react';
import { Button, InlineAlert } from '@acornops/ui';
import { useTranslation } from 'react-i18next';
import {
  ConversationView,
  createMarkdownComponents,
  type LiveRunTrace
} from '@/features/conversations/presentation';
import type { ChatMessage, ChatRuntimeSelection, ChatSession, PendingApproval, Workspace } from '@/types';
import { controlPlaneApi } from '@/services/controlPlaneApi';
import {
  changeAgentConversationAccess,
  createAgentConversation,
  deleteAgentConversation,
  getAgentConversation,
  listAgentConversations,
  postAgentConversationMessage,
  type AgentConversationApiResponse,
  type AgentConversationRunApi,
  type AgentConversationSummaryApi
} from '@/services/control-plane/agentApi';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import { AgentAvatar } from '@/pages/agents/AgentAvatar';

const activeRunStatuses = new Set(['queued', 'dispatching', 'running', 'waiting_for_approval', 'cancelling']);

function traceStatus(status: string): LiveRunTrace['status'] {
  if (status === 'completed') return 'completed';
  if (status === 'failed') return 'failed';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'queued' || status === 'dispatching') return 'connecting';
  return 'running';
}

function runTrace(run: AgentConversationRunApi): LiveRunTrace {
  return {
    runId: run.id,
    status: traceStatus(run.status),
    steps: (run.events || []).slice(-40).map((event) => ({
      id: `${run.id}:${event.seq}`,
      label: event.type.replaceAll('_', ' '),
      detail: typeof event.payload?.message === 'string' ? event.payload.message : undefined,
      status: event.type.includes('failed') ? 'error' : event.type.includes('completed') ? 'success' : 'info',
      timestamp: Date.parse(event.ts) || Date.now()
    })),
    toolCalls: []
  };
}

function approvalToPending(approval: Awaited<ReturnType<typeof controlPlaneApi.listRunApprovals>>[number]): PendingApproval {
  return {
    id: approval.id,
    runId: approval.runId,
    toolCallId: approval.toolCallId,
    action: `Run ${approval.toolName}`,
    summary: approval.summary,
    toolName: approval.toolName,
    arguments: approval.arguments || {},
    expiresAt: approval.expiresAt,
    status: approval.status
  };
}

async function conversationMessages(response: AgentConversationApiResponse): Promise<{
  messages: ChatMessage[];
  traces: Record<string, LiveRunTrace>;
}> {
  const traces = Object.fromEntries(response.runs.map((run) => [run.id, runTrace(run)]));
  const messages: ChatMessage[] = response.messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    runId: message.runId,
    timestamp: Date.parse(message.createdAt) || Date.now()
  }));
  const pendingRuns = response.runs.filter((run) => activeRunStatuses.has(run.status));
  for (const run of pendingRuns) {
    const existingAssistant = messages.find((message) => message.role === 'assistant' && message.runId === run.id);
    const approvals = await controlPlaneApi.listRunApprovals(run.id).catch(() => []);
    const pendingApproval = approvals.find((approval) => approval.status === 'pending');
    if (existingAssistant && pendingApproval) existingAssistant.approval = approvalToPending(pendingApproval);
    if (!existingAssistant) {
      messages.push({
        id: `pending:${run.id}`,
        role: 'assistant',
        content: '',
        runId: run.id,
        transientStatus: 'pending_assistant',
        approval: pendingApproval ? approvalToPending(pendingApproval) : undefined,
        timestamp: Date.parse(run.requestedAt || '') || Date.now()
      });
    }
  }
  return { messages: messages.sort((left, right) => left.timestamp - right.timestamp), traces };
}

function toChatSession(
  summary: AgentConversationSummaryApi,
  messages: ChatMessage[] = [],
  hydrated = messages.length > 0
): ChatSession {
  return {
    id: summary.id,
    backendSessionId: summary.id,
    name: summary.title,
    createdBy: summary.createdBy,
    status: summary.status,
    hydrated,
    messages,
    timestamp: Date.parse(summary.createdAt) || Date.now()
  };
}

export const AgentChatPanel: React.FC<{
  agent: AgentDefinition;
  currentUserId: string;
  displayMode?: 'full' | 'panel';
  title?: string;
  isDark: boolean;
  permissions?: Workspace['permissions'];
  onClose?: () => void;
  onMaximize?: () => void;
  onOpenAiSettings: () => void;
}> = ({
  agent,
  currentUserId,
  displayMode = 'full',
  title,
  isDark,
  permissions,
  onClose,
  onMaximize,
  onOpenAiSettings
}) => {
  const { t } = useTranslation();
  const [summaries, setSummaries] = React.useState<AgentConversationSummaryApi[]>([]);
  const [sessions, setSessions] = React.useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null);
  const [inputValue, setInputValue] = React.useState('');
  const [isSessionsLoading, setIsSessionsLoading] = React.useState(true);
  const [isSending, setIsSending] = React.useState(false);
  const [isCancellingRun, setIsCancellingRun] = React.useState(false);
  const [runTracesByRunId, setRunTracesByRunId] = React.useState<Record<string, LiveRunTrace>>({});
  const [workspaceAiSettings, setWorkspaceAiSettings] = React.useState<Awaited<ReturnType<typeof controlPlaneApi.getWorkspaceAiSettings>> | null>(null);
  const [workspaceAiSettingsError, setWorkspaceAiSettingsError] = React.useState('');
  const [accessBusy, setAccessBusy] = React.useState(false);
  const [operationError, setOperationError] = React.useState('');
  const transcriptNodeRef = React.useRef<HTMLDivElement | null>(null);
  const assistantMarkdownComponents = React.useMemo(() => createMarkdownComponents('assistant'), []);
  const userMarkdownComponents = React.useMemo(() => createMarkdownComponents('user'), []);
  const activeSummary = summaries.find((summary) => summary.id === activeSessionId);
  const activeSession = sessions.find((session) => session.id === activeSessionId) || null;
  const effectivePermissionMode = activeSummary?.permissionMode || agent.permissionMode;
  const agentAllowsWrites = effectivePermissionMode !== 'read_only';
  const canCreateReadOnlyRuns = Boolean(permissions?.create_read_only_runs);
  const canCreateWriteRuns = Boolean(permissions?.create_read_write_runs);
  const canChangeAccess = agentAllowsWrites && (
    activeSummary?.accessMode === 'read_write' ? canCreateReadOnlyRuns : canCreateWriteRuns
  );
  const accessNoticeKey = activeSummary?.accessMode === 'read_write'
    ? effectivePermissionMode === 'auto_allowed_changes'
      ? 'agentChat.autoPolicyNotice'
      : 'agentChat.approvalPolicyNotice'
    : !agentAllowsWrites
      ? 'agentChat.agentReadOnlyNotice'
      : !canCreateWriteRuns
        ? 'agentChat.roleReadOnlyNotice'
        : 'agentChat.pausedNotice';
  const promptBodyKey = !agentAllowsWrites
    ? 'agentChat.promptBodyReadOnly'
    : !canCreateWriteRuns
      ? 'agentChat.promptBodyRoleReadOnly'
      : effectivePermissionMode === 'auto_allowed_changes'
        ? 'agentChat.promptBodyAutomatic'
        : 'agentChat.promptBodyApproval';
  const footerKey = !agentAllowsWrites
    ? 'agentChat.footerReadOnly'
    : !canCreateWriteRuns
      ? 'agentChat.footerRoleReadOnly'
      : effectivePermissionMode === 'auto_allowed_changes'
        ? 'agentChat.footerAutomatic'
        : 'agentChat.footerApproval';
  const activeRunId = [...(activeSession?.messages || [])]
    .reverse()
    .find((message) => message.runId && ['connecting', 'running'].includes(runTracesByRunId[message.runId]?.status))
    ?.runId || null;
  const canChat = Boolean(
    permissions?.create_sessions
    && (canCreateReadOnlyRuns || (agentAllowsWrites && canCreateWriteRuns))
  ) && agent.status === 'active' && agent.readiness.status === 'ready';
  const isOwner = !activeSummary || activeSummary.createdBy === currentUserId;
  const reportError = React.useCallback((error: unknown, fallback: string) => {
    setOperationError(error instanceof Error ? error.message : fallback);
  }, []);

  const refreshSummaries = React.useCallback(async (preferredId?: string) => {
    const items = await listAgentConversations(agent.workspaceId, agent.id);
    setOperationError('');
    setSummaries(items);
    setSessions((current) => items.map((summary) => {
      const existing = current.find((session) => session.id === summary.id);
      return toChatSession(summary, existing?.messages || []);
    }));
    setActiveSessionId((current) => preferredId || (items.some((item) => item.id === current) ? current : items[0]?.id || null));
  }, [agent.id, agent.workspaceId]);

  const refreshConversation = React.useCallback(async (conversationId: string) => {
    const response = await getAgentConversation(conversationId);
    const hydrated = await conversationMessages(response);
    setOperationError('');
    setSummaries((current) => current.map((summary) => summary.id === conversationId ? response.conversation : summary));
    setSessions((current) => current.map((session) => session.id === conversationId
      ? toChatSession(response.conversation, hydrated.messages, true)
      : session));
    setRunTracesByRunId((current) => ({ ...current, ...hydrated.traces }));
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setIsSessionsLoading(true);
    refreshSummaries()
      .catch(() => {
        if (!cancelled) {
          setSessions([]);
          setOperationError('Agent conversation history could not be loaded.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsSessionsLoading(false);
      });
    controlPlaneApi.getWorkspaceAiSettings(agent.workspaceId)
      .then((settings) => { if (!cancelled) setWorkspaceAiSettings(settings); })
      .catch((error) => { if (!cancelled) setWorkspaceAiSettingsError(error instanceof Error ? error.message : 'AI settings are unavailable.'); });
    return () => { cancelled = true; };
  }, [agent.workspaceId, refreshSummaries]);

  React.useEffect(() => {
    if (!activeSessionId) return;
    void refreshConversation(activeSessionId).catch((error) => {
      reportError(error, 'This Agent conversation could not be loaded.');
    });
  }, [activeSessionId, refreshConversation, reportError]);

  React.useEffect(() => {
    if (!activeSessionId || !activeRunId) return;
    const timer = window.setInterval(() => {
      void refreshConversation(activeSessionId).catch((error) => {
        reportError(error, 'The active Agent run could not be refreshed.');
      });
    }, 1500);
    return () => window.clearInterval(timer);
  }, [activeRunId, activeSessionId, refreshConversation, reportError]);

  const createConversation = React.useCallback(async () => {
    const response = await createAgentConversation(agent.workspaceId, agent.id);
    setOperationError('');
    setSummaries((current) => [response.conversation, ...current.filter((item) => item.id !== response.conversation.id)]);
    setSessions((current) => [toChatSession(response.conversation, [], true), ...current.filter((item) => item.id !== response.conversation.id)]);
    setActiveSessionId(response.conversation.id);
    return response.conversation.id;
  }, [agent.id, agent.workspaceId]);

  const send = React.useCallback(async (overrideInput?: string) => {
    const content = (overrideInput ?? inputValue).trim();
    if (!content || !canChat || isSending) return;
    setIsSending(true);
    try {
      const conversationId = activeSessionId || await createConversation();
      await postAgentConversationMessage(conversationId, content, globalThis.crypto?.randomUUID?.());
      setInputValue('');
      await refreshConversation(conversationId);
      await refreshSummaries(conversationId);
    } catch (error) {
      reportError(error, 'The message could not be sent.');
    } finally {
      setIsSending(false);
    }
  }, [activeSessionId, canChat, createConversation, inputValue, isSending, refreshConversation, refreshSummaries, reportError]);

  const changeAccess = async (accessMode: 'read_only' | 'read_write') => {
    if (!activeSessionId) return;
    setAccessBusy(true);
    try {
      const updated = await changeAgentConversationAccess(activeSessionId, accessMode);
      setOperationError('');
      setSummaries((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (error) {
      reportError(error, 'Conversation access could not be changed.');
    } finally {
      setAccessBusy(false);
    }
  };

  return (
    <div className={`flex flex-1 flex-col overflow-hidden ${
      displayMode === 'panel' ? 'h-full min-h-0 bg-ui-surface' : 'h-full min-h-0'
    }`}>
      {operationError && <InlineAlert tone="danger" className="m-4 mb-0">{operationError}</InlineAlert>}
      {activeSummary && isOwner && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ui-border bg-ui-bg px-4 py-3">
          <p className="type-caption text-ui-text-muted">
            {t(accessNoticeKey)}
          </p>
          {canChangeAccess && (
            <Button type="button" size="sm" variant="secondary" disabled={accessBusy || Boolean(activeRunId)} onClick={() => void changeAccess(activeSummary.accessMode === 'read_write' ? 'read_only' : 'read_write')}>
              {activeSummary.accessMode === 'read_write' ? t('agentChat.pauseChanges') : t('agentChat.resumePolicy')}
            </Button>
          )}
        </div>
      )}
      <ConversationView
        subject={{ id: agent.id, workspaceId: agent.workspaceId, name: agent.name }}
        headerLeading={<AgentAvatar emoji={agent.avatarEmoji} size={displayMode === 'panel' ? 'md' : 'lg'} />}
        title={title}
        automaticInvestigationsEnabled={false}
        capabilityPreviewEnabled={false}
        targetMentionsEnabled
        isDark={isDark}
        titleKey="agentChat.title"
        descriptionKey="agentChat.description"
        promptTitleKey="agentChat.promptTitle"
        promptBodyKey={promptBodyKey}
        inputPlaceholderKey="agentChat.inputPlaceholder"
        footerKey={footerKey}
        suggestionKeys={[
          'agentChat.suggestions.inspect',
          'agentChat.suggestions.summarize',
          'agentChat.suggestions.nextSteps',
          'agentChat.suggestions.readiness'
        ]}
        canChat={canChat}
        isConversationOwner={isOwner}
        conversationNotice={!isOwner ? t('agentChat.readerNotice') : null}
        recentActivityWarning={null}
        canRequestWriteRuns={activeSummary?.accessMode === 'read_write'}
        canApproveWriteActions={canCreateWriteRuns}
        canCancelRuns={Boolean(permissions?.cancel_runs)}
        canDeleteSessions={Boolean(permissions?.delete_sessions)}
        canManageAiSettings={Boolean(permissions?.manage_ai_settings)}
        isRunActive={Boolean(activeRunId) || isSending}
        isSessionsLoading={isSessionsLoading}
        isLoadingEarlierMessages={false}
        hasEarlierMessages={false}
        activeRunId={activeRunId}
        isCancellingRun={isCancellingRun}
        inputValue={inputValue}
        sessions={sessions}
        activeSessionId={activeSessionId}
        workspaceAiSettings={workspaceAiSettings}
        isWorkspaceAiSettingsLoading={!workspaceAiSettings && !workspaceAiSettingsError}
        workspaceAiSettingsError={workspaceAiSettingsError}
        assistantMarkdownComponents={assistantMarkdownComponents}
        userMarkdownComponents={userMarkdownComponents}
        visibleMessages={activeSession?.messages || []}
        runTracesByRunId={runTracesByRunId}
        transcriptRef={(node) => { transcriptNodeRef.current = node; }}
        onChatScroll={() => undefined}
        onLoadEarlierMessages={() => undefined}
        onOpenAiSettings={onOpenAiSettings}
        onInputChange={setInputValue}
        onComposerRuntimeSelectionChange={(_selection: ChatRuntimeSelection) => undefined}
        onSend={(value) => send(value)}
        onEditLastUserMessage={(_messageId, content) => send(content)}
        onApprove={async (approvalId) => {
          if (!activeRunId) return;
          try {
            await controlPlaneApi.decideRunApproval(activeRunId, approvalId, 'approved');
            await refreshConversation(activeSessionId as string);
          } catch (error) {
            reportError(error, 'The approval decision could not be saved.');
          }
        }}
        onReject={async (approvalId) => {
          if (!activeRunId) return;
          try {
            await controlPlaneApi.decideRunApproval(activeRunId, approvalId, 'rejected');
            await refreshConversation(activeSessionId as string);
          } catch (error) {
            reportError(error, 'The approval decision could not be saved.');
          }
        }}
        onSelectSession={setActiveSessionId}
        onCreateSession={() => { void createConversation(); }}
        onDismissRecentActivityWarning={() => undefined}
        onOpenRecentActivitySession={setActiveSessionId}
        onDeleteSession={async (sessionId) => {
          try {
            await deleteAgentConversation(sessionId);
            await refreshSummaries();
          } catch (error) {
            reportError(error, 'The conversation could not be deleted.');
          }
        }}
        onCancelRun={async () => {
          if (!activeRunId) return;
          setIsCancellingRun(true);
          try {
            await controlPlaneApi.cancelRun(activeRunId);
            if (activeSessionId) await refreshConversation(activeSessionId);
          } catch (error) {
            reportError(error, 'The run could not be cancelled.');
          } finally {
            setIsCancellingRun(false);
          }
        }}
        displayMode={displayMode}
        onClose={onClose}
        onMaximize={onMaximize}
        isInFlightAssistantPlaceholder={(message) => message.transientStatus === 'pending_assistant'}
      />
    </div>
  );
};
