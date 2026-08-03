import { Bot, MessageSquarePlus, MessagesSquare, Search } from 'lucide-react';
import type { MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Tooltip } from '@acornops/ui';

interface TargetChatHistoryRailProps {
  showInvestigations?: boolean;
  canCreateSession: boolean;
  desktopHistoryPanelId: string;
  historyControlLabel: string;
  historySearchPageId: string;
  isChatsActive: boolean;
  isHistoryOpen?: boolean;
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

export function TargetChatHistoryRail({
  showInvestigations = true,
  canCreateSession,
  desktopHistoryPanelId,
  historyControlLabel,
  historySearchPageId,
  isChatsActive,
  isHistoryOpen = isChatsActive,
  isInvestigationsActive,
  isSearchActive,
  mobileHistoryPanelId,
  onChatsClick,
  onInvestigationsClick,
  onNewChatClick,
  onSearchClick,
  newChatUnavailableReason,
  unseenInvestigationCount
}: TargetChatHistoryRailProps) {
  const { t } = useTranslation();
  const historyPanelIds = showInvestigations
    ? `${desktopHistoryPanelId} ${mobileHistoryPanelId}`
    : isHistoryOpen
      ? desktopHistoryPanelId
      : undefined;
  const investigationLabel = isInvestigationsActive
    ? t('chat.hideInvestigations')
    : unseenInvestigationCount > 0
      ? t('chat.investigationsWithNew', { count: unseenInvestigationCount })
      : t('chat.investigations');

  return (
    <nav
      aria-label={t('chat.assistantNavigation')}
      className="relative z-20 flex min-h-12 w-full shrink-0 flex-row flex-wrap items-center gap-1 border-b border-ui-border bg-ui-surface px-2 md:h-full md:min-h-0 md:w-12 md:flex-col md:flex-nowrap md:border-b-0 md:border-r md:px-0 md:py-2"
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
          aria-controls={historyPanelIds}
          aria-expanded={isChatsActive}
          aria-current={isChatsActive ? 'page' : undefined}
        >
          <MessagesSquare className="h-4 w-4" aria-hidden="true" />
        </Button>
      </Tooltip>
      {showInvestigations && <Tooltip content={investigationLabel} side="right">
        <Button
          type="button"
          variant="tertiary"
          size="icon"
          onClick={onInvestigationsClick}
          data-chat-history-trigger="investigations"
          className={`relative ${isInvestigationsActive ? 'bg-ui-bg text-ui-text shadow-inner' : ''}`}
          aria-label={investigationLabel}
          aria-controls={historyPanelIds}
          aria-expanded={isInvestigationsActive}
          aria-current={isInvestigationsActive ? 'page' : undefined}
        >
          <Bot className="h-4 w-4" aria-hidden="true" />
          {unseenInvestigationCount > 0 && (
            <span
              className="type-micro-label absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full border border-ui-surface bg-ui-text px-1 leading-none text-ui-bg"
              aria-hidden="true"
            >
              {unseenInvestigationCount > 9 ? '9+' : unseenInvestigationCount}
            </span>
          )}
        </Button>
      </Tooltip>}
    </nav>
  );
}
