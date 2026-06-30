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
    expect(desktopSidebar).toContain('className="border-t border-ui-border px-0 pb-8 pt-4"');
    expect(desktopSidebar).not.toContain('className="mx-4 border-t border-ui-border px-0 pb-8 pt-4"');
    expect(desktopSidebar).toContain("active={activeResourceNav === 'clusterSettings'}");
    expect(desktopSidebar).toContain("onClick={() => onNavigateClusterSubview('settings')}");
    expect(desktopSidebar).toContain("active={activeResourceNav === 'vmSettings'}");
    expect(desktopSidebar).toContain("onClick={() => onNavigateVmSubview('settings')}");
  });

  it('links virtual machines to the active workspace target list', () => {
    expect(desktopSidebar).toContain("label={t('app.virtualMachines')}");
    expect(desktopSidebar).toContain('AppPaths.workspaceVirtualMachines(selectedWorkspaceId)');
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
    expect(desktopSidebar).toContain('<div className="relative min-w-0 px-4 mb-8 mt-2" ref={sidebarWorkspaceMenuRef}>');
    expect(desktopSidebar).not.toContain('const SidebarContextSlot = React.forwardRef<HTMLDivElement');
    expect(desktopSidebar).not.toContain('<SidebarTargetContext');
    expect(desktopSidebar).not.toContain('const splitSidebarContextName = (name: string): [string, string]');
    expect(desktopSidebar).toContain('className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-ui-border bg-ui-bg px-4 py-2 text-xs font-bold text-ui-text-muted transition-all hover:bg-accent-soft hover:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"');
    expect(desktopSidebar).toContain("<ICONS.ChevronLeft className=\"w-3.5 h-3.5\" />");
    expect(desktopSidebar).toContain("<div className=\"type-micro-label mb-1\">{t('app.activeCluster')}</div>");
    expect(desktopSidebar).toContain("<div className=\"type-micro-label mb-1\">{t('app.activeVirtualMachine')}</div>");
    expect(desktopSidebar).toContain('className="px-4 py-3 bg-ui-surface border-y border-ui-border" title={selectedClusterName}');
    expect(desktopSidebar).toContain('className="px-4 py-3 bg-ui-surface border-y border-ui-border" title={selectedVmName}');
  });

  it('groups workspace resources by inventory and automation intent', () => {
    expect(desktopSidebar).toContain('{hasWorkspaceDataAccess && (');
    expect(desktopSidebar).toContain("<SidebarSection title={t('app.inventory')} compactAfter>");
    expect(desktopSidebar).toContain("<SidebarSection title={t('app.automation')} compactAfter>");
    expect(desktopSidebar).not.toContain("label={t('app.aiSettings')}");
    expect(desktopSidebar).not.toContain('AppPaths.workspaceAiSettings(selectedWorkspaceId)');
    expect(desktopSidebar).toContain("label={t('app.agents')}");
    expect(desktopSidebar).toContain('AppPaths.workspaceAgents(selectedWorkspaceId)');
    expect(desktopSidebar).toContain("label={t('app.schedules')}");
    expect(desktopSidebar).toContain('AppPaths.workspaceSchedules(selectedWorkspaceId)');
    expect(desktopSidebar).toContain("label={t('app.approvals')}");
    expect(desktopSidebar).toContain('AppPaths.workspaceApprovals(selectedWorkspaceId)');
    expect(desktopSidebar).toContain("label={t('app.workspaceSettings')}");
    expect(desktopSidebar).toContain('AppPaths.workspaceSettings(selectedWorkspaceId)');
    expect(desktopSidebar).toContain("label={t('app.help')}");
    expect(desktopSidebar).toContain('AppPaths.help()');
    expect(desktopSidebar).toContain('navigate(AppPaths.accountSettings());');
    expect(desktopSidebar).toContain("t('app.accountSettings')");
    expect(desktopSidebar).toContain("t('app.theme')");
    expect(desktopSidebar).toContain("t('app.logout')");
    expect(desktopSidebar).toContain("tracking-[0.08em]");
    expect(desktopSidebar).not.toContain("label={t('app.runbooks')}");
    expect(desktopSidebar).not.toContain('AppPaths.workspaceRunbooks');
    expect(desktopSidebar).not.toContain("title={t('app.primaryDestinations')}");
    expect(desktopSidebar.indexOf("label={t('app.clusters')}")).toBeGreaterThan(
      desktopSidebar.indexOf("<SidebarSection title={t('app.inventory')} compactAfter>")
    );
    expect(desktopSidebar.indexOf("label={t('app.virtualMachines')}")).toBeGreaterThan(
      desktopSidebar.indexOf("<SidebarSection title={t('app.inventory')} compactAfter>")
    );
    expect(desktopSidebar).not.toContain("label={t('app.members')}");
    expect(desktopSidebar.indexOf("label={t('app.agents')}")).toBeGreaterThan(
      desktopSidebar.indexOf("<SidebarSection title={t('app.automation')} compactAfter>")
    );
    expect(desktopSidebar.indexOf("label={t('app.workflows')}")).toBeGreaterThan(
      desktopSidebar.indexOf("label={t('app.agents')}")
    );
    expect(desktopSidebar.indexOf("label={t('app.schedules')}")).toBeGreaterThan(
      desktopSidebar.indexOf("label={t('app.workflows')}")
    );
    expect(desktopSidebar.indexOf("label={t('app.approvals')}")).toBeGreaterThan(
      desktopSidebar.indexOf("label={t('app.schedules')}")
    );
    expect(desktopSidebar.indexOf("label={t('app.auditLog')}")).toBeGreaterThan(
      desktopSidebar.indexOf("label={t('app.workspaceSettings')}")
    );
    expect(desktopSidebar.indexOf("label={t('app.auditLog')}")).toBeLessThan(
      desktopSidebar.indexOf("label={t('app.help')}")
    );
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
    expect(desktopSidebar).toContain("compactAfter ? 'pb-4' : 'pb-10'");
  });

  it('keeps workspace settings visible as the self-service fallback for limited roles', () => {
    expect(desktopSidebar).not.toContain('canReadWorkspaceMembers');
    expect(desktopSidebar).toContain("import { workspaceLandingPath } from '@/app/appNavigationGuards';");
    expect(desktopSidebar).toContain('const workspaceSettingsPath = selectedWorkspaceId');
    expect(desktopSidebar).toContain('? AppPaths.workspaceSettings(selectedWorkspaceId)');
    expect(desktopSidebar).not.toContain(': AppPaths.workspaceMembers(selectedWorkspaceId)');
    expect(desktopSidebar).toContain('disabled={!selectedWorkspaceId}');
    expect(desktopSidebar).toContain('? workspaceLandingPath(selectedWorkspace)');
  });

  it('keeps audit logs in the bottom workspace utility group for auditor-only roles', () => {
    const workspaceNavigation = desktopSidebar.slice(
      desktopSidebar.indexOf('{hasWorkspaceDataAccess && ('),
      desktopSidebar.indexOf('{isClusterSidebar && (')
    );
    const automationSection = workspaceNavigation.slice(
      0,
      workspaceNavigation.indexOf('<TargetSettingsDivider>')
    );
    const utilitySection = workspaceNavigation.slice(
      workspaceNavigation.indexOf('<TargetSettingsDivider>'),
      workspaceNavigation.indexOf('</TargetSettingsDivider>')
    );

    expect(workspaceNavigation).toContain('<TargetSettingsDivider>');
    expect(workspaceNavigation).toContain('</TargetSettingsDivider>');
    expect(workspaceNavigation).toContain('{selectedWorkspaceId && (');
    expect(workspaceNavigation).not.toContain('mt-auto border-t border-ui-border');
    expect(automationSection).not.toContain("label={t('app.auditLog')}");
    expect(utilitySection).toContain("label={t('app.auditLog')}");
    expect(utilitySection.indexOf("label={t('app.workspaceSettings')}")).toBeLessThan(
      utilitySection.indexOf("label={t('app.auditLog')}")
    );
    expect(utilitySection.indexOf("label={t('app.auditLog')}")).toBeLessThan(
      utilitySection.indexOf("label={t('app.help')}")
    );
    expect(utilitySection).toContain('canReadWorkspaceAuditLog(selectedWorkspace)');
  });

  it('makes account settings visibly located in the bottom account bar', () => {
    expect(desktopSidebar).toContain('const isAccountSettingsActive = activeResourceNav === \'accountSettings\';');
    expect(desktopSidebar).toContain("data-account-settings-active={isAccountSettingsActive ? 'true' : undefined}");
    expect(desktopSidebar).toContain("aria-current={isAccountSettingsActive ? 'page' : undefined}");
    expect(desktopSidebar).toContain("aria-label={t('app.accountSettings')}");
    expect(desktopSidebar).toContain("{t('app.accountSettings')}");
    expect(desktopSidebar).not.toContain('text-[0.625rem] font-bold uppercase leading-4 tracking-[0.08em]');
    expect(desktopSidebar).toContain("isAccountSettingsActive ? 'border-accent/30 bg-accent-soft shadow-sm'");
    expect(desktopSidebar).toContain("isAccountSettingsActive ? 'bg-accent text-[oklch(0.99_0.004_86)]'");
    expect(desktopSidebar).toContain("isAccountSettingsActive ? 'bg-accent-soft text-accent-strong' : 'text-ui-text-muted hover:bg-ui-bg hover:text-ui-text'");
  });

  it('only shows workspace utility navigation after a workspace is selected', () => {
    expect(desktopSidebar).toContain('{selectedWorkspaceId && (');
    expect(desktopSidebar).toContain("label={t('app.workspaceSettings')}");
    expect(desktopSidebar).not.toContain("label={selectedWorkspaceId ? t('app.workspaceSettings') : t('app.settings')}");
    expect(desktopSidebar).not.toContain("t('app.consoleSettings')");
    expect(desktopSidebar).not.toContain('AppPaths.settings()');
    expect(desktopSidebar).toContain("t('app.accountSettings')");
    expect(desktopSidebar.indexOf("label={t('app.workspaceSettings')}")).toBeLessThan(
      desktopSidebar.indexOf("data-account-settings-active={isAccountSettingsActive ? 'true' : undefined}")
    );
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

  it('uses fixed circular count badges for workspace and target nav counts', () => {
    expect(desktopSidebar).toContain("import { NavCountBadge } from '@/app/NavCountBadge'");
    expect(desktopSidebar).toContain('<NavCountBadge count={badge} />');
    expect(navCountBadge).toContain('h-5 w-5 min-w-5');
    expect(navCountBadge).toContain('`${MAX_NAV_BADGE_COUNT}+`');
    expect(desktopSidebar).not.toContain('rounded-full bg-status-danger px-1.5');
  });
});
