import { ChatMessage, ChatSession } from '@/types';
import { ControlPlaneSessionMessage } from '@/services/controlPlaneApi';
import { createLocalMessageId, toTimestamp } from '@/features/targets/chat/lib/helpers';

const MAX_CONVERSATION_TITLE_LENGTH = 64;

/**
 * Converts control-plane message records into management console chat messages.
 */
export function mapControlPlaneMessage(message: ControlPlaneSessionMessage): ChatMessage {
  const role: ChatMessage['role'] = message.role === 'assistant' ? 'assistant' : 'user';

  return {
    id: message.id,
    role,
    content: message.content,
    runId: message.runId,
    clientMessageId: message.clientMessageId,
    timestamp: toTimestamp(message.createdAt)
  };
}

/**
 * Inserts or replaces one session in a session array.
 */
export function upsertSession(sessions: ChatSession[], session: ChatSession): ChatSession[] {
  const index = sessions.findIndex((existing) => existing.id === session.id);
  if (index === -1) {
    return [...sessions, session];
  }

  const next = [...sessions];
  next[index] = session;
  return next;
}

/**
 * Builds the stable user-facing title persisted with a chat session.
 */
export function buildConversationTitleFromPrompt(prompt: string, fallbackTitle: string): string {
  const compact = prompt.replace(/\s+/g, ' ').trim();
  if (!compact) return fallbackTitle;
  if (compact.length <= MAX_CONVERSATION_TITLE_LENGTH) return compact;

  const truncated = compact.slice(0, MAX_CONVERSATION_TITLE_LENGTH).trimEnd();
  return `${truncated}...`;
}

/**
 * Creates a user-facing assistant failure message for run errors.
 */
export function buildChatFailureMessage(message: string, runId?: string): ChatMessage {
  return {
    id: createLocalMessageId(),
    role: 'assistant',
    content: `I could not complete the troubleshooting run.\n\n${message}`,
    runId,
    timestamp: Date.now()
  };
}

export function buildChatSetupFailureMessage(message: string, runId?: string): ChatMessage {
  return {
    id: createLocalMessageId(),
    role: 'assistant',
    content: message,
    runId,
    timestamp: Date.now()
  };
}

export function ensureFailedRunAssistantMessage(
  chatMessages: ChatMessage[],
  run: { id: string; status: string; endedAt?: string; errorCode?: string; errorMessage?: string }
): ChatMessage[] {
  if (run.status !== 'failed') return chatMessages;
  const existingAssistantMessage = chatMessages.find(
    (message) => message.role === 'assistant' && message.runId === run.id && (!isBlankAssistantMessage(message) || message.approval)
  );
  if (existingAssistantMessage) return chatMessages;

  const failureMessage = buildChatFailureMessage(formatRunFailureMessage(run.errorCode, run.errorMessage), run.id);
  const endedAtTimestamp = Date.parse(run.endedAt || '');
  const triggeringUserTimestamp = [...chatMessages]
    .reverse()
    .find((message) => message.role === 'user' && message.runId === run.id)
    ?.timestamp;
  return [
    ...chatMessages.filter(
      (message) => !(message.role === 'assistant' && message.runId === run.id && isBlankAssistantMessage(message))
    ),
    {
      ...failureMessage,
      id: `failed-${run.id}`,
      timestamp: Number.isFinite(endedAtTimestamp) ? endedAtTimestamp : triggeringUserTimestamp ?? failureMessage.timestamp
    }
  ];
}

export function isBlankAssistantMessage(message: ChatMessage): boolean {
  return message.role === 'assistant' && String(message.content || '').trim().length === 0 && !message.approval;
}

export function isPendingAssistantPlaceholder(message: ChatMessage): boolean {
  return message.role === 'assistant' && message.transientStatus === 'pending_assistant' && isBlankAssistantMessage(message);
}

export function resolveAssistantTransientStatus(
  content: string,
  approval?: ChatMessage['approval']
): ChatMessage['transientStatus'] {
  return String(content || '').trim().length > 0 || approval ? undefined : 'pending_assistant';
}

function mergeAssistantRunMessages(left: ChatMessage, right: ChatMessage): ChatMessage {
  const messages = [left, right];
  const contentMessage = [...messages].reverse().find((message) => String(message.content || '').trim().length > 0);
  const approvalMessage = [...messages].reverse().find((message) => message.approval);
  const streamMessage = messages.find((message) => message.id === `stream-${message.runId}`);
  const pendingMessage = messages.find(isPendingAssistantPlaceholder);
  const newestMessage = messages.reduce((newest, message) => message.timestamp > newest.timestamp ? message : newest);
  const baseMessage = contentMessage || approvalMessage || pendingMessage || newestMessage;
  const hasDurableBody = Boolean(contentMessage || approvalMessage);

  return {
    ...baseMessage,
    id: streamMessage?.id || baseMessage.id,
    content: contentMessage?.content || baseMessage.content || '',
    approval: approvalMessage?.approval || baseMessage.approval,
    transientStatus: hasDurableBody ? undefined : pendingMessage?.transientStatus,
    timestamp: Math.max(left.timestamp, right.timestamp)
  };
}

