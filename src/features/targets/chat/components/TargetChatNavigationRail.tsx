import type { MouseEventHandler } from 'react';
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
  return (
    <TargetChatHistoryRail
      showInvestigations={automaticInvestigationsEnabled}
      canCreateSession={canCreateSession}
      desktopHistoryPanelId={desktopHistoryPanelId}
      historyControlLabel={historyControlLabel}
      historySearchPageId={historySearchPageId}
      isChatsActive={isChatsActive}
      isHistoryOpen={isHistoryOpen}
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
