import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const settingsPage = readFileSync(resolve(root, 'src/pages/SettingsPage.tsx'), 'utf8');
const workspaceSettingsPage = readFileSync(resolve(root, 'src/pages/WorkspaceSettingsPage.tsx'), 'utf8');
const appPageContent = readFileSync(resolve(root, 'src/app/AppPageContent.tsx'), 'utf8');

describe('SettingsPage workspace tabs', () => {
  it('treats members as a workspace settings tab instead of inventory navigation', () => {
    expect(settingsPage).toContain("type SettingsTab = 'workspace' | 'members' | 'ai';");
    expect(settingsPage).toContain("{ id: 'members', label: t('settingsPage.membersTab'), icon: ICONS.Users");
    expect(settingsPage).toContain('<WorkspaceMembersPage');
    expect(settingsPage).toContain('embedded');
    expect(settingsPage).toContain('canReadMembers');
    expect(settingsPage).toContain('onClick={() => handleSelectTab(id)}');
    expect(settingsPage).toContain('{!workspace && (');
    expect(settingsPage).not.toContain('{workspaceTabsDisabled && (');
  });

  it('explains unavailable settings tabs instead of relying on disabled opacity', () => {
    expect(settingsPage).toContain("import { Tooltip } from '@/components/common/Tooltip';");
    expect(settingsPage).toContain('function getTabUnavailableReason');
    expect(settingsPage).toContain("t('settingsPage.selectWorkspaceForTab')");
    expect(settingsPage).toContain("t('settingsPage.workspaceAccessRequired')");
    expect(settingsPage).toContain("t('settingsPage.membersAccessRequired')");
    expect(settingsPage).toContain("if (tab === 'ai' && !canReadWorkspaceData)");
    expect(settingsPage).not.toContain("tab === 'workspace' || tab === 'ai'");
    expect(settingsPage).toContain('aria-disabled={Boolean(unavailableReason)}');
    expect(settingsPage).not.toContain('disabled={disabled}');
  });

  it('lets workspace rows navigate to the members settings tab from the workspace overview', () => {
    expect(settingsPage).toContain('const handleSelectTab = (tab: SettingsTab) => {');
    expect(settingsPage).toContain('setActiveTab(tab);');
    expect(settingsPage).toContain('onSelectTab?.(tab);');
    expect(settingsPage).toContain('canReadMembers={canReadMembers}');
    expect(settingsPage).toContain('onSelectMembers={() => handleSelectTab(\'members\')}');
  });

  it('surfaces self-service workspace leaving separately from destructive deletion', () => {
    expect(settingsPage).toContain('onLeaveWorkspace?: () => Promise<void>');
    expect(settingsPage).toContain('const workspaceTabDisabled = !workspace;');
    expect(settingsPage).toContain('canReadWorkspaceData={canReadWorkspaceData}');
    expect(settingsPage).toContain('onLeaveWorkspace={onLeaveWorkspace}');
    expect(settingsPage).toContain('currentUserRole={currentUserRole}');
    expect(workspaceSettingsPage).toContain('canReadWorkspaceData ? (');
    expect(workspaceSettingsPage).toContain("t('workspaceSettings.limitedAccessTitle')");
    expect(workspaceSettingsPage).toContain("id=\"workspace-leave-title\"");
    expect(workspaceSettingsPage).toContain("t('workspaceSettings.leaveTitle')");
    expect(workspaceSettingsPage).toContain('isKnownOnlyWorkspaceOwner(currentUserRole, workspace.memberCount)');
    expect(workspaceSettingsPage).toContain("t('workspaceSettings.leaveOnlyOwnerWarning')");
    expect(workspaceSettingsPage).toContain("t('workspaceSettings.confirmLeave')");
    expect(workspaceSettingsPage).toContain("id=\"workspace-danger-title\"");
    expect(workspaceSettingsPage.indexOf("id=\"workspace-leave-title\"")).toBeLessThan(workspaceSettingsPage.indexOf("id=\"workspace-danger-title\""));
  });

  it('maps direct workspace settings routes onto the settings tab shell', () => {
    expect(appPageContent).toContain("const activeSettingsTab: SettingsTab = route.kind === 'workspaceMembers'");
    expect(appPageContent).toContain("route.kind === 'workspaceSettings' || route.kind === 'workspaceAiSettings' || route.kind === 'workspaceMembers'");
    expect(appPageContent).not.toContain("route.kind === 'settings' ||");
    expect(appPageContent).toContain('initialTab={activeSettingsTab}');
    expect(appPageContent).toContain('onSelectTab={navigateWorkspaceSettingsTab}');
    expect(appPageContent).not.toContain("{route.kind === 'workspaceMembers' && workspaceContext && (");
  });
});