export function dedupeAssistantMessagesByRun(chatMessages: ChatMessage[]): ChatMessage[] {
  const assistantByRunId = new Map<string, ChatMessage>();
  const duplicateRunIds = new Set<string>();

  for (const message of chatMessages) {
    if (message.role !== 'assistant' || !message.runId) continue;
    const existing = assistantByRunId.get(message.runId);
    if (!existing) {
      assistantByRunId.set(message.runId, message);
      continue;
    }
    duplicateRunIds.add(message.runId);
    assistantByRunId.set(message.runId, mergeAssistantRunMessages(existing, message));
  }

  if (duplicateRunIds.size === 0) {
    return chatMessages;
  }

  const placedRunIds = new Set<string>();
  const dedupedMessages: ChatMessage[] = [];
  for (const message of chatMessages) {
    if (message.role !== 'assistant' || !message.runId || !duplicateRunIds.has(message.runId)) {
      dedupedMessages.push(message);
      continue;
    }
    if (placedRunIds.has(message.runId)) {
      continue;
    }
    placedRunIds.add(message.runId);
    dedupedMessages.push(assistantByRunId.get(message.runId) || message);
  }

  return dedupedMessages;
}

export function filterMessagesByRunIds(chatMessages: ChatMessage[], runIds?: ReadonlySet<string>): ChatMessage[] {
  if (!runIds || runIds.size === 0) return chatMessages;
  return chatMessages.filter((message) => !message.runId || !runIds.has(message.runId));
}

function isPendingTraceAssistant(message: ChatMessage): boolean {
  return isPendingAssistantPlaceholder(message) && String(message.runId || '').startsWith('pending-trace-');
}

function dropSupersededPendingTraceAssistants(chatMessages: ChatMessage[]): ChatMessage[] {
  return chatMessages.filter((message, index) => {
    if (!isPendingTraceAssistant(message)) {
      return true;
    }

    let turnStart = index;
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      if (chatMessages[cursor].role === 'user') {
        turnStart = cursor;
        break;
      }
    }

    let turnEnd = chatMessages.length;
    for (let cursor = index + 1; cursor < chatMessages.length; cursor += 1) {
      if (chatMessages[cursor].role === 'user') {
        turnEnd = cursor;
        break;
      }
    }

    return !chatMessages
      .slice(turnStart, turnEnd)
      .some((turnMessage) =>
        turnMessage !== message &&
        turnMessage.role === 'assistant' &&
        turnMessage.runId &&
        !String(turnMessage.runId).startsWith('pending-trace-')
      );
  });
}

export function preserveStreamingAssistantMessageId(
  messages: ChatMessage[],
  runId: string,
  streamingMessageId: string
): ChatMessage[] {
  return messages.map((message) =>
    message.role === 'assistant' && message.runId === runId
      ? { ...message, id: streamingMessageId }
      : message
  );
}

/**
 * Removes empty assistant placeholders that are no longer active.
 */
export function sanitizeChatMessages(chatMessages: ChatMessage[]): ChatMessage[] {
  return dedupeAssistantMessagesByRun(
    dropSupersededPendingTraceAssistants(
      chatMessages.filter((message) => !isBlankAssistantMessage(message) || isPendingAssistantPlaceholder(message))
    )
  );
}

/**
 * Normalizes provider/runtime failures into concise user guidance.
 */
export function formatRunFailureMessage(errorCode?: string, errorMessage?: string): string {
  const rawMessage = String(errorMessage || '').trim();
  if (!rawMessage) {
    return 'No additional details were provided.';
  }

  const compactMessage = rawMessage.replace(/\s+/g, ' ');
  const providerMessageMatch =
    compactMessage.match(/["']message["']\s*:\s*"([^"]+)"/i) ||
    compactMessage.match(/["']message["']\s*:\s*'([^']+)'/i);
  const providerMessage = providerMessageMatch?.[1]?.trim() || rawMessage;
  const normalized = providerMessage.toLowerCase();
  const isRateLimit =
    normalized.includes('rate limit') ||
    normalized.includes('quota exceeded') ||
    normalized.includes('too many requests') ||
    normalized.includes(' 429 ') ||
    normalized.startsWith('429');

  if (isRateLimit) {
    const retryMatch =
      providerMessage.match(/retry in ([0-9.]+)s/i) ||
      providerMessage.match(/retry_delay[^0-9]*([0-9]+)/i);
    const retryHint = retryMatch ? ` Retry after about ${Math.ceil(Number(retryMatch[1] || 0))} seconds.` : '';
    const providerHint = errorCode ? ` (${errorCode})` : '';
    return `LLM provider rate limit reached${providerHint}.${retryHint} You can retry shortly or switch to another model/provider.`;
  }

  const isTemperatureUnsupported =
    normalized.includes('temperature') && normalized.includes('only the default (1) value is supported');
  if (isTemperatureUnsupported) {
    return 'Selected model only supports default temperature. AcornOps will use model defaults for this provider/model; retry your request.';
  }

  const isTokenParamUnsupported =
    normalized.includes('max_tokens') &&
    normalized.includes('max_completion_tokens') &&
    (normalized.includes('unsupported parameter') || normalized.includes('not supported with this model'));
  if (isTokenParamUnsupported) {
    return 'Selected model requires a different output-token parameter. AcornOps will auto-adjust this; retry your request.';
  }

  const providerName =
    errorCode === 'OPENAI_ERROR'
      ? 'OpenAI'
      : errorCode === 'ANTHROPIC_ERROR'
        ? 'Anthropic'
        : errorCode === 'GEMINI_ERROR'
          ? 'Gemini'
          : 'The AI provider';
  if (normalized === 'provider request failed') {
    return `${providerName} rejected or could not complete the request. Check or rotate the workspace API key in AI Settings, then retry. If the key is valid, the provider may be temporarily unavailable.`;
  }
  if (normalized === 'provider temporarily unavailable') {
    return `${providerName} is temporarily unavailable. Retry shortly; if this repeats, check the workspace API key in AI Settings.`;
  }

  return providerMessage;
}
