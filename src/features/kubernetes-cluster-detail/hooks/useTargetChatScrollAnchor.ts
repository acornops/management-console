import { useCallback, useLayoutEffect, useRef } from 'react';

interface UseTargetChatScrollAnchorArgs {
  activeSessionId: string | null;
  chatAutoScrollSignature: string;
  isChatActive: boolean;
  isLoadingEarlierMessages: boolean;
}

export function useTargetChatScrollAnchor({
  activeSessionId,
  chatAutoScrollSignature,
  isChatActive,
  isLoadingEarlierMessages
}: UseTargetChatScrollAnchorArgs) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const lastChatScrollTopRef = useRef(0);
  const wasChatActiveRef = useRef(isChatActive);
  const openedChatSessionIdRef = useRef(isChatActive ? activeSessionId : null);

  const transcriptRef = useCallback((node: HTMLDivElement | null) => {
    scrollRef.current = node;
    if (!node || !isChatActive) return;

    shouldStickToBottomRef.current = true;
    node.scrollTop = node.scrollHeight;
    lastChatScrollTopRef.current = node.scrollTop;
    window.requestAnimationFrame(() => {
      if (scrollRef.current !== node || !shouldStickToBottomRef.current) return;
      node.scrollTop = node.scrollHeight;
      lastChatScrollTopRef.current = node.scrollTop;
    });
  }, [isChatActive]);

  useLayoutEffect(() => {
    const wasChatActive = wasChatActiveRef.current;
    wasChatActiveRef.current = isChatActive;
    const didChangeOpenSession = isChatActive && activeSessionId !== openedChatSessionIdRef.current;
    openedChatSessionIdRef.current = isChatActive ? activeSessionId : null;
    if ((isChatActive && !wasChatActive) || didChangeOpenSession) {
      shouldStickToBottomRef.current = true;
      lastChatScrollTopRef.current = 0;
    }
    if (!scrollRef.current || !isChatActive || isLoadingEarlierMessages || !shouldStickToBottomRef.current) {
      return;
    }

    const node = scrollRef.current;
    node.scrollTop = node.scrollHeight;
    lastChatScrollTopRef.current = node.scrollTop;
    const frame = window.requestAnimationFrame(() => {
      if (scrollRef.current !== node || !shouldStickToBottomRef.current) return;
      node.scrollTop = node.scrollHeight;
      lastChatScrollTopRef.current = node.scrollTop;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeSessionId, chatAutoScrollSignature, isChatActive, isLoadingEarlierMessages]);

  return {
    lastChatScrollTopRef,
    scrollRef,
    shouldStickToBottomRef,
    transcriptRef
  };
}
