import React from 'react';
import type { Transition } from 'framer-motion';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AssistantNavStatusIndicator } from '@/app/AssistantNavStatusIndicator';
import { NavCountBadge } from '@/app/NavCountBadge';
import { ICONS } from '@/constants';
import { Tooltip } from '@/components/common/Tooltip';
import { canReadWorkspaceAuditLog, canReadWorkspaceData } from '@/app/workspacePermissions';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import { KubernetesCluster, Workspace } from '@/types';
import { AppPaths, ClusterSubview, VmSubview } from '@/utils/routes';
import type { AssistantNavStatus } from '@/app/assistantNavStatus';

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
  | 'clusterSkills'
  | 'clusterSettings'
  | 'clusterChat'
  | 'vmOverview'
  | 'vmResources'
  | 'vmMcpServers'
  | 'vmSkills'
  | 'vmSettings'
  | 'vmChat'
  | 'workspaces';

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
  selectedClusterFindingCount: number;
  clusterAssistantNavStatus: AssistantNavStatus;
  selectedVmFindingCount: number;
  theme: 'light' | 'dark';
  isDark: boolean;
  isSidebarWorkspaceMenuOpen: boolean;
  sidebarAccountMenuRef: React.RefObject<HTMLDivElement | null>;
  sidebarWorkspaceMenuRef: React.RefObject<HTMLDivElement | null>;
  navigate: (path: string) => void;
  onBackToWorkspaceSidebar: () => void;
  onNavigateClusterSubview: (tab: ClusterSubview) => void;
  onNavigateVmSubview: (tab: VmSubview) => void;
  onOpenCreateWorkspace: () => void;
  onSelectWorkspaceContext: (workspaceId: string) => void;
  onSetMobileNavOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onSetSidebarWorkspaceMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onToggleTheme: () => void;
}

