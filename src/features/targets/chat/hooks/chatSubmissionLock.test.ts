import { describe, expect, it, vi } from 'vitest';
import {
  releaseChatSubmissionLock,
  runWithChatSubmissionLock,
  type ChatSubmissionLock
} from '@/features/targets/chat/hooks/chatSubmissionLock';

function deferredPromise(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  let resolve = () => undefined;
  const promise = new Promise<void>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

describe('chat submission lock', () => {
  it('blocks a second submission until the first one settles', async () => {
    const lock: ChatSubmissionLock = { current: null };
    const pending = deferredPromise();
    const submit = vi.fn(() => pending.promise);

    const firstSubmission = runWithChatSubmissionLock(lock, submit);
    const secondSubmission = runWithChatSubmissionLock(lock, submit);

    await expect(secondSubmission).resolves.toBeUndefined();
    expect(submit).toHaveBeenCalledTimes(1);

    pending.resolve();
    await firstSubmission;
    await runWithChatSubmissionLock(lock, submit);
    expect(submit).toHaveBeenCalledTimes(2);
  });

  it('does not let a cancelled submission release a newer submission lock', async () => {
    const lock: ChatSubmissionLock = { current: null };
    const cancelled = deferredPromise();
    const replacement = deferredPromise();

    const cancelledSubmission = runWithChatSubmissionLock(lock, () => cancelled.promise);
    releaseChatSubmissionLock(lock);
    const replacementSubmission = runWithChatSubmissionLock(lock, () => replacement.promise);

    cancelled.resolve();
    await cancelledSubmission;
    expect(lock.current).not.toBeNull();

    replacement.resolve();
    await replacementSubmission;
    expect(lock.current).toBeNull();
  });
});
