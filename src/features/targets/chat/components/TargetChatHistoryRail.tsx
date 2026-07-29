import { Bot, MessagesSquare, Search } from 'lucide-react';
import type { MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Tooltip } from '@/components/common/Tooltip';

interface TargetChatHistoryRailProps {
  desktopHistoryPanelId: string;
  historyControlLabel: string;
  historySearchPageId: string;
  isChatsActive: boolean;
  isInvestigationsActive: boolean;
  isSearchActive: boolean;
  mobileHistoryPanelId: string;
  onChatsClick: MouseEventHandler<HTMLButtonElement>;
  onInvestigationsClick: MouseEventHandler<HTMLButtonElement>;
  onSearchClick: () => void;
  unseenInvestigationCount: number;
}

export function TargetChatHistoryRail({
  desktopHistoryPanelId,
  historyControlLabel,
  historySearchPageId,
  isChatsActive,
  isInvestigationsActive,
  isSearchActive,
  mobileHistoryPanelId,
  onChatsClick,
  onInvestigationsClick,
  onSearchClick,
  unseenInvestigationCount
}: TargetChatHistoryRailProps) {
  const { t } = useTranslation();
  const historyPanelIds = `${desktopHistoryPanelId} ${mobileHistoryPanelId}`;
  const investigationLabel = isInvestigationsActive
    ? t('chat.hideInvestigations')
    : unseenInvestigationCount > 0
      ? t('chat.investigationsWithNew', { count: unseenInvestigationCount })
      : t('chat.investigations');

  return (
    <nav
      aria-label={t('chat.assistantNavigation')}
      className="relative z-20 flex h-full w-12 shrink-0 flex-col items-center gap-1 border-r border-ui-border bg-ui-surface py-2"
    >
      <Tooltip content={t('chat.searchChats')} side="right">
        <Button
          type="button"
          variant="tertiary"
          size="icon"
          onClick={onSearchClick}
          data-chat-history-trigger="search"
          className={isSearchActive ? 'bg-ui-bg text-ui-text shadow-inner' : ''}
          aria-label={t('chat.searchChats')}
          aria-controls={historySearchPageId}
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
      <Tooltip content={investigationLabel} side="right">
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
              className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full border border-ui-surface bg-ui-text px-1 text-[9px] font-bold leading-none text-ui-bg"
              aria-hidden="true"
            >
              {unseenInvestigationCount > 9 ? '9+' : unseenInvestigationCount}
            </span>
          )}
        </Button>
      </Tooltip>
    </nav>
  );
}
