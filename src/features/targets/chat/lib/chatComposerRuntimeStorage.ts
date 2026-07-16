import type { ChatRuntimeSelection, LlmProvider, ReasoningEffort } from '@/types';

const CHAT_COMPOSER_RUNTIME_STORAGE_PREFIX = 'acornops_chat_composer_runtime:v1';
const PROVIDERS: LlmProvider[] = ['openai', 'anthropic', 'gemini'];
const REASONING_EFFORTS: ReasoningEffort[] = ['off', 'low', 'medium', 'high'];

interface ChatComposerRuntimeStorageScope {
  userId: string;
  workspaceId: string;
  targetId: string;
  sessionId?: string;
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function encoded(value: string): string {
  return encodeURIComponent(value);
}

function userPrefix(userId: string): string {
  return `${CHAT_COMPOSER_RUNTIME_STORAGE_PREFIX}:${encoded(userId)}:`;
}

export function chatComposerRuntimeStorageKey(scope: ChatComposerRuntimeStorageScope): string {
  return [
    CHAT_COMPOSER_RUNTIME_STORAGE_PREFIX,
    encoded(scope.userId),
    encoded(scope.workspaceId),
    encoded(scope.targetId),
    encoded(scope.sessionId || 'new')
  ].join(':');
}

export function isChatRuntimeSelection(value: unknown): value is ChatRuntimeSelection {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ChatRuntimeSelection>;
  return PROVIDERS.includes(candidate.provider as LlmProvider)
    && typeof candidate.model === 'string'
    && candidate.model.trim().length > 0
    && REASONING_EFFORTS.includes(candidate.reasoningEffort as ReasoningEffort);
}

export function readChatComposerRuntime(scope: ChatComposerRuntimeStorageScope): ChatRuntimeSelection | undefined {
  const target = storage();
  if (!target) return undefined;
  const key = chatComposerRuntimeStorageKey(scope);
  try {
    const value = target.getItem(key);
    if (!value) return undefined;
    const parsed = JSON.parse(value) as unknown;
    if (isChatRuntimeSelection(parsed)) return parsed;
  } catch {
    // Malformed values are discarded below.
  }
  try {
    target.removeItem(key);
  } catch {
    // Browser privacy modes may also block removal.
  }
  return undefined;
}

export function writeChatComposerRuntime(
  scope: ChatComposerRuntimeStorageScope,
  selection: ChatRuntimeSelection
): void {
  const target = storage();
  if (!target || !isChatRuntimeSelection(selection)) return;
  try {
    target.setItem(chatComposerRuntimeStorageKey(scope), JSON.stringify(selection));
  } catch {
    // Browser privacy modes and storage limits must not break the composer.
  }
}

export function removeChatComposerRuntime(scope: ChatComposerRuntimeStorageScope): void {
  const target = storage();
  if (!target) return;
  try {
    target.removeItem(chatComposerRuntimeStorageKey(scope));
  } catch {
    // Keep in-memory state when browser storage is unavailable.
  }
}

export function clearChatComposerRuntimesForUser(userId: string): void {
  const target = storage();
  if (!target) return;
  const prefix = userPrefix(userId);
  try {
    for (let index = target.length - 1; index >= 0; index -= 1) {
      const key = target.key(index);
      if (key?.startsWith(prefix)) target.removeItem(key);
    }
  } catch {
    // User-scoped keys prevent another account from reading stale entries.
  }
}
