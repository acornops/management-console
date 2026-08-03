import type React from 'react';

import type { ActivePrimaryNav, ActiveResourceNav } from '@/app/appRouteState';
import type { ResolvedTheme, ThemePreference } from '@/app/theme';
import type { DesktopSidebarMode } from '@/app/preferences';
import type { User, Workspace } from '@/types';
import type { ManagedSubjectNavigationModel } from '@/app/managedSubjectNavigation';

export interface AppDesktopSidebarProps {
  mode: DesktopSidebarMode;
  workspaces: Workspace[];
  selectedWorkspace: Workspace | undefined;
  selectedWorkspaceId: string | null;
  selectedWorkspaceInitials: string;
  managedSubjectNavigation: ManagedSubjectNavigationModel | null;
  activeResourceNav: ActiveResourceNav;
  pendingApprovalCount?: number;
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  isAccountMenuOpen: boolean;
  isSidebarWorkspaceMenuOpen: boolean;
  sidebarAccountMenuRef: React.RefObject<HTMLDivElement | null>;
  sidebarWorkspaceMenuRef: React.RefObject<HTMLDivElement | null>;
  navigate: (path: string) => void;
  onOpenCreateWorkspace: () => void;
  onSelectWorkspaceContext: (workspaceId: string) => void;
  onSetAccountMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onSetSidebarWorkspaceMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onSelectTheme: (preference: ThemePreference, source: HTMLButtonElement) => void;
  onLogout: () => void;
  onSetMode: (mode: DesktopSidebarMode) => void;
  user: User;
}

export interface AppMobileNavigationProps {
  activePrimaryNav: ActivePrimaryNav;
  activeResourceNav: ActiveResourceNav;
  pendingApprovalCount?: number;
  managedSubjectNavigation: ManagedSubjectNavigationModel | null;
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  isMobileNavOpen: boolean;
  selectedWorkspace: Workspace | undefined;
  selectedWorkspaceId: string | null;
  user: User;
  workspaceClusterCounts: Map<string, number>;
  workspaces: Workspace[];
  navigate: (path: string) => void;
  onLogout: () => void;
  onSelectWorkspaceContext: (workspaceId: string) => void;
  onSetAccountMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onSetMobileNavOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onSelectTheme: (preference: ThemePreference, source: HTMLButtonElement) => void;
}
