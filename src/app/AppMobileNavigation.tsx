import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AssistantNavStatusIndicator } from '@/app/AssistantNavStatusIndicator';
import { NavCountBadge } from '@/app/NavCountBadge';
import { Dialog } from '@/components/common/Dialog';
import { ICONS } from '@/constants';
import { canReadWorkspaceAuditLog, canReadWorkspaceData, canReadWorkspaceMembers } from '@/app/workspacePermissions';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import { KubernetesCluster, User, Workspace } from '@/types';
import { AppPaths, ClusterSubview, VmSubview } from '@/utils/routes';
import type { AssistantNavStatus } from '@/app/assistantNavStatus';
import type { ActivePrimaryNav, ActiveResourceNav } from '@/app/appRouteState';

interface AppMobileNavigationProps {
  activeClusterSubview: ClusterSubview;
  activeVmSubview: VmSubview;
  activePrimaryNav: ActivePrimaryNav;
  activeResourceNav: ActiveResourceNav;
  isClusterSidebar: boolean;
  isVirtualMachineSidebar: boolean;
  isDark: boolean;
  isMobileNavOpen: boolean;
  selectedClusterIssueCount: number;
  clusterAssistantNavStatus: AssistantNavStatus;
  selectedVmIssueCount: number;
  selectedSidebarCluster: KubernetesCluster | null;
  selectedSidebarVm: Pick<ControlPlaneVirtualMachine, 'id' | 'workspaceId' | 'name'> | null;
  selectedWorkspace: Workspace | undefined;
  selectedWorkspaceId: string | null;
  user: User;
  workspaceClusterCounts: Map<string, number>;
  workspaces: Workspace[];
  navigate: (path: string) => void;
  onBackToWorkspaceSidebar: () => void;
  onLogout: () => void;
  onNavigateClusterSubview: (tab: ClusterSubview) => void;
  onNavigateVmSubview: (tab: VmSubview) => void;
  onSelectWorkspaceContext: (workspaceId: string) => void;
  onSetAccountMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onSetMobileNavOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onToggleTheme: () => void;
}

