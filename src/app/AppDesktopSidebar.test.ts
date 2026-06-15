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
    expect(desktopSidebar).toContain('title={name}');
    expect(desktopSidebar).toContain('name={selectedClusterName}');
    expect(desktopSidebar).toContain('name={selectedVmName}');
    expect(desktopSidebar).toContain('nameDataAttribute="data-desktop-sidebar-active-cluster"');
    expect(desktopSidebar).toContain('nameDataAttribute="data-desktop-sidebar-active-vm"');
    expect(desktopSidebar).toContain('const splitSidebarContextName = (name: string): [string, string]');
    expect(desktopSidebar).toContain('return [parts[0], parts.slice(1).join(\' \')];');
    expect(desktopSidebar).toContain('<SidebarContextName name={selectedWorkspaceName} />');
    expect(desktopSidebar).toContain('<SidebarContextName name={name} nameDataAttribute={nameDataAttribute} />');
    expect(desktopSidebar).toContain("{...(nameDataAttribute ? { [nameDataAttribute]: 'true' } : {})}");
    expect(desktopSidebar).toContain('grid h-[2.1875rem] max-w-[8.75rem] grid-rows-2 text-sm font-bold leading-tight text-ui-text');
    expect(desktopSidebar).toContain('<span className="block min-w-0 truncate">{firstLine}</span>');
    expect(desktopSidebar).toContain('aria-hidden={secondLine ? undefined : \'true\'}');
  });

  it('keeps workspace and target sidebar context in the same reserved slot', () => {
    expect(desktopSidebar).toContain('const SidebarContextSlot = React.forwardRef<HTMLDivElement');
    expect(desktopSidebar).toContain('children: React.ReactNode');
    expect(desktopSidebar).toContain('className="relative mb-8 mt-2 min-w-0 px-4"');
    expect(desktopSidebar).toContain('<SidebarContextSlot ref={sidebarWorkspaceMenuRef}>');
    expect(desktopSidebar).toContain('<SidebarTargetContext');
    expect(desktopSidebar).toContain("contextLabel={t('app.cluster')}");
    expect(desktopSidebar).toContain("contextLabel={t('app.vm')}");
    expect(desktopSidebar).toContain('contextLabel: string;');
    expect(desktopSidebar).toContain('className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-accent-soft');
    expect(desktopSidebar).toContain('<Tooltip content={backLabel} side="bottom" className="w-full">');
    expect(desktopSidebar).toContain('className="group w-full rounded-lg border border-transparent p-3 text-left outline-none transition-all');
    expect(desktopSidebar).toContain('aria-label={backLabel}');
    expect(desktopSidebar).toContain('<span className="type-micro-label">{contextLabel}</span>');
    expect(desktopSidebar).toContain('className="flex min-w-0 items-center justify-between"');
    expect(desktopSidebar).toContain('className="flex min-w-0 items-center gap-3"');
    expect(desktopSidebar).toContain('className="h-4 w-4 shrink-0" aria-hidden="true"');
    expect(desktopSidebar).toContain('grid h-[2.1875rem] max-w-[8.75rem] grid-rows-2');
  });

  it('separates frequent operational routes from quieter administration routes', () => {
    expect(desktopSidebar).toContain("<SidebarSection title={t('app.operations')} compactAfter>");
    expect(desktopSidebar).toContain("<SidebarSection title={t('app.administration')} quiet>");
    expect(desktopSidebar.indexOf("label={t('app.investigations')}")).toBeLessThan(
      desktopSidebar.indexOf("<SidebarSection title={t('app.administration')} quiet>")
    );
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
