import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MobileNavigation } from '@acornops/ui';

import { AssistantNavStatusIndicator } from '@/app/AssistantNavStatusIndicator';
import { NavCountBadge } from '@/app/NavCountBadge';
import { DialogFrame } from '@acornops/ui';
import { CloseButton } from '@acornops/ui';
import { ICONS } from '@/constants';
import { workspaceLandingPath } from '@/app/appNavigationGuards';
import { canReadWorkspaceData } from '@/app/workspacePermissions';
import { appHref, getWorkspaceNavigationGroups, handleAppLinkClick } from '@/app/workspaceNavigation';
import { WorkspaceNavigationGroupBadge } from '@/app/WorkspaceNavigationGroupBadge';
import type { ControlPlaneVirtualMachine } from '@/services/controlPlaneApi';
import { KubernetesCluster, User, Workspace } from '@/types';
import { AppPaths, ClusterSubview, VmSubview } from '@/utils/routes';
import type { AssistantNavStatus } from '@/app/assistantNavStatus';
import type { ActivePrimaryNav, ActiveResourceNav } from '@/app/appRouteState';
import { ThemeMenu } from '@/components/common/ThemeMenu';
import type { ResolvedTheme, ThemePreference } from '@/app/theme';
import { Button } from '@acornops/ui';

const MotionButton = motion.create(Button);

interface AppMobileNavigationProps {
  activeClusterSubview: ClusterSubview;
  activeVmSubview: VmSubview;
  activePrimaryNav: ActivePrimaryNav;
  activeResourceNav: ActiveResourceNav;
  pendingApprovalCount?: number;
  openWorkflowRunCount?: number;
  isClusterSidebar: boolean;
  isVirtualMachineSidebar: boolean;
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
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
  onSelectTheme: (preference: ThemePreference, source: HTMLButtonElement) => void;
}

