import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const mobileNavigation = readFileSync(resolve(root, 'src/app/AppMobileNavigation.tsx'), 'utf8');
const assistantStatusIndicator = readFileSync(resolve(root, 'src/app/AssistantNavStatusIndicator.tsx'), 'utf8');
const navCountBadge = readFileSync(resolve(root, 'src/app/NavCountBadge.tsx'), 'utf8');
const workspaceNavigation = readFileSync(resolve(root, 'src/app/workspaceNavigation.tsx'), 'utf8');

describe('mobile navigation structure', () => {
  it('keeps the wordmark readable in both themes', () => {
    expect(mobileNavigation).toContain('className="font-bold text-brand-brown dark:text-brand-cream">acorn</span>');
    expect(mobileNavigation).toContain('className="font-bold text-accent-bright">ops</span>');
  });

  it('uses named sections instead of vague More groups', () => {
    expect(mobileNavigation).not.toContain("t('app.more')");
    expect(mobileNavigation).not.toContain("t('app.primaryDestinations')");
    expect(workspaceNavigation).toContain("label: t('app.inventory')");
    expect(workspaceNavigation).toContain("label: t('app.automation')");
    expect(workspaceNavigation).toContain("label: t('app.governance')");
    expect(workspaceNavigation).toContain("label: t('app.utilities')");
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
    expect(workspaceNavigation).toContain("label: t('app.auditLog')");
    expect(mobileNavigation).not.toContain("{t('app.aiSettings')}");
    expect(mobileNavigation).toContain('workspaceNavigationGroups.map((group)');
    expect(workspaceNavigation).toContain("label: t('app.workspaceSettings')");
    expect(mobileNavigation).not.toContain("{selectedWorkspaceId ? t('app.workspaceSettings') : t('app.settings')}");
    expect(workspaceNavigation).toContain("label: t('app.help')");
    expect(mobileNavigation).not.toContain('navigate(AppPaths.workspaceAiSettings(selectedWorkspaceId));');
    expect(workspaceNavigation).toContain('AppPaths.workspaceSettings(workspace.id)');
    expect(workspaceNavigation).toContain('AppPaths.help()');
    expect(mobileNavigation).toContain('navigate(AppPaths.accountSettings());');
    expect(mobileNavigation).toContain("activeResourceNav === 'accountSettings'");
    expect(mobileNavigation).toContain('<ThemeMenu');
    expect(mobileNavigation).toContain('variant="mobile"');
    expect(mobileNavigation).toContain('border border-ui-border bg-ui-surface px-3 py-2 text-xs font-bold text-ui-text');
    expect(mobileNavigation).not.toContain('border border-status-danger/25 bg-status-danger-soft px-3 py-2 text-xs font-bold text-status-danger-text');
    expect(mobileNavigation).toContain('className="flex min-h-11 items-center gap-3"');
    expect(mobileNavigation).toContain(
      'className="flex min-h-11 min-w-11 items-center justify-center p-2 text-ui-text-muted transition-colors hover:text-accent-strong"'
    );
    expect(mobileNavigation).toContain('min-h-11 items-center justify-between');
  });

  it('keeps audit logs in Governance for auditor-only roles', () => {
    expect(workspaceNavigation).toContain('const canReadAudit = canReadWorkspaceAuditLog(workspace);');
    expect(workspaceNavigation).toContain('if (canReadAudit)');
    expect(workspaceNavigation).toContain("groups.push({ id: 'governance'");
  });

  it('only shows workspace utility navigation after a workspace is selected on mobile', () => {
    expect(mobileNavigation).toContain('workspaceNavigationGroups.map((group)');
    expect(workspaceNavigation).toContain("id: 'workspaceSettings'");
    expect(mobileNavigation).not.toContain("{selectedWorkspaceId ? t('app.workspaceSettings') : t('app.settings')}");
    expect(mobileNavigation).not.toContain("t('app.consoleSettings')");
    expect(mobileNavigation).toContain("{t('app.accountSettings')}");
    expect(mobileNavigation).toContain("aria-current={activeResourceNav === 'accountSettings' ? 'page' : undefined}");
    expect(mobileNavigation).toContain("activeResourceNav === 'accountSettings'");
    expect(mobileNavigation.indexOf('workspaceNavigationGroups.map((group)')).toBeLessThan(mobileNavigation.indexOf("{t('app.accountSettings')}"));
  });

  it('links virtual machines after clusters in workspace resources', () => {
    expect(workspaceNavigation).toContain("label: t('app.virtualMachines')");
    expect(workspaceNavigation).toContain("id: 'agents'");
    expect(workspaceNavigation).toContain("id: 'workflows'");
    expect(workspaceNavigation).not.toContain("id: 'schedules'");
    expect(workspaceNavigation).toContain("id: 'workflowLibrary'");
    expect(workspaceNavigation).toContain("id: 'workflowSchedules'");
    expect(workspaceNavigation).toContain("id: 'approvals'");
    expect(mobileNavigation).toContain('item.children.map((child)');
    expect(mobileNavigation).toContain('aria-current={child.current ? \'page\' : undefined}');
    expect(mobileNavigation).toContain("item.children ? 'rounded-md bg-ui-bg pb-1' : undefined");
    expect(mobileNavigation).toContain('className="mt-0.5 grid grid-cols-1 gap-1 px-3"');
    expect(mobileNavigation).not.toContain('className="mt-0.5 grid grid-cols-1 gap-1 pl-3"');
    expect(mobileNavigation).toContain('before:h-1.5 before:w-1.5');
    expect(mobileNavigation).not.toContain("title={t('app.virtualMachinesTooltip')}");
    expect(mobileNavigation).not.toContain("t('app.runbooks')");
    expect(mobileNavigation).not.toContain('AppPaths.workspaceRunbooks');
    expect(workspaceNavigation.indexOf("id: 'clusters'")).toBeLessThan(workspaceNavigation.indexOf("id: 'virtualMachines'"));
    expect(mobileNavigation).not.toContain("['members', t('app.members'), AppPaths.workspaceMembers, 0]");
    expect(workspaceNavigation.indexOf("id: 'agents'")).toBeLessThan(workspaceNavigation.indexOf("id: 'workflows'"));
  });

  it('keeps workspace settings visible as the self-service fallback for limited roles', () => {
    expect(mobileNavigation).not.toContain('canReadWorkspaceMembers');
    expect(mobileNavigation).toContain("import { workspaceLandingPath } from '@/app/appNavigationGuards';");
    expect(workspaceNavigation).toContain('AppPaths.workspaceSettings(workspace.id)');
    expect(workspaceNavigation).not.toContain('AppPaths.workspaceMembers');
    expect(mobileNavigation).toContain('? workspaceLandingPath(selectedWorkspace)');
    expect(workspaceNavigation).toContain("['workspaceSettings', 'workspaceAiSettings', 'members'].includes(activeResourceNav)");
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

  it('uses the same stable exact count badge as desktop navigation', () => {
    expect(mobileNavigation).toContain("import { NavCountBadge } from '@/app/NavCountBadge'");
    expect(mobileNavigation).toContain('<NavCountBadge count={item.badge} />');
    expect(mobileNavigation).not.toContain('MobileNavBadge');
    expect(navCountBadge).toContain('h-5 min-w-8');
    expect(navCountBadge).toContain('`${MAX_NAV_BADGE_COUNT}+`');
  });
});