const navButtonClass = (
  active: boolean,
  disabled: boolean
) => `w-full relative overflow-hidden flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-colors group ${
  active
    ? 'text-ui-text font-bold'
    : 'text-ui-text-muted font-medium hover:bg-accent-soft/30 hover:text-accent-strong'
} outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

const navIconClass = (active: boolean) =>
  `w-5 h-5 transition-colors ${active ? 'text-ui-text' : 'text-ui-text-muted/60 group-hover:text-ui-text'}`;

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
  selectedClusterFindingCount,
  clusterAssistantNavStatus,
  selectedVmFindingCount,
  theme,
  isDark,
  isSidebarWorkspaceMenuOpen,
  sidebarAccountMenuRef,
  sidebarWorkspaceMenuRef,
  navigate,
  onBackToWorkspaceSidebar,
  onNavigateClusterSubview,
  onNavigateVmSubview,
  onOpenCreateWorkspace,
  onSelectWorkspaceContext,
  onSetMobileNavOpen,
  onSetSidebarWorkspaceMenuOpen,
  onToggleTheme
}) => {
  const { t } = useTranslation();
  const logoSrc = `${import.meta.env.BASE_URL}logo.svg`;
  const workspaceSwitcherButtonRef = React.useRef<HTMLButtonElement>(null);
  const workspaceSwitcherLabelId = React.useId();
  const workspaceSwitcherPopoverId = React.useId();
  const hasWorkspaceDataAccess = canReadWorkspaceData(selectedWorkspace);
  const selectedWorkspaceName = selectedWorkspace?.name || t('app.noWorkspace');
  const selectedClusterName = selectedSidebarCluster?.name || t('app.unknownCluster');
  const selectedVmName = selectedSidebarVm?.name || t('app.unknownVirtualMachine');
  const workspaceHomePath = selectedWorkspace
    ? hasWorkspaceDataAccess
      ? AppPaths.workspaceOverview(selectedWorkspace.id)
      : canReadWorkspaceAuditLog(selectedWorkspace)
        ? AppPaths.workspaceAuditLog(selectedWorkspace.id)
        : AppPaths.workspaceMembers(selectedWorkspace.id)
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
            <span className="font-bold text-accent-bright">ops</span>
          </div>
        </motion.button>
      </motion.div>

      <nav className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
        <LayoutGroup id="desktop-sidebar-navigation">
          <div className="space-y-0.5">
            {!isClusterSidebar && !isVirtualMachineSidebar && (
              <>
                <div className="relative min-w-0 px-4 mb-8 mt-2" ref={sidebarWorkspaceMenuRef}>
                  <motion.button
                    ref={workspaceSwitcherButtonRef}
                    type="button"
                    onClick={() => onSetSidebarWorkspaceMenuOpen((current) => !current)}
                    onKeyDown={handleWorkspaceSwitcherKeyDown}
                    disabled={workspaces.length === 0}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-transparent text-left outline-none transition-all hover:bg-ui-bg hover:border-ui-border focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50 group"
                    aria-controls={workspaceSwitcherPopoverId}
                    aria-expanded={isSidebarWorkspaceMenuOpen}
                    aria-label={t('app.selectWorkspace')}
                    title={selectedWorkspace ? t('app.selectWorkspace') : t('app.noWorkspacesAvailable')}
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
                  <AnimatePresence>
                    {isSidebarWorkspaceMenuOpen && (
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

                <SidebarSection title={t('app.operations')} compactAfter>
                  {hasWorkspaceDataAccess && (
                    <>
                      <SidebarNavButton
                        active={activeResourceNav === 'overview'}
                        disabled={!selectedWorkspaceId}
                        icon={<ICONS.LayoutGrid className={navIconClass(activeResourceNav === 'overview')} />}
                        label={t('app.overview')}
                        onClick={() => selectedWorkspaceId && navigate(AppPaths.workspaceOverview(selectedWorkspaceId))}
                      />
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
                      <SidebarNavButton
                        active={activeResourceNav === 'workflows'}
                        disabled={!selectedWorkspaceId}
                        icon={<ICONS.GitBranch className={navIconClass(activeResourceNav === 'workflows')} />}
                        label={t('app.workflows')}
                        onClick={() => selectedWorkspaceId && navigate(AppPaths.workspaceWorkflows(selectedWorkspaceId))}
                      />
                    </>
                  )}
                </SidebarSection>

                <SidebarSection title={t('app.administration')} quiet>
                  <SidebarNavButton
                    active={activeResourceNav === 'members'}
                    disabled={!selectedWorkspaceId}
                    icon={<ICONS.Users className={navIconClass(activeResourceNav === 'members')} />}
                    label={t('app.members')}
                    onClick={() => selectedWorkspaceId && navigate(AppPaths.workspaceMembers(selectedWorkspaceId))}
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
                  {hasWorkspaceDataAccess && (
                    <SidebarNavButton
                      active={activeResourceNav === 'workspaceAiSettings'}
                      disabled={!selectedWorkspaceId}
                      icon={<ICONS.Zap className={navIconClass(activeResourceNav === 'workspaceAiSettings')} />}
                      label={t('app.aiSettings')}
                      onClick={() => selectedWorkspaceId && navigate(AppPaths.workspaceAiSettings(selectedWorkspaceId))}
                    />
                  )}
                  {hasWorkspaceDataAccess && (
                    <SidebarNavButton
                      active={activeResourceNav === 'workspaceSettings'}
                      disabled={!selectedWorkspaceId}
                      icon={<ICONS.Settings className={navIconClass(activeResourceNav === 'workspaceSettings')} />}
                      label={t('app.workspaceSettings')}
                      onClick={() => selectedWorkspaceId && navigate(AppPaths.workspaceSettings(selectedWorkspaceId))}
                    />
                  )}
                </SidebarSection>
              </>
            )}

          {isClusterSidebar && (
            <>
              <div className="px-4 mb-4 pt-2">
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
                  ['resources', 'clusterResources', t('app.resources'), ICONS.Activity],
                  ['mcpServers', 'clusterMcpServers', t('app.mcpServers'), ICONS.Server],
                  ['skills', 'clusterSkills', t('app.skills'), ICONS.BookOpen],
                  ['chat', 'clusterChat', t('app.aiChat'), ICONS.Terminal]
                ] as Array<[ClusterSubview, ActiveResourceNav, string, typeof ICONS.LayoutGrid]>).map(([tab, nav, label, Icon]) => (
                  <SidebarNavButton
                    key={tab}
                    active={activeResourceNav === nav}
                    disabled={!selectedSidebarCluster}
                    icon={<Icon className={navIconClass(activeResourceNav === nav)} />}
                    label={label}
                    onClick={() => onNavigateClusterSubview(tab)}
                    badge={tab === 'overview' && selectedClusterFindingCount > 0 ? selectedClusterFindingCount : undefined}
                    assistantStatus={tab === 'chat' ? clusterAssistantNavStatus : 'idle'}
                    assistantStatusLabel={tab === 'chat' && clusterAssistantNavStatus !== 'idle'
                      ? t(`app.aiAssistantStatus.${clusterAssistantNavStatus}`)
                      : undefined}
                  />
                ))}
              </SidebarSection>

              <SidebarSection title={t('app.administration')} quiet>
                <SidebarNavButton
                  active={activeResourceNav === 'clusterSettings'}
                  disabled={!selectedSidebarCluster}
                  icon={<ICONS.Settings className={navIconClass(activeResourceNav === 'clusterSettings')} />}
                  label={t('app.clusterSettings')}
                  onClick={() => onNavigateClusterSubview('settings')}
                />
              </SidebarSection>
            </>
          )}

          {isVirtualMachineSidebar && (
            <>
              <div className="px-4 mb-4 pt-2">
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
                  ['resources', 'vmResources', t('app.resources'), ICONS.Activity],
                  ['mcpServers', 'vmMcpServers', t('app.mcpServers'), ICONS.Server],
                  ['skills', 'vmSkills', t('app.skills'), ICONS.BookOpen],
                  ['chat', 'vmChat', t('app.aiChat'), ICONS.Terminal]
                ] as Array<[VmSubview, ActiveResourceNav, string, typeof ICONS.LayoutGrid]>).map(([tab, nav, label, Icon]) => (
                  <SidebarNavButton
                    key={tab}
                    active={activeResourceNav === nav}
                    disabled={!selectedSidebarVm}
                    icon={<Icon className={navIconClass(activeResourceNav === nav)} />}
                    label={label}
                    onClick={() => onNavigateVmSubview(tab)}
                    badge={tab === 'overview' && selectedVmFindingCount > 0 ? selectedVmFindingCount : undefined}
                  />
                ))}
              </SidebarSection>

              <SidebarSection title={t('app.administration')} quiet>
                <SidebarNavButton
                  active={activeResourceNav === 'vmSettings'}
                  disabled={!selectedSidebarVm}
                  icon={<ICONS.Settings className={navIconClass(activeResourceNav === 'vmSettings')} />}
                  label={t('app.vmSettings')}
                  onClick={() => onNavigateVmSubview('settings')}
                />
              </SidebarSection>
            </>
          )}
          </div>
        </LayoutGroup>
      </nav>

      <div className="relative z-50 border-t border-ui-border p-4">
        <div className="flex items-center justify-between gap-2">
          <Tooltip content={theme === 'light' ? t('app.switchDark') : t('app.switchLight')} side="right">
            <motion.button
              type="button"
              onClick={onToggleTheme}
              className="p-2 text-ui-text-muted transition-colors hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
              aria-label={theme === 'light' ? t('app.switchDark') : t('app.switchLight')}
            >
              {isDark ? <ICONS.Sun className="w-5 h-5" /> : <ICONS.Moon className="w-5 h-5" />}
            </motion.button>
          </Tooltip>

          <div className="relative flex items-center gap-2" ref={sidebarAccountMenuRef}>
            <Tooltip content={t('app.userSettings')}>
              <motion.button
                type="button"
                onClick={() => {
                  onSetMobileNavOpen(false);
                  navigate(AppPaths.settings());
                }}
                className={`flex items-center gap-2 px-1 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${
                  activeResourceNav === 'settings' ? 'text-accent-strong' : 'text-ui-text-muted hover:text-ui-text'
                }`}
                aria-label={t('app.userSettings')}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                    activeResourceNav === 'settings'
                      ? 'bg-accent-soft text-accent-strong'
                      : 'bg-ui-bg text-ui-text-muted'
                  }`}
                >
                  <ICONS.User className="h-4 w-4" />
                </div>
              </motion.button>
            </Tooltip>
          </div>
        </div>
      </div>
    </aside>
  );
};

