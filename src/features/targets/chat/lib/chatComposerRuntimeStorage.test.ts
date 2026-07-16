import { afterEach, describe, expect, it } from 'vitest';
import {
  chatComposerRuntimeStorageKey,
  clearChatComposerRuntimesForUser,
  readChatComposerRuntime,
  removeChatComposerRuntime,
  writeChatComposerRuntime
} from '@/features/targets/chat/lib/chatComposerRuntimeStorage';

const originalWindow = globalThis.window;

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); }
  };
}

afterEach(() => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: originalWindow,
    writable: true
  });
});

describe('chat composer runtime storage', () => {
  it('keeps unsent runtime choices isolated by user, target, and conversation', () => {
    const sessionStorage = memoryStorage();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { sessionStorage },
      writable: true
    });
    const chatA = { userId: 'user-1', workspaceId: 'workspace-1', targetId: 'target-1', sessionId: 'chat-a' };
    const chatB = { ...chatA, sessionId: 'chat-b' };
    const runtimeA = { provider: 'openai' as const, model: 'gpt-5.5', reasoningEffort: 'high' as const };
    const runtimeB = { provider: 'gemini' as const, model: 'gemini-2.0-flash', reasoningEffort: 'low' as const };

    writeChatComposerRuntime(chatA, runtimeA);
    writeChatComposerRuntime(chatB, runtimeB);

    expect(readChatComposerRuntime(chatA)).toEqual(runtimeA);
    expect(readChatComposerRuntime(chatB)).toEqual(runtimeB);
    removeChatComposerRuntime(chatA);
    expect(readChatComposerRuntime(chatA)).toBeUndefined();
    expect(readChatComposerRuntime(chatB)).toEqual(runtimeB);
  });

  it('ignores malformed values and clears only the logging-out user', () => {
    const sessionStorage = memoryStorage();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { sessionStorage },
      writable: true
    });
    const userOne = { userId: 'user-1', workspaceId: 'workspace-1', targetId: 'target-1' };
    const userTwo = { ...userOne, userId: 'user-2' };
    sessionStorage.setItem(chatComposerRuntimeStorageKey(userOne), '{bad json');
    writeChatComposerRuntime(userTwo, { provider: 'openai', model: 'gpt-5.5', reasoningEffort: 'medium' });

    expect(readChatComposerRuntime(userOne)).toBeUndefined();
    expect(sessionStorage.getItem(chatComposerRuntimeStorageKey(userOne))).toBeNull();
    clearChatComposerRuntimesForUser('user-1');
    expect(sessionStorage.getItem(chatComposerRuntimeStorageKey(userOne))).toBeNull();
    expect(readChatComposerRuntime(userTwo)).toEqual({ provider: 'openai', model: 'gpt-5.5', reasoningEffort: 'medium' });
  });
});
