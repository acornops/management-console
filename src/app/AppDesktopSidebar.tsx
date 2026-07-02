import React from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ICONS } from '@/constants';
import { workspaceLandingPath } from '@/app/appNavigationGuards';
import { canReadWorkspaceAuditLog, canReadWorkspaceData } from '@/app/workspacePermissions';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import { KubernetesCluster, User, Workspace } from '@/types';
import { AppPaths, ClusterSubview, VmSubview } from '@/utils/routes';
import type { AssistantNavStatus } from '@/app/assistantNavStatus';
import type { ActiveResourceNav } from '@/app/appRouteState';
import { navIconClass, SidebarNavButton, SidebarSection, TargetSettingsDivider } from '@/app/AppDesktopSidebarParts';

interface AppDesktopSidebarProps {
  workspaces: Workspace[];
  selectedWorkspace: Workspace | undefined;
  selectedWorkspaceId: string | null;
  selectedWorkspaceInitials: string;
  selectedSidebarCluster: KubernetesCluster | null;
  selectedSidebarVm: Pick<ControlPlaneVirtualMachine, 'id' | 'workspaceId' | 'name'> | null;
  isClusterSidebar: boolean;
  isVirtualMachineSidebar: boolean;
  activeResourceNav: ActiveResourceNav;
  selectedClusterIssueCount: number;
  clusterAssistantNavStatus: AssistantNavStatus;
  selectedVmIssueCount: number;
  theme: 'light' | 'dark';
  isDark: boolean;
  isAccountMenuOpen: boolean;
  isSidebarWorkspaceMenuOpen: boolean;
  sidebarAccountMenuRef: React.RefObject<HTMLDivElement | null>;
  sidebarWorkspaceMenuRef: React.RefObject<HTMLDivElement | null>;
  navigate: (path: string) => void;
  onBackToWorkspaceSidebar: () => void;
  onNavigateClusterSubview: (tab: ClusterSubview) => void;
  onNavigateVmSubview: (tab: VmSubview) => void;
  onOpenCreateWorkspace: () => void;
  onSelectWorkspaceContext: (workspaceId: string) => void;
  onSetAccountMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onSetSidebarWorkspaceMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onToggleTheme: () => void;
  onLogout: () => void;
  user: User;
}

function getUserInitials(user: User): string {
  const source = user.name || user.email || 'User';
  const parts = source
    .split(/[\s@._-]+/)
    .filter(Boolean);

  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2)).toUpperCase();
}