const SidebarSection: React.FC<{
  title: string;
  children: React.ReactNode;
  quiet?: boolean;
  compactAfter?: boolean;
}> = ({ title, children, quiet = false, compactAfter = false }) => (
  <div className={`${quiet ? 'pt-0 pb-8' : compactAfter ? 'pb-4' : 'pb-10'} px-4`} data-sidebar-section-quiet={quiet ? 'true' : undefined}>
    <div className="flex items-center justify-between px-4 mb-4">
      <div className={`text-xs font-bold uppercase tracking-[0.2em] text-ui-text-muted ${quiet ? 'opacity-55' : 'opacity-70'}`}>{title}</div>
    </div>
    <div className="space-y-0.5">{children}</div>
  </div>
);

const SidebarNavButton: React.FC<{
  active: boolean;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badge?: number;
  assistantStatus?: AssistantNavStatus;
  assistantStatusLabel?: string;
  title?: string;
}> = ({ active, disabled, icon, label, onClick, badge, assistantStatus = 'idle', assistantStatusLabel, title }) => {
  const shouldReduceMotion = useReducedMotion();
  const activeMarkerTransition: Transition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.16, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <motion.button
      whileTap={disabled || shouldReduceMotion ? undefined : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={navButtonClass(active, disabled)}
      title={title}
      aria-current={active ? 'page' : undefined}
    >
      {active && (
        <motion.div
          layoutId="desktop-sidebar-active-tab"
          transition={activeMarkerTransition}
          className="absolute inset-0 rounded-lg border border-accent/30 bg-accent-soft"
        />
      )}
      <div className="relative z-10 flex items-center gap-4">
        {icon}
        <span>{label}</span>
      </div>
      <div className="relative z-10 flex items-center gap-2">
        {typeof badge === 'number' ? <NavCountBadge count={badge} /> : null}
        <AssistantNavStatusIndicator status={assistantStatus} label={assistantStatusLabel} />
      </div>
    </motion.button>
  );
};
