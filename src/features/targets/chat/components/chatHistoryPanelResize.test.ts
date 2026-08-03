import { describe, expect, it } from 'vitest';

import {
  CHAT_HISTORY_DEFAULT_WIDTH,
  clampChatHistoryOpenWidth
} from './chatHistoryPanelResize';

describe('chat history panel sizing', () => {
  it('uses the wider default when the viewport can support it', () => {
    expect(CHAT_HISTORY_DEFAULT_WIDTH).toBe(336);
    expect(clampChatHistoryOpenWidth(CHAT_HISTORY_DEFAULT_WIDTH, 1024)).toBe(336);
  });
});
