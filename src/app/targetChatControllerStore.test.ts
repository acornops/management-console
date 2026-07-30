import { describe, expect, it, vi } from 'vitest';
import type { TargetChatController } from '@/features/targets/chat/hooks/useTargetChat';
import { createTargetChatControllerStore } from '@/app/targetChatControllerStore';

describe('target chat controller store', () => {
  it('publishes controller changes without notifying for the same snapshot', () => {
    const store = createTargetChatControllerStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const controller = { activeSessionId: 'session-1' } as TargetChatController;

    expect(store.getSnapshot()).toBeNull();
    store.set(controller);
    store.set(controller);

    expect(store.getSnapshot()).toBe(controller);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.set(null);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