export const AppDesktopSidebar: React.FC<AppDesktopSidebarProps> = ({
  workspaces,
  selectedWorkspace,
  selectedWorkspaceId,
  selectedWorkspaceInitials,
  selectedSidebarCluster,
  selectedSidebarVm,
  isClusterSidebar,
  isVirtualMachineSidebar,
  activeResourceNav,
  selectedClusterIssueCount,
  clusterAssistantNavStatus,
  selectedVmIssueCount,
  theme,
  isDark,
  isAccountMenuOpen,
  isSidebarWorkspaceMenuOpen,
  sidebarAccountMenuRef,
  sidebarWorkspaceMenuRef,
  navigate,
  onBackToWorkspaceSidebar,
  onNavigateClusterSubview,
  onNavigateVmSubview,
  onOpenCreateWorkspace,
  onSelectWorkspaceContext,
  onSetAccountMenuOpen,
  onSetSidebarWorkspaceMenuOpen,
  onToggleTheme,
  onLogout,
  user
}) => {
  const { t } = useTranslation();
  const logoSrc = `${import.meta.env.BASE_URL}logo.svg`;
  const workspaceSwitcherButtonRef = React.useRef<HTMLButtonElement>(null);
  const accountMenuButtonRef = React.useRef<HTMLButtonElement>(null);
  const workspaceSwitcherLabelId = React.useId();
  const workspaceSwitcherPopoverId = React.useId();
  const accountMenuLabelId = React.useId();
  const accountMenuPopoverId = React.useId();
  const hasWorkspaceDataAccess = canReadWorkspaceData(selectedWorkspace);
  const hasWorkspaces = workspaces.length > 0;
  const selectedWorkspaceName = selectedWorkspace?.name || t('app.noWorkspace');
  const selectedClusterName = selectedSidebarCluster?.name || t('app.unknownCluster');
  const selectedVmName = selectedSidebarVm?.name || t('app.unknownVirtualMachine');
  const userInitials = getUserInitials(user);
  const isAccountSettingsActive = activeResourceNav === 'accountSettings';
  const isWorkspaceSettingsActive =
    activeResourceNav === 'workspaceSettings' ||
    activeResourceNav === 'workspaceAiSettings' ||
    activeResourceNav === 'members';
  const workspaceSettingsPath = selectedWorkspaceId
    ? AppPaths.workspaceSettings(selectedWorkspaceId)
    : AppPaths.workspaces();
  const workspaceHomePath = selectedWorkspace
    ? workspaceLandingPath(selectedWorkspace)
    : AppPaths.workspaces();

  const closeWorkspaceSwitcher = React.useCallback(
    ({ restoreFocus = false }: { restoreFocus?: boolean } = {}) => {
      onSetSidebarWorkspaceMenuOpen(false);

      if (restoreFocus) {
        workspaceSwitcherButtonRef.current?.focus({ preventScroll: true });
      }
    },
    [onSetSidebarWorkspaceMenuOpen]
  );

  const handleWorkspaceSwitcherKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape' && isSidebarWorkspaceMenuOpen) {
        event.preventDefault();
        event.stopPropagation();
        closeWorkspaceSwitcher({ restoreFocus: true });
      }
    },
    [closeWorkspaceSwitcher, isSidebarWorkspaceMenuOpen]
  );

  const closeAccountMenu = React.useCallback(
    ({ restoreFocus = false }: { restoreFocus?: boolean } = {}) => {
      onSetAccountMenuOpen(false);

      if (restoreFocus) {
        accountMenuButtonRef.current?.focus({ preventScroll: true });
      }
    },
    [onSetAccountMenuOpen]
  );

  const handleAccountMenuKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape' && isAccountMenuOpen) {
        event.preventDefault();
        event.stopPropagation();
        closeAccountMenu({ restoreFocus: true });
      }
    },
    [closeAccountMenu, isAccountMenuOpen]
  );

  return (
    <aside className="management-console-desktop-sidebar relative z-40 h-full min-h-0 w-64 shrink-0 flex-col overflow-visible border-r border-ui-border bg-ui-surface lg:self-stretch">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="p-8 flex items-center gap-3"
      >
        <motion.button
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate(workspaceHomePath)}
          aria-label={t('app.goHome')}
        >
          <img src={logoSrc} alt="" className="h-9 w-9 shrink-0" />
          <div className="font-sans text-xl leading-none tracking-tighter antialiased">
            <span className="font-bold text-brand-brown">acorn</span>
            <span className="font-bold text-accent-readable">ops</span>
          </div>
        </motion.button>
      </motion.div>

      <nav className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
        <LayoutGroup id="desktop-sidebar-navigation">
          <div className="space-y-0.5">
            {!isClusterSidebar && !isVirtualMachineSidebar && (
              <>
                <div className="relative min-w-0 px-4 mb-8 mt-2" ref={sidebarWorkspaceMenuRef}>
                  {hasWorkspaces ? (
                    <motion.button
                      ref={workspaceSwitcherButtonRef}
                      type="button"
                      onClick={() => onSetSidebarWorkspaceMenuOpen((current) => !current)}
                      onKeyDown={handleWorkspaceSwitcherKeyDown}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-transparent text-left outline-none transition-all hover:bg-ui-bg hover:border-ui-border focus-visible:ring-2 focus-visible:ring-accent/20 group"
                      aria-controls={workspaceSwitcherPopoverId}
                      aria-expanded={isSidebarWorkspaceMenuOpen}
                      aria-label={t('app.selectWorkspace')}
                      title={t('app.selectWorkspace')}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="w-8 h-8 rounded bg-accent-soft flex items-center justify-center shrink-0">
                          <span className="text-accent-strong font-bold font-mono text-xs">{selectedWorkspaceInitials}</span>
                        </span>
                        <span className="min-w-0 flex flex-col items-start transition-all">
                          <span className="type-micro-label">{t('app.workspace')}</span>
                          <span className="line-clamp-2 max-w-[8.75rem] break-words whitespace-normal text-sm font-bold leading-tight text-ui-text" title={selectedWorkspaceName}>
                            {selectedWorkspaceName}
                          </span>
                        </span>
                      </span>
                      <motion.div
                        animate={{ rotate: isSidebarWorkspaceMenuOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="shrink-0"
                      >
                        <ICONS.ChevronDown className="w-4 h-4 text-ui-text-muted transition-all group-hover:text-ui-text" />
                      </motion.div>
                    </motion.button>
                  ) : (
                    <div
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-transparent text-left"
                      title={t('app.noWorkspacesAvailable')}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="w-8 h-8 rounded bg-ui-bg flex items-center justify-center shrink-0">
                          <span className="text-ui-text-muted font-bold font-mono text-xs">{selectedWorkspaceInitials}</span>
                        </span>
                        <span className="min-w-0 flex flex-col items-start">
                          <span className="type-micro-label">{t('app.workspace')}</span>
                          <span className="line-clamp-2 max-w-[8.75rem] break-words whitespace-normal text-sm font-bold leading-tight text-ui-text-muted" title={selectedWorkspaceName}>
                            {selectedWorkspaceName}
                          </span>
                        </span>
                      </span>
                    </div>
                  )}
                  <AnimatePresence>
                    {hasWorkspaces && isSidebarWorkspaceMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        id={workspaceSwitcherPopoverId}
                        aria-labelledby={workspaceSwitcherLabelId}
                        onKeyDown={handleWorkspaceSwitcherKeyDown}
                        className="absolute top-full left-4 right-4 mt-2 z-50 max-h-[300px] overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-xl flex flex-col"
                      >
                        <div className="p-2 border-b border-ui-border bg-ui-bg">
                          <span
                            id={workspaceSwitcherLabelId}
                            className="type-micro-label px-2"
                          >
                            {t('app.switchWorkspace')}
                          </span>
                        </div>
                        <div role="list" className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                          {workspaces.map((workspace) => {
                            const isSelected = workspace.id === selectedWorkspaceId;
                            const initials = workspace.name
                              .split(/\s+/)
                              .filter(Boolean)
                              .map((part) => part[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase();
                            return (
                              <div key={workspace.id} role="listitem">
                                <motion.button
                                  whileTap={{ scale: 0.98 }}
                                  type="button"
                                  onClick={() => {
                                    onSelectWorkspaceContext(workspace.id);
                                    closeWorkspaceSwitcher({ restoreFocus: true });
                                  }}
                                  aria-current={isSelected ? 'true' : undefined}
                                  className={`flex w-full items-start gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
                                    isSelected
                                      ? 'border border-accent/20 bg-accent-soft font-bold text-accent-strong'
                                      : 'text-ui-text hover:bg-ui-bg'
                                  }`}
                                >
                                  <ICONS.LayoutGrid
                                    className={`w-4 h-4 shrink-0 ${isSelected ? 'text-accent-strong' : 'opacity-50'}`}
                                  />
                                  <span className="min-w-0 flex-1 whitespace-normal break-words text-left leading-snug">
                                    {workspace.name || initials}
                                  </span>
                                </motion.button>
                              </div>
                            );
                          })}
                        </div>
                        <div className="p-2 border-t border-ui-border bg-ui-bg">
                          <motion.button
                            type="button"
                            onClick={() => {
                              closeWorkspaceSwitcher({ restoreFocus: true });
                              onOpenCreateWorkspace();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-ui-text-muted hover:text-accent-strong hover:bg-accent-soft transition-all"
                          >
                            <ICONS.Plus className="h-3.5 w-3.5" />
                            <span>{t('app.newWorkspace')}</span>
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {hasWorkspaceDataAccess && (
                  <>
                    <SidebarSection title={t('app.inventory')} compactAfter>
                      <SidebarNavButton
                        active={activeResourceNav === 'clusters'}
                        disabled={!selectedWorkspaceId}
                        icon={<ICONS.Layers className={navIconClass(activeResourceNav === 'clusters')} />}
                        label={t('app.clusters')}
                        onClick={() => selectedWorkspaceId && navigate(AppPaths.workspaceKubernetesClusters(selectedWorkspaceId))}
                      />
                      <SidebarNavButton
                        active={activeResourceNav === 'virtualMachines'}
                        disabled={!selectedWorkspaceId}
                        icon={<ICONS.Server className={navIconClass(activeResourceNav === 'virtualMachines')} />}
                        label={t('app.virtualMachines')}
                        onClick={() => selectedWorkspaceId && navigate(AppPaths.workspaceVirtualMachines(selectedWorkspaceId))}
                      />
                    </SidebarSection>

                    <SidebarSection title={t('app.automation')} compactAfter>
                      <SidebarNavButton
                        active={activeResourceNav === 'agents'}
                        disabled={!selectedWorkspaceId}
                        icon={<ICONS.Bot className={navIconClass(activeResourceNav === 'agents')} />}
                        label={t('app.agents')}
                        onClick={() => selectedWorkspaceId && navigate(AppPaths.workspaceAgents(selectedWorkspaceId))}
                      />
                      <SidebarNavButton
                        active={activeResourceNav === 'workflows'}
                        disabled={!selectedWorkspaceId}
                        icon={<ICONS.GitBranch className={navIconClass(activeResourceNav === 'workflows')} />}
                        label={t('app.workflows')}
                        onClick={() => selectedWorkspaceId && navigate(AppPaths.workspaceWorkflows(selectedWorkspaceId))}
                      />
                      <SidebarNavButton
                        active={activeResourceNav === 'schedules'}
                        disabled={!selectedWorkspaceId}
                        icon={<ICONS.Clock className={navIconClass(activeResourceNav === 'schedules')} />}
                        label={t('app.schedules')}
                        onClick={() => selectedWorkspaceId && navigate(AppPaths.workspaceSchedules(selectedWorkspaceId))}
                      />
                      <SidebarNavButton
                        active={activeResourceNav === 'approvals'}
                        disabled={!selectedWorkspaceId}
                        icon={<ICONS.CheckCircle2 className={navIconClass(activeResourceNav === 'approvals')} />}
                        label={t('app.approvals')}
                        onClick={() => selectedWorkspaceId && navigate(AppPaths.workspaceApprovals(selectedWorkspaceId))}
                      />
                    </SidebarSection>
                  </>
                )}

                {selectedWorkspaceId && (
                  <TargetSettingsDivider>
                    <SidebarNavButton
                      active={isWorkspaceSettingsActive}
                      disabled={!selectedWorkspaceId}
                      icon={<ICONS.Settings className={navIconClass(isWorkspaceSettingsActive)} />}
                      label={t('app.workspaceSettings')}
                      onClick={() => navigate(workspaceSettingsPath)}
                    />
                    {canReadWorkspaceAuditLog(selectedWorkspace) && (
                      <SidebarNavButton
                        active={activeResourceNav === 'workspaceAuditLog'}
                        disabled={!selectedWorkspaceId}
                        icon={<ICONS.Shield className={navIconClass(activeResourceNav === 'workspaceAuditLog')} />}
                        label={t('app.auditLog')}
                        onClick={() => selectedWorkspaceId && navigate(AppPaths.workspaceAuditLog(selectedWorkspaceId))}
                      />
                    )}
                    <SidebarNavButton
                      active={activeResourceNav === 'help'}
                      disabled={false}
                      icon={<ICONS.CircleHelp className={navIconClass(activeResourceNav === 'help')} />}
                      label={t('app.help')}
                      onClick={() => navigate(AppPaths.help())}
                    />
                  </TargetSettingsDivider>
                )}
              </>
            )}

          {isClusterSidebar && (
            <>
              <div className="px-4 mb-8 pt-2">
                <motion.button
                  type="button"
                  onClick={onBackToWorkspaceSidebar}
                  className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-ui-border bg-ui-bg px-4 py-2 text-xs font-bold text-ui-text-muted transition-all hover:bg-accent-soft hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                  aria-label={t('app.backToWorkspace')}
                >
                  <ICONS.ChevronLeft className="w-3.5 h-3.5" />
                  <span>{t('app.backToWorkspace')}</span>
                </motion.button>
                <div className="px-4 py-3 bg-ui-surface border-y border-ui-border" title={selectedClusterName}>
                  <div className="type-micro-label mb-1">{t('app.activeCluster')}</div>
                  <div data-desktop-sidebar-active-cluster="true" className="type-row-title line-clamp-2 break-words" title={selectedClusterName}>
                    {selectedClusterName}
                  </div>
                </div>
              </div>

              <SidebarSection title={t('app.operations')} compactAfter>
                {([
                  ['overview', 'clusterOverview', t('app.overview'), ICONS.LayoutGrid],
                  ['chat', 'clusterChat', t('app.clusterAssistant'), ICONS.BotMessageSquare],
                  ['resources', 'clusterResources', t('app.resources'), ICONS.Activity]
                ] as Array<[ClusterSubview, ActiveResourceNav, string, typeof ICONS.LayoutGrid]>).map(([tab, nav, label, Icon]) => (
                  <SidebarNavButton
                    key={tab}
                    active={activeResourceNav === nav}
                    disabled={!selectedSidebarCluster}
                    icon={<Icon className={navIconClass(activeResourceNav === nav)} />}
                    label={label}
                    onClick={() => onNavigateClusterSubview(tab)}
                    badge={tab === 'overview' && selectedClusterIssueCount > 0 ? selectedClusterIssueCount : undefined}
                    assistantStatus={tab === 'chat' ? clusterAssistantNavStatus : 'idle'}
                    assistantStatusLabel={tab === 'chat' && clusterAssistantNavStatus !== 'idle'
                      ? t(`app.aiAssistantStatus.${clusterAssistantNavStatus}`)
                      : undefined}
                  />
                ))}
              </SidebarSection>

              <SidebarSection title={t('app.capabilities')} compactAfter>
                {([
                  ['mcpServers', 'clusterMcpServers', t('app.mcpServers'), ICONS.Server],
                  ['skills', 'clusterSkills', t('app.skills'), ICONS.BookOpen],
                  ['tools', 'clusterTools', t('app.tools'), ICONS.Wrench]
                ] as Array<[ClusterSubview, ActiveResourceNav, string, typeof ICONS.LayoutGrid]>).map(([tab, nav, label, Icon]) => (
                  <SidebarNavButton
                    key={tab}
                    active={activeResourceNav === nav}
                    disabled={!selectedSidebarCluster}
                    icon={<Icon className={navIconClass(activeResourceNav === nav)} />}
                    label={label}
                    onClick={() => onNavigateClusterSubview(tab)}
                  />
                ))}
              </SidebarSection>

              <TargetSettingsDivider>
                <SidebarNavButton
                  active={activeResourceNav === 'clusterSettings'}
                  disabled={!selectedSidebarCluster}
                  icon={<ICONS.Settings className={navIconClass(activeResourceNav === 'clusterSettings')} />}
                  label={t('app.clusterSettings')}
                  onClick={() => onNavigateClusterSubview('settings')}
                />
              </TargetSettingsDivider>
            </>
          )}

          {isVirtualMachineSidebar && (
            <>
              <div className="px-4 mb-8 pt-2">
                <motion.button
                  type="button"
                  onClick={onBackToWorkspaceSidebar}
                  className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-ui-border bg-ui-bg px-4 py-2 text-xs font-bold text-ui-text-muted transition-all hover:bg-accent-soft hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                  aria-label={t('app.backToWorkspace')}
                >
                  <ICONS.ChevronLeft className="w-3.5 h-3.5" />
                  <span>{t('app.backToWorkspace')}</span>
                </motion.button>
                <div className="px-4 py-3 bg-ui-surface border-y border-ui-border" title={selectedVmName}>
                  <div className="type-micro-label mb-1">{t('app.activeVirtualMachine')}</div>
                  <div data-desktop-sidebar-active-vm="true" className="type-row-title line-clamp-2 break-words" title={selectedVmName}>
                    {selectedVmName}
                  </div>
                </div>
              </div>

              <SidebarSection title={t('app.operations')} compactAfter>
                {([
                  ['overview', 'vmOverview', t('app.overview'), ICONS.LayoutGrid],
                  ['chat', 'vmChat', t('app.vmAssistant'), ICONS.BotMessageSquare],
                  ['resources', 'vmResources', t('app.resources'), ICONS.Activity]
                ] as Array<[VmSubview, ActiveResourceNav, string, typeof ICONS.LayoutGrid]>).map(([tab, nav, label, Icon]) => (
                  <SidebarNavButton
                    key={tab}
                    active={activeResourceNav === nav}
                    disabled={!selectedSidebarVm}
                    icon={<Icon className={navIconClass(activeResourceNav === nav)} />}
                    label={label}
                    onClick={() => onNavigateVmSubview(tab)}
                    badge={tab === 'overview' && selectedVmIssueCount > 0 ? selectedVmIssueCount : undefined}
                  />
                ))}
              </SidebarSection>

              <SidebarSection title={t('app.capabilities')} compactAfter>
                {([
                  ['mcpServers', 'vmMcpServers', t('app.mcpServers'), ICONS.Server],
                  ['skills', 'vmSkills', t('app.skills'), ICONS.BookOpen],
                  ['tools', 'vmTools', t('app.tools'), ICONS.Wrench]
                ] as Array<[VmSubview, ActiveResourceNav, string, typeof ICONS.LayoutGrid]>).map(([tab, nav, label, Icon]) => (
                  <SidebarNavButton
                    key={tab}
                    active={activeResourceNav === nav}
                    disabled={!selectedSidebarVm}
                    icon={<Icon className={navIconClass(activeResourceNav === nav)} />}
                    label={label}
                    onClick={() => onNavigateVmSubview(tab)}
                  />
                ))}
              </SidebarSection>

              <TargetSettingsDivider>
                <SidebarNavButton
                  active={activeResourceNav === 'vmSettings'}
                  disabled={!selectedSidebarVm}
                  icon={<ICONS.Settings className={navIconClass(activeResourceNav === 'vmSettings')} />}
                  label={t('app.vmSettings')}
                  onClick={() => onNavigateVmSubview('settings')}
                />
              </TargetSettingsDivider>
            </>
          )}
          </div>
        </LayoutGroup>
      </nav>

      <div className="relative z-50 border-t border-ui-border bg-ui-surface p-4" ref={sidebarAccountMenuRef}>
        <motion.button
          ref={accountMenuButtonRef}
          type="button"
          onClick={() => onSetAccountMenuOpen((current) => !current)}
          onKeyDown={handleAccountMenuKeyDown}
          data-account-settings-active={isAccountSettingsActive ? 'true' : undefined}
          className={`flex w-full items-center justify-between gap-3 rounded-lg border p-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/20 ${
            isAccountSettingsActive ? 'border-accent/30 bg-accent-soft shadow-sm' : 'border-transparent hover:border-ui-border hover:bg-ui-bg'
          }`}
          aria-controls={accountMenuPopoverId}
          aria-expanded={isAccountMenuOpen}
          aria-current={isAccountSettingsActive ? 'page' : undefined}
          aria-label={t('app.accountSettings')}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              isAccountSettingsActive ? 'bg-accent text-[oklch(0.99_0.004_86)]' : 'bg-ui-bg text-ui-text-muted'
            }`}>
              {userInitials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold leading-5 text-ui-text">{user.name}</span>
              <span className="block truncate text-xs leading-4 text-ui-text-muted">{user.email}</span>
            </span>
          </span>
          <motion.span
            animate={{ rotate: isAccountMenuOpen ? 180 : 0 }}
            transition={{ duration: 0.18 }}
            className="shrink-0"
          >
            <ICONS.ChevronDown className="h-4 w-4 text-ui-text-muted" />
          </motion.span>
        </motion.button>

        <AnimatePresence>
          {isAccountMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              id={accountMenuPopoverId}
              aria-labelledby={accountMenuLabelId}
              onKeyDown={handleAccountMenuKeyDown}
              className="absolute bottom-full left-4 right-4 mb-2 overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-xl"
            >
              <div className="border-b border-ui-border bg-ui-bg p-3">
                <span id={accountMenuLabelId} className="type-micro-label">
                  {t('app.account')}
                </span>
                <p className="mt-1 truncate text-sm font-bold text-ui-text">{user.name}</p>
                <p className="truncate text-xs text-ui-text-muted">{user.email}</p>
              </div>
              <div className="space-y-1 p-2">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    closeAccountMenu();
                    navigate(AppPaths.accountSettings());
                  }}
                  aria-current={isAccountSettingsActive ? 'page' : undefined}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-bold transition-colors ${
                    isAccountSettingsActive ? 'bg-accent-soft text-accent-strong' : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
                  }`}
                >
                  <ICONS.User className="h-4 w-4" />
                  <span>{t('app.accountSettings')}</span>
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={onToggleTheme}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-bold text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-ui-text"
                  aria-label={theme === 'light' ? t('app.switchDark') : t('app.switchLight')}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    {isDark ? <ICONS.Sun className="h-4 w-4" /> : <ICONS.Moon className="h-4 w-4" />}
                    <span>{t('app.theme')}</span>
                  </span>
                  <span className="shrink-0 text-xs text-ui-text-muted">
                    {theme === 'light' ? t('app.themeLight') : t('app.themeDark')}
                  </span>
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    closeAccountMenu();
                    onLogout();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-bold text-status-danger-text transition-colors hover:bg-status-danger-soft"
                >
                  <ICONS.LogOut className="h-4 w-4" />
                  <span>{t('app.logout')}</span>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
};
