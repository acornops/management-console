export interface ChatSubmissionLock {
  current: symbol | null;
}

export function isChatSubmissionLocked(lock: ChatSubmissionLock): boolean {
  return lock.current !== null;
}

export function releaseChatSubmissionLock(lock: ChatSubmissionLock): void {
  lock.current = null;
}

export async function runWithChatSubmissionLock<T>(
  lock: ChatSubmissionLock,
  submit: () => Promise<T>
): Promise<T | undefined> {
  if (lock.current !== null) return undefined;

  const token = Symbol('chat-submission');
  lock.current = token;
  try {
    return await submit();
  } finally {
    if (lock.current === token) {
      lock.current = null;
    }
  }
}
