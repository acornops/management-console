import { MessageSquarePlus, MessagesSquare, Search } from 'lucide-react';
import type { MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Tooltip } from '@acornops/ui';
import { TargetChatHistoryRail } from '@/features/targets/chat/components/TargetChatHistoryRail';

interface TargetChatNavigationRailProps {
  automaticInvestigationsEnabled: boolean;
  canCreateSession: boolean;
  desktopHistoryPanelId: string;
  historyControlLabel: string;
  historySearchPageId: string;
  isChatsActive: boolean;
  isHistoryOpen: boolean;
  isInvestigationsActive: boolean;
  isSearchActive: boolean;
  mobileHistoryPanelId: string;
  onChatsClick: MouseEventHandler<HTMLButtonElement>;
  onInvestigationsClick: MouseEventHandler<HTMLButtonElement>;
  onNewChatClick: () => void;
  onSearchClick: () => void;
  newChatUnavailableReason: string;
  unseenInvestigationCount: number;
}

export function TargetChatNavigationRail({
  automaticInvestigationsEnabled,
  canCreateSession,
  desktopHistoryPanelId,
  historyControlLabel,
  historySearchPageId,
  isChatsActive,
  isHistoryOpen,
  isInvestigationsActive,
  isSearchActive,
  mobileHistoryPanelId,
  onChatsClick,
  onInvestigationsClick,
  onNewChatClick,
  onSearchClick,
  newChatUnavailableReason,
  unseenInvestigationCount
}: TargetChatNavigationRailProps) {
  const { t } = useTranslation();

  if (automaticInvestigationsEnabled) {
    return (
      <TargetChatHistoryRail
        canCreateSession={canCreateSession}
        desktopHistoryPanelId={desktopHistoryPanelId}
        historyControlLabel={historyControlLabel}
        historySearchPageId={historySearchPageId}
        isChatsActive={isChatsActive}
        isInvestigationsActive={isInvestigationsActive}
        isSearchActive={isSearchActive}
        mobileHistoryPanelId={mobileHistoryPanelId}
        onChatsClick={onChatsClick}
        onInvestigationsClick={onInvestigationsClick}
        onNewChatClick={onNewChatClick}
        onSearchClick={onSearchClick}
        newChatUnavailableReason={newChatUnavailableReason}
        unseenInvestigationCount={unseenInvestigationCount}
      />
    );
  }

  return (
    <nav
      aria-label={t('chat.assistantNavigation')}
      className="relative z-20 flex h-full w-12 shrink-0 flex-col items-center gap-1 border-r border-ui-border bg-ui-surface py-2"
    >
      <Tooltip content={newChatUnavailableReason || t('chat.newChat')} side="right">
        <span className="inline-flex">
          <Button
            type="button"
            variant="tertiary"
            size="icon"
            onClick={onNewChatClick}
            disabled={!canCreateSession}
            data-chat-history-trigger="new-chat"
            aria-label={t('chat.newChat')}
          >
            <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
          </Button>
        </span>
      </Tooltip>
      <Tooltip content={t('chat.searchChats')} side="right">
        <Button
          type="button"
          variant="tertiary"
          size="icon"
          onClick={onSearchClick}
          data-chat-history-trigger="search"
          className={isSearchActive ? 'bg-ui-bg text-ui-text shadow-inner' : ''}
          aria-label={t('chat.searchChats')}
          aria-controls={isSearchActive ? historySearchPageId : undefined}
          aria-current={isSearchActive ? 'page' : undefined}
        >
          <Search className="h-4 w-4" aria-hidden="true" />
        </Button>
      </Tooltip>
      <Tooltip content={isChatsActive ? historyControlLabel : t('chat.chats')} side="right">
        <Button
          type="button"
          variant="tertiary"
          size="icon"
          onClick={onChatsClick}
          data-chat-history-trigger="chats"
          className={isChatsActive ? 'bg-ui-bg text-ui-text shadow-inner' : ''}
          aria-label={isChatsActive ? historyControlLabel : t('chat.chats')}
          aria-controls={isHistoryOpen ? desktopHistoryPanelId : undefined}
          aria-expanded={isChatsActive}
          aria-current={isChatsActive ? 'page' : undefined}
        >
          <MessagesSquare className="h-4 w-4" aria-hidden="true" />
        </Button>
      </Tooltip>
    </nav>
  );
}
