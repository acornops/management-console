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
        canCreateSession
        desktopHistoryPanelId="desktop-history"
        historyControlLabel="Hide chats"
        historySearchPageId="history-search"
        isChatsActive={false}
        isInvestigationsActive={false}
        isSearchActive={false}
        mobileHistoryPanelId="mobile-history"
        onChatsClick={() => undefined}
        onInvestigationsClick={() => undefined}
        onNewChatClick={() => undefined}
        onSearchClick={() => undefined}
        newChatUnavailableReason=""
        unseenInvestigationCount={12}
      />
    );

    expect(markup).toContain('data-chat-history-trigger="investigations"');
    expect(markup).toContain('data-chat-history-trigger="new-chat"');
    expect(markup).toContain('aria-label="chat.newChat"');
    expect(markup).toContain('aria-label="Investigations, 12 new"');
    expect(markup).toContain('>9+<');
  });

  it('keeps new chat discoverable when the action is unavailable', () => {
    const markup = renderToStaticMarkup(
      <TargetChatHistoryRail
        canCreateSession={false}
        desktopHistoryPanelId="desktop-history"
        historyControlLabel="Hide chats"
        historySearchPageId="history-search"
        isChatsActive={false}
        isInvestigationsActive={false}
        isSearchActive={false}
        mobileHistoryPanelId="mobile-history"
        onChatsClick={() => undefined}
        onInvestigationsClick={() => undefined}
        onNewChatClick={() => undefined}
        onSearchClick={() => undefined}
        newChatUnavailableReason="Configure an AI provider and model before starting a new chat."
        unseenInvestigationCount={0}
      />
    );

    expect(markup).toContain('data-chat-history-trigger="new-chat"');
    expect(markup).toContain('disabled=""');
    expect(markup).toMatch(/data-chat-history-trigger="new-chat"[^>]+aria-label="chat\.newChat"/);
    expect(markup).toMatch(/aria-describedby="[^"]+"><button[^>]+data-chat-history-trigger="new-chat"/);
  });
});
