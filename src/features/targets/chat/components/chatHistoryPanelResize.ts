export const CHAT_HISTORY_DEFAULT_WIDTH = 320;
export const CHAT_HISTORY_MIN_OPEN_WIDTH = 280;
export const CHAT_HISTORY_MAX_WIDTH = 520;
export const CHAT_HISTORY_MAX_VIEWPORT_RATIO = 0.42;
export const CHAT_HISTORY_KEYBOARD_STEP = 16;
export const CHAT_HISTORY_KEYBOARD_LARGE_STEP = 48;

export function getChatHistoryMaxWidth(viewportWidth: number): number {
  return Math.max(
    CHAT_HISTORY_MIN_OPEN_WIDTH,
    Math.min(CHAT_HISTORY_MAX_WIDTH, Math.floor(viewportWidth * CHAT_HISTORY_MAX_VIEWPORT_RATIO))
  );
}

export function clampChatHistoryOpenWidth(width: number, viewportWidth: number): number {
  return Math.min(
    Math.max(width, CHAT_HISTORY_MIN_OPEN_WIDTH),
    getChatHistoryMaxWidth(viewportWidth)
  );
}

export function resolveDraggedChatHistoryWidth(args: {
  clientX: number;
  panelLeft: number;
  viewportWidth: number;
}): number | null {
  const requestedWidth = args.clientX - args.panelLeft;
  if (requestedWidth < CHAT_HISTORY_MIN_OPEN_WIDTH) return null;
  return clampChatHistoryOpenWidth(requestedWidth, args.viewportWidth);
}

export function resolveChatHistoryKeyboardResize(args: {
  key: string;
  width: number;
  viewportWidth: number;
  largeStep?: boolean;
}): { collapsed: boolean; width: number } | null {
  const { key, width, viewportWidth, largeStep = false } = args;
  if (key === 'Home') return { collapsed: true, width };
  if (key === 'End') return { collapsed: false, width: getChatHistoryMaxWidth(viewportWidth) };
  if (key !== 'ArrowLeft' && key !== 'ArrowRight') return null;
  if (key === 'ArrowLeft' && width <= CHAT_HISTORY_MIN_OPEN_WIDTH) {
    return { collapsed: true, width };
  }

  const direction = key === 'ArrowLeft' ? -1 : 1;
  const step = largeStep ? CHAT_HISTORY_KEYBOARD_LARGE_STEP : CHAT_HISTORY_KEYBOARD_STEP;
  return {
    collapsed: false,
    width: clampChatHistoryOpenWidth(width + direction * step, viewportWidth)
  };
}
