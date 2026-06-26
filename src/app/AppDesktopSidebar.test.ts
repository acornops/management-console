import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const desktopSidebar = readFileSync(resolve(root, 'src/app/AppDesktopSidebar.tsx'), 'utf8');
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

  it('places target settings in administration instead of operations', () => {
    expect(desktopSidebar).not.toContain("['settings', 'clusterSettings', t('app.clusterSettings'), ICONS.Settings]");
    expect(desktopSidebar).not.toContain("['settings', 'vmSettings', t('app.vmSettings'), ICONS.Settings]");
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

  it('separates frequent operational routes from quieter administration routes', () => {
    expect(desktopSidebar).toContain("<SidebarSection title={t('app.operations')} compactAfter>");
    expect(desktopSidebar).toContain("<SidebarSection title={t('app.administration')} quiet>");
    expect(desktopSidebar).not.toContain("label={t('app.runbooks')}");
    expect(desktopSidebar).not.toContain('AppPaths.workspaceRunbooks');
    expect(desktopSidebar.indexOf("label={t('app.members')}")).toBeGreaterThan(
      desktopSidebar.indexOf("<SidebarSection title={t('app.administration')} quiet>")
    );
    expect(desktopSidebar).toContain("label={t('app.auditLog')}");
    expect(desktopSidebar).toContain("label={t('app.aiSettings')}");
    expect(desktopSidebar).toContain("label={t('app.workspaceSettings')}");
    expect(desktopSidebar).toContain("active={activeResourceNav === 'workspaceAiSettings'}");
    expect(desktopSidebar.indexOf("label={t('app.auditLog')}")).toBeLessThan(
      desktopSidebar.indexOf("label={t('app.aiSettings')}")
    );
    expect(desktopSidebar.indexOf("label={t('app.aiSettings')}")).toBeLessThan(
      desktopSidebar.indexOf("label={t('app.workspaceSettings')}")
    );
    expect(desktopSidebar.indexOf("label={t('app.aiChat')}")).toBeLessThan(
      desktopSidebar.indexOf("label={t('app.clusterSettings')}")
    );
    expect(desktopSidebar).toContain("['skills', 'clusterSkills', t('app.skills'), ICONS.BookOpen]");
    expect(desktopSidebar).toContain("['tools', 'clusterTools', t('app.tools'), ICONS.Wrench]");
    expect(desktopSidebar).toContain("['skills', 'vmSkills', t('app.skills'), ICONS.BookOpen]");
    expect(desktopSidebar).toContain("['tools', 'vmTools', t('app.tools'), ICONS.Wrench]");
    expect(desktopSidebar.indexOf("t('app.mcpServers')")).toBeLessThan(
      desktopSidebar.indexOf("t('app.skills')")
    );
    expect(desktopSidebar.indexOf("t('app.skills')")).toBeLessThan(
      desktopSidebar.indexOf("t('app.tools')")
    );
    expect(desktopSidebar.indexOf("label={t('app.clusterSettings')}")).toBeLessThan(
      desktopSidebar.indexOf("label={t('app.vmSettings')}")
    );
    expect(desktopSidebar).toContain('quiet?: boolean');
    expect(desktopSidebar).toContain('compactAfter?: boolean');
    expect(desktopSidebar).toContain('data-sidebar-section-quiet={quiet ? \'true\' : undefined}');
    expect(desktopSidebar).toContain("quiet ? 'pt-0 pb-8' : compactAfter ? 'pb-4' : 'pb-10'");
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
