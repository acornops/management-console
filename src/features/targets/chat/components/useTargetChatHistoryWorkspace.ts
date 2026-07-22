import React from 'react';
import {
  CHAT_HISTORY_DEFAULT_WIDTH,
  CHAT_HISTORY_MAX_WIDTH,
  clampChatHistoryOpenWidth,
  getChatHistoryMaxWidth,
  resolveChatHistoryKeyboardResize,
  resolveDraggedChatHistoryWidth
} from '@/features/targets/chat/components/chatHistoryPanelResize';

interface UseTargetChatHistoryWorkspaceArgs {
  desktopHistoryPanelId: string;
  historyButtonRef: React.RefObject<HTMLButtonElement | null>;
  isHistoryOpen: boolean;
  setIsHistoryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectSession: (sessionId: string) => void;
  handleCreateSessionClick: () => void;
}

export function useTargetChatHistoryWorkspace({
  desktopHistoryPanelId,
  historyButtonRef,
  isHistoryOpen,
  setIsHistoryOpen,
  selectSession,
  handleCreateSessionClick
}: UseTargetChatHistoryWorkspaceArgs) {
  const [isHistorySearchPageOpen, setIsHistorySearchPageOpen] = React.useState(false);
  const [historySearchValue, setHistorySearchValue] = React.useState('');
  const [historyPanelWidth, setHistoryPanelWidth] = React.useState(CHAT_HISTORY_DEFAULT_WIDTH);
  const [historyPanelMaxWidth, setHistoryPanelMaxWidth] = React.useState(CHAT_HISTORY_MAX_WIDTH);
  const historyPanelWidthRef = React.useRef(CHAT_HISTORY_DEFAULT_WIDTH);
  const lastOpenHistoryPanelWidthRef = React.useRef(CHAT_HISTORY_DEFAULT_WIDTH);
  const pendingHistoryPanelWidthRef = React.useRef(CHAT_HISTORY_DEFAULT_WIDTH);
  const historyResizeFrameRef = React.useRef<number | null>(null);
  const historyResizePointerRef = React.useRef<{ pointerId: number; panelLeft: number } | null>(null);
  const historySearchPageId = `${desktopHistoryPanelId}-search`;

  const focusHistorySearch = React.useCallback(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById(historySearchPageId)
          ?.querySelector<HTMLInputElement>('[data-chat-history-search="true"]')
          ?.focus({ preventScroll: true });
      });
    });
  }, [historySearchPageId]);

  const openHistorySearch = () => {
    setIsHistoryOpen(false);
    setIsHistorySearchPageOpen(true);
    focusHistorySearch();
  };

  const toggleHistoryChats = (event: React.MouseEvent<HTMLButtonElement>) => {
    historyButtonRef.current = event.currentTarget;
    setIsHistorySearchPageOpen(false);
    setHistorySearchValue('');
    if (!isHistoryOpen) {
      const restoredWidth = clampChatHistoryOpenWidth(lastOpenHistoryPanelWidthRef.current, window.innerWidth);
      historyPanelWidthRef.current = restoredWidth;
      pendingHistoryPanelWidthRef.current = restoredWidth;
      setHistoryPanelWidth(restoredWidth);
    }
    setIsHistoryOpen(!isHistoryOpen);
  };

  const selectSessionFromSearch = (sessionId: string) => {
    setIsHistorySearchPageOpen(false);
    selectSession(sessionId);
  };

  const createSessionFromSearch = () => {
    setIsHistorySearchPageOpen(false);
    handleCreateSessionClick();
  };

  React.useEffect(() => {
    if (isHistorySearchPageOpen) focusHistorySearch();
  }, [focusHistorySearch, isHistorySearchPageOpen]);

  React.useEffect(() => {
    const clampWidthToViewport = () => {
      const maxWidth = getChatHistoryMaxWidth(window.innerWidth);
      const nextWidth = clampChatHistoryOpenWidth(lastOpenHistoryPanelWidthRef.current, window.innerWidth);
      setHistoryPanelMaxWidth(maxWidth);
      lastOpenHistoryPanelWidthRef.current = nextWidth;
      if (historyResizePointerRef.current) return;
      historyPanelWidthRef.current = nextWidth;
      pendingHistoryPanelWidthRef.current = nextWidth;
      setHistoryPanelWidth(nextWidth);
    };

    clampWidthToViewport();
    window.addEventListener('resize', clampWidthToViewport);
    return () => window.removeEventListener('resize', clampWidthToViewport);
  }, []);

  React.useEffect(() => () => {
    if (historyResizeFrameRef.current !== null) {
      window.cancelAnimationFrame(historyResizeFrameRef.current);
    }
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const commitPendingHistoryPanelWidth = React.useCallback(() => {
    historyResizeFrameRef.current = null;
    const nextWidth = pendingHistoryPanelWidthRef.current;
    historyPanelWidthRef.current = nextWidth;
    setHistoryPanelWidth(nextWidth);
  }, []);

  const scheduleHistoryPanelWidth = React.useCallback((nextWidth: number) => {
    pendingHistoryPanelWidthRef.current = nextWidth;
    if (historyResizeFrameRef.current !== null) return;
    historyResizeFrameRef.current = window.requestAnimationFrame(commitPendingHistoryPanelWidth);
  }, [commitPendingHistoryPanelWidth]);

  const collapseHistoryPanel = React.useCallback(() => {
    setIsHistoryOpen(false);
    window.requestAnimationFrame(() => historyButtonRef.current?.focus({ preventScroll: true }));
  }, [historyButtonRef, setIsHistoryOpen]);

  const stopHistoryResize = React.useCallback((target: HTMLDivElement, pointerId: number) => {
    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }
    historyResizePointerRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (historyResizeFrameRef.current !== null) {
      window.cancelAnimationFrame(historyResizeFrameRef.current);
      historyResizeFrameRef.current = null;
    }
  }, []);

  const startHistoryResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const panel = event.currentTarget.parentElement;
    if (!panel) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    historyResizePointerRef.current = {
      pointerId: event.pointerId,
      panelLeft: panel.getBoundingClientRect().left
    };
    pendingHistoryPanelWidthRef.current = historyPanelWidthRef.current;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const moveHistoryResize = (event: React.PointerEvent<HTMLDivElement>) => {
    const resize = historyResizePointerRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    const nextWidth = resolveDraggedChatHistoryWidth({
      clientX: event.clientX,
      panelLeft: resize.panelLeft,
      viewportWidth: window.innerWidth
    });
    if (nextWidth === null) {
      stopHistoryResize(event.currentTarget, event.pointerId);
      collapseHistoryPanel();
      return;
    }
    scheduleHistoryPanelWidth(nextWidth);
  };

  const finishHistoryResize = (event: React.PointerEvent<HTMLDivElement>, cancelled = false) => {
    const resize = historyResizePointerRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    stopHistoryResize(event.currentTarget, event.pointerId);

    if (cancelled) {
      const restoredWidth = lastOpenHistoryPanelWidthRef.current;
      historyPanelWidthRef.current = restoredWidth;
      pendingHistoryPanelWidthRef.current = restoredWidth;
      setHistoryPanelWidth(restoredWidth);
      return;
    }

    const resolvedWidth = clampChatHistoryOpenWidth(pendingHistoryPanelWidthRef.current, window.innerWidth);
    lastOpenHistoryPanelWidthRef.current = resolvedWidth;
    historyPanelWidthRef.current = resolvedWidth;
    pendingHistoryPanelWidthRef.current = resolvedWidth;
    setHistoryPanelWidth(resolvedWidth);
  };

  const handleHistoryResizeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const resolved = resolveChatHistoryKeyboardResize({
      key: event.key,
      width: historyPanelWidthRef.current,
      viewportWidth: window.innerWidth,
      largeStep: event.shiftKey
    });
    if (!resolved) return;
    event.preventDefault();
    if (resolved.collapsed) {
      collapseHistoryPanel();
      return;
    }
    lastOpenHistoryPanelWidthRef.current = resolved.width;
    historyPanelWidthRef.current = resolved.width;
    pendingHistoryPanelWidthRef.current = resolved.width;
    setHistoryPanelWidth(resolved.width);
  };

  const resetHistoryPanelWidth = () => {
    const resetWidth = clampChatHistoryOpenWidth(CHAT_HISTORY_DEFAULT_WIDTH, window.innerWidth);
    lastOpenHistoryPanelWidthRef.current = resetWidth;
    historyPanelWidthRef.current = resetWidth;
    pendingHistoryPanelWidthRef.current = resetWidth;
    setHistoryPanelWidth(resetWidth);
  };

  return {
    createSessionFromSearch,
    finishHistoryResize,
    handleHistoryResizeKeyDown,
    historyPanelMaxWidth,
    historyPanelWidth,
    historySearchPageId,
    historySearchValue,
    isChatsRailActive: isHistoryOpen,
    isHistorySearchPageOpen,
    isSearchRailActive: isHistorySearchPageOpen,
    moveHistoryResize,
    openHistorySearch,
    resetHistoryPanelWidth,
    selectSessionFromSearch,
    setHistorySearchValue,
    startHistoryResize,
    toggleHistoryChats
  };
}
