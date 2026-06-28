import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const settingsPage = readFileSync(resolve(root, 'src/pages/SettingsPage.tsx'), 'utf8');
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

  it('maps direct workspace settings routes onto the settings tab shell', () => {
    expect(appPageContent).toContain("const activeSettingsTab: SettingsTab = route.kind === 'workspaceMembers'");
    expect(appPageContent).toContain("route.kind === 'settings' || route.kind === 'workspaceSettings' || route.kind === 'workspaceAiSettings' || route.kind === 'workspaceMembers'");
    expect(appPageContent).toContain('initialTab={activeSettingsTab}');
    expect(appPageContent).toContain('onSelectTab={navigateWorkspaceSettingsTab}');
    expect(appPageContent).not.toContain("{route.kind === 'workspaceMembers' && workspaceContext && (");
  });
});