export const AppMobileNavigation: React.FC<AppMobileNavigationProps> = ({
  activeClusterSubview,
  activeVmSubview,
  activePrimaryNav,
  activeResourceNav,
  isClusterSidebar,
  isVirtualMachineSidebar,
  isDark,
  isMobileNavOpen,
  selectedClusterIssueCount,
  clusterAssistantNavStatus,
  selectedVmIssueCount,
  selectedSidebarCluster,
  selectedSidebarVm,
  selectedWorkspace,
  selectedWorkspaceId,
  user,
  workspaceClusterCounts,
  workspaces,
  navigate,
  onBackToWorkspaceSidebar,
  onLogout,
  onNavigateClusterSubview,
  onNavigateVmSubview,
  onSelectWorkspaceContext,
  onSetAccountMenuOpen,
  onSetMobileNavOpen,
  onToggleTheme
}) => {
  const { t } = useTranslation();
  const logoSrc = `${import.meta.env.BASE_URL}logo.svg`;
  const mobileNavButtonRef = React.useRef<HTMLButtonElement>(null);
  const mobileNavCloseButtonRef = React.useRef<HTMLButtonElement>(null);
  const mobileNavTitleId = React.useId();
  const mobileNavPanelId = React.useId();
  const hasWorkspaceDataAccess = canReadWorkspaceData(selectedWorkspace);
  const hasWorkspaceMemberAccess = canReadWorkspaceMembers(selectedWorkspace);
  const isWorkspaceSettingsActive =
    activeResourceNav === 'settings' ||
    activeResourceNav === 'workspaceSettings' ||
    activeResourceNav === 'workspaceAiSettings' ||
    activeResourceNav === 'members';
  const workspaceSettingsPath = selectedWorkspaceId
    ? hasWorkspaceDataAccess
      ? AppPaths.workspaceSettings(selectedWorkspaceId)
      : AppPaths.workspaceMembers(selectedWorkspaceId)
    : AppPaths.settings();
  const workspaceHomePath = selectedWorkspace
    ? hasWorkspaceDataAccess
      ? AppPaths.workspaceOverview(selectedWorkspace.id)
      : canReadWorkspaceAuditLog(selectedWorkspace)
        ? AppPaths.workspaceAuditLog(selectedWorkspace.id)
        : AppPaths.workspaceMembers(selectedWorkspace.id)
    : AppPaths.workspaces();

  return (
    <>
      <div className="management-console-mobile-navigation relative z-40 h-16 shrink-0 items-center justify-between border-b border-ui-border bg-ui-surface px-4">
        <button
          type="button"
          className="flex items-center gap-3"
          onClick={() => navigate(workspaceHomePath)}
          aria-label={t('app.goHome')}
        >
          <img src={logoSrc} alt="" className="h-9 w-9 shrink-0" />
          <div className="text-left font-sans text-lg leading-none tracking-tighter">
            <span className="font-bold text-brand-brown">acorn</span>
            <span className="font-bold text-accent-bright">ops</span>
            <span className="type-micro-label mt-1 block max-w-[10rem] truncate">
              {selectedWorkspace?.name || t('app.noWorkspace')}
            </span>
          </div>
        </button>
        <motion.button
          ref={mobileNavButtonRef}
          type="button"
          onClick={() => {
            onSetMobileNavOpen((current) => !current);
            onSetAccountMenuOpen(false);
          }}
          className="p-2 text-ui-text-muted transition-colors hover:text-accent-strong"
          aria-label={t('app.openNavigation')}
          aria-controls={mobileNavPanelId}
          aria-expanded={isMobileNavOpen}
          aria-haspopup="dialog"
        >
          <ICONS.Menu className="h-5 w-5" />
        </motion.button>
      </div>

      <AnimatePresence>
        {isMobileNavOpen && (
          <Dialog
            className="max-h-[calc(100vh-6rem)] w-[calc(100%-1.5rem)] overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-xl"
            id={mobileNavPanelId}
            titleId={mobileNavTitleId}
            initialFocusRef={mobileNavCloseButtonRef}
            overlayClassName="z-40 items-start justify-center bg-ui-text/45 p-0 pt-20 dark:bg-ui-bg/75 lg:hidden"
            onClose={() => onSetMobileNavOpen(false)}
          >
            <div className="flex items-center justify-between border-b border-ui-border px-4 py-3">
              <div>
                <h2 id={mobileNavTitleId} className="text-xs font-bold text-ui-text">
                  {t('app.navigation')}
                </h2>
                <p className="type-caption mt-0.5">{t('app.navigationHint')}</p>
              </div>
              <motion.button
                ref={mobileNavCloseButtonRef}
                type="button"
                onClick={() => onSetMobileNavOpen(false)}
                className="p-1.5 text-ui-text-muted transition-colors hover:text-accent-strong"
                aria-label={t('app.closeNavigation')}
              >
                <ICONS.X className="w-4 h-4" />
              </motion.button>
            </div>

            <div className="max-h-[calc(100vh-6.5rem)] divide-y divide-ui-border overflow-y-auto custom-scrollbar">
              <section className="px-4 py-3">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onSetMobileNavOpen(false);
                      navigate(AppPaths.workspaces());
                    }}
                    className={`min-h-11 rounded-md px-3 py-2 text-xs font-semibold transition-all ${
                      activePrimaryNav === 'workspaces'
                        ? 'bg-accent-soft text-accent-strong'
                        : 'bg-ui-bg text-ui-text-muted hover:text-ui-text'
                    }`}
                  >
                    {t('app.workspaces')}
                  </button>
                  {hasWorkspaceDataAccess && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedWorkspaceId) {
                          onSetMobileNavOpen(false);
                          navigate(AppPaths.workspaces());
                          return;
                        }
                        onSetMobileNavOpen(false);
                        navigate(AppPaths.workspaceKubernetesClusters(selectedWorkspaceId));
                      }}
                      disabled={!selectedWorkspaceId}
                      className={`min-h-11 rounded-md px-3 py-2 text-xs font-semibold transition-all ${
                        activePrimaryNav === 'clusters'
                          ? 'bg-accent-soft text-accent-strong'
                          : 'bg-ui-bg text-ui-text-muted hover:text-ui-text'
                      } ${!selectedWorkspaceId ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {t('app.clusters')}
                    </button>
                  )}
                </div>
              </section>

              <section className="px-4 py-3">
                {(isClusterSidebar || isVirtualMachineSidebar) && (
                  <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-ui-text-muted">
                    {t(isClusterSidebar ? 'app.clusterDestinations' : 'app.virtualMachineDestinations')}
                  </p>
                )}
                <div className="grid grid-cols-1 gap-1">
                  {isClusterSidebar ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onSetMobileNavOpen(false);
                          onBackToWorkspaceSidebar();
                        }}
                        className="min-h-11 rounded-md px-3 py-2 text-left text-xs font-bold text-ui-text-muted hover:bg-ui-bg hover:text-accent-strong"
                      >
                        {t('app.backToWorkspace')}
                      </button>
                      {([
                        ['overview', t('app.overview'), ICONS.LayoutGrid, selectedClusterIssueCount],
                        ['resources', t('app.resources'), ICONS.Activity, 0],
                        ['mcpServers', t('app.mcpServers'), ICONS.Server, 0],
                        ['skills', t('app.skills'), ICONS.BookOpen, 0],
                        ['tools', t('app.tools'), ICONS.Wrench, 0],
                        ['chat', t('app.clusterAssistant'), ICONS.BotMessageSquare, 0]
                      ] as Array<[ClusterSubview, string, React.ElementType, number]>).map(([tab, label, Icon, badge]) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => {
                            onSetMobileNavOpen(false);
                            onNavigateClusterSubview(tab);
                          }}
                          disabled={!selectedSidebarCluster}
                          className={`min-h-11 rounded-md px-3 py-2 text-left text-xs font-bold transition-all ${
                            activeClusterSubview === tab
                              ? 'bg-accent-soft text-accent-strong'
                              : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          <span className="flex w-full items-center justify-between gap-3">
                            <span className="flex min-w-0 items-center gap-2">
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{label}</span>
                            </span>
                            <span className="flex shrink-0 items-center gap-2">
                              {badge > 0 && <NavCountBadge count={badge} />}
                              <AssistantNavStatusIndicator
                                status={tab === 'chat' ? clusterAssistantNavStatus : 'idle'}
                                label={tab === 'chat' && clusterAssistantNavStatus !== 'idle'
                                  ? t(`app.aiAssistantStatus.${clusterAssistantNavStatus}`)
                                  : undefined}
                                withTooltip={false}
                              />
                            </span>
                          </span>
                        </button>
                      ))}
                      <div className="mt-3 border-t border-ui-border pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            onSetMobileNavOpen(false);
                            onNavigateClusterSubview('settings');
                          }}
                          disabled={!selectedSidebarCluster}
                          className={`min-h-11 w-full rounded-md px-3 py-2 text-left text-xs font-bold transition-all ${
                            activeClusterSubview === 'settings'
                              ? 'bg-accent-soft text-accent-strong'
                              : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <ICONS.Settings className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{t('app.clusterSettings')}</span>
                          </span>
                        </button>
                      </div>
                    </>
                  ) : isVirtualMachineSidebar ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onSetMobileNavOpen(false);
                          onBackToWorkspaceSidebar();
                        }}
                        className="min-h-11 rounded-md px-3 py-2 text-left text-xs font-bold text-ui-text-muted hover:bg-ui-bg hover:text-accent-strong"
                      >
                        {t('app.backToWorkspace')}
                      </button>
                      {([
                        ['overview', t('app.overview'), ICONS.LayoutGrid, selectedVmIssueCount],
                        ['resources', t('app.resources'), ICONS.Activity, 0],
                        ['mcpServers', t('app.mcpServers'), ICONS.Server, 0],
                        ['skills', t('app.skills'), ICONS.BookOpen, 0],
                        ['tools', t('app.tools'), ICONS.Wrench, 0],
                        ['chat', t('app.vmAssistant'), ICONS.BotMessageSquare, 0]
                      ] as Array<[VmSubview, string, React.ElementType, number]>).map(([tab, label, Icon, badge]) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => {
                            onSetMobileNavOpen(false);
                            onNavigateVmSubview(tab);
                          }}
                          disabled={!selectedSidebarVm}
                          className={`min-h-11 rounded-md px-3 py-2 text-left text-xs font-bold transition-all ${
                            (tab === 'resources'
                              ? activeVmSubview === 'resources' || activeVmSubview === 'services' || activeVmSubview === 'processes' || activeVmSubview === 'network' || activeVmSubview === 'logs'
                              : activeVmSubview === tab)
                              ? 'bg-accent-soft text-accent-strong'
                              : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          <span className="flex w-full items-center justify-between gap-3">
                            <span className="flex min-w-0 items-center gap-2">
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{label}</span>
                            </span>
                            {badge > 0 && <NavCountBadge count={badge} />}
                          </span>
                        </button>
                      ))}
                      <div className="mt-3 border-t border-ui-border pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            onSetMobileNavOpen(false);
                            onNavigateVmSubview('settings');
                          }}
                          disabled={!selectedSidebarVm}
                          className={`min-h-11 w-full rounded-md px-3 py-2 text-left text-xs font-bold transition-all ${
                            activeVmSubview === 'settings'
                              ? 'bg-accent-soft text-accent-strong'
                              : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <ICONS.Settings className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{t('app.vmSettings')}</span>
                          </span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {(hasWorkspaceDataAccess || hasWorkspaceMemberAccess) && (
                        <>
                          <div className="mt-3 border-t border-ui-border pt-3">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-ui-text-muted">
                              {t('app.inventory')}
                            </p>
                            <div className="grid grid-cols-1 gap-1">
                              {hasWorkspaceDataAccess && ([
                                ['clusters', t('app.clusters'), AppPaths.workspaceKubernetesClusters, 0],
                                ['virtualMachines', t('app.virtualMachines'), AppPaths.workspaceVirtualMachines, 0]
                              ] as const).map(([nav, label, pathForWorkspace, badge]) => (
                                  <button
                                    key={nav}
                                    type="button"
                                    onClick={() => {
                                      onSetMobileNavOpen(false);
                                      selectedWorkspaceId && navigate(pathForWorkspace(selectedWorkspaceId));
                                    }}
                                    disabled={!selectedWorkspaceId}
                                    className={`min-h-11 rounded-md px-3 py-2 text-left text-xs font-bold transition-all ${
                                      activeResourceNav === nav
                                        ? 'bg-accent-soft text-accent-strong'
                                        : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
                                    } disabled:cursor-not-allowed disabled:opacity-50`}
                                  >
                                    <span className="flex w-full items-center justify-between gap-3">
                                      <span>{label}</span>
                                      {badge > 0 && <NavCountBadge count={badge} />}
                                    </span>
                                  </button>
                                ))}
                            </div>
                          </div>
                        </>
                      )}
                      {hasWorkspaceDataAccess && (
                        <>
                          <div className="mt-3 border-t border-ui-border pt-3">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-ui-text-muted">
                              {t('app.automation')}
                            </p>
                            <div className="grid grid-cols-1 gap-1">
                              {([
                                ['agents', t('app.agents'), AppPaths.workspaceAgents, 0],
                                ['workflows', t('app.workflows'), AppPaths.workspaceWorkflows, 0],
                                ['schedules', t('app.schedules'), AppPaths.workspaceSchedules, 0],
                                ['approvals', t('app.approvals'), AppPaths.workspaceApprovals, 0]
                              ] as const).map(([nav, label, pathForWorkspace, badge]) => (
                                <button
                                  key={nav}
                                  type="button"
                                  onClick={() => {
                                    onSetMobileNavOpen(false);
                                    selectedWorkspaceId && navigate(pathForWorkspace(selectedWorkspaceId));
                                  }}
                                  disabled={!selectedWorkspaceId}
                                  className={`min-h-11 rounded-md px-3 py-2 text-left text-xs font-bold transition-all ${
                                    activeResourceNav === nav
                                      ? 'bg-accent-soft text-accent-strong'
                                      : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
                                  } disabled:cursor-not-allowed disabled:opacity-50`}
                                >
                                  <span className="flex w-full items-center justify-between gap-3">
                                    <span>{label}</span>
                                    {badge > 0 && <NavCountBadge count={badge} />}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                      <div className="mt-3 border-t border-ui-border pt-3">
                        <div className="grid grid-cols-1 gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onSetMobileNavOpen(false);
                              navigate(workspaceSettingsPath);
                            }}
                            disabled={Boolean(selectedWorkspaceId) && !hasWorkspaceDataAccess && !hasWorkspaceMemberAccess}
                            className={`min-h-11 rounded-md px-3 py-2 text-left text-xs font-bold transition-all ${
                              isWorkspaceSettingsActive
                                ? 'bg-accent-soft text-accent-strong'
                                : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            {selectedWorkspaceId ? t('app.workspaceSettings') : t('app.consoleSettings')}
                          </button>
                          {canReadWorkspaceAuditLog(selectedWorkspace) && (
                            <button
                              type="button"
                              onClick={() => {
                                onSetMobileNavOpen(false);
                                selectedWorkspaceId && navigate(AppPaths.workspaceAuditLog(selectedWorkspaceId));
                              }}
                              disabled={!selectedWorkspaceId}
                              className={`min-h-11 rounded-md px-3 py-2 text-left text-xs font-bold transition-all ${
                                activeResourceNav === 'workspaceAuditLog'
                                  ? 'bg-accent-soft text-accent-strong'
                                  : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
                              } disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              {t('app.auditLog')}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              onSetMobileNavOpen(false);
                              navigate(AppPaths.help());
                            }}
                            className={`min-h-11 rounded-md px-3 py-2 text-left text-xs font-bold transition-all ${
                              activeResourceNav === 'help'
                                ? 'bg-accent-soft text-accent-strong'
                                : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
                            }`}
                          >
                            {t('app.help')}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </section>

              <section className="px-4 py-3">
                <div className="mb-2 flex min-h-11 items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-normal text-ui-text-muted">
                    {t('app.workspaceContext')}
                  </p>
                  <span className="min-w-0 truncate text-right text-xs font-bold text-ui-text">
                    {selectedWorkspace?.name || t('app.selectWorkspace')}
                  </span>
                </div>
                <div className="max-h-60 space-y-1 overflow-y-auto custom-scrollbar">
                  {workspaces.length === 0 && (
                    <p className="text-xs text-ui-text-muted">{t('app.noWorkspacesAvailable')}</p>
                  )}
                  {workspaces.map((workspace) => {
                    const count = workspaceClusterCounts.get(workspace.id) || 0;
                    const isSelected = workspace.id === selectedWorkspaceId;
                    return (
                      <button
                        key={workspace.id}
                        type="button"
                        onClick={() => onSelectWorkspaceContext(workspace.id)}
                        aria-current={isSelected ? 'true' : undefined}
                        className={`min-h-11 w-full rounded-md px-3 py-2 text-left text-xs transition-all ${
                          isSelected
                            ? 'bg-accent-soft text-accent-strong'
                            : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
                        }`}
                      >
                        <span className="block truncate font-semibold">{workspace.name}</span>
                        <span className="type-micro-label">{t('app.clustersCount', { count })}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="px-4 py-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-ui-text-muted">
                  {t('app.userSettings')}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSetMobileNavOpen(false);
                      navigate(AppPaths.accountSettings());
                    }}
                    aria-current={activeResourceNav === 'accountSettings' ? 'page' : undefined}
                    className={`flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition-all ${
                      activeResourceNav === 'accountSettings'
                        ? 'bg-accent-soft text-accent-strong'
                        : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ui-bg text-ui-text-muted">
                        <ICONS.User className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="type-micro-label block">{t('app.accountSettings')}</span>
                        <span className="block truncate text-xs font-bold text-ui-text">{user.name}</span>
                        <span className="type-caption block truncate">{user.email}</span>
                      </span>
                    </span>
                    <ICONS.ChevronRight className="h-4 w-4 shrink-0" />
                  </button>
                  <motion.button
                    type="button"
                    onClick={onToggleTheme}
                    className="flex min-h-11 items-center justify-between rounded-md px-3 py-2 text-xs font-bold text-ui-text-muted transition-colors hover:bg-ui-bg hover:text-ui-text"
                    aria-label={t('app.toggleTheme')}
                  >
                    <span className="flex items-center gap-2">
                      {isDark ? <ICONS.Sun className="h-4 w-4" /> : <ICONS.Moon className="h-4 w-4" />}
                      <span>{t('app.theme')}</span>
                    </span>
                    <span className="text-ui-text-muted">
                      {isDark ? t('app.themeDark') : t('app.themeLight')}
                    </span>
                  </motion.button>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="min-h-11 rounded-md border border-status-danger/25 bg-status-danger-soft px-3 py-2 text-xs font-bold text-status-danger-text hover:bg-status-danger-soft"
                  >
                    {t('app.logout')}
                  </button>
                </div>
              </section>
            </div>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
};
