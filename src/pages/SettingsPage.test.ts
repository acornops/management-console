import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const settingsPage = readFileSync(resolve(root, 'src/pages/SettingsPage.tsx'), 'utf8');
const aiSettingsResource = readFileSync(resolve(root, 'src/hooks/useWorkspaceAiSettingsResource.ts'), 'utf8');
const workspaceSettingsPage = readFileSync(resolve(root, 'src/pages/WorkspaceSettingsPage.tsx'), 'utf8');
const dangerZone = readFileSync(resolve(root, 'src/components/common/DangerZone.tsx'), 'utf8');
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

  it('retains a workspace-keyed AI settings resource in the mounted settings shell', () => {
    expect(settingsPage).toContain("import { useWorkspaceAiSettingsResource } from '@/hooks/useWorkspaceAiSettingsResource';");
    expect(settingsPage).toContain('const aiSettingsResource = useWorkspaceAiSettingsResource(');
    expect(settingsPage).toContain("activeTab === 'ai' && !aiTabDisabled");
    expect(settingsPage).toContain('aiSettingsResource={aiSettingsResource}');
    expect(aiSettingsResource).toContain('React.useState<Record<string, WorkspaceAiSettingsCacheEntry>>({})');
    expect(aiSettingsResource).toContain('if (!enabled || !workspaceId || entry?.settings || entry?.isLoading || entry?.error) return;');
    expect(aiSettingsResource).toContain('controlPlaneApi.getWorkspaceAiSettings(targetWorkspaceId)');
    expect(aiSettingsResource).toContain('const isInitialLoadPending = Boolean(enabled && workspaceId && !entry);');
  });

  it('renders explicit assistant return navigation without automatic redirects', () => {
    expect(settingsPage).toContain('<PageBackLink');
    expect(settingsPage).toContain("{t('workspaceAiSettings.backToAssistant')}");
    expect(settingsPage).toContain('onReturnToAssistant?.(returnTo);');
    expect(settingsPage).toContain('returnTo={returnTo}');
    expect(appPageContent).toContain("returnTo={route.kind === 'workspaceAiSettings' ? route.returnTo : undefined}");
    expect(settingsPage).not.toContain('window.location');
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
    expect(workspaceSettingsPage).toContain("import { DangerZone, DangerZoneRow } from '@/components/common/DangerZone';");
    expect(workspaceSettingsPage).toContain('<DangerZone className="mt-10">');
    expect(workspaceSettingsPage).toContain("tone=\"danger\"");
    expect(workspaceSettingsPage).not.toContain('rounded-xl border border-status-danger/20 bg-status-danger-soft');
    expect(workspaceSettingsPage).toMatch(/variant="secondary"\s+size="md"\s+className="w-full"\s+onClick=\{\(\) => setIsConfirmingLeave\(true\)\}/);
    expect(dangerZone).toContain('divide-y divide-ui-border overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-sm');
    expect(dangerZone).not.toContain('bg-status-danger-soft');
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
