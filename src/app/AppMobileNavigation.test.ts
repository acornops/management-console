import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const mobileNavigation = readFileSync(resolve(root, 'src/app/AppMobileNavigation.tsx'), 'utf8');
const assistantStatusIndicator = readFileSync(resolve(root, 'src/app/AssistantNavStatusIndicator.tsx'), 'utf8');
const navCountBadge = readFileSync(resolve(root, 'src/app/NavCountBadge.tsx'), 'utf8');

describe('mobile navigation structure', () => {
  it('uses named sections instead of vague More groups', () => {
    expect(mobileNavigation).not.toContain("t('app.more')");
    expect(mobileNavigation).not.toContain("t('app.primaryDestinations')");
    expect(mobileNavigation).toContain("t('app.inventory')");
    expect(mobileNavigation).toContain("t('app.automation')");
    expect(mobileNavigation).toContain("t('app.operations')");
    expect(mobileNavigation).toContain("t('app.capabilities')");
    expect(mobileNavigation).not.toContain("{t('app.administration')}");
    expect(mobileNavigation).toContain("['overview', t('app.overview'), ICONS.LayoutGrid, selectedClusterIssueCount]");
    expect(mobileNavigation).toContain("['resources', t('app.resources'), ICONS.Activity, 0]");
    expect(mobileNavigation).toContain("['mcpServers', t('app.mcpServers'), ICONS.Server]");
    expect(mobileNavigation).toContain("['skills', t('app.skills'), ICONS.BookOpen]");
    expect(mobileNavigation).toContain("['tools', t('app.tools'), ICONS.Wrench]");
    expect(mobileNavigation).toContain("['chat', t('app.clusterAssistant'), ICONS.BotMessageSquare, 0]");
    expect(mobileNavigation).toContain("['chat', t('app.vmAssistant'), ICONS.BotMessageSquare, 0]");
    expect(mobileNavigation.indexOf("['overview', t('app.overview'), ICONS.LayoutGrid, selectedClusterIssueCount]")).toBeLessThan(
      mobileNavigation.indexOf("['chat', t('app.clusterAssistant'), ICONS.BotMessageSquare, 0]")
    );
    expect(mobileNavigation.indexOf("['chat', t('app.clusterAssistant'), ICONS.BotMessageSquare, 0]")).toBeLessThan(
      mobileNavigation.indexOf("['resources', t('app.resources'), ICONS.Activity, 0]")
    );
    const vmTargetNavigation = mobileNavigation.slice(
      mobileNavigation.indexOf("['overview', t('app.overview'), ICONS.LayoutGrid, selectedVmIssueCount]")
    );
    expect(vmTargetNavigation.indexOf("['overview', t('app.overview'), ICONS.LayoutGrid, selectedVmIssueCount]")).toBeLessThan(
      vmTargetNavigation.indexOf("['chat', t('app.vmAssistant'), ICONS.BotMessageSquare, 0]")
    );
    expect(vmTargetNavigation.indexOf("['chat', t('app.vmAssistant'), ICONS.BotMessageSquare, 0]")).toBeLessThan(
      vmTargetNavigation.indexOf("['resources', t('app.resources'), ICONS.Activity, 0]")
    );
    expect(mobileNavigation.indexOf("t('app.mcpServers')")).toBeLessThan(
      mobileNavigation.indexOf("t('app.skills')")
    );
    expect(mobileNavigation.indexOf("t('app.skills')")).toBeLessThan(
      mobileNavigation.indexOf("t('app.tools')")
    );
    expect(mobileNavigation).not.toContain("['settings', t('app.clusterSettings'), ICONS.Settings, 0]");
    expect(mobileNavigation).not.toContain("['settings', t('app.vmSettings'), ICONS.Settings, 0]");
    expect(mobileNavigation).toContain("onNavigateClusterSubview('settings')");
    expect(mobileNavigation).toContain("onNavigateVmSubview('settings')");
    expect(mobileNavigation).toContain("activeClusterSubview === 'settings'");
    expect(mobileNavigation).toContain("activeVmSubview === 'settings'");
  });

  it('uses the shared dialog behavior for the open navigation panel', () => {
    expect(mobileNavigation).toContain("import { Dialog } from '@/components/common/Dialog'");
    expect(mobileNavigation).toContain('const mobileNavButtonRef = React.useRef<HTMLButtonElement>(null);');
    expect(mobileNavigation).toContain('const mobileNavCloseButtonRef = React.useRef<HTMLButtonElement>(null);');
    expect(mobileNavigation).toContain('<Dialog');
    expect(mobileNavigation).toContain('titleId={mobileNavTitleId}');
    expect(mobileNavigation).toContain('initialFocusRef={mobileNavCloseButtonRef}');
    expect(mobileNavigation).not.toContain('onMouseDown={() => onSetMobileNavOpen(false)}');
  });

  it('keeps mobile drawer controls as flat scan groups with large touch targets', () => {
    expect(mobileNavigation).toContain("min-h-11");
    expect(mobileNavigation).not.toContain('<details');
    expect(mobileNavigation).not.toContain('<summary');
    expect(mobileNavigation).toContain("t('app.workspaceContext')");
    expect(mobileNavigation).toContain("t('app.userSettings')");
    expect(mobileNavigation).toContain("{t('app.auditLog')}");
    expect(mobileNavigation).not.toContain("{t('app.aiSettings')}");
    expect(mobileNavigation).toContain("{selectedWorkspaceId ? t('app.workspaceSettings') : t('app.consoleSettings')}");
    expect(mobileNavigation).toContain("{t('app.help')}");
    expect(mobileNavigation).not.toContain('navigate(AppPaths.workspaceAiSettings(selectedWorkspaceId));');
    expect(mobileNavigation).toContain('AppPaths.workspaceSettings(selectedWorkspaceId)');
    expect(mobileNavigation).toContain('AppPaths.workspaceMembers(selectedWorkspaceId)');
    expect(mobileNavigation).toContain('navigate(workspaceSettingsPath);');
    expect(mobileNavigation).toContain('navigate(AppPaths.help());');
    expect(mobileNavigation).toContain('navigate(AppPaths.accountSettings());');
    expect(mobileNavigation).toContain("activeResourceNav === 'accountSettings'");
    expect(mobileNavigation).toContain("t('app.theme')");
    expect(mobileNavigation.indexOf("{selectedWorkspaceId ? t('app.workspaceSettings') : t('app.consoleSettings')}")).toBeLessThan(
      mobileNavigation.indexOf("{t('app.auditLog')}")
    );
    expect(mobileNavigation.indexOf("{t('app.auditLog')}")).toBeLessThan(
      mobileNavigation.indexOf("{t('app.help')}")
    );
  });

  it('keeps audit logs in the bottom workspace utility group for auditor-only roles', () => {
    const automationSection = mobileNavigation.slice(
      mobileNavigation.indexOf("{t('app.automation')}"),
      mobileNavigation.indexOf('navigate(workspaceSettingsPath);')
    );
    const utilitySection = mobileNavigation.slice(
      mobileNavigation.indexOf('navigate(workspaceSettingsPath);'),
      mobileNavigation.indexOf("t('app.userSettings')")
    );

    expect(automationSection).not.toContain("{t('app.auditLog')}");
    expect(utilitySection).toContain("{t('app.auditLog')}");
    expect(utilitySection.indexOf("{selectedWorkspaceId ? t('app.workspaceSettings') : t('app.consoleSettings')}")).toBeLessThan(
      utilitySection.indexOf("{t('app.auditLog')}")
    );
    expect(utilitySection.indexOf("{t('app.auditLog')}")).toBeLessThan(
      utilitySection.indexOf("{t('app.help')}")
    );
    expect(utilitySection).toContain('canReadWorkspaceAuditLog(selectedWorkspace)');
  });

  it('keeps console settings distinct from account settings on mobile', () => {
    expect(mobileNavigation).toContain("{selectedWorkspaceId ? t('app.workspaceSettings') : t('app.consoleSettings')}");
    expect(mobileNavigation).toContain("{t('app.accountSettings')}");
    expect(mobileNavigation).toContain("aria-current={activeResourceNav === 'accountSettings' ? 'page' : undefined}");
    expect(mobileNavigation).toContain("activeResourceNav === 'accountSettings'");
    expect(mobileNavigation.indexOf("{selectedWorkspaceId ? t('app.workspaceSettings') : t('app.consoleSettings')}")).toBeLessThan(
      mobileNavigation.indexOf("{t('app.accountSettings')}")
    );
  });

  it('links virtual machines after clusters in workspace resources', () => {
    expect(mobileNavigation).toContain("t('app.virtualMachines')");
    expect(mobileNavigation).toContain("['virtualMachines', t('app.virtualMachines'), AppPaths.workspaceVirtualMachines, 0]");
    expect(mobileNavigation).toContain("['agents', t('app.agents'), AppPaths.workspaceAgents, 0]");
    expect(mobileNavigation).toContain("['schedules', t('app.schedules'), AppPaths.workspaceSchedules, 0]");
    expect(mobileNavigation).toContain("['approvals', t('app.approvals'), AppPaths.workspaceApprovals, 0]");
    expect(mobileNavigation).not.toContain("title={t('app.virtualMachinesTooltip')}");
    expect(mobileNavigation).not.toContain("t('app.runbooks')");
    expect(mobileNavigation).not.toContain('AppPaths.workspaceRunbooks');
    expect(mobileNavigation.indexOf("['clusters', t('app.clusters')")).toBeLessThan(
      mobileNavigation.indexOf("t('app.virtualMachines')")
    );
    expect(mobileNavigation).not.toContain("['members', t('app.members'), AppPaths.workspaceMembers, 0]");
    expect(mobileNavigation.indexOf("['agents', t('app.agents')")).toBeLessThan(
      mobileNavigation.indexOf("['workflows', t('app.workflows')")
    );
    expect(mobileNavigation.indexOf("['workflows', t('app.workflows')")).toBeLessThan(
      mobileNavigation.indexOf("['schedules', t('app.schedules')")
    );
    expect(mobileNavigation.indexOf("['schedules', t('app.schedules')")).toBeLessThan(
      mobileNavigation.indexOf("['approvals', t('app.approvals')")
    );
  });

  it('keeps members navigation visible for read-members-only roles', () => {
    expect(mobileNavigation).toContain('canReadWorkspaceMembers');
    expect(mobileNavigation).toContain('const hasWorkspaceMemberAccess = canReadWorkspaceMembers(selectedWorkspace);');
    expect(mobileNavigation).toContain('const workspaceSettingsPath = selectedWorkspaceId');
    expect(mobileNavigation).toContain('? AppPaths.workspaceSettings(selectedWorkspaceId)');
    expect(mobileNavigation).toContain(': AppPaths.workspaceMembers(selectedWorkspaceId)');
    expect(mobileNavigation).toContain("activeResourceNav === 'settings'");
    expect(mobileNavigation).toContain("activeResourceNav === 'workspaceSettings'");
    expect(mobileNavigation).toContain("activeResourceNav === 'workspaceAiSettings'");
    expect(mobileNavigation).toContain("activeResourceNav === 'members'");
  });

  it('keeps assistant activity as a compact trailing status indicator', () => {
    expect(mobileNavigation).toContain('AssistantNavStatusIndicator');
    expect(mobileNavigation).toContain('status={tab === \'chat\' ? clusterAssistantNavStatus : \'idle\'}');
    expect(mobileNavigation).toContain('withTooltip={false}');
    expect(mobileNavigation).not.toContain('tooltipSide="left"');
    expect(assistantStatusIndicator).toContain('title={withTooltip ? undefined : label}');
    expect(assistantStatusIndicator).toContain('aria-label={label}');
    expect(assistantStatusIndicator).not.toContain('aria-live');
    expect(assistantStatusIndicator).toContain('h-5 w-5 shrink-0');
    expect(mobileNavigation).not.toContain('Needs review');
  });

  it('uses the same fixed circular count badge as desktop navigation', () => {
    expect(mobileNavigation).toContain("import { NavCountBadge } from '@/app/NavCountBadge'");
    expect(mobileNavigation).toContain('<NavCountBadge count={badge} />');
    expect(mobileNavigation).not.toContain('MobileNavBadge');
    expect(navCountBadge).toContain('h-5 w-5 min-w-5');
    expect(navCountBadge).toContain('`${MAX_NAV_BADGE_COUNT}+`');
  });
});
