import React from 'react';
import type { TargetChatController } from '@/features/targets/chat/hooks/useTargetChat';

export interface TargetChatControllerStore {
  getSnapshot: () => TargetChatController | null;
  set: (controller: TargetChatController | null) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createTargetChatControllerStore(): TargetChatControllerStore {
  let controller: TargetChatController | null = null;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => controller,
    set: (nextController) => {
      if (controller === nextController) return;
      controller = nextController;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

export const TargetChatControllerSubscriber: React.FC<{
  children: (controller: TargetChatController | null) => React.ReactNode;
  store: TargetChatControllerStore;
}> = ({ children, store }) => {
  const controller = React.useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
  return <>{children(controller)}</>;
};
