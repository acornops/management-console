import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Button, IconTile, Sidebar, Tooltip } from '@acornops/ui';

import { ICONS } from '@/constants';
import { workspaceLandingPath } from '@/app/appNavigationGuards';
import { AppDesktopSidebarHeader } from '@/app/AppDesktopSidebarHeader';
import { AppDesktopAccountMenu } from '@/app/AppDesktopAccountMenu';
import { AgentSubview, AppPaths, ClusterSubview, VmSubview } from '@/utils/routes';
import type { ActiveResourceNav } from '@/app/appRouteState';
import { navIconClass, SidebarNavButton, SidebarSection, SidebarTargetIdentity, TargetSettingsDivider, WorkspaceSidebarNavLink } from '@/app/AppDesktopSidebarParts';
import type { AppDesktopSidebarProps } from '@/app/AppNavigation.types';
import {
  appHref,
  getWorkspaceNavigationGroups,
  handleAppLinkClick
} from '@/app/workspaceNavigation';

const MotionButton = motion.create(Button);

export const AppDesktopSidebar: React.FC<AppDesktopSidebarProps> = ({
  mode,
  workspaces,
  selectedWorkspace,
  selectedWorkspaceId,
  selectedWorkspaceInitials,
  selectedSidebarAgent,
  selectedSidebarCluster,
  selectedSidebarVm,
  isAgentSidebar,
  isClusterSidebar,
  isVirtualMachineSidebar,
  activeResourceNav,
  pendingApprovalCount,
  selectedClusterIssueCount,
  clusterAssistantNavStatus,
  selectedVmIssueCount,
  themePreference,
  resolvedTheme,
  isAccountMenuOpen,
  isSidebarWorkspaceMenuOpen,
  sidebarAccountMenuRef,
  sidebarWorkspaceMenuRef,
  navigate,
  onBackToWorkspaceSidebar,
  onNavigateAgentSubview,
  onNavigateClusterSubview,
  onNavigateVmSubview,
  onOpenCreateWorkspace,
  onSelectWorkspaceContext,
  onSetAccountMenuOpen,
  onSetSidebarWorkspaceMenuOpen,
  onSelectTheme,
  onLogout,
  onSetMode,
  user
}) => {
  const { t } = useTranslation();
  const logoSrc = `${import.meta.env.BASE_URL}logo.svg`;
  const workspaceSwitcherButtonRef = React.useRef<HTMLButtonElement>(null);
  const workspaceSwitcherPanelRef = React.useRef<HTMLDivElement>(null);
  const workspaceSwitcherLabelId = React.useId();
  const workspaceSwitcherPopoverId = React.useId();
  const [collapsedWorkspaceMenuPosition, setCollapsedWorkspaceMenuPosition] = React.useState({
    left: 72,
    top: 8
  });
  const hasWorkspaces = workspaces.length > 0;
  const selectedWorkspaceName = selectedWorkspace?.name || t('app.noWorkspace');
  const selectedAgentName = selectedSidebarAgent?.name || t('app.unknownAgent');
  const selectedClusterName = selectedSidebarCluster?.name || t('app.unknownCluster');
  const selectedVmName = selectedSidebarVm?.name || t('app.unknownVirtualMachine');
  const isAccountSettingsActive = activeResourceNav === 'accountSettings';
  const workspaceHomePath = selectedWorkspace ? workspaceLandingPath(selectedWorkspace) : AppPaths.workspaces();
  const workspaceNavigationGroups = getWorkspaceNavigationGroups({
    workspace: selectedWorkspace,
    activeResourceNav,
    pendingApprovalCount,
    t
  });
  const collapsed = mode === 'collapsed';

  React.useEffect(() => {
    if (!collapsed) return;
    onSetAccountMenuOpen(false);
    onSetSidebarWorkspaceMenuOpen(false);
  }, [collapsed, onSetAccountMenuOpen, onSetSidebarWorkspaceMenuOpen]);

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

  React.useLayoutEffect(() => {
    if (!collapsed || !isSidebarWorkspaceMenuOpen) return;

    const updatePosition = () => {
      const triggerRect = workspaceSwitcherButtonRef.current?.getBoundingClientRect();
      if (!triggerRect) return;
      const sidebarRect = workspaceSwitcherButtonRef.current
        ?.closest('.management-console-desktop-sidebar')
        ?.getBoundingClientRect();

      const viewportPadding = 8;
      const panelGap = 8;
      const panelWidth = 288;
      const measuredPanelHeight = workspaceSwitcherPanelRef.current?.getBoundingClientRect().height ?? 300;
      const panelHeight = Math.min(measuredPanelHeight, window.innerHeight - viewportPadding * 2);
      setCollapsedWorkspaceMenuPosition({
        left: Math.min(
          (sidebarRect?.right ?? triggerRect.right) + panelGap,
          Math.max(viewportPadding, window.innerWidth - panelWidth - viewportPadding)
        ),
        top: Math.min(
          Math.max(triggerRect.top, viewportPadding),
          Math.max(viewportPadding, window.innerHeight - panelHeight - viewportPadding)
        )
      });
    };

    updatePosition();
    const animationFrame = window.requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    document.addEventListener('scroll', updatePosition, true);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('scroll', updatePosition, true);
    };
  }, [collapsed, isSidebarWorkspaceMenuOpen]);

  return (
    <Sidebar
      collapsed={collapsed}
      data-desktop-sidebar-mode={mode}
      className={`management-console-desktop-sidebar relative z-40 h-full min-h-0 shrink-0 overflow-visible transition-[width] duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:duration-0 min-[1200px]:self-stretch ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <AppDesktopSidebarHeader
        homePath={workspaceHomePath}
        logoSrc={logoSrc}
        mode={mode}
        navigate={navigate}
        onSetMode={onSetMode}
      />

      <nav id="desktop-sidebar-navigation" data-sidebar-density-nav="true" aria-label={t('app.workspaceNavigation')} className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-0.5">
          {!isAgentSidebar && !isClusterSidebar && !isVirtualMachineSidebar && (
            <>
              <div data-sidebar-workspace-context="true" className={`relative mt-1 min-w-0 px-3 ${collapsed ? 'mb-3' : 'mb-5'}`} ref={sidebarWorkspaceMenuRef}>
                {hasWorkspaces ? (
                  <Tooltip content={t('app.selectWorkspace')} side="right" disabled={!collapsed} className="w-full">
                  <MotionButton
                    ref={workspaceSwitcherButtonRef}
                    type="button"
                    variant="tertiary"
                    onClick={() => onSetSidebarWorkspaceMenuOpen((current) => !current)}
                    onKeyDown={handleWorkspaceSwitcherKeyDown}
                    className={`group flex min-h-11 w-full items-center rounded-lg border border-transparent py-2 text-left outline-none transition-colors duration-[160ms] hover:border-ui-border hover:bg-ui-bg focus-visible:ring-2 focus-visible:ring-accent/20 motion-reduce:duration-0 ${
                      collapsed ? 'justify-center px-0' : 'justify-between px-3'
                    }`}
                    aria-controls={workspaceSwitcherPopoverId}
                    aria-expanded={isSidebarWorkspaceMenuOpen}
                    aria-label={t('app.selectWorkspace')}
                    title={t('app.selectWorkspace')}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <IconTile data-rail-align={collapsed ? 'true' : undefined} size="xs" tone="accent">
                        <span className="text-accent-readable type-emphasis font-mono type-caption">{selectedWorkspaceInitials}</span>
                      </IconTile>
                      <span className={collapsed ? 'sr-only' : 'min-w-0 flex flex-col items-start'}>
                        <span className="line-clamp-2 max-w-[8.75rem] break-words whitespace-normal type-body type-emphasis leading-tight text-ui-text" title={selectedWorkspaceName}>
                          {selectedWorkspaceName}
                        </span>
                      </span>
                    </span>
                    <span className={`${collapsed ? 'sr-only' : 'shrink-0'} transition-transform duration-[160ms] motion-reduce:duration-0 ${isSidebarWorkspaceMenuOpen ? 'rotate-180' : ''}`}>
                      <ICONS.ChevronDown className="w-4 h-4 text-ui-text-muted transition-colors group-hover:text-ui-text" />
                    </span>
                  </MotionButton>
                  </Tooltip>
                ) : (
                  <div className="w-full flex items-center justify-between p-3 rounded-lg border border-transparent text-left" title={t('app.noWorkspacesAvailable')}>
                    <span className="flex min-w-0 items-center gap-3">
                      <IconTile data-rail-align={collapsed ? 'true' : undefined} size="xs">
                        <span className="text-ui-text-muted type-emphasis font-mono type-caption">{selectedWorkspaceInitials}</span>
                      </IconTile>
                      <span className="min-w-0 flex flex-col items-start">
                        <span
                          className="line-clamp-2 max-w-[8.75rem] break-words whitespace-normal type-body type-emphasis leading-tight text-ui-text-muted"
                          title={selectedWorkspaceName}
                        >
                          {selectedWorkspaceName}
                        </span>
                      </span>
                    </span>
                  </div>
                )}
                <AnimatePresence>
                  {hasWorkspaces && isSidebarWorkspaceMenuOpen && (
                    <motion.div
                      ref={workspaceSwitcherPanelRef}
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      id={workspaceSwitcherPopoverId}
                      aria-labelledby={workspaceSwitcherLabelId}
                      onKeyDown={handleWorkspaceSwitcherKeyDown}
                      data-sidebar-workspace-menu="true"
                      style={collapsed ? collapsedWorkspaceMenuPosition : undefined}
                      className={`z-50 flex max-h-[min(300px,calc(100vh-2rem))] w-72 flex-col overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-xl ${
                        collapsed ? 'fixed' : 'absolute left-4 right-4 top-full mt-2 w-auto'
                      }`}
                    >
                      <div className="p-2 border-b border-ui-border bg-ui-bg">
                        <span id={workspaceSwitcherLabelId} className="type-micro-label px-2">
                          {t('app.switchWorkspace')}
                        </span>
                      </div>
                      <div role="list" className="no-scrollbar flex-1 space-y-1 overflow-y-auto p-2">
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
                              <MotionButton
                                whileTap={{ scale: 0.98 }}
                                type="button"
                                variant="tertiary"
                                onClick={() => {
                                  onSelectWorkspaceContext(workspace.id);
                                  closeWorkspaceSwitcher({
                                    restoreFocus: true
                                  });
                                }}
                                aria-current={isSelected ? 'true' : undefined}
                                className={`control-target flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                                  isSelected ? 'border-accent/20 bg-accent-soft type-ui text-accent-strong' : 'border-transparent text-ui-text hover:bg-ui-bg'
                                }`}
                              >
                                <ICONS.LayoutGrid data-workspace-menu-icon="true" className={`w-4 h-4 shrink-0 ${isSelected ? 'text-accent-strong' : 'opacity-50'}`} />
                                <span className="min-w-0 flex-1 whitespace-normal break-words text-left leading-snug">{workspace.name || initials}</span>
                              </MotionButton>
                            </div>
                          );
                        })}
                      </div>
                      <div className="p-2 border-t border-ui-border bg-ui-bg">
                        <MotionButton
                          type="button"
                          variant="tertiary"
                          onClick={() => {
                            closeWorkspaceSwitcher({ restoreFocus: true });
                            onOpenCreateWorkspace();
                          }}
                          className="control-target flex min-h-10 w-full items-center justify-start gap-3 rounded-lg border border-transparent px-3 py-2 text-left text-ui-text-muted transition-colors hover:bg-accent-soft hover:text-accent-strong"
                        >
                          <span data-workspace-menu-icon="true" className="flex h-4 w-4 shrink-0 items-center justify-center">
                            <ICONS.Plus className="h-3.5 w-3.5" />
                          </span>
                          <span>{t('app.newWorkspace')}</span>
                        </MotionButton>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {workspaceNavigationGroups.map((group) => {
                const items = group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.id} className={item.children ? 'rounded-md bg-ui-bg pb-1' : undefined}>
                      <WorkspaceSidebarNavLink
                        active={item.active}
                        current={item.current}
                        href={appHref(item.path)}
                        icon={<Icon className={navIconClass(item.active)} />}
                        label={item.label}
                        badge={item.badge}
                        experimentalBadge={item.experimentalBadge}
                        reserveBadgeSpace={item.id === 'approvals' || item.id === 'workflows'}
                        collapsed={collapsed}
                        onClick={(event) => handleAppLinkClick(event, item.path, navigate)}
                      />
                      {item.children && !collapsed && (
                        <div className="mt-0.5 space-y-0.5 px-3">
                          {item.children.map((child) => (
                            <WorkspaceSidebarNavLink
                              key={child.id}
                              active={child.current}
                              current={child.current}
                              href={appHref(child.path)}
                              label={child.label}
                              badge={child.badge}
                              nested
                              reserveBadgeSpace={child.id === 'workflowRuns'}
                              onClick={(event) => handleAppLinkClick(event, child.path, navigate)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });

                return group.id === 'utilities' ? (
                  <TargetSettingsDivider key={group.id}>{items}</TargetSettingsDivider>
                ) : (
                  <SidebarSection key={group.id} title={group.label || ''} badge={group.badge} compactAfter collapsed={collapsed}>
                    {items}
                  </SidebarSection>
                );
              })}
            </>
          )}

          {isAgentSidebar && (
            <>
              <div data-sidebar-target-context="true" className={collapsed ? 'mb-2 px-3 pt-1' : 'mb-8 px-4 pt-2'}>
                <MotionButton
                  type="button"
                  variant="tertiary"
                  size="sm"
                  onClick={onBackToWorkspaceSidebar}
                  className={`control-target group flex h-10 items-center justify-center gap-2 text-ui-text-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${
                    collapsed
                      ? 'mb-1 w-full rounded-md border border-transparent bg-transparent p-0 hover:bg-transparent'
                      : 'mb-4 w-full justify-start gap-3 rounded-md px-3 py-2 hover:bg-ui-bg hover:text-accent-strong'
                  }`}
                  aria-label={t('agentChat.backToAgents')}
                >
                  {collapsed ? (
                    <IconTile size="xs" data-rail-context-control="back" className="transition-colors group-hover:text-accent-strong">
                      <ICONS.ChevronLeft className="h-3.5 w-3.5" />
                    </IconTile>
                  ) : <ICONS.ChevronLeft className="h-3.5 w-3.5" />}
                  <span className={collapsed ? 'sr-only' : undefined}>{t('agentChat.backToAgents')}</span>
                </MotionButton>
                <SidebarTargetIdentity
                  collapsed={collapsed}
                  label={t('app.activeAgent')}
                  name={selectedAgentName}
                  testId="agent"
                />
              </div>

              <SidebarSection title={t('app.operations')} compactAfter collapsed={collapsed}>
                {([
                  ['chat', 'agentChat', t('app.agentAssistant'), ICONS.BotMessageSquare]
                ] as Array<[AgentSubview, ActiveResourceNav, string, typeof ICONS.LayoutGrid]>).map(([tab, nav, label, Icon]) => (
                  <SidebarNavButton
                    key={tab}
                    active={activeResourceNav === nav}
                    disabled={!selectedSidebarAgent}
                    icon={<Icon className={navIconClass(activeResourceNav === nav)} />}
                    label={label}
                    onClick={() => onNavigateAgentSubview(tab)}
                    href={selectedSidebarAgent ? appHref(AppPaths.workspaceAgentDetail(selectedSidebarAgent.workspaceId, selectedSidebarAgent.id, tab)) : undefined}
                    collapsed={collapsed}
                  />
                ))}
              </SidebarSection>

              <SidebarSection title={t('app.capabilities')} compactAfter collapsed={collapsed}>
                {([
                  ['mcpServers', 'agentMcpServers', t('app.mcpServers'), ICONS.Server],
                  ['skills', 'agentSkills', t('app.skills'), ICONS.BookOpen],
                  ['tools', 'agentTools', t('app.tools'), ICONS.Wrench]
                ] as Array<[AgentSubview, ActiveResourceNav, string, typeof ICONS.LayoutGrid]>).map(([tab, nav, label, Icon]) => (
                  <SidebarNavButton
                    key={tab}
                    active={activeResourceNav === nav}
                    disabled={!selectedSidebarAgent}
                    icon={<Icon className={navIconClass(activeResourceNav === nav)} />}
                    label={label}
                    onClick={() => onNavigateAgentSubview(tab)}
                    href={selectedSidebarAgent ? appHref(AppPaths.workspaceAgentDetail(selectedSidebarAgent.workspaceId, selectedSidebarAgent.id, tab)) : undefined}
                    collapsed={collapsed}
                  />
                ))}
              </SidebarSection>

              <TargetSettingsDivider>
                <SidebarNavButton
                  active={activeResourceNav === 'agentSettings'}
                  disabled={!selectedSidebarAgent}
                  icon={<ICONS.Settings className={navIconClass(activeResourceNav === 'agentSettings')} />}
                  label={t('app.agentSettings')}
                  onClick={() => onNavigateAgentSubview('settings')}
                  href={selectedSidebarAgent ? appHref(AppPaths.workspaceAgentDetail(selectedSidebarAgent.workspaceId, selectedSidebarAgent.id, 'settings')) : undefined}
                  collapsed={collapsed}
                />
              </TargetSettingsDivider>
            </>
          )}

          {isClusterSidebar && (
            <>
              <div data-sidebar-target-context="true" className={collapsed ? 'mb-2 px-3 pt-1' : 'px-4 mb-8 pt-2'}>
                <MotionButton
                  type="button"
                  variant="tertiary"
                  size="sm"
                  onClick={onBackToWorkspaceSidebar}
                  className={`control-target group flex h-10 items-center justify-center gap-2 text-ui-text-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${
                    collapsed
                      ? 'mb-1 w-full rounded-md border border-transparent bg-transparent p-0 hover:bg-transparent'
                      : 'mb-4 w-full justify-start gap-3 rounded-md px-3 py-2 hover:bg-ui-bg hover:text-accent-strong'
                  }`}
                  aria-label={t('app.backToWorkspace')}
                >
                  {collapsed ? (
                    <IconTile size="xs" data-rail-context-control="back" className="transition-colors group-hover:text-accent-strong">
                      <ICONS.ChevronLeft className="w-3.5 h-3.5" />
                    </IconTile>
                  ) : <ICONS.ChevronLeft className="w-3.5 h-3.5" />}
                  <span className={collapsed ? 'sr-only' : undefined}>{t('app.backToWorkspace')}</span>
                </MotionButton>
                <SidebarTargetIdentity
                  collapsed={collapsed}
                  label={t('app.activeCluster')}
                  name={selectedClusterName}
                  testId="cluster"
                />
              </div>

              <SidebarSection title={t('app.operations')} compactAfter collapsed={collapsed}>
                {(
                  [
                    ['overview', 'clusterOverview', t('app.overview'), ICONS.LayoutGrid],
                    ['chat', 'clusterChat', t('app.clusterAssistant'), ICONS.BotMessageSquare],
                    ['resources', 'clusterResources', t('app.resources'), ICONS.Activity]
                  ] as Array<[ClusterSubview, ActiveResourceNav, string, typeof ICONS.LayoutGrid]>
                ).map(([tab, nav, label, Icon]) => (
                  <SidebarNavButton
                    key={tab}
                    active={activeResourceNav === nav}
                    disabled={!selectedSidebarCluster}
                    icon={<Icon className={navIconClass(activeResourceNav === nav)} />}
                    label={label}
                    onClick={() => onNavigateClusterSubview(tab)}
                    badge={tab === 'overview' && selectedClusterIssueCount > 0 ? selectedClusterIssueCount : undefined}
                    assistantStatus={tab === 'chat' ? clusterAssistantNavStatus : 'idle'}
                    assistantStatusLabel={tab === 'chat' && clusterAssistantNavStatus !== 'idle' ? t(`app.aiAssistantStatus.${clusterAssistantNavStatus}`) : undefined}
                    href={selectedSidebarCluster ? appHref(AppPaths.workspaceKubernetesClusterDiagnostics(selectedSidebarCluster.workspaceId, selectedSidebarCluster.id, tab)) : undefined}
                    collapsed={collapsed}
                  />
                ))}
              </SidebarSection>

              <SidebarSection title={t('app.capabilities')} compactAfter collapsed={collapsed}>
                {(
                  [
                    ['mcpServers', 'clusterMcpServers', t('app.mcpServers'), ICONS.Server],
                    ['skills', 'clusterSkills', t('app.skills'), ICONS.BookOpen],
                    ['tools', 'clusterTools', t('app.tools'), ICONS.Wrench]
                  ] as Array<[ClusterSubview, ActiveResourceNav, string, typeof ICONS.LayoutGrid]>
                ).map(([tab, nav, label, Icon]) => (
                  <SidebarNavButton
                    key={tab}
                    active={activeResourceNav === nav}
                    disabled={!selectedSidebarCluster}
                    icon={<Icon className={navIconClass(activeResourceNav === nav)} />}
                    label={label}
                    onClick={() => onNavigateClusterSubview(tab)}
                    href={selectedSidebarCluster ? appHref(AppPaths.workspaceKubernetesClusterDiagnostics(selectedSidebarCluster.workspaceId, selectedSidebarCluster.id, tab)) : undefined}
                    collapsed={collapsed}
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
                  href={selectedSidebarCluster ? appHref(AppPaths.workspaceKubernetesClusterDiagnostics(selectedSidebarCluster.workspaceId, selectedSidebarCluster.id, 'settings')) : undefined}
                  collapsed={collapsed}
                />
              </TargetSettingsDivider>
            </>
          )}

          {isVirtualMachineSidebar && (
            <>
              <div data-sidebar-target-context="true" className={collapsed ? 'mb-2 px-3 pt-1' : 'px-4 mb-8 pt-2'}>
                <MotionButton
                  type="button"
                  variant="tertiary"
                  size="sm"
                  onClick={onBackToWorkspaceSidebar}
                  className={`control-target group flex h-10 items-center justify-center gap-2 text-ui-text-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${
                    collapsed
                      ? 'mb-1 w-full rounded-md border border-transparent bg-transparent p-0 hover:bg-transparent'
                      : 'mb-4 w-full justify-start gap-3 rounded-md px-3 py-2 hover:bg-ui-bg hover:text-accent-strong'
                  }`}
                  aria-label={t('app.backToWorkspace')}
                >
                  {collapsed ? (
                    <IconTile size="xs" data-rail-context-control="back" className="transition-colors group-hover:text-accent-strong">
                      <ICONS.ChevronLeft className="w-3.5 h-3.5" />
                    </IconTile>
                  ) : <ICONS.ChevronLeft className="w-3.5 h-3.5" />}
                  <span className={collapsed ? 'sr-only' : undefined}>{t('app.backToWorkspace')}</span>
                </MotionButton>
                <SidebarTargetIdentity
                  collapsed={collapsed}
                  label={t('app.activeVirtualMachine')}
                  name={selectedVmName}
                  testId="virtual-machine"
                />
              </div>

              <SidebarSection title={t('app.operations')} compactAfter collapsed={collapsed}>
                {(
                  [
                    ['overview', 'vmOverview', t('app.overview'), ICONS.LayoutGrid],
                    ['chat', 'vmChat', t('app.vmAssistant'), ICONS.BotMessageSquare],
                    ['resources', 'vmResources', t('app.resources'), ICONS.Activity]
                  ] as Array<[VmSubview, ActiveResourceNav, string, typeof ICONS.LayoutGrid]>
                ).map(([tab, nav, label, Icon]) => (
                  <SidebarNavButton
                    key={tab}
                    active={activeResourceNav === nav}
                    disabled={!selectedSidebarVm}
                    icon={<Icon className={navIconClass(activeResourceNav === nav)} />}
                    label={label}
                    onClick={() => onNavigateVmSubview(tab)}
                    badge={tab === 'overview' && selectedVmIssueCount > 0 ? selectedVmIssueCount : undefined}
                    href={selectedSidebarVm ? appHref(AppPaths.workspaceVirtualMachineDetail(selectedSidebarVm.workspaceId, selectedSidebarVm.id, tab)) : undefined}
                    collapsed={collapsed}
                  />
                ))}
              </SidebarSection>

              <SidebarSection title={t('app.capabilities')} compactAfter collapsed={collapsed}>
                {(
                  [
                    ['mcpServers', 'vmMcpServers', t('app.mcpServers'), ICONS.Server],
                    ['skills', 'vmSkills', t('app.skills'), ICONS.BookOpen],
                    ['tools', 'vmTools', t('app.tools'), ICONS.Wrench]
                  ] as Array<[VmSubview, ActiveResourceNav, string, typeof ICONS.LayoutGrid]>
                ).map(([tab, nav, label, Icon]) => (
                  <SidebarNavButton
                    key={tab}
                    active={activeResourceNav === nav}
                    disabled={!selectedSidebarVm}
                    icon={<Icon className={navIconClass(activeResourceNav === nav)} />}
                    label={label}
                    onClick={() => onNavigateVmSubview(tab)}
                    href={selectedSidebarVm ? appHref(AppPaths.workspaceVirtualMachineDetail(selectedSidebarVm.workspaceId, selectedSidebarVm.id, tab)) : undefined}
                    collapsed={collapsed}
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
                  href={selectedSidebarVm ? appHref(AppPaths.workspaceVirtualMachineDetail(selectedSidebarVm.workspaceId, selectedSidebarVm.id, 'settings')) : undefined}
                  collapsed={collapsed}
                />
              </TargetSettingsDivider>
            </>
          )}
        </div>
      </nav>

      <AppDesktopAccountMenu
        collapsed={collapsed}
        isActive={isAccountSettingsActive}
        isOpen={isAccountMenuOpen}
        menuRef={sidebarAccountMenuRef}
        navigate={navigate}
        onLogout={onLogout}
        onSelectTheme={onSelectTheme}
        onSetOpen={onSetAccountMenuOpen}
        resolvedTheme={resolvedTheme}
        themePreference={themePreference}
        user={user}
      />
    </Sidebar>
  );
};
