import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  CHAT_HISTORY_MIN_OPEN_WIDTH,
  clampChatHistoryOpenWidth,
  getChatHistoryMaxWidth,
  resolveDraggedChatHistoryWidth,
  resolveChatHistoryKeyboardResize
} from '@/features/targets/chat/components/chatHistoryPanelResize';

describe('chat history panel resize', () => {
  it('keeps an open panel within the desktop width contract', () => {
    expect(clampChatHistoryOpenWidth(100, 1440)).toBe(CHAT_HISTORY_MIN_OPEN_WIDTH);
    expect(clampChatHistoryOpenWidth(460, 1440)).toBe(460);
    expect(clampChatHistoryOpenWidth(800, 1440)).toBe(520);
    expect(getChatHistoryMaxWidth(1024)).toBe(430);
  });

  it('collapses as soon as pointer dragging crosses below the minimum open width', () => {
    expect(resolveDraggedChatHistoryWidth({
      clientX: 279,
      panelLeft: 0,
      viewportWidth: 1440
    })).toBeNull();
    expect(resolveDraggedChatHistoryWidth({
      clientX: 120,
      panelLeft: 0,
      viewportWidth: 1440
    })).toBeNull();
    expect(resolveDraggedChatHistoryWidth({
      clientX: 280,
      panelLeft: 0,
      viewportWidth: 1440
    })).toBe(CHAT_HISTORY_MIN_OPEN_WIDTH);
    expect(resolveDraggedChatHistoryWidth({
      clientX: 304,
      panelLeft: 0,
      viewportWidth: 1440
    })).toBe(304);
  });

  it('supports keyboard resizing, collapse, and maximum width', () => {
    expect(resolveChatHistoryKeyboardResize({ key: 'ArrowRight', width: 320, viewportWidth: 1440 }))
      .toEqual({ collapsed: false, width: 336 });
    expect(resolveChatHistoryKeyboardResize({ key: 'ArrowLeft', width: 280, viewportWidth: 1440 }))
      .toEqual({ collapsed: true, width: 280 });
    expect(resolveChatHistoryKeyboardResize({ key: 'End', width: 320, viewportWidth: 1440 }))
      .toEqual({ collapsed: false, width: 520 });
    expect(resolveChatHistoryKeyboardResize({ key: 'Escape', width: 320, viewportWidth: 1440 }))
      .toBeNull();
  });

  it('wires a focusable desktop separator with immediate drag collapse', () => {
    const source = [
      readFileSync(resolve(__dirname, 'TargetChatViewBody.tsx'), 'utf8'),
      readFileSync(resolve(__dirname, 'useTargetChatHistoryWorkspace.ts'), 'utf8')
    ].join('\n');

    expect(source).toContain('data-chat-history-resize-handle="true"');
    expect(source).toContain('role="separator"');
    expect(source).toContain('aria-orientation="vertical"');
    expect(source).toContain('onPointerDown={startHistoryResize}');
    expect(source).toContain('resolveDraggedChatHistoryWidth({');
    expect(source).toContain('if (nextWidth === null) {');
    expect(source).toContain('stopHistoryResize(event.currentTarget, event.pointerId);');
    expect(source).toContain('collapseHistoryPanel();');
    expect(source).toContain('onKeyDown={handleHistoryResizeKeyDown}');
    expect(source).toContain('<aside\n          id={desktopHistoryPanelId}');
    expect(source).not.toContain('animate={{ x: 0, opacity: 1 }}\n            exit={{ x: -12, opacity: 0 }}');
  });

  it('keeps the mobile history overlay transition unchanged', () => {
    const source = readFileSync(
      resolve(__dirname, 'TargetChatViewBody.tsx'),
      'utf8'
    );

    expect(source).toContain("className=\"absolute left-12 top-0 flex h-full w-[min(21rem,calc(100vw-5rem))]");
  });
});
