import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { TargetChatHistoryRail } from '@/features/targets/chat/components/TargetChatHistoryRail';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: { count?: number }) =>
      key === 'chat.investigationsWithNew'
        ? `Investigations, ${params?.count} new`
        : key
  })
}));

describe('TargetChatHistoryRail', () => {
  it('exposes the investigation count accessibly and caps only its visual label', () => {
    const markup = renderToStaticMarkup(
      <TargetChatHistoryRail
        desktopHistoryPanelId="desktop-history"
        historyControlLabel="Hide chats"
        historySearchPageId="history-search"
        isChatsActive={false}
        isInvestigationsActive={false}
        isSearchActive={false}
        mobileHistoryPanelId="mobile-history"
        onChatsClick={() => undefined}
        onInvestigationsClick={() => undefined}
        onSearchClick={() => undefined}
        unseenInvestigationCount={12}
      />
    );

    expect(markup).toContain('data-chat-history-trigger="investigations"');
    expect(markup).toContain('aria-label="Investigations, 12 new"');
    expect(markup).toContain('>9+<');
  });
});
