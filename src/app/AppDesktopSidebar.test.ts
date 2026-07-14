import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const desktopSidebar = [
  readFileSync(resolve(root, 'src/app/AppDesktopSidebar.tsx'), 'utf8'),
  readFileSync(resolve(root, 'src/app/AppDesktopSidebarParts.tsx'), 'utf8')
].join('\n');
const assistantStatusIndicator = readFileSync(resolve(root, 'src/app/AssistantNavStatusIndicator.tsx'), 'utf8');
const navCountBadge = readFileSync(resolve(root, 'src/app/NavCountBadge.tsx'), 'utf8');
const workspaceNavigation = readFileSync(resolve(root, 'src/app/workspaceNavigation.tsx'), 'utf8');

describe('desktop sidebar workspace switcher', () => {
  it('uses popover/list semantics instead of incomplete menu roles', () => {
    expect(desktopSidebar).not.toContain('aria-haspopup="menu"');
    expect(desktopSidebar).not.toContain('role="menu"');
    expect(desktopSidebar).not.toContain('role="menuitem"');
    expect(desktopSidebar).toContain('aria-controls={workspaceSwitcherPopoverId}');
    expect(desktopSidebar).toContain('aria-labelledby={workspaceSwitcherLabelId}');
    expect(desktopSidebar).toContain('role="list"');
    expect(desktopSidebar).toContain('aria-current={isSelected ? \'true\' : undefined}');
  });

  it('returns focus to the workspace trigger when the popover closes', () => {
    expect(desktopSidebar).toContain('const workspaceSwitcherButtonRef = React.useRef<HTMLButtonElement>(null);');
    expect(desktopSidebar).toContain('closeWorkspaceSwitcher({ restoreFocus: true })');
    expect(desktopSidebar).toContain("event.key === 'Escape'");
    expect(desktopSidebar).toContain('workspaceSwitcherButtonRef.current?.focus({ preventScroll: true });');
  });

  it('renders a static workspace context instead of a dead dropdown when no workspaces exist', () => {
    expect(desktopSidebar).toContain('const hasWorkspaces = workspaces.length > 0;');
    expect(desktopSidebar).toContain('{hasWorkspaces ? (');
    expect(desktopSidebar).toContain('{hasWorkspaces && isSidebarWorkspaceMenuOpen && (');
    expect(desktopSidebar).toContain('title={t(\'app.noWorkspacesAvailable\')}');
    expect(desktopSidebar).not.toContain('disabled={workspaces.length === 0}');
  });

  it('separates target settings with the same quiet divider used by workspace utilities', () => {
    expect(desktopSidebar).not.toContain("['settings', 'clusterSettings', t('app.clusterSettings'), ICONS.Settings]");
    expect(desktopSidebar).not.toContain("['settings', 'vmSettings', t('app.vmSettings'), ICONS.Settings]");
    expect(desktopSidebar).not.toContain("<SidebarSection title={t('app.administration')} quiet>");
    expect(desktopSidebar).toContain('<TargetSettingsDivider>');
    expect(desktopSidebar).toContain('</TargetSettingsDivider>');
    expect(desktopSidebar).toContain('className="border-t border-ui-border px-3 pb-5 pt-3"');
    expect(desktopSidebar).not.toContain('className="border-t border-ui-border px-0 pb-8 pt-4"');
    expect(desktopSidebar).not.toContain('className="mx-4 border-t border-ui-border px-0 pb-8 pt-4"');
    expect(desktopSidebar).toContain("active={activeResourceNav === 'clusterSettings'}");
    expect(desktopSidebar).toContain("onClick={() => onNavigateClusterSubview('settings')}");
    expect(desktopSidebar).toContain("active={activeResourceNav === 'vmSettings'}");
    expect(desktopSidebar).toContain("onClick={() => onNavigateVmSubview('settings')}");
  });

  it('links virtual machines to the active workspace target list', () => {
    expect(workspaceNavigation).toContain("label: t('app.virtualMachines')");
    expect(workspaceNavigation).toContain('AppPaths.workspaceVirtualMachines(workspace.id)');
    expect(desktopSidebar).not.toContain("title={t('app.virtualMachinesTooltip')}");
  });

  it('keeps selected workspace and target names readable without losing exact-name access', () => {
    expect(desktopSidebar).toContain('const selectedWorkspaceName = selectedWorkspace?.name || t(\'app.noWorkspace\');');
    expect(desktopSidebar).toContain('const selectedClusterName = selectedSidebarCluster?.name || t(\'app.unknownCluster\');');
    expect(desktopSidebar).toContain('const selectedVmName = selectedSidebarVm?.name || t(\'app.unknownVirtualMachine\');');
    expect(desktopSidebar).toContain('title={selectedWorkspaceName}');
    expect(desktopSidebar).toContain('title={selectedClusterName}');
    expect(desktopSidebar).toContain('title={selectedVmName}');
    expect(desktopSidebar).toContain('data-desktop-sidebar-active-cluster="true"');
    expect(desktopSidebar).toContain('data-desktop-sidebar-active-vm="true"');
    expect(desktopSidebar).toContain('line-clamp-2 max-w-[8.75rem] break-words');
    expect(desktopSidebar).toContain('type-row-title line-clamp-2 break-words');
    expect(desktopSidebar).not.toContain('type-row-title truncate');
  });

  it('uses the initial top-section structure for workspace and target contexts', () => {
    expect(desktopSidebar).toContain('<div className="relative mb-5 mt-1 min-w-0 px-3" ref={sidebarWorkspaceMenuRef}>');
    expect(desktopSidebar).not.toContain('const SidebarContextSlot = React.forwardRef<HTMLDivElement');
    expect(desktopSidebar).not.toContain('<SidebarTargetContext');
    expect(desktopSidebar).not.toContain('const splitSidebarContextName = (name: string): [string, string]');
    expect(desktopSidebar).toContain('className="control-target mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-ui-border bg-ui-bg px-4 py-2 text-xs font-bold text-ui-text-muted transition-all hover:bg-accent-soft hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"');
    expect(desktopSidebar).toContain("<ICONS.ChevronLeft className=\"w-3.5 h-3.5\" />");
    expect(desktopSidebar).toContain("<div className=\"type-micro-label mb-1\">{t('app.activeCluster')}</div>");
    expect(desktopSidebar).toContain("<div className=\"type-micro-label mb-1\">{t('app.activeVirtualMachine')}</div>");
    expect(desktopSidebar.match(/className="px-4 mb-8 pt-2"/g)).toHaveLength(2);
    expect(desktopSidebar).not.toContain('className="px-4 mb-4 pt-2"');
    expect(desktopSidebar).toContain('className="px-4 py-3 bg-ui-surface border-y border-ui-border" title={selectedClusterName}');
    expect(desktopSidebar).toContain('className="px-4 py-3 bg-ui-surface border-y border-ui-border" title={selectedVmName}');
  });

  it('groups workspace resources by inventory and automation intent', () => {
    expect(desktopSidebar).toContain('workspaceNavigationGroups.map((group)');
    expect(workspaceNavigation).toContain("id: 'inventory'");
    expect(workspaceNavigation).toContain("id: 'automation'");
    expect(workspaceNavigation).toContain("id: 'governance'");
    expect(workspaceNavigation).toContain("id: 'utilities'");
    expect(workspaceNavigation).toContain("id: 'overview'");
    expect(desktopSidebar).not.toContain("label={t('app.aiSettings')}");
    expect(workspaceNavigation).toContain("id: 'agents'");
    expect(workspaceNavigation).toContain("id: 'workflows'");
    expect(workspaceNavigation).not.toContain("id: 'schedules'");
    expect(workspaceNavigation).toContain("id: 'workflowLibrary'");
    expect(workspaceNavigation).toContain("id: 'workflowSchedules'");
    expect(workspaceNavigation).toContain("id: 'approvals'");
    expect(workspaceNavigation).toContain("id: 'workspaceAuditLog'");
    expect(workspaceNavigation).toContain("id: 'workspaceSettings'");
    expect(workspaceNavigation).toContain("id: 'help'");
    expect(workspaceNavigation).toContain("activeResourceNav === 'workflows' || activeResourceNav === 'schedules'");
    expect(desktopSidebar).toContain("group.id === 'utilities' ? (");
    expect(desktopSidebar).toContain('<TargetSettingsDivider key={group.id}>{items}</TargetSettingsDivider>');
    expect(desktopSidebar).not.toContain("compactAfter={group.id !== 'utilities'}");
    expect(desktopSidebar).toContain('item.children.map((child)');
    expect(desktopSidebar).toContain("item.children ? 'rounded-md bg-ui-bg pb-1' : undefined");
    expect(desktopSidebar).toContain('className="mt-0.5 space-y-0.5 pl-3"');
    expect(desktopSidebar).toContain('current={item.current}');
    expect(desktopSidebar).toContain('current={child.current}');
    expect(desktopSidebar).toContain('navigate(AppPaths.accountSettings());');
    expect(desktopSidebar).toContain("t('app.accountSettings')");
    expect(desktopSidebar).toContain('<ThemeMenu');
    expect(desktopSidebar).toContain("t('app.logout')");
    expect(desktopSidebar).toContain("tracking-[0.08em]");
    expect(desktopSidebar).not.toContain("label={t('app.runbooks')}");
    expect(desktopSidebar).not.toContain('AppPaths.workspaceRunbooks');
    expect(desktopSidebar).not.toContain("title={t('app.primaryDestinations')}");
    expect(desktopSidebar).not.toContain("label={t('app.members')}");
    expect(desktopSidebar.indexOf("label={t('app.clusterAssistant')}")).toBeLessThan(
      desktopSidebar.indexOf("label={t('app.clusterSettings')}")
    );
    expect(desktopSidebar).toContain("<SidebarSection title={t('app.operations')} compactAfter>");
    expect(desktopSidebar).toContain("<SidebarSection title={t('app.capabilities')} compactAfter>");
    expect(desktopSidebar).toContain("['overview', 'clusterOverview', t('app.overview'), ICONS.LayoutGrid]");
    expect(desktopSidebar).toContain("['chat', 'clusterChat', t('app.clusterAssistant'), ICONS.BotMessageSquare]");
    expect(desktopSidebar).toContain("['resources', 'clusterResources', t('app.resources'), ICONS.Activity]");
    expect(desktopSidebar).toContain("['overview', 'vmOverview', t('app.overview'), ICONS.LayoutGrid]");
    expect(desktopSidebar).toContain("['chat', 'vmChat', t('app.vmAssistant'), ICONS.BotMessageSquare]");
    expect(desktopSidebar).toContain("['resources', 'vmResources', t('app.resources'), ICONS.Activity]");
    expect(desktopSidebar).toContain("['skills', 'clusterSkills', t('app.skills'), ICONS.BookOpen]");
    expect(desktopSidebar).toContain("['tools', 'clusterTools', t('app.tools'), ICONS.Wrench]");
    expect(desktopSidebar).toContain("['skills', 'vmSkills', t('app.skills'), ICONS.BookOpen]");
    expect(desktopSidebar).toContain("['tools', 'vmTools', t('app.tools'), ICONS.Wrench]");
    expect(desktopSidebar.indexOf("['overview', 'clusterOverview', t('app.overview'), ICONS.LayoutGrid]")).toBeLessThan(
      desktopSidebar.indexOf("['chat', 'clusterChat', t('app.clusterAssistant'), ICONS.BotMessageSquare]")
    );
    expect(desktopSidebar.indexOf("['chat', 'clusterChat', t('app.clusterAssistant'), ICONS.BotMessageSquare]")).toBeLessThan(
      desktopSidebar.indexOf("['resources', 'clusterResources', t('app.resources'), ICONS.Activity]")
    );
    expect(desktopSidebar.indexOf("['overview', 'vmOverview', t('app.overview'), ICONS.LayoutGrid]")).toBeLessThan(
      desktopSidebar.indexOf("['chat', 'vmChat', t('app.vmAssistant'), ICONS.BotMessageSquare]")
    );
    expect(desktopSidebar.indexOf("['chat', 'vmChat', t('app.vmAssistant'), ICONS.BotMessageSquare]")).toBeLessThan(
      desktopSidebar.indexOf("['resources', 'vmResources', t('app.resources'), ICONS.Activity]")
    );
    expect(desktopSidebar.indexOf("t('app.mcpServers')")).toBeLessThan(
      desktopSidebar.indexOf("t('app.skills')")
    );
    expect(desktopSidebar.indexOf("t('app.skills')")).toBeLessThan(
      desktopSidebar.indexOf("t('app.tools')")
    );
    expect(desktopSidebar.indexOf("label={t('app.clusterSettings')}")).toBeLessThan(
      desktopSidebar.indexOf("label={t('app.vmSettings')}")
    );
    expect(desktopSidebar).toContain('compactAfter?: boolean');
    expect(desktopSidebar).not.toContain('quiet?: boolean');
    expect(desktopSidebar).not.toContain('data-sidebar-section-quiet={quiet ? \'true\' : undefined}');
    expect(desktopSidebar).toContain("compactAfter ? 'pb-5' : 'pb-7'");
    expect(desktopSidebar).toContain('className="mb-2 flex items-center justify-between px-3"');
    expect(desktopSidebar).toContain('className="space-y-1"');
  });

  it('matches the login wordmark orange and keeps comfortable top spacing', () => {
    expect(desktopSidebar).toContain('className="flex items-center gap-3 px-6 py-5"');
    expect(desktopSidebar).toContain('className="font-bold text-accent-bright">ops</span>');
  });

  it('keeps workspace settings visible as the self-service fallback for limited roles', () => {
    expect(desktopSidebar).not.toContain('canReadWorkspaceMembers');
    expect(desktopSidebar).toContain("import { workspaceLandingPath } from '@/app/appNavigationGuards';");
    expect(workspaceNavigation).toContain('AppPaths.workspaceSettings(workspace.id)');
    expect(workspaceNavigation).not.toContain('AppPaths.workspaceMembers');
    expect(desktopSidebar).toContain('? workspaceLandingPath(selectedWorkspace)');
  });

  it('keeps audit logs in Governance for auditor-only roles', () => {
    expect(workspaceNavigation).toContain('const canReadAudit = canReadWorkspaceAuditLog(workspace);');
    expect(workspaceNavigation).toContain('if (canReadAudit)');
    expect(workspaceNavigation).toContain("groups.push({ id: 'governance'");
  });

  it('makes account settings visibly located in the bottom account bar', () => {
    expect(desktopSidebar).toContain('const isAccountSettingsActive = activeResourceNav === \'accountSettings\';');
    expect(desktopSidebar).toContain("data-account-settings-active={isAccountSettingsActive ? 'true' : undefined}");
    expect(desktopSidebar).toContain("aria-current={isAccountSettingsActive ? 'page' : undefined}");
    expect(desktopSidebar).toContain("aria-label={t('app.accountSettings')}");
    expect(desktopSidebar).toContain("{t('app.accountSettings')}");
    expect(desktopSidebar).not.toContain('text-[0.625rem] font-bold uppercase leading-4 tracking-[0.08em]');
    expect(desktopSidebar).toContain("isAccountSettingsActive ? 'border-accent/30 bg-accent-soft'");
    expect(desktopSidebar).toContain("isAccountSettingsActive ? 'border-accent/25 bg-accent-soft text-accent-strong'");
    expect(desktopSidebar).toContain("isAccountSettingsActive ? 'bg-accent-soft text-accent-strong' : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'");
    expect(desktopSidebar).toContain('data-account-menu-panel="true"');
    expect(desktopSidebar).toContain('<ThemeMenu');
    expect(desktopSidebar).toContain('variant="account"');
    expect(desktopSidebar).toContain("aria-label={t('app.account')}");
    expect(desktopSidebar).not.toContain('const accountMenuLabelId = React.useId();');
    expect(desktopSidebar).toContain('<ICONS.ChevronRight');
    expect(desktopSidebar).not.toContain('aria-hidden="true" className="flex shrink-0 items-center rounded-md border border-ui-border bg-ui-bg p-0.5"');
    expect(desktopSidebar).not.toContain('space-y-1 p-2');
  });

  it('only shows workspace utility navigation after a workspace is selected', () => {
    expect(desktopSidebar).toContain('workspaceNavigationGroups.map((group)');
    expect(workspaceNavigation).toContain("id: 'workspaceSettings'");
    expect(desktopSidebar).not.toContain("label={selectedWorkspaceId ? t('app.workspaceSettings') : t('app.settings')}");
    expect(desktopSidebar).not.toContain("t('app.consoleSettings')");
    expect(desktopSidebar).not.toContain('AppPaths.settings()');
    expect(desktopSidebar).toContain("t('app.accountSettings')");
    expect(desktopSidebar.indexOf('workspaceNavigationGroups.map((group)')).toBeLessThan(desktopSidebar.indexOf("data-account-settings-active={isAccountSettingsActive ? 'true' : undefined}"));
  });

  it('renders compact assistant status indicators without adding nav-row text pills', () => {
    expect(desktopSidebar).toContain('assistantStatus={tab === \'chat\' ? clusterAssistantNavStatus : \'idle\'}');
    expect(desktopSidebar).toContain('AssistantNavStatusIndicator');
    expect(assistantStatusIndicator).toContain('Tooltip content={label} side={tooltipSide}');
    expect(assistantStatusIndicator).toContain('aria-label={label}');
    expect(assistantStatusIndicator).toContain('title={withTooltip ? undefined : label}');
    expect(desktopSidebar).toContain('title={title}');
    expect(desktopSidebar).not.toContain('title={title || assistantStatusLabel}');
    expect(assistantStatusIndicator).not.toContain('aria-live');
    expect(assistantStatusIndicator).toContain('h-5 w-5 shrink-0');
    expect(desktopSidebar).not.toContain('Needs review');
  });

  it('uses stable exact count badges for workspace and target nav counts', () => {
    expect(desktopSidebar).toContain("import { NavCountBadge } from '@/app/NavCountBadge'");
    expect(desktopSidebar).toContain('<NavCountBadge count={badge} />');
    expect(navCountBadge).toContain('h-5 min-w-8');
    expect(navCountBadge).toContain('`${MAX_NAV_BADGE_COUNT}+`');
    expect(desktopSidebar).not.toContain('rounded-full bg-status-danger px-1.5');
  });
});
