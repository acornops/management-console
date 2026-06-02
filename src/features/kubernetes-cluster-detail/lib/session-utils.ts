import { ChatMessage, ChatSession } from '@/types';
import { ControlPlaneSessionMessage } from '@/services/controlPlaneApi';
import { createLocalMessageId, toTimestamp } from '@/features/kubernetes-cluster-detail/lib/helpers';

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

export function isBlankAssistantMessage(message: ChatMessage): boolean {
  return message.role === 'assistant' && String(message.content || '').trim().length === 0 && !message.approval;
}

/**
 * Removes empty assistant placeholders that are no longer active.
 */
export function sanitizeChatMessages(chatMessages: ChatMessage[]): ChatMessage[] {
  return chatMessages.filter((message) => !isBlankAssistantMessage(message));
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

  return providerMessage;
}