export const AppMobileNavigation: React.FC<AppMobileNavigationProps> = ({
  activeClusterSubview,
  activeVmSubview,
  activePrimaryNav,
  activeResourceNav,
  pendingApprovalCount,
  openWorkflowRunCount,
  isClusterSidebar,
  isVirtualMachineSidebar,
  themePreference,
  resolvedTheme,
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
  onSelectTheme
}) => {
  const { t } = useTranslation();
  const logoSrc = `${import.meta.env.BASE_URL}logo.svg`;
  const mobileNavButtonRef = React.useRef<HTMLButtonElement>(null);
  const mobileNavCloseButtonRef = React.useRef<HTMLButtonElement>(null);
  const mobileNavTitleId = React.useId();
  const mobileNavPanelId = React.useId();
  const hasWorkspaceDataAccess = canReadWorkspaceData(selectedWorkspace);
  const workspaceHomePath = selectedWorkspace ? workspaceLandingPath(selectedWorkspace) : AppPaths.workspaces();
  const workspaceNavigationGroups = getWorkspaceNavigationGroups({
    workspace: selectedWorkspace,
    activeResourceNav,
    pendingApprovalCount,
    openWorkflowRunCount,
    t
  });

  return (
    <>
      <MobileNavigation className="management-console-mobile-navigation">
        <Button type="button" className="flex min-h-11 items-center gap-3" onClick={() => navigate(workspaceHomePath)} aria-label={t('app.goHome')}>
          <img src={logoSrc} alt="" className="h-9 w-9 shrink-0" />
          <div className="text-left font-sans type-section-title leading-none tracking-tighter">
            <span className="type-wordmark text-brand-brown dark:text-brand-cream">acorn</span>
            <span data-brand-wordmark className="type-wordmark text-accent-bright">ops</span>
            <span className="type-micro-label mt-1 block max-w-[10rem] truncate">{selectedWorkspace?.name || t('app.noWorkspace')}</span>
          </div>
        </Button>
        <MotionButton
          ref={mobileNavButtonRef}
          type="button"
          onClick={() => {
            onSetMobileNavOpen((current) => !current);
            onSetAccountMenuOpen(false);
          }}
          className="flex min-h-11 min-w-11 items-center justify-center p-2 text-ui-text-muted transition-colors hover:text-accent-strong"
          aria-label={t('app.openNavigation')}
          aria-controls={mobileNavPanelId}
          aria-expanded={isMobileNavOpen}
          aria-haspopup="dialog"
        >
          <ICONS.Menu className="h-5 w-5" />
        </MotionButton>
      </MobileNavigation>

      <AnimatePresence>
        {isMobileNavOpen && (
          <DialogFrame unframed
            className="max-h-[calc(100vh-6rem)] w-[calc(100%-1.5rem)] overflow-hidden rounded-lg border border-ui-border bg-ui-surface shadow-xl"
            id={mobileNavPanelId}
            titleId={mobileNavTitleId}
            initialFocusRef={mobileNavCloseButtonRef}
            overlayClassName="z-40 items-start justify-center bg-ui-text/45 p-0 pt-20 dark:bg-ui-bg/75 lg:hidden"
            onClose={() => onSetMobileNavOpen(false)}
          >
            <div className="flex items-center justify-between border-b border-ui-border px-4 py-3">
              <div>
                <h2 id={mobileNavTitleId} className="type-row-title text-ui-text">
                  {t('app.navigation')}
                </h2>
                <p className="type-caption mt-0.5">{t('app.navigationHint')}</p>
              </div>
              <CloseButton ref={mobileNavCloseButtonRef} onClick={() => onSetMobileNavOpen(false)} aria-label={t('app.closeNavigation')} />
            </div>

            <div className="no-scrollbar max-h-[calc(100vh-6.5rem)] divide-y divide-ui-border overflow-y-auto">
              <section className="px-4 py-3">
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    type="button"
                    onClick={() => {
                      onSetMobileNavOpen(false);
                      navigate(AppPaths.workspaces());
                    }}
                    className={`min-h-11 rounded-md px-3 py-2 type-caption type-emphasis transition-colors ${
                      activePrimaryNav === 'workspaces' ? 'bg-accent-soft text-accent-strong' : 'bg-ui-bg text-ui-text-muted hover:text-ui-text'
                    }`}
                  >
                    {t('app.workspaces')}
                  </Button>
                  {hasWorkspaceDataAccess && (
                    <Button
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
                      className={`min-h-11 rounded-md px-3 py-2 type-caption type-emphasis transition-colors ${
                        activePrimaryNav === 'clusters' ? 'bg-accent-soft text-accent-strong' : 'bg-ui-bg text-ui-text-muted hover:text-ui-text'
                      } ${!selectedWorkspaceId ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {t('app.clusters')}
                    </Button>
                  )}
                </div>
              </section>

              <section className="px-4 py-3">
                {(isClusterSidebar || isVirtualMachineSidebar) && (
                  <p className="mb-2 type-label tracking-normal">{t(isClusterSidebar ? 'app.clusterDestinations' : 'app.virtualMachineDestinations')}</p>
                )}
                <div className="grid grid-cols-1 gap-1">
                  {isClusterSidebar ? (
                    <>
                      <Button
                        type="button"
                        onClick={() => {
                          onSetMobileNavOpen(false);
                          onBackToWorkspaceSidebar();
                        }}
                        className="min-h-11 rounded-md px-3 py-2 text-left type-caption text-ui-text-muted hover:bg-ui-bg hover:text-accent-strong"
                      >
                        {t('app.backToWorkspace')}
                      </Button>
                      <div className="mt-3 border-t border-ui-border pt-3">
                        <p className="mb-2 type-label tracking-normal">{t('app.operations')}</p>
                        <div className="grid grid-cols-1 gap-1">
                          {(
                            [
                              ['overview', t('app.overview'), ICONS.LayoutGrid, selectedClusterIssueCount],
                              ['chat', t('app.clusterAssistant'), ICONS.BotMessageSquare, 0],
                              ['resources', t('app.resources'), ICONS.Activity, 0]
                            ] as Array<[ClusterSubview, string, React.ElementType, number]>
                          ).map(([tab, label, Icon, badge]) => (
                            <Button
                              key={tab}
                              type="button"
                              onClick={() => {
                                onSetMobileNavOpen(false);
                                onNavigateClusterSubview(tab);
                              }}
                              disabled={!selectedSidebarCluster}
                              className={`min-h-11 rounded-md px-3 py-2 text-left type-caption transition-colors ${
                                activeClusterSubview === tab ? 'bg-accent-soft text-accent-strong' : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
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
                                    label={tab === 'chat' && clusterAssistantNavStatus !== 'idle' ? t(`app.aiAssistantStatus.${clusterAssistantNavStatus}`) : undefined}
                                    withTooltip={false}
                                  />
                                </span>
                              </span>
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 border-t border-ui-border pt-3">
                        <p className="mb-2 type-label tracking-normal">{t('app.capabilities')}</p>
                        <div className="grid grid-cols-1 gap-1">
                          {(
                            [
                              ['mcpServers', t('app.mcpServers'), ICONS.Server],
                              ['skills', t('app.skills'), ICONS.BookOpen],
                              ['tools', t('app.tools'), ICONS.Wrench]
                            ] as Array<[ClusterSubview, string, React.ElementType]>
                          ).map(([tab, label, Icon]) => (
                            <Button
                              key={tab}
                              type="button"
                              onClick={() => {
                                onSetMobileNavOpen(false);
                                onNavigateClusterSubview(tab);
                              }}
                              disabled={!selectedSidebarCluster}
                              className={`min-h-11 rounded-md px-3 py-2 text-left type-caption transition-colors ${
                                activeClusterSubview === tab ? 'bg-accent-soft text-accent-strong' : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
                              } disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{label}</span>
                              </span>
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 border-t border-ui-border pt-3">
                        <Button
                          type="button"
                          onClick={() => {
                            onSetMobileNavOpen(false);
                            onNavigateClusterSubview('settings');
                          }}
                          disabled={!selectedSidebarCluster}
                          className={`min-h-11 w-full rounded-md px-3 py-2 text-left type-caption transition-colors ${
                            activeClusterSubview === 'settings' ? 'bg-accent-soft text-accent-strong' : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <ICONS.Settings className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{t('app.clusterSettings')}</span>
                          </span>
                        </Button>
                      </div>
                    </>
                  ) : isVirtualMachineSidebar ? (
                    <>
                      <Button
                        type="button"
                        onClick={() => {
                          onSetMobileNavOpen(false);
                          onBackToWorkspaceSidebar();
                        }}
                        className="min-h-11 rounded-md px-3 py-2 text-left type-caption text-ui-text-muted hover:bg-ui-bg hover:text-accent-strong"
                      >
                        {t('app.backToWorkspace')}
                      </Button>
                      <div className="mt-3 border-t border-ui-border pt-3">
                        <p className="mb-2 type-label tracking-normal">{t('app.operations')}</p>
                        <div className="grid grid-cols-1 gap-1">
                          {(
                            [
                              ['overview', t('app.overview'), ICONS.LayoutGrid, selectedVmIssueCount],
                              ['chat', t('app.vmAssistant'), ICONS.BotMessageSquare, 0],
                              ['resources', t('app.resources'), ICONS.Activity, 0]
                            ] as Array<[VmSubview, string, React.ElementType, number]>
                          ).map(([tab, label, Icon, badge]) => (
                            <Button
                              key={tab}
                              type="button"
                              onClick={() => {
                                onSetMobileNavOpen(false);
                                onNavigateVmSubview(tab);
                              }}
                              disabled={!selectedSidebarVm}
                              className={`min-h-11 rounded-md px-3 py-2 text-left type-caption transition-colors ${
                                (
                                  tab === 'resources'
                                    ? activeVmSubview === 'resources' ||
                                      activeVmSubview === 'services' ||
                                      activeVmSubview === 'processes' ||
                                      activeVmSubview === 'network' ||
                                      activeVmSubview === 'logs'
                                    : activeVmSubview === tab
                                )
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
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 border-t border-ui-border pt-3">
                        <p className="mb-2 type-label tracking-normal">{t('app.capabilities')}</p>
                        <div className="grid grid-cols-1 gap-1">
                          {(
                            [
                              ['mcpServers', t('app.mcpServers'), ICONS.Server],
                              ['skills', t('app.skills'), ICONS.BookOpen],
                              ['tools', t('app.tools'), ICONS.Wrench]
                            ] as Array<[VmSubview, string, React.ElementType]>
                          ).map(([tab, label, Icon]) => (
                            <Button
                              key={tab}
                              type="button"
                              onClick={() => {
                                onSetMobileNavOpen(false);
                                onNavigateVmSubview(tab);
                              }}
                              disabled={!selectedSidebarVm}
                              className={`min-h-11 rounded-md px-3 py-2 text-left type-caption transition-colors ${
                                activeVmSubview === tab ? 'bg-accent-soft text-accent-strong' : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
                              } disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{label}</span>
                              </span>
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 border-t border-ui-border pt-3">
                        <Button
                          type="button"
                          onClick={() => {
                            onSetMobileNavOpen(false);
                            onNavigateVmSubview('settings');
                          }}
                          disabled={!selectedSidebarVm}
                          className={`min-h-11 w-full rounded-md px-3 py-2 text-left type-caption transition-colors ${
                            activeVmSubview === 'settings' ? 'bg-accent-soft text-accent-strong' : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <ICONS.Settings className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{t('app.vmSettings')}</span>
                          </span>
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <nav aria-label={t('app.workspaceNavigation')} className="space-y-3">
                        {workspaceNavigationGroups.map((group) => (
                          <section
                            key={group.id}
                            aria-label={[group.label || t('app.overview'), group.badge].filter(Boolean).join(', ')}
                            className={group.id === 'primary' ? '' : 'border-t border-ui-border pt-3'}
                          >
                            {group.label && (
                              <div className="mb-1 flex items-center justify-between gap-2 px-3">
                                <p className="type-label tracking-normal">{group.label}</p>
                                {group.badge && <WorkspaceNavigationGroupBadge>{group.badge}</WorkspaceNavigationGroupBadge>}
                              </div>
                            )}
                            <div className="grid grid-cols-1 gap-1">
                              {group.items.map((item) => {
                                const Icon = item.icon;
                                return (
                                  <div key={item.id} className={item.children ? 'rounded-md bg-ui-bg pb-1' : undefined}>
                                    <a
                                      href={appHref(item.path)}
                                      onClick={(event) => handleAppLinkClick(event, item.path, navigate, () => onSetMobileNavOpen(false))}
                                      aria-current={item.current ?? item.active ? 'page' : undefined}
                                      className={`flex min-h-11 items-center justify-between rounded-md px-3 py-2 text-left type-caption transition-colors duration-[160ms] motion-reduce:duration-0 ${
                                        item.active ? 'bg-ui-bg type-emphasis text-ui-text' : 'type-ui text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
                                      }`}
                                    >
                                      <span className="flex min-w-0 items-center gap-3">
                                        <Icon className={`h-[18px] w-[18px] shrink-0 ${item.active ? 'text-accent-strong' : 'text-ui-text-muted'}`} />
                                        <span className="truncate">{item.label}</span>
                                      </span>
                                      {(item.id === 'approvals' || item.id === 'workflows') && (
                                        <span
                                          className="ml-2 inline-flex min-w-8 shrink-0 justify-end"
                                          aria-hidden={item.badge === undefined || item.badge <= 0 ? 'true' : undefined}
                                        >
                                          {typeof item.badge === 'number' ? <NavCountBadge count={item.badge} /> : null}
                                        </span>
                                      )}
                                    </a>
                                    {item.children && (
                                      <div className="mt-0.5 grid grid-cols-1 gap-1 px-3">
                                        {item.children.map((child) => (
                                          <a
                                            key={child.id}
                                            href={appHref(child.path)}
                                            onClick={(event) => handleAppLinkClick(event, child.path, navigate, () => onSetMobileNavOpen(false))}
                                            aria-current={child.current ? 'page' : undefined}
                                            className={`relative flex min-h-11 items-center rounded-md px-3 py-2 pl-7 text-left type-caption transition-colors duration-[160ms] motion-reduce:duration-0 ${
                                              child.current
                                                ? 'bg-ui-surface type-emphasis text-ui-text shadow-sm before:absolute before:left-3 before:top-1/2 before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full before:bg-accent-strong'
                                                : 'type-ui text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
                                            }`}
                                          >
                                            <span className="min-w-0 flex-1 truncate">{child.label}</span>
                                            {child.id === 'workflowRuns' && typeof child.badge === 'number' && child.badge > 0 && <NavCountBadge count={child.badge} />}
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </section>
                        ))}
                      </nav>
                    </>
                  )}
                </div>
              </section>

              <section className="px-4 py-3">
                <div className="mb-2 flex min-h-11 items-center justify-between gap-3">
                  <p className="type-label tracking-normal">{t('app.workspaceContext')}</p>
                  <span className="min-w-0 truncate text-right type-caption type-emphasis text-ui-text">{selectedWorkspace?.name || t('app.selectWorkspace')}</span>
                </div>
                <div className="no-scrollbar max-h-60 space-y-1 overflow-y-auto">
                  {workspaces.length === 0 && <p className="type-caption text-ui-text-muted">{t('app.noWorkspacesAvailable')}</p>}
                  {workspaces.map((workspace) => {
                    const count = workspaceClusterCounts.get(workspace.id) || 0;
                    const isSelected = workspace.id === selectedWorkspaceId;
                    return (
                      <Button
                        key={workspace.id}
                        type="button"
                        onClick={() => onSelectWorkspaceContext(workspace.id)}
                        aria-current={isSelected ? 'true' : undefined}
                        className={`min-h-11 w-full rounded-md px-3 py-2 text-left type-caption transition-colors ${
                          isSelected ? 'bg-accent-soft text-accent-strong' : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
                        }`}
                      >
                        <span className="block truncate type-emphasis">{workspace.name}</span>
                        <span className="type-micro-label">{t('app.clustersCount', { count })}</span>
                      </Button>
                    );
                  })}
                </div>
              </section>

              <section className="px-4 py-3">
                <p className="mb-2 type-label tracking-normal">{t('app.userSettings')}</p>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      onSetMobileNavOpen(false);
                      navigate(AppPaths.accountSettings());
                    }}
                    aria-current={activeResourceNav === 'accountSettings' ? 'page' : undefined}
                    className={`flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                      activeResourceNav === 'accountSettings' ? 'bg-accent-soft text-accent-strong' : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ui-bg text-ui-text-muted">
                        <ICONS.User className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="type-micro-label block">{t('app.accountSettings')}</span>
                        <span className="block truncate type-caption type-emphasis text-ui-text">{user.name}</span>
                        <span className="type-caption block truncate">{user.email}</span>
                      </span>
                    </span>
                    <ICONS.ChevronRight className="h-4 w-4 shrink-0" />
                  </Button>
                  <ThemeMenu preference={themePreference} resolvedTheme={resolvedTheme} variant="mobile" onSelect={onSelectTheme} />
                  <Button
                    type="button"
                    onClick={onLogout}
                    className="min-h-11 rounded-md border border-ui-border bg-ui-surface px-3 py-2 type-caption text-ui-text transition-colors hover:bg-ui-bg"
                  >
                    {t('app.logout')}
                  </Button>
                </div>
              </section>
            </div>
          </DialogFrame>
        )}
      </AnimatePresence>
    </>
  );
};
