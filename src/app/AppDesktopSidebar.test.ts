import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const desktopSidebar = readFileSync(resolve(root, 'src/app/AppDesktopSidebar.tsx'), 'utf8');

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

  it('includes cluster settings as a cluster-context destination', () => {
    expect(desktopSidebar).toContain("['settings', 'clusterSettings', t('app.clusterSettings'), ICONS.Settings]");
  });

  it('links virtual machines to the active workspace target list', () => {
    expect(desktopSidebar).toContain("label={t('app.virtualMachines')}");
    expect(desktopSidebar).toContain('AppPaths.workspaceVirtualMachines(selectedWorkspaceId)');
    expect(desktopSidebar).not.toContain("title={t('app.virtualMachinesTooltip')}");
  });

  it('keeps selected workspace and cluster names readable without losing exact-name access', () => {
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

  it('separates frequent operational routes from quieter workspace administration routes', () => {
    expect(desktopSidebar).toContain("<SidebarSection title={t('app.resources')} compactAfter>");
    expect(desktopSidebar).toContain("<SidebarSection title={t('app.workspaceAdministration')} quiet>");
    expect(desktopSidebar.indexOf("label={t('app.investigations')}")).toBeLessThan(
      desktopSidebar.indexOf("<SidebarSection title={t('app.workspaceAdministration')} quiet>")
    );
    expect(desktopSidebar.indexOf("label={t('app.members')}")).toBeGreaterThan(
      desktopSidebar.indexOf("<SidebarSection title={t('app.workspaceAdministration')} quiet>")
    );
    expect(desktopSidebar).toContain("label={t('app.auditLog')}");
    expect(desktopSidebar).toContain("label={t('app.aiSettings')}");
    expect(desktopSidebar).toContain("label={t('app.workspaceSettings')}");
    expect(desktopSidebar).toContain("{hasWorkspaceDataAccess && (\n                  <SidebarNavButton\n                    active={activeResourceNav === 'workspaceAiSettings'}");
    expect(desktopSidebar.indexOf("label={t('app.auditLog')}")).toBeLessThan(
      desktopSidebar.indexOf("label={t('app.aiSettings')}")
    );
    expect(desktopSidebar.indexOf("label={t('app.aiSettings')}")).toBeLessThan(
      desktopSidebar.indexOf("label={t('app.workspaceSettings')}")
    );
    expect(desktopSidebar).toContain('quiet?: boolean');
    expect(desktopSidebar).toContain('compactAfter?: boolean');
    expect(desktopSidebar).toContain('data-sidebar-section-quiet={quiet ? \'true\' : undefined}');
    expect(desktopSidebar).toContain("quiet ? 'pt-0 pb-8' : compactAfter ? 'pb-4' : 'pb-10'");
  });
});
