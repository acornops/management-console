import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AssistantNavStatusIndicator } from '@/app/AssistantNavStatusIndicator';
import { NavCountBadge } from '@/app/NavCountBadge';
import { Dialog } from '@/components/common/Dialog';
import { ICONS } from '@/constants';
import { canReadWorkspaceAuditLog, canReadWorkspaceData } from '@/app/workspacePermissions';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import { KubernetesCluster, User, Workspace } from '@/types';
import { AppPaths, ClusterSubview, VmSubview } from '@/utils/routes';
import type { AssistantNavStatus } from '@/app/assistantNavStatus';

type ActivePrimaryNav = 'workspaces' | 'clusters';
type ActiveResourceNav =
  | 'overview'
  | 'workflows'
  | 'clusters'
  | 'virtualMachines'
  | 'members'
  | 'workspaceAiSettings'
  | 'workspaceSettings'
  | 'workspaceAuditLog'
  | 'settings'
  | 'clusterOverview'
  | 'clusterResources'
  | 'clusterMcpServers'
  | 'clusterSettings'
  | 'clusterChat'
  | 'vmOverview'
  | 'vmResources'
  | 'vmMcpServers'
  | 'vmSettings'
  | 'vmChat'
  | 'workspaces';

interface AppMobileNavigationProps {
  activeClusterSubview: ClusterSubview;
  activeVmSubview: VmSubview;
  activePrimaryNav: ActivePrimaryNav;
  activeResourceNav: ActiveResourceNav;
  isClusterSidebar: boolean;
  isVirtualMachineSidebar: boolean;
  isDark: boolean;
  isMobileNavOpen: boolean;
  selectedClusterFindingCount: number;
  clusterAssistantNavStatus: AssistantNavStatus;
  selectedVmFindingCount: number;
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
  selectedClusterFindingCount,
  clusterAssistantNavStatus,
  selectedVmFindingCount,
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
                <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-ui-text-muted">
                  {t('app.primaryDestinations')}
                </p>
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
                <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-ui-text-muted">
                  {isClusterSidebar || isVirtualMachineSidebar ? t(isClusterSidebar ? 'app.clusterDestinations' : 'app.virtualMachineDestinations') : t('app.resources')}
                </p>
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
                        ['overview', t('app.overview'), ICONS.LayoutGrid, selectedClusterFindingCount],
                        ['resources', t('app.resources'), ICONS.Activity, 0],
                        ['mcpServers', t('app.mcpServers'), ICONS.Server, 0],
                        ['chat', t('app.aiChat'), ICONS.Terminal, 0],
                        ['settings', t('app.clusterSettings'), ICONS.Settings, 0]
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
                        ['overview', t('app.overview'), ICONS.LayoutGrid, selectedVmFindingCount],
                        ['resources', t('app.resources'), ICONS.Activity, 0],
                        ['mcpServers', t('app.mcpServers'), ICONS.Server, 0],
                        ['chat', t('app.aiChat'), ICONS.Terminal, 0],
                        ['settings', t('app.vmSettings'), ICONS.Settings, 0]
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
                    </>
                  ) : (
                    <>
                      {hasWorkspaceDataAccess && (
                        <>
                          {([
                            ['overview', t('app.overview'), AppPaths.workspaceOverview, 0],
                            ['clusters', t('app.clusters'), AppPaths.workspaceKubernetesClusters, 0],
                            ['virtualMachines', t('app.virtualMachines'), AppPaths.workspaceVirtualMachines, 0],
                            ['workflows', t('app.workflows'), AppPaths.workspaceWorkflows, 0]
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
                        </>
                      )}
                      <div className="mt-3 border-t border-ui-border pt-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-ui-text-muted">
                          {t('app.administration')}
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onSetMobileNavOpen(false);
                              selectedWorkspaceId && navigate(AppPaths.workspaceMembers(selectedWorkspaceId));
                            }}
                            disabled={!selectedWorkspaceId}
                            className={`min-h-11 rounded-md px-3 py-2 text-left text-xs font-bold transition-all ${
                              activeResourceNav === 'members'
                                ? 'bg-accent-soft text-accent-strong'
                                : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            {t('app.members')}
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
                          {hasWorkspaceDataAccess && (
                            <button
                              type="button"
                              onClick={() => {
                                onSetMobileNavOpen(false);
                                selectedWorkspaceId && navigate(AppPaths.workspaceAiSettings(selectedWorkspaceId));
                              }}
                              disabled={!selectedWorkspaceId}
                              className={`min-h-11 rounded-md px-3 py-2 text-left text-xs font-bold transition-all ${
                                activeResourceNav === 'workspaceAiSettings'
                                  ? 'bg-accent-soft text-accent-strong'
                                  : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
                              } disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              {t('app.aiSettings')}
                            </button>
                          )}
                          {hasWorkspaceDataAccess && (
                            <button
                              type="button"
                              onClick={() => {
                                onSetMobileNavOpen(false);
                                selectedWorkspaceId && navigate(AppPaths.workspaceSettings(selectedWorkspaceId));
                              }}
                              disabled={!selectedWorkspaceId}
                              className={`min-h-11 rounded-md px-3 py-2 text-left text-xs font-bold transition-all ${
                                activeResourceNav === 'workspaceSettings'
                                  ? 'bg-accent-soft text-accent-strong'
                                  : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
                              } disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              {t('app.workspaceSettings')}
                            </button>
                          )}
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
                <div className="mb-3 flex items-center justify-between gap-3">
                  <motion.button
                    type="button"
                    onClick={() => {
                      onSetMobileNavOpen(false);
                      navigate(AppPaths.settings());
                    }}
                    className={`flex min-h-11 min-w-0 items-center gap-3 px-1 py-2 text-left transition-colors ${
                      activeResourceNav === 'settings'
                        ? 'text-accent-strong'
                        : 'text-ui-text-muted hover:text-ui-text'
                    }`}
                    aria-label={t('app.userSettings')}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                        activeResourceNav === 'settings'
                          ? 'bg-accent-soft text-accent-strong'
                          : 'bg-ui-bg text-ui-text-muted'
                      }`}
                    >
                      <ICONS.User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-ui-text">{user.name}</p>
                      <p className="type-caption truncate">{user.email}</p>
                    </div>
                  </motion.button>
                  <div className="flex items-center gap-2">
                    <motion.button
                      type="button"
                      onClick={onToggleTheme}
                      className="min-h-11 min-w-11 p-2 text-ui-text-muted transition-colors hover:text-accent-strong"
                      aria-label={t('app.toggleTheme')}
                    >
                      {isDark ? <ICONS.Sun className="h-4 w-4" /> : <ICONS.Moon className="h-4 w-4" />}
                    </motion.button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
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
